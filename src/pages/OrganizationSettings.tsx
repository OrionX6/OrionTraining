import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import { useOrganizationService } from '../contexts/ServiceContext';
import { useNavigation } from '../hooks/useNavigation';
import { Organization } from '../types/database';
import LoadingScreen from '../components/LoadingScreen';
import OrganizationProfile from '../components/OrganizationProfile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import TeamManagement from '../components/TeamManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`organization-settings-tabpanel-${index}`}
      aria-labelledby={`organization-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `organization-settings-tab-${index}`,
    'aria-controls': `organization-settings-tabpanel-${index}`,
  };
}

export default function OrganizationSettings() {
  const { profile, loading: authLoading } = useAuthContext();
  const organizationService = useOrganizationService();
  const navigation = useNavigation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!profile) return;

      try {
        setLoading(true);
        const { data, error } = await organizationService.getCurrentUserOrganization();

        if (error) {
          throw error;
        }

        setOrganization(data);
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [profile, organizationService]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">You must be logged in to access this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!organization) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          You are not associated with any organization. Please contact your administrator.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigation.goTo('HOME')}
          variant="text"
          color="primary"
        >
          Back to Home
        </Button>
      </Box>
      <Paper elevation={2}>
        <Box p={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Organization Settings
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Manage your organization's profile and team members
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="organization settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Organization Profile" {...a11yProps(0)} />
            <Tab label="Team Management" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {organization && (
            <OrganizationProfile
              organization={organization}
              onUpdate={() => {
                // Refresh organization data when updated
                setLoading(true);
                organizationService
                  .getCurrentUserOrganization()
                  .then(({ data }) => {
                    if (data) {
                      setOrganization(data);
                    }
                  })
                  .catch((err) => {
                    console.error('Error refreshing organization:', err);
                  })
                  .finally(() => {
                    setLoading(false);
                  });
              }}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TeamManagement organizationId={organization.id} />
        </TabPanel>
      </Paper>
    </Container>
  );
}
