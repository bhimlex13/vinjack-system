// client/src/components/MovementHistoryModal.js
import React, { useState, useEffect } from 'react';
import { getProductMovements } from '../api/movementApi';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Alert, Chip,
  TableContainer
} from '@mui/material';

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
        } catch (err) {
          setError('Failed to fetch movement history.');
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
      DELIVERY: { label: 'Delivery', color: 'success' },
      ADJUSTMENT: { label: 'Adjustment', color: 'warning' },
      RETURN: { label: 'Return', color: 'info' }
    };
    const style = styles[type] || { label: type, color: 'default' };
    return <Chip label={style.label} color={style.color} size="small" />;
  };

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
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="center">Change</TableCell>
                  <TableCell align="center">Stock Before</TableCell>
                  <TableCell align="center">Stock After</TableCell>
                  <TableCell>Recorded By</TableCell>
                  <TableCell>Notes / Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((move) => (
                  <TableRow key={move._id} hover>
                    <TableCell>{new Date(move.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{renderTypeChip(move.type)}</TableCell>
                    <TableCell align="center">
                      <Typography color={move.quantityChange > 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                        {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{move.stockBefore}</TableCell>
                    <TableCell align="center">{move.stockAfter}</TableCell>
                    <TableCell>{move.recordedBy?.fullName || 'N/A'}</TableCell>
                    <TableCell>{move.notes || move.referenceId || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MovementHistoryModal;