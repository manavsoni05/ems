import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
// --- Add Paper import ---
import { Box, Typography, CircularProgress, Alert, Rating, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


const fetchMyReviews = async () => (await api.get('/performance-reviews/me')).data;

const MyPerformanceReviews = () => {
  const navigate = useNavigate();
  const { data: reviews, isLoading, isError } = useQuery({ queryKey: ['myReviews'], queryFn: fetchMyReviews });

  // --- Column Definition Changes ---
  const columns: GridColDef[] = [
    { field: 'review_date', headerName: 'Date', width: 150, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
    { field: 'reviewer_id', headerName: 'Reviewer ID', width: 150 },
    { field: 'rating', headerName: 'Rating', width: 180, renderCell: (params) => <Rating value={params.value} readOnly /> },
    {
      field: 'comments',
      headerName: 'Comments',
      flex: 1, // Use flex
      minWidth: 300 // Optional min width
    },
    // Add review_id if needed for debugging, but hide it
     { field: 'review_id', headerName: 'ID', width: 90, hideable: true },
  ];
  // --- End Column Definition Changes ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your performance reviews.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>My Performance Reviews</Typography>
        </Box>
        {/* --- DataGrid Changes --- */}
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={reviews || []}
                columns={columns}
                getRowId={(row) => row.review_id}
                autoHeight // Add autoHeight
                initialState={{ // Add pagination settings
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                     sorting: { // Keep existing sort if needed
                        sortModel: [{ field: 'review_date', sort: 'desc' }],
                    },
                    // Hide the review_id column by default
                    columns: {
                        columnVisibilityModel: {
                        review_id: false,
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

export default MyPerformanceReviews;