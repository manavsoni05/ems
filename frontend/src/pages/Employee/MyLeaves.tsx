import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
// --- Add Paper import ---
import { Box, Typography, CircularProgress, Alert, Chip, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fetchMyLeaves = async () => {
  const { data } = await api.get('/leaves/me');
  return data;
};

const MyLeaves = () => {
  const navigate = useNavigate();
  const { data: leaves, isLoading, isError } = useQuery({
    queryKey: ['myLeaves'],
    queryFn: fetchMyLeaves
  });

  // --- Column Definition Changes ---
  const columns: GridColDef[] = [
    {
      field: 'start_date',
      headerName: 'Start Date',
      width: 150,
      valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD'),
    },
    {
      field: 'end_date',
      headerName: 'End Date',
      width: 150,
      valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD'),
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1, // Use flex
      minWidth: 250 // Optional min width
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150, // Fixed width okay
      renderCell: (params) => {
        let color: "warning" | "success" | "error" = "warning";
        if (params.value === 'approved') color = 'success';
        if (params.value === 'rejected') color = 'error';
        return <Chip label={params.value} color={color} size="small" />;
      }
    },
    // Add leave_id if you need it for debugging, but hide it
     { field: 'leave_id', headerName: 'ID', width: 90, hideable: true },
  ];
  // --- End Column Definition Changes ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your leave requests.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>My Leave Requests</Typography>
        </Box>
        {/* --- DataGrid Changes --- */}
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={leaves || []}
                columns={columns}
                getRowId={(row) => row.leave_id}
                autoHeight // Add autoHeight
                initialState={{ // Add pagination settings
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                    sorting: { // Keep existing sort
                        sortModel: [{ field: 'start_date', sort: 'desc' }],
                    },
                    // Hide the leave_id column by default
                    columns: {
                        columnVisibilityModel: {
                        leave_id: false,
                        },
                    },
                }}
                pageSizeOptions={[10, 25, 50]} // Add page size options
            />
        </Box>
        {/* --- End DataGrid Changes --- */}
    </Box>
  );
};

export default MyLeaves;