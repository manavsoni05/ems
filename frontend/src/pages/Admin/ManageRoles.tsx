// frontend/src/pages/Admin/ManageRoles.tsx
import { useState, FormEvent, useMemo } from 'react'; // <-- Removed unused 'useEffect'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, IconButton, Paper,
    Modal, TextField, FormControlLabel, FormGroup,
    Snackbar, Divider, Grid, // <-- Removed unused List, ListItem, ListItemText
    Switch  // <-- Use Switch
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// --- API Functions (Unchanged) ---
const fetchRoles = async () => (await api.get('/roles')).data;
const fetchPermissions = async () => (await api.get('/roles/permissions')).data;
const createRole = async (roleData: any) => (await api.post('/roles', roleData)).data;
const updateRole = async ({ roleId, roleData }: { roleId: string; roleData: any }) => (await api.put(`/roles/${roleId}`, roleData)).data;
const deleteRole = async (roleId: string) => (await api.delete(`/roles/${roleId}`)).data;

// --- Interfaces (Unchanged) ---
interface Permission {
    permission_key: string;
    description: string;
}

interface Role {
    role_id: string;
    role_name: string;
    permission_keys: string[];
}

interface GroupedPermissions {
  [groupName: string]: Permission[];
}

// --- (Goal 2) Permission Dependency Logic ---

// 1. "Write" permissions automatically check a "Read" permission
const writeRequiresRead: { [write: string]: string } = {
  'employee:create': 'employee:read_all',
  'employee:update': 'employee:read_all',
  'employee:delete': 'employee:read_all',
  'leave:create_all': 'leave:read_all',
  'leave:approve': 'leave:read_all',
  'payroll:create': 'payroll:read_all',
  'payroll:update': 'payroll:read_all',
  'asset:create': 'asset:read_all',
  'asset:allot': 'asset:read_all',
  'asset:reclaim': 'asset:read_all',
  'asset:delete': 'asset:read_all',
  'performance:create': 'performance:read_all',
  'performance:update': 'performance:read_all',
  'performance:delete': 'performance:read_all',
  'skill:create': 'skill:read_all',
  'skill:update': 'skill:read_all',
  'skill:delete': 'skill:read_all',
  'role:manage': 'role:manage', // Special case, no 'read'
};

// 2. "Read" permissions, when unchecked, uncheck "Write" permissions
const readToWrites: { [read: string]: string[] } = {
  'employee:read_all': ['employee:create', 'employee:update', 'employee:delete'],
  'leave:read_all': ['leave:create_all', 'leave:approve'],
  'payroll:read_all': ['payroll:create', 'payroll:update'],
  'asset:read_all': ['asset:create', 'asset:allot', 'asset:reclaim', 'asset:delete'],
  'performance:read_all': ['performance:create', 'performance:update', 'performance:delete'],
  'skill:read_all': ['skill:create', 'skill:update', 'skill:delete'],
};
// --- End Dependency Logic ---


