// client/src/components/UserDetailsModal.js
import React from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, Divider, Grid, Chip
} from '@mui/material';

const UserDetailsModal = ({ open, onClose, userData }) => {
  if (!userData) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>User Account Details</DialogTitle>
      <DialogContent>
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <Typography variant="h6">{userData.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{userData.email}</Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />

          {/* --- THIS IS THE FIX: Each row is now its own Grid container to enforce alignment --- */}
          
          {/* Username Row */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={4} sx={{ textAlign: 'right' }}>
              <Typography variant="body2"><strong>Username:</strong></Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">{userData.username}</Typography>
            </Grid>
          </Grid>

          {/* Role Row */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={4} sx={{ textAlign: 'right' }}>
              <Typography variant="body2"><strong>Role:</strong></Typography>
            </Grid>
            <Grid item xs={8}>
               <Chip label={userData.role} size="small" />
            </Grid>
          </Grid>
          
          {/* Status Row */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={4} sx={{ textAlign: 'right' }}>
              <Typography variant="body2"><strong>Status:</strong></Typography>
            </Grid>
            <Grid item xs={8}>
               <Chip 
                  label={userData.status}
                  color={userData.status === 'active' ? 'success' : 'error'}
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
            </Grid>
          </Grid>
          
          {/* User ID Row */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2"><strong>User ID:</strong></Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', opacity: 0.8 }}>
                {userData._id}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailsModal;