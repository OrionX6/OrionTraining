import React from 'react';
import {
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  IconButton,
  Typography,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuthContext } from '../contexts/AuthContext';
import { useMonitoring } from '../hooks/useMonitoring';
import { useNavigation } from '../hooks/useNavigation';
import type { Profile } from '../types/database';

export default function UserMenu() {
  const auth = useAuthContext();
  const navigation = useNavigation();
  const { trackError, startOperation } = useMonitoring('UserMenu');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const isLoading = auth.loading;
  const profile = auth.profile as Profile | null;
  const email = profile?.email || auth.user?.email;

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    const endMark = startOperation('navigate_profile');
    try {
      handleClose();
      navigation.goTo('PROFILE');
    } catch (error) {
      trackError(error as Error, { action: 'navigate_profile' });
    } finally {
      endMark();
    }
  };

  const handleLogout = async () => {
    const endMark = startOperation('logout');
    try {
      handleClose();
      await auth.signOut();
      navigation.goTo('LOGIN', { replace: true });
    } catch (error) {
      trackError(error as Error, { action: 'logout' });
    } finally {
      endMark();
    }
  };

  // Only render menu if authenticated
  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* User info */}
      <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
        {isLoading ? '...' : email}
      </Typography>

      {/* Menu trigger */}
      <Tooltip title="Account settings">
        <IconButton
          size="large"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isLoading ? 'action.disabled' : undefined,
            }}
            src={!isLoading ? profile?.avatar_url || undefined : undefined}
          >
            {isLoading ? <CircularProgress size={20} /> : <AccountCircleIcon />}
          </Avatar>
        </IconButton>
      </Tooltip>

      {/* Menu items */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {/* Profile section */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {isLoading ? '...' : email}
          </Typography>
          {!isLoading && profile?.organization && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {profile.organization.name}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Profile link */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>

        {/* Admin section */}
        {!isLoading &&
          profile?.role === 'admin' && [
            <Divider key="admin-divider" />,
            <MenuItem key="admin-panel" onClick={() => navigation.goTo('ADMIN')}>
              <ListItemIcon>
                <AdminIcon fontSize="small" />
              </ListItemIcon>
              Admin Panel
            </MenuItem>,
            <MenuItem key="settings" onClick={() => navigation.goTo('SETTINGS')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>,
          ]}

        <Divider />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
