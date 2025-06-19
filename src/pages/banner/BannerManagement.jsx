import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../../firebaseConfig'; 
import './BannerManagement.css'; 

const CLOUDINARY_CLOUD_NAME = 'dc0umlqvf'; 
const CLOUDINARY_UPLOAD_PRESET = 'android_do_an_avatars_unsigned'; 

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState('');

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [modalBannerFile, setModalBannerFile] = useState(null);
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
        const bannersCol = collection(db, 'banners');
        const unsubscribe = onSnapshot(bannersCol, (snapshot) => {
            const bannersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBanners(bannersList);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching banners:", err);
            setGlobalError("Failed to load banners.");
            showToast("Failed to load banners.", "error");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const openAddModal = () => {
        setModalBannerFile(null);
        setModalPreviewImageUrl('');
        setModalFormError('');
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setModalBannerFile(null);
        setModalPreviewImageUrl('');
        setModalFormError('');
    };

    const handleModalFileChange = (e) => {
        const file = e.target.files[0];
        setModalBannerFile(file);
        if (file) {
            if (!file.type.startsWith('image/')) {
                setModalFormError('Please select a valid image file (e.g., .jpg, .png, .gif).');
                setModalPreviewImageUrl('');
                return;
            }
            setModalFormError('');
            setModalPreviewImageUrl(URL.createObjectURL(file));
        } else {
            setModalPreviewImageUrl('');
            setModalFormError('');
        }
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
            console.error("Lỗi khi upload lên Cloudinary:", error);
            throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setModalFormError('');

        if (!modalBannerFile) {
            setModalFormError("Please select an image for the banner.");
            return;
        }
        if (!modalBannerFile.type.startsWith('image/')) {
            setModalFormError('Selected file is not a valid image.');
            return;
        }

        setLoading(true);
        try {
            const imageUrl = await uploadImageToCloudinary(modalBannerFile);
            console.log("New image uploaded to Cloudinary:", imageUrl);

            await addDoc(collection(db, 'banners'), {
                imageUrl: imageUrl,
                createdAt: new Date()
            });
            showToast("Banner added successfully!", "success");
            closeAddModal();
        } catch (err) {
            console.error("Error saving banner:", err);
            setModalFormError(`Failed to save banner: ${err.message}`);
            showToast("Failed to save banner.", "error");
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteBanner = (banner) => {
        setBannerToDelete(banner);
        setDeleteError('');
        setShowDeleteConfirmModal(true);
    };

    const executeDeleteBanner = async () => {
        if (!bannerToDelete) return;

        setLoading(true);
        setGlobalError('');
        setDeleteError('');

        try {
            await deleteDoc(doc(db, 'banners', bannerToDelete.id));
            setBannerToDelete(null);
            setGlobalError('');
            showToast("Banner đã được xóa thành công!", "success");
            setShowDeleteConfirmModal(false);
            // Lưu ý: Việc xóa ảnh khỏi Cloudinary cần xác thực (signed requests), 
            // phức tạp hơn và thường yêu cầu một backend.
            // Nếu bạn muốn xóa ảnh khỏi Cloudinary khi xóa banner, 
            // bạn cần implement một API endpoint trên server của mình.
            // deleteImageFromCloudinary(bannerToDelete.imageUrl); 
        } catch (err) {
            console.error("Lỗi khi xóa banner:", err);
            setGlobalError("Xóa banner thất bại. Vui lòng thử lại.");
            showToast("Xóa banner thất bại.", "error");
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirmModal(false);
        setBannerToDelete(null);
        setGlobalError('');
        setDeleteError('');
    };

    return (
        <div className="banner-management-container">
            <h2>lBanner Management</h2>

            <button type='button' className="add-new-button" onClick={openAddModal} disabled={loading}>
                Add new banner
            </button>

            {globalError && <p className="error-message">{globalError}</p>}
            {loading && <p>Loading...</p>}

            <div className="banner-list-section">
                <h3>Banners List</h3>
                {banners.length === 0 && !loading && <p>Cannot find banners.</p>}
                <ul className="banner-list">
                    {banners.map((banner) => (
                        <li key={banner.id} className="banner-item">
                            <img src={banner.imageUrl} alt={`Banner ${banner.id}`} className="banner-image" />
                            <div className="banner-actions">
                                <button type='button' onClick={() => confirmDeleteBanner(banner)} disabled={loading}>
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {showAddModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Add new banner</h3>
                        {modalFormError && <p className="error-message">{modalFormError}</p>}
                        <form onSubmit={handleAddSubmit}>
                            <div className="form-group">
                                <label htmlFor="modalBannerImage">Banner Image:</label>
                                <input
                                    type="file"
                                    id="modalBannerImage"
                                    accept="image/*"
                                    onChange={handleModalFileChange}
                                    required
                                    disabled={loading}
                                />
                                {modalPreviewImageUrl && (
                                    <div className="image-preview-container">
                                        <p>Preview of the image:</p>
                                        <img src={modalPreviewImageUrl} alt="Banner Preview" className="image-preview" />
                                    </div>
                                )}
                                {!modalBannerFile && (
                                    <p className="image-required-note">Image is required for new banners.</p>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : 'Add banner'}
                                </button>
                                <button type="button" onClick={closeAddModal} disabled={loading}>
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
                        <h3>Confirm deletion</h3>
                        {deleteError && <p className="error-message">{deleteError}</p>}
                        <p>Are you sure you want to delete the banner?</p>
                        <div className="modal-actions">
                            <button type='button' className="confirm-button" onClick={executeDeleteBanner} disabled={loading}>
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

export default BannerManagement;