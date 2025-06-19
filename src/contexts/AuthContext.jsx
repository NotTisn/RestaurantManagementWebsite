import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { projectAuth, projectFirestore } from "../firebaseConfig";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(false);

  const signup = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(projectAuth, email, password);
      setCurrentUser(userCredential.user);
      console.log(userCredential)
      console.log(`User credetial UID: ${userCredential.uid}`)
      console.log(`User UID: ${userCredential.user.uid}`)
      toast.success("Registration successful!");
      return userCredential.user;
    }
    catch (error) {
      toast.error(`Registration failed: ${error.message}`);
      throw error;
    }
  }

  const login = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(projectAuth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(projectFirestore, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      let role = null;
      if (docSnap.exists()) {
        role = docSnap.data().role;
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      console.log(role)
      return role; // Return the role directly
    } catch (error) {
      setUserRole(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setRestaurantOwner = async (restaurantOwner) => {
    console.log("Running...")
    setUserRole(restaurantOwner)
  }

  const resetUserRole = async () => {
    setUserRole(undefined);
  }

  const logout = () => {
    setUserRole(null);
    setIsLogin(false);
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
    setIsLogin,
    resetUserRole,
    isLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
export const useAuthContext = () => useContext(AuthContext);


