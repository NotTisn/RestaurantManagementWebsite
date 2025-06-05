import React, { useEffect, useRef } from 'react';
import './ImagePreviewModal.css'; 

function ImagePreviewModal({ isOpen, onClose, imageUrl, altText }) {
    const dialogRef = useRef(null);

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

    const handleBackdropClick = (event) => {
        if (event.target === dialogRef.current) {
            onClose();
        }
    };

    if (!isOpen || !imageUrl) {
         return null;
    }

    return (
        <dialog
            ref={dialogRef}
            className="image-preview-modal" 
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackdropClick(e);
                }
              }}
            aria-label={altText || "Preview"} 
        >
            <img src={imageUrl} alt={altText} className="preview-image" />
            <button type='button' className="modal-close-button image-close-button" onClick={onClose} aria-label="Close">&times;</button>
        </dialog>
    );
}

export default ImagePreviewModal;