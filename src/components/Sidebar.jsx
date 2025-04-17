import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People'; // Thêm icon Customer
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // Thêm icon Delivery
import './Sidebar.css'; // Import file CSS

const drawerWidth = 240; // Điều chỉnh độ rộng sidebar nếu cần

function Sidebar() {
  const location = useLocation();
  const [open] = useState(true); // Sidebar luôn mở trong ví dụ này

  const menuItems = [
    { path: '/app', text: 'Dashboard', icon: <HomeIcon /> },
    { path: '/app/customer', text: 'Customer', icon: <PeopleIcon /> },
    { path: '/app/delivery', text: 'Delivery', icon: <LocalShippingIcon /> },
    { path: '/app/food', text: 'Quản lý Món ăn', icon: <RestaurantMenuIcon /> },
    { path: '/app/orders', text: 'Quản lý Đơn hàng', icon: <ShoppingCartIcon /> },
    { path: '/app/statistics', text: 'Thống kê Doanh thu', icon: <AssessmentIcon /> },
  ];

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="permanent"
      anchor="left"
      open={open}
      PaperProps={{
        className: 'sidebar-drawer-paper',
      }}
    >
      <Toolbar className="sidebar-toolbar">
        <Link to="/app" className="sidebar-logo-link">
          <Box className="sidebar-logo-box">
            {/* Thay thế đoạn text bằng hình ảnh logo nếu bạn có */}
            {/* <img src="/logo.png" alt="Logo" style={{ maxWidth: '150px', marginBottom: '8px' }} /> */}
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Nhà Hàng XYZ
            </Typography>
          </Box>
        </Link>
      </Toolbar>
      <List>
        {menuItems.map((item, index) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            className="sidebar-menu-item"
            sx={{
              ...(location.pathname === item.path && {
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: '8px',
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
                '&:hover': { // Thêm hover style cho mục đang được chọn
                  backgroundColor: '#1565c0', // Màu xanh đậm hơn khi hover
                },
              }),
              '&:hover': {
                backgroundColor: location.pathname === item.path ? '#1565c0' : '#e9ecef', // Chỉ đổi màu hover nếu không phải mục đang chọn
              },
            }}
          >
            <ListItemIcon className="sidebar-list-item-icon">{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

export default Sidebar;