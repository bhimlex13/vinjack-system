// client/src/pages/AuditLogPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

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
  Chip,
  CircularProgress,
  TablePagination
} from '@mui/material';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/audit-logs?page=${page + 1}&limit=${rowsPerPage}`);
        
        // --- THIS IS THE FIX: Add a safeguard to handle different response formats ---
        // This ensures 'logs' is always an array, preventing the .map() error.
        const logsData = Array.isArray(response.data.logs) 
          ? response.data.logs 
          : (Array.isArray(response.data) ? response.data : []);
        
        const totalLogsData = response.data.totalLogs || logsData.length;

        setLogs(logsData);
        setTotalLogs(totalLogsData);

      } catch (error) {
        console.error("Failed to fetch audit logs", error);
        setLogs([]); // Ensure logs is an empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading && logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Audit Log
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        A record of all important actions performed by users.
      </Typography>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="audit log table">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                  <TableCell colSpan={4} align="center"><CircularProgress /></TableCell>
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
                    <Chip label={log.action.replace(/_/g, ' ')} size="small" />
                  </TableCell>
                  <TableCell>{log.details}</TableCell>
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
    </Box>
  );
};

export default AuditLogPage;