// frontend/src/pages/Login.tsx
import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useAuth } from '../hooks/hooks/useAuth';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Link,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { MotionBox } from '../components/Motion';

const Login = () => {
  const [employeeId, setEmployeeId] = useState('EMP001');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { login } = useAuth();

  const cardsData = [
    {
      title: 'Smart Tracking',
      description: 'Real-time employee tracking and attendance monitoring',
      icon: '📊',
    },
    {
      title: 'Performance Analytics',
      description: 'Track performance metrics and employee growth',
      icon: '📈',
    },
    {
      title: 'Team Management',
      description: 'Manage teams efficiently with smart tools',
      icon: '👥',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % cardsData.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(employeeId, password);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'An error occurred');
      }
      setIsLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ minHeight: '100vh' }}>
      
      {/* LEFT SECTION: Login Form (40%) */}
      <Grid
        item
        xs={12}
        sm={12}
        md={5}
        component={MotionBox}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 5 },
          backgroundColor: '#FFFFFF',
          minHeight: { xs: 'auto', md: '100vh' },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
          }}
        >
          {/* Welcome Message - Top Center */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#212121',
                mb: 1,
              }}
            >
              Welcome Back!
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#999999',
              }}
            >
              Please enter your details
            </Typography>
          </Box>

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {/* Employee ID Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#212121',
                  mb: 1,
                }}
              >
                Employee ID
              </Typography>
              <TextField
                fullWidth
                id="employee_id"
                name="employee_id"
                type="text"
                value={employeeId}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmployeeId(e.target.value)
                }
                autoFocus
                disabled={isLoading}
                placeholder="Enter your employee ID"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '15px',
                    fontWeight: 400,
                    '& fieldset': {
                      borderColor: '#E0E0E0',
                      borderRadius: '6px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#D0D0D0',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#5A3FFF',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#212121 !important',
                    '&::placeholder': {
                      color: '#999999',
                      opacity: 1,
                    }
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#212121',
                  mb: 1,
                }}
              >
                Password
              </Typography>
              <TextField
                fullWidth
                name="password"
                type="password"
                id="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                disabled={isLoading}
                placeholder="Enter your password"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '15px',
                    fontWeight: 400,
                    '& fieldset': {
                      borderColor: '#E0E0E0',
                      borderRadius: '6px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#D0D0D0',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#5A3FFF',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#212121 !important',
                    '&::placeholder': {
                      color: '#999999',
                      opacity: 1,
                    }
                  },
                }}
              />
            </Box>
            {/* Remember Me & Forgot Password */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      '& .MuiSvgIcon-root': {
                        fontSize: '18px',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#212121' }}>
                    Remember me
                  </Typography>
                }
                sx={{ m: 0 }}
              />
              <Link
                href="#"
                sx={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#5A3FFF',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {error}
              </Alert>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              sx={{
                mb: 3,
                py: 1.5,
                fontSize: '16px',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                color: 'white',
                borderRadius: '6px',
                textTransform: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(90, 63, 255, 0.3)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                  opacity: 0.7,
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Login →'
              )}
            </Button>

            {/* Terms & Conditions */}
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#999999',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              By logging in, you agree to our{' '}
              <Link
                href="#"
                sx={{
                  color: '#5A3FFF',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link
                href="#"
                sx={{
                  color: '#5A3FFF',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* RIGHT SECTION: Carousel with Cards (60%) */}
      <Grid
        item
        xs={false}
        md={7}
        component={MotionBox}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 5,
          background: 'linear-gradient(135deg, #6D4CFF 0%, #8E7DFF 100%)',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            width: 300,
            height: 300,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            top: -100,
            right: -100,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 200,
            height: 200,
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '50%',
            bottom: -80,
            left: -60,
          }}
        />

        {/* Carousel Container */}
        <Box
          sx={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 500,
          }}
        >
          {/* Animated Card */}
          <MotionBox
            key={currentCardIndex}
            initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            transition={{ duration: 0.6 }}
            sx={{
              width: '100%',
              aspectRatio: '1',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: '64px',
                mb: 3,
              }}
            >
              {cardsData[currentCardIndex].icon}
            </Typography>
            <Typography
              sx={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#FFFFFF',
                mb: 2,
              }}
            >
              {cardsData[currentCardIndex].title}
            </Typography>
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
              }}
            >
              {cardsData[currentCardIndex].description}
            </Typography>
          </MotionBox>

          {/* Carousel Indicators */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            {cardsData.map((_, index) => (
              <Box
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                sx={{
                  width: index === currentCardIndex ? 30 : 10,
                  height: 10,
                  borderRadius: '5px',
                  backgroundColor:
                    index === currentCardIndex
                      ? 'rgba(255, 255, 255, 0.95)'
                      : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Login;