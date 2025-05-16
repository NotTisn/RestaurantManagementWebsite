/* eslint-disable no-irregular-whitespace */
import React, { useState, useEffect } from 'react';
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

// Import Firebase Firestore functions
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Adjust the import path to your firebaseConfig.js

// --- Modal Components (Giữ nguyên) ---
const VoucherFormModal = ({ open, onClose, onSave, voucherData }) => {
  const isEditing = !!voucherData;
  const [formData, setFormData] = useState({
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
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isEditing && voucherData) {
      setFormData({
        ...voucherData,
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or positive integers
    if (value === '' || /^\d+$/.test(value)) {
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
        start.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        if (start > expiry) {
          newErrors.startDate = 'Ngày bắt đầu không được sau ngày hết hạn.';
          isValid = false;
        }
      }
    }

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

    const minOrderValue = Number(formData.minOrderValue);
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
      // If validation fails, keep saving state as false
      return;
    }

    const dataToSave = {
      ...formData,
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue || 0), // Treat empty as 0
      usageLimit: Number(formData.usageLimit || 0),     // Treat empty as 0 (unlimited)
      usedCount: Number(formData.usedCount || 0),
      startDate: new Date(formData.startDate),
      expiryDate: new Date(formData.expiryDate),
    };


    if (isEditing && voucherData?.id) {
        dataToSave.id = voucherData.id; // Keep ID for the update logic in parent
    }

    setIsSaving(true);
    try {
      await onSave(dataToSave);
      // onClose() is called in parent after successful save
    } catch (error) {
      console.error("Error during save process:", error);
      setSaveError(`Lỗi khi lưu: ${error.message || error}`);
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
              disabled={isEditing || isSaving} // Disable code editing
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
                </Select>
                 {errors.discountType && <Typography color="error" variant="caption" sx={{ ml: 2, mt: 0.5 }}>{errors.discountType}</Typography>}
              </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="discountValue"
              label={formData.discountType === 'percentage' ? 'Giá trị (%)' : 'Giá trị (VNĐ)'}
              inputMode="numeric"
              fullWidth
              variant="outlined"
              value={formData.discountValue}
              onChange={handleNumberChange}
              required
              error={!!errors.discountValue}
              helperText={errors.discountValue}
              disabled={isSaving}
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
              inputMode="numeric"
              pattern="[0-9]*"
              fullWidth
              variant="outlined"
              value={formData.minOrderValue}
              onChange={handleNumberChange}
              error={!!errors.minOrderValue}
              helperText={errors.minOrderValue}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="usageLimit"
              label="Lượt sử dụng tối đa"
              inputMode="numeric"
              pattern="[0-9]*"
              fullWidth
              variant="outlined"
              value={formData.usageLimit}
              onChange={handleNumberChange}
              required // Keeping required as in original code, but validate allows 0 or empty
              error={!!errors.usageLimit}
              helperText={errors.usageLimit}
              disabled={isSaving}
            />
          </Grid>
          {isEditing && (
            <Grid item xs={6}>
                <TextField
                margin="dense"
                name="usedCount"
                label="Đã sử dụng"
                inputMode="numeric"
                pattern="[0-9]*"
                fullWidth
                variant="outlined"
                value={formData.usedCount}
                disabled // Used count should not be editable directly
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


// --- Hàm helper để xác định trạng thái chi tiết của voucher ---
const getVoucherStatus = (voucher) => {
  // Nếu voucher không active
  if (!voucher.isActive) {
    return { text: 'Ngưng hoạt động', color: 'grey' };
  }

  const now = new Date();
  // Đặt giờ về 0 để so sánh chỉ theo ngày
  now.setHours(0, 0, 0, 0);

  // Chuyển đổi Timestamp/string sang Date object nếu cần và bỏ qua giờ phút giây
  const startDate = voucher.startDate instanceof Date && !Number.isNaN(voucher.startDate) ? new Date(voucher.startDate) : new Date(voucher.startDate);
  const expiryDate = voucher.expiryDate instanceof Date && !Number.isNaN(voucher.expiryDate) ? new Date(voucher.expiryDate) : new Date(voucher.expiryDate);

  // Đặt giờ về 0 để so sánh chỉ theo ngày
  startDate.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);


  // Nếu ngày hiện tại trước ngày bắt đầu
  if (now < startDate) {
    return { text: 'Sắp có hiệu lực', color: 'orange' };
  }

  // Nếu ngày hiện tại sau ngày hết hạn
  if (now > expiryDate) {
    return { text: 'Hết hạn', color: 'red' };
  }

  // Nếu đang trong thời gian hiệu lực, kiểm tra lượt sử dụng
  const usageLimit = Number(voucher.usageLimit || 0);
  const usedCount = Number(voucher.usedCount || 0);

  // Nếu có giới hạn sử dụng (usageLimit > 0) và đã dùng hết
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { text: 'Đã dùng hết lượt', color: 'red' };
  }

  // Nếu đang trong thời gian hiệu lực và còn lượt sử dụng (hoặc không giới hạn)
  return { text: 'Đang hoạt động', color: 'green' };
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

  useEffect(() => {
    const vouchersCollectionRef = collection(db, 'vouchers');

    const unsubscribe = onSnapshot(vouchersCollectionRef, (snapshot) => {
      console.log("Snapshot received");
      const vouchersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to JavaScript Date objects
          startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || null),
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : (data.expiryDate || null),
          // Ensure numeric fields are treated as numbers
          discountValue: Number(data.discountValue || 0),
          minOrderValue: Number(data.minOrderValue || 0),
          usageLimit: Number(data.usageLimit || 0),
          usedCount: Number(data.usedCount || 0),
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

    return () => unsubscribe();
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
      // Data received here is already in the desired format (numbers, Date objects)
      if (voucherData.id) {
        const voucherRef = doc(db, 'vouchers', voucherData.id);
        const { id, ...dataToUpdate } = voucherData;
        // Firestore Timestamp is saved automatically when using Date objects
        await updateDoc(voucherRef, { ...dataToUpdate, updatedAt: new Date() });
        console.log("Voucher updated successfully:", voucherData.id);
      } else {
        await addDoc(collection(db, 'vouchers'), {
            ...voucherData,
            usedCount: 0, // Ensure usedCount is 0 for new vouchers
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log("Voucher added successfully");
      }
      setError(null);
      handleCloseModals(); // Close modal on successful save
    } catch (err) {
      console.error("Error saving voucher:", err);
      throw err; // Rethrow error to be caught by the modal's try/catch
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher || !selectedVoucher.id) return;

    setLoading(true); // Optional: show loading while deleting
    try {
      const voucherRef = doc(db, 'vouchers', selectedVoucher.id);
      await deleteDoc(voucherRef);
      console.log("Voucher deleted successfully:", selectedVoucher.id);
      setError(null);
      handleCloseModals();
    } catch (err) {
      console.error("Error deleting voucher:", err);
      setError(`Lỗi khi xóa voucher: ${err.message}`);
      // Decide whether to hide loading on error or keep it until new snapshot arrives
      setLoading(false);
    }
  };

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
          disabled={loading} // Disable button while initial loading
        >
          Thêm Voucher Mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {/* Thêm overflowX: 'auto' vào TableContainer */}
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)', overflowX: 'auto' }}>
          <Table stickyHeader aria-label="sticky table voucher">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }}>Mã Voucher</TableCell>
                <TableCell sx={{
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 150,
                    maxWidth: 250 // Tăng nhẹ maxWidth để có không gian xuống dòng
                }}>Mô tả</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">Giá trị</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 80 }}>Loại</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Ngày bắt đầu</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Ngày hết hạn</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 120, maxWidth: 150 }}>Đơn tối thiểu</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80, maxWidth: 100 }} align="center">Sử dụng</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 130 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 100 }} align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.length > 0 ? (
                vouchers.map((voucher) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={voucher.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }}>{voucher.code}</TableCell>
                    <TableCell sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 150,
                        maxWidth: 250 // Tăng nhẹ maxWidth để có không gian xuống dòng
                    }}>{voucher.description}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">
                      {voucher.discountType === 'percentage' ? `${voucher.discountValue}%` : `${Number(voucher.discountValue).toLocaleString('vi-VN')} VNĐ`}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 80 }}>{voucher.discountType === 'percentage' ? 'Phần trăm' : 'Số tiền cố định'}</TableCell>
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
                      Không có voucher nào.
                    </TableCell>
                  </TableRow>
                )
              )}
                {/* Show loading row if data is being fetched or processed *after* initial load */}
                {loading && vouchers.length > 0 && (
                    <TableRow>
                        <TableCell colSpan={10} align="center">
                            <CircularProgress size={24} sx={{ my: 2 }} />
                        </TableCell>
                    </TableRow>
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