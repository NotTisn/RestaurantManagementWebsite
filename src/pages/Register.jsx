import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebaseConfig"; 
import { doc, setDoc } from "firebase/firestore"; 
import toast from "react-hot-toast";
export default function Register() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const restaurantNameRef = useRef(); 
  const phoneRef = useRef(); 
  const addressRef = useRef(); 
  const { signup } = useAuth(); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      toast.error("Passwords do not match");
    }

    try {
      //setError("");
      setLoading(true);
      const currentUser = await signup(emailRef.current.value, passwordRef.current.value);


      const restaurantData = {
        name: restaurantNameRef.current.value,
        phoneNumber: phoneRef.current.value,
        address: addressRef.current.value,
        uid: currentUser.uid, 
        role: "restaurantOwner", 
        email: emailRef.current.value
      };
      console.log("Restaurant data:", restaurantData);

      const restaurantDocRef = doc(db, "users", currentUser.uid);
      await setDoc(restaurantDocRef, restaurantData);
      console.log("Restaurant data saved to Firestore");
      toast.success("Restaurant information saved!");
      await setDoc(doc(db, "userChats", currentUser.uid), {});
      navigate("/");
    } catch (err) {
      setError(`Failed to register: ${err.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Email</label>
            <input type="email" ref={emailRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label>Password</label>
            <input type="password" ref={passwordRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label>Confirm Password</label>
            <input
              type="password"
              ref={passwordConfirmRef}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label>Name</label>
            <input type="text" ref={restaurantNameRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label>Phone Number</label>
            <input type="tel" ref={phoneRef} required style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label>Address</label>
            <input type="text" ref={addressRef} required style={styles.input} />
          </div>
          <button disabled={loading} type="submit" style={styles.button}>
            Register
          </button>
        </form>
        <p style={styles.footerText}>
          Alread had an account? <Link to="/">Login</Link>
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