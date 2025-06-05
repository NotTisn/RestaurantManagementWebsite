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
import VoucherManagementPage from './pages/voucher/VoucherManagementPage';
import CategoryManagement from './pages/category/CategoryManagement';


function App() {
  console.log("App started");

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
        <Route path="voucher" element={<VoucherManagementPage/>}/>
        <Route path="categories" element={<CategoryManagement />} />
        </Route>
      console.log("App started");

      </Routes>
  );
}

export default App;