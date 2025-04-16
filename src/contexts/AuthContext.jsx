// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { projectAuth } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const AuthContext = createContext();

// Xuất useAuth dưới dạng named export
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm đăng ký
  function signup(email, password) {
    return createUserWithEmailAndPassword(projectAuth, email, password);
  }

  // Hàm đăng nhập
  function login(email, password) {
    return signInWithEmailAndPassword(projectAuth, email, password);
  }

  // Hàm đăng xuất
  function logout() {
    return signOut(projectAuth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(projectAuth, user => {
        if (user) {
            // Kiểm tra xem user có dữ liệu thực sự không
            setCurrentUser(user); // Cập nhật currentUser nếu có người dùng đăng nhập
          } else {
            setCurrentUser(null); // Xóa currentUser nếu không có người dùng đăng nhập
          }
          setLoading(false); // Đảm bảo không có trạng thái loading
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}