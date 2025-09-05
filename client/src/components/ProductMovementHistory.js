// client/src/components/ProductMovementHistory.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// MUI Imports
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress
} from '@mui/material';

const ProductMovementHistory = ({ productId }) => {
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      const fetchHistory = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/movements/${productId}`);
          setMovements(response.data);
        } catch (error) {
          console.error("Failed to fetch movement history", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [productId]);

  const getChipColor = (type) => {
    switch (type.toLowerCase()) {
      case 'delivery':
        return 'success';
      case 'sale':
        return 'error';
      case 'adjustment':
        return 'warning';
      case 'return':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (movements.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No movement history found for this product.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 440 }}>
      <Table stickyHeader aria-label="product movement history table">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Change</TableCell>
            <TableCell>Stock After</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Reference/Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.map((move) => (
            <TableRow key={move._id}>
              <TableCell>{new Date(move.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <Chip
                  label={move.type}
                  size="small"
                  color={getChipColor(move.type)}
                />
              </TableCell>
              <TableCell sx={{ color: move.quantityChange > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange}
              </TableCell>
              <TableCell>{move.stockAfter}</TableCell>
              <TableCell>{move.recordedBy?.fullName || 'N/A'}</TableCell>
              <TableCell>{move.referenceId || move.notes || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductMovementHistory;