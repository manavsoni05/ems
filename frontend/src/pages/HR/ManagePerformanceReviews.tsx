// frontend/src/pages/HR/ManagePerformanceReviews.tsx
import { useState, FormEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, TextField, MenuItem, Rating, IconButton,
    Snackbar, Pagination, Select, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import dayjs from 'dayjs';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { MotionBox } from '../../components/Motion';

const fetchAllReviews = async () => (await api.get('/performance-reviews')).data;
const fetchEmployees = async () => (await api.get('/employees')).data;
const createReview = async (reviewData: any) => (await api.post('/performance-reviews', reviewData)).data;
const deleteReview = async (reviewId: string) => (await api.delete(`/performance-reviews/${reviewId}`)).data;

const ManagePerformanceReviews = () => {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ employee_id: '', rating: 3, comments: '', review_date: dayjs().format('YYYY-MM-DD') });

     // --- State for Confirmation Dialog ---
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [reviewToDeleteId, setReviewToDeleteId] = useState<string | null>(null);
    const [reviewToDeleteInfo, setReviewToDeleteInfo] = useState(''); // For display in dialog

    // --- State for Snackbar ---
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Pagination and sorting state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string>('review_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const { data: reviews, isLoading, isError } = useQuery({ queryKey: ['allReviews'], queryFn: fetchAllReviews });
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });

    // --- Modified Mutations ---
    const createMutation = useMutation({
        mutationFn: createReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allReviews'] });
            setModalOpen(false);
            setFormData({ employee_id: '', rating: 3, comments: '', review_date: dayjs().format('YYYY-MM-DD') });
            setSnackbarMessage('Performance review created successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
             // Error shown inside modal
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allReviews'] });
            setSnackbarMessage('Performance review deleted successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
             setSnackbarMessage(`Error deleting review: ${getErrorMessage(error, "Failed to delete")}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    });
    // --- End Modified Mutations ---

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // --- Modified handleDelete to open dialog ---
    const handleDelete = (id: string, employeeId: string, reviewDate: string) => {
        setReviewToDeleteId(id);
        setReviewToDeleteInfo(`Review for ${employeeId} on ${dayjs(reviewDate).format('YYYY-MM-DD')}`);
        setConfirmDeleteOpen(true);
    };

    // --- New function to confirm deletion ---
    const handleConfirmDelete = () => {
        if (reviewToDeleteId) {
            deleteMutation.mutate(reviewToDeleteId);
        }
        setConfirmDeleteOpen(false);
        setReviewToDeleteId(null);
        setReviewToDeleteInfo('');
    };

     const getErrorMessage = (error: any, defaultMessage: string = "An error occurred") => {
        if (!error) return defaultMessage;
        return error.response?.data?.detail || error.message || defaultMessage;
    }

    // Sorting and pagination logic
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedReviews = useMemo(() => {
        if (!reviews) return [];
        
        const sorted = [...reviews].sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (sortField === 'review_date') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else if (sortField === 'rating') {
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
    }, [reviews, sortField, sortOrder]);

    const paginatedReviews = useMemo(() => {
        const startIndex = page * pageSize;
        return sortedReviews.slice(startIndex, startIndex + pageSize);
    }, [sortedReviews, page, pageSize]);

    const totalPages = Math.ceil((sortedReviews?.length || 0) / pageSize);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value - 1);
    };

    const handlePageSizeChange = (event: any) => {
        setPageSize(event.target.value);
        setPage(0);
    };

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch performance reviews.</Alert>;

    return (
        <Box sx={{ p: 4 }}>
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 600, color: '#212121', mb: 0.5 }}>
                        Performance Reviews
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999999', fontSize: '14px' }}>
                        Manage employee performance evaluations
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setModalOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                        },
                    }}
                >
                    Add Review
                </Button>
            </MotionBox>

            {/* Table Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '150px 130px 130px 120px 180px 1fr 80px',
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
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('review_id')}>
                    Review ID
                    {sortField === 'review_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('employee_id')}>
                    Employee ID
                    {sortField === 'employee_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('reviewer_id')}>
                    Reviewer ID
                    {sortField === 'reviewer_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('review_date')}>
                    Date
                    {sortField === 'review_date' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('rating')}>
                    Rating
                    {sortField === 'rating' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('comments')}>
                    Comments
                    {sortField === 'comments' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box>Actions</Box>
            </Box>

            {/* Reviews List */}
            {paginatedReviews.map((row: any) => (
                <Box
                    key={row.review_id}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '150px 130px 130px 120px 180px 1fr 80px',
                        gap: 2,
                        p: 2,
                        borderBottom: '1px solid #e0e0e0',
                        '&:hover': { backgroundColor: '#f9f9f9' },
                        alignItems: 'center',
                        fontSize: '14px',
                        color: '#212121',
                    }}
                >
                    <Box>{row.review_id}</Box>
                    <Box>{row.employee_id}</Box>
                    <Box>{row.reviewer_id}</Box>
                    <Box>{dayjs(row.review_date).format('YYYY-MM-DD')}</Box>
                    <Box>
                        <Rating value={row.rating} readOnly size="small" />
                    </Box>
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.comments}
                    </Box>
                    <Box>
                        <IconButton 
                            size="small" 
                            onClick={() => handleDelete(row.review_id, row.employee_id, row.review_date)} 
                            sx={{ color: '#f44336' }}
                            disabled={deleteMutation.isPending && deleteMutation.variables === row.review_id}
                        >
                            <DeleteIcon fontSize="small" />
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
                        Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedReviews.length)} of {sortedReviews.length}
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

            {/* Add Review Modal */}
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
                    Create New Review
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField select fullWidth label="Select Employee" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} required>
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                        <TextField type="date" label="Review Date" value={formData.review_date} onChange={(e) => setFormData({...formData, review_date: e.target.value})} fullWidth InputLabelProps={{ shrink: true }} required />
                        <Box>
                            <Typography component="legend" sx={{ mb: 1, color: '#666666', fontSize: '14px' }}>Rating</Typography>
                            <Rating name="rating" value={formData.rating} onChange={(e, newValue) => setFormData({...formData, rating: newValue || 0})} />
                        </Box>
                        <TextField label="Comments" multiline rows={4} fullWidth value={formData.comments} onChange={(e) => setFormData({...formData, comments: e.target.value})} required />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ color: '#666666' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={createMutation.isPending}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                            },
                        }}
                    >
                        {createMutation.isPending ? <CircularProgress size={24} /> : 'Submit Review'}
                    </Button>
                </DialogActions>
                {createMutation.isError && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Alert severity="error">
                            {getErrorMessage(createMutation.error, "Failed to create review")}
                        </Alert>
                    </Box>
                )}
            </Dialog>

            {/* --- Snackbar for Notifications --- */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

             {/* --- Confirmation Dialog for Deletion --- */}
            <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={() => { setConfirmDeleteOpen(false); setReviewToDeleteId(null); setReviewToDeleteInfo(''); }}
                onConfirm={handleConfirmDelete}
                title="Confirm Review Deletion"
                message={`Are you sure you want to delete this review: ${reviewToDeleteInfo}?`}
            />
        </Box>
    );
};

export default ManagePerformanceReviews;