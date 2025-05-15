// src/components/Register.jsx
import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebaseConfig"; // Import the Firebase database instance
import { doc, setDoc } from "firebase/firestore"; // Import Firestore functions

export default function Register() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const restaurantNameRef = useRef(); // Thêm ref cho tên nhà hàng
  const phoneRef = useRef(); // Thêm ref cho số điện thoại
  const addressRef = useRef(); // Thêm ref cho địa chỉ
  const { signup } = useAuth(); // Get currentUser from AuthContext
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Mật khẩu không khớp");
    }

    try {
      setError("");
      setLoading(true);
      const currentUser = await signup(emailRef.current.value, passwordRef.current.value);

      // const user = currentUser.user;
      // console.log(currentUser);
      // console.log(currentUser.uid)

      // Sau khi đăng ký thành công, lưu thêm thông tin nhà hàng vào Firestore
      const restaurantData = {
        name: restaurantNameRef.current.value,
        phoneNumber: phoneRef.current.value,
        address: addressRef.current.value,
        uid: currentUser.uid, // Lưu userId để liên kết với tài khoản người dùng
        role: "restaurantOwner", // Lưu vai trò để xác định quyền truy cập
        email: emailRef.current.value
      };
      console.log("Thông tin nhà hàng:", restaurantData);

      // Tạo một document trong collection "restaurants" với ID là UID của người dùng
      const restaurantDocRef = doc(db, "users", currentUser.uid);
      await setDoc(restaurantDocRef, restaurantData);
      console.log("Thông tin nhà hàng đã được lưu vào Firestore");

      await setDoc(doc(db, "userChats", currentUser.uid), {});
      navigate("/");
    } catch (err) {
      setError(`Tạo tài khoản thất bại! ${err.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Đăng ký</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Email</label>
            <input type="email" ref={emailRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Mật khẩu</label>
            <input type="password" ref={passwordRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Xác nhận mật khẩu</label>
            <input
              type="password"
              ref={passwordConfirmRef}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Tên nhà hàng</label>
            <input type="text" ref={restaurantNameRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Số điện thoại nhà hàng</label>
            <input type="tel" ref={phoneRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
            <label>Địa chỉ nhà hàng</label>
            <input type="text" ref={addressRef} required style={styles.input} />
          </div>
          <button disabled={loading} type="submit" style={styles.button}>
            Đăng ký
          </button>
        </form>
        <p style={styles.footerText}>
          Đã có tài khoản? <Link to="/">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f3f4f6", // xám nhạt nền
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    marginBottom: "20px",
    textAlign: "center",
    fontSize: "24px",
    color: "#111827",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
  },
  button: {
    padding: "10px",
    borderRadius: "5px",
    backgroundColor: "#3b82f6", // xanh dương
    color: "white",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  },
  error: {
    color: "#ef4444",
    fontSize: "14px",
    marginBottom: "10px",
  },
  footerText: {
    marginTop: "15px",
    textAlign: "center",
    fontSize: "14px",
  },
};