// client/src/pages/AuditLogPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// Component Imports
import ReceiptModal from '../components/ReceiptModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal';
import UserDetailsModal from '../components/UserDetailsModal';

// MUI Imports
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, TablePagination, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, Alert, Grid, TextField,
  FormControl, InputLabel, Select, MenuItem, InputAdornment
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination and Filter State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // Data for filter dropdowns
  const [users, setUsers] = useState([]);
  const actionTypes = [
    'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'PROCESS_SALE', 'PROCESS_RETURN',
    'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_CUSTOMER', 'UPDATE_CUSTOMER',
    'DELETE_CUSTOMER', 'RECORD_DELIVERY', 'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',
    'CREATE_USER', 'DELETE_USER', 'FORCE_PASSWORD_CHANGE', 'REJECT_PROFILE_UPDATE',
    'CREATE_PO', 'UPDATE_PO', 'RECEIVE_PO', 'CANCEL_PO', 'STOCK_ADJUSTMENT'
  ];

  // State for viewing details modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Fetch users for the filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch audit logs for the table
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page + 1,
          limit: rowsPerPage,
        });
        if (searchTerm) params.append('search', searchTerm);
        if (filterUser) params.append('userId', filterUser);
        if (filterAction) params.append('action', filterAction);

        const response = await api.get(`/audit-logs?${params.toString()}`);
        
        setLogs(response.data.logs || []);
        setTotalLogs(response.data.totalLogs || 0);

      } catch (error) {
        console.error("Failed to fetch audit logs", error);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [page, rowsPerPage, searchTerm, filterUser, filterAction]);

  // Effect to fetch specific details when a log is selected
  useEffect(() => {
    if (!selectedLog) return;

    if (!selectedLog.entityType || !selectedLog.entityId) {
      setDetailData({ genericDetails: selectedLog.details });
      return;
    }
    
    const fetchDetails = async () => {
      setIsDetailLoading(true);
      setDetailError('');
      setDetailData(null);

      const entityEndpoints = {
        'Sale': `/sales/${selectedLog.entityId}`,
        'Return': `/returns/${selectedLog.entityId}`,
        'User': `/users/details/${selectedLog.entityId}`,
        'PurchaseOrder': `/purchase-orders/${selectedLog.entityId}`,
      };

      const endpoint = entityEndpoints[selectedLog.entityType];

      if (!endpoint) {
        setDetailError(`No detailed view is configured for type: ${selectedLog.entityType}`);
        setIsDetailLoading(false);
        return;
      }

      try {
        const response = await api.get(endpoint);
        setDetailData(response.data);
      } catch (err) {
        console.error(`Failed to fetch details for ${selectedLog.entityType}`, err);
        setDetailError(`Could not load details. The record may have been deleted.`);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetails();
  }, [selectedLog]);

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(0); // Reset to first page when filter changes
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
    setDetailData(null);
    setIsDetailLoading(false);
    setDetailError('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const getActionChipStyles = (action) => {
    const baseStyles = { fontWeight: 500 };
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT')) {
      return { ...baseStyles, backgroundColor: '#ffebee', color: '#c62828' }; // Light Red
    }
    if (action.includes('CREATE')) {
      return { ...baseStyles, backgroundColor: '#e3f2fd', color: '#1565c0' }; // Light Blue
    }
    if (action.includes('SALE') || action.includes('RECEIVE')) {
      return { ...baseStyles, backgroundColor: '#e0f2f1', color: '#00695c' }; // Mint Green
    }
    if (action.includes('RETURN') || action.includes('ADJUSTMENT')) {
      return { ...baseStyles, backgroundColor: '#fff8e1', color: '#ff8f00' }; // Light Amber
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return { ...baseStyles, backgroundColor: '#e0f7fa', color: '#00838f' }; // Light Cyan
    }
    return { ...baseStyles, backgroundColor: '#f5f5f5', color: '#424242' }; // Light Grey
  };

  const renderDetailsModal = () => {
    if (!selectedLog) return null;

    if (isDetailLoading) {
      return (
        <Dialog open={true} onClose={handleCloseModal}>
          <DialogContent sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </DialogContent>
        </Dialog>
      );
    }
    
    if (detailError) {
      return (
        <Dialog open={true} onClose={handleCloseModal}>
          <DialogTitle>Error</DialogTitle>
          <DialogContent><Alert severity="error">{detailError}</Alert></DialogContent>
        </Dialog>
      );
    }

    if (!detailData) return null;
    
    switch (selectedLog.entityType) {
      case 'Sale':
        return <ReceiptModal saleData={detailData} onClose={handleCloseModal} />;
      case 'Return':
        return <ReturnDetailsModal returnData={detailData} open={true} onClose={handleCloseModal} />;
      case 'User':
        return <UserDetailsModal userData={detailData} open={true} onClose={handleCloseModal} />;
      default:
        return (
          <Dialog open={true} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle>Log Details</DialogTitle>
            <DialogContent>
              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                {detailData.genericDetails || 'No specific details to display.'}
              </Typography>
            </DialogContent>
          </Dialog>
        );
    }
  };


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Audit Log
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        A record of all important actions performed by users.
      </Typography>
      
      {/* --- Filter Bar --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {/* --- Grid format updated to match your project's standard --- */}
        <Grid container spacing={2} alignItems="center">
          <Grid item size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth label="Search in Details" variant="outlined" size="small"
              value={searchTerm} onChange={handleSearchChange}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
            />
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by User</InputLabel>
              <Select value={filterUser} label="Filter by User" onChange={handleFilterChange(setFilterUser)}>
                <MenuItem value=""><em>All Users</em></MenuItem>
                {users.map(u => <MenuItem key={u._id} value={u._id}>{u.fullName}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Action</InputLabel>
              <Select value={filterAction} label="Filter by Action" onChange={handleFilterChange(setFilterAction)}>
                <MenuItem value=""><em>All Actions</em></MenuItem>
                {actionTypes.sort().map(action => <MenuItem key={action} value={action}>{action.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="audit log table">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                  <TableCell colSpan={5} align="center"><CircularProgress /></TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow
                  key={log._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.user?.fullName || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.action.replace(/_/g, ' ')} 
                      size="small"
                      sx={{
                        ...getActionChipStyles(log.action),
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell>{log.details}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <span>
                        <IconButton 
                          onClick={() => handleViewDetails(log)} 
                          size="small"
                          disabled={!log.entityId} // Disable if there's no entity to view
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalLogs}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {renderDetailsModal()}
    </Box>
  );
};

export default AuditLogPage;