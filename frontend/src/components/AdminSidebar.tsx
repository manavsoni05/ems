// frontend/src/components/AdminSidebar.tsx
import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { MotionBox } from './Motion';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useState } from 'react';
import { useAuth } from '../hooks/hooks/useAuth';
import { API_BASE_URL } from '../services/api';
import logoImage from '../assets/logo.svg';

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
    { title: 'Dashboard', path: '/admin/dashboard', icon: <DashboardOutlinedIcon sx={{ fontSize: 22 }} /> },
    { title: 'Manage Roles', path: '/admin/manage-roles', icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'role:manage' },
    { title: 'Manage Leaves', path: '/admin/manage-leaves', icon: <EventNoteOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'leave:read_all' },
    { title: 'Manage Assets', path: '/admin/manage-assets', icon: <InventoryOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'asset:read_all' },
    { title: 'Attendance Report', path: '/admin/attendance-report', icon: <AssessmentOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'employee:read_all' },
    { title: 'Manage Payroll', path: '/admin/manage-payroll', icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'payroll:read_all' },
    { title: 'Performance Reviews', path: '/admin/manage-performance-reviews', icon: <RateReviewOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'performance:read_all' },
    { title: 'Employee Skills', path: '/admin/manage-employee-skills', icon: <SchoolOutlinedIcon sx={{ fontSize: 22 }} />, permission: 'skill:read_all' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    navigate('/admin/profile');
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
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        borderRight: '1px solid #E0E0E0',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#F5F5F5',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#D0D0D0',
          borderRadius: '3px',
          '&:hover': {
            background: '#B0B0B0',
          },
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          component="img"
          src={logoImage}
          alt="Company Logo"
          sx={{
            width: '90%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
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

      {/* User Profile Section */}
      <Box
        sx={{
          mt: 'auto',
          p: 2,
          borderTop: '1px solid #E0E0E0',
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
            src={user?.employee_id ? `${API_BASE_URL}/static/images/${user.employee_id}.jpg` : undefined}
            sx={{ width: 40, height: 40, mr: 1.5, bgcolor: '#5A3FFF' }}
          >
            {user?.employee_id?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#212121' }}>
              {user?.employee_id || 'Admin'}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#999999' }}>
              View Profile
            </Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#666666' }} />
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
          PaperProps={{
            sx: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              mt: -1,
            }
          }}
        >
          <MenuItem onClick={handleEditProfile} sx={{ py: 1.5, px: 2 }}>
            <ListItemIcon>
              <PersonOutlineIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>Edit Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2 }}>
            <ListItemIcon>
              <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </MotionBox>
  );
};

export default AdminSidebar;
