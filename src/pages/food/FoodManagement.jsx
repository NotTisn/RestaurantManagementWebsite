import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from '../../firebaseConfig'; 
import './FoodManagement.css'; 
import EditDishModal from './EditDishModal';
import AddDishModal from './AddDishModal';
import ImagePreviewModal from './ImagePreviewModal';
import ConfirmationModal from './ConfirmationModal'; 
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { Pagination, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const DISHES_COLLECTION_NAME = 'food';
const CATEGORIES_COLLECTION_NAME = 'categories';

function removeDiacritics(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function FoodManagement() {
    const [dishes, setDishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); 

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addError, setAddError] = useState(null); 

    const [categories, setCategories] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categoryError, setCategoryError] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDish, setEditingDish] = useState(null); 
    const [updateError, setUpdateError] = useState(null); 

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [selectedImageAlt, setSelectedImageAlt] = useState('');

    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [dishToDelete, setDishToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredDishes, setFilteredDishes] = useState([]);
    const [internalSearchTerm, setInternalSearchTerm] = useState(''); 
    const [selectedCategory, setSelectedCategory] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5); 

    useEffect(() => {
        setLoading(true);
        setError(null);
        const q = query(
            collection(db, DISHES_COLLECTION_NAME),
            where("isDeleted", "==", false) 
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const dishesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            dishesData.sort((a, b) => a.name.localeCompare(b.name));
            setDishes(dishesData);
            setLoading(false);
            console.log("FoodManagement: Realtime dishes update:", dishesData);
        }, (err) => {
            console.error("FoodManagement: Error listening to dishes collection: ", err);
            setError("Can't load dishes. Please try again later.");
            setLoading(false);
        });

        return () => {
            unsubscribe();
            console.log("FoodManagement: Unsubscribed from dishes listener");
        };
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            setCategoryLoading(true);
            setCategoryError(null);
            try {
                const categoriesCollectionRef = collection(db, CATEGORIES_COLLECTION_NAME);
                const querySnapshot = await getDocs(categoriesCollectionRef);
                const categoriesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                categoriesData.sort((a, b) => a.name.localeCompare(b.name));
                setCategories(categoriesData);
                console.log("FoodManagement: Fetched categories:", categoriesData);
            } catch (err) {
                console.error("FoodManagement: Error fetching categories: ", err);
                setCategoryError("Can't load categories. Please try again later.");
            } finally {
                setCategoryLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const debouncedSearch = useCallback(
        debounce((term) => {
            setInternalSearchTerm(term);
        }, 300),
        []
    );

    useEffect(() => {
        if (!loading) {
            let result = dishes; 

            if (selectedCategory) { 
                const selectedCatName = categories.find(c => c.id === selectedCategory)?.name;
                if (selectedCatName) {
                    result = result.filter(dish => dish.categoryName === selectedCatName);
                }
            }

            if (internalSearchTerm.trim()) {
                const normalizedSearchTerm = removeDiacritics(internalSearchTerm.toLowerCase().trim());
                result = result.filter(dish => {
                    const normalizedName = removeDiacritics(dish.name?.toLowerCase() || '');
                    return normalizedName.includes(normalizedSearchTerm);
                });
            }

            result.sort((a, b) => a.name.localeCompare(b.name));

            setFilteredDishes(result); 
            console.log(`FoodManagement: Filtered dishes (Category: ${selectedCategory || 'All'}, Search: ${internalSearchTerm})`, result);

            setCurrentPage(1);
        } else {
            setFilteredDishes([]); 
        }
    }, [dishes, internalSearchTerm, loading, selectedCategory, categories]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDishes = filteredDishes.slice(indexOfFirstItem, indexOfLastItem);

    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        debouncedSearch(newSearchTerm);
    }

    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value); 
    };

    const handleAddDish = async (newDishData) => {
        setAddError(null); 
        try {
            const dishesCollectionRef = collection(db, DISHES_COLLECTION_NAME);
            await addDoc(dishesCollectionRef, {
                ...newDishData,
                isDeleted: false
            });
            console.log("FoodManagement: Document added successfully!")
            toast.success('Added new dish successfully!');
            handleCloseAddModal(); 
        } catch (error) {
            console.error("FoodManagement: Error adding document: ", error);
            setAddError("Error adding dish. Please try again."); 
            const errorMsg = "Error adding dish. Please try again.";
            toast.error(errorMsg);
        }
    };

    const handleUpdateDish = async (dishId, updatedData) => {
        setUpdateError(null); 
        const dishDocRef = doc(db, DISHES_COLLECTION_NAME, dishId)
        try {
            await updateDoc(dishDocRef, updatedData);
            console.log("FoodManagement: Document updated with ID: ", dishId)
            toast.success('Updated dish successfully!');
            handleCloseEditModal(); 
        }
        catch(error){
            console.error("FoodManagement: Error updating document: ", error);
            setUpdateError("Error updating dish. Please try again."); 
            const errorMsg = "Error updating dish. Please try again.";
            toast.error(errorMsg);
        }
    };

    const confirmSoftDelete = async () => {
        if (!dishToDelete) return;

        setError(null); 
        const dishDocRef = doc(db, DISHES_COLLECTION_NAME, dishToDelete.id);
        try {
            await updateDoc(dishDocRef, { isDeleted: true });
            console.log(`Dish soft deleted successfully: ${dishToDelete.id}`);
            toast.success(`Deleted dish "${dishToDelete.name}" successfully!`);
            handleCloseConfirmDeleteModal(); 
        }
        catch(error){
            console.error("Error soft deleting dish: ", error);
            setError("Error deleting dish. Please try again."); 
            toast.error("Error deleting dish. Please try again.");
            handleCloseConfirmDeleteModal(); 
        }
    };

    const handleOpenConfirmDeleteModal = (dish) => {
        setDishToDelete(dish);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleCloseConfirmDeleteModal = () => {
        setIsConfirmDeleteModalOpen(false);
        setDishToDelete(null);
    };


    const handleOpenAddModal = () => {
        setAddError(null); 
        setIsAddModalOpen(true); 
    }

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false); 
        setAddError(null); 
    }

    const handleEditClick = (dish) => {
        setEditingDish(dish); 
        setUpdateError(null); 
        setIsEditModalOpen(true); 
    }
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false); 
        setEditingDish(null); 
        setUpdateError(null); 
    };

    const handleImageClick = (imageUrl, altText) => {
        setSelectedImageUrl(imageUrl);
        setSelectedImageAlt(altText || 'Dish image'); 
        setIsImageModalOpen(true);
    };

    const handleCloseImageModal = () => {
        setIsImageModalOpen(false);
    };

    const totalPages = Math.ceil(filteredDishes.length / itemsPerPage);

    return (
        <div>
            <h1>Dishes Management</h1>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {categoryError && <p style={{ color: 'red' }}>Error: {categoryError}</p>}

            {!loading && !categoryLoading && (
                <>
                    <div className='actions-bar'>
                        <input
                            type='text'
                            placeholder='Search dishes by name...'
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className='search-input'
                            disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen || isImageModalOpen}
                        />

                        <select
                            value={selectedCategory}
                            onChange={handleCategoryChange} 
                            className="filter-select" 
                            disabled={isAddModalOpen || isEditModalOpen || categoryLoading || isConfirmDeleteModalOpen || isImageModalOpen}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        {!isEditModalOpen && !isAddModalOpen && !isConfirmDeleteModalOpen && !isImageModalOpen && (
                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="action-button add-button" 
                            >
                                Add New Dish
                            </button>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto' }} className='table-container'>
                        <table className="food-table">
                            <thead>
                                <tr>
                                    <th>Dish Name</th>
                                    <th>Price ($)</th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Image</th>
                                    <th className="col-star">Star</th>
                                    <th>Time</th>
                                    <th>Popular</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentDishes.length > 0 ? (
                                    currentDishes.map((dish) => (
                                        <tr key={dish.id}>
                                            <td>{dish.name}</td>
                                            <td>{dish.price?.toLocaleString('vi-VN')}</td>
                                            <td>{dish.description}</td>
                                            <td>{dish.categoryName}</td>
                                            <td>
                                                {dish.imageUrl ? (
                                                <img 
                                                    src={dish.imageUrl} 
                                                    alt={dish.name} 
                                                    className="dish-image clickable"
                                                    onClick={() => handleImageClick(dish.imageUrl, dish.name)}
                                                    onError={(e) => { 
                                                        e.target.onerror = null; 
                                                        e.target.src = '/path/to/placeholder-image.jpg'; 
                                                        e.target.alt = 'Image not found';
                                                    }} 
                                                />) : (
                                                <span className="no-image-text">No image</span>
                                                )}
                                            </td>
                                            <td className="col-star">{dish.star} ⭐</td>
                                            <td>{dish.time}</td>
                                            <td style={{ textAlign: 'center' }}>
                                               <span className={`status-badge ${dish.isPopular ? 'popular' : ''}`}>
                                                    {dish.isPopular ? 'Popular' : 'Not'}
                                                </span>
                                            </td>
                                            <td className="col-actions">
                                                <button type='button'
                                                    className="action-button edit-button"
                                                    onClick={() => handleEditClick(dish)}
                                                    disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen || isImageModalOpen}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type='button'
                                                    className="action-button delete-button"
                                                    disabled={isAddModalOpen || isEditModalOpen || isConfirmDeleteModalOpen || isImageModalOpen}
                                                    onClick={() => handleOpenConfirmDeleteModal(dish)} 
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center' }}>
                                            {searchTerm ? 'No matching dishes found.' : 'No dishes found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredDishes.length > 0 && (
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
                                        setItemsPerPage(Number.parseInt(e.target.value, 10))
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

            {isAddModalOpen && (
                <AddDishModal
                    isOpen={isAddModalOpen}
                    onClose={handleCloseAddModal}
                    onSave={handleAddDish} 
                    categories={categories}
                    categoryLoading={categoryLoading}
                    categoryError={categoryError}
                    addError={addError} 
                />
            )}

            {isEditModalOpen && editingDish && (
                <EditDishModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    dish={editingDish}
                    onSave={handleUpdateDish}
                    categories={categories}
                    categoryLoading={categoryLoading}
                    categoryError={categoryError}
                    updateError={updateError}
                />
            )}

            {isImageModalOpen && (
                <ImagePreviewModal
                    isOpen={isImageModalOpen}
                    onClose={handleCloseImageModal}
                    imageUrl={selectedImageUrl}
                    altText={selectedImageAlt}
                />
            )}

            {isConfirmDeleteModalOpen && dishToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={handleCloseConfirmDeleteModal}
                    onConfirm={confirmSoftDelete}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete "${dishToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}
        </div>
    );
}

export default FoodManagement;