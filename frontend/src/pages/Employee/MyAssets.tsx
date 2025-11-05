// frontend/src/pages/Employee/MyAssets.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
// --- Add Paper import ---
import { Box, Typography, CircularProgress, Alert, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fetchMyAssets = async () => {
  const { data } = await api.get('/assets/me');
  return data;
};

const MyAssets = () => {
  const navigate = useNavigate();
  const { data: myAssets, isLoading, isError } = useQuery({
    queryKey: ['myAssets'],
    queryFn: fetchMyAssets
  });

  // --- Column Definition Changes ---
  const columns: GridColDef[] = [
    {
      field: 'asset_id',
      headerName: 'Asset ID',
      width: 150,
      valueGetter: (value, row) => row.asset_details?.asset_id || 'N/A',
    },
    {
      field: 'asset_name',
      headerName: 'Asset Name',
      flex: 1, // Use flex
      minWidth: 180, // Optional min width
      valueGetter: (value, row) => row.asset_details?.asset_name || 'N/A',
    },
    {
      field: 'asset_type',
      headerName: 'Type',
      width: 120,
      valueGetter: (value, row) => row.asset_details?.asset_type || 'N/A',
    },
    {
      field: 'serial_number',
      headerName: 'Serial Number',
      flex: 1, // Use flex
      minWidth: 180, // Optional min width
      valueGetter: (value, row) => row.asset_details?.serial_number || 'N/A',
    },
    {
      field: 'allotment_date',
      headerName: 'Allotment Date',
      width: 180, // Fixed width might be okay here
      valueFormatter: (value) => dayjs(value as string).format('MMMM D, YYYY'),
    },
  ];
  // --- End Column Definition Changes ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your assigned assets.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" gutterBottom>My Assigned Assets</Typography>
      </Box>
       {/* --- DataGrid Changes --- */}
      <Box component={Paper} sx={{ width: '100%' }}>
        <DataGrid
          rows={myAssets || []}
          columns={columns}
          getRowId={(row) => row.allotment_id}
          autoHeight // Add autoHeight
          initialState={{ // Add pagination settings
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
            sorting: { // Keep existing sort
              sortModel: [{ field: 'allotment_date', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50]} // Add page size options
        />
      </Box>
      {/* --- End DataGrid Changes --- */}
    </Box>
  );
};

export default MyAssets;