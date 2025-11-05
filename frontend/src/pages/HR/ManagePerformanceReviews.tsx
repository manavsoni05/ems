// frontend/src/pages/HR/ManagePerformanceReviews.tsx
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, Modal, Paper, TextField, MenuItem, Rating, IconButton,
    Snackbar // Added Snackbar
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Import ConfirmationDialog

const fetchAllReviews = async () => (await api.get('/performance-reviews')).data;
const fetchEmployees = async () => (await api.get('/employees')).data;
const createReview = async (reviewData: any) => (await api.post('/performance-reviews', reviewData)).data;
const deleteReview = async (reviewId: string) => (await api.delete(`/performance-reviews/${reviewId}`)).data;

const ManagePerformanceReviews = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
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

    const columns: GridColDef[] = [
        { field: 'review_id', headerName: 'Review ID', width: 150 },
        { field: 'employee_id', headerName: 'Employee ID', width: 130 },
        { field: 'reviewer_id', headerName: 'Reviewer ID', width: 130 },
        { field: 'review_date', headerName: 'Date', width: 120, valueFormatter: (value) => dayjs(value as string).format('YYYY-MM-DD') },
        { field: 'rating', headerName: 'Rating', width: 150, renderCell: (params) => <Rating value={params.value} readOnly /> },
        { field: 'comments', headerName: 'Comments', flex: 1, minWidth: 250 },
        {
            field: 'actions', type: 'actions', headerName: 'Actions', width: 80,
            getActions: ({ row }) => [
                // Pass relevant info to handleDelete
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDelete(row.review_id, row.employee_id, row.review_date)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === row.review_id}
                />,
            ],
        },
    ];

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch performance reviews.</Alert>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                    <Typography variant="h4" gutterBottom>Performance Reviews</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Add Review</Button>
            </Box>
            <Box component={Paper} sx={{ width: '100%' }}>
                <DataGrid
                    rows={reviews || []}
                    columns={columns}
                    getRowId={(row) => row.review_id}
                    loading={deleteMutation.isPending}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'review_date', sort: 'desc' }]}}}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Box>

            {/* Add Review Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                    <Typography variant="h6">Create New Review</Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField select fullWidth label="Select Employee" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} margin="normal" required>
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                         <TextField type="date" label="Review Date" value={formData.review_date} onChange={(e) => setFormData({...formData, review_date: e.target.value})} margin="normal" fullWidth InputLabelProps={{ shrink: true }} required />
                        <Typography component="legend" sx={{ mt: 1 }}>Rating</Typography>
                        <Rating name="rating" value={formData.rating} onChange={(e, newValue) => setFormData({...formData, rating: newValue || 0})} />
                        <TextField label="Comments" multiline rows={4} fullWidth margin="normal" value={formData.comments} onChange={(e) => setFormData({...formData, comments: e.target.value})} required />
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={createMutation.isPending}>
                            {createMutation.isPending ? <CircularProgress size={24} /> : 'Submit Review'}
                        </Button>
                         {createMutation.isError && <Alert severity="error" sx={{mt: 2}}>{getErrorMessage(createMutation.error, "Failed to create review")}</Alert>}
                    </Box>
                </Paper>
            </Modal>

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