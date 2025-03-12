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
  Typography,
  IconButton,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  CircularProgress,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useServices } from '../hooks/useServices';
import { Profile } from '../types/database';
import CreateUserForm from './CreateUserForm';

interface Props {
  organizationId: string;
}

interface Member extends Profile {
  isEditing?: boolean;
}

export default function TeamManagement({ organizationId }: Props) {
  const { organizationService } = useServices();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    member?: Member;
  }>({ open: false });
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const { data, error } = await organizationService.getOrganizationMembers(organizationId);
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [organizationId, organizationService]);

  const handleRoleChange = async (member: Member, newRole: Profile['role']) => {
    try {
      setRoleUpdateLoading(member.id);
      const { error } = await organizationService.updateMemberRole(member.id, newRole);
      if (error) throw error;

      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

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
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value as Profile['role'])}
                      disabled={!!roleUpdateLoading}
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  {roleUpdateLoading === member.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setDeleteDialog({ open: true, member })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 6, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Add New User
        </Typography>
        <CreateUserForm organizationId={organizationId} onSuccess={() => loadMembers()} />
      </Box>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          Are you sure you want to remove {deleteDialog.member?.email} from the team?
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
