// client/src/pages/ReturnsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import CreateReturnModal from '../components/CreateReturnModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal'; // --- ADDED: Import the new details modal
import { toast } from 'react-toastify';

// MUI Imports
import { Box, Button, Typography, Paper, Stack, Container, Tooltip, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility'; // --- ADDED: Icon for the details button
import { FaUndo } from 'react-icons/fa';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- ADDED: State for the details modal ---
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/returns');
      const validReturns = Array.isArray(response.data) ? response.data.filter(item => item != null) : [];
      setReturns(validReturns);
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

  // --- ADDED: Handler to open the details modal ---
  const handleViewDetails = (returnData) => {
    setSelectedReturn(returnData);
    setIsDetailsModalOpen(true);
  };

  const columns = [
    {
      field: 'createdAt',
      headerName: 'Return Date',
      width: 200,
      renderCell: (params) => (params.row.createdAt ? new Date(params.row.createdAt).toLocaleString() : 'N/A')
    },
    {
      field: 'originalSaleId',
      headerName: 'Original Sale ID',
      width: 250,
      renderCell: (params) => params.row.originalSale?._id || 'N/A'
    },
    {
      field: 'totalRefundAmount',
      headerName: 'Refund Amount',
      width: 150,
      renderCell: (params) => (typeof params.row.totalRefundAmount === 'number' ? `₱${params.row.totalRefundAmount.toFixed(2)}` : 'N/A')
    },
    { 
      field: 'reason', 
      headerName: 'Reason', 
      flex: 1 
    },
    {
      field: 'recordedByFullName',
      headerName: 'Processed By',
      width: 180,
      renderCell: (params) => params.row.recordedBy?.fullName || 'N/A'
    },
    // --- ADDED: New "Actions" column ---
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Details">
          <IconButton onClick={() => handleViewDetails(params.row)}>
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <CreateReturnModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReturnSuccess={fetchReturns}
      />

      {/* --- ADDED: The details modal component --- */}
      <ReturnDetailsModal
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        returnData={selectedReturn}
      />

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
            <FaUndo size={32} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Sales Returns
            </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsCreateModalOpen(true)}>
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
    </Container>
  );
};

export default ReturnsPage;