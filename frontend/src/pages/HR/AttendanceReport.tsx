// frontend/src/pages/HR/AttendanceReport.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Chip, Select, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Import UTC plugin
import timezone from 'dayjs/plugin/timezone'; // Import Timezone plugin
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { MotionBox } from '../../components/Motion';
import { useState } from 'react';

// Extend dayjs with the necessary plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const fetchAttendanceReport = async () => {
  const { data } = await api.get('/attendance/report');
  return data;
};

const AttendanceReport = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('check_in_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['attendanceReport'],
    queryFn: fetchAttendanceReport
  });

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = [...(report || [])].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'check_in_time' || sortField === 'check_out_time') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <UnfoldMoreIcon sx={{ fontSize: 14 }} />;
    return sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'late': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch attendance report.</Alert>;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#212121' }}>
          Full Attendance Report
        </Typography>
      </Box>

      {/* Premium List Container */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '130px 0.9fr 0.9fr 200px 200px 110px',
            gap: 1.5,
            p: 2,
            backgroundColor: '#f5f5f5',
            borderBottom: '2px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '13px',
            color: '#666',
            height: '28px',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Box
            onClick={() => handleSort('employee_id')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            Employee ID {renderSortIcon('employee_id')}
          </Box>
          <Box
            onClick={() => handleSort('first_name')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            First Name {renderSortIcon('first_name')}
          </Box>
          <Box
            onClick={() => handleSort('last_name')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            Last Name {renderSortIcon('last_name')}
          </Box>
          <Box
            onClick={() => handleSort('check_in_time')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            Check-in (IST) {renderSortIcon('check_in_time')}
          </Box>
          <Box
            onClick={() => handleSort('check_out_time')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            Check-out (IST) {renderSortIcon('check_out_time')}
          </Box>
          <Box
            onClick={() => handleSort('status')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#5A3FFF' }}
          >
            Status {renderSortIcon('status')}
          </Box>
        </Box>

        {/* Attendance List */}
        {paginatedData.map((row: any) => (
          <Box
            key={row.attendance_id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '130px 0.9fr 0.9fr 200px 200px 110px',
              gap: 1.5,
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              '&:hover': { backgroundColor: '#f9f9f9' },
              alignItems: 'center',
              fontSize: '13px',
              color: '#212121',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.employee_id}
            </Box>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.first_name}
            </Box>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.last_name}
            </Box>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
              {row.check_in_time ? dayjs.utc(row.check_in_time).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A'}
            </Box>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
              {row.check_out_time ? dayjs.utc(row.check_out_time).tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A') : 'N/A'}
            </Box>
            <Box>
              <Chip
                label={row.status}
                color={getStatusColor(row.status)}
                size="small"
                sx={{ fontWeight: 500, fontSize: '11px' }}
              />
            </Box>
          </Box>
        ))}

        {/* Pagination */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Rows per page:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              size="small"
              sx={{ minWidth: 70 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Page {page} of {totalPages}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                <ArrowBackIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </MotionBox>
    </Box>
  );
};

export default AttendanceReport;