import { useAuth } from '../../hooks/hooks/useAuth';
import api, { API_BASE_URL } from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  IconButton,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface EmployeeProfile {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  job_title?: string;
  department?: string;
  photo_url?: string;
  reports_to?: string;
}

interface ProfileDetails {
    employee: EmployeeProfile;
    manager?: EmployeeProfile;
    direct_reports: EmployeeProfile[];
}

// NEW: Use the /me/details endpoint
const fetchMyProfileDetails = async (): Promise<ProfileDetails> => {
    const { data } = await api.get('/employees/me/details');
    return data;
}

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profileDetails, isLoading, isError, error } = useQuery({
      queryKey: ['myProfileDetails', user?.employee_id],
      queryFn: fetchMyProfileDetails,
      enabled: !!user, // Only run the query if the user is loaded
  });


  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">{(error as any).message || 'Failed to fetch profile data.'}</Alert>;
  if (!profileDetails) return <Alert severity="info">No profile data found.</Alert>;

  const { employee, manager, direct_reports } = profileDetails;
  const photoUrl = employee.photo_url ? `${API_BASE_URL}${employee.photo_url}` : '';

  return (
    <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" gutterBottom>My Profile</Typography>
            </Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Avatar src={photoUrl} sx={{ width: 120, height: 120, mb: 2, border: '2px solid', borderColor: 'primary.main' }} />
                    <Typography variant="h4" gutterBottom>{employee.first_name} {employee.last_name}</Typography>
                    <Typography variant="h6" color="text.secondary">{employee.job_title || 'N/A'}</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Typography><strong>Employee ID:</strong> {employee.employee_id}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography><strong>Email:</strong> {employee.email}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography><strong>Role:</strong> {employee.role_id}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography><strong>Department:</strong> {employee.department || 'N/A'}</Typography></Grid>
                  {/* UPDATED: Display Manager */}
                  <Grid item xs={12} sm={6}>
                    <Typography>
                        <strong>Reports To:</strong> {manager ? `${manager.first_name} ${manager.last_name} (${manager.employee_id})` : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
        </Grid>
        
        {/* NEW: Direct Reports Card */}
        {direct_reports && direct_reports.length > 0 && (
            <Grid item xs={12}>
                <Paper sx={{p: 2}}>
                    <Typography variant="h5" gutterBottom>My Team</Typography>
                    <List>
                        {direct_reports.map(report => (
                            <ListItem key={report.employee_id} divider>
                                <ListItemAvatar>
                                    <Avatar src={report.photo_url ? `${API_BASE_URL}${report.photo_url}` : ''} />
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={`${report.first_name} ${report.last_name}`}
                                    secondary={
                                        <Box component="span" sx={{ display: 'block' }}>
                                            <Typography component="span" variant="body2" color="text.primary">{report.job_title || 'N/A'}</Typography>
                                            <Typography component="span" variant="body2" color="text.secondary"> — {report.employee_id}</Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>
        )}
    </Grid>
  );
};

export default MyProfile;