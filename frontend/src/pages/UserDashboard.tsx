// frontend/src/pages/UserDashboard.tsx
import { useState } from 'react';
import { useQueries, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
// --- FIX 1: Corrected import paths from ../../ to ../ ---
import api, { API_BASE_URL } from '../services/api'; 
import {
    Box, Typography, Grid, Paper, CircularProgress, Avatar, Button, Chip, List, ListItem, ListItemText, Rating, IconButton, Menu, MenuItem, ListItemIcon, ListItemAvatar,
    Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../hooks/hooks/useAuth';
import { useTheme } from '../hooks/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import dayjs from 'dayjs';
import Notifications from '../components/Notifications';
import { MotionBox } from '../components/Motion';
// --- END FIX 1 ---

// --- WIDGET COMPONENTS (Copied from other dashboards) ---

const Widget = ({ title, link, children, delay = 0.2 }: { title: string, link: string, children: React.ReactNode, delay?: number }) => {
    const navigate = useNavigate();
    return (
        <MotionBox component={Paper} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(link)}>
                    View All
                </Button>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                {children}
            </Box>
        </MotionBox>
    );
};

const StatWidget = ({ title, count }: { title: string, count: string | number }) => (
    <MotionBox component={Paper} sx={{ p: 2, textAlign: 'center', height: '100%' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography color="text.secondary">{title}</Typography>
        <Typography variant="h3" fontWeight={700} sx={{ my: 1, color: 'primary.main' }}>{count}</Typography>
    </MotionBox>
);

const NavWidget = ({ title, link, linkText = "Manage" }: { title: string, link: string, linkText?: string }) => {
    const navigate = useNavigate();
    return (
        <MotionBox component={Paper} sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(link)}>
                {linkText}
            </Button>
        </MotionBox>
    );
};

// --- END WIDGET COMPONENTS ---


// --- FIX 2: Add (res: any) to all fetch functions ---
// --- API Fetch Functions ---
// Personal
const fetchMyDetails = () => api.get('/employees/me/details').then((res: any) => res.data);
const fetchMyLeaves = () => api.get('/leaves/me').then((res: any) => res.data);
const fetchMyAssets = () => api.get('/assets/me').then((res: any) => res.data);
const fetchMySkills = () => api.get('/employee-skills/me').then((res: any) => res.data);
const fetchMyPayslips = () => api.get('/payroll/me').then((res: any) => res.data);
const fetchMyReviews = () => api.get('/performance-reviews/me').then((res: any) => res.data);
const fetchTeamAssets = () => api.get('/assets/team').then((res: any) => res.data);
// Management
const fetchAllEmployees = () => api.get('/employees').then((res: any) => res.data);
const fetchAllLeaves = () => api.get('/leaves').then((res: any) => res.data);
// Attendance
const checkIn = () => api.post('/attendance/check-in');
const checkOut = () => api.put('/attendance/check-out');
const fetchAttendanceStatus = () => api.get('/attendance/me/status').then((res: any) => res.data);
// --- End Fetch Functions ---
// --- END FIX 2 ---


const UserDashboard = () => {
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Permission helper
    const can = (perm: string) => {
        if (!user) return false;
        if (user.role_id === 'admin') return true; // Admin can do anything
        return user.permissions.includes(perm);
    };

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // --- FIX 3: Add _ to unused 'event' parameter ---
    const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };
    // --- END FIX 3 ---

    const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleSettingsClose = () => setAnchorEl(null);

    // --- Dynamic Queries ---
    const results = useQueries({
        queries: [
            // Personal Data (Employee)
            { queryKey: ['myDetails', user?.employee_id], queryFn: fetchMyDetails, enabled: !!user && can('employee:read_self') },
            { queryKey: ['myLeaves', user?.employee_id], queryFn: fetchMyLeaves, enabled: !!user && can('leave:read_self') },
            { queryKey: ['myAssets', user?.employee_id], queryFn: fetchMyAssets, enabled: !!user && can('asset:read_self') },
            { queryKey: ['teamAssets', user?.employee_id], queryFn: fetchTeamAssets, enabled: !!user }, // Assuming all users can see team assets if they are a manager
            { queryKey: ['mySkills', user?.employee_id], queryFn: fetchMySkills, enabled: !!user && can('skill:read_self') },
            { queryKey: ['myPayslips', user?.employee_id], queryFn: fetchMyPayslips, enabled: !!user && can('payroll:read_self') },
            { queryKey: ['myReviews', user?.employee_id], queryFn: fetchMyReviews, enabled: !!user && can('performance:read_self') },
            // Management Data (HR/Manager/xyz)
            { queryKey: ['allEmployees'], queryFn: fetchAllEmployees, enabled: !!user && can('employee:read_all') },
            { queryKey: ['allLeaves'], queryFn: fetchAllLeaves, enabled: !!user && can('leave:read_all') },
        ]
    });
    const { data: attendanceStatus, isLoading: isLoadingStatus } = useQuery({
        queryKey: ['myAttendanceStatus'],
        queryFn: fetchAttendanceStatus,
        enabled: !!user,
    });
    // --- End Dynamic Queries ---

    // Mutations
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

    const isLoading = results.some(query => query.isLoading) || isLoadingStatus;
    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;

    // Deconstruct query results
    const [
        details, myLeaves, myAssets, teamAssets, mySkills, myPayslips, myReviews,
        allEmployees, allLeaves
    ] = results.map(res => res.data);
    
    const isCheckedIn = attendanceStatus?.status === 'checked_in';

    // Calculate stats
    const pendingLeaves = allLeaves?.filter((l: any) => l.status === 'pending').length || 0;
    const totalEmployees = allEmployees?.length || 0;

    return (
        <Box>
            {/* Header */}
            <MotionBox sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 4 }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Avatar src={details?.employee.photo_url ? `${API_BASE_URL}${details.employee.photo_url}` : undefined} sx={{ width: 72, height: 72, mr: 2 }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" fontWeight={600}>Welcome, {details?.employee.first_name || 'Employee'}</Typography>
                    <Typography color="text.secondary">{details?.employee.job_title || user?.role_id}</Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Button color="success" variant={isCheckedIn ? "outlined" : "contained"} onClick={() => checkInMutation.mutate()} sx={{ mr: 1 }} disabled={isCheckedIn || checkInMutation.isPending}>
                        {checkInMutation.isPending ? <CircularProgress size={24}/> : 'Check-in'}
                    </Button>
                    <Button color="error" variant={isCheckedIn ? "contained" : "outlined"} onClick={() => checkOutMutation.mutate()} sx={{ mr: 2 }} disabled={!isCheckedIn || checkOutMutation.isPending}>
                        {checkOutMutation.isPending ? <CircularProgress size={24}/> : 'Check-out'}
                    </Button>
                </Box>
                <Notifications />
                <IconButton sx={{ color: 'text.primary', ml: 1 }} onClick={handleSettingsClick}>
                    <SettingsIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={open} onClose={handleSettingsClose}>
                    <MenuItem onClick={() => { toggleTheme(); handleSettingsClose(); }}>
                        <ListItemIcon>{mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}</ListItemIcon>
                        <ListItemText>Toggle Theme</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { logout(); handleSettingsClose(); }}>
                         <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                         <ListItemText>Logout</ListItemText>
                    </MenuItem>
                </Menu>
            </MotionBox>

            {/* Profile Widget */}
            {can('employee:read_self') && details && (
                <MotionBox component={Paper} sx={{ p: 3, mb: 3 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs>
                            <Typography variant="h6" fontWeight={600}>Employee Details</Typography>
                            <Typography variant="body2" color="text.secondary">ID: {details.employee.employee_id}</Typography>
                            <Typography variant="body2" color="text.secondary">Email: {details.employee.email}</Typography>
                        </Grid>
                        <Grid item>
                            <Button variant="outlined" onClick={() => navigate('/app/profile')}>View Full Profile</Button>
                        </Grid>
                    </Grid>
                </MotionBox>
            )}

            {/* Stat Widgets (for HR/Managers) */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {can("employee:read_all") && <Grid item xs={12} sm={6}><StatWidget title="Total Employees" count={totalEmployees} /></Grid>}
                {can("leave:read_all") && <Grid item xs={12} sm={6}><StatWidget title="Pending Leave Requests" count={pendingLeaves} /></Grid>}
            </Grid>
            
            {/* Management Nav Widgets (for HR/Managers/xyz) */}
            {(can('leave:approve') || can('asset:allot') || can('payroll:read_all') || can('performance:read_all') || can('skill:read_all')) && (
                 <Box>
                    <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Management Pages</Typography>
                    <Grid container spacing={3}>
                        {can("leave:approve") && <Grid item xs={12} md={6}><NavWidget title="Manage Leaves" link="/app/manage-leaves" /></Grid>}
                        {can("asset:allot") && <Grid item xs={12} md={6}><NavWidget title="Manage Assets" link="/app/manage-assets" /></Grid>}
                        {can("employee:read_all") && <Grid item xs={12} md={6}><NavWidget title="Attendance Report" link="/app/attendance-report" linkText="View" /></Grid>}
                        {can("payroll:read_all") && <Grid item xs={12} md={6}><NavWidget title="Manage Payroll" link="/app/manage-payroll" /></Grid>}
                        {can("performance:read_all") && <Grid item xs={12} md={6}><NavWidget title="Performance Reviews" link="/app/manage-performance-reviews" /></Grid>}
                        {can("skill:read_all") && <Grid item xs={12} md={6}><NavWidget title="Employee Skills" link="/app/manage-employee-skills" /></Grid>}
                    </Grid>
                 </Box>
            )}
           
            {/* Personal Widgets (for all users with respective perms) */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>My Workspace</Typography>
            <Grid container spacing={3}>
                {can("leave:read_self") && (
                    <Grid item xs={12} md={6}>
                        <Widget title="My Leaves" link="/app/my-leaves">
                            <Typography>You have <strong style={{color: 'primary.main'}}>{myLeaves?.filter((l: any) => l.status === 'pending').length || 0}</strong> pending requests.</Typography>
                            {can("leave:create_self") && (
                                <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => navigate('/app/request-leave')}>
                                    Request Time Off
                                </Button>
                            )}
                        </Widget>
                    </Grid>
                )}
                {can("payroll:read_self") && (
                    <Grid item xs={12} md={6}>
                        <Widget title="My Payslips" link="/app/my-payslips">
                            {myPayslips && myPayslips.length > 0 ? (
                                <Box>
                                    <Typography color="text.secondary">Most Recent:</Typography>
                                    <Typography variant="h6" mt={1} color="primary.main">Net Salary: ${myPayslips[0].net_salary.toFixed(2)}</Typography>
                                    <Typography variant="body2">For Period: {dayjs(myPayslips[0].pay_period_end).format('MMMM YYYY')}</Typography>
                                </Box>
                            ) : <Typography color="text.secondary">No payslips available.</Typography>}
                        </Widget>
                    </Grid>
                )}
                {can("asset:read_self") && (
                    <Grid item xs={12} md={6} lg={4}>
                         <Widget title="My Assets" link="/app/my-assets" delay={0.3}>
                            <List dense>
                                {myAssets && myAssets.length > 0 ? myAssets.slice(0, 2).map((asset: any) => (
                                    <ListItem key={asset.allotment_id} disableGutters>
                                        <ListItemText primary={asset.asset_details?.asset_name} secondary={`ID: ${asset.asset_id}`} />
                                    </ListItem>
                                )) : <Typography color="text.secondary">No assets assigned.</Typography>}
                            </List>
                        </Widget>
                    </Grid>
                )}
                {can("skill:read_self") && (
                    <Grid item xs={12} md={6} lg={4}>
                        <Widget title="My Skills" link="/app/my-skills" delay={0.4}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                {mySkills && mySkills.length > 0 ? mySkills.slice(0, 4).map((skill: any) => (
                                    <Chip key={skill.employee_skill_id} label={skill.skill_name} variant="outlined" />
                                )) : <Typography color="text.secondary">No skills listed.</Typography>}
                            </Box>
                        </Widget>
                    </Grid>
                )}
                {can("performance:read_self") && (
                    <Grid item xs={12} md={12} lg={4}>
                         <Widget title="My Performance" link="/app/my-performance-reviews" delay={0.5}>
                             {myReviews && myReviews.length > 0 ? (
                                 <Box>
                                     <Typography color="text.secondary">Latest Review on {dayjs(myReviews[0].review_date).format('MMM D, YYYY')}</Typography>
                                     <Rating value={myReviews[0].rating} readOnly sx={{mt: 1}}/>
                                 </Box>
                             ): <Typography color="text.secondary">No reviews available.</Typography>}
                        </Widget>
                    </Grid>
                )}
                
                {/* My Team Section (from meDetails) */}
                {details?.direct_reports && details.direct_reports.length > 0 && (
                    <Grid item xs={12}>
                        <MotionBox component={Paper} sx={{p: 2, mt: 2}} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
                            <Typography variant="h5" gutterBottom>My Team</Typography>
                            <List>
                                {details.direct_reports.map((report: any) => (
                                    <ListItem key={report.employee_id} divider>
                                        <ListItemAvatar><Avatar src={report.photo_url ? `${API_BASE_URL}${report.photo_url}` : ''} /></ListItemAvatar>
                                        <ListItemText primary={`${report.first_name} ${report.last_name}`} secondary={`${report.job_title || 'N/A'} - ${report.employee_id}`} />
                                    </ListItem>
                                ))}
                            </List>
                        </MotionBox>
                    </Grid>
                )}
                 {/* Team Assets Section */}
                {teamAssets && teamAssets.length > 0 && (
                    <Grid item xs={12}>
                         <MotionBox component={Paper} sx={{p: 2, mt: 2}} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
                            <Typography variant="h5" gutterBottom>My Team's Assets</Typography>
                            <List>
                                {teamAssets.map((asset: any) => (
                                    <ListItem key={asset.allotment_id} divider>
                                        <ListItemText
                                            primary={`${asset.asset_details.asset_name} - ${asset.asset_details.asset_id}`}
                                            secondary="Allotted to: Your Team"
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </MotionBox>
                    </Grid>
                )}
            </Grid>

            {/* Snackbar */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserDashboard;