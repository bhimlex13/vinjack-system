// client/src/components/ReceiveStockModal.js
import React, { useState, useEffect, useRef } from 'react';
import { receivePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

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

const ReceiveStockModal = ({ open, onClose, poData, onSuccess }) => {
  const [receivedItems, setReceivedItems] = useState([]);
  
  const [base64Image, setBase64Image] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [imageError, setImageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showLabelStep, setShowLabelStep] = useState(false);
  const [itemsForLabels, setItemsForLabels] = useState([]);

  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // Track the PO ID to prevent resetting state on background updates
  const loadedPoIdRef = useRef(null);

  useEffect(() => {
    // Only run initialization if:
    // 1. The modal is OPEN
    // 2. We have PO data
    // 3. We haven't loaded this specific PO ID yet (prevents reset on background refresh)
    if (open && poData?.items) {
        if (loadedPoIdRef.current !== poData._id) {
            const itemsToReceive = poData.items.map(item => ({
                productId: item.product._id,
                itemCode: item.product.itemCode,
                productName: item.product.name,
                quantityOrdered: item.quantity,
                quantityAlreadyReceived: item.quantityReceived || 0,
                quantityToReceive: '', // Start empty
                isSerialized: item.product.isSerialized || false,
                serialNumbers: []
            }));
            setReceivedItems(itemsToReceive);
            
            // Reset other states
            setBase64Image(null);
            setSelectedFileName('');
            setImageError('');
            setShowLabelStep(false);
            setItemsForLabels([]);
            setExpandedProduct(null);
            
            // Mark this PO as loaded
            loadedPoIdRef.current = poData._id;
        }
    }
    
    // If modal closes, reset the ref so it can reload next time
    if (!open) {
        loadedPoIdRef.current = null;
        setReceivedItems([]); // Optional: clear state on close
    }
  }, [open, poData]);
  
  const handleQuantityChange = (productId, value) => {
    // Allow positive numbers and empty string
    // Note: input type="number" might return empty string for invalid chars, which is fine here
    if (value !== '' && parseInt(value) < 0) return;

    setReceivedItems(prevItems => prevItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantityToReceive: value };
      }
      return item;
    }));
  };

  const handleInputBlur = (productId) => {
    setReceivedItems(prevItems => prevItems.map(item => {
      if (item.productId === productId) {
        let val = parseInt(item.quantityToReceive, 10);
        const maxReceivable = item.quantityOrdered - item.quantityAlreadyReceived;

        if (isNaN(val) || val < 0) val = 0;
        // Validation: Don't allow receiving more than ordered (optional constraint)
        if (val > maxReceivable) {
            // Optional: Toast warning
            // toast.warning(`Max receive amount is ${maxReceivable}`);
            val = maxReceivable;
        }

        // Adjust serial numbers array size based on new quantity
        const currentSerials = item.serialNumbers || [];
        let newSerials = [...currentSerials];
        
        if (val > newSerials.length) {
            // Grow array
            while (newSerials.length < val) {
                newSerials.push('');
            }
        } else if (val < newSerials.length) {
            // Shrink array
            newSerials = newSerials.slice(0, val);
        }

        return { 
            ...item, 
            quantityToReceive: val === 0 ? '' : val.toString(), 
            serialNumbers: newSerials 
        };
      }
      return item;
    }));
  };

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Invalid file type. Please upload JPG or PNG.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        setImageError('File is too large (max 5MB).');
        return;
      }
      
      setImageError('');
      setSelectedFileName(file.name);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
          setBase64Image(reader.result);
          toast.info("Image file ready for upload.");
      };
      reader.onerror = (err) => {
          setImageError("Failed to read file.");
          setBase64Image(null);
      }
    }
  };

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
      
      if (poData.poType === 'Consignment') {
        const labelsToPrint = itemsWithQuantity.map(item => ({
            name: item.productName,
            code: item.itemCode,
            qty: Number(item.quantityToReceive),
            serials: item.isSerialized ? item.serialNumbers : []
        }));
        
        setItemsForLabels(labelsToPrint);
        setShowLabelStep(true);
      } else {
        onSuccess();
        onClose();
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFinalClose = () => {
      onSuccess();
      onClose();
  }

  const isDisabled = isSubmitting;

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
                            type="number" // Restored type="number" for up/down spinners
                            size="small"
                            value={item.quantityToReceive}
                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                            onBlur={() => handleInputBlur(item.productId)}
                            sx={{ maxWidth: 80 }}
                            disabled={isDisabled}
                            // Removed pattern, not needed for type="number"
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