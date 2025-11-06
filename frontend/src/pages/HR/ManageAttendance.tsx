import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Chip, Pagination, Select, MenuItem, FormControl } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import dayjs from 'dayjs';
import { MotionBox } from '../../components/Motion';

const fetchAllAttendance = async () => {
  const { data } = await api.get('/attendance');
  return data;
};

const ManageAttendance = () => {
  const { data: attendance, isLoading, isError } = useQuery({ 
    queryKey: ['allAttendance'], 
    queryFn: fetchAllAttendance 
  });

  // Pagination and sorting state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('check_in_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sorting and pagination logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAttendance = useMemo(() => {
    if (!attendance) return [];
    
    const sorted = [...attendance].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'check_in_time' || sortField === 'check_out_time') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [attendance, sortField, sortOrder]);

  const paginatedAttendance = useMemo(() => {
    const startIndex = page * pageSize;
    return sortedAttendance.slice(startIndex, startIndex + pageSize);
  }, [sortedAttendance, page, pageSize]);

  const totalPages = Math.ceil((sortedAttendance?.length || 0) / pageSize);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(event.target.value);
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'absent': return { bg: '#ffebee', text: '#c62828' };
      case 'late': return { bg: '#fff3e0', text: '#ef6c00' };
      default: return { bg: '#f5f5f5', text: '#666666' };
    }
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch attendance records.</Alert>;

  return (
    <Box sx={{ p: 4 }}>
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 600, color: '#212121', mb: 0.5 }}>
          Employee Attendance
        </Typography>
        <Typography variant="body2" sx={{ color: '#999999', fontSize: '14px' }}>
          View all employee attendance records
        </Typography>
      </MotionBox>

      {/* Table Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '150px 250px 250px 150px',
          gap: 2,
          p: 2,
          borderBottom: '2px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px 8px 0 0',
          fontWeight: 600,
          color: '#666666',
          fontSize: '13px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('employee_id')}>
          Employee ID
          {sortField === 'employee_id' ? (
            sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
          ) : (
            <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('check_in_time')}>
          Check-in Time
          {sortField === 'check_in_time' ? (
            sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
          ) : (
            <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('check_out_time')}>
          Check-out Time
          {sortField === 'check_out_time' ? (
            sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
          ) : (
            <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('status')}>
          Status
          {sortField === 'status' ? (
            sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
          ) : (
            <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
          )}
        </Box>
      </Box>

      {/* Attendance List */}
      {paginatedAttendance.map((row: any) => {
        const colors = getStatusColor(row.status);
        return (
          <Box
            key={row.attendance_id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '150px 250px 250px 150px',
              gap: 2,
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              '&:hover': { backgroundColor: '#f9f9f9' },
              alignItems: 'center',
              fontSize: '14px',
              color: '#212121',
            }}
          >
            <Box>{row.employee_id}</Box>
            <Box>{dayjs(row.check_in_time).format('YYYY-MM-DD hh:mm A')}</Box>
            <Box>{row.check_out_time ? dayjs(row.check_out_time).format('YYYY-MM-DD hh:mm A') : 'N/A'}</Box>
            <Box>
              <Chip
                label={row.status}
                size="small"
                sx={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  fontWeight: 500,
                  fontSize: '12px',
                }}
              />
            </Box>
          </Box>
        );
      })}

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Rows per page:
          </Typography>
          <FormControl size="small">
            <Select value={pageSize} onChange={handlePageSizeChange} sx={{ minWidth: 70 }}>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedAttendance.length)} of {sortedAttendance.length}
          </Typography>
        </Box>
        <Pagination
          count={totalPages}
          page={page + 1}
          onChange={handlePageChange}
          shape="rounded"
          sx={{
            '& .MuiPaginationItem-root.Mui-selected': {
              backgroundColor: '#5A3FFF',
              color: '#fff',
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default ManageAttendance;