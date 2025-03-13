import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import RegionList from './RegionList';
import { useAuth } from '../hooks/useAuth';

export default function RegionsTab() {
  const { profile } = useAuth();

  if (!profile?.organization_id) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="error">
          You must be part of an organization to manage regions.
        </Typography>
      </Paper>
    );
  }

  const canManageRegions = profile.role === 'super_admin' || profile.role === 'admin';

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Regional Management
        </Typography>
        <Typography variant="body1" paragraph>
          Manage your organization's regions. Each region can have its own administrators and
          content, allowing for localized management of quizzes and study materials.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Regional System Features:</strong>
          </Typography>
          <ul style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
            <li>Create and manage distinct regions within your organization</li>
            <li>Assign primary and secondary administrators to each region</li>
            <li>Control content access and management at the regional level</li>
            <li>Users can be assigned to specific regions for targeted content</li>
          </ul>
        </Alert>
        {!canManageRegions && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You need admin privileges to manage regions. Contact your organization administrator for
            assistance.
          </Alert>
        )}
      </Box>

      {canManageRegions ? (
        <RegionList organizationId={profile.organization_id} />
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            Only administrators can manage regions. Your role: {profile.role}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
