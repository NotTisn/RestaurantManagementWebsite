// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyDr6AkU9bQJSwetamdd7IPtxs7UnlmRAEY",
  authDomain: "foodapp2025-482ed.firebaseapp.com	",
  projectId: "foodapp2025-482ed",
  storageBucket: "foodapp2025-482ed.firebasestorage.app",
  messagingSenderId: "78981881798",
  appId: "1:78981881798:android:7e95cc0fbf7282b2d21cc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firestore instance
const db = getFirestore(app);

const projectAuth = getAuth(app);
const projectFirestore = getFirestore(app);

// Export the instances you need
export { db, projectAuth, projectFirestore }; // Chỉ export db nếu chỉ cần Firestore
// export { db, auth, storage }; // Export nhiều hơn nếu cần
