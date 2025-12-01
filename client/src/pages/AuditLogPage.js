// client/src/pages/AuditLogPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { motion } from 'framer-motion';

// Component Imports
import ReceiptModal from '../components/ReceiptModal';
import ReturnDetailsModal from '../components/ReturnDetailsModal';
import UserDetailsModal from '../components/UserDetailsModal';
import PurchaseOrderDetailModal from '../components/PurchaseOrderDetailModal';

// MUI Imports
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, TablePagination, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, Alert, Grid, TextField,
  FormControl, InputLabel, Select, MenuItem, InputAdornment, Button, ButtonGroup,
  Container
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

const AuditLogPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination and Filter State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // Date Filter State
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');

  // Data for filter dropdowns
  const [users, setUsers] = useState([]);
  const actionTypes = [
    'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
    'PROCESS_SALE', 'PROCESS_RETURN',
    'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER',
    'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER',
    'RECORD_DELIVERY',
    'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',
    'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'ADMIN_RESET_PASSWORD', 'USER_PASSWORD_CHANGE', 'FORCE_PASSWORD_CHANGE',
    'REJECT_PROFILE_UPDATE',
    'CREATE_PO', 'UPDATE_PO', 'RECEIVE_PO_STOCK', 'CANCEL_PO', 'APPROVE_PO',
    'STOCK_ADJUSTMENT', 'SYNC_STOCK_STATUS',
    'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
    'CREATE_BRAND', 'UPDATE_BRAND', 'DELETE_BRAND',
    'CREATE_MOTORCYCLE', 'UPDATE_MOTORCYCLE', 'DELETE_MOTORCYCLE',
    'UPDATE_APP_SETTINGS', 'DATA_EXPORT', 'DATA_CLEANUP'
  ];

  // State for viewing details modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Animation Variants
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

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
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

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
  }, [page, rowsPerPage, searchTerm, filterUser, filterAction, startDate, endDate]); 

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
    setPage(0); 
  };

  // Effect to fetch specific details when a log is selected
  useEffect(() => {
    if (!selectedLog) return;

    const entityEndpoints = {
      'Sale': `/sales/${selectedLog.entityId}`,
      'Return': `/returns/${selectedLog.entityId}`,
      'User': `/users/details/${selectedLog.entityId}`,
      'PurchaseOrder': `/purchase-orders/${selectedLog.entityId}`,
    };

    const endpoint = entityEndpoints[selectedLog.entityType];

    if (!selectedLog.entityType || !selectedLog.entityId || !endpoint) {
      setDetailData({ genericDetails: selectedLog.details });
      return;
    }
    
    const fetchDetails = async () => {
      setIsDetailLoading(true);
      setDetailError('');
      setDetailData(null);

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
    setPage(0); 
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
    const baseStyles = { fontWeight: 600, borderRadius: 1.5 };
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT') || action.includes('FAILED')) {
      return { ...baseStyles, backgroundColor: '#fee2e2', color: '#dc2626' }; // Red
    }
    if (action.includes('CREATE') || action.includes('LOGIN')) { 
      return { ...baseStyles, backgroundColor: '#dbeafe', color: '#2563eb' }; // Blue
    }
    if (action.includes('SALE') || action.includes('RECEIVE')) {
      return { ...baseStyles, backgroundColor: '#dcfce7', color: '#16a34a' }; // Green
    }
    if (action.includes('RETURN') || action.includes('ADJUSTMENT')) {
      return { ...baseStyles, backgroundColor: '#fef3c7', color: '#d97706' }; // Amber
    }
    if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('APPROVE') || action.includes('SYNC')) {
      return { ...baseStyles, backgroundColor: '#e0f2fe', color: '#0891b2' }; // Cyan
    }
    return { ...baseStyles, backgroundColor: '#f3f4f6', color: '#4b5563' }; // Grey
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
        return <ReceiptModal saleData={detailData} open={true} onClose={handleCloseModal} />;
      case 'Return':
        return <ReturnDetailsModal returnData={detailData} open={true} onClose={handleCloseModal} />;
      case 'User':
        return <UserDetailsModal userData={detailData} open={true} onClose={handleCloseModal} />;
      case 'PurchaseOrder':
        return <PurchaseOrderDetailModal poData={detailData} open={true} onClose={handleCloseModal} />;
      default:
        let detailsToShow = 'No specific details to display.';
        if (detailData?.genericDetails) {
          detailsToShow = detailData.genericDetails;
        }

        return (
          <Dialog open={true} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Log Details</DialogTitle>
            <DialogContent>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography 
                  component="pre" 
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9rem', fontFamily: 'monospace' }}
                >
                  {detailsToShow}
                </Typography>
              </Box>
            </DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
              <Button onClick={handleCloseModal} variant="contained">Close</Button>
            </Box>
          </Dialog>
        );
    }
  };


  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', mr: 2, boxShadow: 2 }}>
            <FactCheckIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              Audit Log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track and monitor all system activities and user actions
            </Typography>
          </Box>
        </Box>
        
        {/* Filter Bar */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
             <FilterAltIcon color="action" sx={{ mr: 1 }} />
             <Typography variant="h6" fontWeight={700}>Log Filters</Typography>
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }}>
              <ButtonGroup fullWidth variant="outlined" aria-label="date range presets" size="small">
                <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
              </ButtonGroup>
            </Grid>

            <Grid size={{ xs: 12, md: 2.5 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 2.5 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth label="Search in Details" variant="outlined" size="small"
                value={searchTerm} onChange={handleSearchChange}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>), }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by User</InputLabel>
                <Select value={filterUser} label="Filter by User" onChange={handleFilterChange(setFilterUser)}>
                  <MenuItem value=""><em>All Users</em></MenuItem>
                  {users.map(u => <MenuItem key={u._id} value={u._id}>{u.fullName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
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
        
        {/* Table */}
        <Paper sx={{ borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="audit log table">
              <TableHead sx={{ backgroundColor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress />
                      </TableCell>
                  </TableRow>
                ) : (
                  logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow
                        key={log._id}
                        hover
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" fontWeight={600}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
                            <Typography variant="caption" color="textSecondary">{new Date(log.createdAt).toLocaleTimeString()}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{log.user?.fullName || 'System/Guest'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action.replace(/_/g, ' ')} 
                            size="small"
                            sx={{
                              ...getActionChipStyles(log.action),
                              fontSize: '0.75rem',
                              border: 'none'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Tooltip title={log.details || ''}>
                             <span>{log.details}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <span>
                              <IconButton 
                                onClick={() => handleViewDetails(log)} 
                                size="small"
                                color="primary"
                                disabled={!log.entityId && !log.details}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No audit logs found matching criteria.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={totalLogs}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {renderDetailsModal()}
      </motion.div>
    </Container>
  );
};

export default AuditLogPage;