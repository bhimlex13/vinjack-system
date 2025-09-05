// client/src/components/ReceiptModal.js
import React, { useRef } from 'react';

// MUI Imports
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

const ReceiptModal = ({ saleData, onClose }) => {
  const receiptRef = useRef();

  const handlePrint = () => {
    const printContents = receiptRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    // We reload to make sure the app state is correctly restored after printing.
    window.location.reload(); 
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 0 }}>
        <Box
          ref={receiptRef}
          sx={{
            p: 3,
            fontFamily: '"Courier New", Courier, monospace',
            color: '#333',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              VinJack System
            </Typography>
            <Typography variant="body2">Official Receipt</Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />
          <Box sx={{ mb: 2, fontSize: '0.9rem' }}>
            <Typography variant="body2">
              <strong>Sale ID:</strong> {saleData._id}
            </Typography>
            <Typography variant="body2">
              <strong>Date:</strong>{' '}
              {new Date(saleData.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>Cashier:</strong> {saleData.recordedBy?.fullName || 'N/A'}
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Item</TableCell>
                  <TableCell align="center" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {saleData.items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell sx={{ p: '4px 0', border: 'none' }}>
                      {item.product?.name || 'N/A'}
                      <br />
                      <Typography variant="caption">
                        @{item.priceAtTime.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ p: '4px 0', border: 'none' }}>{item.quantity}</TableCell>
                    <TableCell align="right" sx={{ p: '4px 0', border: 'none' }}>
                      {(item.quantity * item.priceAtTime).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '1.2rem',
            }}
          >
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6">
              ₱{saleData.totalAmount.toFixed(2)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
            Thank you for your purchase!
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
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