// client/src/components/ConsignmentAgreementPrint.js
import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid } from '@mui/material';

const PrintStyles = () => (
  <style type="text/css">
    {`
      @media print {
        @page {
          size: A4;
          margin: 20mm;
        }
        html, body {
          height: auto;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #fff;
        }
        /* Ensure text is black for formal documents */
        * {
          color: #000 !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        /* Force table borders to show */
        .MuiTableCell-root {
          border-bottom: 1px solid #000 !important;
        }
        .agreement-table, .agreement-table th, .agreement-table td {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }
      }
    `}
  </style>
);

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
    <Box ref={ref} sx={{ p: 4, backgroundColor: '#fff', minHeight: '100vh', color: '#000' }}>
      <PrintStyles />
      
      {poData ? (
        <>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1, fontFamily: 'Times New Roman' }}>
              Consignment Agreement
            </Typography>
            <Typography variant="subtitle1" sx={{ fontFamily: 'Times New Roman' }}>
              Reference PO#: <strong>{poData.poNumber}</strong>
            </Typography>
            <Typography variant="subtitle2" sx={{ fontFamily: 'Times New Roman' }}>
              Date: {today}
            </Typography>
            <Box sx={{ borderBottom: '2px solid #000', mt: 2, mb: 2 }} />
          </Box>

          {/* Parties Involved - UPDATED GRID SYNTAX HERE */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h6" sx={{ textDecoration: 'underline', mb: 1, fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>
                CONSIGNOR (Supplier)
              </Typography>
              <Box sx={{ fontSize: '11pt', lineHeight: 1.6, fontFamily: 'Times New Roman' }}>
                <div style={{ fontWeight: 'bold' }}>{poData.supplier?.name}</div>
                <div>{poData.supplier?.contactPerson || ''}</div>
                <div>{poData.supplier?.email || ''}</div>
                <div>{poData.supplier?.contactNumber || ''}</div>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h6" sx={{ textDecoration: 'underline', mb: 1, fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>
                CONSIGNEE (Shop)
              </Typography>
              <Box sx={{ fontSize: '11pt', lineHeight: 1.6, fontFamily: 'Times New Roman' }}>
                <div style={{ fontWeight: 'bold' }}>VinJack Motorworks</div>
                <div>Ms. Jackielou M. Manlapaz</div>
                <div>Nangka, Marikina City</div>
              </Box>
            </Grid>
          </Grid>

          {/* Terms */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>TERMS AND CONDITIONS:</Typography>
            <Box component="ol" sx={{ pl: 3, fontSize: '11pt', lineHeight: 1.5, margin: 0, fontFamily: 'Times New Roman' }}>
              <li style={{ marginBottom: '8px' }}>The Consignor agrees to place the items listed below with the Consignee for sale on a consignment basis.</li>
              <li style={{ marginBottom: '8px' }}>Ownership of the items remains with the Consignor until they are sold to a customer.</li>
              <li style={{ marginBottom: '8px' }}>The Consignee agrees to pay the Consignor the "Unit Cost" indicated below only upon the successful sale of the item.</li>
              <li style={{ marginBottom: '8px' }}>The Consignee assumes responsibility for the safekeeping of the items while in their possession.</li>
              <li style={{ marginBottom: '8px' }}>Unsold items may be returned to the Consignor at any time by the Consignee, or recalled by the Consignor upon reasonable notice.</li>
            </Box>
          </Box>

          {/* Items Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>CONSIGNED ITEMS:</Typography>
            <TableContainer>
              <Table size="small" className="agreement-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', fontFamily: 'Times New Roman' }}>Item Code</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', fontFamily: 'Times New Roman' }}>Product Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', fontFamily: 'Times New Roman' }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', fontFamily: 'Times New Roman' }}>Agreed Unit Cost</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', fontFamily: 'Times New Roman' }}>Total Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {poData.items && poData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontFamily: 'Times New Roman' }}>{item.product?.itemCode || 'N/A'}</TableCell>
                      <TableCell sx={{ fontFamily: 'Times New Roman' }}>{item.product?.name || 'N/A'}</TableCell>
                      <TableCell align="center" sx={{ fontFamily: 'Times New Roman' }}>{item.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Times New Roman' }}>{formatCurrency(item.cost)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Times New Roman' }}>{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'Times New Roman' }}>TOTAL VALUE:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'Times New Roman' }}>{formatCurrency(poData.totalAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Signatures - UPDATED GRID SYNTAX HERE */}
          <Box sx={{ mt: 8, pageBreakInside: 'avoid' }}>
            <Typography variant="body1" sx={{ fontSize: '11pt', textAlign: 'center', mb: 6, fontStyle: 'italic', fontFamily: 'Times New Roman' }}>
              IN WITNESS WHEREOF, the parties have executed this Consignment Agreement as of the date first above written.
            </Typography>
            
            <Grid container spacing={8}>
              <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ borderBottom: '1px solid #000', width: '80%', mx: 'auto', mb: 1 }} />
                <Typography sx={{ fontSize: '11pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>{poData.supplier?.name}</Typography>
                <Typography sx={{ fontSize: '10pt', fontFamily: 'Times New Roman' }}>CONSIGNOR</Typography>
              </Grid>
              <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ borderBottom: '1px solid #000', width: '80%', mx: 'auto', mb: 1 }} />
                <Typography sx={{ fontSize: '11pt', fontWeight: 'bold', fontFamily: 'Times New Roman' }}>Ms. Jackielou M. Manlapaz</Typography>
                <Typography sx={{ fontSize: '10pt', fontFamily: 'Times New Roman' }}>CONSIGNEE (VinJack Motorworks)</Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <Typography>Loading Data...</Typography>
      )}
    </Box>
  );
});

export default ConsignmentAgreementPrint;