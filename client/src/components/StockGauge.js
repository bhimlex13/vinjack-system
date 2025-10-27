// client/src/components/StockGauge.js
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';

// Function to get status details (text and color)
const getStatusDetails = (status) => {
  switch (status) {
    case 'Out of Stock':
      return { text: 'Out of Stock', color: 'inherit' }; // Grey
    case 'Critical':
      return { text: 'Critical', color: 'error' };   // Red
    case 'Low':
      return { text: 'Low', color: 'warning' }; // Orange
    case 'Healthy': // Keep Healthy internally
    default:
      return { text: 'In Stock', color: 'success' }; // Green
  }
};

const StockGauge = ({ quantity, maxStock, stockStatus }) => {
  // Ensure maxStock is a valid number > 0 for calculation
  const safeMaxStock = Math.max(1, maxStock || 1);

  // Calculate raw percentage
  const rawPercentage = (quantity / safeMaxStock) * 100;

  // Cap percentage at 100 for display and bar
  let displayPercentage = Math.round(rawPercentage);
  if (quantity > 0 && displayPercentage === 0) {
    displayPercentage = 1; // Show at least 1% if there's stock
  }
  const progressBarValue = Math.min(displayPercentage, 100); // Bar caps at 100%

  // Get status text and color
  const { text: statusText, color: statusColor } = getStatusDetails(stockStatus);

  // --- MODIFIED: Tooltip shows status text ---
  const tooltipTitle = statusText;

  // --- MODIFIED: Main text shows "Quantity / MaxStock" ---
  const quantityDisplay = `${quantity.toLocaleString()} / ${safeMaxStock.toLocaleString()}`;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box sx={{ width: '100%', pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          {/* --- MODIFIED: Display "Quantity / MaxStock" --- */}
          <Typography
            variant="body2"
            component="span"
            sx={{
              fontWeight: 'bold',
              // Use status color for quantity text too
              color: statusColor === 'inherit' ? 'text.secondary' : `${statusColor}.main`,
              // Add whiteSpace to prevent wrapping if numbers get very large
              whiteSpace: 'nowrap'
            }}
          >
            {quantityDisplay} {/* Display "763 / 1000", etc. */}
          </Typography>
          {/* Display Capped Percentage */}
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
            {progressBarValue}% {/* Show capped percentage */}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressBarValue} // Use the capped value for the bar
          color={statusColor} // 'inherit' results in a grey bar
          sx={{ height: 6, borderRadius: 5 }}
        />
      </Box>
    </Tooltip>
  );
};

export default StockGauge;