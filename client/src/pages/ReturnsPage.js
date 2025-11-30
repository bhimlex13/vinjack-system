// client/src/pages/ReturnsPage.js
import React, { useState, useEffect, useMemo } from 'react'; 
import api from '../api/axios';
import CreateReturnModal from '../components/CreateReturnModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; 
// --- MODIFIED: Date Imports ---
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
// --- END MODIFICATION ---

// MUI Imports
import { 
  Box, Button, Typography, Paper, Stack, Container, Tooltip, IconButton, 
  TextField, InputAdornment, Grid, ButtonGroup // --- MODIFIED: Added Grid, ButtonGroup ---
} from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search'; 
import { FaUndo } from 'react-icons/fa';

import LoadingSpinner from '../components/LoadingSpinner';

const ReturnsPage = () => {
  const today = new Date().toISOString().split('T')[0]; // --- NEW ---

  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- MODIFIED: Date Filter State ---
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');
  // --- END MODIFICATION ---

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

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

  // --- MODIFIED: Date Preset Handler ---
  const handleDatePreset = (preset) => {
    const now = new Date();
    let start = now;
    let end = now;
    setDatePreset(preset);

    if (preset === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (preset === 'week') {
      start = startOfWeek(now);
      end = endOfDay(now);
    } else if (preset === 'month') {
      start = startOfMonth(now);
      end = endOfDay(now);
    } else if (preset === 'year') {
      start = startOfYear(now);
      end = endOfDay(now);
    } else if (preset === 'all') {
      start = new Date(0); // Epoch start
      end = endOfDay(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };
  // --- END MODIFICATION ---

  const filteredReturns = useMemo(() => {
    return returns.filter(item => {
      // --- MODIFIED: Date Logic ---
      const returnDate = new Date(item.createdAt);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = returnDate >= start && returnDate <= end;
      // --- END MODIFICATION ---

      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const saleIdMatch = item.originalSale?._id?.toLowerCase().includes(lowerCaseSearchTerm);
      const reasonMatch = item.reason?.toLowerCase().includes(lowerCaseSearchTerm);
      const processorMatch = item.recordedBy?.fullName?.toLowerCase().includes(lowerCaseSearchTerm);
      
      return dateMatch && (saleIdMatch || reasonMatch || processorMatch);
    });
  }, [returns, searchTerm, startDate, endDate]);

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

        {/* --- MODIFIED: Date Filter Paper --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item size={{ xs: 12 }}>
              <ButtonGroup fullWidth variant="outlined" aria-label="date range presets">
                <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
              </ButtonGroup>
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
          </Grid>
        </Paper>
        {/* --- END MODIFICATION --- */}

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