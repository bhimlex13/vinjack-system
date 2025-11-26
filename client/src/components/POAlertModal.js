// client/src/components/POAlertModal.js
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    Typography,
    useTheme
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useNavigate } from 'react-router-dom';

const POAlertModal = ({ open, onClose, notificationData }) => {
    const theme = useTheme();
    const navigate = useNavigate();

    if (!notificationData) return null;

    const { poId, poNumber, supplierName, message } = notificationData;

    const handleViewPO = () => {
        onClose();
        navigate(`/purchase-orders/${poId}`); // Navigate to the PO details page
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="po-alert-title"
            aria-describedby="po-alert-description"
            maxWidth="sm"
            fullWidth
        >
            <Box sx={{ 
                backgroundColor: theme.palette.info.main, 
                color: '#fff', 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
            }}>
                <NotificationsActiveIcon />
                <Typography variant="h6" id="po-alert-title">
                    Purchase Order Update
                </Typography>
            </Box>

            <DialogContent sx={{ mt: 2 }}>
                <DialogContentText id="po-alert-description" sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                    <strong>{supplierName}</strong> has updated <strong>{poNumber}</strong>.
                </DialogContentText>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #ddd' }}>
                    <Typography variant="body2" color="text.secondary">
                        Message:
                    </Typography>
                    <Typography variant="body1">
                        {message}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Dismiss
                </Button>
                <Button 
                    onClick={handleViewPO} 
                    variant="contained" 
                    color="primary"
                    autoFocus
                >
                    View Purchase Order
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default POAlertModal;