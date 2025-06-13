import React, { useState, useEffect, useRef } from 'react';
import './AddDishModal.css';

// Đảm bảo bạn có Cloudinary credentials hoặc import từ file config chung
const CLOUDINARY_CLOUD_NAME = 'dc0umlqvf';
const CLOUDINARY_UPLOAD_PRESET = 'android_do_an_avatars_unsigned';

const initialFormData = {
    name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false
};

const initialValidationErrors = {};

function AddDishModal({
    isOpen,
    onClose,
    onSave,
    categories,
    categoryLoading,
    categoryError,
    addError // Lỗi từ bên ngoài (ví dụ: lỗi trùng tên món ăn)
}) {
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
    // NEW STATE: Để quản lý file ảnh được chọn và URL preview
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const dialogRef = useRef(null);

    // Regex kiểm tra URL (vẫn giữ nếu muốn validate khi có sẵn URL)
    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        };

        if (isOpen) {
            // Reset form data, validation errors, và **thêm reset cho file/preview**
            setFormData(initialFormData);
            setValidationErrors(initialValidationErrors);
            setSelectedFile(null);          // Reset file đã chọn
            setImagePreviewUrl('');         // Reset URL preview
            setIsSaving(false);

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

    // NEW FUNCTION: Tải ảnh lên Cloudinary
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

        if (!formData.name.trim()) {
            errors.name = 'Dish Name is required.';
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Dish Name must be at least 3 characters long.';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Dish Name cannot exceed 100 characters.';
        }

        if (formData.price === '' || Number.isNaN(priceValue)) {
            errors.price = 'Price is required and must be a number.';
        } else if (priceValue < 0) {
            errors.price = 'Price cannot be negative.';
        } else if (priceValue > 999999999) {
            errors.price = 'Price is too high.';
        }

        if (formData.description && formData.description.length > 500) {
            errors.description = 'Description cannot exceed 500 characters.';
        }

        // UPDATED VALIDATION for image: require a file to be selected
        if (!selectedFile) { // If no file is selected
            errors.imageUrl = 'Image is required for the new dish.';
        } else if (!selectedFile.type.startsWith('image/')) {
            errors.imageUrl = 'Selected file is not a valid image.';
        }
        // Removed URL regex check as we are uploading a file now

        if (formData.star !== '' && (Number.isNaN(starValue) || starValue < 0 || starValue > 5)) {
            errors.star = 'Rating must be a number between 0 and 5.';
        }

        if (formData.time && formData.time.length > 50) {
            errors.time = 'Time cannot exceed 50 characters.';
        }

        if (!formData.categoryName) {
            errors.categoryName = 'Category is required.';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            console.log("Validation failed");
            return;
        }

        setIsSaving(true);
        let finalImageUrl = '';

        try {
            // Upload ảnh lên Cloudinary trước
            if (selectedFile) {
                finalImageUrl = await uploadImageToCloudinary(selectedFile);
                console.log("Image uploaded to Cloudinary:", finalImageUrl);
            } else {
                // Đây là trường hợp không có file nào được chọn, 
                // nhưng validationForm đã bắt lỗi này rồi. 
                // Chỉ để phòng hờ.
                throw new Error("No image selected.");
            }

            const newDishData = {
                name: formData.name.trim(),
                price: Number.parseFloat(formData.price),
                description: formData.description,
                imageUrl: finalImageUrl, // Sử dụng URL từ Cloudinary
                star: formData.star === '' ? 0 : Number.parseFloat(formData.star),
                time: formData.time,
                categoryName: formData.categoryName,
                isPopular: formData.isPopular
            };

            await onSave(newDishData); // Gọi hàm onSave được truyền từ component cha (DishManagement)
        } catch (error) {
            console.error("Error during save:", error);
            // Có thể set một lỗi cục bộ cho modal hoặc hiển thị toast
            setValidationErrors(prev => ({ ...prev, general: `Failed to add dish: ${error.message}` }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackdropClick = (event) => {
        // Chỉ đóng modal khi click ra ngoài và không trong quá trình lưu
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="add-dish-modal"
            onClick={handleBackdropClick}
            onCancel={(e) => e.preventDefault()} // Ngăn chặn đóng modal bằng Esc mặc định
            aria-labelledby="addDishModalTitle"
        >
            <div className='modal-content'>
                <h2 id="addDishModalTitle">Add New Dish</h2>

                {/* addError là lỗi từ component cha, validationErrors.general là lỗi từ modal này */}
                {(addError || validationErrors.general) && <p className="error-message">{addError || validationErrors.general}</p>}

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
                    <div className="form-group">
                        <label htmlFor="addDishName">Name:*</label>
                        <input
                            type="text"
                            id="addDishName"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-invalid={!!validationErrors.name}
                            aria-describedby={validationErrors.name ? 'addDishNameError' : undefined}
                        />
                        {validationErrors.name && <p id="addDishNameError" className="validation-error">{validationErrors.name}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishPrice">Price ($):*</label>
                        <input
                            type="number"
                            id="addDishPrice"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.price ? 'addDishPriceError' : undefined}
                            aria-invalid={!!validationErrors.price}
                        />
                        {validationErrors.price && <p id="addDishPriceError" className="validation-error">{validationErrors.price}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishDesc">Description:</label>
                        <textarea
                            id="addDishDesc"
                            name="description"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.description ? 'addDishDescError' : undefined}
                            aria-invalid={!!validationErrors.description}
                        />
                        {validationErrors.description && <p id="addDishDescError" className="validation-error">{validationErrors.description}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishImageFile">Image:</label>
                        <input
                            type="file" // Thay đổi type từ text thành file
                            id="addDishImageFile" // Id mới để phân biệt
                            name="imageFile" // Tên mới, không còn là imageUrl
                            accept="image/*" // Chỉ chấp nhận file ảnh
                            onChange={handleFileChange} // Xử lý file mới
                            disabled={isSaving}
                            aria-describedby={validationErrors.imageUrl ? 'addDishImageUrlError' : undefined}
                            aria-invalid={!!validationErrors.imageUrl}
                        />
                        {validationErrors.imageUrl && <p id="addDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>}
                        
                        {/* Hiển thị preview ảnh */}
                        {imagePreviewUrl && (
                            <div className="image-preview-container">
                                <p>Image Preview:</p>
                                <img src={imagePreviewUrl} alt="Dish Preview" className="image-preview" />
                            </div>
                        )}
                        {!imagePreviewUrl && <p className="image-required-note">Image is required for new dishes.</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishStar">Rating (0-5):</label>
                        <input
                            type="number"
                            id="addDishStar"
                            name="star"
                            value={formData.star}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.star ? 'addDishStarError' : undefined}
                            aria-invalid={!!validationErrors.star}
                        />
                        {validationErrors.star && <p id="addDishStarError" className="validation-error">{validationErrors.star}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishTime">Time:</label>
                        <input
                            type="text"
                            id="addDishTime"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            placeholder="e.g. 15-20 minutes"
                            disabled={isSaving}
                            aria-describedby={validationErrors.time ? 'addDishTimeError' : undefined}
                            aria-invalid={!!validationErrors.time}
                        />
                        {validationErrors.time && <p id="addDishTimeError" className="validation-error">{validationErrors.time}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addDishCategory">Category:*</label>
                        <select
                            id="addDishCategory"
                            name="categoryName"
                            value={formData.categoryName}
                            onChange={handleChange}
                            disabled={categoryLoading || isSaving}
                            aria-describedby={validationErrors.categoryName ? 'addDishCategoryError' : undefined}
                            aria-invalid={!!validationErrors.categoryName}
                        >
                            <option value="" disabled>{categoryLoading ? 'Loading...' : categoryError ? 'Error loading categories' : '-- Select category --'}</option>
                            {!categoryLoading && !categoryError && categories.map(category => (<option key={category.id} value={category.name}>{category.name}</option>))}
                        </select>
                        {(categoryError || validationErrors.categoryName) && <p className="error-message" id="addDishCategoryError">{categoryError || validationErrors.categoryName}</p>}
                    </div>

                    <div className="form-group form-group-checkbox">
                        <input
                            type="checkbox"
                            id="addDishIsPopular"
                            name="isPopular"
                            checked={formData.isPopular}
                            onChange={handleChange}
                            disabled={isSaving}
                        />
                        <label htmlFor="addDishIsPopular">Popular?</label>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Dish'}
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

export default AddDishModal;