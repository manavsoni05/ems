// frontend/src/pages/Admin/Dashboard.tsx
import { useState, useMemo } from 'react';
import { useQueries, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; 
import api, { API_BASE_URL } from '../../services/api';
import {
    Box, Typography, Grid, Paper, CircularProgress, Button, Avatar, ListItemText, List, ListItem, ListItemAvatar,
    Snackbar, Alert, IconButton, Pagination, Select, MenuItem, FormControl
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
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

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Employee list pagination and sorting state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('employee_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

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

  // Sorting and pagination logic for employee list
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!employees) return [];
    
    const sorted = [...employees].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle reports_to field specially
      if (sortField === 'reports_to') {
        aValue = employeeMap.get(a.reports_to) || a.reports_to || '';
        bValue = employeeMap.get(b.reports_to) || b.reports_to || '';
      }

      // Handle name field (combination of first and last name)
      if (sortField === 'name') {
        aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
        bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [employees, sortField, sortOrder, employeeMap]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = page * pageSize;
    return sortedEmployees.slice(startIndex, startIndex + pageSize);
  }, [sortedEmployees, page, pageSize]);

  const totalPages = Math.ceil((sortedEmployees?.length || 0) / pageSize);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(event.target.value);
    setPage(0);
  };

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

      {/* Today's Attendance Stats - Professional Horizontal Layout */}
      <MotionBox
        component={Paper}
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FF 100%)',
          borderRadius: '16px',
          border: '1px solid #E8E8F0',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
          }
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #F0F0F5' }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#212121' }}>
            Today's Overview
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#757575', mt: 0.5 }}>
            Real-time attendance statistics
          </Typography>
        </Box>
        
        <Grid container>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              p: 3, 
              borderRight: { xs: 'none', md: '1px solid #F0F0F5' },
              borderBottom: { xs: '1px solid #F0F0F5', sm: 'none' },
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(90, 63, 255, 0.02)',
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(90, 63, 255, 0.25)',
                }}>
                  <GroupIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#212121', lineHeight: 1 }}>
                    {employees?.length || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Employees
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              p: 3, 
              borderRight: { xs: 'none', md: '1px solid #F0F0F5' },
              borderBottom: { xs: '1px solid #F0F0F5', md: 'none' },
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(76, 175, 80, 0.02)',
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(76, 175, 80, 0.25)',
                }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#212121', lineHeight: 1 }}>
                    {todayAttendanceStats.present}
                  </Typography>
                  <TrendingUpIcon sx={{ fontSize: 20, color: '#4CAF50' }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Present Today
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              p: 3, 
              borderRight: { xs: 'none', md: '1px solid #F0F0F5' },
              borderBottom: { xs: '1px solid #F0F0F5', sm: '1px solid #F0F0F5', md: 'none' },
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(255, 152, 0, 0.02)',
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(255, 152, 0, 0.25)',
                }}>
                  <EventAvailableIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#212121', lineHeight: 1 }}>
                    {todayAttendanceStats.onLeave}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                On Leave
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              p: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(244, 67, 54, 0.02)',
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(244, 67, 54, 0.25)',
                }}>
                  <TrendingDownIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#212121', lineHeight: 1 }}>
                    {todayAttendanceStats.absent}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Absent Today
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </MotionBox>

      {/* Two Column Layout: Team Overview (Left) & Calendar (Right) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Team Overview Section - Left Column */}
        {meDetails?.direct_reports && meDetails.direct_reports.length > 0 && (
          <Grid item xs={12} lg={6}>
            <MotionBox component={Paper} sx={{
              p: 3,
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E8E8F0',
              height: '480px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
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
              <Box sx={{ 
                flexGrow: 1,
                overflow: 'auto',
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
              }}>
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
              </Box>
            </MotionBox>
          </Grid>
        )}

        {/* Calendar Section - Right Column */}
        <Grid item xs={12} lg={6}>
          <MotionBox
            component={Paper}
            sx={{
              p: 3,
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E8E8F0',
              height: '480px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {/* Calendar Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                }}>
                  <CalendarTodayIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
                </Box>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#212121' }}>
                  Calendar
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  onClick={handlePrevMonth} 
                  sx={{ 
                    border: '1px solid #E8E8F0',
                    borderRadius: '8px',
                    color: '#5A3FFF',
                    '&:hover': { 
                      background: 'rgba(90, 63, 255, 0.08)',
                      borderColor: '#5A3FFF',
                    }
                  }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={handleNextMonth} 
                  sx={{ 
                    border: '1px solid #E8E8F0',
                    borderRadius: '8px',
                    color: '#5A3FFF',
                    '&:hover': { 
                      background: 'rgba(90, 63, 255, 0.08)',
                      borderColor: '#5A3FFF',
                    }
                  }}
                >
                  <ChevronRightIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
                </IconButton>
              </Box>
            </Box>

            {/* Month/Year Display */}
            <Box sx={{ 
              textAlign: 'center', 
              mb: 1.5, 
              py: 1,
              background: 'linear-gradient(135deg, rgba(90, 63, 255, 0.05) 0%, rgba(90, 63, 255, 0.02) 100%)',
              borderRadius: '10px',
            }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#5A3FFF' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Typography>
            </Box>

            {/* Day Headers */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Grid item xs={12/7} key={index}>
                  <Box sx={{ textAlign: 'center', py: 0.5 }}>
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#999999', textTransform: 'uppercase' }}>
                      {day}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Days */}
            <Grid container spacing={0.5}>
              {(() => {
                const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
                const days = [];
                const today = new Date();
                const isCurrentMonth = 
                  currentDate.getMonth() === today.getMonth() && 
                  currentDate.getFullYear() === today.getFullYear();

                // Empty cells for days before month starts
                for (let i = 0; i < startingDayOfWeek; i++) {
                  days.push(
                    <Grid item xs={12/7} key={`empty-${i}`}>
                      <Box sx={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                    </Grid>
                  );
                }

                // Days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const isToday = isCurrentMonth && day === today.getDate();
                  days.push(
                    <Grid item xs={12/7} key={day}>
                      <Box
                        sx={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          background: isToday 
                            ? 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)' 
                            : 'transparent',
                          color: isToday ? '#FFFFFF' : '#212121',
                          fontSize: '12px',
                          fontWeight: isToday ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: isToday ? '2px solid transparent' : '1px solid transparent',
                          '&:hover': {
                            background: isToday 
                              ? 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)' 
                              : 'rgba(90, 63, 255, 0.08)',
                            borderColor: isToday ? 'transparent' : '#E8E8F0',
                            transform: 'scale(1.05)',
                          }
                        }}
                      >
                        {day}
                      </Box>
                    </Grid>
                  );
                }

                return days;
              })()}
            </Grid>
          </MotionBox>
        </Grid>
      </Grid>

      {/* Assets Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* My Assets Section */}
        {myAssets && myAssets.length > 0 && (
          <Grid item xs={12} lg={6}>
            <MotionBox component={Paper} sx={{
              p: 3,
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E8E8F0',
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
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
          borderRadius: '16px',
          border: '1px solid #E8E8F0',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
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
        <MotionBox
          component={Paper}
          sx={{
            p: 3,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E8E8F0',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
            }
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 2.5,
          }}>
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
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#212121' }}>
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
          </Box>

          {/* Employee Roster List */}
          <Box>
            {/* Table Header */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '120px 60px 1fr 1fr 140px 140px 100px',
              gap: 2,
              px: 2,
              py: 1.5,
              backgroundColor: '#FAFAFA',
              borderRadius: '8px 8px 0 0',
              mb: 0,
            }}>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleSort('employee_id')}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                  Employee ID
                </Typography>
                {sortField === 'employee_id' ? (
                  sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                ) : (
                  <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                )}
              </Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                
              </Typography>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleSort('name')}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                  Name
                </Typography>
                {sortField === 'name' ? (
                  sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                ) : (
                  <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                )}
              </Box>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleSort('job_title')}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                  Job Title
                </Typography>
                {sortField === 'job_title' ? (
                  sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                ) : (
                  <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                )}
              </Box>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleSort('department')}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                  Department
                </Typography>
                {sortField === 'department' ? (
                  sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                ) : (
                  <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                )}
              </Box>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleSort('reports_to')}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                  Reports To
                </Typography>
                {sortField === 'reports_to' ? (
                  sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                ) : (
                  <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                )}
              </Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Actions
              </Typography>
            </Box>

            {/* Employee List */}
            <Box>
              {paginatedEmployees && paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee: any, index: number) => (
                  <Box
                    key={employee.employee_id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '120px 60px 1fr 1fr 140px 140px 100px',
                      gap: 2,
                      px: 2,
                      py: 2,
                      backgroundColor: '#FFFFFF',
                      borderBottom: '1px solid #F0F0F0',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#F8F9FA',
                      }
                    }}
                  >
                    {/* Employee ID */}
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#5A3FFF' }}>
                      {employee.employee_id}
                    </Typography>

                    {/* Avatar */}
                    <Avatar 
                      src={employee.photo_url ? `${API_BASE_URL}${employee.photo_url}` : undefined}
                      sx={{ 
                        width: 40, 
                        height: 40,
                        border: '2px solid #E8E8F0',
                      }}
                    >
                      {employee.first_name?.[0]}{employee.last_name?.[0]}
                    </Avatar>

                    {/* Name */}
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#212121' }}>
                        {employee.first_name} {employee.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#999999', mt: 0.2 }}>
                        {employee.email}
                      </Typography>
                    </Box>

                    {/* Job Title */}
                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#666666' }}>
                      {employee.job_title || 'N/A'}
                    </Typography>

                    {/* Department */}
                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#666666' }}>
                      {employee.department || 'N/A'}
                    </Typography>

                    {/* Reports To */}
                    <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                      {employeeMap.get(employee.reports_to) || employee.reports_to || 'N/A'}
                    </Typography>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {can("employee:update") && (
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/employees/edit/${employee.employee_id}`)}
                          sx={{
                            color: '#5A3FFF',
                            '&:hover': {
                              backgroundColor: 'rgba(90, 63, 255, 0.08)',
                            }
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      {can("employee:delete") && (
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(employee.employee_id, `${employee.first_name} ${employee.last_name}`)}
                          sx={{
                            color: '#F44336',
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.08)',
                            }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 8,
                  color: '#999999',
                }}>
                  <Typography sx={{ fontSize: '14px' }}>
                    No employees found
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Pagination Controls */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
              pt: 2,
              borderTop: '1px solid #F0F0F0',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                  Rows per page:
                </Typography>
                <FormControl size="small">
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    sx={{
                      fontSize: '13px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E8E8F0',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#5A3FFF',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#5A3FFF',
                      }
                    }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>
                <Typography sx={{ fontSize: '13px', color: '#666666', ml: 2 }}>
                  {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedEmployees.length)} of {sortedEmployees.length}
                </Typography>
              </Box>

              <Pagination 
                count={totalPages} 
                page={page + 1} 
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#666666',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      backgroundColor: '#5A3FFF',
                      color: '#FFFFFF',
                      '&:hover': {
                        backgroundColor: '#4A2FEF',
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(90, 63, 255, 0.08)',
                    }
                  }
                }}
              />
            </Box>
          </Box>
        </MotionBox>
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