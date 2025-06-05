import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box, Button } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

import './Sidebar.css'; 

const drawerWidth = 240; 

function Sidebar() {
  const navigate = useNavigate(); 
  const location = useLocation();
  const [open] = useState(true); 

  const menuItems = [
    { path: '/app', text: 'Dashboard', icon: <HomeIcon /> },
    { path: '/app/voucher', text: 'Voucher', icon: <LocalOfferIcon /> },
    { path: '/app/food', text: 'Dishes', icon: <RestaurantMenuIcon /> },
    { path: '/app/orders', text: 'Orders', icon: <ShoppingCartIcon /> },
    { path: '/app/statistics', text: 'Statistics', icon: <AssessmentIcon /> },
    { path: '/app/message', text: 'Messenger', icon: <PeopleIcon /> },
    { path: '/app/categories', text: 'Categories', icon: <LocalOfferIcon /> },
  ];

  const handleLogout = async () => { 
    try {
      await signOut(auth); 
      console.log('User logged out successfully from Firebase');
      navigate('/'); 
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
      variant="permanent"
      anchor="left"
      open={open}
      PaperProps={{
        className: 'sidebar-drawer-paper',
      }}
    >
      <Box>
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
                margin: '8px 16px',
                borderRadius: '8px',
                padding: '10px 16px',
                transition: 'background-color 0.3s, color 0.3s',
                ...(location.pathname === item.path && {
                  backgroundColor: '#1976d2',
                  color: 'white',
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
              <ListItemIcon className="sidebar-list-item-icon" sx={{ minWidth: '40px' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 2, pb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          startIcon={<ExitToAppIcon />}
          onClick={handleLogout}
          sx={{
            borderRadius: '8px',
            padding: '10px 0',
            fontWeight: 'bold',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: '#d32f2f',
              boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  );
}

export default Sidebar;