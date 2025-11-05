// frontend/src/pages/HR/DailyStatusReport.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Chip, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Import UTC plugin
import timezone from 'dayjs/plugin/timezone'; // Import Timezone plugin
import { useNavigate } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../hooks/hooks/useAuth';

// Extend dayjs with the necessary plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const fetchTodayStatus = async () => {
  const { data } = await api.get('/attendance/today-status');
  return data;
};

const DailyStatusReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['todayStatusReport'],
    queryFn: fetchTodayStatus
  });

  const handleViewCalendar = (employeeId: string) => {
    const basePath = user?.role_id === 'admin' ? '/admin' : '/hr';
    navigate(`${basePath}/attendance-report/${employeeId}`);
  };

  const columns: GridColDef[] = [
    { field: 'employee_id', headerName: 'Employee ID', width: 150 },
    { field: 'first_name', headerName: 'First Name', flex: 1, minWidth: 120 },
    { field: 'last_name', headerName: 'Last Name', flex: 1, minWidth: 120 },
    {
      field: 'status', headerName: 'Today\'s Status', width: 150,
      renderCell: (params) => { /* ... Chip rendering ... */
        let color: "success" | "warning" | "error" = "error";
        if (params.value === 'Present') color = 'success';
        if (params.value === 'On Leave') color = 'warning';
        return <Chip label={params.value} color={color} size="small" />;
      },
    },
    {
      field: 'check_in_time',
      headerName: 'Check-in (IST)', // Indicate timezone
      width: 150,
      // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('hh:mm A') : '---',
    },
    {
      field: 'check_out_time',
      headerName: 'Check-out (IST)', // Indicate timezone
      width: 150,
       // Parse UTC, convert to IST, then format
      valueFormatter: (value) => value ? dayjs.utc(value as string).tz("Asia/Kolkata").format('hh:mm A') : '---',
    },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
      getActions: ({ row }) => [<GridActionsCellItem icon={<CalendarMonthIcon />} label="View Calendar" onClick={() => handleViewCalendar(row.employee_id)} />],
    },
  ];

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch daily status report.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>Daily Attendance Status ({dayjs().format('YYYY-MM-DD')})</Typography>
        </Box>
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={report || []}
                columns={columns}
                getRowId={(row) => row.employee_id}
                autoHeight
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 }}}}
                pageSizeOptions={[10, 25, 50]}
            />
        </Box>
    </Box>
  );
};

export default DailyStatusReport;