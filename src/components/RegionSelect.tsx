import React, { useEffect, useState } from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectProps,
  SelectChangeEvent,
  CircularProgress,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { useServices } from '../hooks/useServices';
import { Region } from '../types/database';

interface RegionSelectProps extends Omit<SelectProps<string>, 'onChange' | 'value' | 'variant'> {
  organizationId: string;
  value: string | null;
  onChange: (regionId: string | null) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
}

export default function RegionSelect({
  organizationId,
  value,
  onChange,
  required = false,
  error = false,
  helperText,
  label = 'Region',
  disabled = false,
  ...selectProps
}: RegionSelectProps) {
  const { regionService } = useServices();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        setLoading(true);
        const regions = await regionService.listRegions(organizationId);
        setRegions(regions);
      } catch (err) {
        console.error('Failed to load regions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      loadRegions();
    }
  }, [organizationId, regionService]);

  return (
    <FormControl fullWidth required={required} error={error}>
      <InputLabel>{label}</InputLabel>
      <Select<string>
        variant="outlined"
        {...selectProps}
        value={value === null ? '' : value}
        onChange={(e: SelectChangeEvent<string>) => onChange(e.target.value || null)}
        label={label}
        disabled={disabled || loading}
        startAdornment={
          <InputAdornment position="start">
            <LocationIcon color={value ? 'primary' : 'disabled'} />
          </InputAdornment>
        }
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {loading ? (
          <MenuItem disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>Loading regions...</Typography>
            </Box>
          </MenuItem>
        ) : regions.length === 0 ? (
          <MenuItem disabled>No regions available</MenuItem>
        ) : (
          regions.map((region) => (
            <MenuItem key={region.id} value={region.id}>
              {region.name}
            </MenuItem>
          ))
        )}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
