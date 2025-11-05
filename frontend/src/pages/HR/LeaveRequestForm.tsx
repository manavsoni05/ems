import { useState, FormEvent, ChangeEvent } from 'react';
import { Box, Button, TextField, Typography, MenuItem, Paper } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';

interface DailyBreakdownItem {
  date: string;
  type: string;
  status: string;
}

const createLeaveRequest = async (payload: any) => {
    const { data } = await api.post('/leaves', payload);
    return data;
}

const LeaveRequestForm = () => {
    const [employeeId, setEmployeeId] = useState('EMP003');
    const [reason, setReason] = useState('');
    const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdownItem[]>([]);
    
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('vacation');
    
    const mutation = useMutation({ mutationFn: createLeaveRequest });

    const handleAddDay = () => {
        if (date) {
            const newDay = { date, type, status: 'pending' };
            setDailyBreakdown(prev => [...prev, newDay].sort((a, b) => a.date.localeCompare(b.date)));
        }
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const payload = { employee_id: employeeId, reason, daily_breakdown: dailyBreakdown };
        mutation.mutate(payload, {
            onSuccess: () => {
                setDailyBreakdown([]);
                setReason('');
            }
        });
    }
    
    return (
        <Paper sx={{p: 3}}>
            <Typography variant="h5" gutterBottom>New Leave Request</Typography>
            <Box component="form" onSubmit={handleSubmit}>
                <TextField label="Employee ID" value={employeeId} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmployeeId(e.target.value)} fullWidth margin="normal" />
                <TextField label="Reason" value={reason} onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} fullWidth margin="normal" />
                
                <Box sx={{mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 1}}>
                    <Typography variant="h6">Add Days</Typography>
                    <TextField type="date" value={date} onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} margin="normal" />
                    <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ml: 2, minWidth: 120, verticalAlign: 'bottom'}}>
                        <MenuItem value="vacation">Vacation</MenuItem>
                        <MenuItem value="sick">Sick</MenuItem>
                        <MenuItem value="wfh">Work From Home</MenuItem>
                    </TextField>
                    <Button onClick={handleAddDay} variant="outlined" sx={{ml: 2, mt: 2.5}}>Add Day</Button>

                    <Box mt={2}>
                        <Typography variant="subtitle1">Selected Days:</Typography>
                        {dailyBreakdown.map(day => <Typography key={day.date}>{day.date} - {day.type}</Typography>)}
                    </Box>
                </Box>
                
                <Button type="submit" variant="contained" sx={{mt: 3}} disabled={mutation.isPending || dailyBreakdown.length === 0}>
                    {mutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
                {mutation.isSuccess && <Typography color="green" sx={{mt: 1}}>Request submitted successfully!</Typography>}
                {mutation.isError && <Typography color="red" sx={{mt: 1}}>Error: {mutation.error.message}</Typography>}
            </Box>
        </Paper>
    );
}

export default LeaveRequestForm;