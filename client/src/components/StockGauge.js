// client/src/components/StockGauge.js
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';

// Function to determine the color of the progress bar
const getStatusColor = (status) => {
  switch (status) {
    case 'Out of Stock':
      return 'error';
    case 'Critical':
      return 'error';
    case 'Low':
      return 'warning';
    case 'Healthy':
    default:
      return 'success';
  }
};

const StockGauge = ({ quantity, maxStock, stockStatus }) => {
  // Ensure maxStock is a valid number > 0 for calculation
  const safeMaxStock = Math.max(1, maxStock || 1);
  let percentage = Math.floor((quantity / safeMaxStock) * 100);
  
  // Handle edge cases
  if (quantity > 0 && percentage === 0) {
    percentage = 1; // Show a sliver of progress if not actually 0
  }
  if (quantity > maxStock) {
    percentage = 100; // Cap at 100%
  }

  const color = getStatusColor(stockStatus);
  const statusText = stockStatus || 'N/A'; // Fallback text

  return (
    <Tooltip title={`${quantity} / ${safeMaxStock} units`} arrow>
      <Box sx={{ width: '100%', pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography 
            variant="body2" 
            component="span" 
            sx={{ fontWeight: 'bold', color: `${color}.main` }}
          >
            {statusText}
          </Typography>
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
            {percentage}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{ height: 6, borderRadius: 5 }}
        />
      </Box>
    </Tooltip>
  );
};

export default StockGauge;