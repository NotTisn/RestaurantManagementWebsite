import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where, documentId } from 'firebase/firestore'; // Import necessary Firestore functions
import { db } from '../../firebaseConfig';
import styles from './OrdersManagement.module.css'; // Assuming this is a CSS module

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({}); // State to store user data mapped by userId

  useEffect(() => {
    const ordersCollectionRef = collection(db, 'orders');
    const usersCollectionRef = collection(db, 'users'); // Reference to your users collection

    const unsub = onSnapshot(ordersCollectionRef, async (snapshot) => {
      const ordersData = [];
      const uniqueUserIds = new Set(); // Use a Set to get unique user IDs

      // biome-ignore lint/complexity/noForEach: <explanation>
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const order = {
          id: docSnap.id,
          items: d.items || [],
          total: d.total || 0,
          voucherCode: d.voucherCode || [],
          userId: d.userId || 'Unknown', // Get the userId
          status: d.status || 'pending',
          // userName will be added after fetching user data
        };
        ordersData.push(order);
        if (order.userId && order.userId !== 'Unknown') {
          uniqueUserIds.add(order.userId); // Add userId to the Set
        }
      });

      // --- Fetch user data based on unique user IDs ---
      const userIdsArray = Array.from(uniqueUserIds);
      const fetchedUsersMap = {};

      if (userIdsArray.length > 0) {
        // Firestore 'in' query has a limit of 10. We need to chunk the user IDs if there are more than 10.
        const chunkSize = 10;
        const userIdChunks = [];
        for (let i = 0; i < userIdsArray.length; i += chunkSize) {
          userIdChunks.push(userIdsArray.slice(i, i + chunkSize));
        }

        const userPromises = userIdChunks.map(chunk => {
          const userQuery = query(usersCollectionRef, where(documentId(), 'in', chunk));
          return getDocs(userQuery);
        });

        try {
          const userSnapshots = await Promise.all(userPromises);

          // biome-ignore lint/complexity/noForEach: <explanation>
          userSnapshots.forEach(userSnapshot => {
            // biome-ignore lint/complexity/noForEach: <explanation>
            userSnapshot.forEach(userDocSnap => {
              const userData = userDocSnap.data();
              fetchedUsersMap[userDocSnap.id] = userData; // Map userId to user data
            });
          });
          setUsersMap(fetchedUsersMap); // Update usersMap state

        } catch (error) {
          console.error("Error fetching user data:", error);
          // You might want to show an error message to the user here
          setUsersMap({}); // Clear map on error or handle differently
        }
      } else {
           setUsersMap({}); // No users to fetch
      }
      // --- End Fetch user data ---

      // Now, combine order data with fetched user names
      const ordersWithUserNames = ordersData.map(order => {
          const user = fetchedUsersMap[order.userId]; // Get user data from the map
          return {
              ...order,
              userName: user?.name || 'Unknown User', // Add userName property (assuming user document has a 'name' field)
              // If user is not found or has no name, default to 'Unknown User'
          };
      });

      setOrders(ordersWithUserNames); // Set the state with orders including user names
    });

    // Cleanup the listener
    return () => unsub();
  }, []); // Effect runs only once on component mount

  const handleMarkCompleted = async (orderId, userId) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: 'completed' });

      // Send notification via API
      // Note: 'http://localhost:4000' will only work if the app is running on the same machine as the server.
      // For other devices/emulators, you'll need your computer's local IP address (e.g., http://192.168.1.100:4000)
      const backendUrl = 'http://localhost:4000/notify-order-completed'; // <--- Remember to change this for physical device testing!
      fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId }),
      })
      .then(response => {
        if (!response.ok) {
          console.error('Notification API call failed:', response.status, response.statusText);
          // Handle API error here (e.g., show a message to the user)
        } else {
          console.log('Notification API call successful');
        }
      })
      .catch(error => {
        console.error('Notification API call failed:', error);
        // Handle network error here
      });

    } catch (error) {
      console.error("Error updating order status in Firestore:", error);
      // Handle Firestore update error here (e.g., show a message)
    }
  };

  const getStatusClassName = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'completed': return styles.statusCompleted;
      case 'delivered': return styles.statusDelivered;
      default: return ''; // No class for unknown status
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Order Management</h1>
      <div className={styles.ordersGrid}>
        {orders.map((order) => (
          <div key={order.id} className={styles.orderCard}>
            <h3>🧾 Order ID: {order.id}</h3>
            {/* Order Information */}
            <div className={styles.orderInfo}>
              {/* Display the fetched userName instead of userId */}
              <p><strong>Customer:</strong> {order.userName || 'Fetching Name...'}</p> {/* Use userName here */}
              <p><strong>Voucher Code:</strong> {order.voucherCode && order.voucherCode.length > 0 ? order.voucherCode.join(', ') : 'None'}</p>
            </div>

            <div className={styles.itemsList}>
              <h4>📦 Products:</h4>
              {order.items.map((item, idx) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: Using index for key is acceptable here if list order is stable and items don't change position or get added/removed frequently.
                  key={idx} // Consider using a more stable key if items have unique IDs
                  className={styles.itemRow}
                >
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
                    <div>Price: {item.price}</div>
                    <div>Total: {item.total}</div>
                  </div>
                </div>
              ))}
            </div>


            <p className={styles.orderTotal}><strong>🧮 Order Total:</strong> {order.total}</p>
            {/* Status or Action Button Section */}
            <div className={styles.statusActionSection}>
              {order.status === 'pending' ? (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleMarkCompleted(order.id, order.userId)} // Pass userId to handleMarkCompleted
                >
                  ✅ Mark Completed
                </button>
              ) : (
                <div className={`${styles.statusMessage} ${getStatusClassName(order.status)}`}>
                  {order.status === 'completed' && <em>Completed, waiting for customer confirmation</em>}
                  {order.status === 'delivered' && <em>Delivered successfully</em>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrdersManagement;