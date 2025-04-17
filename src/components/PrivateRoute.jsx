import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";

const PrivateRoute = ({ children }) => {
 const { currentUser, loading } = useAuth();

 // Nếu đang tải trạng thái đăng nhập, hiển thị loading indicator
 if (loading) {
 return (
        <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh" // Để hiển thị ở giữa màn hình (tùy chọn)
        >
        <CircularProgress />
        </Box>
 );
 }

 // Nếu đã tải xong và người dùng không tồn tại (chưa đăng nhập), chuyển hướng về trang /
 if (!currentUser) {
 return <Navigate to="/" />;
 }

 // Nếu đã tải xong và người dùng tồn tại, hiển thị nội dung
 return children;
};

export default PrivateRoute;