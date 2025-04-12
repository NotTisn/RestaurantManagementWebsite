// src/pages/FoodManagement.jsx
import React, { useState, useEffect } from 'react';
// Import các hàm Firestore cần thiết VÀO ĐÂY
import { collection, onSnapshot, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from '../../firebaseConfig'; // <<< Import db vào đây
import './FoodManagement.css'; // <<< THÊM DÒNG IMPORT FILE CSS
import EditDishModal from './EditDishModal';
import AddDishModal from './AddDishModal';
import ImagePreviewModal from './ImagePreviewModal';


// Tên collection món ăn và categories được định nghĩa ở đây
const DISHES_COLLECTION_NAME = 'food';
const CATEGORIES_COLLECTION_NAME = 'categories'; 

function FoodManagement() {
    // === State quản lý dữ liệu món ăn ===
    const [dishes, setDishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Lỗi chung (tải danh sách, tải loại)

    // === State cho việc thêm món ăn ===
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addError, setAddError] = useState(null); // Lỗi riêng cho việc thêm món

    // === State cho việc fetch categories ===
    const [categories, setCategories] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categoryError, setCategoryError] = useState(null);

    // === State cho việc sửa món ăn ===
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDish, setEditingDish] = useState(null); // Lưu thông tin món đang sửa
    const [updateError, setUpdateError] = useState(null) // Lỗi riêng cho việc cập nhật

    // === State cho việc preview ảnh món ăn ===
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [selectedImageAlt, setSelectedImageAlt] = useState('');


    // === useEffect LẤY DỮ LIỆU MÓN ĂN ===
    useEffect(() => {
        setLoading(true);
        setError(null);
        const q = query(
            collection(db, DISHES_COLLECTION_NAME),
            where("isDeleted", "==", false) // Chỉ lấy những document có isDeleted = false
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dishesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            dishesData.sort((a, b) => a.name.localeCompare(b.name));
            setDishes(dishesData);
            setLoading(false);
            console.log("FoodManagement: Realtime dishes update:", dishesData);
        }, (err) => {
            console.error("FoodManagement: Error listening to dishes collection: ", err);
            setError("Không thể tải danh sách món ăn.");
            setLoading(false);
        });

        return () => {
            unsubscribe();
            console.log("FoodManagement: Unsubscribed from dishes listener");
        };
    }, []);

    // === useEffect fetch categories ===
    useEffect(() => {
        const fetchCategories = async () => {
            setCategoryLoading(true);
            setCategoryError(null);
            try {
                const categoriesCollectionRef = collection(db, CATEGORIES_COLLECTION_NAME);
                const querySnapshot = await getDocs(categoriesCollectionRef);
                const categoriesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                 categoriesData.sort((a, b) => a.name.localeCompare(b.name));
                setCategories(categoriesData);
                console.log("FoodManagement: Fetched categories:", categoriesData);
            } catch (err) {
                console.error("FoodManagement: Error fetching categories: ", err);
                setCategoryError("Không thể tải danh sách loại món ăn.");
            } finally {
                setCategoryLoading(false);
            }
        };
        fetchCategories();
    }, []);

    // === HÀM THÊM MÓN ĂN ===
    const handleAddDish = async (newDishData) => {
        setAddError(null); // Reset lỗi cập nhật cũ
        try {
            const dishesCollectionRef = collection(db, DISHES_COLLECTION_NAME);
            await addDoc(dishesCollectionRef, {
                ...newDishData,
                isDeleted: false 
            });
            console.log("FoodManagement: Document added successfully!")
            handleCloseAddModal(); // Đóng modal sau khi thêm thành công
            // onSnapshot sẽ tự cập nhật danh sách
        } catch (error) {
            console.error("FoodManagement: Error adding document: ", error);
            setAddError("Lỗi khi thêm món ăn. Vui lòng thử lại."); // Set lỗi để hiển thị trong modal
            // Không đóng modal nếu có lỗi
            // Ném lỗi ra để modal biết và dừng trạng thái isSaving
            throw error;
        }
    };

    // === HÀM SỬA THÔNG TIN MÓN ĂN ===
    const handleUpdateDish = async (dishId, updatedData) => {
        setUpdateError(null); // Reset lỗi cập nhật cũ
        const dishDocRef = doc(db, DISHES_COLLECTION_NAME, dishId)
        try {
            await updateDoc(dishDocRef, updatedData);
            console.log("FoodManagement: Document updated with ID: ", dishId)
            handleCloseEditModal(); // Đóng modal sau khi cập nhật thành công
        }
        catch(error){
            console.error("FoodManagement: Error updating document: ", error);
            setUpdateError("Lỗi khi cập nhật món ăn."); // Set lỗi riêng cho việc cập nhật
            // Không đóng modal nếu có lỗi để người dùng thấy thông báo
        }
    }

    // === HÀM XÓA MÓN ĂN ===
    const handleSoftDelete = async (dishId, dishName) => {
        if (!window.confirm(`Bạn có chắc muốn xóa món "${dishName}" không? Món ăn sẽ được ẩn đi và có thể khôi phục sau.`)) {
            return; // Không làm gì nếu người dùng hủy
       }
       setError(null); // Reset lỗi cập nhật cũ
       const dishDocRef = doc(db, DISHES_COLLECTION_NAME, dishId);
       try {
           await updateDoc(dishDocRef, { isDeleted: true });
           console.log(`Dish soft deleted successfully: ${dishId}`);
       }
       catch(error){
            console.error("Error soft deleting dish: ", error);
            setError("Đã xảy ra lỗi khi xóa món ăn."); // Hiển thị lỗi chung
       }
    }

    // === HÀM MỞ MODAL THÊM MÓN ĂN ===
    const handleOpenAddModal = () => {
        setAddError(null); // Reset lỗi cập nhật cũ khi mở modal
        setIsAddModalOpen(true); // Mở modal
    }

    // === HÀM ĐÓNG MODAL THÊM MÓN ĂN ===
    const handleCloseAddModal = () => {
        setIsAddModalOpen(false); // Đóng modal
        setAddError(null);     // Reset lỗi cập nhật (nếu có)
    }

    // === HÀM MỞ MODAL SỬA ===
    const handleEditClick = (dish) => {
        setEditingDish(dish) // Lưu món ăn cần sửa vào state
        setUpdateError(null) // Reset lỗi cập nhật cũ khi mở modal
        setIsEditModalOpen(true) // Mở modal
    }
    // === HÀM ĐÓNG MODAL SỬA === <<<< THÊM HÀM NÀY
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false); // Đóng modal
        setEditingDish(null);     // Reset món ăn đang sửa
        setUpdateError(null);     // Reset lỗi cập nhật (nếu có)
    };

    // === HÀM MỞ MODAL XEM ẢNH === 
    const handleImageClick = (imageUrl, altText) => {
        setSelectedImageUrl(imageUrl);
        setSelectedImageAlt(altText || 'Hình ảnh món ăn'); // Dùng alt text mặc định nếu cần
        setIsImageModalOpen(true);
    };

    // === HÀM ĐÓNG MODAL XEM ẢNH ===
    const handleCloseImageModal = () => {
        setIsImageModalOpen(false);
        // Không cần reset URL/Alt ngay lập tức, sẽ bị ẩn đi
        // Reset khi mở lần sau hoặc trong useEffect của modal xem ảnh nếu cần
        // setSelectedImageUrl(null);
        // setSelectedImageAlt('');
    };

    // --- Phần JSX để render ---
    return (
        <div>
            <h1>Quản lý Món ăn</h1>

            {loading && <p>Đang tải...</p>}
            {/* Hiển thị lỗi tải danh sách hoặc loại */}
            {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}
            {categoryError && <p style={{ color: 'red' }}>Lỗi: {categoryError}</p>}

            {!loading && (
                <>
                    {/* Nút mở form thêm (MODAL) */}
                    {/* Luôn hiển thị nút này nếu không loading và không có modal nào đang mở */}
                    {!isEditModalOpen && !isAddModalOpen && (
                         <button
                             type="button"
                             onClick={handleOpenAddModal}
                             className="action-button add-button" // Thêm class để style
                         >
                         Thêm món ăn mới
                         </button>
                    )}

                    {/* Bảng hiển thị danh sách món ăn (Giữ nguyên) */}
                    <div style={{ overflowX: 'auto' }} className='table-container'>
                        <table className="food-table">
                           {/* ... thead và tbody ... */}
                           <thead>
                                <tr>
                                    <th>Tên Món ăn</th>
                                    <th>Giá (VNĐ)</th>
                                    <th>Mô tả</th>
                                    <th>Loại</th>
                                    <th>Ảnh</th>
                                    <th className="col-star">Sao</th>
                                    <th>Thời gian</th>
                                    <th>Phổ biến</th>
                                    <th className="col-actions">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dishes.map((dish) => (
                                    <tr key={dish.id}>
                                        <td>{dish.name}</td>
                                        <td>{dish.price?.toLocaleString('vi-VN')}</td>
                                        <td>{dish.description}</td>
                                        <td>{dish.categoryName}</td>
                                        <td>
                                             {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                                            {dish.imageUrl ? (<img src={dish.imageUrl} alt={dish.name}className="dish-image clickable"
                                            onClick={() => handleImageClick(dish.imageUrl, dish.name)}
                                            onError={() => { /*...*/ }} />) : (<span className="no-image-text">Không có ảnh</span>)}
                                        </td>
                                        <td className="col-star">{dish.star} ⭐</td>
                                        <td>{dish.time}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`status-badge ${dish.isPopular ? 'popular' : ''}`}>
                                                {dish.isPopular ? 'Phổ biến' : 'Không'}
                                            </span>
                                        </td>
                                        <td className="col-actions">
                                            <button type='button'
                                                className="action-button edit-button"
                                                onClick={() => handleEditClick(dish)}
                                                // Disable khi đang mở modal thêm hoặc sửa
                                                disabled={isAddModalOpen || isEditModalOpen}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                 type='button'
                                                 className="action-button delete-button"
                                                 disabled={isAddModalOpen || isEditModalOpen}
                                                 onClick={() => handleSoftDelete(dish.id, dish.name)}
                                             >
                                                 Xóa
                                             </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

             {/* === MODAL THÊM MÓN ĂN === */}
            {isAddModalOpen && (
                <AddDishModal
                    isOpen={isAddModalOpen}
                    onClose={handleCloseAddModal}
                    onSave={handleAddDish} // Hàm thêm vào Firestore
                    categories={categories}
                    categoryLoading={categoryLoading}
                    categoryError={categoryError}
                    addError={addError} // Lỗi riêng của việc thêm
                />
            )}


            {/* === MODAL SỬA MÓN ĂN === (Giữ nguyên) */}
            {isEditModalOpen && editingDish && (
                <EditDishModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    dish={editingDish}
                    onSave={handleUpdateDish}
                    categories={categories}
                    categoryLoading={categoryLoading}
                    categoryError={categoryError}
                    updateError={updateError}
                />
            )}

            {/* === MODAL XEM ẢNH MÓN ĂN === */}
            {isImageModalOpen && (
                <ImagePreviewModal
                    isOpen={isImageModalOpen}
                    onClose={handleCloseImageModal}
                    imageUrl={selectedImageUrl}
                    altText={selectedImageAlt}
                />
            )}
        </div>
        
    );
}

export default FoodManagement;