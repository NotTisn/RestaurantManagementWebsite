import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './OrdersManagement.module.css'; // 



function OrdersManagement() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const data = [];
      // biome-ignore lint/complexity/noForEach: <explanation>
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          items: d.items || [],
          total: d.total || 0,
          voucherCode: d.voucherCode || [],
          userId: d.userId || 'Unknown',
          status: d.status || 'pending',
        });
      });
      setOrders(data);
    });

    return () => unsub();
  }, []);

  const handleMarkCompleted = async (orderId, userId) => {
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, { status: 'completed' });
    
            // Gửi thông báo qua API
            const backendUrl = 'http://localhost:4000/notify-order-completed';
            fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, orderId }),
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Notification API call failed:', response.status, response.statusText);
                    // Xử lý lỗi API ở đây (ví dụ: hiển thị thông báo cho người dùng)
                } else {
                     console.log('Notification API call successful');
                }
            })
            .catch(error => {
                 console.error('Notification API call failed:', error);
                 // Xử lý lỗi mạng ở đây
            });
    
        } catch (error) {
             console.error("Error updating order status in Firestore:", error);
             // Xử lý lỗi cập nhật Firestore ở đây (ví dụ: hiển thị thông báo)
         }
       };
  const getStatusClassName = (status) => {
        switch (status) {
            case 'pending': return styles.statusPending;
            case 'completed': return styles.statusCompleted;
            case 'delivered': return styles.statusDelivered;
            default: return ''; // Không có class nào cho trạng thái không xác định
        }
     };
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Quản lý Đơn hàng</h1>
      <div className={styles.ordersGrid}>
        {orders.map((order) => (
          <div key={order.id} className={styles.orderCard}>
            <h3>🧾 Mã đơn: {order.id}</h3>
            {/* Thông tin đơn hàng */}
            <div className={styles.orderInfo}> {/* Áp dụng class orderInfo */}
             <p><strong>Khách:</strong> {order.userId}</p>
             <p><strong>Mã giảm giá:</strong> {order.voucherCode && order.voucherCode.length > 0 ? order.voucherCode.join(', ') : 'Không có'}</p> {/* Kiểm tra mảng voucherCode */}
            </div>

            <div className={styles.itemsList}> {/* Áp dụng class itemsList */}
              <h4>📦 Sản phẩm:</h4>
              {order.items.map((item, idx) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={idx}
                  className={styles.itemRow}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    width={60}
                    height={60}
                    className={styles.itemImage}
                  />
                  <div className={styles.itemDetails}> {/* Áp dụng class itemDetails */}
                    <div><strong>{item.name}</strong></div>
                    <div>Số lượng: {item.quantity}</div>
                    <div>Đơn giá: {item.price} đ</div>
                    <div>Tổng: {item.total} đ</div>
                  </div>
                </div>
              ))}
            </div>


            <p className={styles.orderTotal}><strong>🧮 Tổng đơn:</strong> {order.total} đ</p>
            {/* Phần hiển thị trạng thái hoặc button hành động */}
            <div className={styles.statusActionSection}> {/* Áp dụng class cho phần này */}
                 {order.status === 'pending' ? (
                     <button
                        type="button"
                        className={styles.actionButton} // Áp dụng class actionButton
                        onClick={() => handleMarkCompleted(order.id, order.userId)}
                     >
                         ✅ Đánh dấu “Làm xong”
                     </button>
                 ) : (
                     // Áp dụng class statusMessage và class màu động dựa vào trạng thái
                     <div className={`${styles.statusMessage} ${getStatusClassName(order.status)}`}>
                         {order.status === 'completed' && <em>Đã làm xong, chờ khách xác nhận</em>}
                         {order.status === 'delivered' && <em>Đã giao thành công</em>}
                     </div>
                 )}
             </div> {/* Kết thúc statusActionSection */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrdersManagement;
