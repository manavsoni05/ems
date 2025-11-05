import { Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom>Access Denied</Typography>
      <Typography variant="body1">You do not have permission to view this page.</Typography>
      <Button variant="contained" sx={{ mt: 4 }} onClick={() => navigate(-1)}>Go Back</Button>
    </Box>
  );
};
export default Unauthorized;