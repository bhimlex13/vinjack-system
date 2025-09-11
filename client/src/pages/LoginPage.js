// client/src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

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
  InputAdornment
} from '@mui/material';

// Icon Imports
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        backgroundColor: '#0080ffff',
        backgroundImage: 'url(/assets/motorcycle-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 650,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(24, 34, 92, 0.35)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          color: 'white',
          border: '1px solid rgba(8, 1, 51, 0.18)',
        }}
      >
        {/* --- ADDED: Logo and System Name --- */}
        <Box
          component="img"
          sx={{
            height: 80,
            mb: 1,
          }}
          alt="VinJack Motorworks Logo"
          src="/assets/vinjack_logo.png" 
        />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }}>
          VinJack Motorworks
        </Typography>
        <Typography component="p" variant="subtitle1" gutterBottom>
          Sales & Inventory System
        </Typography>

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'white' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
              '& .MuiInputBase-input': { color: 'white' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: 'white' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'white' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
              '& .MuiInputBase-input': { color: 'white' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: 'white' }} />
                </InputAdornment>
              ),
            }}
          />
          {/* --- REMOVED: "Forgot Password?" link and simplified "Remember Me" --- */}
          <FormControlLabel
            control={
              <Checkbox
                value="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-checked': { color: 'white' } }}
              />
            }
            label={<Typography variant="body2">Remember Me</Typography>}
          />
          {error && (
            <Typography color="error" variant="body2" align="center" sx={{ mt: 1, mb: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              fontSize: '1rem',
              backgroundColor: 'white',
              color: '#2c3e50',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
              },
            }}
          >
            {isLoading ? <CircularProgress size={24} sx={{ color: '#2c3e50' }} /> : 'Sign In'}
          </Button>

          {/* --- REMOVED: "Register" link section --- */}
          
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;