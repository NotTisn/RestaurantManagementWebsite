// pages/Login.js
import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify"; // Đảm bảo sử dụng react-toastify nhất quán

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, userRole, resetUserRole, logout, isLogin, setIsLogin } = useAuth();
  // const [error, setError] = useState(""); // Loại bỏ state này vì lỗi sẽ được xử lý bằng toast
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    // setError("");
    setLoading(true);
    try {
      // Vì bất đồng bộ nên khi await login cho nó trả về role luôn, nên nó sẽ cập nhật lại role hợp lệ
      // Giữ nguyên ở dòng 23 cho tới khi role được cập nhật
      // Có thể refresh trang mà không tự động đăng nhập
      const role = await login(emailRef.current.value, passwordRef.current.value);
      if (role === "restaurantOwner") {
        toast.success("Login successful!");
        navigate('/app')
      } else {
        toast.error("You do not have permission.");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
    }
    setLoading(false);
  }

  // Không sử dụng useEffect => comment lại 

  // useEffect(() => {
  //   if (!isLogin) {
  //     if (userRole === "restaurantOwner") {
  //       setIsLogin(true);
  //       resetUserRole(); // Đặt lại userRole để tránh re-trigger effect không cần thiết
  //       navigate("/app");
  //     } else if (userRole !== null && userRole !== undefined) {
  //       toast.error("You do not have permission.");
  //     }
  //   } else {
  //     logout();
  //   }
  // }, [userRole, navigate, resetUserRole]); // Thêm resetUserRole vào dependency array

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>
        {/* {error && <p style={styles.error}>{error}</p>}  // Loại bỏ hiển thị lỗi cục bộ */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Email</label>
            <input type="email" ref={emailRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label>Password</label>
            <input type="password" ref={passwordRef} required style={styles.input} />
          </div>
          <button disabled={loading} type="submit" style={styles.button}>
            Login
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
    backgroundColor: "#f3f4f6",
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