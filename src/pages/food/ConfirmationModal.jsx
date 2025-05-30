// src/pages/ConfirmationModal.jsx
import React, { useEffect, useRef } from 'react';
import './ConfirmationModal.css'; // Sẽ tạo file CSS này ở bước 2

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialogElement = dialogRef.current;
        if (dialogElement) {
            if (isOpen) {
                dialogElement.showModal(); // Hiển thị dialog
            } else {
                dialogElement.close(); // Đóng dialog
            }
        }
    }, [isOpen]);

    // Xử lý khi người dùng bấm nút xác nhận
    const handleConfirm = () => {
        onConfirm();
        onClose(); // Đóng modal sau khi xác nhận
    };

    // Xử lý khi người dùng bấm nút hủy hoặc click backdrop
    const handleClose = () => {
        onClose(); // Đóng modal
    };

    return (
        <dialog ref={dialogRef} className="confirmation-modal" onCancel={handleClose}>
            <div className="modal-content">
                <button type="button" className="modal-close-button" onClick={handleClose}>
                    &times;
                </button>
                <h2>{title}</h2>
                <p>{message}</p>
                <div className="modal-actions">
                    <button type="button" className="action-button cancel-button" onClick={handleClose}>
                        {cancelText}
                    </button>
                    <button type="button" className="action-button confirm-button" onClick={handleConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

export default ConfirmationModal;