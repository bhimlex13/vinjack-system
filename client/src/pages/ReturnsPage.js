// client/src/pages/ReturnsPage.js
import React, { useState, useEffect } from 'react';
import { getReturns } from '../api/returnApi';
import CreateReturnModal from '../components/CreateReturnModal';
import { toast } from 'react-toastify';

// MUI Imports
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { FaUndo } from 'react-icons/fa';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const data = await getReturns();
      setReturns(data);
    } catch (err) {
      toast.error('Failed to fetch returns.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const columns = [
    { 
      field: 'createdAt', 
      headerName: 'Return Date', 
      width: 200,
      valueFormatter: (params) => new Date(params.value).toLocaleString()
    },
    { 
      field: 'originalSale', 
      headerName: 'Original Sale ID', 
      width: 250,
      valueGetter: (params) => params.row.originalSale?._id
    },
    { 
      field: 'totalRefundAmount', 
      headerName: 'Refund Amount', 
      width: 150,
      valueFormatter: (params) => `₱${params.value.toFixed(2)}`
    },
    { field: 'reason', headerName: 'Reason', flex: 1 },
    { 
      field: 'recordedBy', 
      headerName: 'Processed By', 
      width: 180,
      valueGetter: (params) => params.row.recordedBy?.fullName || 'N/A'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <CreateReturnModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReturnSuccess={fetchReturns}
      />

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
            <FaUndo size={32} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Sales Returns
            </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
          Process New Return
        </Button>
      </Box>

      <Paper sx={{ height: '75vh', width: '100%' }}>
        <DataGrid
          rows={returns}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
        />
      </Paper>
    </Box>
  );
};

export default ReturnsPage;