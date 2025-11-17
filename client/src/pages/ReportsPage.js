// client/src/pages/ReportsPage.js
import React, { useState } from 'react';
import SalesReport from '../components/reports/SalesReport';
import ReturnsReport from '../components/reports/ReturnsReport';

// MUI Imports
import {
  Typography,
  Container,
  Box,
  Tabs,
  Tab
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

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
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ReportsPage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Reports Module
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="reports tabs">
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
      </Box>

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