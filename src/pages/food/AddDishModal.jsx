// src/pages/AddDishModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Sử dụng lại CSS của EditDishModal hoặc tạo file mới nếu muốn khác biệt
import './EditDishModal.css'; // Hoặc './AddDishModal.css'

// Giá trị khởi tạo rỗng cho form
const initialFormData = {
    name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false
};

function AddDishModal({
    isOpen,
    onClose,
    onSave, // Hàm handleAddDish từ FoodManagement
    categories,
    categoryLoading,
    categoryError,
    addError // Lỗi khi thêm món
}){
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const dialogRef = useRef(null);

    // useEffect để điều khiển dialog và reset form khi mở/đóng
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
            if (isOpen) { onClose(); }
        }

        if (isOpen) {
            setFormData(initialFormData); // << Reset form khi mở modal
            setIsSaving(false); // Reset trạng thái lưu
            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);

             // Tự động focus
             try {
                const focusableElements = '.modal-content input, .modal-content select, .modal-content textarea, .modal-content button:not([disabled])';
                const firstFocusableElement = dialogNode.querySelector(focusableElements);
                 if (firstFocusableElement) {
                     firstFocusableElement.focus();
                 }
             } catch (e) { console.error("Error focusing first input:", e); }

        } else {
            dialogNode.close();
        }

        return () => {
            dialogNode.removeEventListener('close', handleDialogClose);
        };
    }, [isOpen, onClose]); // Thêm onClose vào dependencies

    // Hàm xử lý thay đổi input (giống hệt Edit modal)
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }));
    };

    // Hàm xử lý khi nhấn nút Lưu/Thêm (giống hệt Edit modal về logic, chỉ khác tên biến)
    const handleSave = async () => {
        const priceValue = Number.parseFloat(formData.price);
        if (!formData.name || !(priceValue >= 0) || !formData.categoryName) {
            alert("Vui lòng nhập đầy đủ Tên món, Giá hợp lệ và chọn Loại món ăn.");
            return;
        }

        setIsSaving(true);
        const newDishData = { // Dùng tên biến khác cho rõ ràng
            name: formData.name,
            price: priceValue,
            description: formData.description,
            imageUrl: formData.imageUrl,
            star: Number.parseFloat(formData.star) || 0,
            time: formData.time,
            categoryName: formData.categoryName,
            isPopular: formData.isPopular
       };

        try {
            await onSave(newDishData); // Gọi hàm onSave (chính là handleAddDish)
            // Component cha (FoodManagement) sẽ đóng modal nếu thành công
        } catch (error) {
            // Lỗi đã được set ở component cha và truyền vào qua prop addError
            console.error("Error during save:", error);
            // Không cần làm gì thêm ở đây, lỗi sẽ hiển thị
        } finally {
            setIsSaving(false); // Luôn reset trạng thái loading
        }
    };

    // Hàm xử lý click backdrop (giống hệt Edit modal)
    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current && !isSaving) {
            onClose();
        }
    };

    // --- Render giao diện Modal ---
    return (
        <dialog
            ref={dialogRef}
            className="edit-dish-modal" // <<< Sử dụng lại class CSS của Edit modal
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackdropClick(e);
                }
              }}
            aria-labelledby="addDishModalTitle" // Thay đổi ID cho tiêu đề
        >
            <div className='modal-content'>
                {/* Thay đổi tiêu đề */}
                <h2 id="addDishModalTitle">Thêm món ăn mới</h2>

                {/* Hiển thị lỗi THÊM nếu có */}
                {addError && <p className="error-message">{addError}</p>}

                {/* Form thêm - cấu trúc giống hệt form sửa */}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                     {/* ----- Tên món ----- */}
                     <div className="form-group">
                         <label htmlFor="addDishName">Tên món:*</label> {/* Đổi ID nếu muốn */}
                         <input type="text" id="addDishName" name="name" value={formData.name} onChange={handleChange} required disabled={isSaving}/>
                     </div>
                     {/* ----- Giá ----- */}
                     <div className="form-group">
                          <label htmlFor="addDishPrice">Giá (VNĐ):*</label>
                         <input type="number" id="addDishPrice" name="price" value={formData.price} onChange={handleChange} required min="0" step="1000" disabled={isSaving}/>
                     </div>
                      {/* ----- Mô tả ----- */}
                      <div className="form-group">
                         <label htmlFor="addDishDesc">Mô tả:</label>
                         <textarea id="addDishDesc" name="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSaving}/>
                     </div>
                     {/* ----- URL Hình ảnh ----- */}
                     <div className="form-group">
                          <label htmlFor="addDishImageUrl">URL Hình ảnh:</label>
                         <input type="text" id="addDishImageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} disabled={isSaving}/>
                     </div>
                     {/* ----- Đánh giá (sao) ----- */}
                     <div className="form-group">
                          <label htmlFor="addDishStar">Đánh giá (sao):</label>
                         <input type="number" id="addDishStar" name="star" value={formData.star} onChange={handleChange} min="0" max="5" step="0.1" disabled={isSaving}/>
                     </div>
                      {/* ----- Thời gian nấu ----- */}
                     <div className="form-group">
                          <label htmlFor="addDishTime">Thời gian nấu:</label>
                          <input type="text" id="addDishTime" name="time" value={formData.time} onChange={handleChange} placeholder="Ví dụ: 15-20 phút" disabled={isSaving}/>
                     </div>
                     {/* ----- Loại món ăn ----- */}
                     <div className="form-group">
                          <label htmlFor="addDishCategory">Loại món ăn:*</label>
                          <select id="addDishCategory" name="categoryName" value={formData.categoryName} onChange={handleChange} required disabled={categoryLoading || isSaving}>
                              <option value="" disabled>{categoryLoading ? 'Đang tải loại...' : categoryError ? 'Lỗi tải loại' : '-- Chọn loại món ăn --'}</option>
                              {!categoryLoading && !categoryError && categories.map(category => (<option key={category.id} value={category.name}>{category.name}</option>))}
                          </select>
                          {categoryError && <div className="error-message">{categoryError}</div>}
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
                         <label htmlFor="addDishIsPopular">Đánh dấu là món phổ biến?</label>
                     </div>

                    {/* ----- Nút Thêm và Hủy ----- */}
                    <div className="modal-actions">
                         {/* Thay đổi text nút */}
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Đang thêm...' : 'Thêm món'}
                        </button>
                        <button type="button" className="action-button cancel-button" onClick={onClose} disabled={isSaving}>
                            Hủy
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