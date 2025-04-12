// // src/App.jsx
// import React, { useState, useEffect } from 'react';
// // Import các hàm cần thiết từ Firestore SDK
// import { collection, onSnapshot, addDoc } from "firebase/firestore";
// // Import instance 'db' đã cấu hình từ firebaseConfig.js
// import { db } from './firebaseConfig';

// import Sidebar from './components/Sidebar';
// import './App.css';
// import { Routes, Route } from 'react-router-dom';
// import Dashboard from './pages/Dashboard';
// import FoodManagement from './pages/FoodManagement';
// import OrdersManagement from './pages/OrdersManagement';
// import Statistics from './pages/Statistics';

// // Tên collection trong Firestore của bạn
// const DISHES_COLLECTION_NAME = 'food';

// function App() {
//   // State để lưu danh sách món ăn
//   const [dishes, setDishes] = useState([]);
//   // State để quản lý trạng thái tải dữ liệu
//   const [loading, setLoading] = useState(true);
//   // State để lưu thông báo lỗi nếu có
//   const [error, setError] = useState(null);

//   // Sử dụng useEffect để lắng nghe thay đổi dữ liệu real-time với onSnapshot
//   useEffect(() => {
//     setLoading(true); // Bắt đầu tải
//     setError(null);   // Reset lỗi cũ (nếu có)

//     // Tạo tham chiếu đến collection món ăn trong Firestore
//     const dishesCollectionRef = collection(db, DISHES_COLLECTION_NAME);

//     // Thiết lập trình lắng nghe onSnapshot
//     // Hàm này sẽ chạy ngay lập tức với dữ liệu hiện tại
//     // và chạy lại mỗi khi dữ liệu trong collection thay đổi
//     const unsubscribe = onSnapshot(dishesCollectionRef, (querySnapshot) => {
//       // Map qua các document trong snapshot để lấy dữ liệu
//       const dishesData = querySnapshot.docs.map(doc => ({
//         id: doc.id,      // Lấy ID duy nhất của document Firestore
//         ...doc.data()    // Lấy tất cả các trường dữ liệu khác (name, price, description,...)
//       }));
//       setDishes(dishesData); // Cập nhật state với dữ liệu mới
//       setLoading(false);     // Đánh dấu đã tải xong
//       console.log("Realtime dishes update:", dishesData); // Log để kiểm tra
//     }, (err) => { // Hàm xử lý khi có lỗi xảy ra trong quá trình lắng nghe
//       console.error("Error listening to dishes collection: ", err);
//       setError("Không thể lắng nghe cập nhật món ăn. Vui lòng kiểm tra kết nối hoặc cấu hình Firestore.");
//       setLoading(false); // Đánh dấu đã tải xong (dù là lỗi)
//     });

//     // Cleanup function: Rất quan trọng!
//     // Hàm này sẽ được React gọi khi component unmount (ví dụ: chuyển trang)
//     // Nó sẽ gỡ bỏ trình lắng nghe onSnapshot để tránh memory leak.
//     return () => {
//       unsubscribe();
//       console.log("Unsubscribed from dishes listener");
//     };
//   }, []); // Mảng dependency rỗng `[]` đảm bảo effect này chỉ chạy 1 lần khi component mount


//   // Hàm xử lý thêm món ăn mới vào Firestore
//   const handleAddDishToState = async (newDishData) => {
//     // newDishData nên là object chứa các trường dữ liệu cần thêm, ví dụ:
//     // { name: 'Bún Bò Huế', price: 55000, description: 'Bún bò đặc biệt' }
//     try {
//       // Tham chiếu đến collection
//       const dishesCollectionRef = collection(db, DISHES_COLLECTION_NAME);
//       // Gọi addDoc để thêm document mới, Firestore sẽ tự tạo ID
//       const docRef = await addDoc(dishesCollectionRef, newDishData);
//       console.log("Document successfully written with ID: ", docRef.id);

//       // --- QUAN TRỌNG ---
//       // Với onSnapshot, bạn KHÔNG cần gọi setDishes ở đây.
//       // Ngay sau khi addDoc thành công, onSnapshot sẽ tự động phát hiện
//       // thay đổi trên Firestore và cập nhật lại state `dishes` cho bạn.
//       // Giao diện sẽ tự động render lại với món ăn mới.

//     } catch (error) {
//       console.error("Error adding document: ", error);
//       // Bạn có thể hiển thị thông báo lỗi cho người dùng ở đây
//       setError("Lỗi khi thêm món ăn vào Firestore.");
//     }
//   };

//   // Phần JSX để render giao diện
//   return (
//     <div className="app-layout">
//       <Sidebar />
//       <main className="main-content">
//         {/* Hiển thị trạng thái loading */}
//         {loading && <p>Đang tải danh sách món ăn...</p>}

//         {/* Hiển thị thông báo lỗi nếu có */}
//         {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}

//         {/* Chỉ hiển thị nội dung chính (Routes) khi không loading và không có lỗi */}
//         {!loading && !error && (
//           <Routes>
//             <Route path="/" element={<Dashboard />} />
//             <Route
//               path="/food"
//               // Truyền danh sách món ăn (dishes) và hàm thêm món (handleAddDishToState)
//               element={<FoodManagement dishes={dishes} onAddDish={handleAddDishToState} />}
//             />
//             <Route path="/orders" element={<OrdersManagement />} />
//             <Route path="/statistics" element={<Statistics />} />
//             {/* Bạn có thể thêm Route 404 nếu muốn */}
//             {/* <Route path="*" element={<NotFound />} /> */}
//           </Routes>
//         )}
//       </main>
//     </div>
//   );
// }

// export default App;

// src/App.jsx
import React from 'react'; // Không cần useState, useEffect ở đây nữa
// Import các hàm Firestore không cần ở đây nữa nếu chỉ dùng trong FoodManagement
// import { collection, onSnapshot, addDoc } from "firebase/firestore";
// import { db } from './firebaseConfig'; // db sẽ được import trong FoodManagement

import Sidebar from './components/Sidebar';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FoodManagement from './pages/FoodManagement';
import OrdersManagement from './pages/OrdersManagement';
import Statistics from './pages/Statistics';
// import NotFound from './pages/NotFound'; // Nếu bạn có trang 404

// Tên collection không cần ở đây nữa
// const DISHES_COLLECTION_NAME = 'food';

function App() {
  // Phần JSX để render giao diện
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/food"
            // Không cần truyền props dishes và onAddDish nữa
            element={<FoodManagement />}
          />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/statistics" element={<Statistics />} />
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </main>
    </div>
  );
}

export default App;