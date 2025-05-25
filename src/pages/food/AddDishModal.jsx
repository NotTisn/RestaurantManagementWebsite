// src/pages/AddDishModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Import file CSS mới thay vì EditDishModal.css
import './AddDishModal.css';

// Giá trị khởi tạo rỗng cho form
const initialFormData = {
    name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false
};

// State khởi tạo rỗng cho lỗi validation
const initialValidationErrors = {};

function AddDishModal({
    isOpen,
    onClose,
    onSave, // Hàm handleAddDish từ FoodManagement
    categories,
    categoryLoading,
    categoryError,
    addError // Lỗi khi thêm món từ component cha (Firestore error)
}) {
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
    const dialogRef = useRef(null);

    // Regex để kiểm tra URL hợp lệ
    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

    // useEffect để điều khiển dialog và reset form/lỗi khi mở/đóng
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        };

        if (isOpen) {
            setFormData(initialFormData);
            setValidationErrors(initialValidationErrors);
            setIsSaving(false);
            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);

            // Tự động focus vào input đầu tiên
            try {
                const firstInput = dialogNode.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus();
                }
            } catch (e) { console.error("Error focusing first input:", e); }

        } else {
            dialogNode.close();
        }

        // Cleanup listener khi component unmount hoặc isOpen thay đổi
        return () => {
            if (dialogNode) {
                dialogNode.removeEventListener('close', handleDialogClose);
            }
        };
    }, [isOpen, onClose]);

    // Hàm xử lý thay đổi input và xóa lỗi validation tương ứng
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }));
        // Xóa lỗi validation cho trường vừa thay đổi
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Hàm VALIDATE FORM
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

        // Validate URL Hình ảnh
        if (formData.imageUrl && !urlRegex.test(formData.imageUrl)) {
            errors.imageUrl = 'Please enter a valid URL for the image.';
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

    // Hàm xử lý khi nhấn nút Lưu/Thêm
    const handleSave = async () => {
        if (!validateForm()) {
            console.log("Validation failed");
            return;
        }

        setIsSaving(true);
        const newDishData = {
            name: formData.name.trim(),
            price: Number.parseFloat(formData.price),
            description: formData.description,
            imageUrl: formData.imageUrl,
            star: formData.star === '' ? 0 : Number.parseFloat(formData.star),
            time: formData.time,
            categoryName: formData.categoryName,
            isPopular: formData.isPopular
        };

        try {
            await onSave(newDishData);
        } catch (error) {
            console.error("Error during save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm xử lý click backdrop
    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    // --- Render giao diện Modal ---
    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <dialog
            ref={dialogRef}
            className="add-dish-modal" // Đã đổi class từ edit-dish-modal sang add-dish-modal
            onClick={handleBackdropClick}
            onCancel={(e) => e.preventDefault()}
            aria-labelledby="addDishModalTitle"
        >
            <div className='modal-content'>
                <h2 id="addDishModalTitle">Add New Dish</h2>

                {addError && <p className="error-message">{addError}</p>}

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
                    {/* ----- Tên món ----- */}
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
                    {/* ----- Giá ----- */}
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
                    {/* ----- Mô tả ----- */}
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
                    {/* ----- URL Hình ảnh ----- */}
                    <div className="form-group">
                        <label htmlFor="addDishImageUrl">Image URL:</label>
                        <input
                            type="text"
                            id="addDishImageUrl"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.imageUrl ? 'addDishImageUrlError' : undefined}
                            aria-invalid={!!validationErrors.imageUrl}
                        />
                        {validationErrors.imageUrl && <p id="addDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>}
                    </div>
                    {/* ----- Đánh giá (sao) ----- */}
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
                    {/* ----- Thời gian nấu ----- */}
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
                    {/* ----- Loại món ăn ----- */}
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

                    {/* ----- Đánh dấu là món phổ biến? ----- */}
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

                    {/* ----- Nút Thêm và Hủy ----- */}
                    <div className="modal-actions">
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Dish'}
                        </button>
                        <button type="button" className="action-button cancel-button" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                    </div>
                </form>

                {/* ----- Nút đóng modal (dấu X) ----- */}
                <button type='button' className="modal-close-button" onClick={onClose} disabled={isSaving}>&times;</button>
            </div>
        </dialog>
    );
}

export default AddDishModal;