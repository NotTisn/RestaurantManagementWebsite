import React, { useState, useEffect, useRef } from 'react';
import './AddDishModal.css';

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
    addError
}) {
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
    const dialogRef = useRef(null);

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

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

        if (formData.imageUrl && !urlRegex.test(formData.imageUrl)) {
            errors.imageUrl = 'Please enter a valid URL for the image.';
        }

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

    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="add-dish-modal"
            onClick={handleBackdropClick}
            onCancel={(e) => e.preventDefault()}
            aria-labelledby="addDishModalTitle"
        >
            <div className='modal-content'>
                <h2 id="addDishModalTitle">Add New Dish</h2>

                {addError && <p className="error-message">{addError}</p>}

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