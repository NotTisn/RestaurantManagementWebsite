// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";


const PrivateRoute = ({ children }) => {
  const { currentUser, } = useAuth();

  // Nếu người dùng không tồn tại (chưa đăng nhập), chuyển hướng về trang /
  if (!currentUser) {
    return <Navigate to="/" />;
  }
  return children;
};

export default PrivateRoute;
