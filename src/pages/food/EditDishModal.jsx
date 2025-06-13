import React, { useState, useEffect, useRef } from 'react';
import './EditDishModal.css';

// Đảm bảo bạn có Cloudinary credentials hoặc import từ file config chung
const CLOUDINARY_CLOUD_NAME = 'dc0umlqvf';
const CLOUDINARY_UPLOAD_PRESET = 'android_do_an_avatars_unsigned';

const initialValidationErrors = {};

function EditDishModal({
    isOpen,
    onClose,
    dish,
    onSave,
    categories,
    categoryLoading,
    categoryError,
    updateError
}) {
    const [formData, setFormData] = useState({ name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false });
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
    // NEW STATE: Để quản lý file ảnh được chọn và URL preview
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const dialogRef = useRef(null);

    // Remove urlRegex as we are now handling file uploads

    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        }

        if (isOpen) {
            setIsSaving(false);
            setValidationErrors(initialValidationErrors);
            // Reset file and preview when opening the modal
            setSelectedFile(null);
            setImagePreviewUrl('');

            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);

            try {
                const firstInput = dialogNode.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus();
                }
            } catch (e) { console.error("Error focusing first input:", e); }

        } else {
            dialogNode.close();
        }

        return () => {
            if (dialogNode) {
                dialogNode.removeEventListener('close', handleDialogClose);
            }
        };

    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && dish) {
            setFormData({
                name: dish.name || '',
                price: dish.price || '',
                description: dish.description || '',
                imageUrl: dish.imageUrl || '', // Keep existing imageUrl
                star: dish.star || '',
                time: dish.time || '',
                categoryName: dish.categoryName || '',
                isPopular: dish.isPopular || false
            });
            // Set image preview to the existing dish image when editing
            setImagePreviewUrl(dish.imageUrl || '');
            setSelectedFile(null); // Clear selected file when loading existing dish
        }
    }, [isOpen, dish]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }));
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
    };

    // NEW FUNCTION: Xử lý khi người dùng chọn file ảnh
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file); // Lưu file vào state

        if (file) {
            // Kiểm tra loại file
            if (!file.type.startsWith('image/')) {
                setValidationErrors(prev => ({ ...prev, imageUrl: 'Please select a valid image file (e.g., .jpg, .png, .gif).' }));
                setImagePreviewUrl(''); // Clear preview nếu không phải ảnh
                return;
            }
            // Tạo URL tạm thời để hiển thị preview
            setImagePreviewUrl(URL.createObjectURL(file));
            setValidationErrors(prev => ({ ...prev, imageUrl: '' })); // Xóa lỗi cũ
        } else {
            setImagePreviewUrl(''); // Clear preview nếu không có file
            setValidationErrors(prev => ({ ...prev, imageUrl: '' }));
        }
    };

    // NEW FUNCTION: Tải ảnh lên Cloudinary (copied from AddDishModal)
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
            return data.secure_url; // Trả về URL ảnh đã upload
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    };

    const validateForm = () => {
        const errors = {};
        const priceValue = Number.parseFloat(formData.price);
        const starValue = Number.parseFloat(formData.star);

        // Validate Tên món ăn
        if (!formData.name.trim()) {
            errors.name = 'Dish Name is required.';
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Dish Name must be at least 3 characters long.';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Dish Name cannot exceed 100 characters.';
        }

        // Validate Giá
        if (formData.price === '' || Number.isNaN(priceValue)) {
            errors.price = 'Price is required and must be a number.';
        } else if (priceValue < 0) {
            errors.price = 'Price cannot be negative.';
        } else if (priceValue > 999999999) {
            errors.price = 'Price is too high.';
        }

        // Validate Mô tả
        if (formData.description && formData.description.length > 500) {
            errors.description = 'Description cannot exceed 500 characters.';
        }

        // UPDATED VALIDATION for image: If a new file is selected, validate it.
        // If no new file is selected, but original imageUrl is empty, then an image is still required.
        if (selectedFile) {
            if (!selectedFile.type.startsWith('image/')) {
                errors.imageUrl = 'Selected file is not a valid image.';
            }
        } else if (!formData.imageUrl) { // If no new file and no existing image URL
            errors.imageUrl = 'Image is required for the dish.';
        }


        // Validate Đánh giá (Star)
        if (formData.star !== '' && (Number.isNaN(starValue) || starValue < 0 || starValue > 5)) {
            errors.star = 'Rating must be a number between 0 and 5.';
        }

        // Validate Thời gian chuẩn bị (Time)
        if (formData.time && formData.time.length > 50) {
            errors.time = 'Time cannot exceed 50 characters.';
        }

        // Validate Danh mục
        if (!formData.categoryName) {
            errors.categoryName = 'Category is required.';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };


    // Hàm xử lý khi nhấn nút Lưu trong modal
    const handleSave = async () => {
        if (!validateForm()) {
            console.log("Validation failed");
            return;
        }

        setIsSaving(true);
        let finalImageUrl = formData.imageUrl; // Start with the existing image URL

        try {
            // If a new file is selected, upload it to Cloudinary
            if (selectedFile) {
                finalImageUrl = await uploadImageToCloudinary(selectedFile);
                console.log("New image uploaded to Cloudinary:", finalImageUrl);
            }

            const updatedData = {
                name: formData.name.trim(),
                price: Number.parseFloat(formData.price),
                description: formData.description,
                imageUrl: finalImageUrl, // Use the new Cloudinary URL or the existing one
                star: formData.star === '' ? 0 : Number.parseFloat(formData.star),
                time: formData.time,
                categoryName: formData.categoryName,
                isPopular: formData.isPopular
            };

            await onSave(dish.id, updatedData);
        } catch (error) {
            console.error("Error during save:", error);
            // You might want to set a general error message for the user in the modal
            setValidationErrors(prev => ({ ...prev, general: `Failed to update dish: ${error.message}` }));
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm xử lý click vào backdrop của dialog
    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="edit-dish-modal"
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === dialogRef.current && !isSaving) {
                    handleBackdropClick(e);
                }
            }}
            onCancel={(e) => e.preventDefault()}
            aria-labelledby="editDishModalTitle"
        >
            <div className='modal-content'>
                <h2 id="editDishModalTitle">Edit Dish: {dish?.name}</h2>

                {updateError && <p className="error-message">{updateError}</p>}
                {validationErrors.general && <p className="error-message">{validationErrors.general}</p>} {/* Display general errors */}


                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
                    {/* ----- Dish Name ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishName">Dish Name:*</label>
                        <input
                            type="text"
                            id="editDishName"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.name ? 'editDishNameError' : undefined}
                            aria-invalid={!!validationErrors.name}
                        />
                        {validationErrors.name && <p id="editDishNameError" className="validation-error">{validationErrors.name}</p>}
                    </div>

                    {/* ----- Price ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishPrice">Price ($):*</label>
                        <input
                            type="number"
                            id="editDishPrice"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.price ? 'editDishPriceError' : undefined}
                            aria-invalid={!!validationErrors.price}
                        />
                        {/* Hiển thị lỗi validation */}
                        {validationErrors.price && <p id="editDishPriceError" className="validation-error">{validationErrors.price}</p>}
                    </div>

                    {/* ----- Description ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishDesc">Description:</label>
                        <textarea
                            id="editDishDesc"
                            name="description"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.description ? 'editDishDescError' : undefined}
                            aria-invalid={!!validationErrors.description}
                        />
                        {validationErrors.description && <p id="editDishDescError" className="validation-error">{validationErrors.description}</p>}
                    </div>

                    {/* ----- Image Upload (UPDATED) ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishImageFile">Image:</label>
                        <input
                            type="file" // Changed to file input
                            id="editDishImageFile"
                            name="imageFile" // Name for the file input
                            accept="image/*" // Accept only image files
                            onChange={handleFileChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.imageUrl ? 'editDishImageUrlError' : undefined}
                            aria-invalid={!!validationErrors.imageUrl}
                        />
                        {validationErrors.imageUrl && <p id="editDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>}

                        {/* Display image preview */}
                        {imagePreviewUrl && (
                            <div className="image-preview-container">
                                <p>Image Preview:</p>
                                <img src={imagePreviewUrl} alt="Dish Preview" className="image-preview" />
                            </div>
                        )}
                        {!imagePreviewUrl && <p className="image-required-note">Image is required for the dish.</p>}
                    </div>

                    {/* ----- Star Rating ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishStar">Rating (0-5):</label>
                        <input
                            type="number"
                            id="editDishStar"
                            name="star"
                            value={formData.star}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.star ? 'editDishStarError' : undefined}
                            aria-invalid={!!validationErrors.star}
                        />
                        {/* Hiển thị lỗi validation */}
                        {validationErrors.star && <p id="editDishStarError" className="validation-error">{validationErrors.star}</p>}
                    </div>

                    {/* ----- Time ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishTime">Time:</label>
                        <input
                            type="text"
                            id="editDishTime"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            placeholder="e.g. 15-20 minutes"
                            disabled={isSaving}
                            aria-describedby={validationErrors.time ? 'editDishTimeError' : undefined}
                            aria-invalid={!!validationErrors.time}
                        />
                        {validationErrors.time && <p id="editDishTimeError" className="validation-error">{validationErrors.time}</p>}
                    </div>

                    {/* ----- Category ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishCategory">Category:*</label>
                        <select
                            id="editDishCategory"
                            name="categoryName"
                            value={formData.categoryName}
                            onChange={handleChange}
                            disabled={categoryLoading || isSaving}
                            aria-describedby={validationErrors.categoryName ? 'editDishCategoryError' : undefined}
                            aria-invalid={!!validationErrors.categoryName}
                        >
                            <option value="" disabled>
                                {categoryLoading ? 'Loading categories...' : categoryError ? 'Error loading categories' : '-- Select category --'}
                            </option>
                            {!categoryLoading && !categoryError && categories.map(category => (
                                <option key={category.id} value={category.name}>{category.name}</option>
                            ))}
                        </select>
                        {(categoryError || validationErrors.categoryName) && <p className="error-message" id="editDishCategoryError">{categoryError || validationErrors.categoryName}</p>}
                    </div>

                    <div className="form-group form-group-checkbox">
                        <input
                            type="checkbox"
                            id="editDishIsPopular"
                            name="isPopular"
                            checked={formData.isPopular}
                            onChange={handleChange}
                            disabled={isSaving}
                        />
                        <label htmlFor="editDishIsPopular">Popular?</label>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="action-button cancel-button" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                    </div>
                </form>

                <button type='button' className="modal-close-button" onClick={onClose} disabled={isSaving}>&times;</button>
            </div>
        </dialog>
    );
}

export default EditDishModal;