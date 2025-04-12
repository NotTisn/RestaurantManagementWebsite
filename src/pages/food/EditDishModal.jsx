// src/pages/EditDishModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Import CSS (đảm bảo bạn đã tạo và style file này)
import './EditDishModal.css';

// Giá trị khởi tạo rỗng cho form
// const initialFormData = {
//     name: '',
//     price: '',
//     description: '',
//     imageUrl: '',
//     star: '',
//     time: '',
//     categoryName: ''
// };

function EditDishModal({
    isOpen,
    onClose,
    dish,
    onSave,
    categories,
    categoryLoading,
    categoryError,
    updateError // Nhận lỗi cập nhật từ component cha
}){
    // State riêng cho dữ liệu form trong modal
    const [formData, setFormData] = useState({name: '', price: '', description: '', imageUrl: '', star: '', time: '', categoryName: '', isPopular: false });
    // State loading cho nút lưu
    const [isSaving, setIsSaving] = useState(false);
    // Ref cho thẻ dialog
    const dialogRef = useRef(null);

    // useEffect để điều khiển đóng/mở dialog và lắng nghe sự kiện 'close'
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        // Hàm xử lý khi dialog bị đóng (ví dụ bằng ESC)
        const handleDialogClose = () => {
            if (isOpen) { // Chỉ gọi onClose của cha nếu nó đang mở mà bị đóng
                onClose();
            }
        }

        if (isOpen) {
            dialogNode.showModal(); // Mở dialog
            dialogNode.addEventListener('close', handleDialogClose); // Lắng nghe sự kiện đóng

            // Tự động focus vào trường input đầu tiên
             try {
                const focusableElements = '.modal-content input, .modal-content select, .modal-content textarea, .modal-content button:not([disabled])';
                const firstFocusableElement = dialogNode.querySelector(focusableElements);
                 if (firstFocusableElement) {
                     firstFocusableElement.focus();
                 }
             } catch (e) { console.error("Error focusing first input:", e); }

        } else {
            dialogNode.close(); // Đóng dialog
        }

        // Hàm cleanup: gỡ bỏ listener khi component unmount hoặc isOpen thay đổi
        return () => {
            dialogNode.removeEventListener('close', handleDialogClose);
        };

    }, [isOpen, onClose]); // Phụ thuộc isOpen và onClose

    // useEffect để cập nhật formData khi prop `dish` thay đổi
    useEffect(() => {
        if (isOpen && dish){ // Chỉ cập nhật khi modal mở và có dish
            setFormData({
                name: dish.name ?? '',
                price: dish.price ?? '',
                description: dish.description ?? '',
                imageUrl: dish.imageUrl ?? '',
                star: dish.star ?? '',
                time: dish.time ?? '',
                categoryName: dish.categoryName ?? '',
                isPopular: dish.isPopular ?? false // <<< Lấy isPopular từ dish, mặc định là false nếu không có
            });
            setIsSaving(false); // Reset trạng thái saving
        }
    }, [isOpen, dish]); // Phụ thuộc isOpen và dish

    // Hàm xử lý thay đổi input trong form modal
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }));
    };

    // Hàm xử lý khi nhấn nút Lưu trong modal
    const handleSave = async () => {
        // Kiểm tra validation cơ bản
        const priceValue = Number.parseFloat(formData.price); // Chuyển sang số để kiểm tra
        if (!formData.name || !(priceValue >= 0) || !formData.categoryName) {
            alert("Vui lòng nhập đầy đủ Tên món, Giá hợp lệ (lớn hơn hoặc bằng 0) và chọn Loại món ăn.");
            return;
        }

        setIsSaving(true); // Bắt đầu loading
        const updatedData = {
            name: formData.name,
            price: priceValue, // Đã là số
            description: formData.description,
            imageUrl: formData.imageUrl,
            star: Number.parseFloat(formData.star) || 0, // Đảm bảo là số hoặc 0
            time: formData.time,
            categoryName: formData.categoryName,
            isPopular: formData.isPopular
       };

        try {
             // Gọi hàm onSave truyền từ cha
            await onSave(dish.id, updatedData);
            // Nếu onSave thành công (không ném lỗi), component cha sẽ gọi onClose
            // Không cần gọi onClose() ở đây nữa
        } catch (error) {
             // Nếu onSave có lỗi (component cha nên xử lý và set updateError)
             // Lỗi sẽ hiển thị và modal không tự đóng
             console.error("Error during save:", error);
        } finally {
             // Luôn reset trạng thái loading dù thành công hay thất bại
             setIsSaving(false);
        }
    };

    // Hàm xử lý click vào backdrop của dialog
    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current && !isSaving) {
            onClose(); // Đóng nếu click trực tiếp vào backdrop và không đang lưu
        }
    };

    // --- Render giao diện Modal ---
    return (
        <dialog
            ref={dialogRef}
            className="edit-dish-modal" // Class CSS cho dialog
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackdropClick(e);
                }
              }}
            aria-labelledby="editDishModalTitle"
        >
            {/* Phần nội dung chính của modal */}
            <div className='modal-content'>
                <h2 id="editDishModalTitle">Sửa thông tin món ăn: {dish?.name}</h2>

                {/* Hiển thị lỗi cập nhật nếu có */}
                {updateError && <p className="error-message">{updateError}</p>}

                {/* Form sửa */}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    {/* ----- Tên món ----- */}
                    <div className="form-group">
                        <label htmlFor="editDishName">Tên món:*</label>
                        <input
                            type="text"
                            id="editDishName"
                            name="name"
                            value={formData.name} // state đã xử lý undefined/null
                            onChange={handleChange}
                            required
                            disabled={isSaving} // Disable khi đang lưu
                        />
                    </div>

                    {/* ----- Giá ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishPrice">Giá (VNĐ):*</label>
                        <input
                            type="number"
                            id="editDishPrice"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            step="any" // Tùy chọn: bước nhảy giá
                            disabled={isSaving}
                        />
                    </div>

                     {/* ----- Mô tả ----- */}
                     <div className="form-group">
                        <label htmlFor="editDishDesc">Mô tả:</label>
                        <textarea
                            id="editDishDesc"
                            name="description"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isSaving}
                        />
                    </div>

                    {/* ----- URL Hình ảnh ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishImageUrl">URL Hình ảnh:</label>
                        <input
                            type="text"
                            id="editDishImageUrl"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            disabled={isSaving}
                        />
                    </div>

                    {/* ----- Đánh giá (sao) ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishStar">Đánh giá (sao):</label>
                        <input
                             type="number"
                             id="editDishStar"
                             name="star"
                             value={formData.star}
                             onChange={handleChange}
                             min="0" max="5" step="0.1"
                             disabled={isSaving}
                        />
                    </div>

                     {/* ----- Thời gian nấu ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishTime">Thời gian nấu:</label>
                         <input
                            type="text"
                            id="editDishTime"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            placeholder="Ví dụ: 15-20 phút"
                            disabled={isSaving}
                        />
                    </div>

                    {/* ----- Loại món ăn ----- */}
                    <div className="form-group">
                         <label htmlFor="editDishCategory">Loại món ăn:*</label>
                         <select
                            id="editDishCategory"
                            name="categoryName"
                            value={formData.categoryName}
                            onChange={handleChange}
                            required
                            // Disable khi đang tải loại hoặc đang lưu
                            disabled={categoryLoading || isSaving}
                        >
                            <option value="" disabled>
                                {categoryLoading ? 'Đang tải loại...' : categoryError ? 'Lỗi tải loại' : '-- Chọn loại món ăn --'}
                            </option>
                            {!categoryLoading && !categoryError && categories.map(category => (
                                <option key={category.id} value={category.name}>{category.name}</option>
                            ))}
                        </select>
                        {categoryError && <div className="error-message">{categoryError}</div>}
                    </div>

                     {/* ----- Đánh dấu là món phổ biến? ----- */}
                    <div className="form-group form-group-checkbox">
                         <input
                             type="checkbox"
                             id="editDishIsPopular" // ID riêng cho checkbox sửa
                             name="isPopular"
                             checked={formData.isPopular} // checked dựa vào state
                             onChange={handleChange} // Dùng chung handleChange
                             disabled={isSaving}
                         />
                         <label htmlFor="editDishIsPopular">Đánh dấu là món phổ biến?</label>
                     </div>

                    {/* ----- Nút Lưu và Hủy ----- */}
                    <div className="modal-actions">
                        <button type="submit" className="action-button save-button" disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
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

export default EditDishModal;