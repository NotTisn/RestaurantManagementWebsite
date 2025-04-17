// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { projectAuth, projectFirestore } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

// Xuất useAuth dưới dạng named export
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Hàm đăng ký
  function signup(email, password) {
    return createUserWithEmailAndPassword(projectAuth, email, password);
  }

  // Hàm đăng nhập
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(projectAuth, email, password);
      const user = userCredential.user;

      // Sau khi đăng nhập thành công, lấy vai trò từ Firestore
      const userDocRef = doc(projectFirestore, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      } else {
        // Xử lý trường hợp không tìm thấy thông tin người dùng trong Firestore
        console.error("Không tìm thấy thông tin người dùng trong Firestore");
        setUserRole(null); // Hoặc một vai trò mặc định
      }
      setCurrentUser(user);
      return userCredential; // Trả về userCredential nếu cần
    } catch (error) {
      setUserRole(null); // Reset vai trò khi đăng nhập thất bại
      throw error;
    }
  }

  // Hàm đăng xuất
  function logout() {
    setUserRole(null);
    return signOut(projectAuth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(projectAuth, async user => {
      if (user) {
        setCurrentUser(user);
        // Khi trạng thái auth thay đổi, cũng lấy vai trò nếu người dùng đã đăng nhập
        const userDocRef = doc(projectFirestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        } else {
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading, 
    userRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}