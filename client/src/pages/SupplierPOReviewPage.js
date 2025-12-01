// client/src/pages/SupplierPOReviewPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPurchaseOrderByToken, updateBySupplier } from '../api/purchaseOrderApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Checkbox, FormControlLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText, Divider, Tooltip,
  Step, Stepper, StepLabel, StepContent
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile'; 
import DownloadIcon from '@mui/icons-material/Download';     
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';

import LoadingSpinner from '../components/LoadingSpinner';

const SupplierPOReviewPage = () => {
  const { token } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [submittedLocal, setSubmittedLocal] = useState(false);

  const [items, setItems] = useState([]);
  const [supplierNotes, setSupplierNotes] = useState('');
  
  const [signedAgreementFile, setSignedAgreementFile] = useState(null);

  const [isGuideOpen, setIsGuideOpen] = useState(false); 
  const [detailsConfirmed, setDetailsConfirmed] = useState(false); 
  const [pdfDownloaded, setPdfDownloaded] = useState(false); 

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        setLoading(true);
        const poData = await getPurchaseOrderByToken(token);
        setPo(poData);
        
        const initialItems = poData.items.map(item => ({
          ...item,
          supplierUpdatedCost: item.cost,
          isAvailable: true,
        }));
        setItems(initialItems);

        if (poData.status === 'Pending') {
            setIsGuideOpen(true);
        }

        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load the Purchase Order.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [token]);

  const handleItemChange = (productId, field, value) => {
    if (detailsConfirmed) setDetailsConfirmed(false);
    if (pdfDownloaded) setPdfDownloaded(false);

    setItems(items.map(item =>
      item.product._id === productId ? { ...item, [field]: value } : item
    ));
  };

  const generateAgreementPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("CONSIGNMENT AGREEMENT", 105, 20, null, null, "center");
    doc.setFontSize(10);
    doc.text(`Reference PO#: ${po.poNumber}`, 105, 28, null, null, "center");
    
    const dateIssued = new Date(po.orderDate).toLocaleDateString();
    const dateAccepted = new Date().toLocaleDateString();
    doc.text(`Date Issued: ${dateIssued}`, 105, 34, null, null, "center");
    doc.text(`Date Accepted: ${dateAccepted}`, 105, 39, null, null, "center");

    let yPos = 50; 
    doc.setFontSize(11);
    doc.text("CONSIGNOR (Supplier):", 14, yPos);
    doc.setFontSize(10);
    doc.text(po.supplier.name, 14, yPos + 7);

    doc.setFontSize(11);
    doc.text("CONSIGNEE (VinJack Motorworks):", 120, yPos);
    doc.setFontSize(10);
    doc.text("VinJack Motorworks", 120, yPos + 7);
    doc.text("Nangka, Marikina City", 120, yPos + 12);

    yPos += 25;
    doc.setFontSize(11);
    doc.text("TERMS AND CONDITIONS:", 14, yPos);
    doc.setFontSize(10);
    const splitTerms = doc.splitTextToSize(po.termsAndConditions || "Standard consignment terms apply.", 180);
    doc.text(splitTerms, 14, yPos + 7);

    let finalY = (yPos + 7) + (splitTerms.length * 5) + 10;

    const tableColumn = ["Item Code", "Product Name", "Qty", "Unit Cost", "Total Value"];
    const tableRows = [];
    let grandTotal = 0;
    items.forEach(item => {
        if(item.isAvailable) {
            const cost = item.supplierUpdatedCost;
            const total = item.quantity * cost;
            grandTotal += total;
            tableRows.push([item.product.itemCode, item.product.name, item.quantity, `P ${cost.toFixed(2)}`, `P ${total.toFixed(2)}`]);
        }
    });

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: finalY, theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' } });
    finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`TOTAL CONSIGNMENT VALUE: P ${grandTotal.toFixed(2)}`, 195, finalY, null, null, "right");

    finalY += 30;
    doc.text("__________________________", 14, finalY);
    doc.text("Signature over Printed Name", 14, finalY + 5);
    doc.text("(Consignor / Supplier)", 14, finalY + 10);
    doc.text("__________________________", 130, finalY);
    doc.text("Signature over Printed Name", 130, finalY + 5);
    doc.text("(Consignee / Owner)", 130, finalY + 10);

    doc.save(`Consignment_Agreement_${po.poNumber}.pdf`);
    setPdfDownloaded(true);
    toast.info("Agreement downloaded. Please sign and upload it to proceed.");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast.error('Please upload a PDF or an Image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { 
        toast.error('File size must be less than 5MB.');
        return;
      }
      setSignedAgreementFile(file);
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

  const handleFinalSubmit = async () => {
    if (po.poType === 'Consignment' && po.consignmentMethod === 'System' && !signedAgreementFile) {
        toast.error("Please upload the signed consignment agreement before submitting.");
        setIsConfirmModalOpen(false);
        return;
    }

    setIsConfirmModalOpen(false); 
    setSubmitting(true);
    try {
      let signedAgreementUrl = '';
      if (signedAgreementFile) {
          signedAgreementUrl = await convertToBase64(signedAgreementFile);
      }
      const submissionData = {
        items: items.map(item => ({
          product: item.product._id,
          supplierUpdatedCost: item.supplierUpdatedCost,
          isAvailable: item.isAvailable,
        })),
        supplierNotes: supplierNotes,
        signedAgreementUrl: signedAgreementUrl 
      };

      await updateBySupplier(token, submissionData);
      setSubmittedLocal(true);
      
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
      console.error(err);
      setSubmitting(false);
    }
  };

  const summaryData = useMemo(() => {
    const priceChanges = items.filter(item => item.isAvailable && item.supplierUpdatedCost !== item.cost);
    const unavailableItems = items.filter(item => !item.isAvailable);
    return { priceChanges, unavailableItems };
  }, [items]);

  const getActiveStep = () => {
    if (!po) return 0;
    if (po.status === 'Pending') return 1;
    if (po.status === 'Awaiting Approval') return 2;
    if (po.status === 'Approved' || po.status === 'Agreement Uploaded - Awaiting Delivery') return 3; 
    if (po.status === 'Partially Received' || po.status === 'Completed') return 4; 
    return 0;
  };
  
  const steps = [
      'Agreement Issued by Owner',
      'Review & Upload Signed Agreement',
      'Owner Countersign & Approval',
      'Delivery & Receiving'
  ];

  const isSystemConsignment = po?.poType === 'Consignment' && po?.consignmentMethod === 'System';
  const isDownloadDisabled = isSystemConsignment && !detailsConfirmed;
  const isUploadDisabled = isSystemConsignment && (!detailsConfirmed || !pdfDownloaded);
  const isSubmitDisabled = submitting || (isSystemConsignment && !signedAgreementFile);
  const submitTooltip = isSystemConsignment && !signedAgreementFile ? "You must upload the signed agreement before submitting." : "";

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><LoadingSpinner text="Loading Order..." /></Box>;
  if (error) return <Container sx={{mt: 5}}><Alert severity="error">{error}</Alert></Container>;
  if (!po) return null;

  const isReadOnlyMode = po.status !== 'Pending' || submittedLocal;

  if (isReadOnlyMode) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Paper sx={{ p: 4 }} component={motion.div} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 70, mb: 2 }} />
            <Typography variant="h4" gutterBottom>Review Submitted</Typography>
            <Typography color="textSecondary">
                Your agreement has been submitted. Track the status below.
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Box sx={{ width: '100%', mb: 5 }}>
            <Stepper activeStep={getActiveStep()} alternativeLabel> 
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {items.length > 0 ? (
            <>
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Submission Summary</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                    <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Agreed Cost</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {po.items.map((item) => {
                            const displayCost = submittedLocal 
                                ? items.find(i => i.product._id === item.product._id)?.supplierUpdatedCost 
                                : item.cost;
                                
                            return (
                                <TableRow key={item.product._id}>
                                    <TableCell>{item.product.name}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">₱{Number(displayCost).toFixed(2)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    </Table>
                </TableContainer>

                {po.termsAndConditions && (
                    <>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GavelIcon fontSize="small"/> Agreed Terms & Conditions
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fafafa', maxHeight: 200, overflowY: 'auto' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                {po.termsAndConditions}
                            </Typography>
                        </Paper>
                    </>
                )}
            </>
          ) : (
            <Alert severity="info">Details are archived.</Alert>
          )}

        </Paper>
      </Container>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

      <Dialog open={isGuideOpen} onClose={() => setIsGuideOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIcon color="primary" /> Supplier Instructions
        </DialogTitle>
        <DialogContent>
            <Typography variant="body1" gutterBottom>Welcome to the VinJack Consignment Portal. Please follow these steps:</Typography>
            <List>
                <ListItem><ListItemText primary="1. Review Items" secondary="Update costs if needed." /></ListItem>
                <Divider component="li" />
                <ListItem><ListItemText primary="2. Confirm Details" secondary="Check the confirm box." /></ListItem>
                <Divider component="li" />
                <ListItem><ListItemText primary="3. Download Agreement" secondary="Download PDF." /></ListItem>
                <Divider component="li" />
                <ListItem><ListItemText primary="4. Sign & Upload" secondary="Upload signed PDF." /></ListItem>
                <Divider component="li" />
                <ListItem><ListItemText primary="5. Submit" secondary="Send to owner." /></ListItem>
            </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setIsGuideOpen(false)} variant="contained">I Understand</Button></DialogActions>
      </Dialog>

      <AnimatePresence>
        {isConfirmModalOpen && (
          <Dialog open={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Confirm Your Review</DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>Please review the summary before submitting.</Typography>
              {summaryData.priceChanges.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6">Price Adjustments:</Typography>
                  <List dense>
                    {summaryData.priceChanges.map(item => (
                      <ListItem key={item.product._id}>
                        <ListItemText primary={item.product.name} secondary={`₱${item.cost} -> ₱${item.supplierUpdatedCost}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              {(summaryData.priceChanges.length === 0 && summaryData.unavailableItems.length === 0) && (
                <Typography sx={{ mt: 2 }}>No changes made to items.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
              <Button onClick={handleFinalSubmit} variant="contained" disabled={submitting}>
                {submitting ? <CircularProgress size={24} /> : 'Confirm & Submit'}
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" gutterBottom>Purchase Order Review</Typography>
            <Button startIcon={<HelpIcon />} onClick={() => setIsGuideOpen(true)}>Help / Guide</Button>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item size={{ xs: 6 }}><Typography><strong>PO Number:</strong> {po.poNumber}</Typography></Grid>
            <Grid item size={{ xs: 6 }}><Typography><strong>From:</strong> {po.supplier.name}</Typography></Grid>
            <Grid item size={{ xs: 12 }}><Typography><strong>Type:</strong> {po.poType}</Typography></Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Requested Qty</TableCell>
                  <TableCell align="center">Proposed Cost</TableCell>
                  <TableCell align="center">Your Cost (Editable)</TableCell>
                  <TableCell align="center">Available?</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.product._id} sx={!item.isAvailable ? { backgroundColor: '#fafafa', '& > *': { color: 'text.disabled' } } : {}}>
                    <TableCell>{item.product.name} ({item.product.itemCode})</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="center">₱{item.cost.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        sx={{ maxWidth: 120 }}
                        value={item.supplierUpdatedCost}
                        onChange={(e) => handleItemChange(item.product._id, 'supplierUpdatedCost', parseFloat(e.target.value) || 0)}
                        inputProps={{ step: "0.01", min: 0 }}
                        disabled={!item.isAvailable} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.isAvailable}
                            onChange={(e) => handleItemChange(item.product._id, 'isAvailable', e.target.checked)}
                          />
                        }
                        label={item.isAvailable ? "Yes" : "No"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {po.poType === 'Consignment' && po.consignmentMethod === 'System' && (
            <Box sx={{ mt: 4, p: 3, border: '1px solid #ddd', borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom>Consignment Agreement Actions</Typography>
                <Stepper activeStep={!detailsConfirmed ? 0 : !pdfDownloaded ? 1 : !signedAgreementFile ? 2 : 3} orientation="vertical">
                    <Step active={true}> 
                        <StepLabel>Confirm Item Details</StepLabel>
                        <StepContent>
                            <FormControlLabel control={<Checkbox checked={detailsConfirmed} onChange={(e) => setDetailsConfirmed(e.target.checked)} color="primary" />} label={<Typography variant="body2">I confirm that the item prices and quantities listed above are correct and final.</Typography>} />
                        </StepContent>
                    </Step>
                    <Step active={detailsConfirmed}>
                        <StepLabel>Download Agreement</StepLabel>
                        <StepContent>
                            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={generateAgreementPDF} disabled={isDownloadDisabled} sx={{ mt: 1 }}>Download Agreement PDF</Button>
                        </StepContent>
                    </Step>
                    <Step active={pdfDownloaded}>
                        <StepLabel>Upload Signed Document</StepLabel>
                        <StepContent>
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Button component="label" variant="contained" color="secondary" startIcon={<UploadFileIcon />} disabled={isUploadDisabled}>Upload Signed PDF<input type="file" hidden accept="application/pdf,image/*" onChange={handleFileUpload} /></Button>
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{signedAgreementFile ? signedAgreementFile.name : 'No file selected'}</Typography>
                            </Box>
                        </StepContent>
                    </Step>
                </Stepper>
            </Box>
          )}

          <TextField label="Notes for Buyer (Optional)" multiline rows={4} value={supplierNotes} onChange={(e) => setSupplierNotes(e.target.value)} fullWidth sx={{ mt: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Tooltip title={submitTooltip} arrow>
                <span><Button variant="contained" onClick={() => setIsConfirmModalOpen(true)} disabled={isSubmitDisabled} size="large">Submit Review</Button></span>
            </Tooltip>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default SupplierPOReviewPage;