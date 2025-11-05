import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
// --- Add Paper import ---
import { Box, Typography, CircularProgress, Alert, IconButton, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fetchMyPayroll = async () => (await api.get('/payroll/me')).data;

const MyPayslips = () => {
  const navigate = useNavigate();
  const { data: payslips, isLoading, isError } = useQuery({
    queryKey: ['myPayroll'],
    queryFn: fetchMyPayroll
  });

  // --- Column Definition Changes ---
  const columns: GridColDef[] = [
    { field: 'payroll_id', headerName: 'Payslip ID', width: 150 },
    { field: 'pay_period_start', headerName: 'Start Date', width: 150, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
    { field: 'pay_period_end', headerName: 'End Date', width: 150, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
    { field: 'gross_salary', headerName: 'Gross Salary', flex: 1, minWidth: 120, type: 'number' }, // Flex
    { field: 'deductions', headerName: 'Deductions', flex: 1, minWidth: 120, type: 'number' }, // Flex
    { field: 'net_salary', headerName: 'Net Salary', flex: 1, minWidth: 120, type: 'number' }, // Flex
    { field: 'status', headerName: 'Status', width: 150 }, // Fixed width okay
  ];
  // --- End Column Definition Changes ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch your payslip data.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>My Payslips</Typography>
        </Box>
        {/* --- DataGrid Changes --- */}
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                rows={payslips || []}
                columns={columns}
                getRowId={(row) => row.payroll_id}
                autoHeight // Add autoHeight
                initialState={{ // Add pagination settings
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                    sorting: { // Keep existing sort
                        sortModel: [{ field: 'pay_period_end', sort: 'desc' }]
                    },
                }}
                pageSizeOptions={[10, 25, 50]} // Add page size options
            />
        </Box>
        {/* --- End DataGrid Changes --- */}
    </Box>
  );
};

export default MyPayslips;