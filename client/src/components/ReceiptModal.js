// client/src/components/ReceiptModal.js
import React, { useRef } from 'react';

// MUI Imports
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Link as MuiLink
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ImageIcon from '@mui/icons-material/Image';

// --- MODIFIED: Added 'open' prop ---
const ReceiptModal = ({ open, saleData, onClose, onViewImage }) => {
  const receiptRef = useRef();

  const handlePrint = () => {
    // (Print logic remains unchanged)
    const printContents = receiptRef.current.innerHTML;
    const styles = `
      <style>
        @media print {
          body { font-family: "Courier New", Courier, monospace; color: #333; margin: 0; padding: 20px; }
          .print-container { width: 100%; max-width: 300px; margin: auto; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { text-align: left; padding: 2px 0; border: none; font-size: 0.8rem; }
          th { border-bottom: 1px dashed #666; }
          td:last-child, th:last-child { text-align: right; }
          td:nth-child(2), th:nth-child(2) { text-align: center; }
          .total-section { display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; margin-top: 10px; }
          .footer-text { text-align: center; margin-top: 15px; font-size: 0.8rem; }
          .header-text { text-align: center; margin-bottom: 10px; }
          .details-text { margin-bottom: 10px; font-size: 0.8rem; }
          .receipt-link { display: none; }
          hr { border: none; border-top: 1px dashed #666; margin: 10px 0; }
        }
      </style>
    `;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = styles + `<div class="print-container">${printContents}</div>`;
    window.print();
    document.body.innerHTML = originalContents;
  };

  const hasItems = saleData?.items && saleData.items.length > 0;
  const hasServices = saleData?.services && saleData.services.length > 0;
  const imageUrlPath = saleData?.customerReceiptImage;

  const handleImageViewClick = (e) => {
    e.preventDefault();
    if (onViewImage && imageUrlPath) {
      onViewImage(imageUrlPath);
    }
  };

  return (
    // --- THIS IS THE FIX: Use the 'open' prop instead of 'open={true}' ---
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    {/* --- END FIX --- */}
      <DialogContent sx={{ p: 0 }}>
        <Box ref={receiptRef} sx={{ p: 3, fontFamily: '"Courier New", Courier, monospace', color: '#333' }}>
          {/* Receipt Header */}
          <Box className="header-text" sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">VinJack System</Typography>
            <Typography variant="body2">Official Receipt</Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />

          {/* Sale Details */}
          <Box className="details-text" sx={{ mb: 2, fontSize: '0.9rem' }}>
            <Typography variant="body2"><strong>Sale ID:</strong> {saleData?._id || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Date:</strong> {saleData?.createdAt ? new Date(saleData.createdAt).toLocaleString() : 'N/A'}</Typography>
            <Typography variant="body2"><strong>Cashier:</strong> {saleData?.recordedBy?.fullName || 'N/A'}</Typography>
            {saleData?.customer && (<Typography variant="body2"><strong>Customer:</strong> {saleData.customer.name}</Typography>)}
            {saleData?.motorcycle && (<Typography variant="body2"><strong>Vehicle:</strong> {`${saleData.motorcycle.make} ${saleData.motorcycle.model} (${saleData.motorcycle.plateNumber || 'No Plate'})`}</Typography>)}
          </Box>

          {/* Items and Services Table */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Item / Service</TableCell>
                  <TableCell align="center" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hasItems && saleData.items.map((item) => (
                  <TableRow key={`prod-${item.product?._id || item._id}`}>
                    <TableCell sx={{ p: '4px 0', border: 'none' }}>
                      {item.product?.name || 'N/A'}
                      <br />
                      <Typography variant="caption">
                        @{item.priceAtTime?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ p: '4px 0', border: 'none' }}>{item.quantity || 0}</TableCell>
                    <TableCell align="right" sx={{ p: '4px 0', border: 'none' }}>
                      {((item.quantity || 0) * (item.priceAtTime || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}

                {hasServices && saleData.services.map((service) => (
                  <TableRow key={`serv-${service.service?._id || service._id}`}>
                    <TableCell sx={{ p: '4px 0', border: 'none' }}>
                      {service.service?.name || 'N/A'} {/* Access name here */}
                      <br />
                      <Typography variant="caption">
                        (Service Charge)
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ p: '4px 0', border: 'none' }}>1</TableCell>
                    <TableCell align="right" sx={{ p: '4px 0', border: 'none' }}>
                      {service.priceAtTime?.toFixed(2) || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </TableContainer>

          {imageUrlPath && (
            <Box className="receipt-link" sx={{ mt: 2, fontSize: '0.9rem' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Attached Receipt:</Typography>
              <MuiLink
                href="#" 
                onClick={handleImageViewClick} 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              >
                 <ImageIcon fontSize="small" /> View Uploaded Image
              </MuiLink>
            </Box>
          )}

          {/* Total Amount and Footer */}
          <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
          <Box
            className="total-section"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '1.2rem',
            }}
          >
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6">
              ₱{(saleData?.totalAmount || 0).toFixed(2)}
            </Typography>
          </Box>
          <Typography className="footer-text" variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
            Thank you for your purchase!
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        {/* This button correctly calls the onClose from props */}
        <Button onClick={onClose}>Close</Button> 
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print Receipt
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptModal;