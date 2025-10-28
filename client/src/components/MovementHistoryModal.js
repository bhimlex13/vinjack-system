// client/src/components/MovementHistoryModal.js
import React, { useState, useEffect } from 'react';
// --- NEW: Import movementApi directly ---
import { getProductMovements } from '../api/movementApi'; 

// MUI Imports
import {
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Alert, Chip,
  TableContainer, Link as MuiLink // --- NEW: Import MuiLink ---
} from '@mui/material';
// --- NEW: Import Link from react-router-dom ---
import { Link as RouterLink } from 'react-router-dom';


const MovementHistoryModal = ({ product, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      const fetchMovements = async () => {
        try {
          setLoading(true);
          const data = await getProductMovements(product._id);
          setMovements(data);
          setError(''); // Clear previous errors
        } catch (err) {
          setError('Failed to fetch movement history.');
          console.error("Movement History Fetch Error:", err); // Log error details
        } finally {
          setLoading(false);
        }
      };
      fetchMovements();
    }
  }, [product]);

  const renderTypeChip = (type) => {
    const styles = {
      SALE: { label: 'Sale', color: 'error' },
      // --- MODIFIED: Added specific case for 'DELIVERY (PO)' ---
      'DELIVERY (PO)': { label: 'PO Delivery', color: 'success' }, 
      DELIVERY: { label: 'Direct Delivery', color: 'success' }, // Keep existing DELIVERY
      ADJUSTMENT: { label: 'Adjustment', color: 'warning' },
      RETURN: { label: 'Return', color: 'info' }
    };
    // --- END MODIFICATION ---
    const style = styles[type] || { label: type, color: 'default' };
    return <Chip label={style.label} color={style.color} size="small" />;
  };

  // --- NEW: Function to render Reference ID as a link if applicable ---
  const renderReference = (type, referenceId) => {
    if (!referenceId) return '';

    if (type === 'SALE') {
      // Assuming you might add a Sale detail page later
      // return <MuiLink component={RouterLink} to={`/sales/${referenceId}`}>{referenceId}</MuiLink>;
      return `Sale ID: ${referenceId}`; // Simple text for now
    }
    if (type === 'DELIVERY (PO)') {
      return <MuiLink component={RouterLink} to={`/purchase-orders/${referenceId}`} target="_blank" rel="noopener noreferrer">PO: {referenceId}</MuiLink>;
    }
    // Add other types if needed (e.g., Direct Delivery, Return)
    // if (type === 'RETURN') { ... }

    return referenceId; // Default fallback
  };
  // --- END NEW ---

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Movement History for: <Typography component="span" variant="h6" color="primary">{product?.name}</Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer component={Paper}> {/* Added Paper for better styling */}
            <Table stickyHeader size="small"> {/* Use size="small" for denser table */}
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Change</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Before</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock After</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Recorded By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Notes / Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No movement history found for this product.</TableCell>
                  </TableRow>
                ) : (
                  movements.map((move) => (
                    <TableRow key={move._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{new Date(move.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                      <TableCell>{renderTypeChip(move.type)}</TableCell>
                      <TableCell align="center">
                        <Typography color={move.quantityChange > 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                          {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{move.stockBefore}</TableCell>
                      <TableCell align="center">{move.stockAfter}</TableCell>
                      <TableCell>{move.recordedBy?.fullName || 'N/A'}</TableCell>
                      {/* --- MODIFIED: Use renderReference --- */}
                      <TableCell>{move.notes || renderReference(move.type, move.referenceId)}</TableCell>
                      {/* --- END MODIFICATION --- */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button> {/* Changed to contained for consistency */}
      </DialogActions>
    </Dialog>
  );
};

export default MovementHistoryModal;