// client/src/components/AddServiceModal.js
import React from 'react';

// MUI Imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Button,
  DialogActions,
  Typography,
  Divider,
} from '@mui/material';

const AddServiceModal = ({ open, onClose, services, onAddService, cartItems }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add a Service to the Sale</DialogTitle>
      <DialogContent dividers>
        {services.length === 0 ? (
          <Typography>No active services found.</Typography>
        ) : (
          <List>
            {services.map(service => {
              const isInCart = cartItems.some(item => item.type === 'service' && item._id === service._id);
              return (
                <React.Fragment key={service._id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => onAddService(service)}
                        disabled={isInCart}
                      >
                        {isInCart ? 'Added' : 'Add'}
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={service.name}
                      secondary={`Charge: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(service.charge)}`}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddServiceModal;