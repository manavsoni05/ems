import { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, ThemeOptions } from '@mui/material/styles';
import { CssBaseline, PaletteMode } from '@mui/material';

interface ThemeContextType {
  toggleTheme: () => void;
  mode: PaletteMode;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<PaletteMode>('dark'); // Default to dark mode

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const designTokens: (mode: PaletteMode) => ThemeOptions = (mode) => ({
      palette: {
        mode,
        ...(mode === 'light'
          ? { // A clean, modern light theme
              primary: { main: '#007AFF' },
              background: { default: '#F7F8FA', paper: '#FFFFFF' },
              text: { primary: '#24292E', secondary: '#586069' },
              divider: '#E1E4E8',
            }
          : { // Futuristic dark theme with high contrast
              primary: { main: '#00AFFF' }, // Bright, futuristic blue
              background: { default: '#0d1117', paper: 'rgba(22, 27, 34, 0.7)' },
              text: { primary: '#E6EDF3', secondary: '#8B949E' }, // Brighter text for contrast
              divider: '#30363D',
            }),
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: '16px',
              boxShadow: 'none',
              border: mode === 'dark' ? '1px solid #30363D' : 'none',
              backdropFilter: mode === 'dark' ? 'blur(12px)' : 'none', // Glassmorphism
            },
          },
        },
        MuiButton: {
            styleOverrides: {
              containedPrimary: {
                  background: 'linear-gradient(45deg, #00AFFF 30%, #0076FF 90%)',
                  color: 'white',
                  fontWeight: 'bold'
              },
              root: {
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
              },
            },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              backgroundColor: 'transparent',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              border: 'none',
            },
          },
        },
        MuiDataGrid: {
            styleOverrides: {
              root: {
                border: 'none',
                borderRadius: '16px',
                backgroundColor: mode === 'dark' ? 'rgba(22, 27, 34, 0.7)' : '#FFFFFF',
              },
              cell: { borderBottom: 'none' },
              columnHeaders: { borderBottom: 'none' },
              footerContainer: { borderTop: `1px solid ${mode === 'dark' ? '#30363D' : '#E1E4E8'}` },
            },
        },
      },
    });
    return createTheme(designTokens(mode));
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within an AppThemeProvider');
  }
  return context;
};