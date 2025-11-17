// client/src/pages/PurchaseOrderDetailPage.js
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, approveSupplierChanges, uploadSignedAgreement } from '../api/purchaseOrderApi';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

import PurchaseOrderPrintout from '../components/PurchaseOrderPrintout';
import ReceiveStockModal from '../components/ReceiveStockModal';
import ImageViewModal from '../components/ImageViewModal';
import UploadAgreementModal from '../components/UploadAgreementModal';
import ConsignmentAgreementPrint from '../components/ConsignmentAgreementPrint';

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Dialog, DialogContent, DialogActions, Chip, Link as MuiLink, IconButton,
  Tooltip, Card, CardContent, CardActions
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoIcon from '@mui/icons-material/Info';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DescriptionIcon from '@mui/icons-material/Description';


const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const printoutRef = useRef();
  
  const agreementPrintRef = useRef();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const [imageViewUrl, setImageViewUrl] = useState('');

  const fetchPo = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrderById(id);
      setPo(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch purchase order details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPo();
  }, [fetchPo]);

  // --- NEW: Add this useEffect to debug the ref ---
  useEffect(() => {
    // This will fire when the page loads and when the ref is attached
    console.log('[DEBUG] agreementPrintRef value changed:', agreementPrintRef.current);
  }, [agreementPrintRef.current]);
  // --- END NEW DEBUG ---

  const handleApprove = async () => {
    const isConsignment = po.poType === 'Consignment';
    const title = isConsignment ? 'Approve Consignment Order?' : 'Approve Supplier Changes?';
    const message = isConsignment
      ? 'This will lock in the items and costs, and set the status to "Awaiting Agreement Upload". This action cannot be undone.'
      : 'This will finalize the item costs and quantities. Unavailable items will be removed. This action cannot be undone.';
    
    const isConfirmed = await confirm(title, message);
    
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

  const handlePrintAgreement = useReactToPrint({
    content: () => {
      // This console.log is the one that matters on click
      console.log('[DEBUG] Print Agreement Clicked. Ref content is:', agreementPrintRef.current);
      return agreementPrintRef.current;
    },
    documentTitle: `Consignment_Agreement_${po?.poNumber}_${po?.supplier?.name}`.replace(/ /g, '_'),
  });

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
      navigator.clipboard.writeText(link).then(() => {
        toast.success('Supplier link copied to clipboard!');
      }, (err) => {
        toast.error('Failed to copy link.');
        console.error('Copy failed:', err);
      });
    }
  };

  const handleOpenImageView = (imageUrl) => {
    if (!imageUrl) return;
    if (imageUrl.startsWith('data:image')) {
      setImageViewUrl(imageUrl);
    } else {
      const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      setImageViewUrl(`${imageBaseUrl}${imageUrl}`);
    }
    setIsImageViewOpen(true);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
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
  const receiptImageUrl = po?.deliveryReceiptUrl;
  const signedAgreementUrl = po?.signedAgreementUrl;
  
  const canReceiveStock = po.poType === 'Consignment'
    ? po.status === 'Agreement Uploaded - Awaiting Delivery'
    : (po.status === 'Approved' || po.status === 'Partially Received');
  
  const cannotReceiveReason = po.poType === 'Consignment' && po.status !== 'Agreement Uploaded - Awaiting Delivery'
    ? 'Must upload signed agreement before receiving stock.'
    : 'Order is not in an "Approved" or "Partially Received" state.';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <Box 
        sx={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '-9999px', 
          opacity: 0, 
          overflow: 'hidden',
          width: '1px',
          height: '1px',
          display: 'block' 
        }}
      >
        <ConsignmentAgreementPrint ref={agreementPrintRef} poData={po} />
      </Box>

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

      <Dialog open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} maxWidth="md" fullWidth>
        <DialogContent><PurchaseOrderPrintout poData={po} ref={printoutRef} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPrintModalOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Print / Download PDF</Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <div>
            <Typography variant="h4" gutterBottom>{po.poNumber}</Typography>
            <Typography variant="subtitle1" color="textSecondary">Order Date: {new Date(po.orderDate).toLocaleDateString()}</Typography>
            <Chip 
              label={po.poType === 'Consignment' ? 'Consignment Order' : 'Standard Purchase Order'}
              color={po.poType === 'Consignment' ? 'info' : 'default'}
              sx={{ mt: 1, fontWeight: 'bold' }}
            />
          </div>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/purchase-orders')}>Back to List</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => setIsPrintModalOpen(true)}>Print / Download PO</Button>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Typography variant="h6">Supplier Details</Typography>
            <Typography><strong>Name:</strong> {po.supplier.name}</Typography>
            <Typography><strong>Contact:</strong> {po.supplier.contactPerson || 'N/A'}</Typography>
             <Typography><strong>Email:</strong> {po.supplier.email || 'N/A'}</Typography>
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Typography variant="h6">Order Summary</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography><strong>Status:</strong></Typography> <StatusChip status={po.status} />
            </Box>
            <Typography><strong>Total Amount:</strong> {formatCurrency(po.totalAmount)}</Typography>
          </Grid>

          {supplierLink && ['Pending', 'Awaiting Approval'].includes(po.status) && (
            <Grid item size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon /> Supplier Review Link
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <MuiLink href={supplierLink} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all' }}>
                  {supplierLink}
                </MuiLink>
                <Tooltip title="Copy Link">
                  <IconButton size="small" onClick={handleCopyLink}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="textSecondary">
                This link {po.supplier.email ? `was sent to the supplier's email (${po.supplier.email}).` : 'could not be sent automatically (no supplier email).'} You can copy and send it manually.
              </Typography>
            </Grid>
          )}

          {po.poType === 'Consignment' && (
            <Grid item size={{ xs: 12 }}>
              <Card variant="outlined" sx={{ borderColor: 'info.main' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="info" />
                    Consignment Agreement
                  </Typography>
                  {po.status === 'Pending' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Agreement cannot be uploaded until the supplier review is completed or approved.</Alert>
                  )}
                  {signedAgreementUrl ? (
                    <MuiLink
                      component="button"
                      variant="body1"
                      onClick={() => handleOpenImageView(signedAgreementUrl)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}
                    >
                      <ImageIcon color="primary" />
                      View Uploaded Agreement
                    </MuiLink>
                  ) : (
                    <Typography color="text.secondary">No signed agreement has been uploaded yet.</Typography>
                  )}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'flex-start', gap: 2 }}>
                  <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintAgreement}>
                    Print Agreement
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<FileUploadIcon />}
                    onClick={() => setIsUploadModalOpen(true)}
                    disabled={po.status === 'Pending' || po.status === 'Cancelled' || po.status === 'Completed' || !!signedAgreementUrl}
                  >
                    Upload Signed Agreement
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )}

          {receiptImageUrl && (
            <Grid item size={{ xs: 12 }}>
              <Typography variant="h6">Attachments</Typography>
              <MuiLink
                component="button"
                variant="body1"
                onClick={() => handleOpenImageView(receiptImageUrl)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', textAlign: 'left' }}
              >
                <ImageIcon />
                View Uploaded Receipt
              </MuiLink>
            </Grid>
          )}
        </Grid>

        {po.status === 'Awaiting Approval' && po.supplierNotes && (
          <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
            <Typography variant="h6" component="div">Notes from Supplier</Typography>
            {po.supplierNotes}
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Items</Typography>
        <TableContainer component={Paper} variant="outlined">
           <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell align="right">Ordered</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {po.items.map((item, index) => {
                const isChanged = po.status === 'Awaiting Approval' && typeof item.supplierUpdatedCost === 'number' && item.supplierUpdatedCost !== item.cost;
                const isUnavailable = po.status === 'Awaiting Approval' && !item.isAvailable;

                return (
                  <TableRow
                    key={index}
                    sx={isUnavailable ? { textDecoration: 'line-through', color: 'text.disabled', '& .MuiTableCell-root': { color: 'inherit' } } : {}}
                  ><TableCell>{item.product?.name || 'Product not found'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantityReceived || 0}</TableCell>
                    <TableCell align="right">
                      {isChanged ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                          <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
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
                    <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
                {po.status === 'Awaiting Approval' && (
                    <>
                        <Typography>This PO is awaiting your approval.</Typography>
                        <Button variant="contained" color="primary" startIcon={<ThumbUpIcon />} onClick={handleApprove}>
                            Approve Supplier Changes
                        </Button>
                    </>
                )}
                
                {po.status !== 'Completed' && po.status !== 'Cancelled' && po.status !== 'Awaiting Approval' && (
                  <Tooltip title={!canReceiveStock ? cannotReceiveReason : ''}>
                    <span>
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<InventoryIcon />} 
                        onClick={() => setIsReceiveModalOpen(true)}
                        disabled={!canReceiveStock}
                      >
                        Receive Stock
                      </Button>
                    </span>
                  </Tooltip>
                )}

                {po.status === 'Completed' && (
                    <Typography variant="h6" color="success.main">This order is complete.</Typography>
                )}
                 {po.status === 'Cancelled' && (
                    <Typography variant="h6" color="error.main">This order was cancelled.</Typography>
                )}
            </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PurchaseOrderDetailPage;