    import React, { useState, useEffect } from 'react';
    import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
    import { db } from '../../firebaseConfig'; 
    import './CategoryManagement.css';

    const CLOUDINARY_CLOUD_NAME = 'dc0umlqvf'; 
    const CLOUDINARY_UPLOAD_PRESET = 'android_do_an_avatars_unsigned'; 

    const CategoryManagement = () => {
        const [categories, setCategories] = useState([]);
        const [loading, setLoading] = useState(false);
        const [globalError, setGlobalError] = useState('');

        const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
        const [categoryToDelete, setCategoryToDelete] = useState(null);
        const [deleteError, setDeleteError] = useState(''); 
        const [showAddEditModal, setShowAddEditModal] = useState(false);
        const [currentCategory, setCurrentCategory] = useState(null); 
        const [modalCategoryName, setModalCategoryName] = useState('');
        const [modalCategoryFile, setModalCategoryFile] = useState(null);
        const [modalPreviewImageUrl, setModalPreviewImageUrl] = useState('');
        const [modalFormError, setModalFormError] = useState(''); 
        const [toast, setToast] = useState({ show: false, message: '', type: '' });

        const showToast = (message, type) => {
            setToast({ show: true, message, type });
            setTimeout(() => {
                setToast({ show: false, message: '', type: '' });
            }, 3000);
        };

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

        const openAddModal = () => {
            setCurrentCategory(null);
            setModalCategoryName('');
            setModalCategoryFile(null);
            setModalPreviewImageUrl('');
            setModalFormError(''); 
            setShowAddEditModal(true);
        };

        const openEditModal = (category) => {
            setCurrentCategory(category);
            setModalCategoryName(category.name);
            setModalCategoryFile(null); 
            setModalPreviewImageUrl(category.imageUrl); 
            setModalFormError(''); 
            setShowAddEditModal(true);
        };

        const closeAddEditModal = () => {
            setShowAddEditModal(false);
            setCurrentCategory(null);
            setModalCategoryName('');
            setModalCategoryFile(null);
            setModalPreviewImageUrl('');
            setModalFormError('');
        };

        const handleModalFileChange = (e) => {
            const file = e.target.files[0];
            setModalCategoryFile(file);
            if (file) {
                if (!file.type.startsWith('image/')) {
                    setModalFormError('Please select a valid image file (e.g., .jpg, .png, .gif).');
                    setModalPreviewImageUrl(''); 
                    return;
                }
                setModalFormError('');
                setModalPreviewImageUrl(URL.createObjectURL(file));
            } else {
                setModalPreviewImageUrl(currentCategory ? currentCategory.imageUrl : '');
                setModalFormError(''); 
            }
        };

        const checkDuplicateCategoryName = async (name, currentCategoryId = null) => {
            const categoriesCol = collection(db, 'categories');
            const q = query(categoriesCol, where('name', '==', name));
            const querySnapshot = await getDocs(q);

            let isDuplicate = false;
            querySnapshot.forEach((doc) => {
                if (doc.id !== currentCategoryId) {
                    isDuplicate = true;
                }
            });
            return isDuplicate;
        };

        const uploadImageToCloudinary = async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error.message);
                }
                return data.secure_url; 
            } catch (error) {
                console.error("Error uploading to Cloudinary:", error);
                throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
            }
        };

        const deleteImageFromCloudinary = async (imageUrl) => {
            console.warn("Deletion from Cloudinary is complex without a backend for signed requests. Implement this carefully.");
        };


        const handleAddEditSubmit = async (e) => {
            e.preventDefault();
            setModalFormError(''); 

            const trimmedName = modalCategoryName.trim();
            if (!trimmedName) {
                setModalFormError("Category name cannot be empty.");
                return;
            }

            setLoading(true);
            try {
                const isDuplicate = await checkDuplicateCategoryName(trimmedName, currentCategory?.id);
                if (isDuplicate) {
                    setModalFormError("Category name already exists. Please choose a different name.");
                    setLoading(false); 
                    return;
                }
            } catch (error) {
                console.error("Error checking duplicate category name:", error);
                setModalFormError("An error occurred while validating the category name.");
                setLoading(false); 
                return;
            }
            let finalImageUrl = currentCategory ? currentCategory.imageUrl : ''; 
            let newImageChosen = false;

            if (modalCategoryFile) {
                if (!modalCategoryFile.type.startsWith('image/')) {
                    setModalFormError('Selected file is not a valid image.');
                    setLoading(false); 
                    return;
                }
                newImageChosen = true;
            } else if (!currentCategory && !modalCategoryFile) {
                setModalFormError("Please select an image for the new category.");
                setLoading(false);
                return;
            } else if (currentCategory && !modalCategoryFile && !currentCategory.imageUrl) {
                setModalFormError("Please select an image for the category.");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                if (newImageChosen) {
                    finalImageUrl = await uploadImageToCloudinary(modalCategoryFile);
                    console.log("New image uploaded to Cloudinary:", finalImageUrl);
                }

                if (currentCategory) {
                    const categoryRef = doc(db, 'categories', currentCategory.id);
                    await updateDoc(categoryRef, {
                        name: trimmedName,
                        imageUrl: finalImageUrl 
                    });
                    showToast("Category updated successfully!", "success");
                } else {
                    await addDoc(collection(db, 'categories'), {
                        name: trimmedName,
                        imageUrl: finalImageUrl,
                        createdAt: new Date()
                    });
                    showToast("Category added successfully!", "success");
                }

                closeAddEditModal();
            } catch (err) {
                console.error("Error saving category:", err);
                setModalFormError(`Failed to save category: ${err.message}`);
                showToast("Failed to save category.", "error");
            } finally {
                setLoading(false);
            }
        };


        const confirmDeleteCategory = (category) => {
            setCategoryToDelete(category);
            setDeleteError(''); 
            setShowDeleteConfirmModal(true);
        };

        const executeDeleteCategory = async () => {
            if (!categoryToDelete) return;

            setLoading(true);
            setGlobalError('');
            setDeleteError(''); 

            try {
                const foodsCol = collection(db, 'food'); 
                const q = query(foodsCol, where('categoryName', '==', categoryToDelete.categoryName)); 
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    setDeleteError(`Cannot delete category "${categoryToDelete.name}" because it has ${querySnapshot.size} foods under it. Please delete or move the foods before deleting the category.`);
                    showToast("Cannot delete category.", "error");
                    setLoading(false); 
                    return; 
                }


                await deleteDoc(doc(db, 'categories', categoryToDelete.id));
                setCategoryToDelete(null); 
                setGlobalError('');
                showToast("Category deleted successfully!", "success");
                setShowDeleteConfirmModal(false); 
            } catch (err) {
                console.error("Error deleting category:", err);
                setGlobalError("Failed to delete category. Please try again.");
                showToast("Failed to delete category. Please delete these dishes before deleting the category.", "error");
            } finally {
                setLoading(false);
            }
        };

        const cancelDelete = () => {
            setShowDeleteConfirmModal(false);
            setCategoryToDelete(null);
            setGlobalError('');
            setDeleteError(''); 
        };

        return (
            <div className="category-management-container">
                <h2>Category Management</h2>

                <button type='button' className="add-new-button" onClick={openAddModal} disabled={loading}>
                    Add New Category
                </button>

                {globalError && <p className="error-message">{globalError}</p>}
                {loading && <p>Loading...</p>}

                <div className="category-list-section">
                    <h3>Existing Categories</h3>
                    {categories.length === 0 && !loading && <p>No categories found.</p>}
                    <ul className="category-list">
                        {categories.map((category) => (
                            <li key={category.id} className="category-item">
                                <img src={category.imageUrl} alt={category.name} className="category-image" />
                                <span className="category-name">{category.name}</span>
                                <div className="category-actions">
                                    <button type='button' onClick={() => openEditModal(category)} disabled={loading}>
                                        Edit
                                    </button>
                                    <button type='button' onClick={() => confirmDeleteCategory(category)} disabled={loading}>
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

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
                                        disabled={loading} // Disable input when loading
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="modalCategoryImage">Category Image:</label>
                                    <input
                                        type="file"
                                        id="modalCategoryImage"
                                        accept="image/*"
                                        onChange={handleModalFileChange}
                                        disabled={loading} // Disable input when loading
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
                                        {loading ? 'Saving...' : (currentCategory ? 'Update Category' : 'Add Category')}
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
                            {deleteError && <p className="error-message">{deleteError}</p>} {/* HIỂN THỊ LỖI KHI XÓA */}
                            <p>Are you sure you want to delete the category "<strong>{categoryToDelete?.name}</strong>"?</p>
                            <div className="modal-actions">
                                <button type='button' className="confirm-button" onClick={executeDeleteCategory} disabled={loading}>
                                    {loading ? 'Deleting...' : 'Yes, Delete'}
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