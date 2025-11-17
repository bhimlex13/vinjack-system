// client/src/components/ConsignmentAgreementPrint.js
import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Paper } from '@mui/material';

const PrintStyles = () => (
  <style type="text/css">
    {`
      @media print {
        body * {
          visibility: hidden;
        }
        #print-agreement, #print-agreement * {
          visibility: visible;
        }
        #print-agreement {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 20px;
        }
      }
    `}
  </style>
);

// --- UPDATED: Wrap component in React.forwardRef ---
// It now accepts 'props' (which is {poData}) and 'ref' as the second argument
const ConsignmentAgreementPrint = React.forwardRef(({ poData }, ref) => {
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    // --- UPDATED: Attach the forwarded 'ref' here ---
    <Box ref={ref} id="print-agreement" sx={{ p: 4, fontFamily: 'Times New Roman, Times, serif', color: '#000', backgroundColor: '#fff' }}>
      <PrintStyles />
      
      {poData ? (
        <>
          <Box sx={{ textAlign: 'center', borderBottom: '2px solid #000', pb: 2, mb: 3 }}>
            <Typography variant="h3" sx={{ fontFamily: 'inherit' }}>Consignment Agreement</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>PO Number:</strong> {poData.poNumber}</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Agreement Date:</strong> {today}</Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Typography variant="h5" sx={{ fontFamily: 'inherit', borderBottom: '1px solid #666', pb: 1, mb: 1 }}>Consignor (Supplier)</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Name:</strong> {poData.supplier?.name}</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Contact:</strong> {poData.supplier?.contactPerson || 'N/A'}</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Email:</strong> {poData.supplier?.email || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="h5" sx={{ fontFamily: 'inherit', borderBottom: '1px solid #666', pb: 1, mb: 1 }}>Consignee (Shop)</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Name:</strong> VinJack Motorworks</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Contact:</strong> Ms. Jackielou M. Manlapaz</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt' }}><strong>Address:</strong> Nangka, Marikina City</Typography>
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontFamily: 'inherit', borderBottom: '1px solid #666', pb: 1, mb: 1 }}>Terms and Conditions</Typography>
            <Typography variant="body1" component="p" sx={{ fontFamily: 'inherit', fontSize: '12pt', lineHeight: 1.5, mb: 2 }}>
              This agreement is made on {today} between the Consignor and the Consignee for the goods listed below.
            </Typography>
            <Box component="ol" sx={{ pl: 4, fontFamily: 'inherit', fontSize: '12pt' }}>
              <Box component="li" sx={{ mb: 1, lineHeight: 1.5 }}>The Consignor agrees to supply the Consignee with the items listed below on a consignment basis.</Box>
              <Box component="li" sx={{ mb: 1, lineHeight: 1.5 }}>The items remain the property of the Consignor until sold.</Box>
              <Box component="li" sx={{ mb: 1, lineHeight: 1.5 }}>The Consignee agrees to pay the Consignor the "Unit Cost" for each item only after that item has been sold to a final customer.</Box>
              <Box component="li" sx={{ mb: 1, lineHeight: 1.5 }}>The Consignee shall report all sales of consigned items and remit payment to the Consignor on a mutually agreed-upon schedule.</Box>
              <Box component="li" sx={{ mb: 1, lineHeight: 1.5 }}>The Consignee is responsible for any loss or damage to the items while in their possession.</Box>
            </Box>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'inherit', borderBottom: '1px solid #666', pb: 1, mb: 2 }}>Consigned Items</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid #000', boxShadow: 'none' }}>
              <Table size="small" sx={{ '& th, & td': { border: '1px solid #000', color: '#000', fontFamily: 'inherit', fontSize: '11pt' } }}>
                <TableHead sx={{ backgroundColor: '#f0f0f0' }}>
                  <TableRow><TableCell>Item Code</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Cost</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {poData.items && poData.items.map((item) => (
                    <TableRow key={item.product?._id || item.product}><TableCell>{item.product?.itemCode || 'N/A'}</TableCell>
                      <TableCell>{item.product?.name || 'N/A'}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow><TableCell colSpan={3} />
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '13pt !important' }}>Grand Total Value:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '13pt !important', borderTop: '2px solid #000' }}>{formatCurrency(poData.totalAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box sx={{ mt: 8 }}>
            <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'center', mb: 4 }}>
              By signing below, both parties agree to the terms of this consignment agreement.
            </Typography>
            <Grid container spacing={3} sx={{ mt: 4 }}>
              <Grid item xs={6} sx={{ textAlign: 'center', mt: 4 }}>
                <Box sx={{ borderBottom: '1px solid #000', mx: 4, mb: 1 }} />
                <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '11pt' }}>{poData.supplier?.name}</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '11pt' }}>(Consignor / Supplier)</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'center', mt: 4 }}>
                <Box sx={{ borderBottom: '1px solid #000', mx: 4, mb: 1 }} />
                <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '11pt' }}>Ms. Jackielou M. Manlapaz</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'inherit', fontSize: '11pt' }}>(Consignee / VinJack Motorworks)</Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <Typography>Loading Agreement...</Typography>
      )}
    </Box>
  );
});
// --- END UPDATED ---

export default ConsignmentAgreementPrint;