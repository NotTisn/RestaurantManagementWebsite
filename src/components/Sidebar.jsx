// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css'; // Import file CSS (sẽ tạo ở bước sau)
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* 2. Có thể bọc tiêu đề/logo bằng Link về trang chủ */}
        <Link to="/app" style={{ textDecoration: 'none', color: 'inherit' }}>
           <h2>Nhà Hàng XYZ</h2>
        </Link>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/app/food">Quản lý Món ăn</Link>
          </li>
          <li>
            <Link to="/app/orders">Quản lý Đơn hàng</Link>
          </li>
          <li>
            <Link to="/app/statistics">Thống kê Doanh thu</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;