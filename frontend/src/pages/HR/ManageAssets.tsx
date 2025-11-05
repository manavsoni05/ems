// frontend/src/pages/HR/ManageAssets.tsx
import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, Modal, Paper, TextField, MenuItem, Chip, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, IconButton,
    Snackbar
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
// --- FIX: Change icon imports to named imports ---
import {
    Add as AddIcon,
    AssignmentInd as AssignmentIndIcon,
    KeyboardReturn as KeyboardReturnIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
// --- END FIX ---
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Import ConfirmationDialog

const fetchAssetsWithDetails = async () => (await api.get('/assets')).data;
const fetchEmployees = async () => (await api.get('/employees')).data;

const allotAsset = async (allotmentData: { asset_id: string; employee_id: string }) => {
    return (await api.post('/assets/allot', allotmentData)).data;
};

const allotAssetToTeam = async (allotmentData: { asset_id: string; manager_id: string }) => {
    return (await api.post('/assets/allot-to-team', allotmentData)).data;
};

const reclaimAsset = async (assetId: string) => {
    return (await api.post('/assets/reclaim', { asset_id: assetId })).data;
}

const createAsset = async (assetData: any) => {
    return (await api.post('/assets', assetData)).data;
}

const deleteAsset = async (assetId: string) => {
    return (await api.delete(`/assets/${assetId}`)).data;
}


const ManageAssets = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [allotModalOpen, setAllotModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [newAssetData, setNewAssetData] = useState({ asset_name: '', asset_type: '', serial_number: '', purchase_date: new Date().toISOString().split('T')[0] });
    const [allotmentType, setAllotmentType] = useState<'individual' | 'team'>('individual');
    const [selectedManager, setSelectedManager] = useState('');

    const [confirmReclaimOpen, setConfirmReclaimOpen] = useState(false);
    const [assetToReclaimId, setAssetToReclaimId] = useState<string | null>(null);
    const [assetToReclaimName, setAssetToReclaimName] = useState('');

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [assetToDeleteId, setAssetToDeleteId] = useState<string | null>(null);
    const [assetToDeleteName, setAssetToDeleteName] = useState('');

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const { data: assets, isLoading, isError } = useQuery({ queryKey: ['assetsWithDetails'], queryFn: fetchAssetsWithDetails });
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });

    const allotMutation = useMutation({
        mutationFn: allotAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetsWithDetails'] });
            setAllotModalOpen(false);
            setSnackbarMessage('Asset allotted successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
            // Error shown inside the modal
        }
    });

    const teamAllotMutation = useMutation({
        mutationFn: allotAssetToTeam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetsWithDetails'] });
            setAllotModalOpen(false);
            setSnackbarMessage('Asset allotted to team successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
         onError: (error: any) => {
            // Error shown inside the modal
        }
    });

    const reclaimMutation = useMutation({
        mutationFn: reclaimAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetsWithDetails'] });
            setSnackbarMessage('Asset reclaimed successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
            setSnackbarMessage(`Error reclaiming asset: ${error.response?.data?.detail || error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    });

    const createMutation = useMutation({
        mutationFn: createAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetsWithDetails'] });
            setAddModalOpen(false);
            setSnackbarMessage('Asset created successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setNewAssetData({ asset_name: '', asset_type: '', serial_number: '', purchase_date: new Date().toISOString().split('T')[0] });
        },
         onError: (error: any) => {
            // Error shown inside the modal
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetsWithDetails'] });
            setSnackbarMessage('Asset deleted successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        },
        onError: (error: any) => {
            setSnackbarMessage(`Error deleting asset: ${error.response?.data?.detail || error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    });


     const handleOpenAllotModal = (asset: any) => {
        setSelectedAsset(asset);
        setSelectedEmployee('');
        setSelectedManager('');
        setAllotmentType('individual');
        setAllotModalOpen(true);
    };

    const handleAllot = () => {
        if (selectedAsset) {
            if (allotmentType === 'individual' && selectedEmployee) {
                allotMutation.mutate({ asset_id: selectedAsset.asset_id, employee_id: selectedEmployee });
            } else if (allotmentType === 'team' && selectedManager) {
                teamAllotMutation.mutate({ asset_id: selectedAsset.asset_id, manager_id: selectedManager });
            }
        }
    };

    const handleReclaim = (assetId: string, assetName: string) => {
        setAssetToReclaimId(assetId);
        setAssetToReclaimName(assetName);
        setConfirmReclaimOpen(true);
    };

    const handleConfirmReclaim = () => {
        if (assetToReclaimId) {
            reclaimMutation.mutate(assetToReclaimId);
        }
        setConfirmReclaimOpen(false);
        setAssetToReclaimId(null);
        setAssetToReclaimName('');
    };
    
    const handleDelete = (assetId: string, assetName: string) => {
        setAssetToDeleteId(assetId);
        setAssetToDeleteName(assetName);
        setConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        if (assetToDeleteId) {
            deleteMutation.mutate(assetToDeleteId);
        }
        setConfirmDeleteOpen(false);
        setAssetToDeleteId(null);
        setAssetToDeleteName('');
    };

    const handleCreateAsset = (e: FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newAssetData);
    };

    const columns: GridColDef[] = [
        { field: 'asset_id', headerName: 'Asset ID', width: 150 },
        { field: 'asset_name', headerName: 'Name', flex: 1, minWidth: 150 },
        { field: 'asset_type', headerName: 'Type', width: 120 },
        {
            field: 'status', headerName: 'Status', width: 120,
            renderCell: (params) => (<Chip label={params.value} color={params.value === 'Available' ? 'success' : 'warning'} size="small" />)
        },
        {
            field: 'allotted_to', headerName: 'Allotted To', width: 150,
            valueGetter: (value, row) => row.allotment_info?.employee_id || '---'
        },
        {
            field: 'actions', type: 'actions', headerName: 'Actions', width: 130,
            getActions: ({ row }) => {
                const actions = [];
                
                if (row.status === 'Available') {
                    actions.push(<GridActionsCellItem icon={<AssignmentIndIcon />} label="Allot" onClick={() => handleOpenAllotModal(row)} />);
                } else {
                    actions.push(<GridActionsCellItem icon={<KeyboardReturnIcon />} label="Reclaim" onClick={() => handleReclaim(row.asset_id, row.asset_name)} />);
                }
                
                actions.push(<GridActionsCellItem 
                    icon={<DeleteIcon />} 
                    label="Delete" 
                    onClick={() => handleDelete(row.asset_id, row.asset_name)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === row.asset_id}
                />);
                
                return actions;
            }
        }
    ];

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch asset data.</Alert>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                    <Typography variant="h4" gutterBottom>Manage Company Assets</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddModalOpen(true)}>Add Asset</Button>
            </Box>
            <Box component={Paper} sx={{ width: '100%' }}>
                <DataGrid
                    rows={assets || []}
                    columns={columns}
                    getRowId={(row) => row.asset_id}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 }}}}
                    pageSizeOptions={[10, 25, 50]}
                    loading={reclaimMutation.isPending || deleteMutation.isPending}
                />
            </Box>

            {/* Allot Asset Modal */}
            <Modal open={allotModalOpen} onClose={() => setAllotModalOpen(false)}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                    <Typography variant="h6">Allot Asset: {selectedAsset?.asset_name}</Typography>
                    <FormControl component="fieldset" sx={{ mt: 2 }}>
                        <FormLabel component="legend">Allotment Type</FormLabel>
                        <RadioGroup row value={allotmentType} onChange={(e) => setAllotmentType(e.target.value as 'individual' | 'team')}>
                            <FormControlLabel value="individual" control={<Radio />} label="Individual" />
                            <FormControlLabel value="team" control={<Radio />} label="Team" />
                        </RadioGroup>
                    </FormControl>

                    {allotmentType === 'individual' ? (
                        <TextField select fullWidth label="Select Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} margin="normal">
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                    ) : (
                        <TextField select fullWidth label="Select Team Manager" value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)} margin="normal">
                            {employees?.map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
                        </TextField>
                    )}
                    <Button onClick={handleAllot} variant="contained" sx={{ mt: 2 }} disabled={allotMutation.isPending || teamAllotMutation.isPending}>
                        {(allotMutation.isPending || teamAllotMutation.isPending) ? <CircularProgress size={24} /> : 'Allot Asset'}
                    </Button>
                    {(allotMutation.isError || teamAllotMutation.isError) && <Alert severity="error" sx={{mt: 2}}>{(allotMutation.error as any)?.response?.data?.detail || (teamAllotMutation.error as any)?.response?.data?.detail || "Failed to allot"}</Alert>}
                </Paper>
            </Modal>

            {/* Add Asset Modal */}
            <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)}>
                <Paper sx={{ p: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
                    <Typography variant="h6">Add New Asset</Typography>
                    <Box component="form" onSubmit={handleCreateAsset}>
                        <TextField label="Asset Name" fullWidth margin="normal" value={newAssetData.asset_name} onChange={(e) => setNewAssetData({...newAssetData, asset_name: e.target.value})} required />
                        <TextField label="Asset Type" fullWidth margin="normal" value={newAssetData.asset_type} onChange={(e) => setNewAssetData({...newAssetData, asset_type: e.target.value})} required />
                        <TextField label="Serial Number" fullWidth margin="normal" value={newAssetData.serial_number} onChange={(e) => setNewAssetData({...newAssetData, serial_number: e.target.value})} required />
                        <TextField type="date" label="Purchase Date" fullWidth margin="normal" value={newAssetData.purchase_date} onChange={(e) => setNewAssetData({...newAssetData, purchase_date: e.target.value})} InputLabelProps={{ shrink: true }} required />
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={createMutation.isPending}>
                            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create Asset'}
                        </Button>
                        {createMutation.isError && <Alert severity="error" sx={{mt: 2}}>{(createMutation.error as any).response?.data?.detail || "Failed to create"}</Alert>}
                    </Box>
                </Paper>
            </Modal>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                {snackbarMessage}
                </Alert>
            </Snackbar>

            <ConfirmationDialog
                open={confirmReclaimOpen}
                onClose={() => { setConfirmReclaimOpen(false); setAssetToReclaimId(null); setAssetToReclaimName(''); }}
                onConfirm={handleConfirmReclaim}
                title="Confirm Asset Reclaim"
                message={`Are you sure you want to reclaim asset "${assetToReclaimName}" (${assetToReclaimId || ''})?`}
                confirmText="Reclaim"
                confirmColor="warning"
            />
            
            <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={() => { setConfirmDeleteOpen(false); setAssetToDeleteId(null); setAssetToDeleteName(''); }}
                onConfirm={handleConfirmDelete}
                title="Confirm Asset Deletion"
                message={`Are you sure you want to delete asset "${assetToDeleteName}" (${assetToDeleteId || ''})? This will also remove it from all employees. This action cannot be undone.`}
                confirmText="Delete"
                confirmColor="error"
            />
        </Box>
    );
};

export default ManageAssets;