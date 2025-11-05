import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';

const fetchAllAttendance = async () => {
  const { data } = await api.get('/attendance');
  return data;
};

const ManageAttendance = () => {
  const { data: attendance, isLoading, isError } = useQuery({ 
    queryKey: ['allAttendance'], 
    queryFn: fetchAllAttendance 
  });

  const columns: GridColDef[] = [
    { field: 'employee_id', headerName: 'Employee ID', width: 150 },
    { 
      field: 'check_in_time', 
      headerName: 'Check-in Time', 
      width: 250,
      valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD hh:mm A'),
    },
    { 
      field: 'check_out_time', 
      headerName: 'Check-out Time', 
      width: 250,
      valueFormatter: (value) => value ? dayjs(value as string).format('YYYY-MM-DD hh:mm A') : 'N/A',
    },
    { field: 'status', headerName: 'Status', width: 150 },
  ];

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch attendance records.</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Manage Employee Attendance</Typography>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={attendance || []}
          columns={columns}
          getRowId={(row) => row.attendance_id}
          initialState={{
            sorting: {
              sortModel: [{ field: 'check_in_time', sort: 'desc' }],
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default ManageAttendance;