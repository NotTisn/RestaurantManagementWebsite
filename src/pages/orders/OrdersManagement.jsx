import React, { useEffect, useState, useCallback, useRef } from 'react';
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

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ListAltIcon from '@mui/icons-material/ListAlt';
import NotificationsIcon from '@mui/icons-material/Notifications';

const ORDERS_PER_PAGE = 6;

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function OrdersManagement() {
    const [orders, setOrders] = useState([]);
    const [, setUsersMap] = useState({});
    const [currentTab, setCurrentTab] = useState('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [lastVisible, setLastVisible] = useState(null);
    const [firstVisible, setFirstVisible] = useState(null);
    const [hasMoreNext, setHasMoreNext] = useState(false);
    const [hasMorePrev, setHasMorePrev] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newOrdersCount, setNewOrdersCount] = useState(0); 
    const [totalPendingOrders, setTotalPendingOrders] = useState(0); 
    const lastAcknowledgedPendingCountRef = useRef(0); 

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const unsubscribeRef = useRef(null);
    const unsubscribeNewOrdersRef = useRef(null);

    const setupOrdersListener = useCallback(async (direction = 'initial', startDoc = null, pageNumber = 0) => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        setLoading(true);
        setError(null);
        setOrders([]);

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
        } else {
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
                    voucherCode: d.appliedVoucherDetails && d.appliedVoucherDetails.code ? d.appliedVoucherDetails.code : 'None',
                    userId: d.userId || 'Unknown',
                    status: d.status || 'pending',
                    paymentStatus: d.paymentStatus,
                    paymentMethod: d.paymentMethod,
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

        unsubscribeRef.current = newUnsubscribe;

    }, [currentTab]);

    useEffect(() => {
        if (unsubscribeNewOrdersRef.current) {
            unsubscribeNewOrdersRef.current();
            unsubscribeNewOrdersRef.current = null;
        }

        const pendingOrdersQuery = query(
            collection(db, 'orders'),
            where('status', '==', 'pending')
        );

        const newOrdersUnsubscribe = onSnapshot(pendingOrdersQuery, (snapshot) => {
            const currentPendingCount = snapshot.size;
            setTotalPendingOrders(currentPendingCount);

            if (currentTab === 'pending') {
                setNewOrdersCount(0);
                lastAcknowledgedPendingCountRef.current = currentPendingCount;
            } else {
                if (currentPendingCount > lastAcknowledgedPendingCountRef.current) {
                    const newlyArrivedOrders = currentPendingCount - lastAcknowledgedPendingCountRef.current;
                    setNewOrdersCount(newlyArrivedOrders);

                    setSnackbarMessage(`🔔 You have ${newlyArrivedOrders} new pending orders!`);
                    setSnackbarOpen(true);
                } else {
                    setNewOrdersCount(0);
                }
            }

        }, (error) => {
            console.error("Error listening to pending orders:", error);
        });

        unsubscribeNewOrdersRef.current = newOrdersUnsubscribe;

        return () => {
            if (unsubscribeNewOrdersRef.current) {
                unsubscribeNewOrdersRef.current();
                unsubscribeNewOrdersRef.current = null;
            }
        };
    }, [currentTab]);

    useEffect(() => {
        setCurrentPage(0);
        setupOrdersListener('initial', null, 0);

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [currentTab, setupOrdersListener]);

    const handleTabChange = (event, newValue) => {
        if (newValue !== currentTab) {
            setCurrentTab(newValue);
            if (newValue === 'pending') {
                setNewOrdersCount(0);
                lastAcknowledgedPendingCountRef.current = totalPendingOrders;
            }
        }
    };

    const handleNotificationClick = () => {
        if (currentTab !== 'pending') {
            setCurrentTab('pending');
        }
        setNewOrdersCount(0);
        lastAcknowledgedPendingCountRef.current = totalPendingOrders;
    };

    const handleNextPage = () => {
        if (lastVisible && hasMoreNext && !loading) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setupOrdersListener('next', lastVisible, nextPage);
        }
    };

    const handlePrevPage = () => {
        if (firstVisible && currentPage > 0 && !loading) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            setupOrdersListener('prev', firstVisible, prevPage);
        }
    };

    const handleMarkCompleted = async (orderId, userId) => {
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, { status: 'delivering' }); 

            const backendUrl = 'https://foodappbe-r5x8.onrender.com/notify-order-completed'; 
            fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    orderId,
                    message: 'Your order is on its way to you! 🚚' 
                }),
            })
                .then(response => {
                    if (!response.ok) {
                        console.error('Notification API call failed:', response.status, response.statusText);
                    } else {
                        console.log('Notification API call successful (order delivering)');
                    }
                })
                .catch(fetchError => {
                    console.error('Notification API call failed:', fetchError);
                });

        } catch (firestoreError) {
            console.error("Error updating order status to 'delivering' in Firestore:", firestoreError);
            alert(`Failed to update order status: ${firestoreError.message}`);
        }
    };

    const handleConfirmDelivery = async (orderId) => {
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, { status: 'completed', paymentStatus: 'paid' });
        } catch (firestoreError) {
            console.error("Error updating order status to 'completed' in Firestore:", firestoreError);
            alert(`Failed to confirm delivery: ${firestoreError.message}`);
        }
    };

    const getStatusClassName = (status) => {
        switch (status) {
            case 'pending': return styles.statusPending;
            case 'delivering': return styles.statusDelivering; 
            case 'completed': return styles.statusCompleted;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerWithNotifications}>
                <h1 className={styles.heading}>Order Management</h1>
                <IconButton
                    color="inherit"
                    aria-label="show new orders"
                    onClick={handleNotificationClick}
                    sx={{ ml: 'auto' }}
                >
                    <Badge badgeContent={newOrdersCount} color="error">
                        <NotificationsIcon sx={{ fontSize: 30 }} />
                    </Badge>
                </IconButton>
            </div>

            <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    aria-label="order status tabs"
                    centered
                >
                    <Tab label="All Orders" value="all" icon={<ListAltIcon />} iconPosition="start" />
                    <Tab label="Pending" value="pending" icon={<PendingActionsIcon />} iconPosition="start" />
                    <Tab label="Delivering" value="delivering" icon={<LocalShippingIcon />} iconPosition="start" /> 
                    <Tab label="Completed" value="completed" icon={<CheckCircleOutlineIcon />} iconPosition="start" /> 
                </Tabs>
            </Box>

            {error && (
                <Box sx={{ my: 2, p: 2, backgroundColor: '#ffebee', color: '#d32f2f', borderRadius: '8px' }}>
                    <Typography variant="body1">
                        <strong>Error:</strong> {error}
                    </Typography>
                </Box>
            )}

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
                                        <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
                                        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                                        <p><strong>Voucher Code:</strong> {order.voucherCode}</p>

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
                                                    <div>Price: {item.price?.toLocaleString() || 0} $</div>
                                                    <div>Total: {(item.quantity * (item.price || 0)).toLocaleString()} $</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className={styles.orderTotal}>
                                        <strong>🧮 Order Total:</strong> {order.total.toLocaleString()} $
                                    </p>

                                    <div className={styles.statusActionSection}>
                                        {order.status === 'pending' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleMarkCompleted(order.id, order.userId)}
                                                sx={{ mt: 1 }}
                                            >
                                                ✅ Mark Delivering
                                            </Button>
                                        )}
                                        {order.status === 'delivering' && (
                                            <>
                                                <Typography variant="body2" sx={{ color: 'orange', fontWeight: 'bold', mt: 1 }}>
                                                    Order is being delivered
                                                </Typography>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => handleConfirmDelivery(order.id)}
                                                    sx={{ mt: 1 }}
                                                >
                                                    📦 Confirm Delivery
                                                </Button>
                                            </>
                                        )}
                                        {order.status === 'completed' && (
                                            <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold', mt: 1 }}>
                                                Order Completed
                                            </Typography>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

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

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity="info"
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default OrdersManagement;