import React from 'react';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Chào mừng bạn đến với hệ thống quản lý nhà hàng hiện đại!</p>
      </header>
      
      <section className="dashboard-cards">
        <div className="card">
          <h2>Đơn Hàng</h2>
          <p>123</p>
        </div>
        <div className="card">
          <h2>Bàn Hoạt Động</h2>
          <p>15</p>
        </div>
        <div className="card">
          <h2>Doanh Thu</h2>
          <p>$5,678</p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
