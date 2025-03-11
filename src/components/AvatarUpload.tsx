import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Badge,
  IconButton,
  Box,
  CircularProgress,
  Tooltip,
  Alert,
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthContext } from '../contexts/AuthContext';
import { UserService } from '../services/UserService';

interface AvatarUploadProps {
  currentUrl: string;
  onUrlChange: (url: string | null) => void;
}

export default function AvatarUpload({ currentUrl, onUrlChange }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuthContext();
  const userService = new UserService();

  // Clear error when unmounting
  useEffect(() => {
    return () => setError(null);
  }, []);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);

      const file = event.target.files?.[0];
      if (!file || !profile) return;

      const { data: publicUrl, error: uploadError } = await userService.uploadAvatar(
        file,
        profile.id
      );

      if (uploadError) throw uploadError;
      if (!publicUrl) throw new Error('Failed to get public URL');

      // Delete old avatar if exists and different from default
      if (currentUrl && !currentUrl.includes('default-avatar')) {
        const oldFilePath = currentUrl.split('/avatars/')[1];
        const { error: deleteError } = await userService.deleteAvatar(oldFilePath);
        if (deleteError) {
          console.warn('Error deleting old avatar:', deleteError);
        }
      }

      onUrlChange(publicUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error uploading avatar';
      console.error('Error uploading avatar:', error);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Only delete if not default avatar
      if (currentUrl && !currentUrl.includes('default-avatar')) {
        const filePath = currentUrl.split('/avatars/')[1];
        const { error } = await userService.deleteAvatar(filePath);
        if (error) throw error;
      }

      onUrlChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting avatar';
      console.error('Error deleting avatar:', error);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box position="relative" display="inline-block">
      <Collapse
        in={!!error}
        sx={{ position: 'absolute', bottom: '100%', left: 0, right: 0, mb: 1 }}
      >
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ whiteSpace: 'normal', width: '100%' }}
        >
          {error}
        </Alert>
      </Collapse>
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <label>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={uploadAvatar}
              disabled={loading}
            />
            <IconButton
              component="span"
              disabled={loading}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <EditIcon />
            </IconButton>
          </label>
        }
      >
        <Avatar src={currentUrl || undefined} sx={{ width: 100, height: 100 }} />
        {loading && (
          <CircularProgress
            size={100}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
            }}
          />
        )}
      </Badge>
      {currentUrl && (
        <Tooltip title="Remove avatar">
          <IconButton
            onClick={handleDelete}
            disabled={loading}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
