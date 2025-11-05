import { Drawer, Box, Typography, List, ListItem, ListItemText, ListItemIcon, Switch, Button } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTheme } from '../hooks/hooks/useTheme';
import { useAuth } from '../hooks/hooks/useAuth';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDrawer = ({ open, onClose }: SettingsDrawerProps) => {
  const { mode, toggleTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 250, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }} role="presentation">
        <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </ListItemIcon>
            <ListItemText primary="Dark Mode" />
            <Switch
              edge="end"
              onChange={toggleTheme}
              checked={mode === 'dark'}
            />
          </ListItem>
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          fullWidth
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  );
};

export default SettingsDrawer;