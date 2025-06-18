import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress, Alert,
  TextField, Chip, Grid, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Import thư viện xlsx
import * as XLSX from 'xlsx';

const VoucherFormModal = ({ open, onClose, onSave, voucherData }) => {
  const isEditing = !!voucherData;
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage', // Default to percentage
    discountValue: '',
    startDate: '',
    expiryDate: '',
    minOrderValue: '',
    usageLimit: '',
    usedCount: 0,
    isActive: true,
    isPrivate: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isEditing && voucherData) {
      setFormData({
        code: voucherData.code || '',
        description: voucherData.description || '',
        // Ensure discountType is one of the allowed types
        discountType: ['percentage', 'fixed'].includes(voucherData.discountType) ? voucherData.discountType : 'percentage',
        discountValue: voucherData.discountValue?.toString() || '',
        startDate: voucherData.startDate instanceof Date && !Number.isNaN(voucherData.startDate)
          ? voucherData.startDate.toISOString().split('T')[0]
          : (typeof voucherData.startDate === 'string' ? voucherData.startDate.split('T')[0] : ''),
        expiryDate: voucherData.expiryDate instanceof Date && !Number.isNaN(voucherData.expiryDate)
          ? voucherData.expiryDate.toISOString().split('T')[0]
          : (typeof voucherData.expiryDate === 'string' ? voucherData.expiryDate.split('T')[0] : ''),
        minOrderValue: voucherData.minOrderValue?.toString() || '',
        usageLimit: voucherData.usageLimit?.toString() || '',
        usedCount: voucherData.usedCount || 0,
        isActive: voucherData.isActive !== undefined ? voucherData.isActive : true,
        isPrivate: voucherData.isPrivate || false,
      });
    } else {
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0];
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage', // Default to percentage for new vouchers
        discountValue: '',
        startDate: formattedToday,
        expiryDate: '',
        minOrderValue: '',
        usageLimit: '',
        usedCount: 0,
        isActive: true,
        isPrivate: false,
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
    if (value === '' || /^\d+(\.\d+)?$/.test(value)) {
      if (name === 'usageLimit' && value !== '' && !/^\d+$/.test(value)) {
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
      newErrors.code = 'Code cannot be empty.';
      isValid = false;
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date cannot be empty.';
      isValid = false;
    } else {
      const start = new Date(formData.startDate);
      const expiry = new Date(formData.expiryDate);
      start.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);

      if (start > expiry) {
        newErrors.expiryDate = 'Expiry date cannot be before start date.';
        isValid = false;
      }
    }

    // Validation for discountValue now applies to both percentage and fixed
    const discountValue = Number(formData.discountValue);
    if (formData.discountValue === '' || Number.isNaN(discountValue) || discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be a positive number.';
      isValid = false;
    } else {
      if (formData.discountType === 'percentage' && discountValue > 100) {
        newErrors.discountValue = 'Discount value cannot be greater than 100 percent.';
        isValid = false;
      }
    }

    const minOrderValue = Number(formData.minOrderValue);
    if (formData.minOrderValue !== '' && (Number.isNaN(minOrderValue) || minOrderValue < 0)) {
      newErrors.minOrderValue = 'Minimum order value cannot be negative.';
      isValid = false;
    }

    const usageLimit = Number(formData.usageLimit);
    if (formData.usageLimit !== '' && (Number.isNaN(usageLimit) || !Number.isInteger(usageLimit) || usageLimit < 0)) {
      newErrors.usageLimit = 'Usage limit must be a positive integer.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    const dataToSave = {
      ...formData,
      discountValue: Number(formData.discountValue || 0),
      minOrderValue: Number(formData.minOrderValue || 0),
      usageLimit: Number(formData.usageLimit || 0),
      usedCount: Number(formData.usedCount || 0),
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
      isPrivate: formData.isPrivate ? true : false,
    };

    if (!isEditing) {
      dataToSave.createdAt = new Date();
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      dataToSave.startDate = now;
    }
    dataToSave.updatedAt = new Date();

    setIsSaving(true);
    try {
      await onSave(dataToSave);
    } catch (error) {
      console.error("Error during save process:", error);
      setSaveError(`Error while saving: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
      <DialogContent dividers>
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="code"
              label="Code"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.code}
              onChange={handleChange}
              disabled={isEditing || isSaving}
              required
              error={!!errors.code}
              helperText={errors.code}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="description"
              label="Description"
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
              <InputLabel>Discount Type</InputLabel>
              <Select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                label="Discount Type"
                disabled={isSaving}
              >
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed Amount</MenuItem>
                {/* Removed Free Shipping MenuItem */}
              </Select>
              {errors.discountType && <Typography color="error" variant="caption" sx={{ ml: 2, mt: 0.5 }}>{errors.discountType}</Typography>}
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="discountValue"
              label={formData.discountType === 'percentage' ? 'Value (%)' : 'Value ($)'}
              type="number"
              fullWidth
              variant="outlined"
              value={formData.discountValue}
              onChange={handleNumberChange}
              required
              error={!!errors.discountValue}
              helperText={errors.discountValue}
              disabled={isSaving}
              inputProps={{ min: 0, step: formData.discountType === 'percentage' ? 0.01 : 1 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="startDate"
              label="Start Date"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={formData.startDate}
              onChange={handleChange}
              error={!!errors.startDate}
              helperText={errors.startDate}
              disabled={true}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              margin="dense"
              name="expiryDate"
              label="Expiry Date"
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
              label="Minimum Order Value ($)"
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
              label="Usage Limit"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.usageLimit}
              onChange={handleNumberChange}
              required={false}
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
                label="Used Count"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.usedCount}
                disabled
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
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  name="isPrivate"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    {formData.isPrivate ? '🎁 Private Giftcode' : '🎫 Public Voucher'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formData.isPrivate
                      ? 'Only visible to users who enter the exact code'
                      : 'Visible to all users in the app'
                    }
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={isSaving}>
          {isEditing ? 'Save' : 'Add'}
          {isSaving && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteConfirmationModal = ({ open, onClose, onConfirm, itemName, itemType = 'item' }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Confirm Delete ${itemType}`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {`Are you sure you want to delete ${itemType} "${itemName}"? This action cannot be undone.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const getVoucherStatus = (voucher) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startDate = voucher.startDate instanceof Date && !Number.isNaN(voucher.startDate) ? new Date(voucher.startDate) : null;
  const expiryDate = voucher.expiryDate instanceof Date && !Number.isNaN(voucher.expiryDate) ? new Date(voucher.expiryDate) : null;

  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (expiryDate) expiryDate.setHours(0, 0, 0, 0);

  if (!voucher.isActive) {
    return { text: 'Inactive', color: 'grey' };
  }


  if (expiryDate && now > expiryDate) {
    return { text: 'Expired', color: 'red' };
  }

  const usageLimit = Number(voucher.usageLimit || 0);
  const usedCount = Number(voucher.usedCount || 0);

  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { text: 'Used up', color: 'red' };
  }

  if (startDate && expiryDate && now >= startDate && now <= expiryDate) {
    return { text: 'Active', color: 'green' };
  }
  return { text: 'Unknown', color: 'default' };
};


function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const vouchersCollectionRef = collection(db, 'vouchers');

    const unsubscribe = onSnapshot(vouchersCollectionRef, (snapshot) => {
      console.log("Snapshot received");
      const vouchersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || null),
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : (data.expiryDate || null),
          discountValue: Number(data.discountValue || 0),
          minOrderValue: Number(data.minOrderValue || 0),
          usageLimit: Number(data.usageLimit || 0),
          usedCount: Number(data.usedCount || 0),
          isActive: data.isActive !== undefined ? data.isActive : true,
          isPrivate: data.isPrivate || false,
        };
      });
      setVouchers(vouchersData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching vouchers:", err);
      setError('Unable to load vouchers. Please try again.');
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
      if (selectedVoucher && selectedVoucher.id) {
        const voucherRef = doc(db, 'vouchers', selectedVoucher.id);
        const { ...dataToUpdate } = voucherData;
        await updateDoc(voucherRef, dataToUpdate);
        console.log("Voucher updated successfully:", voucherData.id);

      } else {
        const { ...dataToAdd } = voucherData;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dataToAdd.startDate = now;

        await addDoc(collection(db, 'vouchers'), dataToAdd);
        console.log("Voucher added successfully");

        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://foodappbe-r5x8.onrender.com';
          const response = await fetch(`${backendUrl}/notify-new-voucher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              voucherCode: dataToAdd.code,
              voucherDescription: dataToAdd.description,
              discountType: dataToAdd.discountType,
              discountValue: dataToAdd.discountValue,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('New voucher notification sent to backend:', result);
          } else {
            const errorResult = await response.json();
            console.error('Failed to send new voucher notification to backend:', errorResult);
          }
        } catch (notificationError) {
          console.error('Error sending new voucher notification request:', notificationError);
        }
      }
      setError(null);
      handleCloseModals();
    } catch (err) {
      console.error("Error saving voucher:", err);
      throw err;
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher || !selectedVoucher.id) return;

    try {
      const voucherRef = doc(db, 'vouchers', selectedVoucher.id);
      await deleteDoc(voucherRef);
      console.log("Voucher deleted successfully:", selectedVoucher.id);
      setError(null);
      handleCloseModals();
    } catch (err) {
      console.error("Error deleting voucher:", err);
      setError(`Error deleting voucher: ${err.message || 'Unknown error'}`);
    } finally {
      // setLoading(false); // Có thể bật lại nếu có trạng thái loading riêng cho delete
    }
  };

  const filteredVouchers = useMemo(() => {
    let filtered = vouchers;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(voucher =>
        voucher.code.toLowerCase().includes(lowerCaseSearchTerm) ||
        (voucher.description?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(voucher => {
        const status = getVoucherStatus(voucher).text;
        switch (filterStatus) {
          case 'active':
            return status === 'Active';
          case 'expired':
            return status === 'Expired';
          case 'used_up':
            return status === 'Used up';
          case 'inactive_switch':
            return status === 'Inactive';
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [vouchers, searchTerm, filterStatus]);


  // Hàm xử lý xuất Excel
  const handleExportExcel = () => {
    if (filteredVouchers.length === 0) {
      alert("Không có voucher nào để xuất.");
      return;
    }

    const headers = [
      "Code",
      "Description",
      "Discount Type",
      "Discount Value",
      "Start Date",
      "Expiry Date",
      "Minimum Order Value",
      "Usage Limit",
      "Used Count",
      "Active",
      "Private"
    ];

    const dataForExcel = filteredVouchers.map(voucher => {
      const {
        code,
        description,
        discountType,
        discountValue,
        startDate,
        expiryDate,
        minOrderValue,
        usageLimit,
        usedCount,
        isActive,
        isPrivate
      } = voucher;

      // Update formattedDiscountValue to exclude 'Free Shipping' logic
      const formattedDiscountValue = discountType === 'percentage' ? `${discountValue}%`
                                     : `${Number(discountValue).toLocaleString('vi-VN')} $`;

      const formattedMinOrderValue = Number(minOrderValue) > 0 ? `${Number(minOrderValue).toLocaleString('vi-VN')} $` : 'N/A';
      const formattedUsageLimit = Number(usageLimit || 0) === 0 ? '∞' : Number(usageLimit);
      const formattedUsedCount = Number(usedCount);

      // Update discountTypeText to exclude 'Free Shipping'
      const discountTypeText = discountType === 'percentage' ? 'Phần trăm' : 'Số tiền cố định';

      const isActiveText = isActive ? 'Có' : 'Không';
      const isPrivateText = isPrivate ? 'Có' : 'Không';

      return {
        "Code": code,
        "Description": description,
        "Discount Type": discountTypeText,
        "Discount Value": formattedDiscountValue,
        "Start Date": startDate instanceof Date && !Number.isNaN(startDate.getTime()) ? startDate : null,
        "Expiry Date": expiryDate instanceof Date && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null,
        "Minimum Order Value": formattedMinOrderValue,
        "Usage Limit": `${formattedUsedCount} / ${formattedUsageLimit}`,
        "Used Count": formattedUsedCount,
        "Active": isActiveText,
        "Private": isPrivateText
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataForExcel, { header: headers });

    const dateColumns = ["Start Date", "Expiry Date"];
    dateColumns.forEach(colName => {
        const colIndex = headers.indexOf(colName);
        if (colIndex !== -1) {
            const colLetter = String.fromCharCode(65 + colIndex);
            for (let R = 1; R <= dataForExcel.length; ++R) {
                const cellref = XLSX.utils.encode_cell({c: colIndex, r: R});
                if (ws[cellref] && ws[cellref].t === 'n') {
                    ws[cellref].z = 'dd/mm/yyyy';
                }
            }
        }
    });

    const wscols = headers.map(header => ({
        wch: Math.max(header.length, 15)
    }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");

    const now = new Date();
    const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    XLSX.writeFile(wb, `danh_sach_voucher_${dateString}.xlsx`);
  };


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
          Voucher Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExportExcel}
            disabled={loading || filteredVouchers.length === 0}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenAddModal}
            disabled={loading}
          >
            Add New Voucher
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search by Code or Description"
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
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="used_up">Used Up</MenuItem>
              <MenuItem value="inactive_switch">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
          <Table stickyHeader aria-label="sticky table voucher">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }}>Code</TableCell>
                <TableCell sx={{
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 150,
                  maxWidth: 250
                }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>Expiry Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 120, maxWidth: 150 }}>Minimum Order Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80, maxWidth: 100 }} align="center">Usage Limit</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 130 }} align="center">Status</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100 }} align="center">Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 100 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={voucher.id}>
                    <TableCell sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 100,
                      maxWidth: 150,
                      backgroundColor: voucher.isPrivate ? '#fff3e0' : 'transparent'
                    }}>
                      {voucher.isPrivate && '🎁 '}{voucher.code}
                    </TableCell>
                    <TableCell sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 150,
                      maxWidth: 250
                    }}>{voucher.description}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100, maxWidth: 150 }} align="right">
                      {/* Updated display logic for discount value */}
                      {voucher.discountType === 'percentage' ? `${voucher.discountValue}%`
                        : `${Number(voucher.discountValue).toLocaleString('vi-VN')} $`}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>{voucher.startDate instanceof Date && !Number.isNaN(voucher.startDate.getTime()) ? voucher.startDate.toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>{voucher.expiryDate instanceof Date && !Number.isNaN(voucher.expiryDate.getTime()) ? voucher.expiryDate.toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 120, maxWidth: 150 }}>{(Number(voucher.minOrderValue)) > 0 ? `${Number(voucher.minOrderValue).toLocaleString('vi-VN')} $` : 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 80, maxWidth: 100 }} align="center">
                      {`${Number(voucher.usedCount)} / ${Number(voucher.usageLimit || 0) === 0 ? '∞' : Number(voucher.usageLimit)}`}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 130 }} align="center">
                      <Typography variant="body2" sx={{ color: getVoucherStatus(voucher).color, fontWeight: 'bold' }}>
                        {getVoucherStatus(voucher).text}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100 }} align="center">
                      {voucher.isPrivate ? (
                        <Chip
                          label="Private"
                          color="warning"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ) : (
                        <Chip
                          label="Public"
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
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
                    <TableCell colSpan={11} align="center">
                      {vouchers.length === 0 && (searchTerm === '' && filterStatus === 'all') ? 'No vouchers found.' : 'No matching vouchers found.'}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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