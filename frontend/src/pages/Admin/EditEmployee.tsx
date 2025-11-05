// frontend/src/pages/Admin/EditEmployee.tsx
import { useParams } from 'react-router-dom';
import EmployeeForm from '../../components/admin/EmployeeForm';
import { Alert } from '@mui/material';

const EditEmployee = () => {
  const { employeeId } = useParams<{ employeeId: string }>();

  if (!employeeId) {
    return <Alert severity="error">No Employee ID provided in URL.</Alert>;
  }

  return <EmployeeForm employeeId={employeeId} />;
};

export default EditEmployee;