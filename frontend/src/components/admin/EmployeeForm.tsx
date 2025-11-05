// frontend/src/components/admin/EmployeeForm.tsx
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom'; // Removed unused useParams
import api, { API_BASE_URL } from '../../services/api';
import {
    Box, Typography, TextField, Button, Paper, Alert, CircularProgress, MenuItem, Avatar, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Grid,
    Snackbar, Divider, TableContainer, Table, TableRow, TableCell, TableBody, Select, FormControl, InputLabel // Removed unused TableHead
} from '@mui/material';
import {
    PhotoCamera as PhotoCameraIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    AddCircleOutline as AddCircleOutlineIcon
} from '@mui/icons-material';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import dayjs from 'dayjs';

// --- Interfaces ---
interface Skill {
  skill_name: string;
  proficiency_level: 'Beginner' | 'Intermediate' | 'Expert';
}

interface EmployeeFormProps {
  employeeId?: string;
}

// --- API Calls ---
const fetchEmployees = async () => (await api.get('/employees')).data;
const fetchRoles = async () => (await api.get('/roles')).data;

// Create (FormData)
const createEmployee = async (employeeData: FormData) => {
  const { data } = await api.post('/employees', employeeData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// Edit (JSON)
const updateEmployee = async ({ employeeId, data }: { employeeId: string; data: any }) => (await api.put(`/employees/${employeeId}`, data)).data;

// Edit-mode file operations
const uploadPhoto = async ({ employeeId, photo }: { employeeId: string; photo: File }) => {
    const photoFormData = new FormData();
    photoFormData.append('file', photo);
    const { data } = await api.post(`/employees/${employeeId}/photo`, photoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

const uploadCertificate = async ({ employeeId, file }: { employeeId: string; file: File }) => {
    const certFormData = new FormData();
    certFormData.append('file', file);
    const { data } = await api.post(`/employees/${employeeId}/certificate`, certFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

const deleteCertificate = async ({ employeeId, certificate_url }: { employeeId: string; certificate_url: string }) => (await api.delete(`/employees/${employeeId}/certificate`, { data: { certificate_url } })).data;


// --- Component ---
const EmployeeForm = ({ employeeId }: EmployeeFormProps) => {
  const isEditMode = Boolean(employeeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });
  const { data: roles, isLoading: isLoadingRoles } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });
  const employee = employees?.find((emp: any) => emp.employee_id === employeeId);

  // --- Shared State ---
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', job_title: '',
    department: '', role_id: '', reports_to: '', password: '',
    hire_date: dayjs().format('YYYY-MM-DD'),
    salary: 0,
    gross_salary: 0,
    deductions: 0,
    certificates: [] as string[] // For edit mode: string[]
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  // --- Create Mode State ---
  const [skills, setSkills] = useState<Skill[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentProficiency, setCurrentProficiency] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Beginner');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]); // For create mode
  
  // --- Edit Mode State ---
  const [confirmDeleteCertOpen, setConfirmDeleteCertOpen] = useState(false);
  const [certToDeleteUrl, setCertToDeleteUrl] = useState<string | null>(null);

  // --- Snackbar State ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // --- Populate Form in Edit Mode ---
  useEffect(() => {
    if (isEditMode && employee) {
      // --- FIX: Use functional update to merge with existing state ---
      setFormData(prev => ({
        ...prev, // This keeps 'hire_date' and 'password' from the initial state
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        job_title: employee.job_title || '',
        department: employee.department || '',
        role_id: employee.role_id || 'employee',
        reports_to: employee.reports_to || '',
        salary: employee.salary || 0,
        gross_salary: employee.gross_salary || 0,
        deductions: employee.deductions || 0,
        certificates: employee.certificates || [],
      }));
      // --- END FIX ---
      setSkills(employee.skills || []);
      setPhotoPreview(employee.photo_url ? `${API_BASE_URL}${employee.photo_url}` : null);
      setFormErrors({});
    }
  }, [isEditMode, employee]);

  // --- Mutations ---

  // Create
  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbarMessage('Employee created successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setTimeout(() => navigate('/admin/dashboard'), 1500);
    },
  });

  // Edit
  const updateMutation = useMutation({
    mutationFn: updateEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbarMessage('Employee details updated successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setTimeout(() => navigate('/admin/dashboard'), 1500);
    },
  });

  // Edit Photo
  const photoMutation = useMutation({
      mutationFn: uploadPhoto,
      onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          setPhotoPreview(data.photo_url ? `${API_BASE_URL}${data.photo_url}` : null);
          setSnackbarMessage('Photo uploaded successfully.');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
      },
      onError: (error: any) => {
          setSnackbarMessage(`Error uploading photo: ${getErrorMessage(error)}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
      }
  });

  // Edit Certificate
  const certificateUploadMutation = useMutation({
    mutationFn: uploadCertificate,
    onSuccess: (data) => {
        queryClient.setQueryData(['employees'], (oldData: any[] | undefined) => 
            oldData?.map(emp => emp.employee_id === employeeId ? data : emp)
        );
        setFormData(prev => ({...prev, certificates: data.certificates || []}));
        setSnackbarMessage('Certificate uploaded successfully.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
    },
     onError: (error: any) => {
        setSnackbarMessage(`Error uploading certificate: ${getErrorMessage(error)}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
  });

  const certificateDeleteMutation = useMutation({
    mutationFn: deleteCertificate,
     onSuccess: (data) => {
        queryClient.setQueryData(['employees'], (oldData: any[] | undefined) => 
            oldData?.map(emp => emp.employee_id === employeeId ? data : emp)
        );
        setFormData(prev => ({...prev, certificates: data.certificates || []}));
        setSnackbarMessage('Certificate deleted successfully.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
     },
     onError: (error: any) => {
         setSnackbarMessage(`Error deleting certificate: ${getErrorMessage(error)}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
     }
  });

  // --- Shared Handlers ---

  const getErrorMessage = (error: any): string => {
    if (!error) return 'An error occurred';
    const detail = error.response?.data?.detail;
    if (detail) {
      if (Array.isArray(detail)) {
        return detail.map((err: { field?: string; loc?: string[]; message: string; msg?: string }) => {
           const fieldName = err.field || (err.loc && err.loc.length > 1 ? err.loc[1] : 'Error');
           return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace('_', ' ')}: ${err.message || err.msg}`;
         }).join('; ');
      } else if (typeof detail === 'string') { return detail; }
    }
    return error.message || 'An unexpected error occurred';
  }

  const validateField = (name: string, value: string): string => {
        switch (name) {
          case 'first_name': case 'last_name':
            if (!value) return `${name.replace('_', ' ')} is required.`;
            if (!/^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$/.test(value)) return 'Invalid characters.';
            if (value.length < 2) return 'Must be at least 2 characters.';
            return '';
          case 'email':
            if (!value) return 'Email is required.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format.';
            return '';
          case 'password':
             if (!isEditMode && !value) return 'Password is required.';
             if (!isEditMode && value.length < 8) return 'Password must be at least 8 characters.';
             return '';
           case 'salary': case 'gross_salary': case 'deductions':
             if (value === '' || value === null || value === undefined) return `${name.replace('_', ' ')} is required.`;
             if (isNaN(Number(value))) return `${name.replace('_', ' ')} must be a number.`;
             if (Number(value) < 0) return `${name.replace('_', ' ')} cannot be negative.`;
             return '';
          default: return '';
        }
   };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { name, value } = e.target;
     setFormData(prev => ({ ...prev, [name]: value }));
     const error = validateField(name, value);
     setFormErrors(prev => ({ ...prev, [name]: error }));
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (isEditMode && employeeId) {
              photoMutation.mutate({ employeeId: employeeId, photo: file });
          } else {
              setPhoto(file);
              setPhotoPreview(URL.createObjectURL(file));
          }
      }
  };

  const handleCertificateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        if (isEditMode && employeeId) {
            certificateUploadMutation.mutate({ employeeId: employeeId, file: e.target.files[0] });
        } else {
            setCertificates(Array.from(e.target.files));
        }
    }
  };
  
  const handleAddSkill = () => {
    if (currentSkill && !skills.some(s => s.skill_name === currentSkill)) {
      setSkills([...skills, { skill_name: currentSkill, proficiency_level: currentProficiency }]);
      setCurrentSkill('');
      setCurrentProficiency('Beginner');
    }
  };

  const handleDeleteSkill = (skillToDelete: string) => {
    setSkills(skills.filter(skill => skill.skill_name !== skillToDelete));
  };
  
  // --- Edit Mode Handlers ---
  const handleCertificateDelete = (certificate_url: string) => {
    setCertToDeleteUrl(certificate_url);
    setConfirmDeleteCertOpen(true);
  };

  const handleConfirmCertificateDelete = () => {
      if (certToDeleteUrl && employeeId) {
          certificateDeleteMutation.mutate({ employeeId: employeeId, certificate_url: certToDeleteUrl });
      }
      setConfirmDeleteCertOpen(false);
      setCertToDeleteUrl(null);
  };
  
  // --- FIX: Add underscore to unused 'event' parameter ---
  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };
  
  // --- The Main Submit Handler ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // --- Validation ---
    const errors: { [key: string]: string } = {};
    const fieldsToValidate = ['first_name', 'last_name', 'email', 'salary', 'gross_salary', 'deductions'];
    if (!isEditMode) {
        fieldsToValidate.push('password');
    }
    
    Object.entries(formData).forEach(([key, value]) => {
         if (fieldsToValidate.includes(key)) {
            const error = validateField(key, String(value ?? ''));
            if (error) errors[key] = error;
         }
     });
      if (!formData.role_id) errors.role_id = "Please select a role.";
      if (Number(formData.deductions) > Number(formData.gross_salary)) { // Ensure numeric comparison
         errors.deductions = 'Deductions cannot exceed Gross Salary.';
      }
     
     setFormErrors(errors);
     if (Object.keys(errors).length > 0) return;

    // --- Submission Logic ---
    if (isEditMode && employeeId) {
        // --- EDIT MODE (JSON) ---
        const { certificates, ...updatePayload } = formData;
        const payloadWithSkills = { ...updatePayload, skills: skills };
        
        updateMutation.mutate({ employeeId: employeeId, data: payloadWithSkills });

    } else {
        // --- CREATE MODE (FormData) ---
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (key !== 'certificates' && value !== null && value !== undefined) {
            data.append(key, String(value));
          }
        });
        
        skills.forEach(skill => data.append('skills', JSON.stringify(skill)));
        if (photo) {
          data.append('photo', photo);
        }
        certificates.forEach(cert => data.append('certificates', cert));

        createMutation.mutate(data);
    }
  };
  
  const isLoading = isLoadingEmployees || isLoadingRoles;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submissionError = isEditMode ? updateMutation.error : createMutation.error;

  if (isLoading) return <CircularProgress />;
  if (isEditMode && !employee) return <Alert severity="error">Employee not found or failed to load.</Alert>;

  return (
    <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" gutterBottom>{isEditMode ? 'Edit Employee' : 'Create New Employee'}</Typography>
      </Box>

      {/* --- Main Form --- */}
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* --- Column 1: Basic Info --- */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Basic Information</Typography>
            <TextField name="first_name" label="First Name" value={formData.first_name} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.first_name} helperText={formErrors.first_name} inputProps={{ pattern: "^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$" }}/>
            <TextField name="last_name" label="Last Name" value={formData.last_name} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.last_name} helperText={formErrors.last_name} inputProps={{ pattern: "^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$" }}/>
            <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.email} helperText={formErrors.email}/>
            
            {!isEditMode && (
                <TextField name="password" label="Password" type="password" value={formData.password} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.password} helperText={formErrors.password} />
            )}

            <Typography variant="h6" sx={{mt: 2}}>Profile Photo</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar src={photoPreview || undefined} sx={{ width: 100, height: 100, mb: 1 }} />
              <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />} disabled={photoMutation.isPending}>
                {photoMutation.isPending ? 'Uploading...' : (isEditMode ? 'Upload New Photo' : 'Upload Photo')}
                <input type="file" hidden onChange={handlePhotoChange} accept="image/*" />
              </Button>
            </Box>
          </Grid>

          {/* --- Column 2: Job & Payroll --- */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Job & Payroll</Typography>
            {!isEditMode && (
                <TextField name="hire_date" label="Joining Date" type="date" value={formData.hire_date} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ shrink: true }} />
            )}
            <TextField name="job_title" label="Job Title" value={formData.job_title} onChange={handleChange} fullWidth required margin="normal" />
            <TextField name="department" label="Department" value={formData.department} onChange={handleChange} fullWidth required select margin="normal">
                <MenuItem value="Front-end development">Front-end development</MenuItem>
                <MenuItem value="Back-end development">Back-end development</MenuItem>
                <MenuItem value="Quality assurance (QA)">Quality assurance (QA)</MenuItem>
                <MenuItem value="AI Department">AI Department</MenuItem>
            </TextField>
            <TextField name="role_id" label="Role" value={formData.role_id} onChange={handleChange} fullWidth required select margin="normal" error={!!formErrors.role_id} helperText={formErrors.role_id} disabled={isLoadingRoles}>
                {roles?.map((role: any) => (<MenuItem key={role.role_id} value={role.role_id}>{role.role_name}</MenuItem>))}
            </TextField>
            <TextField name="reports_to" label="Reports To" value={formData.reports_to} onChange={handleChange} fullWidth select margin="normal" disabled={isLoadingEmployees}>
              <MenuItem value=""><em>None</em></MenuItem>
              {employees?.filter((e: any) => e.employee_id !== employeeId).map((emp: any) => (<MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</MenuItem>))}
            </TextField>
            <TextField name="salary" label="Salary (Base)" type="number" value={formData.salary} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.salary} helperText={formErrors.salary} inputProps={{ min: 0, step: "0.01" }}/>
            <TextField name="gross_salary" label="Gross Salary" type="number" value={formData.gross_salary} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.gross_salary} helperText={formErrors.gross_salary} inputProps={{ min: 0, step: "0.01" }}/>
            <TextField name="deductions" label="Deductions" type="number" value={formData.deductions} onChange={handleChange} fullWidth required margin="normal" error={!!formErrors.deductions} helperText={formErrors.deductions} inputProps={{ min: 0, step: "0.01" }}/>
          </Grid>
          
          {/* --- Column 3: Skills & Certificates --- */}
          <Grid item xs={12} md={4}>
            {/* Skills Section (Unified) */}
            <Typography variant="h6">Skills</Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12}>
                <TextField label="Skill Name" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)} fullWidth margin="normal" size="small" />
              </Grid>
              <Grid item xs={7}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Proficiency</InputLabel>
                  <Select value={currentProficiency} label="Proficiency" onChange={(e) => setCurrentProficiency(e.target.value as 'Beginner' | 'Intermediate' | 'Expert')}>
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Expert">Expert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={5}>
                <Button onClick={handleAddSkill} variant="outlined" startIcon={<AddCircleOutlineIcon />} fullWidth sx={{mt: 1}}>
                  Add
                </Button>
              </Grid>
            </Grid>
            {skills.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 200, overflowY: 'auto' }}>
                <Table size="small">
                  <TableBody>
                    {skills.map((skill) => (
                      <TableRow key={skill.skill_name}>
                        <TableCell>{skill.skill_name}</TableCell>
                        <TableCell>{skill.proficiency_level}</TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleDeleteSkill(skill.skill_name)} size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Certificates Section (Conditional) */}
            <Typography variant="h6" gutterBottom>Certificates</Typography>
            <Button component="label" variant="outlined" sx={{mb: 2}} fullWidth disabled={certificateUploadMutation.isPending}>
                 {certificateUploadMutation.isPending ? 'Uploading...' : (isEditMode ? 'Upload Certificate' : 'Upload Certificates')}
                <input type="file" hidden onChange={handleCertificateUpload} accept="image/*,.pdf" multiple={!isEditMode} />
            </Button>
            
            {isEditMode ? (
                <List dense>
                    {formData.certificates?.map((cert_url: string) => (
                        <ListItem key={cert_url} divider>
                            <ListItemText primary={<a href={`${API_BASE_URL}${cert_url}`} target="_blank" rel="noopener noreferrer">{cert_url?.split('/').pop() || 'Certificate'}</a>} />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" aria-label="delete" onClick={() => handleCertificateDelete(cert_url)} disabled={certificateDeleteMutation.isPending && certificateDeleteMutation.variables?.certificate_url === cert_url}>
                                    {(certificateDeleteMutation.isPending && certificateDeleteMutation.variables?.certificate_url === cert_url) ? <CircularProgress size={20} /> : <DeleteIcon />}
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                    {(!formData.certificates || formData.certificates?.length === 0) && <Typography color="text.secondary" variant="body2">No certificates uploaded.</Typography>}
                </List>
            ) : (
                <List dense>
                  {certificates.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(2)} KB`} />
                    </ListItem>
                  ))}
                  {(certificates.length === 0) && <Typography color="text.secondary" variant="body2">No certificates staged for upload.</Typography>}
                </List>
            )}
          </Grid>
        </Grid>

        {/* --- Submission Area --- */}
        {submissionError && <Alert severity="error" sx={{ mt: 2 }}>{getErrorMessage(submissionError)}</Alert>}

        <Box sx={{ mt: 3, position: 'relative' }}>
          <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} size="large">
            {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Employee')}
          </Button>
        </Box>
      </Box>

      {/* --- Snackbar & Dialogs --- */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={confirmDeleteCertOpen}
        onClose={() => { setConfirmDeleteCertOpen(false); setCertToDeleteUrl(null); }}
        onConfirm={handleConfirmCertificateDelete}
        title="Confirm Certificate Deletion"
        message={`Are you sure you want to delete the certificate: ${certToDeleteUrl?.split('/').pop() || ''}?`}
      />
    </Paper>
  );
};

export default EmployeeForm;