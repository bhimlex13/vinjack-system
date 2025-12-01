// client/src/pages/PurchaseOrderDetailPage.js
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getPurchaseOrderById, 
  approveSupplierChanges,
  uploadCountersignedAgreement 
} from '../api/purchaseOrderApi';
import ConfirmationContext from '../context/ConfirmationContext';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

import PurchaseOrderPrintout from '../components/PurchaseOrderPrintout';
import ReceiveStockModal from '../components/ReceiveStockModal';
import ImageViewModal from '../components/ImageViewModal';
import UploadAgreementModal from '../components/UploadAgreementModal';

import {
  Container, Typography, Box, Paper, Grid, Button, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Dialog, DialogContent, DialogActions, Chip, Link as MuiLink, IconButton,
  Tooltip, Card, CardContent, CardActions, Collapse,
  Stepper, Step, StepLabel, Stack
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GavelIcon from '@mui/icons-material/Gavel'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import LoadingSpinner from '../components/LoadingSpinner';

const Row = ({ item, poStatus, formatCurrency }) => {
  const [open, setOpen] = useState(false);
  const hasSerials = item.serialNumbers && item.serialNumbers.length > 0; 

  const isChanged = poStatus === 'Awaiting Approval' && typeof item.supplierUpdatedCost === 'number' && item.supplierUpdatedCost !== item.cost;
  const isUnavailable = poStatus === 'Awaiting Approval' && !item.isAvailable;

  return (
    <React.Fragment>
      <TableRow 
        component={motion.tr}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        sx={{ '& > *': { borderBottom: 'unset' }, ...(isUnavailable ? { textDecoration: 'line-through', color: 'text.disabled' } : {}) }}
        hover
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {hasSerials && (
              <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            )}
            <Box sx={{ ml: hasSerials ? 1 : 0 }}>
                <Typography variant="body2" fontWeight={600}>{item.product?.name || 'Product not found'}</Typography>
                {hasSerials && <Chip label="Serialized" size="small" color="info" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }} />}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right">{item.quantity}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantityReceived || 0}</TableCell>
        <TableCell align="right">
          {isChanged ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
              <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                {formatCurrency(item.cost)}
              </Typography>
              <ArrowForwardIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(item.supplierUpdatedCost)}
              </Typography>
            </Box>
          ) : (
            formatCurrency(item.cost)
          )}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(item.total)}</TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                 <QrCodeScannerIcon fontSize="small" />
                 Recorded Serial Numbers / IDs
              </Typography>
              <Grid container spacing={1}>
                 {item.serialNumbers && item.serialNumbers.map((sn, index) => (
                     <Grid size="auto" key={index}>
                         <Chip label={sn} size="small" variant="outlined" sx={{ bgcolor: 'white' }} />
                     </Grid>
                 ))}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);
  const { socket } = useContext(AuthContext);
  
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const printoutRef = useRef();
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  
  // FIXED: Removed unused setImageViewUrl
  const [imageViewUrl] = useState(''); 

  const [countersignFile, setCountersignFile] = useState(null);
  const [isCountersigning, setIsCountersigning] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const fetchPo = useCallback(async () => {
    try {
      if (!po) setLoading(true);
      const data = await getPurchaseOrderById(id);
      setPo(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch purchase order details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, po]);

  useEffect(() => {
    fetchPo();
    if (!socket) return;
    const handleRealTimeUpdate = (data) => {
        if (data.poId === id) {
            console.log('Current PO Updated by Supplier. Refreshing...');
            toast.info('This PO has just been updated by the supplier.');
            fetchPo();
        }
    };
    socket.on('po_supplier_update', handleRealTimeUpdate);
    return () => {
        socket.off('po_supplier_update', handleRealTimeUpdate);
    };
    // eslint-disable-next-line
  }, [fetchPo, id, socket]); 

  const handleApprove = async () => {
    const isConfirmed = await confirm('Approve Changes?', 'This will finalize costs and quantities.');
    if (isConfirmed) {
      try {
        await approveSupplierChanges(id);
        toast.success('Purchase Order has been approved!');
        fetchPo();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to approve order.');
      }
    }
  };

  const handlePrint = () => {
    const printContents = printoutRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<div class="print-container">${printContents}</div>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleUploadSuccess = (updatedPo) => {
    setPo(updatedPo);
    setIsUploadModalOpen(false);
    toast.success('Signed agreement uploaded successfully!');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const handleCopyLink = () => {
    if (po && po.supplierResponseToken) {
      const link = `${window.location.origin}/supplier/po/${po.supplierResponseToken}`;
      navigator.clipboard.writeText(link).then(() => toast.success('Copied!'));
    }
  };

  const handleOpenImageView = (filePath) => {
    if (!filePath) return;
    const isBase64DataUri = filePath.startsWith('data:');
    
    if (isBase64DataUri) {
        const pdfWindow = window.open("");
        if (pdfWindow) {
            pdfWindow.document.write(`<iframe width='100%' height='100%' src='${filePath}'></iframe>`);
        }
    } else {
        const isFullUrl = filePath.startsWith('http');
        const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const finalUrl = isFullUrl ? filePath : `${imageBaseUrl}${filePath}`;
        window.open(finalUrl, '_blank');
    }
  };

  const handleCountersignFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
            toast.error('PDF or Image only.');
            return;
        }
        setCountersignFile(file);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCountersignSubmit = async () => {
    if (!countersignFile) {
        toast.error("Please upload the countersigned file first.");
        return;
    }
    const isConfirmed = await confirm(
        "Confirm Approval?", 
        "This will approve the PO, finalize the agreement, and notify the supplier to deliver stock."
    );
    if (!isConfirmed) return;

    setIsCountersigning(true);
    try {
        const base64File = await convertToBase64(countersignFile);
        await uploadCountersignedAgreement(id, base64File);
        toast.success("Agreement countersigned and PO Approved!");
        fetchPo(); 
    } catch (err) {
        toast.error("Failed to upload countersigned agreement.");
        console.error(err);
    } finally {
        setIsCountersigning(false);
    }
  };

  const getActiveStep = () => {
    if (!po) return 0;
    if (po.status === 'Pending') return 0;
    if (po.status === 'Awaiting Approval' && po.signedAgreementUrl && !po.countersignedAgreementUrl) return 1; 
    if (po.status === 'Approved' || po.status === 'Agreement Uploaded - Awaiting Delivery') return 2; 
    if (po.status === 'Partially Received' || po.status === 'Completed') return 3; 
    return 0;
  };
  
  const consignmentSteps = [
    'Agreement Issued by Owner',
    'Supplier Signed & Uploaded',
    'Owner Countersign & Approval',
    'Delivery & Receiving'
  ];

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <LoadingSpinner text="Loading Order Details..." />
    </Box>
  );

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!po) return <Alert severity="warning">Purchase Order not found.</Alert>;

  const StatusChip = ({ status }) => {
    const statusStyles = {
        'Pending': { label: 'Pending', color: 'warning' },
        'Awaiting Approval': { label: 'Awaiting Approval', color: 'primary' },
        'Approved': { label: 'Approved', color: 'info' },
        'Completed': { label: 'Completed', color: 'success' },
        'Cancelled': { label: 'Cancelled', color: 'error' },
        'Partially Received': { label: 'Partially Received', color: 'secondary' },
        'Agreement Uploaded - Awaiting Delivery': { label: 'Awaiting Delivery', color: 'info', icon: <DescriptionIcon /> },
    };
    const style = statusStyles[status] || { label: status, color: 'default' };
    return <Chip label={style.label} color={style.color} icon={style.icon} sx={{ fontWeight: 'bold' }}/>;
  };

  const supplierLink = po?.supplierResponseToken ? `${window.location.origin}/supplier/po/${po.supplierResponseToken}` : null;
  const signedAgreementUrl = po?.signedAgreementUrl;
  const countersignedUrl = po?.countersignedAgreementUrl; 
  const isReceivingAllowed = ['Approved', 'Partially Received', 'Agreement Uploaded - Awaiting Delivery'].includes(po.status);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <UploadAgreementModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        poId={po._id}
        onUploadSuccess={handleUploadSuccess}
      />
      
      <ImageViewModal 
        open={isImageViewOpen} 
        onClose={() => setIsImageViewOpen(false)} 
        imageUrl={imageViewUrl} 
      />

      <ReceiveStockModal
        open={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        poData={po}
        onSuccess={fetchPo}
      />

      <AnimatePresence>
        {isPrintModalOpen && (
            <Dialog open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} maxWidth="md" fullWidth>
                <DialogContent><PurchaseOrderPrintout poData={po} ref={printoutRef} /></DialogContent>
                <DialogActions>
                <Button onClick={() => setIsPrintModalOpen(false)}>Close</Button>
                <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Print / Download PO</Button>
                </DialogActions>
            </Dialog>
        )}
      </AnimatePresence>

      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
        {/* Top Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
          <motion.div variants={itemVariants}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h4" fontWeight={800}>{po.poNumber}</Typography>
                <Chip 
                label={po.poType === 'Consignment' ? 'Consignment' : 'Standard PO'}
                color={po.poType === 'Consignment' ? 'info' : 'default'}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 'bold', border: 'none', bgcolor: 'action.hover' }}
                />
            </Stack>
            <Typography variant="subtitle2" color="textSecondary" fontWeight={600} sx={{ mt: 0.5 }}>
                Ordered: {new Date(po.orderDate).toLocaleDateString()}
            </Typography>
          </motion.div>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/purchase-orders')}>Back</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => setIsPrintModalOpen(true)}>Print PO</Button>
          </Stack>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {/* Supplier Info */}
          <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>Supplier Details</Typography>
                    <Box sx={{ display: 'grid', gap: 0.5 }}>
                        <Typography variant="body2"><strong>Name:</strong> {po.supplier.name}</Typography>
                        <Typography variant="body2"><strong>Contact:</strong> {po.supplier.contactPerson || 'N/A'}</Typography>
                        <Typography variant="body2"><strong>Email:</strong> {po.supplier.email || 'N/A'}</Typography>
                    </Box>
                </CardContent>
            </Card>
          </Grid>

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
             <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>Order Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <Typography variant="body2" fontWeight={600}>Current Status:</Typography> 
                             <StatusChip status={po.status} />
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={600}>Total Amount:</Typography>
                            <Typography variant="h6" color="primary.main" fontWeight={800}>{formatCurrency(po.totalAmount)}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
          </Grid>

          {supplierLink && ['Pending', 'Awaiting Approval'].includes(po.status) && (
            <Grid size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
               <Alert severity="info" icon={<LinkIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Supplier Review Link:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <MuiLink href={supplierLink} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all', fontWeight: 500 }}>{supplierLink}</MuiLink>
                    <Tooltip title="Copy Link"><IconButton size="small" onClick={handleCopyLink}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
               </Alert>
            </Grid>
          )}

          {/* --- DISPLAY AGREEMENTS AND STATUS --- */}
          {po.poType === 'Consignment' && (
            <Grid size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
              <Card variant="outlined" sx={{ borderColor: 'info.main', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                    <DescriptionIcon color="info" /> Consignment Agreements
                  </Typography>
                  
                  {/* Progress Stepper with scroll wrapper for mobile */}
                  {po.consignmentMethod === 'System' && (
                      <Box sx={{ width: '100%', mb: 4, mt: 2, overflowX: 'auto' }}>
                        <Box sx={{ minWidth: '600px', p: 1 }}> 
                            <Stepper activeStep={getActiveStep()} alternativeLabel>
                                {consignmentSteps.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                                ))}
                            </Stepper>
                        </Box>
                      </Box>
                  )}

                  {/* 1. Supplier Signed Version */}
                  {signedAgreementUrl ? (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">1. Supplier Signed Version:</Typography>
                        <MuiLink component="button" variant="body1" onClick={() => handleOpenImageView(signedAgreementUrl)} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mt: 0.5 }}>
                            <PictureAsPdfIcon color="error" /> View Supplier PDF
                        </MuiLink>
                    </Box>
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>Waiting for supplier to upload signed agreement...</Typography>
                  )}

                  {/* 2. Countersigned Version (Final) */}
                  {countersignedUrl && (
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">2. Countersigned (Final) Version:</Typography>
                        <MuiLink component="button" variant="body1" onClick={() => handleOpenImageView(countersignedUrl)} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', color: 'success.main', mt: 0.5 }}>
                            <GavelIcon /> View Final Countersigned PDF
                        </MuiLink>
                    </Box>
                  )}
                </CardContent>
                
                {po.consignmentMethod === 'Manual' && !signedAgreementUrl && (
                    <CardActions sx={{ p: 2 }}>
                        <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => setIsUploadModalOpen(true)}>Upload Initial Agreement</Button>
                    </CardActions>
                )}
              </Card>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 4 }} />
        
        <motion.div variants={itemVariants}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Order Items</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
                <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ordered</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Received</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Cost</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {po.items.map((item, index) => (
                    <Row key={index} item={item} poStatus={po.status} formatCurrency={formatCurrency} />
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        </motion.div>

        {/* --- ACTION BUTTONS AREA --- */}
        <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }} component={motion.div} variants={itemVariants}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
                
                {/* --- SYSTEM CONSIGNMENT APPROVAL FLOW --- */}
                {po.status === 'Awaiting Approval' && po.poType === 'Consignment' && po.consignmentMethod === 'System' && (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                        <Button
                            component="label"
                            variant="outlined"
                            color="secondary"
                            startIcon={<FileUploadIcon />}
                            fullWidth={false}
                        >
                            {countersignFile ? countersignFile.name : "Select Countersigned PDF"}
                            <input type="file" hidden accept="application/pdf,image/*" onChange={handleCountersignFileSelect} />
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<GavelIcon />} 
                            onClick={handleCountersignSubmit}
                            disabled={!countersignFile || isCountersigning}
                        >
                            {isCountersigning ? <LoadingSpinner text=""/> : "Countersign & Approve"}
                        </Button>
                    </Box>
                )}

                {/* --- STANDARD APPROVAL (Non-System Consignment) --- */}
                {po.status === 'Awaiting Approval' && (po.poType !== 'Consignment' || po.consignmentMethod !== 'System') && (
                    <>
                        <Typography variant="body2" color="text.secondary">This PO is awaiting your approval.</Typography>
                        <Button variant="contained" color="primary" startIcon={<ThumbUpIcon />} onClick={handleApprove}>
                            Approve Supplier Changes
                        </Button>
                    </>
                )}
                
                {/* --- RECEIVING STOCK --- */}
                {isReceivingAllowed && (
                  <Button variant="contained" color="success" startIcon={<InventoryIcon />} onClick={() => setIsReceiveModalOpen(true)}>
                    Receive Stock
                  </Button>
                )}
            </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PurchaseOrderDetailPage;