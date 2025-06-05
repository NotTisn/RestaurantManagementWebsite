import React from 'react';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your dashboard</p>
      </header>
      
      <section className="dashboard-cards">
        <div className="card">
          <h2>Order</h2>
          <p>123</p>
        </div>
        <div className="card">
          <h2>Table</h2>
          <p>15</p>
        </div>
        <div className="card">
          <h2>Profit</h2>
          <p>$5,678</p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
