// frontend/src/pages/HR/ManageAssets.tsx
import { useState, FormEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Box, Typography, CircularProgress, Alert, Button, Modal, Paper, TextField, MenuItem, Chip, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, IconButton,
    Snackbar, Pagination, Select
} from '@mui/material';
import {
    Add as AddIcon,
    AssignmentInd as AssignmentIndIcon,
    KeyboardReturn as KeyboardReturnIcon,
    Delete as DeleteIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    UnfoldMore as UnfoldMoreIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { MotionBox } from '../../components/Motion';

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

    // Pagination and sorting state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState<string>('asset_id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

    // Sorting and pagination logic
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedAssets = useMemo(() => {
        if (!assets) return [];
        
        const sorted = [...assets].sort((a: any, b: any) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (sortField === 'allotted_to') {
                aValue = a.allotment_info?.employee_id || '---';
                bValue = b.allotment_info?.employee_id || '---';
            }

            aValue = aValue?.toString().toLowerCase() || '';
            bValue = bValue?.toString().toLowerCase() || '';

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [assets, sortField, sortOrder]);

    const paginatedAssets = useMemo(() => {
        const startIndex = page * pageSize;
        return sortedAssets.slice(startIndex, startIndex + pageSize);
    }, [sortedAssets, page, pageSize]);

    const totalPages = Math.ceil((sortedAssets?.length || 0) / pageSize);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value - 1);
    };

    const handlePageSizeChange = (event: any) => {
        setPageSize(event.target.value);
        setPage(0);
    };

    const getStatusColor = (status: string): "success" | "warning" => {
        return status === 'Available' ? 'success' : 'warning';
    };

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">Failed to fetch asset data.</Alert>;

    return (
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
            {/* Page Header */}
            <MotionBox
                sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Box>
                    <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#212121', mb: 0.5 }}>
                        Manage Company Assets
                    </Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#999999' }}>
                        Track and manage company assets and allotments
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setAddModalOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #5A3FFF 0%, #7D5BFF 100%)',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        boxShadow: '0 4px 12px rgba(90, 63, 255, 0.3)',
                        '&:hover': {
                            boxShadow: '0 6px 20px rgba(90, 63, 255, 0.4)',
                            transform: 'translateY(-2px)',
                        }
                    }}
                >
                    Add Asset
                </Button>
            </MotionBox>

            {/* Assets List */}
            <MotionBox
                component={Paper}
                sx={{
                    p: 3,
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E8E8F0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 12px 40px rgba(90, 63, 255, 0.08)',
                    }
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Box>
                    {/* Table Header */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr 120px 120px 150px 140px',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        backgroundColor: '#FAFAFA',
                        borderRadius: '8px 8px 0 0',
                        mb: 0,
                    }}>
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            onClick={() => handleSort('asset_id')}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                                Asset ID
                            </Typography>
                            {sortField === 'asset_id' ? (
                                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                            ) : (
                                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                            )}
                        </Box>
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            onClick={() => handleSort('asset_name')}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                                Name
                            </Typography>
                            {sortField === 'asset_name' ? (
                                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                            ) : (
                                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                            )}
                        </Box>
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            onClick={() => handleSort('asset_type')}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                                Type
                            </Typography>
                            {sortField === 'asset_type' ? (
                                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                            ) : (
                                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                            )}
                        </Box>
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            onClick={() => handleSort('status')}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                                Status
                            </Typography>
                            {sortField === 'status' ? (
                                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                            ) : (
                                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                            )}
                        </Box>
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            onClick={() => handleSort('allotted_to')}
                        >
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                                Allotted To
                            </Typography>
                            {sortField === 'allotted_to' ? (
                                sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: '#5A3FFF' }} />
                            ) : (
                                <UnfoldMoreIcon sx={{ fontSize: 14, color: '#CCCCCC' }} />
                            )}
                        </Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                            Actions
                        </Typography>
                    </Box>

                    {/* Asset List */}
                    <Box>
                        {paginatedAssets && paginatedAssets.length > 0 ? (
                            paginatedAssets.map((asset: any) => (
                                <Box
                                    key={asset.asset_id}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '140px 1fr 120px 120px 150px 140px',
                                        gap: 2,
                                        px: 2,
                                        py: 2,
                                        backgroundColor: '#FFFFFF',
                                        borderBottom: '1px solid #F0F0F0',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            backgroundColor: '#F8F9FA',
                                        }
                                    }}
                                >
                                    {/* Asset ID */}
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#5A3FFF' }}>
                                        {asset.asset_id}
                                    </Typography>

                                    {/* Asset Name */}
                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#212121' }}>
                                        {asset.asset_name}
                                    </Typography>

                                    {/* Asset Type */}
                                    <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                                        {asset.asset_type}
                                    </Typography>

                                    {/* Status */}
                                    <Box>
                                        <Chip 
                                            label={asset.status} 
                                            color={getStatusColor(asset.status)} 
                                            size="small"
                                            sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '11px' }}
                                        />
                                    </Box>

                                    {/* Allotted To */}
                                    <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                                        {asset.allotment_info?.employee_id || '---'}
                                    </Typography>

                                    {/* Actions */}
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {asset.status === 'Available' ? (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenAllotModal(asset)}
                                                sx={{
                                                    color: '#5A3FFF',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(90, 63, 255, 0.08)',
                                                    }
                                                }}
                                                title="Allot Asset"
                                            >
                                                <AssignmentIndIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        ) : (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleReclaim(asset.asset_id, asset.asset_name)}
                                                disabled={reclaimMutation.isPending && assetToReclaimId === asset.asset_id}
                                                sx={{
                                                    color: '#FF9800',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 152, 0, 0.08)',
                                                    }
                                                }}
                                                title="Reclaim Asset"
                                            >
                                                {reclaimMutation.isPending && assetToReclaimId === asset.asset_id ? (
                                                    <CircularProgress size={18} />
                                                ) : (
                                                    <KeyboardReturnIcon sx={{ fontSize: 18 }} />
                                                )}
                                            </IconButton>
                                        )}
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDelete(asset.asset_id, asset.asset_name)}
                                            disabled={deleteMutation.isPending && assetToDeleteId === asset.asset_id}
                                            sx={{
                                                color: '#F44336',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                                }
                                            }}
                                            title="Delete Asset"
                                        >
                                            {deleteMutation.isPending && assetToDeleteId === asset.asset_id ? (
                                                <CircularProgress size={18} />
                                            ) : (
                                                <DeleteIcon sx={{ fontSize: 18 }} />
                                            )}
                                        </IconButton>
                                    </Box>
                                </Box>
                            ))
                        ) : (
                            <Box sx={{ 
                                textAlign: 'center', 
                                py: 8,
                                color: '#999999',
                            }}>
                                <Typography sx={{ fontSize: '14px' }}>
                                    No assets found
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Pagination Controls */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid #F0F0F0',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '13px', color: '#666666' }}>
                                Rows per page:
                            </Typography>
                            <FormControl size="small">
                                <Select
                                    value={pageSize}
                                    onChange={handlePageSizeChange}
                                    sx={{
                                        fontSize: '13px',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#E8E8F0',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#5A3FFF',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#5A3FFF',
                                        }
                                    }}
                                >
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </FormControl>
                            <Typography sx={{ fontSize: '13px', color: '#666666', ml: 2 }}>
                                {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedAssets.length)} of {sortedAssets.length}
                            </Typography>
                        </Box>

                        <Pagination 
                            count={totalPages} 
                            page={page + 1} 
                            onChange={handlePageChange}
                            color="primary"
                            shape="rounded"
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: '#666666',
                                    fontWeight: 500,
                                    '&.Mui-selected': {
                                        backgroundColor: '#5A3FFF',
                                        color: '#FFFFFF',
                                        '&:hover': {
                                            backgroundColor: '#4A2FEF',
                                        }
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(90, 63, 255, 0.08)',
                                    }
                                }
                            }}
                        />
                    </Box>
                </Box>
            </MotionBox>

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