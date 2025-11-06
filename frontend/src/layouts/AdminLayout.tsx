import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AIChat from '../components/AIChat';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: 'linear-gradient(to bottom, #E3F2FD 0%, #FFFFFF 30%)',
      overflow: 'hidden',
    }}>
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          marginLeft: '280px', 
          height: '100vh',
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#F5F5F5',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#D0D0D0',
            borderRadius: '4px',
            '&:hover': {
              background: '#B0B0B0',
            },
          },
        }}>
            <Box component="main" sx={{ 
              flexGrow: 1, 
              p: { xs: 2, sm: 3, md: 4 }, 
              minHeight: '100%',
            }}>
                <Outlet />
            </Box>
            <AIChat />
        </Box>
    </Box>
  );
};

export default AdminLayout;