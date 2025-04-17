import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link, Navigate } from "react-router-dom";

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const {login, userRole } = useAuth(); // Lấy thông tin người dùng hiện tại
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(emailRef.current.value, passwordRef.current.value);
      console.log(userRole)
      if (userRole === "restaurantOwner") {
        navigate("/app"); // Chuyển hướng đến trang chính sau khi đăng nhập thành công
      }
      else {
        // Xử lý trường hợp không xác định vai trò hoặc vai trò không được phép truy cập
        setError("Bạn không có quyền truy cập trang này.");
      }
    } catch (err) {
      setError(`Đăng nhập thất bại! ${err.message}`);
    }
    setLoading(false);
  }


  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Đăng nhập</h2>
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
          <button disabled={loading} type="submit" style={styles.button}>
            Đăng nhập
          </button>
        </form>
        <p style={styles.footerText}>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
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
