// client/src/pages/ReportsPage.js
import React, { useState } from 'react';
import SalesReport from '../components/reports/SalesReport';
import ReturnsReport from '../components/reports/ReturnsReport';
import { motion, AnimatePresence } from 'framer-motion';

// MUI Imports
import {
  Typography,
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Helper component to manage tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      <AnimatePresence mode="wait">
        {value === index && (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ pt: 3 }}>
              {children}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ReportsPage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: 'primary.light', 
            color: 'primary.dark', 
            mr: 2,
            boxShadow: 2
          }}
        >
          <AssessmentIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyze sales performance, profitability, and returns
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          bgcolor: 'transparent',
          borderRadius: 0 
        }}
      >
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          aria-label="reports tabs"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 48,
              mr: 2
            }
          }}
        >
          <Tab 
            label="Sales & Profitability" 
            icon={<PointOfSaleIcon />} 
            iconPosition="start" 
            id="report-tab-0"
          />
          <Tab 
            label="Item Returns" 
            icon={<AssignmentReturnIcon />} 
            iconPosition="start" 
            id="report-tab-1"
          />
        </Tabs>
      </Paper>

      {/* Tab 1: Sales Report */}
      <TabPanel value={currentTab} index={0}>
        <SalesReport />
      </TabPanel>

      {/* Tab 2: Returns Report */}
      <TabPanel value={currentTab} index={1}>
        <ReturnsReport />
      </TabPanel>
      
    </Container>
  );
};

export default ReportsPage;