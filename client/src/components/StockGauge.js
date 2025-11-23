// client/src/components/StockGauge.js
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { motion } from 'framer-motion'; // --- NEW IMPORT ---

const getStatusDetails = (status) => {
  switch (status) {
    case 'Out of Stock':
      return { text: 'Out of Stock', color: 'inherit' }; // Grey
    case 'Critical':
      return { text: 'Critical', color: 'error' };   // Red
    case 'Low':
      return { text: 'Low', color: 'warning' }; // Orange
    case 'Healthy': 
    default:
      return { text: 'In Stock', color: 'success' }; // Green
  }
};

const StockGauge = ({ quantity, maxStock, stockStatus }) => {
  const safeMaxStock = Math.max(1, maxStock || 1);
  const rawPercentage = (quantity / safeMaxStock) * 100;

  let displayPercentage = Math.round(rawPercentage);
  if (quantity > 0 && displayPercentage === 0) {
    displayPercentage = 1; 
  }
  const progressBarValue = Math.min(displayPercentage, 100); 

  const { text: statusText, color: statusColor } = getStatusDetails(stockStatus);
  const tooltipTitle = statusText;
  const quantityDisplay = `${quantity.toLocaleString()} / ${safeMaxStock.toLocaleString()}`;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box sx={{ width: '100%', pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography
            variant="body2"
            component="span"
            sx={{
              fontWeight: 'bold',
              color: statusColor === 'inherit' ? 'text.secondary' : `${statusColor}.main`,
              whiteSpace: 'nowrap'
            }}
          >
            {quantityDisplay} 
          </Typography>
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
            {progressBarValue}% 
          </Typography>
        </Box>
        
        {/* --- ANIMATED PROGRESS BAR --- */}
        <Box sx={{ width: '100%', height: 6, bgcolor: 'grey.200', borderRadius: 5, overflow: 'hidden' }}>
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressBarValue}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ 
                    height: '100%', 
                    // Need to map MUI colors to actual CSS colors for motion style if not using classes
                    // Simple workaround: Use MUI LinearProgress inside motion div or just stick to simple LinearProgress if animation is overkill
                    // Actually, standard MUI LinearProgress animates on value change by default. 
                    // Let's enhance it by animating from 0 on mount.
                }}
            >
                 <LinearProgress
                    variant="determinate"
                    value={progressBarValue} 
                    color={statusColor} 
                    sx={{ height: 6, borderRadius: 5 }}
                />
            </motion.div>
        </Box>
      </Box>
    </Tooltip>
  );
};

export default StockGauge;