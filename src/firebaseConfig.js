import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";


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

export const auth = getAuth();
export const storage = getStorage(app);
export { db, projectAuth, projectFirestore, collectionGroup }; 
