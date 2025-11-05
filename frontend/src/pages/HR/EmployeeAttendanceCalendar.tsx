import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Paper, Grid, IconButton } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';

const EmployeeAttendanceCalendar = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [firstCheckIn, setFirstCheckIn] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    const getFirstDate = async () => {
        const { data } = await api.get(`/attendance/employee/${employeeId}/first-checkin`);
        if (data.first_check_in) {
            setFirstCheckIn(dayjs(data.first_check_in));
            setCurrentDate(dayjs(data.first_check_in));
        }
    }
    getFirstDate();
  }, [employeeId]);
  
  const { data: attendance, isLoading, isError } = useQuery({ 
    queryKey: ['employeeAttendance', employeeId, currentDate.year(), currentDate.month() + 1], 
    queryFn: () => api.get(`/attendance/employee/${employeeId}?year=${currentDate.year()}&month=${currentDate.month() + 1}`).then(res => res.data),
    enabled: !!firstCheckIn
  });

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf('month').day();
  
  const getDayStatus = (day: number) => {
    if (!attendance) return null;
    const record = attendance.find((rec: any) => dayjs(rec.check_in_time).date() === day);
    return record ? record.status : null;
  };
  
  if (!firstCheckIn) {
      return <Typography>No attendance records found for this employee.</Typography>
  }

  return (
    <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Attendance for {employeeId}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}>
                <NavigateBeforeIcon />
            </IconButton>
            <Typography variant="h5">{currentDate.format('MMMM YYYY')}</Typography>
            <IconButton onClick={() => setCurrentDate(currentDate.add(1, 'month'))}>
                <NavigateNextIcon />
            </IconButton>
        </Box>
        {isLoading && <CircularProgress />}
        {isError && <Alert severity="error">Could not load attendance data.</Alert>}
        <Grid container columns={7}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs={1} key={day} sx={{ textAlign: 'center', fontWeight: 'bold' }}>{day}</Grid>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <Grid item xs={1} key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                let bgColor = 'transparent';
                if (status === 'Present') bgColor = 'success.light';
                if (status === 'On Leave') bgColor = 'warning.light';

                return (
                    <Grid item xs={1} key={day} sx={{ border: '1px solid #ddd', height: 80, p: 1, backgroundColor: bgColor }}>
                        <Typography variant="body2">{day}</Typography>
                    </Grid>
                );
            })}
        </Grid>
    </Paper>
  );
};

export default EmployeeAttendanceCalendar;