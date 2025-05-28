import React, { useEffect, useState, useCallback, useRef } from 'react'; // Import useRef
import {
  collection,
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
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './OrdersManagement.module.css';

// Material-UI components và icons
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ListAltIcon from '@mui/icons-material/ListAlt';

const ORDERS_PER_PAGE = 6;

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [currentTab, setCurrentTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMoreNext, setHasMoreNext] = useState(false);
  const [hasMorePrev, setHasMorePrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sử dụng useRef để lưu trữ hàm unsubscribe của listener hiện tại
  const unsubscribeRef = useRef(null);

  // Hàm chính để thiết lập listener cho orders, sử dụng onSnapshot
  const setupOrdersListener = useCallback(async (direction = 'initial', startDoc = null, pageNumber = 0) => {
    // Nếu có listener cũ, hủy nó đi trước khi thiết lập cái mới
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null; // Reset ref
    }

    setLoading(true);
    setError(null);
    setOrders([]); // Xóa dữ liệu cũ trước khi tải dữ liệu mới

    const ordersCollectionRef = collection(db, 'orders');
    let baseQueryDefinition;

    if (currentTab === 'all') {
      baseQueryDefinition = query(ordersCollectionRef, orderBy('timestamp', 'desc'));
    } else {
      baseQueryDefinition = query(
        ordersCollectionRef,
        where('status', '==', currentTab),
        orderBy('timestamp', 'desc')
      );
    }

    let q;
    if (direction === 'next' && startDoc) {
      q = query(baseQueryDefinition, startAfter(startDoc), limit(ORDERS_PER_PAGE));
    } else if (direction === 'prev' && startDoc) {
      q = query(baseQueryDefinition, endBefore(startDoc), limitToLast(ORDERS_PER_PAGE));
    } else { // 'initial' or 'reset'
      q = query(baseQueryDefinition, limit(ORDERS_PER_PAGE));
    }

    const newUnsubscribe = onSnapshot(q, async (snapshot) => {
      const ordersData = [];
      const uniqueUserIds = new Set();

      if (snapshot.empty) {
        setOrders([]);
        setUsersMap({});
        setLastVisible(null);
        setFirstVisible(null);
        setHasMoreNext(false);
        setHasMorePrev(pageNumber > 0);
        setLoading(false);
        return;
      }

      setFirstVisible(snapshot.docs[0]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        let formattedTimestamp = 'N/A';
        if (d.timestamp instanceof Timestamp) {
          formattedTimestamp = d.timestamp.toDate().toLocaleString();
        } else if (d.timestamp && typeof d.timestamp === 'object' && d.timestamp.toDate) {
            formattedTimestamp = d.timestamp.toDate().toLocaleString();
        } else if (d.timestamp) {
            formattedTimestamp = new Date(d.timestamp).toLocaleString();
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

      const userIdsArray = Array.from(uniqueUserIds);
      const fetchedUsersMap = {};

      if (userIdsArray.length > 0) {
        const chunkSize = 10;
        const userIdChunks = [];
        for (let i = 0; i < userIdsArray.length; i += chunkSize) {
          userIdChunks.push(userIdsArray.slice(i, i + chunkSize));
        }

        try {
          const userPromises = userIdChunks.map(chunk => {
            const userQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            return getDocs(userQuery);
          });
          const userSnapshots = await Promise.all(userPromises);
          userSnapshots.forEach(userSnapshot => {
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

      const ordersWithUserNames = ordersData.map(order => {
        const user = fetchedUsersMap[order.userId];
        return {
          ...order,
          userName: user?.name || 'Unknown User',
        };
      });

      setOrders(ordersWithUserNames);

      const checkNextQuery = query(
        baseQueryDefinition,
        startAfter(snapshot.docs[snapshot.docs.length - 1]),
        limit(1)
      );
      const nextSnapshot = await getDocs(checkNextQuery);
      setHasMoreNext(!nextSnapshot.empty);

      setHasMorePrev(pageNumber > 0);
      setLoading(false);
    }, (onSnapshotError) => {
      console.error("Error setting up onSnapshot listener:", onSnapshotError);
      setError(`Error fetching orders: ${onSnapshotError.message}. ${onSnapshotError.code === 'failed-precondition' ? 'Please ensure required Firestore indexes are created for your queries.' : ''}`);
      setLoading(false);
    });

    // Lưu hàm unsubscribe vào ref
    unsubscribeRef.current = newUnsubscribe;

  }, [currentTab]); // setupOrdersListener chỉ phụ thuộc vào currentTab

  // --- useEffect để quản lý việc fetch dữ liệu khi component mount hoặc tab thay đổi ---
  useEffect(() => {
    setCurrentPage(0); // Luôn reset về trang đầu tiên khi tab đổi hoặc component mount
    setupOrdersListener('initial', null, 0); // Bắt đầu lắng nghe

    // Cleanup function: hủy bỏ lắng nghe khi component unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentTab, setupOrdersListener]); // currentTab và setupOrdersListener là dependencies

  // --- Xử lý sự kiện thay đổi tab ---
  const handleTabChange = (event, newValue) => {
    if (newValue !== currentTab) {
      setCurrentTab(newValue);
      // Khi currentTab thay đổi, useEffect sẽ tự động gọi setupOrdersListener lại và xử lý cleanup
    }
  };

  // --- Xử lý chuyển đến trang tiếp theo ---
  const handleNextPage = () => {
    if (lastVisible && hasMoreNext && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      // Gọi trực tiếp setupOrdersListener để cập nhật dữ liệu cho trang mới
      setupOrdersListener('next', lastVisible, nextPage);
    }
  };

  // --- Xử lý chuyển đến trang trước đó ---
  const handlePrevPage = () => {
    if (firstVisible && currentPage > 0 && !loading) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      // Gọi trực tiếp setupOrdersListener để cập nhật dữ liệu cho trang mới
      setupOrdersListener('prev', firstVisible, prevPage);
    }
  };

  // --- Hàm xử lý khi đánh dấu đơn hàng hoàn thành (giữ nguyên) ---
  const handleMarkCompleted = async (orderId, userId) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: 'completed' });
      // Sau khi cập nhật, onSnapshot listener sẽ tự động nhận diện thay đổi và cập nhật UI.
      // Không cần gọi lại setupOrdersListener ở đây.

      // Gọi API backend để gửi notification
      const backendUrl = 'http://localhost:4000/notify-order-completed';
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
      alert(`Failed to update order status: ${firestoreError.message}`);
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
          centered
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
          {orders.length === 0 && !error ? (
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
                          <div>Price: {item.price?.toLocaleString() || 0} VND</div>
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
              disabled={!hasMorePrev || loading}
            >
              Previous
            </Button>
            <Typography variant="body1" sx={{ alignSelf: 'center' }}>
              Page {currentPage + 1}
            </Typography>
            <Button
              variant="outlined"
              onClick={handleNextPage}
              disabled={!hasMoreNext || loading}
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