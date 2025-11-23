// client/src/components/MovementHistoryModal.js
import React, { useState, useEffect } from 'react';
import { getProductMovements } from '../api/movementApi'; 
import { motion } from 'framer-motion'; 

// MUI Imports
import {
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Chip,
  TableContainer, Link as MuiLink, TablePagination // --- NEW IMPORT ---
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import LoadingSpinner from './LoadingSpinner';

const MovementHistoryModal = ({ product, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (product) {
      const fetchMovements = async () => {
        try {
          setLoading(true);
          // Reset to first page when opening new product to show latest first
          setPage(0); 
          
          const data = await getProductMovements(product._id);
          // Ensure data is sorted by date descending (newest first) if API doesn't guarantee it
          // Assuming API returns date string in createdAt
          const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          setMovements(sortedData);
          setError(''); 
        } catch (err) {
          setError('Failed to fetch movement history.');
          console.error("Movement History Fetch Error:", err); 
        } finally {
          setLoading(false);
        }
      };
      fetchMovements();
    }
  }, [product]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate the slice of data to display
  const paginatedMovements = movements.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderTypeChip = (type) => {
    const styles = {
      SALE: { label: 'Sale', color: 'error' },
      'DELIVERY (PO)': { label: 'PO Delivery', color: 'success' }, 
      DELIVERY: { label: 'Direct Delivery', color: 'success' }, 
      ADJUSTMENT: { label: 'Adjustment', color: 'warning' },
      RETURN: { label: 'Return', color: 'info' }
    };
    const style = styles[type] || { label: type, color: 'default' };
    return <Chip label={style.label} color={style.color} size="small" />;
  };

  const renderReference = (type, referenceId) => {
    if (!referenceId) return '';

    if (type === 'SALE') {
      return `Sale ID: ${referenceId}`; 
    }
    if (type === 'DELIVERY (PO)') {
      return <MuiLink component={RouterLink} to={`/purchase-orders/${referenceId}`} target="_blank" rel="noopener noreferrer">PO: {referenceId}</MuiLink>;
    }
    return referenceId; 
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      fullWidth 
      maxWidth="lg"
      PaperComponent={motion.div}
      PaperProps={{
        initial: { y: 50, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 50, opacity: 0 },
        transition: { duration: 0.3 },
        sx: { 
          backgroundColor: 'background.paper', 
          boxShadow: 24,
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle>
        Movement History for: <Typography component="span" variant="h6" color="primary">{product?.name}</Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <LoadingSpinner text="Loading history..." />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0} variant="outlined"> 
              <Table stickyHeader size="small"> 
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
                    // Map over paginatedMovements instead of all movements
                    paginatedMovements.map((move) => (
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
                        <TableCell>{move.notes || renderReference(move.type, move.referenceId)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* --- PAGINATION CONTROLS --- */}
            {movements.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={movements.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MovementHistoryModal;