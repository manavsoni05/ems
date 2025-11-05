// frontend/src/pages/HR/ManagePayroll.tsx
import { useState, FormEvent, useEffect } from 'react'; // Import useEffect
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Button, Modal, Paper, TextField, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fetchAllPayroll = async () => (await api.get('/payroll')).data;
const updatePayroll = async ({ payrollId, payrollData }: { payrollId: string; payrollData: any }) => (await api.put(`/payroll/${payrollId}`, payrollData)).data;

const ManagePayroll = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);

    // --- Add state for editable fields ---
    const [editGrossSalary, setEditGrossSalary] = useState('');
    const [editDeductions, setEditDeductions] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    // --- End Add state ---

    const { data: payrolls, isLoading, isError } = useQuery({ queryKey: ['allPayroll'], queryFn: fetchAllPayroll });

    const mutation = useMutation({
        mutationFn: updatePayroll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPayroll'] });
            setModalOpen(false);
        },
    });

    // --- Modify handleEdit ---
    const handleEdit = (payroll: any) => {
        setSelectedPayroll(payroll);
        // Set state for all editable fields when opening modal
        setEditGrossSalary(payroll?.gross_salary?.toString() || '');
        setEditDeductions(payroll?.deductions?.toString() || '');
        setEditStartDate(payroll?.pay_period_start ? dayjs(payroll.pay_period_start).format('YYYY-MM-DD') : '');
        setEditEndDate(payroll?.pay_period_end ? dayjs(payroll.pay_period_end).format('YYYY-MM-DD') : '');
        setModalOpen(true);
    };
    // --- End Modify handleEdit ---

    // --- Modify handleSubmit ---
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Use state variables for the payload
        const updatedData = {
            gross_salary: parseFloat(editGrossSalary),
            deductions: parseFloat(editDeductions),
            pay_period_start: editStartDate, // Send as YYYY-MM-DD string
            pay_period_end: editEndDate,     // Send as YYYY-MM-DD string
        };
        mutation.mutate({ payrollId: selectedPayroll.payroll_id, payrollData: updatedData });
    };
    // --- End Modify handleSubmit ---

    const columns: GridColDef[] = [
        // ... (columns definition remains the same) ...
        { field: 'payroll_id', headerName: 'Payroll ID', width: 150 },
        { field: 'employee_id', headerName: 'Employee ID', width: 130 },
        { field: 'first_name', headerName: 'First Name', flex: 1, minWidth: 120 }, // Flex
        { field: 'last_name', headerName: 'Last Name', flex: 1, minWidth: 120 }, // Flex
        { field: 'pay_period_start', headerName: 'Start Date', width: 120, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
        { field: 'pay_period_end', headerName: 'End Date', width: 120, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
        { field: 'gross_salary', headerName: 'Gross Salary', width: 120, type: 'number' },
        { field: 'deductions', headerName: 'Deductions', width: 120, type: 'number' },
        { field: 'net_salary', headerName: 'Net Salary', width: 120, type: 'number' },
        { field: 'status', headerName: 'Status', width: 120 },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 80, // Fixed width
            getActions: ({ row }) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleEdit(row)} // Use updated handler
                />,
            ],
        },
    ];

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch payroll data.</Alert>;

    return (
        <Box>
            {/* ... (Header remains the same) ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" gutterBottom>Manage Payroll</Typography>
            </Box>
            <Box component={Paper} sx={{ width: '100%' }}>
                {/* ... (DataGrid remains the same) ... */}
                <DataGrid
                    rows={payrolls || []}
                    columns={columns}
                    getRowId={(row) => row.payroll_id}
                    autoHeight // Add autoHeight
                    initialState={{ // Add pagination settings
                        pagination: {
                            paginationModel: { pageSize: 10, page: 0 },
                        },
                         sorting: { // Keep existing sort if needed
                             sortModel: [{ field: 'pay_period_end', sort: 'desc' }],
                         },
                    }}
                    pageSizeOptions={[10, 25, 50]} // Add page size options
                />
            </Box>

            {/* Edit Modal - Modified */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                    <Typography variant="h6">Edit Payroll for {selectedPayroll?.first_name} {selectedPayroll?.last_name}</Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                        {/* --- Add Date Fields --- */}
                        <TextField
                            type="date"
                            name="pay_period_start"
                            label="Pay Period Start"
                            fullWidth margin="normal"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} // Ensure label doesn't overlap
                            required
                         />
                         <TextField
                            type="date"
                            name="pay_period_end"
                            label="Pay Period End"
                            fullWidth margin="normal"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} // Ensure label doesn't overlap
                            required
                         />
                         {/* --- End Add Date Fields --- */}

                        <TextField
                            type="number"
                            name="gross_salary"
                            label="Gross Salary"
                            fullWidth margin="normal"
                            value={editGrossSalary} // Use state variable
                            onChange={(e) => setEditGrossSalary(e.target.value)} // Update state
                            required
                        />
                        <TextField
                             type="number"
                             name="deductions"
                             label="Deductions"
                             fullWidth margin="normal"
                             value={editDeductions} // Use state variable
                             onChange={(e) => setEditDeductions(e.target.value)} // Update state
                             required
                        />
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={mutation.isPending}>
                            {mutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                        </Button>
                        {mutation.isError && <Alert severity="error" sx={{mt: 2}}>{(mutation.error as any).response?.data?.detail || "Failed to update"}</Alert>}
                    </Box>
                </Paper>
            </Modal>
        </Box>
    );
};

export default ManagePayroll;