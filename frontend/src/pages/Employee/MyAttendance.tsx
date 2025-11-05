// frontend/src/pages/Employee/MyAttendance.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Import UTC plugin
import timezone from 'dayjs/plugin/timezone'; // Import Timezone plugin
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Extend dayjs with the necessary plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const fetchMyAttendance = async () => {
  const { data } = await api.get('/attendance/me');
  return data;
};

const MyAttendance = () => {
  const navigate = useNavigate();
  const { data: attendance, isLoading, isError } = useQuery({
    queryKey: ['myAttendance'],
    queryFn: fetchMyAttendance
  });

  const columns: GridColDef[] = [
    {
      field: 'check_in_time',
      headerName: 'Check-in Time (IST)', // Indicate timezone
      flex: 1,
      minWidth: 200,
      // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A',
    },
    {
      field: 'check_out_time',
      headerName: 'Check-out Time (IST)', // Indicate timezone
      flex: 1,
      minWidth: 200,
      // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A',
    },
    { field: 'status', headerName: 'Status', width: 150 },
  ];

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your attendance records.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>My Attendance History</Typography>
        </Box>
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={attendance || []}
                columns={columns}
                getRowId={(row) => row.attendance_id}
                autoHeight
                initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    sorting: { sortModel: [{ field: 'check_in_time', sort: 'desc' }] },
                }}
                pageSizeOptions={[10, 25, 50]}
            />
        </Box>
    </Box>
  );
};

export default MyAttendance;