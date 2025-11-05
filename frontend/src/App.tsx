// frontend/src/App.tsx
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './hooks/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from './hooks/hooks/useTheme';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
            <CssBaseline />
            <Box>
                <AuthProvider>
                    <Outlet />
                </AuthProvider>
            </Box>
        </AppThemeProvider>
    </QueryClientProvider>
  );
}

export default App;