// src/pages/FoodManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
// Import các hàm Firestore cần thiết VÀO ĐÂY
import { collection, onSnapshot, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from '../../firebaseConfig'; // <<< Import db vào đây
import './FoodManagement.css'; // <<< THÊM DÒNG IMPORT FILE CSS
import EditDishModal from './EditDishModal';
import AddDishModal from './AddDishModal';
import ImagePreviewModal from './ImagePreviewModal';
import toast from 'react-hot-toast'; 
import debounce from 'lodash.debounce';



// Tên collection món ăn và categories được định nghĩa ở đây
const DISHES_COLLECTION_NAME = 'food';
const CATEGORIES_COLLECTION_NAME = 'categories'; 

// Hàm không dấu (đặt bên ngoài component hoặc import từ utils)
function removeDiacritics(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }
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

    // State cho search và filter
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredDishes, setFilteredDishes] = useState([]);

    const [internalSearchTerm, setInternalSearchTerm] = useState(''); // Giá trị search đã debounce
    const [selectedCategory, setSelectedCategory] = useState('');


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

    // === Debounce Function (Giữ nguyên) ===
    const debouncedSearch = useCallback(
        debounce((term) => {
            setInternalSearchTerm(term);
        }, 300),
        []
    );

    // === useEffect LỌC DỮ LIỆU  ===
    // useEffect(() => {
    //     // Chỉ lọc khi có danh sách gốc và không loading
    //     if (!loading && dishes.length > 0) {
    //         let result = dishes;

    //         // Tìm kiếm theo tên
    //         if (searchTerm.trim()){
    //             const lowerCaseSearchTerm = searchTerm.toLowerCase();
    //             result = result.filter(dish =>
    //                 dish.name.toLowerCase().includes(lowerCaseSearchTerm)
    //             )
                
    //         }
    //         // Sort lại danh sách
    //         result.sort((a, b) => a.name.localeCompare(b.name));

    //         setFilteredDishes(result    );
    //         console.log("FoodManagement: Filtered dishes:", result);
    //     }
    //     else if (!loading && dishes.length === 0) {
    //         setFilteredDishes([]);
    //     }
    //     else {
    //         // Nếu đang loading hoặc chưa có dishes, chưa cần lọc
    //         setFilteredDishes(dishes);  
    //     }
    // }, [dishes, loading, searchTerm])

    useEffect(() => {
        // Chỉ lọc khi không loading và có dữ liệu gốc
        if (!loading) {
            let result = dishes; // Bắt đầu với toàn bộ danh sách gốc

            // --- Bước 1: Lọc theo Danh mục ---
            if (selectedCategory) { // Nếu đã chọn một danh mục (khác rỗng)
                const selectedCatName = categories.find(c => c.id === selectedCategory)?.name;
                if (selectedCatName) {
                   result = result.filter(dish => dish.categoryName === selectedCatName);
                }
            }

            // --- Bước 2: Lọc theo Từ khóa tìm kiếm (trên kết quả đã lọc theo danh mục) ---
            if (internalSearchTerm.trim()) {
                const normalizedSearchTerm = removeDiacritics(internalSearchTerm.toLowerCase().trim());
                result = result.filter(dish => {
                    const normalizedName = removeDiacritics(dish.name?.toLowerCase() || '');
                    // const normalizedDesc = removeDiacritics(dish.description?.toLowerCase() || '');
                    // Thêm các trường khác nếu muốn tìm kiếm rộng hơn
                    return normalizedName.includes(normalizedSearchTerm);
                });
            }

            // --- Bước 3: Sắp xếp kết quả cuối cùng ---
            result.sort((a, b) => a.name.localeCompare(b.name));

            setFilteredDishes(result); // Cập nhật state để hiển thị
            console.log(`FoodManagement: Filtered dishes (Category: ${selectedCategory || 'All'}, Search: ${internalSearchTerm})`, result);

        } else {
            setFilteredDishes([]); // Nếu đang loading thì hiển thị rỗng
        }
        // *** Thêm selectedCategory vào dependency array ***
    }, [dishes, internalSearchTerm, loading, selectedCategory, categories]);

    // Hàm xử lý khi input search thay đổi
    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        debouncedSearch(newSearchTerm);
    }

    // === HÀM XỬ LÝ KHI CHỌN CATEGORY TỪ DROPDOWN ===
    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value); // Cập nhật state category đã chọn
    };


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
            toast.success('Thêm món ăn mới thành công!');
            handleCloseAddModal(); // Đóng modal sau khi thêm thành công
            // onSnapshot sẽ tự cập nhật danh sách
        } catch (error) {
            console.error("FoodManagement: Error adding document: ", error);
            setAddError("Lỗi khi thêm món ăn. Vui lòng thử lại."); // Set lỗi để hiển thị trong modal
            const errorMsg = "Lỗi khi thêm món ăn. Vui lòng thử lại.";
            // Không đóng modal nếu có lỗi
            // Ném lỗi ra để modal biết và dừng trạng thái isSaving
            toast.error(errorMsg);
        }
    };

    // === HÀM SỬA THÔNG TIN MÓN ĂN ===
    const handleUpdateDish = async (dishId, updatedData) => {
        setUpdateError(null); // Reset lỗi cập nhật cũ
        const dishDocRef = doc(db, DISHES_COLLECTION_NAME, dishId)
        try {
            await updateDoc(dishDocRef, updatedData);
            console.log("FoodManagement: Document updated with ID: ", dishId)
            toast.success('Cập nhật món ăn thành công!');
            handleCloseEditModal(); // Đóng modal sau khi cập nhật thành công
        }
        catch(error){
            console.error("FoodManagement: Error updating document: ", error);
            setUpdateError("Lỗi khi cập nhật món ăn."); // Set lỗi riêng cho việc cập nhật
            // Không đóng modal nếu có lỗi để người dùng thấy thông báo
            const errorMsg = "Lỗi khi cập nhật món ăn.";
            toast.error(errorMsg);
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
           toast.success(`Đã xóa món "${dishName}"!`);
       }
       catch(error){
            console.error("Error soft deleting dish: ", error);
            setError("Đã xảy ra lỗi khi xóa món ăn."); // Hiển thị lỗi chung
            toast.error("Đã xảy ra lỗi khi xóa món ăn.");
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

            {!loading && !categoryLoading && (
                <>
                    

                    <div className='actions-bar'>
                        {/* Ô Search */}
                        <input
                            type='text'
                            placeholder='Tìm kiếm món ăn then tên...'
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className='search-input'
                            disabled={isAddModalOpen || isEditModalOpen}
                        />

                        {/* === DROPDOWN LỌC CATEGORY === */}
                        <select
                              value={selectedCategory}
                              onChange={handleCategoryChange} // <<< Gọi hàm xử lý mới
                              className="filter-select" // Dùng class đã tạo ở bước trước
                              disabled={isAddModalOpen || isEditModalOpen || categoryLoading}
                          >
                              {/* Option mặc định */}
                              <option value="">Tất cả Danh mục</option>

                              {/* Render các options từ state categories */}
                              {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                  </option>
                              ))}
                          </select>


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

                    </div>

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
                            {filteredDishes.length > 0 ? (
                                    filteredDishes.map((dish) => (
                                        <tr key={dish.id}>
                                            {/* Các td giữ nguyên */}
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
                                    ))
                                ) : (
                                    // Hiển thị thông báo khi không có kết quả
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center' }}>
                                            {searchTerm ? 'Không tìm thấy món ăn nào phù hợp.' : 'Chưa có món ăn nào.'}
                                        </td>
                                    </tr>
                                )}
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