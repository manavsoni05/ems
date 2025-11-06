// frontend/src/pages/HR/ManageEmployeeSkills.tsx
import { useState, FormEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Box, Typography, CircularProgress, Alert, Button, TextField, MenuItem, IconButton,
  Snackbar, Pagination, Select, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { MotionBox } from '../../components/Motion';

// API Functions
const fetchAllSkills = async () => (await api.get('/employee-skills')).data;
const fetchEmployees = async () => (await api.get('/employees')).data;
const createSkill = async (skillData: any) => (await api.post('/employee-skills', skillData)).data;
const updateSkill = async ({ skillId, skillData }: { skillId: string; skillData: any }) => (await api.put(`/employee-skills/${skillId}`, skillData)).data;
const deleteSkill = async (skillId: string) => (await api.delete(`/employee-skills/${skillId}`)).data;

const proficiencyLevels = ['Beginner', 'Intermediate', 'Expert'];

const ManageEmployeeSkills = () => {
    const queryClient = useQueryClient();

    // Modals State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({ employee_id: '', skill_name: '', proficiency_level: 'Beginner' });

    // --- State for Confirmation Dialog ---
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [skillToDeleteId, setSkillToDeleteId] = useState<string | null>(null);
    const [skillToDeleteInfo, setSkillToDeleteInfo] = useState(''); // For display in dialog

    // --- State for Snackbar ---
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Pagination and sorting state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string>('employee_id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    // API Queries
    const { data: skills, isLoading: isLoadingSkills, isError: isSkillsError } = useQuery({ queryKey: ['allSkills'], queryFn: fetchAllSkills });
    const { data: employees, isLoading: isLoadingEmployees, isError: isEmployeesError } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });

    // --- Modified Mutations ---
    const createMutation = useMutation({
        mutationFn: createSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allSkills'] });
            setAddModalOpen(false);
            setAddFormData({ employee_id: '', skill_name: '', proficiency_level: 'Beginner' });
            setSnackbarMessage('Skill added successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
             // Error shown inside modal
            console.error("Failed to add skill:", error);
        }
    });

    const updateMutation = useMutation({
        mutationFn: updateSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allSkills'] });
            setEditModalOpen(false);
            setSnackbarMessage('Skill updated successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
            // Error shown inside modal
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allSkills'] });
            setSnackbarMessage('Skill entry deleted successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
            setSnackbarMessage(`Error deleting skill entry: ${getErrorMessage(error, "Failed to delete")}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    });
    // --- End Modified Mutations ---

    // Handlers
    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({ skillId: editFormData.employee_skill_id, skillData: { proficiency_level: editFormData.proficiency_level } });
    };

    const handleAddSubmit = (e: FormEvent) => {
        e.preventDefault();
        createMutation.mutate(addFormData);
    };

    // --- Modified handleDelete to open dialog ---
    const handleDelete = (id: string, employeeName: string, skillName: string) => {
        setSkillToDeleteId(id);
        setSkillToDeleteInfo(`${skillName} for ${employeeName}`);
        setConfirmDeleteOpen(true);
    };

    // --- New function to confirm deletion ---
    const handleConfirmDelete = () => {
        if (skillToDeleteId) {
            deleteMutation.mutate(skillToDeleteId);
        }
        setConfirmDeleteOpen(false);
        setSkillToDeleteId(null);
        setSkillToDeleteInfo('');
    };

    const openEditModal = (skill: any) => {
        setEditFormData(skill);
        setEditModalOpen(true);
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

    const sortedSkills = useMemo(() => {
        if (!skills) return [];
        
        const sorted = [...skills].sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            aValue = aValue?.toString().toLowerCase() || '';
            bValue = bValue?.toString().toLowerCase() || '';

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [skills, sortField, sortOrder]);

    const paginatedSkills = useMemo(() => {
        const startIndex = page * pageSize;
        return sortedSkills.slice(startIndex, startIndex + pageSize);
    }, [sortedSkills, page, pageSize]);

    const totalPages = Math.ceil((sortedSkills?.length || 0) / pageSize);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value - 1);
    };

    const handlePageSizeChange = (event: any) => {
        setPageSize(event.target.value);
        setPage(0);
    };

    const getProficiencyColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'expert': return { bg: '#e8f5e9', text: '#2e7d32' };
            case 'intermediate': return { bg: '#fff3e0', text: '#ef6c00' };
            case 'beginner': return { bg: '#e3f2fd', text: '#1976d2' };
            default: return { bg: '#f5f5f5', text: '#666666' };
        }
    };

    const getErrorMessage = (error: any, defaultMessage: string = "An error occurred") => {
        if (!error) return defaultMessage;
        return error.response?.data?.detail || error.message || defaultMessage;
    }

    if (isLoadingSkills || isLoadingEmployees) return <CircularProgress />;
    if (isSkillsError) return <Alert severity="error">Failed to fetch skills.</Alert>;
    if (isEmployeesError) return <Alert severity="error">Failed to fetch employees.</Alert>;


    return (
        <Box sx={{ p: 4 }}>
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 600, color: '#212121', mb: 0.5 }}>
                        Employee Skills
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999999', fontSize: '14px' }}>
                        Manage employee skill proficiencies
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddModalOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                        },
                    }}
                >
                    Add Skill
                </Button>
            </MotionBox>

            {/* Table Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '180px 130px 1fr 1fr 1fr 150px 100px',
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
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('employee_skill_id')}>
                    Skill ID
                    {sortField === 'employee_skill_id' ? (
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
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('skill_name')}>
                    Skill Name
                    {sortField === 'skill_name' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('proficiency_level')}>
                    Proficiency
                    {sortField === 'proficiency_level' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box>Actions</Box>
            </Box>

            {/* Skills List */}
            {paginatedSkills.map((row: any) => {
                const colors = getProficiencyColor(row.proficiency_level);
                return (
                    <Box
                        key={row.employee_skill_id}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '180px 130px 1fr 1fr 1fr 150px 100px',
                            gap: 2,
                            p: 2,
                            borderBottom: '1px solid #e0e0e0',
                            '&:hover': { backgroundColor: '#f9f9f9' },
                            alignItems: 'center',
                            fontSize: '14px',
                            color: '#212121',
                        }}
                    >
                        <Box>{row.employee_skill_id}</Box>
                        <Box>{row.employee_id}</Box>
                        <Box>{row.first_name}</Box>
                        <Box>{row.last_name}</Box>
                        <Box>{row.skill_name}</Box>
                        <Box>
                            <Chip
                                label={row.proficiency_level}
                                size="small"
                                sx={{
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    fontWeight: 500,
                                    fontSize: '12px',
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => openEditModal(row)} sx={{ color: '#5A3FFF' }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                                size="small" 
                                onClick={() => handleDelete(row.employee_skill_id, `${row.first_name} ${row.last_name}`, row.skill_name)} 
                                sx={{ color: '#f44336' }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === row.employee_skill_id}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
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
                        Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedSkills.length)} of {sortedSkills.length}
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

            {/* Add Skill Modal */}
            <Dialog
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
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
                    Add New Skill
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box component="form" onSubmit={handleAddSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField select fullWidth label="Select Employee" value={addFormData.employee_id} onChange={(e) => setAddFormData({ ...addFormData, employee_id: e.target.value })} required>
                            <MenuItem value="" disabled><em>Select an employee...</em></MenuItem>
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                        <TextField label="Skill Name" fullWidth value={addFormData.skill_name} onChange={(e) => setAddFormData({ ...addFormData, skill_name: e.target.value })} required />
                        <TextField select fullWidth label="Proficiency" value={addFormData.proficiency_level} onChange={(e) => setAddFormData({ ...addFormData, proficiency_level: e.target.value })} required>
                            {proficiencyLevels.map(level => (<MenuItem key={level} value={level}>{level}</MenuItem>))}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={() => setAddModalOpen(false)} sx={{ color: '#666666' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddSubmit}
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
                        {createMutation.isPending ? <CircularProgress size={24} /> : 'Add Skill'}
                    </Button>
                </DialogActions>
                {createMutation.isError && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Alert severity="error">
                            {getErrorMessage(createMutation.error, "Failed to add skill")}
                        </Alert>
                    </Box>
                )}
            </Dialog>

            {/* Edit Skill Modal */}
            {editFormData && (
                <Dialog
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
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
                        Edit Skill for {editFormData.first_name} {editFormData.last_name}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <Box component="form" onSubmit={handleEditSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField label="Skill Name" fullWidth value={editFormData.skill_name} disabled />
                            <TextField select fullWidth label="Proficiency" value={editFormData.proficiency_level} onChange={(e) => setEditFormData({...editFormData, proficiency_level: e.target.value})} required>
                                {proficiencyLevels.map(level => (<MenuItem key={level} value={level}>{level}</MenuItem>))}
                            </TextField>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 1 }}>
                        <Button onClick={() => setEditModalOpen(false)} sx={{ color: '#666666' }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSubmit}
                            variant="contained"
                            disabled={updateMutation.isPending}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: '#fff',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                                },
                            }}
                        >
                            {updateMutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                        </Button>
                    </DialogActions>
                    {updateMutation.isError && (
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Alert severity="error">
                                {getErrorMessage(updateMutation.error, "Failed to update skill")}
                            </Alert>
                        </Box>
                    )}
                </Dialog>
            )}

            {/* --- Snackbar for Notifications --- */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

             {/* --- Confirmation Dialog for Deletion --- */}
            <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={() => { setConfirmDeleteOpen(false); setSkillToDeleteId(null); setSkillToDeleteInfo(''); }}
                onConfirm={handleConfirmDelete}
                title="Confirm Skill Deletion"
                message={`Are you sure you want to delete the skill entry: ${skillToDeleteInfo}?`}
            />
        </Box>
    );
};

export default ManageEmployeeSkills;