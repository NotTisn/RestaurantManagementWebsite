# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# 🍽️ Ứng dụng Quản Lý Món Ăn Nhà Hàng (React + Vite + Firebase)

Đây là ứng dụng web đơn giản để quản lý món ăn trong nhà hàng: thêm, sửa, xóa món ăn. Dữ liệu được lưu trữ realtime trên **Firebase Firestore**. Giao diện được xây dựng bằng **React + Vite**.

---

## 🛠️ Công nghệ sử dụng

- ⚛️ React (với Vite)
- 🔥 Firebase (Firestore)
- 🧪 ESLint + Prettier (tùy chọn)

---

## 🚀 Tính năng chính

- ✅ Thêm món ăn
- ✏️ Sửa món ăn
- 🗑️ Xóa món ăn
- 🔄 Đồng bộ dữ liệu thời gian thực với Firebase

---

## ⚙️ Cách chạy ứng dụng

> 📌 **Không cần biết trước React/Firebase vẫn làm theo được nha!**

### 1. Clone dự án
git clone https://github.com/<tên-github>/<tên-repo>.git
cd <tên-repo>

### 2. Tải Node.js
Tải ở đây: https://nodejs.org (dùng v22.14.0 cho đồng bộ)
Xong rồi kiểm tra:
node -v
npm -v

### 3. Cài dependencies
npm install

### 4. Chạy ứng dụng
npm run dev

