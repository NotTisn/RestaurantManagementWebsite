import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People'; 
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; 
import './Sidebar.css'; 

const drawerWidth = 240; 

function Sidebar() {
  const location = useLocation();
  const [open] = useState(true); 

  const menuItems = [
    { path: '/app', text: 'Dashboard', icon: <HomeIcon /> },
    { path: '/app/voucher', text: 'Quản lý voucher', icon: <LocalOfferIcon /> },
    { path: '/app/food', text: 'Quản lý Món ăn', icon: <RestaurantMenuIcon /> },
    { path: '/app/orders', text: 'Quản lý Đơn hàng', icon: <ShoppingCartIcon /> },
    { path: '/app/statistics', text: 'Thống kê Doanh thu', icon: <AssessmentIcon /> },
    { path: '/app/message', text: 'Messenger', icon: <PeopleIcon /> },
  ]

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
                '&:hover': { 
                  backgroundColor: '#1565c0', 
                },
              }),
              '&:hover': {
                backgroundColor: location.pathname === item.path ? '#1565c0' : '#e9ecef', 
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