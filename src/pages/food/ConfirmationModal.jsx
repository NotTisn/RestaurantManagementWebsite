import React, { useEffect, useRef } from 'react';
import './ConfirmationModal.css'; 

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialogElement = dialogRef.current;
        if (dialogElement) {
            if (isOpen) {
                dialogElement.showModal(); 
            } else {
                dialogElement.close(); 
            }
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm();
        onClose(); 
    };

    const handleClose = () => {
        onClose(); 
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