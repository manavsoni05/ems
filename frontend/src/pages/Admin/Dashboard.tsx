// frontend/src/pages/Admin/Dashboard.tsx
import { useState, useMemo } from 'react';
import { useQueries, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; 
import api, { API_BASE_URL } from '../../services/api';
import {
    Box, Typography, Grid, Paper, CircularProgress, Button, Avatar, ListItemText, List, ListItem, ListItemAvatar,
    Snackbar, Alert
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useAuth } from '../../hooks/hooks/useAuth';
import Notifications from '../../components/Notifications';
import { MotionBox } from '../../components/Motion';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Fetch functions
const fetchEmployees = () => api.get('/employees').then(res => res.data);
const fetchLeaves = () => api.get('/leaves').then(res => res.data);
const fetchAssets = () => api.get('/assets').then(res => res.data);
const fetchMyDetails = () => api.get('/employees/me/details').then(res => res.data);
const fetchAllAttendance = () => api.get('/attendance').then(res => res.data);
const deleteEmployee = (employeeId: string) => api.delete(`/employees/${employeeId}`);
const checkIn = () => api.post('/attendance/check-in');
const checkOut = () => api.put('/attendance/check-out');
const fetchTeamAssets = () => api.get('/assets/team').then(res => res.data);
const fetchMyAssets = () => api.get('/assets/me').then(res => res.data);
const fetchAttendanceStatus = () => api.get('/attendance/me/status').then(res => res.data);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Permission helper
  const can = (perm: string) => {
    if (!user) return false;
    // Admin role override
    if (user.role_id === 'admin') return true;
    return user.permissions.includes(perm);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState<string | null>(null);
  const [employeeToDeleteName, setEmployeeToDeleteName] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const results = useQueries({
    queries: [
        { queryKey: ['employees'], queryFn: fetchEmployees, enabled: !!user },
        { queryKey: ['leaves'], queryFn: fetchLeaves, enabled: !!user },
        { queryKey: ['assets'], queryFn: fetchAssets, enabled: !!user },
        { queryKey: ['myDetails', user?.employee_id], queryFn: fetchMyDetails, enabled: !!user },
        { queryKey: ['teamAssets', user?.employee_id], queryFn: fetchTeamAssets, enabled: !!user },
        { queryKey: ['myAssets', user?.employee_id], queryFn: fetchMyAssets, enabled: !!user },
        { queryKey: ['allAttendance'], queryFn: fetchAllAttendance, enabled: !!user },
    ]
  });

  const { data: attendanceStatus, isLoading: isLoadingStatus } = useQuery({
      queryKey: ['myAttendanceStatus'],
      queryFn: fetchAttendanceStatus,
      enabled: !!user,
  });

  const isLoading = results.some(q => q.isLoading) || isLoadingStatus;
  const [employees, leaves, , meDetails, teamAssets, myAssets, allAttendance] = results.map(res => res.data);
  
  const isCheckedIn = attendanceStatus?.status === 'checked_in';

  // Calculate today's attendance stats
  const todayAttendanceStats = useMemo(() => {
    if (!allAttendance || !employees) return { present: 0, absent: 0, onLeave: 0 };
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = allAttendance.filter((a: any) => {
      const checkInDate = new Date(a.check_in_time).toISOString().split('T')[0];
      return checkInDate === today;
    });
    
    const present = todayAttendance.length;
    const onLeave = leaves?.filter((l: any) => {
      const leaveStart = new Date(l.start_date).toISOString().split('T')[0];
      const leaveEnd = new Date(l.end_date).toISOString().split('T')[0];
      return l.status === 'approved' && leaveStart <= today && leaveEnd >= today;
    }).length || 0;
    
    const totalEmployees = employees.length || 0;
    const absent = totalEmployees - present - onLeave;
    
    return { present, absent, onLeave };
  }, [allAttendance, employees, leaves]);

  const employeeMap = useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map((emp: any) => [emp.employee_id, `${emp.first_name} ${emp.last_name}`]));
  }, [employees]);

  const deleteMutation = useMutation({
      mutationFn: deleteEmployee,
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          setSnackbarMessage('Employee deleted successfully.');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
      },
      onError: (error: any) => {
         setSnackbarMessage(`Error deleting employee: ${error.response?.data?.detail || error.message}`);
         setSnackbarSeverity('error');
         setSnackbarOpen(true);
      }
  });

  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
        setSnackbarMessage('Checked In Successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        queryClient.invalidateQueries({ queryKey: ['myAttendanceStatus'] });
    },
    onError: (error: any) => {
        setSnackbarMessage(`Check-in Error: ${error.response?.data?.detail || error.message}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOut,
     onSuccess: () => {
        setSnackbarMessage('Checked Out Successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        queryClient.invalidateQueries({ queryKey: ['myAttendanceStatus'] });
    },
    onError: (error: any) => {
        setSnackbarMessage(`Check-out Error: ${error.response?.data?.detail || error.message}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
    }
  });

  const handleDelete = (id: string, name: string) => {
    setEmployeeToDeleteId(id);
    setEmployeeToDeleteName(name);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (employeeToDeleteId) {
      deleteMutation.mutate(employeeToDeleteId);
    }
    setConfirmOpen(false);
    setEmployeeToDeleteId(null);
    setEmployeeToDeleteName('');
  };

  const columns: GridColDef[] = [
    { 
      field: 'photo_url', 
      headerName: '', 
      width: 70, 
      renderCell: (params) => (
        <Avatar 
          src={params.value ? `${API_BASE_URL}${params.value}`: undefined}
          sx={{ 
            width: 40, 
            height: 40,
            border: '2px solid #E0E0E0',
          }}
        >
          {params.row.first_name?.[0]}{params.row.last_name?.[0]}
        </Avatar>
      ), 
      sortable: false, 
      filterable: false 
    },
    { 
      field: 'employee_id', 
      headerName: 'Employee ID', 
      width: 130,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 600, color: '#5A3FFF', fontSize: '13px' }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'first_name', 
      headerName: 'First Name', 
      width: 140,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500, color: '#212121', fontSize: '14px' }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'last_name', 
      headerName: 'Last Name', 
      width: 140,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500, color: '#212121', fontSize: '14px' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'job_title', 
      headerName: 'Job Title', 
      flex: 1, 
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #E3F2FD 0%, #E8F5E9 100%)',
          border: '1px solid #90CAF9',
          display: 'inline-block',
        }}>
          <Typography sx={{ color: '#1976D2', fontSize: '12px', fontWeight: 600 }}>
            {params.value || 'N/A'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'department', 
      headerName: 'Department', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params) => (
        <Typography sx={{ color: '#666666', fontSize: '13px', fontWeight: 500 }}>
          {params.value || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'reports_to', 
      headerName: 'Reports To', 
      width: 180, 
      valueGetter: (value) => employeeMap.get(value) || value || 'N/A',
      renderCell: (params) => (
        <Typography sx={{ color: '#666666', fontSize: '13px' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id, row }) => [
          ...(can("employee:update") ? [
            <GridActionsCellItem 
              icon={<EditIcon sx={{ color: '#5A3FFF' }} />} 
              label="Edit" 
              onClick={() => navigate(`/admin/employees/edit/${id}`)}
            />
          ] : []),
          ...(can("employee:delete") ? [
            <GridActionsCellItem 
              icon={<DeleteIcon sx={{ color: '#F44336' }} />} 
              label="Delete" 
              onClick={() => handleDelete(id as string, `${row.first_name} ${row.last_name}`)}
            />
          ] : []),
      ]
    },
  ];

  if (isLoading) return <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      
      {/* Top Bar with Welcome and Check In/Out */}
      <MotionBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box>
          <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#212121', mb: 0.5 }}>
            Welcome, {meDetails?.employee.first_name || 'Admin'}
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#999999' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

        {/* Check In/Out Buttons and Notifications */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<LoginIcon />}
            disabled={isCheckedIn}
            onClick={() => checkInMutation.mutate()}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)',
              opacity: isCheckedIn ? 0.5 : 1,
            }}
          >
            {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            disabled={!isCheckedIn}
            onClick={() => checkOutMutation.mutate()}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: '0 2px 8px rgba(244, 67, 54, 0.2)',
              opacity: !isCheckedIn ? 0.5 : 1,
            }}
          >
            {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
          </Button>
          
          {/* Notifications Icon */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '8px',
            border: '1px solid #E0E0E0',
            background: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: '#F5F5F5',
              borderColor: '#212121',
            }
          }}>
            <Notifications />
          </Box>
        </Box>
      </MotionBox>

      {/* Today's Attendance Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MotionBox
            component={Paper}
            sx={{
              p: 3,
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#5A3FFF',
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(90, 63, 255, 0.2)',
            }}>
              <GroupIcon sx={{ fontSize: 28, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ color: '#999999', fontSize: '13px', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Employees
            </Typography>
            <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#212121' }}>
              {employees?.length || 0}
            </Typography>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox
            component={Paper}
            sx={{
              p: 3,
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#4CAF50',
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
            }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ color: '#999999', fontSize: '13px', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Present Today
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#212121' }}>
                {todayAttendanceStats.present}
              </Typography>
              <TrendingUpIcon sx={{ fontSize: 24, color: '#4CAF50' }} />
            </Box>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox
            component={Paper}
            sx={{
              p: 3,
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#FF9800',
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
            }}>
              <EventAvailableIcon sx={{ fontSize: 28, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ color: '#999999', fontSize: '13px', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              On Leave
            </Typography>
            <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#212121' }}>
              {todayAttendanceStats.onLeave}
            </Typography>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox
            component={Paper}
            sx={{
              p: 3,
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#F44336',
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
            }}>
              <TrendingDownIcon sx={{ fontSize: 28, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ color: '#999999', fontSize: '13px', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Absent Today
            </Typography>
            <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#212121' }}>
              {todayAttendanceStats.absent}
            </Typography>
          </MotionBox>
        </Grid>
      </Grid>

      {/* Two Column Layout for Team and Assets */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Team Overview Section */}
        {meDetails?.direct_reports && meDetails.direct_reports.length > 0 && (
          <Grid item xs={12} lg={6}>
            <MotionBox component={Paper} sx={{
              p: 3,
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#5A3FFF',
              }
            }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                  mr: 1.5,
                }}>
                  <GroupIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
                </Box>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#212121' }}>Team Overview</Typography>
              </Box>
              <List sx={{ p: 0 }}>
                {meDetails.direct_reports.map((report: any, index: number) => (
                  <ListItem 
                    key={report.employee_id} 
                    divider={index !== meDetails.direct_reports.length - 1}
                    sx={{ 
                      py: 1.5, 
                      px: 0,
                      borderColor: '#F5F5F5',
                      '&:hover': {
                        backgroundColor: '#F8F9FA',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={report.photo_url ? `${API_BASE_URL}${report.photo_url}` : ''} 
                        sx={{ 
                          width: 44, 
                          height: 44,
                          border: '2px solid #E0E0E0',
                        }}
                      >
                        {report.first_name?.[0]}{report.last_name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${report.first_name} ${report.last_name}`}
                      secondary={`${report.job_title || 'N/A'} • ${report.employee_id}`}
                      primaryTypographyProps={{ sx: { fontWeight: 600, color: '#212121', fontSize: '14px' } }}
                      secondaryTypographyProps={{ sx: { color: '#999999', fontSize: '12px', mt: 0.3 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </MotionBox>
          </Grid>
        )}

        {/* My Assets Section */}
        {myAssets && myAssets.length > 0 && (
          <Grid item xs={12} lg={meDetails?.direct_reports && meDetails.direct_reports.length > 0 ? 6 : 12}>
            <MotionBox component={Paper} sx={{
              p: 3,
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                borderColor: '#5A3FFF',
              }
            }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
                  mr: 1.5,
                }}>
                  <EventAvailableIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
                </Box>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#212121' }}>My Assets</Typography>
              </Box>
              <List sx={{ p: 0 }}>
                {myAssets.map((asset: any, index: number) => (
                  <ListItem 
                    key={asset.allotment_id} 
                    divider={index !== myAssets.length - 1}
                    sx={{ 
                      py: 1.5, 
                      px: 0,
                      borderColor: '#F5F5F5',
                      '&:hover': {
                        backgroundColor: '#F8F9FA',
                      }
                    }}
                  >
                    <ListItemText 
                      primary={asset.asset_details.asset_name}
                      secondary={`ID: ${asset.asset_details.asset_id}`}
                      primaryTypographyProps={{ sx: { fontWeight: 600, color: '#212121', fontSize: '14px' } }}
                      secondaryTypographyProps={{ sx: { color: '#999999', fontSize: '12px', mt: 0.3 } }}
                    />
                  </ListItem>
                ))}
              </List>
            </MotionBox>
          </Grid>
        )}
      </Grid>

      {/* Team Assets Section */}
      {teamAssets && teamAssets.length > 0 && (
        <MotionBox component={Paper} sx={{
          p: 3,
          mb: 4,
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            borderColor: '#5A3FFF',
          }
        }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
              mr: 1.5,
            }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
            </Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#212121' }}>Team Assets</Typography>
          </Box>
          <List sx={{ p: 0 }}>
            {teamAssets.map((asset: any, index: number) => (
              <ListItem 
                key={asset.allotment_id} 
                divider={index !== teamAssets.length - 1}
                sx={{ 
                  py: 1.5, 
                  px: 0,
                  borderColor: '#F5F5F5',
                  '&:hover': {
                    backgroundColor: '#F8F9FA',
                  }
                }}
              >
                <ListItemText
                  primary={asset.asset_details.asset_name}
                  secondary={`ID: ${asset.asset_details.asset_id} • Allocated to Team`}
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: '#212121', fontSize: '14px' } }}
                  secondaryTypographyProps={{ sx: { color: '#999999', fontSize: '12px', mt: 0.3 } }}
                />
              </ListItem>
            ))}
          </List>
        </MotionBox>
      )}

      {/* Employee Roster Title and Button */}
      {can("employee:read_all") && (
        <>
            <MotionBox 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                mb: 2,
              }} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.5, delay: 0.7 }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                    mr: 1.5,
                  }}>
                    <GroupIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
                  </Box>
                  <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#212121' }}>
                    Employee Roster
                  </Typography>
                </Box>
                {can("employee:create") && (
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={() => navigate('/admin/employees/new')} 
                      sx={{
                        background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        boxShadow: '0 4px 12px rgba(90, 63, 255, 0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(90, 63, 255, 0.4)',
                          transform: 'translateY(-2px)',
                        }
                      }}
                    >
                      Add Employee
                    </Button>
                )}
            </MotionBox>

            {/* Employee Roster DataGrid */}
            <MotionBox sx={{ 
              width: '100%',
              maxWidth: '100%',
              overflow: 'auto',
            }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }}>
                <DataGrid
                    rows={employees || []}
                    columns={columns}
                    getRowId={(row) => row.employee_id}
                    density="comfortable"
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 }}}}
                    pageSizeOptions={[10, 25, 50]}
                    loading={deleteMutation.isPending}
                    sx={{
                      minWidth: '100%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      '& .MuiDataGrid-cell': {
                        borderColor: '#F0F0F0',
                        py: 1.5,
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'transparent',
                        borderBottom: '2px solid #E0E0E0',
                        borderTop: 'none',
                      },
                      '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 700,
                        color: '#212121',
                        fontSize: '13px',
                      },
                      '& .MuiDataGrid-row': {
                        backgroundColor: 'transparent',
                        '&:hover': {
                          backgroundColor: '#F8F9FA',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(90, 63, 255, 0.04)',
                          '&:hover': {
                            backgroundColor: 'rgba(90, 63, 255, 0.08)',
                          }
                        }
                      },
                      '& .MuiDataGrid-footerContainer': {
                        borderTop: '1px solid #E0E0E0',
                        backgroundColor: 'transparent',
                      },
                      '& .MuiDataGrid-virtualScroller': {
                        backgroundColor: 'transparent',
                      },
                    }}
                />
            </MotionBox>
        </>
      )}

      {/* --- Snackbar for Notifications --- */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

       {/* --- Confirmation Dialog for Deletion --- */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setEmployeeToDeleteId(null); setEmployeeToDeleteName(''); }}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete employee ${employeeToDeleteName} (${employeeToDeleteId || ''})? This action cannot be undone.`}
      />
    </Box>
  );
};

export default AdminDashboard;