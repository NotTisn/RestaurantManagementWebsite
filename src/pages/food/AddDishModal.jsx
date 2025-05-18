// src/pages/AddDishModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Sử dụng lại CSS của EditDishModal hoặc tạo file mới nếu muốn khác biệt
import './EditDishModal.css'; // Hoặc './AddDishModal.css'

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
}){
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState(initialValidationErrors); // << Thêm state cho lỗi validation
    const dialogRef = useRef(null);

    // useEffect để điều khiển dialog và reset form/lỗi khi mở/đóng
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        }

        if (isOpen) {
            setFormData(initialFormData); // << Reset form khi mở modal
            setValidationErrors(initialValidationErrors); // << Reset lỗi validation khi mở modal
            setIsSaving(false); // Reset trạng thái lưu
            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);

             // Tự động focus vào input đầu tiên
             try {
                const firstInput = dialogNode.querySelector('input, select, textarea'); // Tìm input đầu tiên
                if (firstInput) {
                    firstInput.focus();
                }
            } catch (e) { console.error("Error focusing first input:", e); }


        } else {
            dialogNode.close();
        }

        // Cleanup listener khi component unmount hoặc isOpen thay đổi
        return () => {
             if (dialogNode) { // Kiểm tra dialogNode không null
                 dialogNode.removeEventListener('close', handleDialogClose);
             }
        };
    }, [isOpen, onClose]); // Thêm onClose vào dependencies

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

    // Hàm VALIDATE FORM
    const validateForm = () => {
        const errors = {};
        const priceValue = Number.parseFloat(formData.price);
        const starValue = Number.parseFloat(formData.star); // Sẽ là NaN nếu rỗng hoặc không hợp lệ

        if (!formData.name.trim()) {
            errors.name = 'Dish Name is required.';
        }
        if (formData.price === '' || Number.isNaN(priceValue) || priceValue < 0) {
             // Kiểm tra cả chuỗi rỗng, NaN, và số âm
            errors.price = 'Price is required and must be a non-negative number.';
        }
         // Validation cho Star: chấp nhận rỗng, nhưng nếu có giá trị thì phải là số từ 0-5
        if (formData.star !== '' && (Number.isNaN(starValue) || starValue < 0 || starValue > 5)) {
             errors.star = 'Rating must be a number between 0 and 5.';
         }
        if (!formData.categoryName) {
            errors.categoryName = 'Category is required.';
        }

        setValidationErrors(errors); 
        return Object.keys(errors).length === 0; 
    };


    // Hàm xử lý khi nhấn nút Lưu/Thêm
    const handleSave = async () => {
        // 1. Chạy validation trước
        if (!validateForm()) {
            console.log("Validation failed");
            return; // Dừng lại nếu validation không pass
        }

        // Nếu validation pass
        setIsSaving(true);
        // Chuyển đổi các giá trị số sang Number
        const newDishData = {
            name: formData.name.trim(), // Trim khoảng trắng
            price: Number.parseFloat(formData.price),
            description: formData.description,
            imageUrl: formData.imageUrl,
            star: formData.star === '' ? 0 : Number.parseFloat(formData.star), // Nếu rỗng thì set 0, không thì chuyển đổi
            time: formData.time,
            categoryName: formData.categoryName,
            isPopular: formData.isPopular
        };

        try {
            await onSave(newDishData); // Gọi hàm onSave (handleAddDish từ FoodManagement)
            // onSave (ở component cha) sẽ xử lý toast và đóng modal nếu thành công
        } catch (error) {
            // Lỗi từ Firestore (addError) đã được set ở component cha và truyền vào qua prop
             console.error("Error during save:", error); // Log lỗi chi tiết hơn
            // addError prop sẽ tự hiển thị trong modal
            // isSaving sẽ được set lại thành false ở finally block
        } finally {
            setIsSaving(false); // Luôn reset trạng thái loading
        }
    };

    // Hàm xử lý click backdrop (giữ nguyên, thêm kiểm tra isSaving)
    const handleBackdropClick = (event) => {
        // Chỉ đóng modal khi click vào backdrop và không đang trong quá trình lưu
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    // --- Render giao diện Modal ---
    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
<dialog
            ref={dialogRef}
            className="edit-dish-modal" //
            onClick={handleBackdropClick}
            onCancel={(e) => e.preventDefault()}
            aria-labelledby="addDishModalTitle" 
        >
            <div className='modal-content'>
                {/* Thay đổi tiêu đề */}
                <h2 id="addDishModalTitle">Add New Dish</h2>

                {addError && <p className="error-message">{addError}</p>}

                {/* Form thêm */}
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
                        />
                         {/* Hiển thị lỗi validation */}
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
                             // Bỏ required, min, step HTML để dùng validation tự viết
                            disabled={isSaving}
                             aria-describedby={validationErrors.price ? 'addDishPriceError' : undefined}
                            aria-invalid={!!validationErrors.price}
                        />
                         {/* Hiển thị lỗi validation */}
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
                         {/* Có thể thêm validation cho desc nếu cần max length */}
                         {/* {validationErrors.description && <p id="addDishDescError" className="validation-error">{validationErrors.description}</p>} */}
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
                         {/* Có thể thêm validation cho imageUrl nếu cần */}
                         {/* {validationErrors.imageUrl && <p id="addDishImageUrlError" className="validation-error">{validationErrors.imageUrl}</p>} */}
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
                             // Bỏ min, max, step HTML để dùng validation tự viết chính xác hơn
                            disabled={isSaving}
                            aria-describedby={validationErrors.star ? 'addDishStarError' : undefined}
                            aria-invalid={!!validationErrors.star}
                        />
                         {/* Hiển thị lỗi validation */}
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
                         {/* Có thể thêm validation cho time nếu cần định dạng cụ thể */}
                         {/* {validationErrors.time && <p id="addDishTimeError" className="validation-error">{validationErrors.time}</p>} */}
                    </div>
                    {/* ----- Loại món ăn ----- */}
                    <div className="form-group">
                        <label htmlFor="addDishCategory">Category:*</label>
                        <select
                            id="addDishCategory"
                            name="categoryName"
                            value={formData.categoryName}
                            onChange={handleChange}
                             // Bỏ required HTML để dùng validation tự viết
                            disabled={categoryLoading || isSaving}
                            aria-describedby={validationErrors.categoryName ? 'addDishCategoryError' : undefined}
                            aria-invalid={!!validationErrors.categoryName}
                        >
                            <option value="" disabled>{categoryLoading ? 'Loading...' : categoryError ? 'Error loading categories' : '-- Select category --'}</option>
                            {!categoryLoading && !categoryError && categories.map(category => (<option key={category.id} value={category.name}>{category.name}</option>))}
                        </select>
                         {/* Hiển thị lỗi category từ fetch HOẶC lỗi validation */}
                         {(categoryError || validationErrors.categoryName) && <p className="error-message" id="addDishCategoryError">{categoryError || validationErrors.categoryName}</p>}
                    </div>

                    {/* ----- Đánh dấu là món phổ biến? ----- */}
                    <div className="form-group form-group-checkbox"> {/* Thêm class để style nếu cần */}
                        <input
                            type="checkbox"
                            id="addDishIsPopular" // ID riêng cho checkbox thêm
                            name="isPopular" // <<< name khớp với state
                            checked={formData.isPopular} // <<< checked dựa vào state
                            onChange={handleChange} // <<< Dùng chung handleChange đã cập nhật
                            disabled={isSaving}
                        />
                        {/* Nhãn đi kèm, htmlFor khớp với ID */}
                        <label htmlFor="addDishIsPopular">Popular?</label>
                    </div>

                    {/* ----- Nút Thêm và Hủy ----- */}
                    <div className="modal-actions">
                         {/* Thay đổi text nút */}
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Dish'} {/* Cập nhật text khi đang lưu */}
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