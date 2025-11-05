import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
// --- Add Paper import ---
import { Box, Typography, CircularProgress, Alert, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fetchMySkills = async () => (await api.get('/employee-skills/me')).data;

const MySkills = () => {
  const navigate = useNavigate();
  const { data: skills, isLoading, isError } = useQuery({ queryKey: ['mySkills'], queryFn: fetchMySkills });

  // --- Column Definition Changes ---
  const columns: GridColDef[] = [
    {
      field: 'skill_name',
      headerName: 'Skill',
      flex: 1, // Use flex
      minWidth: 200 // Optional min width
    },
    {
      field: 'proficiency_level',
      headerName: 'Proficiency Level',
      width: 200 // Fixed width okay
    },
     // Add employee_skill_id if needed for debugging, but hide it
     { field: 'employee_skill_id', headerName: 'ID', width: 90, hideable: true },
  ];
  // --- End Column Definition Changes ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your skills.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>My Skills</Typography>
        </Box>
        {/* --- DataGrid Changes --- */}
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={skills || []}
                columns={columns}
                getRowId={(row) => row.employee_skill_id}
                autoHeight // Add autoHeight
                initialState={{ // Add pagination settings
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                    // Hide the employee_skill_id column by default
                    columns: {
                        columnVisibilityModel: {
                        employee_skill_id: false,
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

export default MySkills;