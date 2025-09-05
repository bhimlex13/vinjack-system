// client/src/components/CredentialsDisplayModal.js
import React from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Alert, AlertTitle, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const CredentialsDisplayModal = ({ credentials, onClose }) => {

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // In a real app, you might want to use a Snackbar for feedback instead of an alert.
    alert('Copied to clipboard!');
  };

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Employee Credentials</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Important</AlertTitle>
          Please copy these credentials and send them to the new employee.
          <strong> This is the only time they will be shown.</strong>
        </Alert>
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography>Username:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="strong" sx={{ fontWeight: 'bold' }}>
                {credentials.username}
              </Typography>
              <Tooltip title="Copy Username">
                <IconButton onClick={() => handleCopy(credentials.username)} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Temporary Password:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="strong" sx={{ fontWeight: 'bold' }}>
                {credentials.password}
              </Typography>
              <Tooltip title="Copy Password">
                <IconButton onClick={() => handleCopy(credentials.password)} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CredentialsDisplayModal;