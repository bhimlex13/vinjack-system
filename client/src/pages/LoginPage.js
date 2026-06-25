// client/src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { isEmail } from 'validator';
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion

// MUI Imports
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';

// Icon Imports
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

// Custom Components
import DinoGame from '../components/DinoGame';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { login, demoLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  // Client-Side Validation
  const validateForm = () => {
    if (!username) {
      setError('Username or Email is required.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (username.includes('@') && !isEmail(username)) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError('');
    return true;
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    const result = await demoLogin();
    if (result.success) {
      navigate('/dashboard');
    } else {
      setIsDemoLoading(false);
      setError(result.message || 'Failed to start demo session.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setError('');
    setIsLoading(true); // Triggers the spinner view

    // Artificial delay to show off the cool animation (optional, remove in production if you want instant)
    // await new Promise(resolve => setTimeout(resolve, 1500)); 

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setIsLoading(false); // Go back to form if error
      setError(result.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5', // Clean light background
        p: 2,
      }}
    >
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        elevation={12}
        sx={{
          maxWidth: '1200px',
          width: '100%',
          maxHeight: { xs: '95vh', md: '750px' },
          height: { xs: 'auto', md: '100%' },
          display: 'flex',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {(isLoading || isDemoLoading) ? (
            <motion.div
              key="loading-spinner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}
            >
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
                {isDemoLoading ? 'Starting Demo Session...' : 'Logging in...'}
              </Typography>
            </motion.div>
          ) : (
            <motion.div
              key="login-content"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{ width: '100%', height: '100%' }}
            >
              <Grid container sx={{ height: '100%' }}>
                
                {/* --- Left Column: Form --- */}
                <Grid item size={{ xs: 12, md: 5 }}>
                  <Box
                    sx={{
                      p: { xs: 3, sm: 6 },
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      height: '100%',
                      backgroundColor: '#ffffff',
                      position: 'relative'
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      {/* Logo Section */}
                    <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box
                        component="img"
                        sx={{ height: 140, mb: 2 }}
                        alt="VinJack Motorworks Logo"
                        src="/assets/vinjack_logo.png" 
                      />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        VinJack System
                      </Typography>
                    </Box>

                    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
                      <Grid container spacing={2}>
                        
                        <Grid item size={{ xs: 12 }}>
                          <TextField
                            required
                            fullWidth
                            id="username"
                            label="Username" // Changed placeholder to label for better Material UI look
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            error={!!(error && (error.includes('Username') || error.includes('email') || error.includes('required')))}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonOutlinedIcon color="action" />
                                </InputAdornment>
                              ),
                              sx: { borderRadius: '8px' }
                            }}
                          />
                        </Grid>
                        
                        <Grid item size={{ xs: 12 }}>
                          <TextField
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={!!(error && (error.includes('Password') || error.includes('password') || error.includes('required')))}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LockOutlinedIcon color="action" />
                                </InputAdornment>
                              ),
                              sx: { borderRadius: '8px' }
                            }}
                          />
                        </Grid>

                        <Grid item size={{ xs: 12 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  value="remember"
                                  color="primary"
                                  checked={rememberMe}
                                  onChange={(e) => setRememberMe(e.target.checked)}
                                />
                              }
                              label={<Typography variant="body2">Remember me</Typography>}
                            />
                          </Box>
                        </Grid>

                        {error && (
                          <Grid item size={{ xs: 12 }} sx={{ mb: 1 }}> 
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                              <Alert severity="error" variant="outlined">{error}</Alert>
                            </motion.div>
                          </Grid>
                        )}

                        <Grid item size={{ xs: 12 }}>
                          <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{
                              py: 1.5,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              borderRadius: '8px',
                              textTransform: 'none',
                              boxShadow: 2
                            }}
                          >
                            Sign In
                          </Button>
                        </Grid>

                        <Grid item size={{ xs: 12 }}>
                          <Divider sx={{ my: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">or</Typography>
                          </Divider>
                        </Grid>

                        <Grid item size={{ xs: 12 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            startIcon={<PlayArrowRoundedIcon />}
                            onClick={handleDemoLogin}
                            sx={{
                              py: 1.5,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              borderRadius: '8px',
                              textTransform: 'none',
                              borderWidth: 2,
                              '&:hover': { borderWidth: 2 }
                            }}
                          >
                            Login as Demo Admin
                          </Button>
                        </Grid>



                      </Grid>
                    </Box>
                  </Box>
            </Box>
          </Grid>

          {/* --- Right Column: Background Image --- */}
          <Grid 
            item 
            size={{ xs: false, md: 7 }}
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'relative',
              // FIXED: Using proper CSS background image instead of video tag
              backgroundImage: 'url("/assets/motorcycle-bg.jpg")', 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Gradient Overlay for text readability */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)',
                zIndex: 1,
              }}
            />
            
            {/* Animated Text Overlay */}
            <Box
              sx={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                p: 8,
                color: '#ffffff',
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Typography variant="h2" sx={{ fontWeight: '800', mb: 2 }}>
                  Welcome Back.
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 300, color: 'rgba(255, 255, 255, 0.8)', maxWidth: '450px', lineHeight: 1.6 }}>
                  Manage your inventory, track sales, and handle suppliers with the VinJack System.
                </Typography>
              </motion.div>
            </Box>
            
          </Grid>
        </Grid>
            </motion.div>
          )}
        </AnimatePresence>
      </Paper>
    </Box>
  );
};

export default LoginPage;