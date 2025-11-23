// client/src/pages/SupplierPOReviewPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPurchaseOrderByToken, updateBySupplier } from '../api/purchaseOrderApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Checkbox, FormControlLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText, 
} from '@mui/material';

// --- NEW IMPORT ---
import LoadingSpinner from '../components/LoadingSpinner';

const SupplierPOReviewPage = () => {
  const { token } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [items, setItems] = useState([]);
  const [supplierNotes, setSupplierNotes] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // --- FRAMER MOTION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };
  // ------------------------------

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
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load the Purchase Order. The link may be invalid or expired.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [token]);

  const handleItemChange = (productId, field, value) => {
    setItems(items.map(item =>
      item.product._id === productId ? { ...item, [field]: value } : item
    ));
  };
  
  const handleFinalSubmit = async () => {
    setIsConfirmModalOpen(false); 
    setSubmitting(true);
    try {
      const submissionData = {
        items: items.map(item => ({
          product: item.product._id,
          supplierUpdatedCost: item.supplierUpdatedCost,
          isAvailable: item.isAvailable,
        })),
        supplierNotes: supplierNotes,
      };
      await updateBySupplier(token, submissionData);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const summaryData = useMemo(() => {
    const priceChanges = items.filter(item => item.isAvailable && item.supplierUpdatedCost !== item.cost);
    const unavailableItems = items.filter(item => !item.isAvailable);
    return { priceChanges, unavailableItems };
  }, [items]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LoadingSpinner text="Loading Order..." />
    </Box>
  );

  if (error) return <Container sx={{mt: 5}}><Alert severity="error">{error}</Alert></Container>;
  
  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper 
          sx={{ p: 4, textAlign: 'center' }}
          component={motion.div}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Typography variant="h4" gutterBottom>Thank You!</Typography>
          <Typography>Your response has been submitted successfully.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

      <AnimatePresence>
        {isConfirmModalOpen && (
          <Dialog 
            open={isConfirmModalOpen} 
            onClose={() => setIsConfirmModalOpen(false)} 
            maxWidth="sm" 
            fullWidth
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 50, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: 50, opacity: 0 },
              transition: { duration: 0.3 },
              sx: { backgroundColor: 'background.paper', boxShadow: 24, borderRadius: 2 }
            }}
          >
            <DialogTitle>Confirm Your Review</DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>Please review the summary of your changes before submitting.</Typography>
              
              {summaryData.priceChanges.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Price Adjustments:</Typography>
                  <List dense>
                    {summaryData.priceChanges.map(item => (
                      <ListItem key={item.product._id}>
                        <ListItemText 
                          primary={item.product.name} 
                          secondary={`Changed from ₱${item.cost.toFixed(2)} to ₱${item.supplierUpdatedCost.toFixed(2)}`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {summaryData.unavailableItems.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Unavailable Items:</Typography>
                  <List dense>
                    {summaryData.unavailableItems.map(item => (
                      <ListItem key={item.product._id}>
                        <ListItemText primary={item.product.name} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {supplierNotes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Your Notes:</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{supplierNotes}</Typography>
                </Box>
              )}

              {(summaryData.priceChanges.length === 0 && summaryData.unavailableItems.length === 0 && !supplierNotes) && (
                <Typography sx={{ mt: 2 }}>No changes were made. You are confirming the order as is.</Typography>
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
        <Paper 
          sx={{ p: 3 }}
          component={motion.div}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Typography variant="h4" gutterBottom>Purchase Order Review</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}><Typography><strong>PO Number:</strong> {po.poNumber}</Typography></Grid>
            <Grid item xs={6}><Typography><strong>From:</strong> {po.supplier.name}</Typography></Grid>
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
                  <TableRow 
                    key={item.product._id}
                    sx={!item.isAvailable ? { backgroundColor: '#fafafa', '& > *': { color: 'text.disabled' } } : {}}
                  >
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

          <TextField
            label="Notes for Buyer (Optional)"
            multiline
            rows={4}
            value={supplierNotes}
            onChange={(e) => setSupplierNotes(e.target.value)}
            fullWidth
            sx={{ mt: 3 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={submitting}
            >
              Submit Review
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default SupplierPOReviewPage;