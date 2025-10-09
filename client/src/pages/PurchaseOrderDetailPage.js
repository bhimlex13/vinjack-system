// client/src/pages/PurchaseOrderDetailPage.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, approveSupplierChanges } from '../api/purchaseOrderApi';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import PurchaseOrderPrintout from '../components/PurchaseOrderPrintout';
import ReceiveStockModal from '../components/ReceiveStockModal'; // --- ADDED: Import the new modal ---

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Dialog, DialogContent, DialogActions, Chip, Link as MuiLink
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoIcon from '@mui/icons-material/Info';
import ReceiptIcon from '@mui/icons-material/Receipt'; // --- ADDED: More icons ---
import InventoryIcon from '@mui/icons-material/Inventory';


const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false); // --- ADDED: State for the receive modal ---
  const printoutRef = useRef();

  const fetchPo = async () => {
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
  };

  useEffect(() => {
    fetchPo();
  }, [id]);
  
  const handleApprove = async () => {
    const isConfirmed = await confirm(
      'Approve Supplier Changes?',
      'This will finalize the item costs and quantities. Unavailable items will be removed. This action cannot be undone.'
    );
    if (isConfirmed) {
      try {
        await approveSupplierChanges(id);
        toast.success('Purchase Order has been approved!');
        fetchPo(); // Refresh the data to show the new "Approved" status
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
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
        'Partially Received': { label: 'Partially Received', color: 'secondary' }
    };
    const style = statusStyles[status] || { label: status, color: 'default' };
    return <Chip label={style.label} color={style.color} sx={{ fontWeight: 'bold' }}/>;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* --- ADDED: Render the new ReceiveStockModal --- */}
      <ReceiveStockModal
        open={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        poData={po}
        onSuccess={() => {
          fetchPo(); // Refresh the page data after receiving stock
        }}
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
          </div>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/purchase-orders')}>Back to List</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => setIsPrintModalOpen(true)}>Print / Download PO</Button>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Supplier Details</Typography>
            <Typography><strong>Name:</strong> {po.supplier.name}</Typography>
            <Typography><strong>Contact:</strong> {po.supplier.contactPerson || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Order Summary</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography><strong>Status:</strong></Typography> <StatusChip status={po.status} />
            </Box>
            <Typography><strong>Total Amount:</strong> {formatCurrency(po.totalAmount)}</Typography>
          </Grid>

            {/* --- ADDED: Section to display uploaded receipt if it exists --- */}
            {po.receiptImageUrl && (
                <Grid item xs={12}>
                    <Typography variant="h6">Attachments</Typography>
                    <MuiLink href={`http://localhost:5000${po.receiptImageUrl}`} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReceiptIcon />
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
                  >
                    <TableCell>{item.product.name}</TableCell>
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

        {/* --- MODIFIED: Action box now handles multiple statuses --- */}
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
                {(po.status === 'Approved' || po.status === 'Partially Received') && (
                    <>
                        <Typography>Order approved. Ready to receive stock.</Typography>
                        <Button variant="contained" color="success" startIcon={<InventoryIcon />} onClick={() => setIsReceiveModalOpen(true)}>
                            Receive Stock
                        </Button>
                    </>
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