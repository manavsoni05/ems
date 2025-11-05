// frontend/src/pages/HR/ManageLeaves.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Chip, IconButton, Paper,
    Modal, List, ListItem, ListItemText, Divider // Removed unused Chip import from Modal section
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';

// --- Interface Definitions (remain the same) ---
interface DailyBreakdownItem {
    date: string;
    type: string;
    status: string; // Keep in interface as data comes from backend
    duration: 'full_day' | 'half_day';
}

interface LeaveRequest {
    leave_id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    daily_breakdown: DailyBreakdownItem[];
}
// --- End Interface Definitions ---

const fetchLeaves = async (): Promise<LeaveRequest[]> => {
  const { data } = await api.get('/leaves');
  return data;
};

const updateLeaveStatus = async ({ leaveId, status }: { leaveId: string; status: string }) => {
  const { data } = await api.put(`/leaves/${leaveId}/status`, { status });
  return data;
};

const ManageLeaves = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: leaves, isLoading, isError } = useQuery<LeaveRequest[]>({
    queryKey: ['leaves'],
    queryFn: fetchLeaves
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const mutation = useMutation({
    mutationFn: updateLeaveStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
     onError: (error: any) => {
      console.error("Failed to update leave status:", error);
    }
  });

  const handleApprove = (id: string) => {
    mutation.mutate({ leaveId: id, status: 'approved' });
  };

  const handleReject = (id: string) => {
    mutation.mutate({ leaveId: id, status: 'rejected' });
  };

  const handleRowClick = (params: GridRowParams) => {
    setSelectedLeave(params.row as LeaveRequest);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedLeave(null);
  };

  // --- Columns (remain the same) ---
   const columns: GridColDef[] = [
    { field: 'leave_id', headerName: 'Request ID', width: 150 },
    { field: 'employee_id', headerName: 'Employee ID', width: 130 },
    {
        field: 'start_date',
        headerName: 'Start Date',
        width: 120,
        valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD'),
    },
    {
        field: 'end_date',
        headerName: 'End Date',
        width: 120,
        valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD'),
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        let color: "warning" | "success" | "error" | "info" = "warning";
        if (params.value === 'approved') color = 'success';
        if (params.value === 'rejected') color = 'error';
        if (params.value === 'partially_approved') color = 'info';
        return <Chip label={params.value} color={color} size="small" />;
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id, row }) => {
        const isMutating = mutation.isPending && mutation.variables?.leaveId === id;
        if (row.status !== 'pending') return [];
        return [
          <GridActionsCellItem
            icon={isMutating && mutation.variables?.status === 'approved' ? <CircularProgress size={20}/> : <CheckCircleIcon color="success" />}
            label="Approve"
            onClick={() => handleApprove(id as string)}
            disabled={isMutating}
          />,
          <GridActionsCellItem
             icon={isMutating && mutation.variables?.status === 'rejected' ? <CircularProgress size={20}/> : <CancelIcon color="error" />}
            label="Reject"
            onClick={() => handleReject(id as string)}
            disabled={isMutating}
          />,
        ];
      },
    },
  ];
  // --- End Columns ---

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch leave requests.</Alert>;

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom sx={{mb: 0}}>Manage Leave Requests</Typography>
        </Box>
        <Box component={Paper} sx={{ width: '100%' }}>
            <DataGrid
                // ... (DataGrid props remain the same) ...
                rows={leaves || []}
                columns={columns}
                getRowId={(row) => row.leave_id}
                loading={mutation.isPending}
                autoHeight
                initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    sorting: { sortModel: [{ field: 'start_date', sort: 'desc' }] },
                }}
                pageSizeOptions={[10, 25, 50]}
                onRowClick={handleRowClick}
                sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
            />
        </Box>

         {/* --- Leave Detail Modal (Modified List Item) --- */}
         <Modal
            open={detailModalOpen}
            onClose={handleCloseDetailModal}
            aria-labelledby="leave-detail-modal-title"
         >
            <Paper sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '90%', sm: 500 }, maxHeight: '80vh',
                bgcolor: 'background.paper', boxShadow: 24, p: 3,
                display: 'flex', flexDirection: 'column'
             }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                     <Typography id="leave-detail-modal-title" variant="h6">
                         Leave Details ({selectedLeave?.leave_id})
                     </Typography>
                     <IconButton onClick={handleCloseDetailModal}><CloseIcon /></IconButton>
                 </Box>
                 {selectedLeave && (
                    <>
                        <Typography variant="body1" gutterBottom><strong>Employee:</strong> {selectedLeave.employee_id}</Typography>
                        <Typography variant="body1" gutterBottom><strong>Reason:</strong> {selectedLeave.reason}</Typography>
                        <Typography variant="body1" gutterBottom><strong>Overall Status:</strong> {selectedLeave.status}</Typography>
                        <Divider sx={{ my: 2 }}/>
                        <Typography variant="subtitle1" gutterBottom><strong>Daily Breakdown:</strong></Typography>
                        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                            <List dense>
                                {selectedLeave.daily_breakdown.map((day, index) => (
                                    <ListItem key={index} divider>
                                        <ListItemText
                                            primary={dayjs(day.date).format('ddd, YYYY-MM-DD')}
                                            // *** MODIFIED SECONDARY TEXT: Removed status display ***
                                            secondary={`${day.type.replace('_', ' ')} (${day.duration === 'half_day' ? 'Half Day' : 'Full Day'})`}
                                            primaryTypographyProps={{ style: { textTransform: 'capitalize' } }}
                                            secondaryTypographyProps={{ style: { textTransform: 'capitalize' } }} // Capitalize type/duration
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </>
                 )}
            </Paper>
         </Modal>
         {/* --- End Leave Detail Modal --- */}
    </Box>
  );
};

export default ManageLeaves;