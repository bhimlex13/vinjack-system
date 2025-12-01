// client/src/components/CredentialsDisplayModal.js
import React from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Alert, AlertTitle, Tooltip, Paper
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const CredentialsDisplayModal = ({ credentials, onClose }) => {

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Employee Credentials</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Action Required</AlertTitle>
          Please copy these credentials immediately. 
          <strong> They will not be shown again.</strong>
        </Alert>
        
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Username</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography component="strong" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
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
                <Typography variant="body2" color="text.secondary">Password</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography component="strong" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem', color: 'primary.main' }}>
                    {credentials.password}
                </Typography>
                <Tooltip title="Copy Password">
                    <IconButton onClick={() => handleCopy(credentials.password)} size="small">
                    <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                </Box>
            </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CredentialsDisplayModal;