// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // Thêm nếu bạn cần xác thực
// import { getStorage } from "firebase/storage"; // Thêm nếu bạn cần lưu trữ file

// Your web app's Firebase configuration
// TODO: Thay thế bằng cấu hình Firebase của BẠN
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

// Get other instances if needed
// const auth = getAuth(app);
// const storage = getStorage(app);

// Export the instances you need
export { db }; // Chỉ export db nếu chỉ cần Firestore
// export { db, auth, storage }; // Export nhiều hơn nếu cần