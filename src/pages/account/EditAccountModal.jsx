import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
// import { deleteField } from "firebase/firestore"; // deleteField không còn cần thiết

function EditAccountModal({ isOpen, onClose, user, onSave, updateError }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        role: '',
        isSuspended: false, // Mặc định là false
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phoneNumber || '',
                role: user.role || 'customer',
                // Lấy giá trị isSuspended từ user, mặc định là false nếu không có
                isSuspended: user.isSuspended || false,
            });
            setFormErrors({});
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };

            // === BỎ CÁC LOGIC NÀY ===
            // if (name === 'role') {
            //     if (value !== 'customer') {
            //         if ('isSuspended' in newState) {
            //             delete newState.isSuspended;
            //         }
            //     } else if (value === 'customer' && !('isSuspended' in newState)) {
            //         newState.isSuspended = false;
            //     }
            // }
            // === KẾT THÚC BỎ CÁC LOGIC NÀY ===

            return newState;
        });

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Name is required.';
        }
        if (!formData.phone.trim()) {
            errors.phone = 'Phone number is required.';
        } else if (!/^\d{10,11}$/.test(formData.phone)) {
            errors.phone = 'Phone number must be 10-11 digits.';
        }
        if (!formData.role) {
            errors.role = 'Role is required.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            const updatedFirestoreData = {
                name: formData.name,
                phoneNumber: formData.phone,
                // isSuspended luôn được cập nhật với giá trị từ form
                isSuspended: formData.isSuspended,
            };

            if (formData.role === 'admin') {
                updatedFirestoreData.role = 'restaurantOwner';
            } else {
                updatedFirestoreData.role = formData.role;
            }

            onSave(user.id, updatedFirestoreData);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Edit Account</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    {formErrors.name && <p className="error-message">{formErrors.name}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email (Not Editable):</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={user?.email || 'N/A'}
                        disabled
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phone">Phone:</label>
                    <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                    {formErrors.phone && <p className="error-message">{formErrors.phone}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="role">Role:</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select Role</option>
                        <option value="customer">Customer</option>
                        <option value="shipper">Shipper</option>
                        <option value="admin">Admin</option>
                    </select>
                    {formErrors.role && <p className="error-message">{formErrors.role}</p>}
                </div>
                {/* BỎ ĐIỀU KIỆN HIỂN THỊ Switch */}
                <div className="form-group">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.isSuspended}
                                onChange={handleChange}
                                name="isSuspended"
                                id="isSuspended"
                            />
                        }
                        label="Suspended"
                    />
                </div>
                {updateError && <p className="error-message">{updateError}</p>}
                <div className="button-group">
                    <button type="button" onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    <button type="submit" className="save-button">
                        Save Changes
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default EditAccountModal;