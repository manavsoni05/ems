import { useState, FormEvent, ChangeEvent, SyntheticEvent } from 'react'; // Added SyntheticEvent
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../hooks/hooks/useAuth';
import {
    Box, Typography, TextField, Button, Paper, Alert, CircularProgress, MenuItem, IconButton, Grid, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider,
    Snackbar // Added Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


const createLeaveRequest = async (leaveData: any) => {
  const { data } = await api.post('/leaves', leaveData);
  return data;
};

interface DailyBreakdownItem {
  date: string; // Keep as string (YYYY-MM-DD) for state management
  type: string;
  status: string;
  duration: 'full_day' | 'half_day';
}

const RequestLeave = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Overall request state
  const [reason, setReason] = useState('');
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdownItem[]>([]);

  // State for the "Add Days" form
  const [currentLeaveType, setCurrentLeaveType] = useState('vacation');
  const [currentDuration, setCurrentDuration] = useState<'full_day' | 'half_day'>('full_day');
  const [startDate, setStartDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  // --- Add Snackbar State ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  // --- Add Snackbar Close Handler ---
  const handleSnackbarClose = (event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const mutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
      // Clear form on success
      setReason('');
      setDailyBreakdown([]);
      setStartDate(dayjs().format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
      setCurrentLeaveType('vacation');
      setCurrentDuration('full_day');
      // alert('Leave request submitted successfully!'); // <-- REMOVED this
      
      // --- ADD Snackbar success ---
      setSnackbarMessage('Leave request submitted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      // --- END ADD ---
    },
    onError: (error) => {
      // --- ADD Snackbar error ---
      setSnackbarMessage(`Submission Error: ${getErrorMessage(error)}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      // --- END ADD ---
    }
  });

  // --- MODIFIED FUNCTION ---
  const handleAddDaysToRequest = () => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (start.isAfter(end)) {
      // --- Use Snackbar for this alert too ---
      setSnackbarMessage("Start date cannot be after end date.");
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      // --- End Snackbar ---
      return;
    }

    let current = start;
    const updatedBreakdown = [...dailyBreakdown]; // Create a mutable copy

    while (current.isBefore(end) || current.isSame(end)) {
      const formattedDate = current.format('YYYY-MM-DD');
      const existingIndex = updatedBreakdown.findIndex(day => day.date === formattedDate);

      // Create the new/updated day object
      const dayData: DailyBreakdownItem = {
          date: formattedDate,
          type: currentLeaveType,
          duration: currentDuration,
          status: 'pending', // Always reset status on add/update
      };

      if (existingIndex !== -1) {
        // --- If date exists, UPDATE it ---
        updatedBreakdown[existingIndex] = dayData;
      } else {
        // --- If date does NOT exist, ADD it ---
        updatedBreakdown.push(dayData);
      }
      current = current.add(1, 'day');
    }

    // Sort the final array and update state
    setDailyBreakdown(updatedBreakdown.sort((a, b) => a.date.localeCompare(b.date)));
  };
  // --- END MODIFIED FUNCTION ---

  const handleRemoveDay = (dateToRemove: string) => {
    setDailyBreakdown(prev => prev.filter(day => day.date !== dateToRemove));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
        setSnackbarMessage("Please provide a reason for the leave request.");
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
    }
     if (dailyBreakdown.length === 0) {
        setSnackbarMessage("Please add at least one day to the leave request.");
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
    }
    mutation.mutate({
      employee_id: user?.employee_id,
      reason,
      daily_breakdown: dailyBreakdown,
    });
  };

  const getErrorMessage = (error: any) => {
      if (!error) return 'An error occurred';
      const detail = error.response?.data?.detail;
      if (detail) {
          if (Array.isArray(detail)) {
              // Handle backend validation error array
              return detail.map((err: { field: string; message: string; loc: string[] }) => {
                  const fieldName = err.field || (err.loc && err.loc.length > 1 ? err.loc[1] : 'Error');
                  return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace('_', ' ')}: ${err.message}`;
              }).join('; ');
          }
          // Handle simple string errors
          return detail;
      }
      return error.message || 'An error occurred';
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" gutterBottom>Request Leave</Typography>
        </Box>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          name="reason"
          label="Overall Reason for Leave Request"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          required
          multiline
          rows={3}
          margin="normal"
          inputProps={{ maxLength: 500 }}
        />

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* LEFT COLUMN: ADD DAYS FORM */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>1. Add/Update Days</Typography>
              <TextField
                select
                label="Leave Type"
                value={currentLeaveType}
                onChange={(e) => setCurrentLeaveType(e.target.value)}
                fullWidth
                margin="normal"
              >
                <MenuItem value="vacation">Vacation</MenuItem>
                <MenuItem value="sick">Sick</MenuItem>
                <MenuItem value="work_from_home">Work From Home</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
              </TextField>
              <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">Duration</FormLabel>
                <RadioGroup row value={currentDuration} onChange={(e) => setCurrentDuration(e.target.value as 'full_day' | 'half_day')}>
                  <FormControlLabel value="full_day" control={<Radio />} label="Full Day" />
                  <FormControlLabel value="half_day" control={<Radio />} label="Half Day" />
                </RadioGroup>
              </FormControl>
              <TextField
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                margin="normal"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                margin="normal"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Button onClick={handleAddDaysToRequest} variant="contained" fullWidth sx={{ mt: 2 }}>
                Add / Update Request
              </Button>
            </Paper>
          </Grid>

          {/* RIGHT COLUMN: REVIEW REQUEST */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>2. Review Your Request</Typography>
            <Box sx={{ maxHeight: 380, overflowY: 'auto', p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
              {dailyBreakdown.length > 0 ? dailyBreakdown.map(day => (
                <Box key={day.date} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 0.5, borderBottom: '1px dashed #eee', '&:last-child': { borderBottom: 'none' } }}>
                  <Typography variant="body2">
                    {dayjs(day.date).format('ddd, MMM D')} - <strong style={{ textTransform: 'capitalize' }}>{day.type.replace('_', ' ')}</strong> ({day.duration === 'half_day' ? 'Half Day' : 'Full Day'})
                  </Typography>
                  <IconButton onClick={() => handleRemoveDay(day.date)} size="small" aria-label="delete" color="error">
                    <DeleteIcon fontSize="small"/>
                  </IconButton>
                </Box>
              )) : (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  Select leave type, duration, and add dates to build your request.
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }}/>

        {/* This Alert will now only be shown if there's an error on submit, but the Snackbar will handle it */}
        {mutation.isError && !snackbarOpen && <Alert severity="error" sx={{ mb: 2 }}>{getErrorMessage(mutation.error)}</Alert>}

        <Box sx={{ position: 'relative' }}>
          <Button type="submit" variant="contained" size="large" fullWidth disabled={dailyBreakdown.length === 0 || !reason.trim() || mutation.isPending}>
            Submit Full Request
          </Button>
          {mutation.isPending && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />}
        </Box>
      </Box>

      {/* --- ADD THIS JSX --- */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
            <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                {snackbarMessage}
            </Alert>
      </Snackbar>
      {/* --- END ADD JSX --- */}
    </Paper>
  );
};

export default RequestLeave;