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
    }}>
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          marginLeft: '280px', 
          minHeight: '100vh',
          maxWidth: 'calc(100vw - 280px)',
          overflow: 'hidden',
        }}>
            <Box component="main" sx={{ 
              flexGrow: 1, 
              p: { xs: 2, sm: 3, md: 4 }, 
              minHeight: '100vh',
              maxWidth: '100%',
              overflow: 'auto',
            }}>
                <Outlet />
            </Box>
            <AIChat />
        </Box>
    </Box>
  );
};

export default AdminLayout;