// client/src/components/ReceiptModal.js
import React from 'react';
import jsPDF from 'jspdf';

// MUI Imports
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Link as MuiLink
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ImageIcon from '@mui/icons-material/Image';

const ReceiptModal = ({ open, saleData, onClose, onViewImage }) => {

  const handlePrint = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] 
    });

    const pageWidth = 80;
    let yPos = 10;
    
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("VinJack System", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text("Official Receipt", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;

    doc.setFontSize(8);
    doc.text("--------------------------------", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;

    // Sale Details
    doc.text(`Sale ID: ${saleData?._id?.slice(-8) || 'N/A'}`, 5, yPos);
    yPos += 4;
    doc.text(`Date: ${saleData?.createdAt ? new Date(saleData.createdAt).toLocaleDateString() : 'N/A'}`, 5, yPos);
    yPos += 4;
    doc.text(`Cashier: ${saleData?.recordedBy?.fullName || 'Admin'}`, 5, yPos);
    yPos += 5;

    if (saleData?.customer) {
      doc.text(`Cust: ${saleData.customer.name}`, 5, yPos);
      yPos += 4;
    }
    
    doc.text("--------------------------------", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;

    // Items Header
    doc.setFont("courier", "bold");
    doc.text("Item", 5, yPos);
    doc.text("Qty", 45, yPos, { align: "right" });
    doc.text("Total", 75, yPos, { align: "right" });
    yPos += 4;
    doc.setFont("courier", "normal");

    // Items Loop
    if (saleData?.items) {
      saleData.items.forEach(item => {
        const name = item.product?.name || 'Item';
        const nameLines = doc.splitTextToSize(name, 40);
        doc.text(nameLines, 5, yPos);
        
        doc.text(`${item.quantity}`, 45, yPos, { align: "right" });
        const lineTotal = (item.quantity * (item.priceAtTime || 0)).toFixed(2);
        doc.text(lineTotal, 75, yPos, { align: "right" });
        
        yPos += (nameLines.length * 4);

        // --- NEW: Print Serials on Receipt ---
        if (item.serialNumbers && item.serialNumbers.length > 0) {
            doc.setFontSize(7);
            const serials = `SN: ${item.serialNumbers.join(', ')}`;
            const serialLines = doc.splitTextToSize(serials, 40);
            doc.text(serialLines, 5, yPos);
            yPos += (serialLines.length * 3) + 2; // Add spacing
            doc.setFontSize(8);
        } else {
            yPos += 2;
        }
        // --- END NEW ---
      });
    }

    // Services Loop
    if (saleData?.services) {
      saleData.services.forEach(service => {
        const name = service.service?.name || 'Service';
        const nameLines = doc.splitTextToSize(name, 40);
        doc.text(nameLines, 5, yPos);
        doc.text("1", 45, yPos, { align: "right" });
        const lineTotal = (service.priceAtTime || 0).toFixed(2);
        doc.text(lineTotal, 75, yPos, { align: "right" });
        yPos += (nameLines.length * 4) + 2;
      });
    }

    doc.text("--------------------------------", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;

    // Total
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", 5, yPos);
    doc.text(`P ${saleData?.totalAmount?.toFixed(2)}`, 75, yPos, { align: "right" });
    yPos += 10;

    doc.setFont("courier", "italic");
    doc.setFontSize(8);
    doc.text("Thank you for your purchase!", pageWidth / 2, yPos, { align: "center" });

    doc.output('dataurlnewwindow');
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, fontFamily: '"Courier New", Courier, monospace', color: '#333' }}>
          <Box className="header-text" sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">VinJack System</Typography>
            <Typography variant="body2">Official Receipt</Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />

          <Box className="details-text" sx={{ mb: 2, fontSize: '0.9rem' }}>
            <Typography variant="body2"><strong>Sale ID:</strong> {saleData?._id?.slice(-8) || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Date:</strong> {saleData?.createdAt ? new Date(saleData.createdAt).toLocaleString() : 'N/A'}</Typography>
            <Typography variant="body2"><strong>Cashier:</strong> {saleData?.recordedBy?.fullName || 'N/A'}</Typography>
            {saleData?.customer && (<Typography variant="body2"><strong>Customer:</strong> {saleData.customer.name}</Typography>)}
            {saleData?.motorcycle && (<Typography variant="body2"><strong>Vehicle:</strong> {`${saleData.motorcycle.make} ${saleData.motorcycle.model}`}</Typography>)}
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Item</TableCell>
                  <TableCell align="center" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ p: '4px 0', borderBottom: '1px solid #666' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hasItems && saleData.items.map((item) => (
                  <TableRow key={`prod-${item.product?._id || item._id}`}>
                    <TableCell sx={{ p: '4px 0', border: 'none' }}>
                      {item.product?.name || 'N/A'}
                      {/* --- NEW: Show Serial Numbers on Screen --- */}
                      {item.serialNumbers && item.serialNumbers.length > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary">
                            SN: {item.serialNumbers.join(', ')}
                        </Typography>
                      )}
                      {/* --- END NEW --- */}
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
                      {service.service?.name || 'Service'}
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