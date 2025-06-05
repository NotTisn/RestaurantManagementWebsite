import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../../firebaseConfig';
import './CategoryManagement.css';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState(''); 

    // State cho Modal xác nhận xóa
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // State cho Modal Add/Edit
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null); // category đang được chỉnh sửa (hoặc null nếu là thêm mới)
    const [modalCategoryName, setModalCategoryName] = useState('');
    const [modalCategoryFile, setModalCategoryFile] = useState(null);
    const [modalPreviewImageUrl, setModalPreviewImageUrl] = useState('');
    const [modalFormError, setModalFormError] = useState(''); // Lỗi hiển thị bên trong modal

    // State cho Toast/Snackbar thông báo
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // Function để hiển thị Toast
    const showToast = (message, type) => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    // Fetch categories from Firestore
    useEffect(() => {
        setLoading(true);
        const categoriesCol = collection(db, 'categories');
        const unsubscribe = onSnapshot(categoriesCol, (snapshot) => {
            const categoriesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories(categoriesList);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching categories:", err);
            setGlobalError("Failed to load categories.");
            showToast("Failed to load categories.", "error");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Mở Modal cho Add
    const openAddModal = () => {
        setCurrentCategory(null);
        setModalCategoryName('');
        setModalCategoryFile(null);
        setModalPreviewImageUrl('');
        setModalFormError(''); // Reset lỗi form trong modal
        setShowAddEditModal(true);
    };

    // Mở Modal cho Edit
    const openEditModal = (category) => {
        setCurrentCategory(category);
        setModalCategoryName(category.name);
        setModalCategoryFile(null);
        setModalPreviewImageUrl(category.imageUrl);
        setModalFormError(''); // Reset lỗi form trong modal
        setShowAddEditModal(true);
    };

    // Đóng Modal Add/Edit
    const closeAddEditModal = () => {
        setShowAddEditModal(false);
        setCurrentCategory(null);
        setModalCategoryName('');
        setModalCategoryFile(null);
        setModalPreviewImageUrl('');
        setModalFormError('');
    };

    // Handle file change in modal for preview and validation
    const handleModalFileChange = (e) => {
        const file = e.target.files[0];
        setModalCategoryFile(file);
        if (file) {
            // Kiểm tra định dạng file ảnh
            if (!file.type.startsWith('image/')) {
                setModalFormError('Please select a valid image file (e.g., .jpg, .png, .gif).');
                setModalPreviewImageUrl(''); // Không hiển thị preview nếu không phải ảnh
                return;
            }
            // Clear lỗi nếu file hợp lệ
            setModalFormError('');
            setModalPreviewImageUrl(URL.createObjectURL(file));
        } else {
            setModalPreviewImageUrl(currentCategory ? currentCategory.imageUrl : '');
            setModalFormError(''); // Clear lỗi khi không có file
        }
    };

    // Handle submission of Add/Edit form in modal
    const handleAddEditSubmit = async (e) => {
        e.preventDefault();
        setModalFormError(''); // Reset lỗi trước mỗi lần submit

        // Validate Category Name
        if (!modalCategoryName.trim()) {
            setModalFormError("Category name cannot be empty.");
            return;
        }

        // Validate Category Image
        let finalImageUrl = currentCategory ? currentCategory.imageUrl : ''; // Mặc định là ảnh cũ nếu có
        let newImageChosen = false;

        if (modalCategoryFile) { // Người dùng đã chọn file mới
            if (!modalCategoryFile.type.startsWith('image/')) {
                setModalFormError('Selected file is not a valid image.');
                return;
            }
            newImageChosen = true;
        } else if (!currentCategory && !modalCategoryFile) {
            // Thêm mới mà không có file ảnh
            setModalFormError("Please select an image for the new category.");
            return;
        } else if (currentCategory && !modalCategoryFile && !currentCategory.imageUrl) {
            // Chỉnh sửa mà không có file ảnh mới VÀ không có ảnh cũ
            setModalFormError("Please select an image for the category.");
            return;
        }

        setLoading(true);
        try {
            if (newImageChosen) {
                // Nếu là edit và có ảnh cũ, xóa ảnh cũ trước
                if (currentCategory?.imageUrl) {
                    try {
                        const oldImageRef = ref(storage, currentCategory.imageUrl);
                        await deleteObject(oldImageRef);
                    } catch (storageErr) {
                        console.warn("Could not delete old image, might not exist or invalid path:", storageErr);
                    }
                }
                // Upload ảnh mới
                const storageRef = ref(storage, `category_images/${modalCategoryFile.name + Date.now()}`);
                await uploadBytes(storageRef, modalCategoryFile);
                finalImageUrl = await getDownloadURL(storageRef);
            }


            if (currentCategory) {
                // UPDATE logic
                const categoryRef = doc(db, 'categories', currentCategory.id);
                await updateDoc(categoryRef, {
                    name: modalCategoryName,
                    imageUrl: finalImageUrl
                });
                showToast("Category updated successfully!", "success");
            } else {
                // ADD logic
                await addDoc(collection(db, 'categories'), {
                    name: modalCategoryName,
                    imageUrl: finalImageUrl,
                    createdAt: new Date()
                });
                showToast("Category added successfully!", "success");
            }

            closeAddEditModal();
        } catch (err) {
            console.error("Error saving category:", err);
            setModalFormError("Failed to save category. Please try again.");
            showToast("Failed to save category.", "error");
        } finally {
            setLoading(false);
        }
    };


    // Chuẩn bị để hiển thị modal xác nhận xóa
    const confirmDeleteCategory = (category) => {
        setCategoryToDelete(category);
        setShowDeleteConfirmModal(true);
    };

    // Logic xóa thực sự sau khi xác nhận từ modal
    const executeDeleteCategory = async () => {
        if (!categoryToDelete) return;

        setShowDeleteConfirmModal(false);
        setLoading(true);
        setGlobalError('');
        try {
            if (categoryToDelete.imageUrl) {
                const imageRef = ref(storage, categoryToDelete.imageUrl);
                await deleteObject(imageRef);
            }
            await deleteDoc(doc(db, 'categories', categoryToDelete.id));
            setCategoryToDelete(null);
            setGlobalError('');
            showToast("Category deleted successfully!", "success");
        } catch (err) {
            console.error("Error deleting category:", err);
            setGlobalError("Failed to delete category. Please try again.");
            showToast("Failed to delete category.", "error");
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirmModal(false);
        setCategoryToDelete(null);
        setGlobalError('');
    };

    return (
        <div className="category-management-container">
            <h2>Category Management</h2>

            <button type='button' className="add-new-button" onClick={openAddModal} disabled={loading}>
                Add New Category
            </button>

            {globalError && <p className="error-message">{globalError}</p>} 
            {loading && <p>Loading...</p>}

            {/* List of Categories */}
            <div className="category-list-section">
                <h3>Existing Categories</h3>
                {categories.length === 0 && !loading && <p>No categories found.</p>}
                <ul className="category-list">
                    {categories.map((category) => (
                        <li key={category.id} className="category-item">
                            <img src={category.imageUrl} alt={category.name} className="category-image" />
                            <span className="category-name">{category.name}</span>
                            <div className="category-actions">
                                <button type='button' onClick={() => openEditModal(category)}>
                                    Edit
                                </button>
                                <button type='button' onClick={() => confirmDeleteCategory(category)}>
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Add/Edit Category Modal */}
            {showAddEditModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>{currentCategory ? 'Edit Category' : 'Add New Category'}</h3>
                        {modalFormError && <p className="error-message">{modalFormError}</p>} 
                        <form onSubmit={handleAddEditSubmit}>
                            <div className="form-group">
                                <label htmlFor="modalCategoryName">Category Name:</label>
                                <input
                                    type="text"
                                    id="modalCategoryName"
                                    value={modalCategoryName}
                                    onChange={(e) => setModalCategoryName(e.target.value)}
                                    placeholder="Enter category name"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="modalCategoryImage">Category Image:</label>
                                <input
                                    type="file"
                                    id="modalCategoryImage"
                                    accept="image/*" 
                                    onChange={handleModalFileChange}
                                />
                                {(modalPreviewImageUrl || (currentCategory?.imageUrl)) && (
                                    <div className="image-preview-container">
                                        <p>Current/New Image Preview:</p>
                                        <img src={modalPreviewImageUrl || currentCategory.imageUrl} alt="Category Preview" className="image-preview" />
                                    </div>
                                )}
                                {currentCategory && !modalCategoryFile && (
                                    <p className="current-image-note">Leave blank to keep current image.</p>
                                )}
                                {!currentCategory && !modalCategoryFile && (
                                    <p className="image-required-note">Image is required for new categories.</p>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button type="submit" disabled={loading}>
                                    {currentCategory ? 'Update Category' : 'Add Category'}
                                </button>
                                <button type="button" onClick={closeAddEditModal} disabled={loading}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirmModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete the category "<strong>{categoryToDelete?.name}</strong>"?</p>
                        <div className="modal-actions">
                            <button type='button' className="confirm-button" onClick={executeDeleteCategory} disabled={loading}>
                                Yes, Delete
                            </button>
                            <button type='button' className="cancel-button" onClick={cancelDelete} disabled={loading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`toast-notification ${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;