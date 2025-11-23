// client/src/components/LoadingSpinner.js
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import SettingsIcon from '@mui/icons-material/Settings'; // Represents Engine/Parts
import TireRepairIcon from '@mui/icons-material/TireRepair'; // Represents Wheels

const LoadingSpinner = ({ text = "Assembling data..." }) => {
  const theme = useTheme();

  // Animation Sequences
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
      }
    }
  };

  // 1. Engine drops from top
  const engineVariants = {
    initial: { y: -50, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5, ease: "backOut" }
    },
    exit: { opacity: 0, duration: 0.1 }
  };

  // 2. Wheels roll in from sides
  const wheelVariants = (direction) => ({
    initial: { x: direction * 60, opacity: 0, rotate: 0 },
    animate: { 
      x: direction * 15, // Move closer to center
      opacity: 1, 
      rotate: direction * -360, 
      transition: { duration: 0.6, ease: "circOut", delay: 0.3 }
    },
    exit: { opacity: 0, duration: 0.1 }
  });

  // 3. Flash and Switch to Bike
  const bikeVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1.2, 
      opacity: 1,
      transition: { duration: 0.4, ease: "backOut", delay: 1.0 } // Appears after parts assemble
    },
    moveOut: {
      x: 200, // Drive away
      opacity: 0,
      transition: { duration: 0.6, ease: "easeIn", delay: 2.0 }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '300px',
        py: 4,
        overflow: 'hidden' 
      }}
    >
      {/* Animation Scene */}
      <Box 
        component={motion.div}
        variants={containerVariants}
        initial="initial"
        animate="animate"
        // We use a key to force the component to re-render and loop the animation
        key={Date.now()} 
        sx={{ position: 'relative', width: 120, height: 80, mb: 4 }}
      >
        {/* The Parts (Visible initially) */}
        <Box component={motion.div} animate={{ opacity: [1, 1, 0], transition: { delay: 1.0, duration: 0.1 } }}>
            
            {/* Engine */}
            <Box component={motion.div} variants={engineVariants} sx={{ position: 'absolute', top: 0, left: '35%', color: theme.palette.warning.main }}>
              <SettingsIcon sx={{ fontSize: 40 }} />
            </Box>

            {/* Back Wheel */}
            <Box component={motion.div} variants={wheelVariants(-1)} sx={{ position: 'absolute', bottom: 0, left: 0, color: theme.palette.text.secondary }}>
              <TireRepairIcon sx={{ fontSize: 35 }} />
            </Box>

            {/* Front Wheel */}
            <Box component={motion.div} variants={wheelVariants(1)} sx={{ position: 'absolute', bottom: 0, right: 0, color: theme.palette.text.secondary }}>
              <TireRepairIcon sx={{ fontSize: 35 }} />
            </Box>
        </Box>

        {/* The Final Bike (Appears after parts vanish) */}
        <Box 
          component={motion.div} 
          variants={bikeVariants} 
          animate={["animate", "moveOut"]}
          sx={{ 
            position: 'absolute', 
            top: 10, 
            left: 25, 
            color: theme.palette.primary.main,
            filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' 
          }}
        >
          <TwoWheelerIcon sx={{ fontSize: 70 }} />
        </Box>
      </Box>

      {/* Loading Text Pulse */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 1 }}>
          {text}
        </Typography>
      </motion.div>
    </Box>
  );
};

export default LoadingSpinner;