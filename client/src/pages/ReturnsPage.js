// client/src/pages/ReturnsPage.js
import React, { useState, useEffect, useMemo } from 'react'; 
import api from '../api/axios';
import CreateReturnModal from '../components/CreateReturnModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; 
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

// MUI Imports
import { 
  Box, Button, Typography, Paper, Stack, Container, Tooltip, IconButton, 
  TextField, InputAdornment, Grid, ButtonGroup, Chip
} from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search'; 
import { FaUndo } from 'react-icons/fa';

import LoadingSpinner from '../components/LoadingSpinner';

const ReturnsPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); 

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');

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
      start = new Date(0); 
      end = endOfDay(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const filteredReturns = useMemo(() => {
    return returns.filter(item => {
      const returnDate = new Date(item.createdAt);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = returnDate >= start && returnDate <= end;

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
      flex: 1, minWidth: 180,
      renderCell: (params) => (params.row.createdAt ? new Date(params.row.createdAt).toLocaleString() : 'N/A')
    },
    {
      field: 'originalSaleId',
      headerName: 'Original Sale ID',
      flex: 1, minWidth: 220,
      renderCell: (params) => params.row.originalSale?._id || 'N/A'
    },
    {
      field: 'totalRefundAmount',
      headerName: 'Refund Amount',
      width: 150,
      renderCell: (params) => (
        <Typography fontWeight="bold" color="error.main">
            {typeof params.row.totalRefundAmount === 'number' ? `₱${params.row.totalRefundAmount.toFixed(2)}` : 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'outcome', 
      headerName: 'Outcome', 
      width: 130,
      renderCell: (params) => {
        const color = 
            params.value === 'Restocked' ? 'success' : 
            params.value === 'Discarded' ? 'error' : 
            params.value === 'Refunded' ? 'warning' : 'default';
        return <Chip label={params.value} color={color} size="small" variant="outlined" />;
      }
    },
    {
      field: 'recordedByFullName',
      headerName: 'Processed By',
      width: 150,
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
          <IconButton size="small" onClick={() => handleViewDetails(params.row)} color="primary">
            <VisibilityIcon fontSize="small" />
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
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

      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.dark', display: 'flex' }}>
                <FaUndo size={24} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Sales Returns</Typography>
                <Typography variant="body2" color="text.secondary">Manage customer returns and refunds</Typography>
              </Box>
          </Stack>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setIsCreateModalOpen(true)} 
            sx={{ fontWeight: 600, px: 3, width: { xs: '100%', sm: 'auto' } }}
          >
            Process Return
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Date Presets - Scrollable on mobile */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap' }}>
                <ButtonGroup variant="outlined" aria-label="date range presets" size="small">
                  <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                  <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                  <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                  <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                  <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
                </ButtonGroup>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    label="Search Returns"
                    placeholder="Sale ID, Reason, Processor..."
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                        <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                    }}
                />
            </Grid>
          </Grid>
        </Paper>

        {/* Data Grid */}
        <Paper sx={{ height: 600, width: '100%', borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
          <DataGrid
            rows={filteredReturns} 
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                fontWeight: 700,
                fontSize: '0.9rem'
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          />
        </Paper>
      </motion.div>

    </Container>
  );
};

export default ReturnsPage;