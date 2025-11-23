// client/src/pages/ReturnsPage.js
import React, { useState, useEffect, useMemo } from 'react'; 
import api from '../api/axios';
import CreateReturnModal from '../components/CreateReturnModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import { Box, Button, Typography, Paper, Stack, Container, Tooltip, IconButton, TextField, InputAdornment } from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search'; 
import { FaUndo } from 'react-icons/fa';

// --- NEW IMPORT ---
import LoadingSpinner from '../components/LoadingSpinner';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- FRAMER MOTION VARIANTS ---
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };
  // ------------------------------

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

  const filteredReturns = useMemo(() => {
    return returns.filter(item => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const saleIdMatch = item.originalSale?._id?.toLowerCase().includes(lowerCaseSearchTerm);
      const reasonMatch = item.reason?.toLowerCase().includes(lowerCaseSearchTerm);
      const processorMatch = item.recordedBy?.fullName?.toLowerCase().includes(lowerCaseSearchTerm);
      return saleIdMatch || reasonMatch || processorMatch;
    });
  }, [returns, searchTerm]);

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

  // --- RENDER LOADING SPINNER ---
  if (isLoading && returns.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Returns..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      
      <AnimatePresence>
        {isCreateModalOpen && (
           <CreateReturnModal
             open={isCreateModalOpen}
             onClose={() => setIsCreateModalOpen(false)}
             onReturnSuccess={fetchReturns}
           />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailsModalOpen && selectedReturn && (
          <ReturnDetailsModal
            open={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            returnData={selectedReturn}
          />
        )}
      </AnimatePresence>

      {/* --- ANIMATED HEADER --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
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

        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            label="Search Returns (by Sale ID, Reason, or Processor)"
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        <Paper sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={filteredReturns} 
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Paper>
      </motion.div>

    </Container>
  );
};

export default ReturnsPage;