/* eslint-disable no-irregular-whitespace */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Import Firebase Firestore functions
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Adjust the import path to your firebaseConfig.js

// --- Modal Components ---
const VoucherFormModal = ({ open, onClose, onSave, voucherData }) => {
  const isEditing = !!voucherData;
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage', // Default
    discountValue: '',
    startDate: '',
    expiryDate: '',
    minOrderValue: '',
    usageLimit: '',
    usedCount: 0,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isEditing && voucherData) {
      setFormData({
        ...voucherData,
        // Format Date objects to 'YYYY-MM-DD' string for input type='date'
        startDate: voucherData.startDate instanceof Date && !Number.isNaN(voucherData.startDate)
          ? voucherData.startDate.toISOString().split('T')[0]
          : (typeof voucherData.startDate === 'string' ? voucherData.startDate.split('T')[0] : ''),
        expiryDate: voucherData.expiryDate instanceof Date && !Number.isNaN(voucherData.expiryDate)
          ? voucherData.expiryDate.toISOString().split('T')[0]
          : (typeof voucherData.expiryDate === 'string' ? voucherData.expiryDate.split('T')[0] : ''),
        discountValue: voucherData.discountValue,
        minOrderValue: voucherData.minOrderValue || '',
        usageLimit: voucherData.usageLimit || '',
        usedCount: voucherData.usedCount || 0,
        isActive: voucherData.isActive !== undefined ? voucherData.isActive : true, // Ensure isActive is boolean
      });
    } else {
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        startDate: '',
        expiryDate: '',
        minOrderValue: '',
        usageLimit: '',
        usedCount: 0,
        isActive: true,
      });
    }
    setErrors({});
    setSaveError(null);
    setIsSaving(false);
  }, [isEditing, voucherData, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // --- Xử lý đặc biệt khi thay đổi discountType ---
      if (name === 'discountType') {
        // Nếu chuyển sang loại không cần giá trị (ví dụ: free_shipping)
        if (value === 'free_shipping') {
          newState.discountValue = '0'; // Hoặc có thể để trống '', tùy cách bạn muốn lưu
        } else if (prev.discountType === 'free_shipping' && newState.discountValue === '0') {
          // Nếu chuyển từ loại không cần giá trị sang loại cần giá trị, đặt lại giá trị trống
          newState.discountValue = '';
        }
      }
      // --- Kết thúc xử lý đặc biệt ---

      return newState;
    });
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or positive integers/decimals depending on field
    // For discountValue, minOrderValue, usageLimit: allow empty or positive number (integer for usageLimit)
    if (value === '' || /^\d+(\.\d+)?$/.test(value)) { // Allow decimal for discountValue, minOrderValue
      if (name === 'usageLimit' && value !== '' && !/^\d+$/.test(value)) {
        // usageLimit must be integer, don't update state if not
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };


  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.code.trim()) {
      newErrors.code = 'Mã voucher không được để trống.';
      isValid = false;
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Ngày bắt đầu không được để trống.';
      isValid = false;
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Ngày hết hạn không được để trống.';
      isValid = false;
    } else {
      if (formData.startDate) {
        const start = new Date(formData.startDate);
        const expiry = new Date(formData.expiryDate);
        // Compare dates only, ignoring time
        start.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);


        if (start > expiry) {
          newErrors.expiryDate = 'Ngày hết hạn không được trước ngày bắt đầu.';
          isValid = false;
        }
      }
    }

    // --- Cập nhật validation cho discountValue dựa trên discountType ---
    if (formData.discountType !== 'free_shipping') { // Chỉ validate discountValue nếu không phải free_shipping
      const discountValue = Number(formData.discountValue);
      if (formData.discountValue === '' || Number.isNaN(discountValue) || discountValue <= 0) {
        newErrors.discountValue = 'Giá trị giảm giá phải là số dương.';
        isValid = false;
      } else {
        if (formData.discountType === 'percentage' && discountValue > 100) {
          newErrors.discountValue = 'Giá trị phần trăm không được vượt quá 100.';
          isValid = false;
        }
      }
    }
    // --- Kết thúc cập nhật validation ---


    const minOrderValue = Number(formData.minOrderValue);
    // minOrderValue can be 0 or positive
    if (formData.minOrderValue !== '' && (Number.isNaN(minOrderValue) || minOrderValue < 0)) {
      newErrors.minOrderValue = 'Giá trị đơn tối thiểu không được âm.';
      isValid = false;
    }

    const usageLimit = Number(formData.usageLimit);
    // usageLimit can be 0 for unlimited, so check for negative or non-integer if not empty
    if (formData.usageLimit !== '' && (Number.isNaN(usageLimit) || !Number.isInteger(usageLimit) || usageLimit < 0)) {
      newErrors.usageLimit = 'Lượt sử dụng tối đa phải là số nguyên không âm.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return; // Stop if validation fails
    }

    const dataToSave = {
      ...formData,
      // Chuyển đổi giá trị về số, xử lý trường hợp empty string
      discountValue: Number(formData.discountValue || 0), // Luôn lưu là số, 0 nếu trống hoặc free_shipping
      minOrderValue: Number(formData.minOrderValue || 0),
      usageLimit: Number(formData.usageLimit || 0),
      usedCount: Number(formData.usedCount || 0),
      // Chuyển đổi ngày tháng về Date object
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
    };


    // Remove id from dataToSave if it's an add operation
    if (!isEditing) {
      delete dataToSave.id;
      dataToSave.createdAt = new Date(); // Add creation timestamp for new doc
    }
    dataToSave.updatedAt = new Date(); // Add update timestamp


    setIsSaving(true);
    try {
      // Pass dataToSave including id for update, or without id for add
      await onSave(dataToSave);
      // onClose() is called in parent after successful save
    } catch (error) {
      console.error("Error during save process:", error);
      setSaveError(`Lỗi khi lưu: ${error.message || 'Lỗi không xác định'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Chỉnh Sửa Voucher' : 'Thêm Voucher Mới'}</DialogTitle>
      <DialogContent dividers>
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="code"
              label="Mã Voucher"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.code}
              onChange={handleChange}
              disabled={isEditing || isSaving} // Disable code editing for existing vouchers
              required
              error={!!errors.code}
              helperText={errors.code}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="description"
              label="Mô tả"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.description}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={6}>
              <FormControl fullWidth margin="dense" variant="outlined" error={!!errors.discountType}>
                <InputLabel>Loại giảm giá</InputLabel>
                <Select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    label="Loại giảm giá"
                    disabled={isSaving}
                >
                    <MenuItem value="percentage">Phần trăm</MenuItem>
                    <MenuItem value="fixed">Số tiền cố định</MenuItem>
                    {/* --- THÊM LOẠI VOUCHER MỚI TẠI ĐÂY --- */}
                    <MenuItem value="free_shipping">Miễn phí vận chuyển</MenuItem>
                    {/* ------------------------------------ */}
                </Select>
                 {errors.discountType && <Typography color="error" variant="caption" sx={{ ml: 2, mt: 0.5 }}>{errors.discountType}</Typography>}
              </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="discountValue"
              // --- Cập nhật label dựa trên discountType ---
              label={formData.discountType === 'percentage' ? 'Giá trị (%)' : (formData.discountType === 'fixed' ? 'Giá trị (VNĐ)' : 'Giá trị')}
              // ------------------------------------------
              type="number"
              fullWidth
              variant="outlined"
              value={formData.discountValue}
              onChange={handleNumberChange}
              required={formData.discountType !== 'free_shipping'} // Không bắt buộc nếu là free_shipping
              error={!!errors.discountValue}
              helperText={errors.discountValue}
              disabled={isSaving || formData.discountType === 'free_shipping'} // Disable nếu là free_shipping
              inputProps={{ min: 0, step: formData.discountType === 'percentage' ? 0.01 : 1 }} // Thêm step cho %
            />
          </Grid>
            <Grid item xs={6}>
            <TextField
              margin="dense"
              name="startDate"
              label="Ngày bắt đầu"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={formData.startDate}
              onChange={handleChange}
              required
              error={!!errors.startDate}
              helperText={errors.startDate}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="expiryDate"
              label="Ngày hết hạn"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={formData.expiryDate}
              onChange={handleChange}
              required
              error={!!errors.expiryDate}
              helperText={errors.expiryDate}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="minOrderValue"
              label="Đơn tối thiểu (VNĐ)"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.minOrderValue}
              onChange={handleNumberChange}
              error={!!errors.minOrderValue}
              helperText={errors.minOrderValue}
              disabled={isSaving}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="usageLimit"
              label="Lượt sử dụng tối đa"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.usageLimit}
              onChange={handleNumberChange}
              required={false} // usageLimit can be 0 or empty for unlimited
              error={!!errors.usageLimit}
              helperText={errors.usageLimit}
              disabled={isSaving}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          {isEditing && (
            <Grid item xs={6}>
                <TextField
                margin="dense"
                name="usedCount"
                label="Đã sử dụng"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.usedCount}
                disabled // Used count should not be editable directly
                inputProps={{ min: 0, step: 1 }}
                />
            </Grid>
          )}
          <Grid item xs={12}>
              <FormControlLabel
                control={
                <Switch
                    checked={formData.isActive}
                    onChange={handleChange}
                    name="isActive"
                    color="primary"
                    disabled={isSaving}
                />
                }
                label="Hoạt động"
              />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isSaving}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={isSaving}>
          {isEditing ? 'Lưu' : 'Thêm'}
            {isSaving && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Delete Confirmation Modal (Giữ nguyên)
const DeleteConfirmationModal = ({ open, onClose, onConfirm, itemName, itemType = 'item' }) => {
    return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Xác nhận xóa ${itemType}`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {`Bạn có chắc chắn muốn xóa ${itemType} "${itemName}" không? Hành động này không thể hoàn tác.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Hủy bỏ
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          Xóa
        </Button>
      </DialogActions>
    </Dialog>
  );
};


// --- Hàm helper để xác định trạng thái chi tiết của voucher (Giữ nguyên) ---
const getVoucherStatus = (voucher) => {
  // Handle cases where dates might be null or invalid
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startDate = voucher.startDate instanceof Date && !Number.isNaN(voucher.startDate) ? new Date(voucher.startDate) : null;
  const expiryDate = voucher.expiryDate instanceof Date && !Number.isNaN(voucher.expiryDate) ? new Date(voucher.expiryDate) : null;

  // Set hours to 0 for date comparison only
  if(startDate) startDate.setHours(0, 0, 0, 0);
  if(expiryDate) expiryDate.setHours(0, 0, 0, 0);


  // If voucher is explicitly inactive
  if (!voucher.isActive) {
    return { text: 'Ngưng hoạt động', color: 'grey' };
  }

  // If start date is in the future
  if (startDate && now < startDate) {
    return { text: 'Sắp có hiệu lực', color: 'orange' };
  }

  // If expiry date is in the past
  if (expiryDate && now > expiryDate) {
    return { text: 'Hết hạn', color: 'red' };
  }

  // If currently active (within date range), check usage limit
  const usageLimit = Number(voucher.usageLimit || 0);
  const usedCount = Number(voucher.usedCount || 0);

  // If there's a usage limit ( > 0) and it's reached or exceeded
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { text: 'Đã dùng hết lượt', color: 'red' };
  }

  // If within date range and usage limit is not reached or is unlimited (usageLimit === 0)
  if (startDate && expiryDate && now >= startDate && now <= expiryDate) {
    return { text: 'Đang hoạt động', color: 'green' };
  }

  // Fallback for any unhandled state (e.g., invalid dates)
  return { text: 'Không xác định', color: 'default' };
};


// --- Main Voucher Management Page Component ---

function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // --- State for Filtering and Searching ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'upcoming', 'expired', 'used_up', 'inactive_switch'

  useEffect(() => {
    const vouchersCollectionRef = collection(db, 'vouchers');

    // onSnapshot lắng nghe thay đổi theo thời gian thực
    const unsubscribe = onSnapshot(vouchersCollectionRef, (snapshot) => {
      console.log("Snapshot received");
      const vouchersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to JavaScript Date objects, handle null/undefined
          startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || null),
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : (data.expiryDate || null),
          // Ensure numeric fields are treated as numbers, default to 0 if null/undefined
          discountValue: Number(data.discountValue || 0),
          minOrderValue: Number(data.minOrderValue || 0),
          usageLimit: Number(data.usageLimit || 0),
          usedCount: Number(data.usedCount || 0),
          isActive: data.isActive !== undefined ? data.isActive : true, // Default to true if not set
        };
      });
      setVouchers(vouchersData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching vouchers:", err);
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);


  const handleOpenAddModal = () => {
    setSelectedVoucher(null);
    setOpenAddModal(true);
  };

  const handleOpenEditModal = (voucher) => {
    setSelectedVoucher(voucher);
    setOpenEditModal(true);
  };

  const handleOpenDeleteConfirm = (voucher) => {
    setSelectedVoucher(voucher);
    setOpenDeleteConfirm(true);
  };

  const handleCloseModals = () => {
    setOpenAddModal(false);
    setOpenEditModal(false);
    setOpenDeleteConfirm(false);
    setSelectedVoucher(null);
  };

  const handleSaveVoucher = async (voucherData) => {
    try {
      // voucherData đã có định dạng đúng nhờ xử lý trong Modal component
      if (voucherData.id) {
        const voucherRef = doc(db, 'vouchers', voucherData.id);
        const { id, ...dataToUpdate } = voucherData;
        // Firestore Timestamp được lưu tự động khi dùng Date object
        await updateDoc(voucherRef, dataToUpdate); // updatedAt đã được thêm trong modal
        console.log("Voucher updated successfully:", voucherData.id);
      } else {
        // usedCount và timestamps đã được thêm trong modal cho document mới
        await addDoc(collection(db, 'vouchers'), voucherData);
        console.log("Voucher added successfully");
      }
      setError(null); // Clear any previous error
      handleCloseModals(); // Close modal on successful save
    } catch (err) {
      console.error("Error saving voucher:", err);
      throw err; // Rethrow error to be caught by the modal's try/catch
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher || !selectedVoucher.id) return;

    // setLoading(true); // Optional: show loading while deleting - snapshot listener handles updating state
    try {
      const voucherRef = doc(db, 'vouchers', selectedVoucher.id);
      await deleteDoc(voucherRef);
      console.log("Voucher deleted successfully:", selectedVoucher.id);
      setError(null); // Clear any previous error
      handleCloseModals();
    } catch (err) {
      console.error("Error deleting voucher:", err);
      setError(`Lỗi khi xóa voucher: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      // setLoading(false);
    }
  };

  // --- Filtering and Searching Logic (Giữ nguyên) ---
  const filteredVouchers = useMemo(() => {
    let filtered = vouchers;

    // Apply Search Term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(voucher =>
        voucher.code.toLowerCase().includes(lowerCaseSearchTerm) ||
        (voucher.description?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // Apply Status Filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(voucher => {
        const status = getVoucherStatus(voucher).text;
        switch (filterStatus) {
          case 'active':
            return status === 'Đang hoạt động';
          case 'upcoming':
            return status === 'Sắp có hiệu lực';
          case 'expired':
            return status === 'Hết hạn';
          case 'used_up':
            return status === 'Đã dùng hết lượt';
          case 'inactive_switch':
            return status === 'Ngưng hoạt động';
          default:
            return true; // Should not happen
        }
      });
    }

    return filtered;
  }, [vouchers, searchTerm, filterStatus]);

  // Show initial loading spinner only if no data is loaded and there's no error
  if (loading && vouchers.length === 0 && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Quản Lý Voucher
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleOpenAddModal}
          disabled={loading}
        >
          Thêm Voucher Mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Filtering and Searching Controls (Giữ nguyên) */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            variant="outlined"
            label="Tìm kiếm Mã hoặc Mô tả"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon color="action" sx={{ mr: 1 }} />
              ),
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Trạng thái</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Trạng thái"
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="active">Đang hoạt động</MenuItem>
              <MenuItem value="upcoming">Sắp có hiệu lực</MenuItem>
              <MenuItem value="expired">Hết hạn</MenuItem>
              <MenuItem value="used_up">Đã dùng hết lượt</MenuItem>
              <MenuItem value="inactive_switch">Ngưng hoạt động</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>


      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
          <Table stickyHeader aria-label="sticky table voucher">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }}>Mã Voucher</TableCell>
                <TableCell sx={{
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 150,
                    maxWidth: 250
                }}>Mô tả</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">Giá trị</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Loại</TableCell> {/* Tăng minWidth cho cột Loại */}
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Ngày bắt đầu</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Ngày hết hạn</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 120, maxWidth: 150 }}>Đơn tối thiểu</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80, maxWidth: 100 }} align="center">Sử dụng</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 130 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 100 }} align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={voucher.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }}>{voucher.code}</TableCell>
                    <TableCell sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 150,
                        maxWidth: 250
                    }}>{voucher.description}</TableCell>
                    {/* --- Cập nhật hiển thị cột Giá trị --- */}
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">
                      {voucher.discountType === 'percentage' ? `${voucher.discountValue}%`
                      : (voucher.discountType === 'fixed' ? `${Number(voucher.discountValue).toLocaleString('vi-VN')} VNĐ`
                      : (voucher.discountType === 'free_shipping' ? 'Miễn phí' : 'N/A')) // Hiển thị 'Miễn phí' cho loại mới
                      }
                    </TableCell>
                    {/* ----------------------------------- */}
                    {/* --- Cập nhật hiển thị cột Loại --- */}
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>
                      {voucher.discountType === 'percentage' ? 'Phần trăm'
                      : (voucher.discountType === 'fixed' ? 'Số tiền cố định'
                      : (voucher.discountType === 'free_shipping' ? 'Miễn phí vận chuyển' : voucher.discountType)) // Hiển thị tên loại mới
                      }
                    </TableCell>
                    {/* --------------------------------- */}
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>{voucher.startDate instanceof Date && !Number.isNaN(voucher.startDate.getTime()) ? voucher.startDate.toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>{voucher.expiryDate instanceof Date && !Number.isNaN(voucher.expiryDate.getTime()) ? voucher.expiryDate.toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 120, maxWidth: 150 }}>{(Number(voucher.minOrderValue)) > 0 ? `${Number(voucher.minOrderValue).toLocaleString('vi-VN')} VNĐ` : 'Không yêu cầu'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80, maxWidth: 100 }} align="center">
                        {`${Number(voucher.usedCount)} / ${Number(voucher.usageLimit || 0) === 0 ? '∞' : Number(voucher.usageLimit)}`}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 130 }} align="center">
                        <Typography variant="body2" sx={{ color: getVoucherStatus(voucher).color, fontWeight: 'bold' }}>
                            {getVoucherStatus(voucher).text}
                        </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100 }} align="center">
                      <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(voucher)} disabled={loading}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleOpenDeleteConfirm(voucher)} disabled={loading}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !loading && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      {vouchers.length === 0 && (searchTerm === '' && filterStatus === 'all') ? 'Không có voucher nào.' : 'Không tìm thấy voucher nào phù hợp.'}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal components (Giữ nguyên) */}
      <VoucherFormModal
        open={openAddModal}
        onClose={handleCloseModals}
        onSave={handleSaveVoucher}
        voucherData={null}
      />

      {selectedVoucher && (
        <VoucherFormModal
          open={openEditModal}
          onClose={handleCloseModals}
          onSave={handleSaveVoucher}
          voucherData={selectedVoucher}
        />
      )}

      {selectedVoucher && (
        <DeleteConfirmationModal
          open={openDeleteConfirm}
          onClose={handleCloseModals}
          onConfirm={handleDeleteVoucher}
          itemName={selectedVoucher.code}
          itemType="voucher"
        />
      )}

    </Box>
  );
}

export default VoucherManagementPage;