// frontend/src/pages/HR/AttendanceReport.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Import UTC plugin
import timezone from 'dayjs/plugin/timezone'; // Import Timezone plugin
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Extend dayjs with the necessary plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const fetchAttendanceReport = async () => {
  const { data } = await api.get('/attendance/report');
  return data;
};

const AttendanceReport = () => {
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['attendanceReport'],
    queryFn: fetchAttendanceReport
  });

  const columns: GridColDef[] = [
    { field: 'employee_id', headerName: 'Employee ID', width: 150 },
    { field: 'first_name', headerName: 'First Name', flex: 1, minWidth: 120 },
    { field: 'last_name', headerName: 'Last Name', flex: 1, minWidth: 120 },
    {
      field: 'check_in_time',
      headerName: 'Check-in Time (IST)', // Indicate timezone
      width: 220,
      // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A',
    },
    {
      field: 'check_out_time',
      headerName: 'Check-out Time (IST)', // Indicate timezone
      width: 220,
      // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A',
    },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'attendance_id', headerName: 'ID', width: 90, hideable: true },
  ];

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch attendance report.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
              <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" gutterBottom>Full Attendance Report</Typography>
      </Box>
      <Box component={Paper} sx={{ width: '100%' }}>
        <DataGrid
          rows={report || []}
          columns={columns}
          getRowId={(row) => row.attendance_id}
          autoHeight
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: 'check_in_time', sort: 'desc' }] },
            columns: { columnVisibilityModel: { attendance_id: false } },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>
    </Box>
  );
};

export default AttendanceReport;