// client/src/components/ReceiveStockModal.js
import React, { useState, useEffect } from 'react';
import { receivePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, CircularProgress, Paper, Alert
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// --- NEW: Add the resizeImage function (copied from UploadReceiptModal.js) ---
const resizeImage = (file, maxWidth, maxHeight) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9)); // Use jpeg for quality
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
// --- END NEW ---

const ReceiveStockModal = ({ open, onClose, poData, onSuccess }) => {
  const [receivedItems, setReceivedItems] = useState([]);
  // --- MODIFIED: State for Base64 string, file name, image processing, and errors ---
  const [base64Image, setBase64Image] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageError, setImageError] = useState('');
  // --- END MODIFICATION ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (poData?.items) {
      const itemsToReceive = poData.items.map(item => ({
        productId: item.product._id,
        productName: item.product.name,
        quantityOrdered: item.quantity,
        quantityAlreadyReceived: item.quantityReceived || 0,
        quantityToReceive: '',
      }));
      setReceivedItems(itemsToReceive);
    }
    // Reset image state when modal opens
    setBase64Image(null);
    setSelectedFileName('');
    setImageError('');
    setIsImageProcessing(false);
  }, [poData]);

  const handleQuantityChange = (productId, value) => {
    const maxQty = receivedItems.find(i => i.productId === productId).quantityOrdered - receivedItems.find(i => i.productId === productId).quantityAlreadyReceived;
    const newQty = Math.max(0, Math.min(Number(value), maxQty));

    setReceivedItems(
      receivedItems.map(item =>
        item.productId === productId ? { ...item, quantityToReceive: newQty } : item
      )
    );
  };

  // --- MODIFIED: Handle file selection, resize, and convert to Base64 ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Invalid file type. Please upload JPG or PNG.');
        setSelectedFileName('');
        setBase64Image(null);
        e.target.value = null;
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setImageError('File size exceeds 5MB limit.');
          setSelectedFileName('');
          setBase64Image(null);
          e.target.value = null;
          return;
      }

      setIsImageProcessing(true);
      setImageError('');
      setSelectedFileName(file.name);
      try {
        const resizedImage = await resizeImage(file, 800, 1200);
        setBase64Image(resizedImage);
        toast.info("Image is ready to upload.");
      } catch (err) {
        setImageError("Failed to process image. Please try another file.");
        setSelectedFileName('');
        setBase64Image(null);
      } finally {
        setIsImageProcessing(false);
      }
    } else {
        setSelectedFileName('');
        setBase64Image(null);
        setImageError('');
    }
  };
  // --- END MODIFICATION ---

  const handleSubmit = async () => {
    const itemsWithQuantity = receivedItems
      .filter(item => Number(item.quantityToReceive) > 0)
      .map(item => ({
        productId: item.productId,
        quantityReceived: Number(item.quantityToReceive),
      }));

    if (itemsWithQuantity.length === 0) {
      toast.warn('Please enter a quantity for at least one item.');
      return;
    }

    setIsSubmitting(true);
    try {
      // --- MODIFIED: Pass Base64 string instead of file ---
      const response = await receivePurchaseOrder(poData._id, itemsWithQuantity, base64Image);
      toast.success(response.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isImageProcessing;

  return (
    <Dialog open={open} onClose={isDisabled ? () => {} : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Receive Stock for PO #{poData?.poNumber}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enter the quantity of items received from the delivery. You can receive stock partially.
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="center">Ordered</TableCell>
                <TableCell align="center">Received</TableCell>
                <TableCell align="center">Quantity to Receive Now</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receivedItems.map(item => (
                <TableRow key={item.productId}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell align="center">{item.quantityOrdered}</TableCell>
                  <TableCell align="center">{item.quantityAlreadyReceived}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantityToReceive}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                      inputProps={{
                        min: 0,
                        max: item.quantityOrdered - item.quantityAlreadyReceived,
                      }}
                      sx={{ maxWidth: 100 }}
                      disabled={isDisabled}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* --- MODIFIED: Replaced file input with new UI from UploadReceiptModal --- */}
        <Box sx={{ mt: 3, border: '1px dashed grey', p: 2, borderRadius: 1, textAlign: 'center' }}>
          <Typography gutterBottom>Upload Physical Receipt (Optional)</Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={isDisabled}
            fullWidth
          >
            Select Image (JPG, PNG only)
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
            />
          </Button>

          {isImageProcessing && (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">Processing image...</Typography>
             </Box>
          )}

          {selectedFileName && !isImageProcessing && base64Image && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, color: 'success.main' }}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {selectedFileName} (Ready)
              </Typography>
            </Box>
          )}

          {imageError && <Alert severity="error" sx={{ mt: 2 }}>{imageError}</Alert>}
        </Box>
        {/* --- END MODIFICATION --- */}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDisabled}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isDisabled}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Confirm Reception & Update Stock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveStockModal;