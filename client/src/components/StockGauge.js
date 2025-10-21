// client/src/components/StockGauge.js
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';

// Function to determine the color of the progress bar
const getStatusColor = (status) => {
  switch (status) {
    // --- MODIFIED: Changed to 'inherit' (grey) ---
    case 'Out of Stock':
      return 'inherit';
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
  
  // --- NEW: Logic to prevent 0% if stock exists ---
  const rawPercentage = (quantity / safeMaxStock) * 100;
  let percentage = Math.round(rawPercentage);
  
  // If quantity is > 0 but rounding made it 0, force it to 1%
  if (quantity > 0 && percentage === 0) {
    percentage = 1;
  }

  const color = getStatusColor(stockStatus);
  const statusText = stockStatus || 'N/A'; // Fallback text
  
  const progressBarValue = Math.min(percentage, 100);

  return (
    <Tooltip title={`${quantity} / ${safeMaxStock} units`} arrow>
      <Box sx={{ width: '100%', pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography 
            variant="body2" 
            component="span" 
            // --- MODIFIED: Use 'text.secondary' (grey) if color is 'inherit' ---
            sx={{ 
              fontWeight: 'bold', 
              color: color === 'inherit' ? 'text.secondary' : `${color}.main` 
            }}
          >
            {statusText}
          </Typography>
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
            {percentage}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressBarValue} // The bar itself stops at 100
          color={color} // 'inherit' will result in a grey bar
          sx={{ height: 6, borderRadius: 5 }}
        />
      </Box>
    </Tooltip>
  );
};

export default StockGauge;