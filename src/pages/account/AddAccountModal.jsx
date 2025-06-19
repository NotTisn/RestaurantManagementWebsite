import React, { useState, useEffect } from 'react';
import Modal from './Modal';

function AddAccountModal({ isOpen, onClose, onSave, addError }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        role: 'customer',
        isSuspended: false 
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                address: '',
                role: 'customer',
                isSuspended: false 
            });
            setFormErrors({});
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const actualValue = type === "checkbox" ? checked : value;

        setFormData(prev => ({ ...prev, [name]: actualValue }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };


    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Name cannot be empty.';
        }
        if (!formData.email.trim()) {
            errors.email = 'Email cannot be empty.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email is invalid.';
        }
        if (!formData.password.trim()) {
            errors.password = 'Password cannot be empty.';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters.';
        }
        if (!formData.phone.trim()) {
            errors.phone = 'Phone number cannot be empty.';
        } else if (!/^\d{10,11}$/.test(formData.phone)) {
            errors.phone = 'Phone number must be 10-11 digits.';
        }
        if (!formData.address.trim()) {
            errors.address = 'Address cannot be empty.';
        }
        if (!formData.role) {
            errors.role = 'Role cannot be empty.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2>Add new account</h2>
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
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    {formErrors.email && <p className="error-message">{formErrors.email}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    {formErrors.password && <p className="error-message">{formErrors.password}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="phone">Phone number:</label>
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
                    <label htmlFor="address">Address:</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                    />
                    {formErrors.address && <p className="error-message">{formErrors.address}</p>}
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
                        <option value="customer">Customer</option>
                        <option value="shipper">Shipper</option>
                        <option value="admin">Admin</option>
                    </select>
                    {formErrors.role && <p className="error-message">{formErrors.role}</p>}
                </div>

                
                {addError && <p className="error-message">{addError}</p>}
                <div className="button-group">
                    <button type="button" onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    <button type="submit" className="save-button">
                        Add account
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default AddAccountModal;