// frontend/src/components/AdminSidebar.tsx
import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { MotionBox } from './Motion';
import { 
  MdDashboard, 
  MdSecurity, 
  MdEventNote, 
  MdInventory, 
  MdBarChart, 
  MdPayment, 
  MdRateReview, 
  MdSchool,
  MdArrowDropDown,
  MdPerson,
  MdLogout
} from 'react-icons/md';
import { useState } from 'react';
import { useAuth } from '../hooks/hooks/useAuth';

interface MenuItemType {
  title: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
}

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const menuItems: MenuItemType[] = [
    { title: 'Dashboard', path: '/admin/dashboard', icon: <MdDashboard size={20} /> },
    { title: 'Manage Roles', path: '/admin/manage-roles', icon: <MdSecurity size={20} />, permission: 'role:manage' },
    { title: 'Manage Leaves', path: '/admin/manage-leaves', icon: <MdEventNote size={20} />, permission: 'leave:read_all' },
    { title: 'Manage Assets', path: '/admin/manage-assets', icon: <MdInventory size={20} />, permission: 'asset:read_all' },
    { title: 'Attendance Report', path: '/admin/attendance-report', icon: <MdBarChart size={20} />, permission: 'employee:read_all' },
    { title: 'Manage Payroll', path: '/admin/manage-payroll', icon: <MdPayment size={20} />, permission: 'payroll:read_all' },
    { title: 'Performance Reviews', path: '/admin/manage-performance-reviews', icon: <MdRateReview size={20} />, permission: 'performance:read_all' },
    { title: 'Employee Skills', path: '/admin/manage-employee-skills', icon: <MdSchool size={20} />, permission: 'skill:read_all' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    navigate('/app/profile');
    handleClose();
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  return (
    <MotionBox
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        width: 280,
        background: '#FFFFFF',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 100,
        borderRight: '1px solid #E0E0E0',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(90, 63, 255, 0.4)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(90, 63, 255, 0.6)',
          },
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid #E0E0E0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              mr: 2,
            }}
          >
            DE
          </Box>
          <Box>
            <Typography
              sx={{
                color: '#212121',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              DUMMYEMS
            </Typography>
            <Typography
              sx={{
                color: '#999999',
                fontSize: '11px',
                fontWeight: 400,
              }}
            >
              Admin Dashboard
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Items */}
      <Box sx={{ mt: 2, px: 1 }}>
        <List sx={{ p: 0 }}>
          {menuItems.map((item, index) => (
            <MotionBox
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 0.5,
                  mx: 1,
                  px: 2,
                  py: 1.5,
                  borderRadius: '8px',
                  background: isActive(item.path)
                    ? 'rgba(90, 63, 255, 0.1)'
                    : 'transparent',
                  border: 'none',
                  color: isActive(item.path)
                    ? '#5A3FFF'
                    : '#666666',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: isActive(item.path)
                      ? 'rgba(90, 63, 255, 0.15)'
                      : 'rgba(90, 63, 255, 0.05)',
                    color: '#5A3FFF',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '14px',
                      fontWeight: isActive(item.path) ? 600 : 500,
                      color: 'inherit',
                    },
                  }}
                />
              </ListItemButton>
            </MotionBox>
          ))}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* User Profile Section */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #E0E0E0',
          position: 'absolute',
          bottom: 40,
          width: '100%',
          background: '#FFFFFF',
        }}
      >
        <Box
          onClick={handleProfileClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'rgba(90, 63, 255, 0.05)',
            },
          }}
        >
          <Avatar 
            sx={{ width: 36, height: 36, mr: 1.5, bgcolor: '#5A3FFF' }}
          >
            {user?.employee_id?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#212121' }}>
              {user?.employee_id || 'Admin'}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#999999' }}>
              Administrator
            </Typography>
          </Box>
          <MdArrowDropDown size={20} color="#666666" />
        </Box>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleEditProfile}>
            <ListItemIcon>
              <MdPerson size={20} />
            </ListItemIcon>
            <ListItemText>Edit Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <MdLogout size={20} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Footer Info */}
      <Box
        sx={{
          p: 2,
          textAlign: 'center',
          position: 'absolute',
          bottom: 0,
          width: '100%',
          borderTop: '1px solid #E0E0E0',
          background: '#FFFFFF',
        }}
      >
        <Typography
          sx={{
            fontSize: '11px',
            color: '#999999',
            fontWeight: 400,
          }}
        >
          © 2025 DUMMYEMS
        </Typography>
      </Box>
    </MotionBox>
  );
};

export default AdminSidebar;
