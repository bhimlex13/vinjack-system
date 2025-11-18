// client/src/components/ReceiveStockModal.js
import React, { useState, useEffect } from 'react';
import { receivePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Add autoTable import if needed for labels (often required with jsPDF)

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, CircularProgress, Paper, Alert, Grid, Chip, IconButton, Collapse
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrintIcon from '@mui/icons-material/Print';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

// --- REMOVED: resizeImage function (removes canvas usage and PDF logic) ---

const ReceiveStockModal = ({ open, onClose, poData, onSuccess }) => {
  const [receivedItems, setReceivedItems] = useState([]);
  
  const [base64Image, setBase64Image] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  // Removed: [isImageProcessing, setIsImageProcessing]
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showLabelStep, setShowLabelStep] = useState(false);
  const [itemsForLabels, setItemsForLabels] = useState([]);

  const [expandedProduct, setExpandedProduct] = useState(null);

  useEffect(() => {
    if (poData?.items) {
      const itemsToReceive = poData.items.map(item => ({
        productId: item.product._id,
        itemCode: item.product.itemCode,
        productName: item.product.name,
        quantityOrdered: item.quantity,
        quantityAlreadyReceived: item.quantityReceived || 0,
        quantityToReceive: '',
        isSerialized: item.product.isSerialized || false,
        serialNumbers: []
      }));
      setReceivedItems(itemsToReceive);
    }
    setBase64Image(null);
    setSelectedFileName('');
    // Removed: setIsImageProcessing(false);
    setImageError('');
    setShowLabelStep(false);
    setItemsForLabels([]);
    setExpandedProduct(null);
  }, [poData]);
  
  // State for tracking which input field is focused/active
  const [activeInput, setActiveInput] = useState(null);

  // --- MODIFIED: Fix Quantity Input and Cursor Position ---
  const handleQuantityInputFocus = (productId, currentValue) => {
    // If the current value is exactly the string '0', set the input to an empty string on focus.
    // This allows the user to type '20' instead of '020'.
    if (currentValue === '0' || currentValue === 0) {
      handleQuantityChange(productId, '');
    }
    setActiveInput(productId);
  };
  
  const handleQuantityInputBlur = (productId, currentValue) => {
      // If the user leaves the field empty after focus, set it back to 0 or ''
      if (currentValue === '') {
          handleQuantityChange(productId, 0); // Optionally set to 0 or leave as '' depending on UX preference
      }
      setActiveInput(null);
  };
  
  const handleQuantityChange = (productId, value) => {
    // If the value is empty, don't validate max/min, just set it
    if (value === '') {
        setReceivedItems(prevItems => prevItems.map(item => 
          item.productId === productId ? { ...item, quantityToReceive: '' } : item
        ));
        return;
    }
    
    // Ensure input is a number
    const numericValue = Number(value);
    
    if (isNaN(numericValue)) return;

    const maxReceivable = receivedItems.find(i => i.productId === productId).quantityOrdered - receivedItems.find(i => i.productId === productId).quantityAlreadyReceived;
    const newQty = Math.max(0, Math.min(numericValue, maxReceivable));

    setReceivedItems(prevItems => prevItems.map(item => {
      if (item.productId === productId) {
        const currentSerials = item.serialNumbers || [];
        // Ensure newSerials array size matches newQty, padding with '' or slicing excess
        const newSerials = currentSerials.slice(0, newQty);
        
        while (newSerials.length < newQty) {
            newSerials.push('');
        }
        return { ...item, quantityToReceive: newQty, serialNumbers: newSerials };
      }
      return item;
    }));
  };
  // --- END MODIFIED: Fix Quantity Input and Cursor Position ---

  const handleSerialChange = (productId, index, value) => {
    setReceivedItems(prevItems => prevItems.map(item => {
      if (item.productId === productId) {
        const newSerials = [...item.serialNumbers];
        newSerials[index] = value;
        return { ...item, serialNumbers: newSerials };
      }
      return item;
    }));
  };

  const toggleExpand = (productId) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  // --- MODIFIED: Receipt Upload (Image Only, simplified Base64) ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // --- MODIFIED: Removed PDF and simplified type check ---
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Invalid file type. Please upload JPG or PNG.');
        return;
      }
      // --- END MODIFIED ---
      
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        setImageError('File is too large (max 5MB).');
        return;
      }
      
      // Removed: setIsImageProcessing(true);
      setImageError('');
      setSelectedFileName(file.name);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
          setBase64Image(reader.result);
          toast.info("Image file ready for upload.");
          // Removed: setIsImageProcessing(false);
      };
      reader.onerror = (err) => {
          setImageError("Failed to read file.");
          setBase64Image(null);
          // Removed: setIsImageProcessing(false);
      }
    }
  };
  // --- END MODIFIED: Receipt Upload (Image Only, simplified Base64) ---

  // --- MODIFIED: Added autoTable import for label printing ---
  const handlePrintLabels = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 30] });
    let isFirstPage = true;

    itemsForLabels.forEach((item) => {
      const hasSerials = item.serials && item.serials.length > 0;
      const count = hasSerials ? item.serials.length : item.qty;

      for (let i = 0; i < count; i++) {
        if (!isFirstPage) doc.addPage([50, 30], 'landscape');
        isFirstPage = false;

        const specificSerial = hasSerials ? item.serials[i] : null;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("CONSIGNED ITEM", 25, 5, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Item: ${item.name.substring(0, 18)}`, 2, 10);
        doc.text(`Code: ${item.code}`, 2, 14);
        
        if (specificSerial) {
             doc.setFont("helvetica", "bold");
             doc.text(`ID/SN: ${specificSerial}`, 2, 18);
        }

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`Supp: ${poData?.supplier?.name?.substring(0, 20) || 'N/A'}`, 2, 23);
        
        doc.setLineWidth(0.5);
        doc.rect(1, 1, 48, 28);
      }
    });

    doc.save(`labels_PO-${poData.poNumber}.pdf`);
  };
  // --- END MODIFIED: Added autoTable import for label printing ---

  const handleSubmit = async () => {
    const itemsWithQuantity = receivedItems
      .filter(item => Number(item.quantityToReceive) > 0);

    if (itemsWithQuantity.length === 0) {
      toast.warn('Please enter a quantity for at least one item.');
      return;
    }

    for (const item of itemsWithQuantity) {
        if (item.isSerialized) {
            if (item.serialNumbers.some(sn => !sn.trim())) {
                toast.error(`Please enter all serial numbers for ${item.productName}.`);
                setExpandedProduct(item.productId);
                return;
            }
            const uniqueSerials = new Set(item.serialNumbers);
            if (uniqueSerials.size !== item.serialNumbers.length) {
                toast.error(`Duplicate serial numbers detected for ${item.productName}.`);
                setExpandedProduct(item.productId);
                return;
            }
        }
    }

    const payloadItems = itemsWithQuantity.map(item => ({
        productId: item.productId,
        quantityReceived: Number(item.quantityToReceive),
        serialNumbers: item.isSerialized ? item.serialNumbers : []
    }));

    setIsSubmitting(true);
    try {
      const response = await receivePurchaseOrder(poData._id, payloadItems, base64Image);
      toast.success(response.message);
      
      // --- UPDATED LOGIC: Defer parent refresh ---
      if (poData.poType === 'Consignment') {
        const labelsToPrint = itemsWithQuantity.map(item => ({
            name: item.productName,
            code: item.itemCode,
            qty: Number(item.quantityToReceive),
            serials: item.isSerialized ? item.serialNumbers : []
        }));
        
        setItemsForLabels(labelsToPrint);
        setShowLabelStep(true); // Modal stays open for label print step
      } else {
        onSuccess(); // Standard PO refreshes parent immediately
        onClose();
      }
      // --- END UPDATED LOGIC ---

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- NEW: Final closure handler ---
  const handleFinalClose = () => {
      onSuccess(); // Refresh parent to show final PO status (e.g., 'Completed')
      onClose(); // Close the modal
  }
  // --- END NEW ---

  const isDisabled = isSubmitting; // Removed isImageProcessing since no resizing is happening now

  return (
    <Dialog open={open} onClose={isDisabled ? () => {} : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {showLabelStep ? 'Stock Received Successfully' : `Receive Stock for PO #${poData?.poNumber}`}
      </DialogTitle>
      
      <DialogContent>
        {!showLabelStep ? (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter the quantity of items received. For serialized/consigned items, enter the unique ID for each unit.
            </Typography>
            {imageError && <Alert severity="error" sx={{ mb: 2 }}>{imageError}</Alert>}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">Qty Ord</TableCell>
                    <TableCell align="center">Recv'd</TableCell>
                    <TableCell align="center">Qty Now</TableCell>
                    <TableCell align="center"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receivedItems.map(item => (
                    <React.Fragment key={item.productId}>
                      <TableRow>
                        <TableCell>
                            {item.productName}
                            {item.isSerialized && <Chip label="Serialized" size="small" color="info" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />}
                        </TableCell>
                        <TableCell align="center">{item.quantityOrdered}</TableCell>
                        <TableCell align="center">{item.quantityAlreadyReceived}</TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantityToReceive}
                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                            // --- MODIFIED: Add Focus/Blur handlers ---
                            onFocus={(e) => handleQuantityInputFocus(item.productId, e.target.value)}
                            onBlur={(e) => handleQuantityInputBlur(item.productId, e.target.value)}
                            // --- END MODIFIED ---
                            inputProps={{ min: 0, max: item.quantityOrdered - item.quantityAlreadyReceived }}
                            sx={{ maxWidth: 80 }}
                            disabled={isDisabled}
                          />
                        </TableCell>
                        <TableCell align="center">
                             {item.isSerialized && Number(item.quantityToReceive) > 0 && (
                                 <IconButton size="small" onClick={() => toggleExpand(item.productId)}>
                                     {expandedProduct === item.productId ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                 </IconButton>
                             )}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                          <Collapse in={expandedProduct === item.productId} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <QrCodeScannerIcon fontSize="small" />
                                Enter Serial Numbers / Unique Tags for {item.productName}
                              </Typography>
                              <Grid container spacing={1}>
                                {item.serialNumbers.map((sn, idx) => (
                                    <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                                        <TextField 
                                            fullWidth
                                            size="small"
                                            label={`Item #${idx + 1}`}
                                            value={sn}
                                            onChange={(e) => handleSerialChange(item.productId, idx, e.target.value)}
                                            placeholder="Scan or type SN"
                                        />
                                    </Grid>
                                ))}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, border: '1px dashed grey', p: 2, borderRadius: 1, textAlign: 'center' }}>
              <Typography gutterBottom>Upload Receipt (Optional - Image Only)</Typography>
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
                  // --- MODIFIED: Only accept images ---
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFileName && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, color: 'success.main' }}>
                  <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">{selectedFileName} (Ready)</Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
             <LocalOfferIcon color="info" sx={{ fontSize: 60, mb: 2 }} />
             <Typography variant="h5" gutterBottom>Stock Added Successfully</Typography>
             <Typography color="text.secondary" sx={{ mb: 4 }}>
               Please print labels for the new items.
             </Typography>

             <Grid container spacing={2} justifyContent="center">
               <Grid item>
                  <Button 
                    variant="contained" 
                    color="info" 
                    size="large" 
                    startIcon={<PrintIcon />} 
                    onClick={handlePrintLabels}
                  >
                    Print Labels PDF
                  </Button>
               </Grid>
             </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!showLabelStep ? (
          <>
            <Button onClick={onClose} disabled={isDisabled}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={isDisabled}>
              {isSubmitting ? <CircularProgress size={24} /> : 'Confirm Reception'}
            </Button>
          </>
        ) : (
          <Button onClick={handleFinalClose} variant="outlined">Done & Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveStockModal;