// frontend/src/pages/HR/ManageEmployeeSkills.tsx
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Box, Typography, CircularProgress, Alert, Button, Modal, Paper, TextField, MenuItem, IconButton,
  Snackbar // Added Snackbar
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Import ConfirmationDialog

// API Functions
const fetchAllSkills = async () => (await api.get('/employee-skills')).data;
const fetchEmployees = async () => (await api.get('/employees')).data;
const createSkill = async (skillData: any) => (await api.post('/employee-skills', skillData)).data;
const updateSkill = async ({ skillId, skillData }: { skillId: string; skillData: any }) => (await api.put(`/employee-skills/${skillId}`, skillData)).data;
const deleteSkill = async (skillId: string) => (await api.delete(`/employee-skills/${skillId}`)).data;

const proficiencyLevels = ['Beginner', 'Intermediate', 'Expert'];

const ManageEmployeeSkills = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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

    const columns: GridColDef[] = [
        { field: 'employee_id', headerName: 'Employee ID', width: 130 },
        { field: 'first_name', headerName: 'First Name', flex: 1, minWidth: 120 },
        { field: 'last_name', headerName: 'Last Name', flex: 1, minWidth: 120 },
        { field: 'skill_name', headerName: 'Skill', flex: 1, minWidth: 150 },
        { field: 'proficiency_level', headerName: 'Proficiency', width: 150 },
        {
            field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
            getActions: ({ row }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => openEditModal(row)} />,
                // Pass relevant info to handleDelete
                <GridActionsCellItem
                  icon={<DeleteIcon />}
                  label="Delete"
                  onClick={() => handleDelete(row.employee_skill_id, `${row.first_name} ${row.last_name}`, row.skill_name)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === row.employee_skill_id}
                 />
            ]
        },
    ];

    const getErrorMessage = (error: any, defaultMessage: string = "An error occurred") => {
        if (!error) return defaultMessage;
        return error.response?.data?.detail || error.message || defaultMessage;
    }

    if (isLoadingSkills || isLoadingEmployees) return <CircularProgress />;
    if (isSkillsError) return <Alert severity="error">Failed to fetch skills.</Alert>;
    if (isEmployeesError) return <Alert severity="error">Failed to fetch employees.</Alert>;


    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                    <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Manage Employee Skills</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddModalOpen(true)}>Add Skill</Button>
            </Box>

            <Box component={Paper} sx={{ width: '100%' }}>
                 <DataGrid
                    rows={skills || []}
                    columns={columns}
                    getRowId={(row) => row.employee_skill_id}
                    loading={deleteMutation.isPending}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 }}}}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Box>

            {/* Add Skill Modal */}
            <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                    <Typography variant="h6" gutterBottom>Add New Skill</Typography>
                    <Box component="form" onSubmit={handleAddSubmit}>
                        <TextField select fullWidth label="Select Employee" value={addFormData.employee_id} onChange={(e) => setAddFormData({ ...addFormData, employee_id: e.target.value })} margin="normal" required>
                            <MenuItem value="" disabled><em>Select an employee...</em></MenuItem>
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                        <TextField label="Skill Name" fullWidth margin="normal" value={addFormData.skill_name} onChange={(e) => setAddFormData({ ...addFormData, skill_name: e.target.value })} required />
                        <TextField select fullWidth label="Proficiency" value={addFormData.proficiency_level} onChange={(e) => setAddFormData({ ...addFormData, proficiency_level: e.target.value })} margin="normal" required>
                            {proficiencyLevels.map(level => (<MenuItem key={level} value={level}>{level}</MenuItem>))}
                        </TextField>
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={createMutation.isPending}>
                            {createMutation.isPending ? <CircularProgress size={24} /> : 'Add Skill'}
                        </Button>
                        {createMutation.isError && <Alert severity="error" sx={{mt: 2}}>{getErrorMessage(createMutation.error, "Failed to add skill")}</Alert>}
                    </Box>
                </Paper>
            </Modal>

            {/* Edit Skill Modal */}
            {editFormData && (
                <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
                    <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                        <Typography variant="h6">Edit Skill for {editFormData.first_name} {editFormData.last_name}</Typography>
                        <Box component="form" onSubmit={handleEditSubmit}>
                            <TextField label="Skill Name" fullWidth margin="normal" value={editFormData.skill_name} disabled />
                            <TextField select fullWidth label="Proficiency" value={editFormData.proficiency_level} onChange={(e) => setEditFormData({...editFormData, proficiency_level: e.target.value})} margin="normal" required>
                                {proficiencyLevels.map(level => (<MenuItem key={level} value={level}>{level}</MenuItem>))}
                            </TextField>
                            <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                            </Button>
                            {updateMutation.isError && <Alert severity="error" sx={{mt: 2}}>{getErrorMessage(updateMutation.error, "Failed to update skill")}</Alert>}
                        </Box>
                    </Paper>
                </Modal>
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