// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css'; // Import file CSS (sẽ tạo ở bước sau)
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* 2. Có thể bọc tiêu đề/logo bằng Link về trang chủ */}
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
           <h2>Nhà Hàng XYZ</h2>
        </Link>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            {/* Thay thế <a> bằng <Link> và href bằng to */}
            <Link to="/food">Quản lý Món ăn</Link>
          </li>
          <li>
            <Link to="/orders">Quản lý Đơn hàng</Link>
          </li>
          <li>
            <Link to="/statistics">Thống kê Doanh thu</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;