// frontend/src/pages/HR/ManagePayroll.tsx
import { useState, FormEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Box, Typography, CircularProgress, Alert, Button, TextField, IconButton, Pagination, Select, MenuItem, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import dayjs from 'dayjs';
import { MotionBox } from '../../components/Motion';

const fetchAllPayroll = async () => (await api.get('/payroll')).data;
const updatePayroll = async ({ payrollId, payrollData }: { payrollId: string; payrollData: any }) => (await api.put(`/payroll/${payrollId}`, payrollData)).data;

const ManagePayroll = () => {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);

    // Editable fields state
    const [editGrossSalary, setEditGrossSalary] = useState('');
    const [editDeductions, setEditDeductions] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

    // Pagination and sorting state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string>('pay_period_end');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const updatedData = {
            gross_salary: parseFloat(editGrossSalary),
            deductions: parseFloat(editDeductions),
            pay_period_start: editStartDate,
            pay_period_end: editEndDate,
        };
        mutation.mutate({ payrollId: selectedPayroll.payroll_id, payrollData: updatedData });
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

    const sortedPayrolls = useMemo(() => {
        if (!payrolls) return [];
        
        const sorted = [...payrolls].sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (sortField === 'pay_period_start' || sortField === 'pay_period_end') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else if (sortField === 'gross_salary' || sortField === 'deductions' || sortField === 'net_salary') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else {
                aValue = aValue?.toString().toLowerCase() || '';
                bValue = bValue?.toString().toLowerCase() || '';
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [payrolls, sortField, sortOrder]);

    const paginatedPayrolls = useMemo(() => {
        const startIndex = page * pageSize;
        return sortedPayrolls.slice(startIndex, startIndex + pageSize);
    }, [sortedPayrolls, page, pageSize]);

    const totalPages = Math.ceil((sortedPayrolls?.length || 0) / pageSize);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value - 1);
    };

    const handlePageSizeChange = (event: any) => {
        setPageSize(event.target.value);
        setPage(0);
    };

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch payroll data.</Alert>;

    return (
        <Box sx={{ p: 4 }}>
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 600, color: '#212121', mb: 0.5 }}>
                        Payroll Management
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999999', fontSize: '14px' }}>
                        Manage employee salary and deductions
                    </Typography>
                </Box>
            </MotionBox>

            {/* Table Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '100px 90px 0.8fr 0.8fr 100px 100px 90px 90px 90px 100px 60px',
                    gap: 1.5,
                    p: 2,
                    borderBottom: '2px solid #e0e0e0',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: 600,
                    color: '#666666',
                    fontSize: '12px',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('payroll_id')}>
                    Pay ID
                    {sortField === 'payroll_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('employee_id')}>
                    Emp ID
                    {sortField === 'employee_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('first_name')}>
                    First Name
                    {sortField === 'first_name' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('last_name')}>
                    Last Name
                    {sortField === 'last_name' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('pay_period_start')}>
                    Start Date
                    {sortField === 'pay_period_start' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('pay_period_end')}>
                    End Date
                    {sortField === 'pay_period_end' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('gross_salary')}>
                    Gross Salary
                    {sortField === 'gross_salary' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('deductions')}>
                    Deductions
                    {sortField === 'deductions' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('net_salary')}>
                    Net Salary
                    {sortField === 'net_salary' ? (
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
                <Box>Actions</Box>
            </Box>

            {/* Payroll List */}
            {paginatedPayrolls.map((row: any) => (
                <Box
                    key={row.payroll_id}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '100px 90px 0.8fr 0.8fr 100px 100px 90px 90px 90px 100px 60px',
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
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.payroll_id}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.employee_id}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.first_name}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.last_name}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>{dayjs(row.pay_period_start).format('YYYY-MM-DD')}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>{dayjs(row.pay_period_end).format('YYYY-MM-DD')}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${row.gross_salary?.toFixed(0)}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${row.deductions?.toFixed(0)}</Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${row.net_salary?.toFixed(0)}</Box>
                    <Box>
                        <Chip
                            label={row.status}
                            size="small"
                            sx={{
                                backgroundColor: row.status === 'paid' ? '#e8f5e9' : '#fff3e0',
                                color: row.status === 'paid' ? '#2e7d32' : '#ef6c00',
                                fontWeight: 500,
                                fontSize: '12px',
                            }}
                        />
                    </Box>
                    <Box>
                        <IconButton size="small" onClick={() => handleEdit(row)} sx={{ color: '#5A3FFF' }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            ))}

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
                        Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedPayrolls.length)} of {sortedPayrolls.length}
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

            {/* Edit Modal */}
            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: '20px', fontWeight: 600, color: '#212121', pb: 1 }}>
                    Edit Payroll
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Gross Salary"
                            type="number"
                            value={editGrossSalary}
                            onChange={(e) => setEditGrossSalary(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Deductions"
                            type="number"
                            value={editDeductions}
                            onChange={(e) => setEditDeductions(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Pay Period Start"
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Pay Period End"
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ color: '#666666' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={mutation.isPending}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                            },
                        }}
                    >
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
                {mutation.isError && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Alert severity="error">
                            {(mutation.error as any).response?.data?.detail || 'Failed to update'}
                        </Alert>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default ManagePayroll;