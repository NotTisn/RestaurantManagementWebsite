import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  documentId, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  Timestamp // Import Timestamp from firebase/firestore
} from 'firebase/firestore'; 
import { db } from '../../firebaseConfig';
import styles from './OrdersManagement.module.css';

// Import Material-UI components and icons for a better UI/UX
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress'; // For loading indicator

// Icons for tabs
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ListAltIcon from '@mui/icons-material/ListAlt'; // For 'All Orders' tab

const ORDERS_PER_PAGE = 6; // Số lượng đơn hàng hiển thị trên mỗi trang

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [currentTab, setCurrentTab] = useState('pending'); // Mặc định hiển thị tab 'pending'
  const [currentPage, setCurrentPage] = useState(0); // Trang hiện tại (0-indexed)
  const [lastVisible, setLastVisible] = useState(null); // Document cuối cùng của trang hiện tại
  const [firstVisible, setFirstVisible] = useState(null); // Document đầu tiên của trang hiện tại
  const [hasMoreNext, setHasMoreNext] = useState(false); // Cờ kiểm tra có trang kế tiếp hay không
  const [hasMorePrev, setHasMorePrev] = useState(false); // Cờ kiểm tra có trang trước đó hay không
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Trạng thái lỗi

  // Hàm xử lý khi người dùng chuyển đổi tab
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setCurrentPage(0); // Reset về trang đầu tiên khi chuyển tab
    setLastVisible(null); // Reset điểm bắt đầu/kết thúc phân trang
    setFirstVisible(null);
    setHasMoreNext(false);
    setHasMorePrev(false);
    setOrders([]); // Xóa dữ liệu cũ để tránh nhấp nháy
    setLoading(true); // Đặt loading về true để hiển thị spinner
    setError(null); // Xóa lỗi cũ
  };

  // Effect chính để fetch dữ liệu đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null); // Reset lỗi trước mỗi lần fetch

      const ordersCollectionRef = collection(db, 'orders');
      let baseQuery;

      // Xây dựng truy vấn cơ bản dựa trên tab hiện tại
      if (currentTab === 'all') {
        baseQuery = query(ordersCollectionRef, orderBy('timestamp', 'desc'));
      } else {
        baseQuery = query(ordersCollectionRef, 
          where('status', '==', currentTab), 
          orderBy('timestamp', 'desc')
        );
      }

      // Xây dựng truy vấn phân trang ban đầu (hoặc sau khi reset trang)
      let q = query(baseQuery, limit(ORDERS_PER_PAGE));
      
      // Lắng nghe sự thay đổi realtime từ Firestore
      const unsub = onSnapshot(q, async (snapshot) => {
        const ordersData = [];
        const uniqueUserIds = new Set();

        if (snapshot.empty) {
          setOrders([]);
          setUsersMap({});
          setLastVisible(null);
          setFirstVisible(null);
          setHasMoreNext(false);
          setHasMorePrev(false);
          setLoading(false);
          return;
        }

        // Lưu document đầu tiên và cuối cùng của trang hiện tại để phân trang
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        // biome-ignore lint/complexity/noForEach: <explanation>
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          
          let formattedTimestamp = 'N/A';
          if (d.timestamp instanceof Timestamp) {
            formattedTimestamp = d.timestamp.toDate().toLocaleString();
          } else if (d.timestamp) {
            console.warn(`Timestamp for order ${docSnap.id} is not a Firestore Timestamp object:`, d.timestamp);
          }

          const order = {
            id: docSnap.id,
            items: d.items || [],
            total: d.total || 0,
            voucherCode: d.voucherCode || [],
            userId: d.userId || 'Unknown',
            status: d.status || 'pending',
            timestamp: formattedTimestamp,
          };
          ordersData.push(order);
          if (order.userId && order.userId !== 'Unknown') {
            uniqueUserIds.add(order.userId);
          }
        });

        // --- Fetch user data based on unique user IDs ---
        const userIdsArray = Array.from(uniqueUserIds);
        const fetchedUsersMap = {};

        if (userIdsArray.length > 0) {
          const chunkSize = 10; 
          const userIdChunks = [];
          for (let i = 0; i < userIdsArray.length; i += chunkSize) {
            userIdChunks.push(userIdsArray.slice(i, i + chunkSize));
          }

          const userPromises = userIdChunks.map(chunk => {
            const userQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            return getDocs(userQuery);
          });

          try {
            const userSnapshots = await Promise.all(userPromises);
            // biome-ignore lint/complexity/noForEach: <explanation>
            userSnapshots.forEach(userSnapshot => {
              // biome-ignore lint/complexity/noForEach: <explanation>
              userSnapshot.forEach(userDocSnap => {
                const userData = userDocSnap.data();
                fetchedUsersMap[userDocSnap.id] = userData;
              });
            });
          } catch (fetchUserError) {
            console.error("Error fetching user data:", fetchUserError);
            setError("Error fetching user data. Please try again.");
          }
        }
        setUsersMap(fetchedUsersMap);

        // Kết hợp dữ liệu đơn hàng với tên người dùng đã fetch
        const ordersWithUserNames = ordersData.map(order => {
          const user = fetchedUsersMap[order.userId];
          return {
            ...order,
            userName: user?.name || 'Unknown User',
          };
        });

        setOrders(ordersWithUserNames);

        // Kiểm tra xem có trang tiếp theo không
        const checkNextQuery = query(baseQuery, 
          startAfter(snapshot.docs[snapshot.docs.length - 1]), 
          limit(1)
        );
        const nextSnapshot = await getDocs(checkNextQuery);
        setHasMoreNext(!nextSnapshot.empty);

        // Kiểm tra xem có trang trước đó không (chỉ cần nếu không phải trang đầu tiên)
        setHasMorePrev(currentPage > 0);
        
        setLoading(false); // Tắt loading spinner
      }, (onSnapshotError) => {
        // Xử lý lỗi từ onSnapshot (bao gồm lỗi index)
        console.error("Error fetching orders in onSnapshot:", onSnapshotError);
        setError(`Error fetching orders: ${onSnapshotError.message}. ${onSnapshotError.code === 'failed-precondition' ? 'Please ensure required Firestore indexes are created.' : ''}`);
        setLoading(false);
      });

    return () => unsub(); // Cleanup the listener when component unmounts or dependencies change
    };

    fetchOrders(); // Gọi hàm fetchOrders khi component mount hoặc dependencies thay đổi
  }, [currentTab, currentPage, db]); // Dependencies for useEffect

  // Hàm xử lý chuyển đến trang tiếp theo
  const handleNextPage = async () => {
    if (lastVisible && hasMoreNext) {
      setLoading(true);
      setError(null);

      const ordersCollectionRef = collection(db, 'orders');
      let baseQuery;
      if (currentTab === 'all') {
        baseQuery = query(ordersCollectionRef, orderBy('timestamp', 'desc'));
      } else {
        baseQuery = query(ordersCollectionRef, 
          where('status', '==', currentTab), 
          orderBy('timestamp', 'desc')
        );
      }

      const nextPageQuery = query(baseQuery, startAfter(lastVisible), limit(ORDERS_PER_PAGE));

      try {
        const snapshot = await getDocs(nextPageQuery);
        if (snapshot.empty) {
          setHasMoreNext(false); // Không còn đơn hàng nào nữa
          setLoading(false);
          return;
        }

        const newOrdersData = [];
        const uniqueUserIds = new Set();
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        // biome-ignore lint/complexity/noForEach: <explanation>
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          let formattedTimestamp = 'N/A';
          if (d.timestamp instanceof Timestamp) {
            formattedTimestamp = d.timestamp.toDate().toLocaleString();
          } else if (d.timestamp) {
            console.warn(`Timestamp for order ${docSnap.id} is not a Firestore Timestamp object:`, d.timestamp);
          }

          const order = {
            id: docSnap.id,
            items: d.items || [],
            total: d.total || 0,
            voucherCode: d.voucherCode || [],
            userId: d.userId || 'Unknown',
            status: d.status || 'pending',
            timestamp: formattedTimestamp,
          };
          newOrdersData.push(order);
          if (order.userId && order.userId !== 'Unknown') {
            uniqueUserIds.add(order.userId);
          }
        });

        const userIdsArray = Array.from(uniqueUserIds);
        const fetchedUsersMap = {};
        if (userIdsArray.length > 0) {
          const chunkSize = 10;
          const userIdChunks = [];
          for (let i = 0; i < userIdsArray.length; i += chunkSize) {
            userIdChunks.push(userIdsArray.slice(i, i + chunkSize));
          }
          const userPromises = userIdChunks.map(chunk => {
            const userQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            return getDocs(userQuery);
          });
          const userSnapshots = await Promise.all(userPromises);
          // biome-ignore lint/complexity/noForEach: <explanation>
          userSnapshots.forEach(userSnapshot => {
            // biome-ignore lint/complexity/noForEach: <explanation>
            userSnapshot.forEach(userDocSnap => {
              fetchedUsersMap[userDocSnap.id] = userDocSnap.data();
            });
          });
        }
        setUsersMap(fetchedUsersMap);

        const ordersWithUserNames = newOrdersData.map(order => {
          const user = fetchedUsersMap[order.userId];
          return { ...order, userName: user?.name || 'Unknown User' };
        });

        setOrders(ordersWithUserNames);
        setCurrentPage(prev => prev + 1);

        // Kiểm tra lại có trang tiếp theo không
        const checkNextQuery = query(baseQuery, 
          startAfter(snapshot.docs[snapshot.docs.length - 1]), 
          limit(1)
        );
        const checkNextSnapshot = await getDocs(checkNextQuery);
        setHasMoreNext(!checkNextSnapshot.empty);
        setHasMorePrev(true); // Luôn có trang trước đó khi đã bấm next (trừ khi là trang đầu)

      } catch (pageError) {
        console.error("Error fetching next page:", pageError);
        setError(`Error fetching next page: ${pageError.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Hàm xử lý chuyển đến trang trước đó
  const handlePrevPage = async () => {
    if (firstVisible && currentPage > 0) {
      setLoading(true);
      setError(null);

      const ordersCollectionRef = collection(db, 'orders');
      let baseQuery;
      if (currentTab === 'all') {
        baseQuery = query(ordersCollectionRef, orderBy('timestamp', 'desc'));
      } else {
        baseQuery = query(ordersCollectionRef, 
          where('status', '==', currentTab), 
          orderBy('timestamp', 'desc')
        );
      }

      const prevPageQuery = query(baseQuery, endBefore(firstVisible), limitToLast(ORDERS_PER_PAGE));

      try {
        const snapshot = await getDocs(prevPageQuery);
        if (snapshot.empty) {
          setHasMorePrev(false);
          setLoading(false);
          return;
        }

        const newOrdersData = [];
        const uniqueUserIds = new Set();
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        // biome-ignore lint/complexity/noForEach: <explanation>
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          let formattedTimestamp = 'N/A';
          if (d.timestamp instanceof Timestamp) {
            formattedTimestamp = d.timestamp.toDate().toLocaleString();
          } else if (d.timestamp) {
            console.warn(`Timestamp for order ${docSnap.id} is not a Firestore Timestamp object:`, d.timestamp);
          }

          const order = {
            id: docSnap.id,
            items: d.items || [],
            total: d.total || 0,
            voucherCode: d.voucherCode || [],
            userId: d.userId || 'Unknown',
            status: d.status || 'pending',
            timestamp: formattedTimestamp,
          };
          newOrdersData.push(order);
          if (order.userId && order.userId !== 'Unknown') {
            uniqueUserIds.add(order.userId);
          }
        });

        const userIdsArray = Array.from(uniqueUserIds);
        const fetchedUsersMap = {};
        if (userIdsArray.length > 0) {
          const chunkSize = 10;
          const userIdChunks = [];
          for (let i = 0; i < userIdsArray.length; i += chunkSize) {
            userIdChunks.push(userIdsArray.slice(i, i + chunkSize));
          }
          const userPromises = userIdChunks.map(chunk => {
            const userQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            return getDocs(userQuery);
          });
          const userSnapshots = await Promise.all(userPromises);
          // biome-ignore lint/complexity/noForEach: <explanation>
          userSnapshots.forEach(userSnapshot => {
            // biome-ignore lint/complexity/noForEach: <explanation>
            userSnapshot.forEach(userDocSnap => {
              fetchedUsersMap[userDocSnap.id] = userDocSnap.data();
            });
          });
        }
        setUsersMap(fetchedUsersMap);

        const ordersWithUserNames = newOrdersData.map(order => {
          const user = fetchedUsersMap[order.userId];
          return { ...order, userName: user?.name || 'Unknown User' };
        });

        setOrders(ordersWithUserNames);
        setCurrentPage(prev => prev - 1);

        setHasMorePrev(currentPage - 1 > 0); 
        setHasMoreNext(true); // Khi bấm prev, chắc chắn có trang tiếp theo (trừ khi là trang cuối cùng của dataset)

      } catch (pageError) {
        console.error("Error fetching previous page:", pageError);
        setError(`Error fetching previous page: ${pageError.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Hàm xử lý khi đánh dấu đơn hàng hoàn thành
  const handleMarkCompleted = async (orderId, userId) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: 'completed' });

      // Gửi notification qua API
      const backendUrl = 'http://localhost:4000/notify-order-completed'; // Cần thay đổi cho môi trường deploy
      fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId }),
      })
      .then(response => {
        if (!response.ok) {
          console.error('Notification API call failed:', response.status, response.statusText);
        } else {
          console.log('Notification API call successful');
        }
      })
      .catch(fetchError => {
        console.error('Notification API call failed:', fetchError);
      });

    } catch (firestoreError) {
      console.error("Error updating order status in Firestore:", firestoreError);
      alert(`Failed to update order status: ${firestoreError.message}`); // Hiển thị thông báo lỗi cho người dùng
    }
  };

  // Helper để lấy className cho trạng thái
  const getStatusClassName = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'completed': return styles.statusCompleted;
      case 'delivered': return styles.statusDelivered;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Order Management</h1>

      {/* Tabs để chuyển đổi trạng thái đơn hàng */}
      <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          aria-label="order status tabs" 
          centered // Canh giữa các tab
        >
          <Tab label="All Orders" value="all" icon={<ListAltIcon />} iconPosition="start" />
          <Tab label="Pending" value="pending" icon={<PendingActionsIcon />} iconPosition="start" />
          <Tab label="Completed" value="completed" icon={<CheckCircleOutlineIcon />} iconPosition="start" />
          <Tab label="Delivered" value="delivered" icon={<LocalShippingIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <Box sx={{ my: 2, p: 2, backgroundColor: '#ffebee', color: '#d32f2f', borderRadius: '8px' }}>
          <Typography variant="body1">
            <strong>Error:</strong> {error}
          </Typography>
        </Box>
      )}

      {/* Loading indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress size={50} />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading Orders...</Typography>
        </Box>
      ) : (
        <>
          {orders.length === 0 && !error ? ( // Chỉ hiển thị "No orders" nếu không có lỗi và không có đơn hàng
            <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>
              No orders found for this status.
            </Typography>
          ) : (
            <div className={styles.ordersGrid}>
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <h3>🧾 Order ID: {order.id}</h3>
                  <div className={styles.orderInfo}>
                    <p><strong>Customer:</strong> {order.userName || 'Fetching Name...'}</p>
                    <p><strong>Order Time:</strong> {order.timestamp}</p>
                    <p><strong>Voucher Code:</strong> {order.voucherCode && order.voucherCode.length > 0 ? order.voucherCode.join(', ') : 'None'}</p>
                  </div>

                  <div className={styles.itemsList}>
                    <h4>📦 Products:</h4>
                    {order.items.map((item, idx) => (
                      <div key={item.id || idx} className={styles.itemRow}>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          width={60}
                          height={60}
                          className={styles.itemImage}
                        />
                        <div className={styles.itemDetails}>
                          <div><strong>{item.name}</strong></div>
                          <div>Quantity: {item.quantity}</div>
                          <div>Price: {item.price?.toLocaleString() || 0} VND</div> {/* Đảm bảo price tồn tại */}
                          <div>Total: {(item.quantity * (item.price || 0)).toLocaleString()} VND</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className={styles.orderTotal}>
                    <strong>🧮 Order Total:</strong> {order.total.toLocaleString()} VND
                  </p>
                  
                  <div className={styles.statusActionSection}>
                    {order.status === 'pending' ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleMarkCompleted(order.id, order.userId)} 
                        sx={{ mt: 1 }}
                      >
                        ✅ Mark Completed
                      </Button>
                    ) : (
                      <div className={`${styles.statusMessage} ${getStatusClassName(order.status)}`}>
                        {order.status === 'completed' && (
                          <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                            Completed, waiting for customer confirmation
                          </Typography>
                        )}
                        {order.status === 'delivered' && (
                          <Typography variant="body2" sx={{ color: 'blue', fontWeight: 'bold' }}>
                            Delivered successfully
                          </Typography>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3, gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handlePrevPage} 
              disabled={!hasMorePrev || loading} // Nút Previous disabled nếu không có trang trước hoặc đang tải
            >
              Previous
            </Button>
            <Typography variant="body1" sx={{ alignSelf: 'center' }}>
              Page {currentPage + 1}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleNextPage} 
              disabled={!hasMoreNext || loading} // Nút Next disabled nếu không có trang kế tiếp hoặc đang tải
            >
              Next
            </Button>
          </Box>
        </>
      )}
    </div>
  );
}

export default OrdersManagement;