// frontend/src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  allowedPermissions: string[];
}

const ProtectedRoute = ({ allowedPermissions }: ProtectedRouteProps) => {
  const { user, isInitialized } = useAuth(); 
  const location = useLocation();

  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- UPDATED ROOT REDIRECT LOGIC ---
  if (location.pathname === '/') {
    if (user.role_id === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }
    // Send ALL other logged-in users to the main app dashboard
    return <Navigate to="/app/dashboard" replace />;
  }
  // --- END UPDATED LOGIC ---
  
  const userPermissions = user.permissions || [];
  
  // Admin role override
  // Or, check if user has AT LEAST ONE of the required permissions for the route
  const hasPermission = 
    user.role_id === 'admin' ||
    allowedPermissions.some(perm => userPermissions.includes(perm));
  
  return hasPermission
    ? <Outlet /> 
    : <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;