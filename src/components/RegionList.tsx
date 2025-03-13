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
  CircularProgress,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useRegionService } from '../contexts/ServiceContext';
import { useAuth } from '../hooks/useAuth';
import { Region } from '../types/database';

interface RegionFormData {
  name: string;
  description?: string;
}

export interface RegionListProps {
  organizationId: string;
}

export default function RegionList({ organizationId }: RegionListProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState<RegionFormData>({ name: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; region?: Region }>({
    open: false,
  });

  const regionService = useRegionService();
  const { user } = useAuth();

  useEffect(() => {
    loadRegions();
  }, [organizationId]);

  const loadRegions = async () => {
    try {
      const regions = await regionService.listRegions(organizationId);
      setRegions(regions);
      setError(null);
    } catch (err) {
      setError('Failed to load regions');
      console.error('Error loading regions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setFormData({
        name: region.name,
        description: region.description || '',
      });
    } else {
      setEditingRegion(null);
      setFormData({ name: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRegion(null);
    setFormData({ name: '' });
  };

  const handleSubmit = async () => {
    try {
      if (editingRegion) {
        const updated = await regionService.updateRegion(editingRegion.id, formData);
        setRegions(regions.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await regionService.createRegion({
          ...formData,
          organizationId,
        });
        setRegions([...regions, created]);
      }
      handleCloseDialog();
    } catch (err) {
      setError(editingRegion ? 'Failed to update region' : 'Failed to create region');
      console.error('Error saving region:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.region) return;

    try {
      await regionService.deleteRegion(deleteDialog.region.id);
      setRegions(regions.filter((r) => r.id !== deleteDialog.region?.id));
      setDeleteDialog({ open: false });
    } catch (err) {
      setError('Failed to delete region');
      console.error('Error deleting region:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={24} />
          <Typography>Loading regions...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Regions</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
          startIcon={<AddIcon />}
        >
          Add Region
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regions.length > 0 ? (
              regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell>{region.name}</TableCell>
                  <TableCell>{region.description}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(region)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialog({ open: true, region })}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <Typography color="text.secondary">No regions have been created yet</Typography>
                    <Button
                      variant="outlined"
                      onClick={() => handleOpenDialog()}
                      startIcon={<AddIcon />}
                    >
                      Create your first region
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRegion ? 'Edit Region' : 'Create Region'}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim()}
          >
            {editingRegion ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the region "{deleteDialog.region?.name}"? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
