// client/src/pages/TransactionsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';

// MUI Imports
import { Box, Button, Typography, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const TransactionsPage = () => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await api.get('/sales');
        setSales(response.data);
      } catch (err) {
        setError('Failed to fetch transaction data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSales();
  }, []);

  const columns = [
    {
      field: 'createdAt',
      headerName: 'Date',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const date = new Date(params.value);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    { field: '_id', headerName: 'Sale ID', flex: 1, minWidth: 220 },
    {
      field: 'recordedBy',
      headerName: 'Cashier',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => params.row?.recordedBy?.fullName || 'N/A'
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      flex: 1,
      minWidth: 150,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      // --- THE FINAL FIX IS HERE: Replaced valueFormatter with the more reliable renderCell ---
      renderCell: (params) => {
        const amount = parseFloat(params.row.totalAmount);
        if (isNaN(amount)) {
          return '₱0.00';
        }
        return new Intl.NumberFormat('en-PH', {
          style: 'currency',
          currency: 'PHP',
        }).format(amount);
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => setSelectedSale(params.row)}
        >
          View Receipt
        </Button>
      )
    }
  ];

  if (error) return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
        Transaction Log
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        A log of all completed sales. Click "View Receipt" to see details.
      </Typography>

      <Paper sx={{ height: '75vh', width: '100%' }}>
        <DataGrid
          rows={sales}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: {
              sortModel: [{ field: 'createdAt', sort: 'desc' }],
            },
          }}
        />
      </Paper>

      {selectedSale && (
        <ReceiptModal
          saleData={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </Box>
  );
};

export default TransactionsPage;