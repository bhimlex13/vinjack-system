// client/src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { isEmail } from 'validator';

// MUI Imports
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Alert,
  Link,
  IconButton,
  Icon
} from '@mui/material';

// Icon Imports
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Client-Side Validation (preserved)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
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
        // --- Dark blue background to match the image's vibe ---
        backgroundColor: '#ffffffff', // Changed from #192A4C
        p: 2,
      }}
    >
      <Paper
        elevation={12}
        sx={{
          maxWidth: '1200px', // Increased max width
          width: '100%',
          maxHeight: { xs: '95vh', md: '750px' },
          height: { xs: 'auto', md: '100%' },
          display: 'flex',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <Grid container sx={{ height: '100%' }}>
          
          {/* --- Left Column: The Form (like the image) --- */}
          <Grid item size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                p: { xs: 3, sm: 6 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                backgroundColor: '#ffffff',
              }}
            >
              {/* --- MODIFIED: Logo and Title are now in a column --- */}
              <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                  component="img"
                  sx={{ 
                    height: 160, 
                    mb: 2 // Added margin bottom to separate from text
                  }}
                  alt="VinJack Motorworks Logo"
                  src="/assets/vinjack_logo.png" 
                />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  VinJack System
                </Typography>
              </Box>
              {/* --- END MODIFICATION --- */}


              <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                  
                  {/* --- Username / Email Field --- */}
                  <Grid item size={{ xs: 12 }}>
                    <TextField
                      required
                      fullWidth
                      id="username"
                      placeholder="Username"
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
                        sx: { borderRadius: '8px' } // Rounded corners
                      }}
                    />
                  </Grid>
                  
                  {/* --- Password Field --- */}
                  <Grid item size={{ xs: 12 }}>
                    <TextField
                      required
                      fullWidth
                      name="password"
                      placeholder="Password"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      // --- *** THIS IS THE FIX *** ---
                      onChange={(e) => setPassword(e.target.value)}
                      // --- *** END FIX *** ---
                      error={!!(error && (error.includes('Password') || error.includes('password') || error.includes('required')))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon color="action" />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: '8px' } // Rounded corners
                      }}
                    />
                  </Grid>

                  {/* --- Remember Me & Forgot Password --- */}
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

                  {/* --- Error Alert --- */}
                  {error && (
                    // --- MODIFIED: Added mb={1} for spacing ---
                    <Grid item size={{ xs: 12 }} sx={{ mb: 1 }}> 
                      <Alert severity="error" variant="outlined">{error}</Alert>
                    </Grid>
                  )}

                  {/* --- Sign In Button --- */}
                  <Grid item size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={isLoading}
                      sx={{
                        // --- MODIFIED: Removed mt: 2 to rely on Alert's margin-bottom ---
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: '8px', // Rounded corners
                      }}
                    >
                      {isLoading ? <CircularProgress size={26} color="inherit" /> : 'LOGIN'}
                    </Button>
                  </Grid>
                  
                </Grid>
              </Box>
            </Box>
          </Grid>

          {/* --- Right Column: The Video (like the image) --- */}
          <Grid 
            item 
            size={{ xs: false, md: 7 }}
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'relative', // For text overlay
              backgroundColor: '#000', // Fallback color
            }}
          >
            {/* --- The Video Element --- */}
            <Box
              component="video"
              autoPlay
              loop
              muted
              playsInline // Important for mobile browsers
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover', // Fills the container
                zIndex: 1,
              }}
            >
              {/* !!!! IMPORTANT !!!!
                Replace this 'src' with the path to your own video file.
                You can put a video (e.g., 'login-bg.mp4') in your /public/assets/ folder
                and then use the path src="/assets/login-bg.mp4"
              */}
              <source 
                src="https://cms-public-artifacts.motionarray.com/content/motion-array/1055081/PRD-1055081-VxhMLuZpI5dg5p9N-original_playlist_1708607705.m3u8" 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </Box>
            
            {/* --- Welcome Text Overlay --- */}
            <Box
              sx={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                p: 6,
                color: '#ffffff',
                // Add a subtle gradient overlay to make text more readable
                background: 'linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0,0,0,0.5))',
              }}
            >
              <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
                Welcome.
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(236, 249, 250, 0.7)', mt: 1, maxWidth: '400px' }}>
                Log in to access the VinJack Sales and Inventory Management System.
              </Typography>
            </Box>
            
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LoginPage;