const ManageRoles = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // State
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ role_id: '', role_name: '' });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Queries
    const { data: roles, isLoading: isLoadingRoles, isError: isRolesError } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: fetchRoles
    });
    const { data: permissions, isLoading: isLoadingPerms, isError: isPermsError } = useQuery<Permission[]>({
        queryKey: ['permissions'],
        queryFn: fetchPermissions
    });

    // --- (Goal 1) Group Permissions ---
    const groupedPermissions = useMemo(() => {
        if (!permissions) return {};
        // Group by the first part of the key (e.g., "employee")
        return permissions.reduce((acc, perm) => {
            const groupName = perm.permission_key.split(':')[0];
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(perm);
            return acc;
        }, {} as GroupedPermissions);
    }, [permissions]);
    // --- End Grouping ---

    // Mutations
    const createMutation = useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            handleCloseModal();
            setSnackbar({ open: true, message: 'Role created successfully.', severity: 'success' });
        },
        onError: (error: any) => {
            setSnackbar({ open: true, message: `Error: ${error.response?.data?.detail || error.message}`, severity: 'error' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            handleCloseModal();
            setSnackbar({ open: true, message: 'Role updated successfully.', severity: 'success' });
        },
        onError: (error: any) => {
            setSnackbar({ open: true, message: `Error: ${error.response?.data?.detail || error.message}`, severity: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setConfirmDeleteOpen(false);
            setRoleToDelete(null);
            setSnackbar({ open: true, message: 'Role deleted successfully.', severity: 'success' });
        },
        onError: (error: any) => {
            setSnackbar({ open: true, message: `Error: ${error.response?.data?.detail || error.message}`, severity: 'error' });
        }
    });

    // --- (Goal 2) Smart Toggle Logic ---
    const togglePermission = (key: string, enable: boolean, currentSet: Set<string>): Set<string> => {
        if (enable) {
            // Add the permission
            currentSet.add(key);
            // Check if this permission requires a "read" permission
            const requiredReadPerm = writeRequiresRead[key];
            if (requiredReadPerm) {
                currentSet.add(requiredReadPerm);
            }
        } else {
            // Remove the permission
            currentSet.delete(key);
            // Check if this is a "read" permission that has "write" dependencies
            const dependentWritePerms = readToWrites[key];
            if (dependentWritePerms) {
                // Remove all write permissions that depend on this read permission
                dependentWritePerms.forEach(writePerm => currentSet.delete(writePerm));
            }
        }
        return currentSet;
    };

    // --- Handler for individual switches
    const handlePermissionToggle = (key: string) => {
        const newSet = new Set(selectedPermissions);
        const newState = !newSet.has(key); // The state we want to move to
        const finalSet = togglePermission(key, newState, newSet);
        setSelectedPermissions(new Set(finalSet)); // Create new set to trigger re-render
    };

    // --- (Goal 1) Handler for group master toggles
    const handleGroupToggle = (permissionKeys: string[]) => {
        const allChecked = permissionKeys.every(key => selectedPermissions.has(key));
        const newState = !allChecked; // The state we want to move all keys to

        let newSet = new Set(selectedPermissions);
        permissionKeys.forEach(key => {
            // Apply the smart toggle logic to each key in the group
            newSet = togglePermission(key, newState, newSet);
        });
        setSelectedPermissions(new Set(newSet)); // Create new set to trigger re-render
    };
    // --- End Handlers ---


    // Handlers
    const handleOpenCreate = () => {
        setIsEditMode(false);
        setFormData({ role_id: '', role_name: '' });
        setSelectedPermissions(new Set());
        setModalOpen(true);
    };

    const handleOpenEdit = (role: Role) => {
        setIsEditMode(true);
        setFormData({ role_id: role.role_id, role_name: role.role_name });
        setSelectedPermissions(new Set(role.permission_keys));
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setFormData({ role_id: '', role_name: '' });
        setSelectedPermissions(new Set());
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const roleData = {
            ...formData,
            permission_keys: Array.from(selectedPermissions)
        };
        
        if (isEditMode) {
            const { role_id, ...updateData } = roleData;
            updateMutation.mutate({ roleId: formData.role_id, roleData: updateData });
        } else {
            createMutation.mutate(roleData);
        }
    };

    const handleDeleteClick = (role: Role) => {
        setRoleToDelete(role);
        setConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        if (roleToDelete) {
            deleteMutation.mutate(roleToDelete.role_id);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const columns: GridColDef[] = [
        { field: 'role_id', headerName: 'Role ID', width: 200 },
        { field: 'role_name', headerName: 'Role Name', flex: 1, minWidth: 200 },
        {
            field: 'permission_count',
            headerName: 'Permissions',
            width: 150,
            valueGetter: (_, row) => row.permission_keys?.length || 0, // <-- Fixed unused 'value'
            type: 'number',
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: ({ row }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => handleOpenEdit(row)} />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDeleteClick(row)}
                    disabled={['admin', 'hr', 'employee'].includes(row.role_id)}
                />,
            ],
        },
    ];

    if (isLoadingRoles || isLoadingPerms) return <CircularProgress />;
    if (isRolesError || isPermsError) return <Alert severity="error">Failed to load role management data.</Alert>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                    <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Manage Roles & Permissions</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>Create New Role</Button>
            </Box>

            <Box component={Paper} sx={{ width: '100%' }}>
                <DataGrid
                    rows={roles || []}
                    columns={columns}
                    getRowId={(row) => row.role_id}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    pageSizeOptions={[10, 25]}
                />
            </Box>

            {/* Create/Edit Modal */}
            <Modal open={modalOpen} onClose={handleCloseModal}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', md: 800 }, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>{isEditMode ? 'Edit Role' : 'Create New Role'}</Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <TextField
                            label="Role ID"
                            value={formData.role_id}
                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                            fullWidth margin="normal"
                            required
                            disabled={isEditMode}
                            helperText={!isEditMode ? "Cannot be changed later (e.g., 'manager')" : ""}
                        />
                        <TextField
                            label="Role Name"
                            value={formData.role_name}
                            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                            fullWidth margin="normal"
                            required
                            helperText="User-friendly name (e.g., 'Manager')"
                        />
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Permissions</Typography>
                        
                        {/* --- (Goal 1 & 2) Updated UI Rendering --- */}
                        <Box sx={{ overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                            <Grid container spacing={2}>
                                {Object.entries(groupedPermissions)
                                    // Sort groups alphabetically (e.g., asset, employee, leave)
                                    .sort(([groupNameA], [groupNameB]) => groupNameA.localeCompare(groupNameB))
                                    .map(([groupName, permsInGroup]) => {
                                        
                                        const allKeysInGroup = permsInGroup.map(p => p.permission_key);
                                        const checkedCount = allKeysInGroup.filter(key => selectedPermissions.has(key)).length;
                                        const allChecked = checkedCount === allKeysInGroup.length;
                                        // const indeterminate = checkedCount > 0 && checkedCount < allKeysInGroup.length; // <-- Removed

                                        return (
                                            <Grid item xs={12} sm={6} md={4} key={groupName}>
                                                <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                                                    {/* Master Toggle */}
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={allChecked}
                                                                // indeterminate={indeterminate} // <-- CRITICAL FIX: Removed this prop
                                                                onChange={() => handleGroupToggle(allKeysInGroup)}
                                                            />
                                                        }
                                                        label={
                                                            <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                                                {groupName}
                                                            </Typography>
                                                        }
                                                        sx={{ width: '100%', justifyContent: 'space-between', ml: 0 }}
                                                        labelPlacement="start"
                                                    />
                                                    <Divider sx={{ my: 1 }} />

                                                    {/* Individual Toggles */}
                                                    <FormGroup sx={{ pl: 1 }}>
                                                        {permsInGroup.map(perm => (
                                                            <FormControlLabel
                                                                key={perm.permission_key}
                                                                control={
                                                                    <Switch
                                                                        size="small"
                                                                        checked={selectedPermissions.has(perm.permission_key)}
                                                                        onChange={() => handlePermissionToggle(perm.permission_key)}
                                                                    />
                                                                }
                                                                label={
                                                                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                                                        {perm.permission_key.split(':')[1]} {/* Show 'create' instead of 'employee:create' */}
                                                                    </Typography>
                                                                }
                                                                title={perm.description} // Show full description on hover
                                                                sx={{ width: '100%', justifyContent: 'space-between', ml: 0 }}
                                                                labelPlacement="start"
                                                            />
                                                        ))}
                                                    </FormGroup>
                                                </Paper>
                                            </Grid>
                                        );
                                })}
                            </Grid>
                        </Box>
                        {/* --- End Updated UI --- */}

                        <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Role')}
                        </Button>
                    </Box>
                </Paper>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Role Deletion"
                message={`Are you sure you want to delete the role "${roleToDelete?.role_name || ''}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmColor="error"
            />

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ManageRoles;