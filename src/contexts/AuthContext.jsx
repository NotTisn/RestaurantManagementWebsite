import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { projectAuth, projectFirestore } from "../firebaseConfig";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(projectAuth, email, password);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(projectAuth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(projectFirestore, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      } else {
        console.error("User document not found in Firestore");
        setUserRole(null);
      }

      setCurrentUser(user);
      return userCredential;
    } catch (error) {
      setUserRole(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserRole(null);
    return signOut(projectAuth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(projectAuth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(projectFirestore, "users", user.uid);
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
    userRole,
    loading,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
export const useAuthContext = () => useContext(AuthContext);


