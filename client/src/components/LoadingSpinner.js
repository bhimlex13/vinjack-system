// client/src/components/LoadingSpinner.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'; // The new motorcycle icon

const LoadingSpinner = ({ text = "Loading data..." }) => {
  return (
    <Box 
      sx={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4, // Padding for vertical spacing
      }}
    >
      <TwoWheelerIcon 
        className="spinner-gear" // Use the existing CSS class with the new 'run' animation
        sx={{
          fontSize: 60,
          color: 'primary.main', // Use your theme's primary color
          mb: 1,
        }}
      />
      <Typography variant="subtitle1" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;