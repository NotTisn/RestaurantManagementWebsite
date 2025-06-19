import React from 'react';
import ReactDOM from 'react-dom';
import './Modal.css'; 

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    &times;
                </button>
                {children}
            </div>
        </div>,
        document.getElementById('modal-root') // Make sure you have a div with id="modal-root" in your public/index.html
    );
};

export default Modal;