import { useAuth } from '../../hooks/hooks/useAuth';
import api, { API_BASE_URL } from '../../services/api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { MotionBox } from '../../components/Motion';

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
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Page Header */}
      <MotionBox
        sx={{ mb: 4 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#212121', mb: 0.5 }}>
          My Profile
        </Typography>
        <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#999999' }}>
          View and manage your profile information
        </Typography>
      </MotionBox>

      {/* Profile Header Card */}
      <MotionBox
        component={Paper}
        sx={{
          p: 4,
          mb: 3,
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
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar 
                src={photoUrl} 
                sx={{ 
                  width: 100, 
                  height: 100,
                  border: '3px solid #E8E8F0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }} 
              >
                <PersonOutlineIcon sx={{ fontSize: 50 }} />
              </Avatar>
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #E8E8F0',
                  '&:hover': {
                    backgroundColor: '#5A3FFF',
                    '& svg': { color: '#FFFFFF' }
                  }
                }}
              >
                <EditIcon sx={{ fontSize: 16, color: '#5A3FFF' }} />
              </IconButton>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#212121', mb: 0.5 }}>
                {employee.first_name} {employee.last_name}
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#666666', mb: 1 }}>
                {employee.email}
              </Typography>
              <Box sx={{ 
                display: 'inline-block',
                px: 2,
                py: 0.5,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(90, 63, 255, 0.1) 0%, rgba(90, 63, 255, 0.05) 100%)',
                border: '1px solid rgba(90, 63, 255, 0.2)',
              }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#5A3FFF' }}>
                  {employee.job_title || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </MotionBox>

      {/* Profile Details */}
      <MotionBox
        component={Paper}
        sx={{
          p: 4,
          mb: 3,
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
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#212121', mb: 3 }}>
          Profile Information
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Name */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PersonOutlineIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Name
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121' }}>
                {employee.first_name} {employee.last_name}
              </Typography>
            </Box>
          </Box>

          {/* Email */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <EmailOutlinedIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Email account
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121' }}>
                {employee.email}
              </Typography>
            </Box>
          </Box>

          {/* Employee ID */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BadgeOutlinedIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Employee ID
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121' }}>
                {employee.employee_id}
              </Typography>
            </Box>
          </Box>

          {/* Department */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BusinessOutlinedIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Department
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121' }}>
                {employee.department || 'N/A'}
              </Typography>
            </Box>
          </Box>

          {/* Reports To */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AccountTreeOutlinedIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Reports To
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121' }}>
                {manager ? `${manager.first_name} ${manager.last_name}` : 'N/A'}
              </Typography>
            </Box>
          </Box>

          {/* Role */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(90, 63, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PersonOutlineIcon sx={{ fontSize: 20, color: '#5A3FFF' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#999999', mb: 0.5 }}>
                Role
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212121', textTransform: 'capitalize' }}>
                {employee.role_id}
              </Typography>
            </Box>
          </Box>
        </Box>
      </MotionBox>

      {/* Direct Reports - My Team */}
      {direct_reports && direct_reports.length > 0 && (
        <MotionBox
          component={Paper}
          sx={{
            p: 4,
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
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <GroupsOutlinedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#212121' }}>
                My Team
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#999999' }}>
                {direct_reports.length} direct report{direct_reports.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>

          <List sx={{ p: 0 }}>
            {direct_reports.map((report, index) => (
              <Box key={report.employee_id}>
                <ListItem 
                  sx={{ 
                    py: 2, 
                    px: 0,
                    '&:hover': {
                      backgroundColor: '#F8F9FA',
                      borderRadius: '8px',
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={report.photo_url ? `${API_BASE_URL}${report.photo_url}` : ''} 
                      sx={{
                        width: 48,
                        height: 48,
                        border: '2px solid #E8E8F0',
                      }}
                    >
                      {report.first_name?.[0]}{report.last_name?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#212121' }}>
                        {report.first_name} {report.last_name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                          {report.job_title || 'N/A'}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#999999', mt: 0.3 }}>
                          ID: {report.employee_id}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < direct_reports.length - 1 && <Divider sx={{ borderColor: '#F0F0F0' }} />}
              </Box>
            ))}
          </List>
        </MotionBox>
      )}
    </Box>
  );
};

export default MyProfile;