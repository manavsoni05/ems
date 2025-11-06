// frontend/src/pages/HR/ManageLeaves.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Chip, IconButton, Paper,
    Modal, List, ListItem, ListItemText, Divider, Pagination, Select, MenuItem, FormControl
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { MotionBox } from '../../components/Motion';

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
  
  // Pagination and sorting state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const handleRowClick = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedLeave(null);
  };

  // Sorting and pagination logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedLeaves = useMemo(() => {
    if (!leaves) return [];
    
    const sorted = [...leaves].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'start_date' || sortField === 'end_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [leaves, sortField, sortOrder]);

  const paginatedLeaves = useMemo(() => {
    const startIndex = page * pageSize;
    return sortedLeaves.slice(startIndex, startIndex + pageSize);
  }, [sortedLeaves, page, pageSize]);

  const totalPages = Math.ceil((sortedLeaves?.length || 0) / pageSize);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(event.target.value);
    setPage(0);
  };

  const getStatusColor = (status: string): "warning" | "success" | "error" | "info" => {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'error';
    if (status === 'partially_approved') return 'info';
    return 'warning';
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch leave requests.</Alert>;

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Page Header */}
      <MotionBox
        sx={{ mb: 4 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#212121', mb: 0.5 }}>
          Manage Leave Requests
        </Typography>
        <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#999999' }}>
          Review and manage employee leave requests
        </Typography>
      </MotionBox>

      {/* Leave Requests List */}
      <MotionBox
        component={Paper}
        sx={{
          p: 3,
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E8E8F0',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
          }
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Box>
          {/* Table Header */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '130px 120px 110px 110px 1fr 120px 120px',
            gap: 2,
            px: 2,
            py: 1.5,
            backgroundColor: '#FAFAFA',
            borderRadius: '8px 8px 0 0',
            mb: 0,
          }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('leave_id')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Request ID
              </Typography>
              {sortField === 'leave_id' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('employee_id')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Employee ID
              </Typography>
              {sortField === 'employee_id' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('start_date')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Start Date
              </Typography>
              {sortField === 'start_date' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('end_date')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                End Date
              </Typography>
              {sortField === 'end_date' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('reason')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Reason
              </Typography>
              {sortField === 'reason' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
              onClick={() => handleSort('status')}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                Status
              </Typography>
              {sortField === 'status' ? (
                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
              ) : (
                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
              )}
            </Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
              Actions
            </Typography>
          </Box>

          {/* Leave List */}
          <Box>
            {paginatedLeaves && paginatedLeaves.length > 0 ? (
              paginatedLeaves.map((leave: LeaveRequest) => (
                <Box
                  key={leave.leave_id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '130px 120px 110px 110px 1fr 120px 120px',
                    gap: 2,
                    px: 2,
                    py: 2,
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #F0F0F0',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#F8F9FA',
                    }
                  }}
                  onClick={() => handleRowClick(leave)}
                >
                  {/* Request ID */}
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#5A3FFF' }}>
                    {leave.leave_id}
                  </Typography>

                  {/* Employee ID */}
                  <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#666666' }}>
                    {leave.employee_id}
                  </Typography>

                  {/* Start Date */}
                  <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                    {dayjs(leave.start_date).format('YYYY-MM-DD')}
                  </Typography>

                  {/* End Date */}
                  <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                    {dayjs(leave.end_date).format('YYYY-MM-DD')}
                  </Typography>

                  {/* Reason */}
                  <Typography sx={{ fontSize: '13px', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leave.reason}
                  </Typography>

                  {/* Status */}
                  <Box>
                    <Chip 
                      label={leave.status} 
                      color={getStatusColor(leave.status)} 
                      size="small"
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '11px' }}
                    />
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    {leave.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(leave.leave_id);
                          }}
                          disabled={mutation.isPending && mutation.variables?.leaveId === leave.leave_id}
                          sx={{
                            color: '#4CAF50',
                            '&:hover': {
                              backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            }
                          }}
                        >
                          {mutation.isPending && mutation.variables?.leaveId === leave.leave_id && mutation.variables?.status === 'approved' ? (
                            <CircularProgress size={18} />
                          ) : (
                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(leave.leave_id);
                          }}
                          disabled={mutation.isPending && mutation.variables?.leaveId === leave.leave_id}
                          sx={{
                            color: '#F44336',
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.08)',
                            }
                          }}
                        >
                          {mutation.isPending && mutation.variables?.leaveId === leave.leave_id && mutation.variables?.status === 'rejected' ? (
                            <CircularProgress size={18} />
                          ) : (
                            <CancelIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 8,
                color: '#999999',
              }}>
                <Typography sx={{ fontSize: '14px' }}>
                  No leave requests found
                </Typography>
              </Box>
            )}
          </Box>

          {/* Pagination Controls */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 2,
            pt: 2,
            borderTop: '1px solid #F0F0F0',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                Rows per page:
              </Typography>
              <FormControl size="small">
                <Select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  sx={{
                    fontSize: '13px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E8E8F0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#5A3FFF',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#5A3FFF',
                    }
                  }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
              <Typography sx={{ fontSize: '13px', color: '#666666', ml: 2 }}>
                {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedLeaves.length)} of {sortedLeaves.length}
              </Typography>
            </Box>

            <Pagination 
              count={totalPages} 
              page={page + 1} 
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#666666',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: '#5A3FFF',
                    color: '#FFFFFF',
                    '&:hover': {
                      backgroundColor: '#4A2FEF',
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(90, 63, 255, 0.08)',
                  }
                }
              }}
            />
          </Box>
        </Box>
      </MotionBox>

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