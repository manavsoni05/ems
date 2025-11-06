// frontend/src/pages/Admin/ManageRoles.tsx
import { useState, FormEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, IconButton, Paper,
    TextField, FormControlLabel, FormGroup,
    Snackbar, Divider, Grid, Chip, Pagination, Select, MenuItem, FormControl,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Switch
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    UnfoldMore as UnfoldMoreIcon
} from '@mui/icons-material';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { MotionBox } from '../../components/Motion';

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

    // State
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ role_id: '', role_name: '' });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Pagination and sorting state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string>('role_id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

    // Sorting and pagination logic
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedRoles = useMemo(() => {
        if (!roles) return [];
        
        const sorted = [...roles].sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (sortField === 'permission_count') {
                aValue = a.permission_keys?.length || 0;
                bValue = b.permission_keys?.length || 0;
            } else {
                aValue = aValue?.toString().toLowerCase() || '';
                bValue = bValue?.toString().toLowerCase() || '';
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [roles, sortField, sortOrder]);

    const paginatedRoles = useMemo(() => {
        const startIndex = page * pageSize;
        return sortedRoles.slice(startIndex, startIndex + pageSize);
    }, [sortedRoles, page, pageSize]);

    const totalPages = Math.ceil((sortedRoles?.length || 0) / pageSize);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value - 1);
    };

    const handlePageSizeChange = (event: any) => {
        setPageSize(event.target.value);
        setPage(0);
    };

    if (isLoadingRoles || isLoadingPerms) return <CircularProgress />;
    if (isRolesError || isPermsError) return <Alert severity="error">Failed to load role management data.</Alert>;

    return (
        <Box sx={{ p: 4 }}>
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 600, color: '#212121', mb: 0.5 }}>
                        Roles & Permissions
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999999', fontSize: '14px' }}>
                        Manage system roles and permission assignments
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                        },
                    }}
                >
                    Create New Role
                </Button>
            </MotionBox>

            {/* Table Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 150px 100px',
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
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('role_id')}>
                    Role ID
                    {sortField === 'role_id' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('role_name')}>
                    Role Name
                    {sortField === 'role_name' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('permission_count')}>
                    Permissions
                    {sortField === 'permission_count' ? (
                        sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.5, color: '#5A3FFF' }} />
                    ) : (
                        <UnfoldMoreIcon sx={{ fontSize: 14, ml: 0.5, color: '#999999' }} />
                    )}
                </Box>
                <Box>Actions</Box>
            </Box>

            {/* Roles List */}
            {paginatedRoles.map((row: any) => (
                <Box
                    key={row.role_id}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '200px 1fr 150px 100px',
                        gap: 2,
                        p: 2,
                        borderBottom: '1px solid #e0e0e0',
                        '&:hover': { backgroundColor: '#f9f9f9' },
                        alignItems: 'center',
                        fontSize: '14px',
                        color: '#212121',
                    }}
                >
                    <Box>{row.role_id}</Box>
                    <Box>{row.role_name}</Box>
                    <Box>
                        <Chip
                            label={`${row.permission_keys?.length || 0} permissions`}
                            size="small"
                            sx={{
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontWeight: 500,
                                fontSize: '12px',
                            }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#5A3FFF' }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(row)}
                            sx={{ color: '#f44336' }}
                            disabled={['admin', 'hr', 'employee'].includes(row.role_id)}
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
                        Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedRoles.length)} of {sortedRoles.length}
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

            {/* Create/Edit Modal */}
            <Dialog
                open={modalOpen}
                onClose={handleCloseModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: '20px', fontWeight: 600, color: '#212121', pb: 1 }}>
                    {isEditMode ? 'Edit Role' : 'Create New Role'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
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
                        <Box sx={{ overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, maxHeight: '400px' }}>
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
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleCloseModal} sx={{ color: '#666666' }}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #633d8f 100%)',
                            },
                        }}
                    >
                        {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Role')}
                    </Button>
                </DialogActions>
            </Dialog>

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