import { StatsContext } from "../../contexts/StatsContext";

import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
    useContext,
} from "react";
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
    onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import styles from "./OrdersManagement.module.css";

import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ListAltIcon from "@mui/icons-material/ListAlt";
import NotificationsIcon from "@mui/icons-material/Notifications";
import RestoreIcon from "@mui/icons-material/Restore";

const ORDERS_PER_PAGE = 6;

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function OrdersManagement() {
    const { updatePopularFoods } = useContext(StatsContext);

    const [orders, setOrders] = useState([]);
    const [, setUsersMap] = useState({});
    const [currentTab, setCurrentTab] = useState("all");
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
    const [snackbarMessage, setSnackbarMessage] = useState("");

    const unsubscribeRef = useRef(null);
    const unsubscribeNewOrdersRef = useRef(null);

    const setupOrdersListener = useCallback(
        async (direction = "initial", startDoc = null, pageNumber = 0) => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            setLoading(true);
            setError(null);
            setOrders([]);

            const ordersCollectionRef = collection(db, "orders");
            let baseQueryDefinition;

            if (currentTab === "all") {
                baseQueryDefinition = query(
                    ordersCollectionRef,
                    orderBy("timestamp", "desc")
                );
            } else {
                baseQueryDefinition = query(
                    ordersCollectionRef,
                    where("status", "==", currentTab),
                    orderBy("timestamp", "desc")
                );
            }

            let q;
            if (direction === "next" && startDoc) {
                q = query(
                    baseQueryDefinition,
                    startAfter(startDoc),
                    limit(ORDERS_PER_PAGE)
                );
            } else if (direction === "prev" && startDoc) {
                q = query(
                    baseQueryDefinition,
                    endBefore(startDoc),
                    limitToLast(ORDERS_PER_PAGE)
                );
            } else {
                q = query(baseQueryDefinition, limit(ORDERS_PER_PAGE));
            }

            const newUnsubscribe = onSnapshot(
                q,
                async (snapshot) => {
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
                        let formattedTimestamp = "N/A";
                        if (d.timestamp instanceof Timestamp) {
                            formattedTimestamp = d.timestamp.toDate().toLocaleString();
                        } else if (
                            d.timestamp &&
                            typeof d.timestamp === "object" &&
                            d.timestamp.toDate
                        ) {
                            formattedTimestamp = d.timestamp.toDate().toLocaleString();
                        } else if (d.timestamp) {
                            formattedTimestamp = new Date(d.timestamp).toLocaleString();
                        }

                        const order = {
                            id: docSnap.id,
                            items: d.items || [],
                            total: d.total || 0,
                            voucherCode:
                                d.appliedVoucherDetails && d.appliedVoucherDetails.code
                                    ? d.appliedVoucherDetails.code
                                    : "None",
                            userId: d.userId || "Unknown",
                            status: d.status || "pending",
                            paymentStatus: d.paymentStatus,
                            paymentMethod: d.paymentMethod,
                            timestamp: formattedTimestamp,
                            deliveryAddress: d.deliveryAddress || "N/A",
                            note: d.orderNote || "N/A",
                            reportStatus: d.reportStatus || 0, // Add this line
                            reportAdditionalInfo: d.reportAdditionalInfo || "", // Add this line too for future use
                        };
                        ordersData.push(order);
                        if (order.userId && order.userId !== "Unknown") {
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
                            const userPromises = userIdChunks.map((chunk) => {
                                const userQuery = query(
                                    collection(db, "users"),
                                    where(documentId(), "in", chunk)
                                );
                                return getDocs(userQuery);
                            });
                            const userSnapshots = await Promise.all(userPromises);
                            userSnapshots.forEach((userSnapshot) => {
                                userSnapshot.forEach((userDocSnap) => {
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

                    const ordersWithUserNames = ordersData.map((order) => {
                        const user = fetchedUsersMap[order.userId];
                        return {
                            ...order,
                            userName: user?.name || "Unknown User",
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
                },
                (onSnapshotError) => {
                    console.error(
                        "Error setting up onSnapshot listener:",
                        onSnapshotError
                    );
                    setError(
                        `Error fetching orders: ${onSnapshotError.message}. ${onSnapshotError.code === "failed-precondition"
                            ? "Please ensure required Firestore indexes are created for your queries."
                            : ""
                        }`
                    );
                    setLoading(false);
                }
            );

            unsubscribeRef.current = newUnsubscribe;
        },
        [currentTab]
    );

    useEffect(() => {
        if (unsubscribeNewOrdersRef.current) {
            unsubscribeNewOrdersRef.current();
            unsubscribeNewOrdersRef.current = null;
        }

        const pendingOrdersQuery = query(
            collection(db, "orders"),
            where("status", "==", "pending")
        );

        const newOrdersUnsubscribe = onSnapshot(
            pendingOrdersQuery,
            async (snapshot) => {
                const currentPendingCount = snapshot.size;
                setTotalPendingOrders(currentPendingCount);

                if (currentTab === "pending") {
                    setNewOrdersCount(0);
                    lastAcknowledgedPendingCountRef.current = currentPendingCount;
                } else {
                    if (currentPendingCount > lastAcknowledgedPendingCountRef.current) {
                        const newlyArrivedOrders =
                            currentPendingCount - lastAcknowledgedPendingCountRef.current;
                        setNewOrdersCount(newlyArrivedOrders);

                        setSnackbarMessage(
                            `🔔 You have ${newlyArrivedOrders} new pending orders!`
                        );
                        setSnackbarOpen(true);
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const currentMonth = now.getMonth() + 1;

                        await updatePopularFoods(currentYear, currentMonth);
                        console.log(
                            "✅ Popular foods updated successfully after new orders"
                        );
                    } else {
                        setNewOrdersCount(0);
                    }
                }
            },
            (error) => {
                console.error("Error listening to pending orders:", error);
            }
        );

        unsubscribeNewOrdersRef.current = newOrdersUnsubscribe;

        return () => {
            if (unsubscribeNewOrdersRef.current) {
                unsubscribeNewOrdersRef.current();
                unsubscribeNewOrdersRef.current = null;
            }
        };
    }, [currentTab, updatePopularFoods]);

    useEffect(() => {
        setCurrentPage(0);
        setupOrdersListener("initial", null, 0);

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
            if (newValue === "pending") {
                setNewOrdersCount(0);
                lastAcknowledgedPendingCountRef.current = totalPendingOrders;
            }
        }
    };

    const handleNotificationClick = () => {
        if (currentTab !== "pending") {
            setCurrentTab("pending");
        }
        setNewOrdersCount(0);
        lastAcknowledgedPendingCountRef.current = totalPendingOrders;
    };

    const handleNextPage = () => {
        if (lastVisible && hasMoreNext && !loading) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setupOrdersListener("next", lastVisible, nextPage);
        }
    };

    const handlePrevPage = () => {
        if (firstVisible && currentPage > 0 && !loading) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            setupOrdersListener("prev", firstVisible, prevPage);
        }
    };

    const handleMarkCompleted = async (orderId, userId) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, { status: "delivering" });

            const backendUrl =
                "https://foodappbe-r5x8.onrender.com/notify-order-completed";
            fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    orderId,
                    message: "Your order is on its way to you! 🚚",
                }),
            })
                .then((response) => {
                    if (!response.ok) {
                        console.error(
                            "Notification API call failed:",
                            response.status,
                            response.statusText
                        );
                    } else {
                        console.log("Notification API call successful (order delivering)");
                    }
                })
                .catch((fetchError) => {
                    console.error("Notification API call failed:", fetchError);
                });
        } catch (firestoreError) {
            console.error(
                "Error updating order status to 'delivering' in Firestore:",
                firestoreError
            );
            alert(`Failed to update order status: ${firestoreError.message}`);
        }
    };

    const handleConfirmDelivery = async (orderId) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, { status: "completed", paymentStatus: "paid" });
        } catch (firestoreError) {
            console.error(
                "Error updating order status to 'completed' in Firestore:",
                firestoreError
            );
            alert(`Failed to confirm delivery: ${firestoreError.message}`);
        }
    };
    const handleRedelivery = async (orderId, userId) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            // Revert order status back to delivering and mark report as handled
            await updateDoc(orderRef, {
                status: "delivering",
                reportStatus: -1, // Mark as handled
            });

            // Send notification to customer about redelivery
            const backendUrl =
                "https://foodappbe-r5x8.onrender.com/notify-order-completed";
            fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    orderId,
                    message:
                        "Your order is being redelivered! Our driver will reach you soon. 🚚",
                }),
            })
                .then((response) => {
                    if (!response.ok) {
                        console.error(
                            "Redelivery notification API call failed:",
                            response.status,
                            response.statusText
                        );
                    } else {
                        console.log("Redelivery notification API call successful");
                    }
                })
                .catch((fetchError) => {
                    console.error("Redelivery notification API call failed:", fetchError);
                });

            console.log(`Order ${orderId} set for redelivery`);
        } catch (firestoreError) {
            console.error("Error setting order for redelivery:", firestoreError);
            alert(`Failed to set redelivery: ${firestoreError.message}`);
        }
    };
    const handleMarkQualityIssueHandled = async (orderId) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, {
                reportStatus: -1, // Mark as handled
            });
            console.log(`Quality issue report for order ${orderId} marked as handled`);
        } catch (firestoreError) {
            console.error("Error marking quality issue as handled:", firestoreError);
            alert(`Failed to mark quality issue as handled: ${firestoreError.message}`);
        }
    };
    const handleMarkWrongFoodHandled = async (orderId) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, {
                reportStatus: -1, // Mark as handled
            });
            console.log(`Wrong food report for order ${orderId} marked as handled`);
        } catch (firestoreError) {
            console.error("Error marking wrong food report as handled:", firestoreError);
            alert(`Failed to mark wrong food report as handled: ${firestoreError.message}`);
        }
    };
    const getStatusClassName = (status) => {
        switch (status) {
            case "pending":
                return styles.statusPending;
            case "delivering":
                return styles.statusDelivering;
            case "completed":
                return styles.statusCompleted;
            default:
                return "";
        }
    };
    const getReportStatusClassName = (reportStatus) => {
        switch (reportStatus) {
            case -1:
                return styles.reportHandled; // Light orange glow for handled reports
            case 1:
            case 2:
            case 3:
                return styles.reportPending; // Red glow for pending reports
            case 0:
            default:
                return ""; // No special styling for unreported orders
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
                    sx={{ ml: "auto" }}
                >
                    <Badge badgeContent={newOrdersCount} color="error">
                        <NotificationsIcon sx={{ fontSize: 30 }} />
                    </Badge>
                </IconButton>
            </div>

            <Box
                sx={{
                    width: "100%",
                    borderBottom: 1,
                    borderColor: "divider",
                    marginBottom: 2,
                }}
            >
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    aria-label="order status tabs"
                    centered
                >
                    <Tab
                        label="All Orders"
                        value="all"
                        icon={<ListAltIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Pending"
                        value="pending"
                        icon={<PendingActionsIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Delivering"
                        value="delivering"
                        icon={<LocalShippingIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Completed"
                        value="completed"
                        icon={<CheckCircleOutlineIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Retrieved"
                        value="retrieved"
                        icon={<RestoreIcon />}
                        iconPosition="start"
                    />
                </Tabs>
            </Box>

            {error && (
                <Box
                    sx={{
                        my: 2,
                        p: 2,
                        backgroundColor: "#ffebee",
                        color: "#d32f2f",
                        borderRadius: "8px",
                    }}
                >
                    <Typography variant="body1">
                        <strong>Error:</strong> {error}
                    </Typography>
                </Box>
            )}

            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "300px",
                    }}
                >
                    <CircularProgress size={50} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Loading Orders...
                    </Typography>
                </Box>
            ) : (
                <>
                    {orders.length === 0 && !error ? (
                        <Typography variant="h6" sx={{ textAlign: "center", mt: 4 }}>
                            No orders found for this status.
                        </Typography>
                    ) : (
                        <div className={styles.ordersGrid}>
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className={`${styles.orderCard} ${getReportStatusClassName(
                                        order.reportStatus
                                    )}`}
                                >
                                    <h3>🧾 Order ID: {order.id}</h3>
                                    <div className={styles.orderInfo}>
                                        <p>
                                            <strong>Customer:</strong>{" "}
                                            {order.userName || "Fetching Name..."}
                                        </p>
                                        <p>
                                            <strong>Order Time:</strong> {order.timestamp}
                                        </p>
                                        <p>
                                            <strong>Delivery Address:</strong>{" "}
                                            {order.deliveryAddress || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Payment Status:</strong> {order.paymentStatus}
                                        </p>
                                        <p>
                                            <strong>Payment Method:</strong> {order.paymentMethod}
                                        </p>
                                        <p>
                                            <strong>Voucher Code:</strong> {order.voucherCode}
                                        </p>
                                        <p>
                                            <strong>Order Note:</strong> {order.note}
                                        </p>
                                    </div>

                                    {/* NEW: Report Status Display for "Not Delivered" */}
                                    {order.status === "completed" && order.reportStatus === 1 && (
                                        <div className={styles.reportWarningBox}>
                                            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                                                🚨 Order Reported: Not Delivered!
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <strong>Reason:</strong> Customer reported the order was
                                                not delivered.
                                            </Typography>
                                            {order.reportAdditionalInfo && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    <strong>Customer Comments:</strong>{" "}
                                                    {order.reportAdditionalInfo}
                                                </Typography>
                                            )}
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                onClick={() => handleRedelivery(order.id, order.userId)}
                                                sx={{ mt: 2 }}
                                            >
                                                🔄 Set for Redelivery
                                            </Button>
                                        </div>
                                    )}


                                    {/* NEW: Report Status Display for "Quality Issues" */}
                                    {order.status === "completed" && order.reportStatus === 2 && (
                                        <div className={styles.reportWarningBox}>
                                            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                                                🚨 Order Reported: Quality Issues!
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <strong>Reason:</strong> Customer reported quality issues with the food.
                                            </Typography>
                                            {order.reportAdditionalInfo && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    <strong>Customer Comments:</strong>{" "}
                                                    {order.reportAdditionalInfo}
                                                </Typography>
                                            )}
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                onClick={() => handleMarkQualityIssueHandled(order.id)}
                                                sx={{ mt: 2 }}
                                            >
                                                ✅ Mark as Handled
                                            </Button>
                                        </div>
                                    )}

                                    {/* NEW: Report Status Display for "Wrong Food" */}
                                    {order.status === "completed" && order.reportStatus === 3 && (
                                        <div className={styles.reportWarningBox}>
                                            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                                                🚨 Order Reported: Wrong Food!
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <strong>Reason:</strong> Customer received wrong food items.
                                            </Typography>
                                            {order.reportAdditionalInfo && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontStyle: "italic" }}
                                                >
                                                    <strong>Customer Comments:</strong>{" "}
                                                    {order.reportAdditionalInfo}
                                                </Typography>
                                            )}
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                onClick={() => handleMarkWrongFoodHandled(order.id)}
                                                sx={{ mt: 2 }}
                                            >
                                                ✅ Mark as Handled
                                            </Button>
                                        </div>
                                    )}


                                    {/* Update the existing "Display for Handled Reports" section to cover all handled cases */}
                                    {order.status === "delivering" && order.reportStatus === -1 && (
                                        <div className={styles.reportHandledBox}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "orange", fontWeight: "bold" }}
                                            >
                                                ✅ Report Handled: Order is being redelivered.
                                            </Typography>
                                        </div>
                                    )}

                                    {/* NEW: Display for Handled Reports (Quality Issues & Wrong Food) */}
                                    {order.status === "completed" && order.reportStatus === -1 && (
                                        <div className={styles.reportHandledBox}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "orange", fontWeight: "bold" }}
                                            >
                                                ✅ Report Handled: Issue has been addressed.
                                            </Typography>
                                        </div>
                                    )}

                                    {/* Update the existing "Order Completed" condition to exclude ALL report types */}
                                    {order.status === "completed" &&
                                        (order.reportStatus === 0 || order.reportStatus === undefined) && (
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "green", fontWeight: "bold", mt: 1 }}
                                            >
                                                Order Completed
                                            </Typography>
                                        )}
                                    {order.status === "retrieved" &&
                                        (order.reportStatus === 0 || order.reportStatus === undefined) && (
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "red", fontWeight: "bold", mt: 1 }}
                                            >
                                                Order Retrieved
                                            </Typography>
                                        )}

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
                                                    <div>
                                                        <strong>{item.name}</strong>
                                                    </div>
                                                    <div>Quantity: {item.quantity}</div>
                                                    <div>
                                                        Price: {item.price?.toLocaleString() || 0} $
                                                    </div>
                                                    <div>
                                                        Total:{" "}
                                                        {(
                                                            item.quantity * (item.price || 0)
                                                        ).toLocaleString()}{" "}
                                                        $
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className={styles.orderTotal}>
                                        <strong>🧮 Order Total:</strong>{" "}
                                        {order.total.toLocaleString()} $
                                    </p>

                                    <div className={styles.statusActionSection}>
                                        {order.status === "pending" && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() =>
                                                    handleMarkCompleted(order.id, order.userId)
                                                }
                                                sx={{ mt: 1 }}
                                            >
                                                ✅ Mark Delivering
                                            </Button>
                                        )}
                                        {order.status === "delivering" && (
                                            <>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "orange", fontWeight: "bold", mt: 1 }}
                                                >
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
                                        {order.status === "completed" &&
                                            order.reportStatus !== 1 && ( // Only show "Order Completed" if not reported as 'not delivered'
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "green", fontWeight: "bold", mt: 1 }}
                                                >
                                                    Order Completed
                                                </Typography>
                                            )}
                                        {order.status === "retrieved" && ( // Only show "Order Completed" if not reported as 'not delivered'
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "red", fontWeight: "bold", mt: 1 }}
                                            >
                                                Order Retrieved
                                            </Typography>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            mt: 3,
                            mb: 3,
                            gap: 2,
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={handlePrevPage}
                            disabled={!hasMorePrev || loading}
                        >
                            Previous
                        </Button>
                        <Typography variant="body1" sx={{ alignSelf: "center" }}>
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
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity="info"
                    sx={{ width: "100%" }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default OrdersManagement;
