// client/src/pages/AlertsPage.js
import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle
} from '@mui/material';

const AlertsPage = () => {
  const { lowStockItems = [] } = useContext(AuthContext);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Low Stock Alerts
      </Typography>
      
      {lowStockItems.length > 0 ? (
        <>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The following items are at or below their designated reorder level.
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="low stock alerts table">
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reorder Level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow
                    key={item._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">{item.itemCode}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Alert severity="success" variant="outlined">
          <AlertTitle>All Good!</AlertTitle>
          All inventory levels are healthy. There are no low stock alerts at this time.
        </Alert>
      )}
    </Box>
  );
};

export default AlertsPage;