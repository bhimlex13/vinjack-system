// client/src/pages/DeliveriesPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeliveries } from '../api/deliveryApi';
import RecordDeliveryForm from '../components/RecordDeliveryForm';

// MUI Imports
import { 
  Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Grid, Divider, Stack, Container // <-- IMPORTED CONTAINER
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const DeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const response = await getDeliveries();
      setDeliveries(response);
    } catch (err) {
      setError('Failed to fetch delivery data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleDeliveryFormClose = () => {
    setIsDeliveryModalOpen(false);
    fetchDeliveries();
  };

  const columns = [
    {
      field: 'createdAt', headerName: 'Date', flex: 1, minWidth: 200,
      renderCell: (params) => new Date(params.value).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    },
    { 
      field: 'supplier', headerName: 'Supplier', flex: 1, minWidth: 180,
      renderCell: (params) => params.row.supplier?.name || 'N/A'
    },
    {
      field: 'purchaseOrder', headerName: 'Origin', flex: 1, minWidth: 150,
      renderCell: (params) => params.row.purchaseOrder 
        ? <Chip label={`PO: ${params.row.purchaseOrder.poNumber}`} color="primary" variant="outlined" size="small" /> 
        : <Chip label="Direct Delivery" color="secondary" variant="outlined" size="small" />
    },
    {
      field: 'recordedBy', headerName: 'Recorded By', flex: 1, minWidth: 180,
      renderCell: (params) => params.row.recordedBy?.fullName || 'N/A'
    },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Button variant="contained" size="small" onClick={() => setSelectedDelivery(params.row)}>
          View Details
        </Button>
      )
    }
  ];

  if (error) return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;

  return (
    // --- THIS IS THE KEY CHANGE ---
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                Deliveries Hub
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Log direct deliveries or create new purchase orders.
            </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <Button 
                variant="contained" 
                color="success"
                startIcon={<LocalShippingIcon />}
                onClick={() => setIsDeliveryModalOpen(true)}
            >
                Record Direct Delivery
            </Button>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/purchase-orders/new')}
            >
                Create Purchase Order
            </Button>
        </Stack>
      </Box>

      <Paper sx={{ height: '75vh', width: '100%' }}>
        <DataGrid
          rows={deliveries}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
          }}
        />
      </Paper>

      <Dialog open={!!selectedDelivery} onClose={() => setSelectedDelivery(null)} fullWidth maxWidth="md">
        <DialogTitle>Delivery Details</DialogTitle>
        <DialogContent>
            {selectedDelivery && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Supplier</Typography>
                      <Typography variant="h6" component="p">{selectedDelivery.supplier?.name || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Origin</Typography>
                      <Typography variant="h6" component="p">
                        {selectedDelivery.purchaseOrder
                          ? `Purchase Order #${selectedDelivery.purchaseOrder.poNumber}`
                          : 'Direct Delivery'
                        }
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>Products Received</Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Name</TableCell>
                            <TableCell align="right">Quantity Received</TableCell>
                            <TableCell align="right">Cost at Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedDelivery.productsReceived.map(item => (
                            <TableRow key={item.product._id}>
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell align="right">{item.quantity}</TableCell>
                                <TableCell align="right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.costAtTime)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setSelectedDelivery(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Record New Direct Delivery</DialogTitle>
        <DialogContent>
          <RecordDeliveryForm onClose={handleDeliveryFormClose} />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default DeliveriesPage;