import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, setDoc, serverTimestamp } from "firebase/firestore"; // deleteField không còn cần thiết, đã bỏ import
import { db } from '../../firebaseConfig';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import './AccountManagement.css'; // Đảm bảo file CSS này tồn tại
import EditAccountModal from './EditAccountModal';
import AddAccountModal from './AddAccountModal';
import ConfirmationModal from '../../pages/food/ConfirmationModal';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { Pagination, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material'; // Import Switch và FormControlLabel từ MUI

const USERS_COLLECTION_NAME = 'users';

const auth = getAuth();

/**
 * Removes diacritics (accent marks) from a string for robust searching.
 * @param {string} str The input string.
 * @returns {string} The string with diacritics removed.
 */
function removeDiacritics(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

/**
 * AccountManagement component for viewing, adding, editing, and soft-deleting user accounts.
 */
function AccountManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addError, setAddError] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [updateError, setUpdateError] = useState(null);

    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // === THÊM TRẠNG THÁI MỚI ===
    const [showSuspendedUsers, setShowSuspendedUsers] = useState(false);

    // Fetch users from Firestore in real-time
    useEffect(() => {
        setLoading(true);
        setError(null);

        const usersCollectionRef = collection(db, USERS_COLLECTION_NAME);
        const q = query(usersCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setUsers(usersData);
            setLoading(false);
            console.log("AccountManagement: Realtime users update:", usersData);
        }, (err) => {
            console.error("AccountManagement: Error listening to users collection: ", err);
            setError("Cannot load user accounts. Please try again later.");
            setLoading(false);
        });

        // Cleanup subscription on component unmount
        return () => {
            unsubscribe();
            console.log("AccountManagement: Unsubscribed from users listener");
        };
    }, []);

    // Debounce search term to prevent excessive re-renders/filtering
    const debouncedSearch = useCallback(
        debounce((term) => {
            setInternalSearchTerm(term);
        }, 300),
        []
    );

    // Filter users based on search term, selected role, and suspended status
    useEffect(() => {
        if (!loading) {
            let result = [...users]; // Bắt đầu với tất cả người dùng

            // === LỌC DỰA TRÊN showSuspendedUsers ===
            if (!showSuspendedUsers) {
                // Chỉ hiển thị các tài khoản KHÔNG bị suspended (hoặc chưa có trường isSuspended)
                result = result.filter(user => user.isSuspended === false || user.isSuspended === undefined);
            }

            if (selectedRole) {
                if (selectedRole === 'customer') {
                    result = result.filter(user => !user.role || user.role === '' || user.role === null || user.role === 'customer');
                } else if (selectedRole === 'admin') {
                    result = result.filter(user => user.role === 'restaurantOwner');
                } else {
                    result = result.filter(user => user.role === selectedRole);
                }
            }

            if (internalSearchTerm.trim()) {
                const normalizedSearchTerm = removeDiacritics(internalSearchTerm.toLowerCase().trim());
                result = result.filter(user => {
                    const normalizedName = removeDiacritics(user.name?.toLowerCase() || '');
                    const normalizedEmail = removeDiacritics(user.email?.toLowerCase() || '');
                    const normalizedPhone = removeDiacritics(user.phoneNumber?.toLowerCase() || '');
                    const normalizedAddress = removeDiacritics(user.address?.toLowerCase() || '');
                    return normalizedName.includes(normalizedSearchTerm) ||
                        normalizedEmail.includes(normalizedSearchTerm) ||
                        normalizedPhone.includes(normalizedSearchTerm) ||
                        normalizedAddress.includes(normalizedSearchTerm);
                });
            }

            result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            setFilteredUsers(result);
            console.log(`AccountManagement: Filtered users (Role: ${selectedRole || 'All'}, Search: ${internalSearchTerm}, Show Suspended: ${showSuspendedUsers})`, result);

            setCurrentPage(1); // Reset to first page on filter/search change
        } else {
            setFilteredUsers([]); // Clear filtered users if still loading
        }
    }, [users, internalSearchTerm, loading, selectedRole, showSuspendedUsers]); // Thêm showSuspendedUsers vào dependency array

    // Update search term and debounce it
    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        debouncedSearch(newSearchTerm);
    };

    // Handle role filter change
    const handleRoleChange = (event) => {
        setSelectedRole(event.target.value);
    };

    // === HANDLE TOGGLE SHOW SUSPENDED USERS ===
    const handleToggleShowSuspended = (event) => {
        setShowSuspendedUsers(event.target.checked);
    };

    /**
     * Handles adding a new user account to Firebase Authentication and Firestore.
     * @param {Object} newAccountData Data for the new account including email and password.
     */
    const handleAddAccount = async (newAccountData) => {
        setAddError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                newAccountData.email,
                newAccountData.password
            );
            const userAuth = userCredential.user;

            const usersCollectionRef = collection(db, USERS_COLLECTION_NAME);
            const userDocRef = doc(usersCollectionRef, userAuth.uid);

            const firestoreData = {
                name: newAccountData.name,
                email: newAccountData.email,
                phoneNumber: newAccountData.phone,
                address: newAccountData.address,
                isSuspended: newAccountData.isSuspended || false, // Đảm bảo luôn có isSuspended
                role: newAccountData.role === 'admin' ? 'restaurantOwner' : newAccountData.role,
                createdAt: serverTimestamp(),
            };

            await setDoc(userDocRef, firestoreData);

            console.log("AccountManagement: User created in Auth and document added successfully with UID:", userAuth.uid);
            toast.success('Add new user account successfully!');
            handleCloseAddModal();
        } catch (error) {
            console.error("AccountManagement: Error adding user: ", error);
            let errorMessage = "Error adding user account. Please try again.";

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email address is already in use by another account.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password must be at least 6 characters.';
                    break;
                default:
                    errorMessage = `Error: ${error.message}`;
            }
            setAddError(errorMessage);
            toast.error(errorMessage);
        }
    };


    /**
     * Handles updating an existing user account in Firestore.
     * @param {string} userId The ID of the user to update.
     * @param {Object} updatedData The updated data for the user.
     */
    const handleUpdateAccount = async (userId, updatedData) => {
        setUpdateError(null);
        const userDocRef = doc(db, USERS_COLLECTION_NAME, userId);
        try {
            await updateDoc(userDocRef, updatedData);
            console.log("AccountManagement: User document updated with ID: ", userId);
            toast.success('Updated user account successfully!');
            handleCloseEditModal();
        } catch (error) {
            console.error("AccountManagement: Error updating user document: ", error);
            setUpdateError("Error updating user account. Please try again.");
            toast.error("Error updating user account. Please try again.");
            handleCloseEditModal();
        }
    };

    /**
     * Confirms and performs a "soft delete" (block) for any user role.
     * It sets 'isSuspended' to true for the selected user's document in Firestore.
     * @param {Object} userToDelete The user object to be acted upon.
     */
    const confirmSoftDelete = async () => {
        if (!userToDelete) return;

        setError(null);
        const userDocRef = doc(db, USERS_COLLECTION_NAME, userToDelete.id);
        try {
            await updateDoc(userDocRef, { isSuspended: true });
            console.log(`User account suspended: ${userToDelete.id}`);
            toast.success(`User "${userToDelete.name || userToDelete.email}" blocked successfully!`);

            handleCloseConfirmDeleteModal();
        } catch (error) {
            console.error("AccountManagement: Error suspending user: ", error);
            setError("Error processing user account. Please try again.");
            toast.error("Error processing user account. Please try again.");
            handleCloseConfirmDeleteModal();
        }
    };

    // === HÀM MỚI: RESTORE ACCOUNT ===
    const handleRestoreAccount = async (user) => {
        setError(null);
        const userDocRef = doc(db, USERS_COLLECTION_NAME, user.id);
        try {
            await updateDoc(userDocRef, { isSuspended: false });
            console.log(`User account restored: ${user.id}`);
            toast.success(`User "${user.name || user.email}" restored successfully!`);
        } catch (error) {
            console.error("AccountManagement: Error restoring user: ", error);
            setError("Error restoring user account. Please try again.");
            toast.error("Error restoring user account. Please try again.");
        }
    };


    // Handlers for opening/closing modals
    const handleOpenConfirmDeleteModal = (user) => {
        setUserToDelete(user);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleCloseConfirmDeleteModal = () => {
        setIsConfirmDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleOpenAddModal = () => {
        setAddError(null);
        setIsAddModalOpen(true);
    };

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
        setAddError(null);
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setUpdateError(null);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
        setUpdateError(null);
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);


    return (
        <div className="account-management-container">
            <h1>Account Management</h1>

            {loading && <p className="loading-message">Is loading user accounts...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {!loading && (
                <>
                    <div className='actions-bar'>
                        <input
                            type='text'
                            placeholder='Search by name, email, phone, or address...'
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className='search-input'
                            disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                        />

                        <select
                            value={selectedRole}
                            onChange={handleRoleChange}
                            className="filter-select"
                            disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                        >
                            <option value="">All roles</option>
                            <option value="customer">Customer</option>
                            <option value="shipper">Shipper</option>
                            <option value="admin">Restaurant Owner</option>
                        </select>

                        {/* === THÊM TOGGLE HIỂN THỊ NGƯỜI DÙNG BỊ KHÓA === */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showSuspendedUsers}
                                    onChange={handleToggleShowSuspended}
                                    name="showSuspended"
                                    color="primary"
                                    disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                                />
                            }
                            label="Show blocked users"
                            className="show-suspended-toggle" // Thêm class để dễ style
                        />

                        {/* Add New Account Button */}
                        {!isEditModalOpen && !isAddModalOpen && !isConfirmDeleteModalOpen && (
                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="action-button add-button"
                            >
                                Add new account
                            </button>
                        )}
                    </div>

                    {/* Users Table */}
                    <div style={{ overflowX: 'auto' }} className='table-container'>
                        <table className="account-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th>Role</th>
                                    <th>Status</th> {/* Thêm cột trạng thái */}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUsers.length > 0 ? (
                                    currentUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.name || 'N/A'}</td>
                                            <td>{user.email || 'N/A'}</td>
                                            <td>{user.phoneNumber || 'N/A'}</td>
                                            <td>{user.address || 'N/A'}</td>
                                            <td>
                                                <span className={`role-badge ${user.role || 'customer'}`}>
                                                    {user.role === 'restaurantOwner' ? 'Restaurant Owner' : (user.role === 'customer' ? 'Customer' : (user.role === 'shipper' ? 'Shipper' : 'Unknown'))}
                                                </span>
                                            </td>
                                            {/* === THÊM CỘT TRẠNG THÁI === */}
                                            <td>
                                                {user.isSuspended ? (
                                                    <span className="status-badge suspended">Blocked</span>
                                                ) : (
                                                    <span className="status-badge active">Active</span>
                                                )}
                                            </td>
                                            {/* === ĐIỀU CHỈNH NÚT HÀNH ĐỘNG === */}
                                            <td className="col-actions">
                                                <button type='button'
                                                    className="action-button edit-button"
                                                    onClick={() => handleEditClick(user)}
                                                    disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                                                >
                                                    Edit
                                                </button>
                                                {user.isSuspended ? ( // Nếu user bị suspended
                                                    <button
                                                        type='button'
                                                        className="action-button restore-button" // Class mới cho nút Restore
                                                        onClick={() => handleRestoreAccount(user)}
                                                        disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                                                    >
                                                        Restore
                                                    </button>
                                                ) : ( // Nếu user không bị suspended
                                                    <button
                                                        type='button'
                                                        className="action-button block-button" // Đổi tên class từ delete-button
                                                        disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen}
                                                        onClick={() => handleOpenConfirmDeleteModal(user)}
                                                    >
                                                        Block
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}> {/* Cập nhật colspan */}
                                            {searchTerm || selectedRole || !showSuspendedUsers ? 'No matching accounts found.' : 'No user accounts found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredUsers.length > 0 && (
                        <div className="pagination">
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={(event, value) => {
                                    setCurrentPage(value);
                                }}
                                color="primary"
                                shape="rounded"
                            />
                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                <InputLabel id="items-per-page-label">Items per page</InputLabel>
                                <Select
                                    labelId="items-per-page-label"
                                    id="itemsPerPage"
                                    value={itemsPerPage}
                                    label="Items per page"
                                    onChange={(e) => {
                                        setItemsPerPage(Number.parseInt(e.target.value, 10));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <MenuItem value={5}>5</MenuItem>
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={20}>20</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {isAddModalOpen && (
                <AddAccountModal
                    isOpen={isAddModalOpen}
                    onClose={handleCloseAddModal}
                    onSave={handleAddAccount}
                    addError={addError}
                />
            )}

            {isEditModalOpen && editingUser && (
                <EditAccountModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    user={editingUser}
                    onSave={handleUpdateAccount}
                    updateError={updateError}
                />
            )}

            {isConfirmDeleteModalOpen && userToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={handleCloseConfirmDeleteModal}
                    onConfirm={confirmSoftDelete}
                    title={`Confirm account block`}
                    message={`Are you sure you want to block account "${userToDelete.name || userToDelete.email}"? This will suspend their access to all application features.`}
                    confirmText="Block account"
                    cancelText="Cancel"
                />
            )}
        </div>
    );
}

export default AccountManagement;