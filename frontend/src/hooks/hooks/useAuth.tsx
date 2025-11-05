// frontend/src/hooks/hooks/useAuth.tsx
import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../../services/api';
import { setAccessToken, getAccessToken } from '../../services/api';
import { Box, CircularProgress } from '@mui/material';

interface UserData {
    employee_id: string;
    role_id: string;
    permissions: string[];
}

interface AuthContextType {
  user: UserData | null;
  isInitialized: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface DecodedToken {
  Employee_id: string;
  role: string;
  exp: number;
  permissions: string[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const token = getAccessToken();
      if (token) {
        try {
          const decodedToken: DecodedToken = jwtDecode(token);
          if (decodedToken.exp * 1000 > Date.now()) {
            setUser({ 
                employee_id: decodedToken.Employee_id, 
                role_id: decodedToken.role,
                permissions: decodedToken.permissions || []
            });
          } else {
            setAccessToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error("Error decoding token on initial load:", error);
          setAccessToken(null);
          setUser(null);
        }
      } else {
         setUser(null);
      }
      setIsInitialized(true);
    };
    initializeAuth();
  }, []);


  const login = async (employee_id: string, password: string) => {
    try {
        const response = await api.post('/auth/login', new URLSearchParams({ username: employee_id, password }));
        const { access_token } = response.data;

        setAccessToken(access_token);

        const decodedToken: DecodedToken = jwtDecode(access_token);
        const userData: UserData = {
             employee_id: decodedToken.Employee_id,
             role_id: decodedToken.role,
             permissions: decodedToken.permissions || []
        };
        setUser(userData);

        // --- UPDATED REDIRECT LOGIC ---
        if (userData.role_id === 'admin') {
            navigate('/admin/dashboard');
        } else {
            navigate('/app/dashboard'); // Send ALL other users here
        }
        // --- END UPDATED LOGIC ---

    } catch (err: any) {
         setUser(null);
         setAccessToken(null);
         throw err;
    }
  };


  const logout = async () => {
      setUser(null);
      setAccessToken(null);
      navigate('/login');
  };


  const value = useMemo(() => ({ user, isInitialized, login, logout }), [user, isInitialized]);

  return (
      <AuthContext.Provider value={value}>
          {isInitialized ? children : (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
             </Box>
          )}
      </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};