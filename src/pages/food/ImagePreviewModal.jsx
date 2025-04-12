// src/pages/ImagePreviewModal.jsx
import React, { useEffect, useRef } from 'react';
import './ImagePreviewModal.css'; // Tạo file CSS riêng hoặc dùng chung

function ImagePreviewModal({ isOpen, onClose, imageUrl, altText }) {
    const dialogRef = useRef(null);

    // useEffect để điều khiển dialog (tương tự các modal khác)
    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const handleDialogClose = () => {
             if (isOpen) { onClose(); }
        }

        if (isOpen) {
            dialogNode.showModal();
            dialogNode.addEventListener('close', handleDialogClose);
        } else {
            dialogNode.close();
        }

        return () => {
            dialogNode.removeEventListener('close', handleDialogClose);
        };
    }, [isOpen, onClose]);

    // Xử lý click backdrop
    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current) {
            onClose();
        }
    };

    // Không render gì nếu không mở hoặc không có URL ảnh
    // Mặc dù dialog tự ẩn, kiểm tra này vẫn tốt để tránh lỗi nếu URL rỗng
    if (!isOpen || !imageUrl) {
         // Hoặc có thể render dialog trống nếu muốn giữ ref ổn định
         // return <dialog ref={dialogRef}></dialog>;
         return null;
    }

    return (
        <dialog
            ref={dialogRef}
            className="image-preview-modal" // Class riêng cho modal ảnh
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackdropClick(e);
                }
              }}
            aria-label={altText || "Xem trước hình ảnh"} // Dùng aria-label vì không có tiêu đề thấy được
        >
            {/* Không cần div.modal-content bao ngoài nếu chỉ có ảnh và nút đóng */}
            <img src={imageUrl} alt={altText} className="preview-image" />
            {/* Có thể thêm nút đóng riêng nếu muốn */}
            <button type='button' className="modal-close-button image-close-button" onClick={onClose} aria-label="Đóng">&times;</button>
        </dialog>
    );
}

export default ImagePreviewModal;