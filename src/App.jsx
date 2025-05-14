import React from 'react'; // Không cần useState, useEffect ở đây nữa
// Import các hàm Firestore không cần ở đây nữa nếu chỉ dùng trong FoodManagement
// import { collection, onSnapshot, addDoc } from "firebase/firestore";
// import { db } from './firebaseConfig'; // db sẽ được import trong FoodManagement

import Sidebar from './components/Sidebar';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import FoodManagement from './pages/food/FoodManagement';
import OrdersManagement from './pages/orders/OrdersManagement';
import Statistics from './pages/statistics/Statistics';
import PrivateRoute from "./components/PrivateRoute"; 
import Login from './pages/Login';
import PrivateLayout from './components/PrivateLayout';
import Register from './pages/Register';
import Message from './pages/message/Message'


function App() {
  console.log("App started");

  // Phần JSX để render giao diện
  return (
    
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path='/register' element={<Register />} />

        <Route
        path="/app"
        element={
          <PrivateRoute>
            <PrivateLayout />
          </PrivateRoute>
        }
        >
        <Route index element={<Dashboard />} />
        <Route path="food" element={<FoodManagement />} />
        <Route path="orders" element={<OrdersManagement />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="message" element={<Message/>}/>
      </Route>
      console.log("App started");

      </Routes>
  );
}

export default App;