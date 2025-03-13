import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  FormHelperText,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../hooks/useAuth';
import { Profile, Region, ProfileRole } from '../types/database';
import CreateUserForm from './CreateUserForm';

interface Props {
  organizationId: string;
}

type Member = Profile & {
  region?: Region;
};

export default function TeamManagement({ organizationId }: Props) {
  const { organizationService, regionService } = useServices();
  const { profile: currentUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    member?: Member;
  }>({ open: false });
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersResult, regionsResult] = await Promise.all([
        organizationService.getOrganizationMembers(organizationId),
        regionService.listRegions(organizationId),
      ]);

      if (membersResult.error) throw membersResult.error;
      setMembers(membersResult.data || []);
      setRegions(regionsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const handleRoleChange = async (member: Member, newRole: ProfileRole) => {
    try {
      setRoleUpdateLoading(member.id);
      let regionId = member.region_id;

      // If changing to a regional admin role and no region is selected,
      // reset any existing region assignment
      if ((newRole === 'primary_admin' || newRole === 'secondary_admin') && !regionId) {
        regionId = null;
      }

      // If changing from a regional admin role to a non-regional role,
      // remove the region assignment
      if (
        (member.role === 'primary_admin' || member.role === 'secondary_admin') &&
        !['primary_admin', 'secondary_admin'].includes(newRole)
      ) {
        regionId = null;
      }

      const { error } = await organizationService.updateMemberRole(member.id, newRole, regionId);
      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole, region_id: regionId } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setRoleUpdateLoading(null);
    }
  };

  const handleRegionChange = async (member: Member, regionId: string | null) => {
    try {
      setRoleUpdateLoading(member.id);
      const { error } = await organizationService.updateMemberRole(
        member.id,
        member.role,
        regionId
      );
      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, region_id: regionId } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update region');
    } finally {
      setRoleUpdateLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.member) return;

    try {
      const { error } = await organizationService.removeMember(deleteDialog.member.id);
      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== deleteDialog.member?.id));
      setDeleteDialog({ open: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const canManageRoles = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const getRoleColor = (role: ProfileRole) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'warning';
      case 'primary_admin':
        return 'info';
      case 'secondary_admin':
        return 'success';
      default:
        return 'default';
    }
  };

  const isRegionalRole = (role: ProfileRole) => ['primary_admin', 'secondary_admin'].includes(role);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Team Members
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.first_name
                    ? `${member.first_name} ${member.last_name || ''}`
                    : 'No name set'}
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {canManageRoles && isRegionalRole(member.role) ? (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={member.region_id || ''}
                        onChange={(e) => handleRegionChange(member, e.target.value || null)}
                        disabled={!!roleUpdateLoading}
                      >
                        <MenuItem value="">
                          <em>Unassigned</em>
                        </MenuItem>
                        {regions.map((region) => (
                          <MenuItem key={region.id} value={region.id}>
                            {region.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {!member.region_id && (
                        <FormHelperText error>Region required for admin role</FormHelperText>
                      )}
                    </FormControl>
                  ) : member.region_id ? (
                    <Chip
                      label={regions.find((r) => r.id === member.region_id)?.name || 'Unknown'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {canManageRoles ? (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as ProfileRole)}
                        disabled={!!roleUpdateLoading || member.id === currentUser?.id}
                      >
                        {currentUser?.role === 'super_admin' && (
                          <MenuItem value="super_admin">Super Admin</MenuItem>
                        )}
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="primary_admin">Primary Admin</MenuItem>
                        <MenuItem value="secondary_admin">Secondary Admin</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip label={member.role} size="small" color={getRoleColor(member.role)} />
                  )}
                  {roleUpdateLoading === member.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell align="right">
                  {canManageRoles && member.id !== currentUser?.id && (
                    <Tooltip title="Remove member">
                      <IconButton
                        onClick={() => setDeleteDialog({ open: true, member })}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No team members found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {canManageRoles && (
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Add New User
          </Typography>
          <CreateUserForm organizationId={organizationId} onSuccess={loadData} />
        </Box>
      )}

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to remove {deleteDialog.member?.email} from the team?
          </Typography>
          {deleteDialog.member?.region_id && (
            <Alert severity="warning">
              This user will also be removed from their assigned region.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
