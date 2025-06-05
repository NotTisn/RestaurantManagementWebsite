import React, { useState, useEffect, useRef } from 'react';
import './EditDishModal.css';

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
}){
    const [formData, setFormData] = useState({name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false });
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
    const dialogRef = useRef(null);

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        }

        if (isOpen) {
            setIsSaving(false);
            setValidationErrors(initialValidationErrors);
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
        if (isOpen && dish){ 
            setFormData({
                name: dish.name || '',
                price: dish.price || '', 
                description: dish.description || '',
                imageUrl: dish.imageUrl || '',
                star: dish.star || '', 
                time: dish.time || '',
                categoryName: dish.categoryName || '',
                isPopular: dish.isPopular || false 
            });
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


    // Hàm xử lý khi nhấn nút Lưu trong modal
    const handleSave = async () => {
        if (!validateForm()) {
            console.log("Validation failed");
            return; 
        }

        // validation pass
        setIsSaving(true); 
        const updatedData = {
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
            await onSave(dish.id, updatedData);
        } catch (error) {
            console.error("Error during save:", error); 
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

                    {/* ----- Image URL ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishImageUrl">Image URL:</label>
                        <input
                            type="text"
                            id="editDishImageUrl"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            disabled={isSaving}
                            aria-describedby={validationErrors.imageUrl ? 'editDishImageUrlError' : undefined}
                            aria-invalid={!!validationErrors.imageUrl}
                        />
                        {validationErrors.imageUrl && <p id="editDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>}
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
                            aria-describedby={validationErrors.categoryName ? 'editDishCategoryError' : undefined} // Accessibility
                            aria-invalid={!!validationErrors.categoryName} // Accessibility
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