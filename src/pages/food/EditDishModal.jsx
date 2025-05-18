// src/pages/EditDishModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Import CSS (đảm bảo bạn đã tạo và style file này, bao gồm cả .validation-error)
import './EditDishModal.css';

// State khởi tạo rỗng cho lỗi validation
const initialValidationErrors = {}; // << Thêm này

function EditDishModal({
    isOpen,
    onClose,
    dish,
    onSave, // Hàm handleUpdateDish từ FoodManagement
    categories,
    categoryLoading,
    categoryError,
    updateError // Nhận lỗi cập nhật từ component cha (Firestore error)
}){
    // State riêng cho dữ liệu form trong modal
    const [formData, setFormData] = useState({name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false });
    // State loading cho nút lưu
    const [isSaving, setIsSaving] = useState(false);
     // State cho lỗi validation (giống AddDishModal)
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors); // << Thêm này
    // Ref cho thẻ dialog
    const dialogRef = useRef(null);

    // useEffect để điều khiển đóng/mở dialog, lắng nghe sự kiện 'close', và reset state khi mở
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        }

        if (isOpen) {
            // Reset trạng thái lưu và lỗi validation khi mở modal
            setIsSaving(false);
            setValidationErrors(initialValidationErrors); // << Reset lỗi validation
            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);

             // Tự động focus vào trường input đầu tiên
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

    // useEffect để cập nhật formData khi prop `dish` thay đổi
    useEffect(() => {
        if (isOpen && dish){ // Chỉ cập nhật khi modal mở và có dish
             // Dùng || '' thay vì ?? '' để đảm bảo các giá trị undefined/null/false
             // được set thành chuỗi rỗng hoặc false ban đầu
            setFormData({
                name: dish.name || '',
                price: dish.price || '', // Giá 0 vẫn hiển thị '0'
                description: dish.description || '',
                imageUrl: dish.imageUrl || '',
                star: dish.star || '', // Star 0 vẫn hiển thị '0', star rỗng hiển thị ''
                time: dish.time || '',
                categoryName: dish.categoryName || '',
                isPopular: dish.isPopular || false // isPopular false vẫn hiển thị false
            });
             // Không reset isSaving/validationErrors ở đây để tránh giật giao diện
             // Việc reset đã được làm trong useEffect mở modal
        }
    }, [isOpen, dish]); // Phụ thuộc isOpen và dish

    // Hàm xử lý thay đổi input và xóa lỗi validation tương ứng
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }));
         // Xóa lỗi validation cho trường vừa thay đổi
        setValidationErrors(prev => ({ ...prev, [name]: '' })); // << Xóa lỗi khi gõ
    };

     // Hàm VALIDATE FORM (Giống AddDishModal)
    const validateForm = () => {
        const errors = {};
        const priceValue = Number.parseFloat(formData.price);
        const starValue = Number.parseFloat(formData.star);

        if (!formData.name.trim()) {
            errors.name = 'Dish Name is required.';
        }
        if (formData.price === '' || isNaN(priceValue) || priceValue < 0) {
            errors.price = 'Price is required and must be a non-negative number.';
        }
        if (formData.star !== '' && (isNaN(starValue) || starValue < 0 || starValue > 5)) {
            errors.star = 'Rating must be a number between 0 and 5.';
        }
        if (!formData.categoryName) {
            errors.categoryName = 'Category is required.';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };


    // Hàm xử lý khi nhấn nút Lưu trong modal
    const handleSave = async () => {
        // 1. Chạy validation trước
        if (!validateForm()) {
            console.log("Validation failed");
            return; // Dừng lại nếu validation không pass
        }

        // Nếu validation pass
        setIsSaving(true); // Bắt đầu loading
        const updatedData = {
            name: formData.name.trim(), // Trim khoảng trắng
            price: Number.parseFloat(formData.price), // Đã là số
            description: formData.description,
            imageUrl: formData.imageUrl,
            star: formData.star === '' ? 0 : Number.parseFloat(formData.star), // Nếu rỗng thì set 0, không thì chuyển đổi
            time: formData.time,
            categoryName: formData.categoryName,
            isPopular: formData.isPopular
        };

        try {
             await onSave(dish.id, updatedData);
             // onSave (ở component cha) sẽ xử lý toast và đóng modal nếu thành công
         } catch (error) {
             // Lỗi từ Firestore (updateError) đã được set ở component cha
              console.error("Error during save:", error); // Log lỗi chi tiết hơn
             // updateError prop sẽ tự hiển thị trong modal
             // isSaving sẽ được set lại thành false ở finally block
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

    // --- Render giao diện Modal ---
    return (
        <dialog
            ref={dialogRef}
            className="edit-dish-modal" // Class CSS cho dialog
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                // Close dialog on Space or Enter press on backdrop (Accessibility)
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackdropClick(e);
                }
              }}
             onCancel={(e) => e.preventDefault()} // Tắt sự kiện cancel mặc định (ESC)
            aria-labelledby="editDishModalTitle"
        >
            <div className='modal-content'>
                {/* Updated modal title */}
                <h2 id="editDishModalTitle">Edit Dish: {dish?.name}</h2>

                {/* Hiển thị lỗi cập nhật từ Firestore nếu có */}
                {updateError && <p className="error-message">{updateError}</p>}

                {/* Form sửa */}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate> {/* Thêm noValidate */}
                    {/* ----- Dish Name ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishName">Dish Name:*</label>
                        <input
                            type="text"
                            id="editDishName"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={isSaving} // Disable khi đang lưu
                            aria-describedby={validationErrors.name ? 'editDishNameError' : undefined} // Accessibility
                            aria-invalid={!!validationErrors.name} // Accessibility
                        />
                         {/* Hiển thị lỗi validation */}
                         {validationErrors.name && <p id="editDishNameError" className="validation-error">{validationErrors.name}</p>} {/* << Thêm này */}
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
                             aria-describedby={validationErrors.price ? 'editDishPriceError' : undefined} // Accessibility
                             aria-invalid={!!validationErrors.price} // Accessibility
                        />
                         {/* Hiển thị lỗi validation */}
                        {validationErrors.price && <p id="editDishPriceError" className="validation-error">{validationErrors.price}</p>} {/* << Thêm này */}
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
                         {/* {validationErrors.description && <p id="editDishDescError" className="validation-error">{validationErrors.description}</p>} */}
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
                         {/* {validationErrors.imageUrl && <p id="editDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>} */}
                    </div>

                    {/* ----- Star Rating ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishStar">Star Rating:</label>
                         <input
                             type="number"
                             id="editDishStar"
                             name="star"
                             value={formData.star}
                             onChange={handleChange}
                             min="0" max="5" step="0.1"
                             disabled={isSaving}
                             aria-describedby={validationErrors.star ? 'editDishStarError' : undefined} // Accessibility
                             aria-invalid={!!validationErrors.star} // Accessibility
                         />
                         {/* Hiển thị lỗi validation */}
                        {validationErrors.star && <p id="editDishStarError" className="validation-error">{validationErrors.star}</p>} {/* << Thêm này */}
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
                         {/* {validationErrors.time && <p id="editDishTimeError" className="validation-error">{validationErrors.time}</p>} */}
                     </div>

                    {/* ----- Category ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishCategory">Category:*</label>
                         <select
                            id="editDishCategory"
                            name="categoryName"
                            value={formData.categoryName}
                            onChange={handleChange}
                             // Disable khi đang tải loại hoặc đang lưu
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
                        {/* Hiển thị lỗi category từ fetch HOẶC lỗi validation */}
                         {(categoryError || validationErrors.categoryName) && <p className="error-message" id="editDishCategoryError">{categoryError || validationErrors.categoryName}</p>} {/* << Cập nhật */}
                    </div>

                     {/* ----- Popular? ----- */}
                     <div className="form-group form-group-checkbox">
                          <input
                             type="checkbox"
                             id="editDishIsPopular" // ID riêng cho checkbox sửa
                             name="isPopular"
                             checked={formData.isPopular} // checked dựa vào state
                             onChange={handleChange} // Dùng chung handleChange
                             disabled={isSaving}
                         />
                          <label htmlFor="editDishIsPopular">Popular?</label>
                     </div>

                    {/* ----- Save and Cancel Buttons ----- */}
                    <div className="modal-actions">
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                             {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="action-button cancel-button" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                    </div>
                </form>

                {/* ----- Close Button (X) ----- */}
                <button type='button' className="modal-close-button" onClick={onClose} disabled={isSaving}>&times;</button>
            </div>
        </dialog>
    );
}

export default EditDishModal;