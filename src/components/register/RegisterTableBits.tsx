import {
  Box,
  Chip,
  MenuItem,
  Select,
  TableCell,
  TextField,
} from '@mui/material';
import { STATUS_FILTER_OPTIONS } from '../../utils/registerColumns';

interface Props {
  columnId: string;
  value: string;
  onChange: (value: string) => void;
}

/** Compact filter control rendered under a register column header. */
export function RegisterColumnFilter({ columnId, value, onChange }: Props) {
  if (columnId === 'status') {
    return (
      <Select
        size="small"
        displayEmpty
        value={value}
        onChange={(e) => onChange(String(e.target.value))}
        sx={{
          minWidth: 110,
          bgcolor: 'background.paper',
          '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' },
        }}
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <MenuItem key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <TextField
      size="small"
      placeholder="Filter…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      sx={{
        minWidth: 96,
        bgcolor: 'background.paper',
        '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' },
      }}
    />
  );
}

export function StatusChip({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'success'
      : status === 'rejected'
        ? 'error'
        : status === 'in_progress'
          ? 'warning'
          : 'default';
  return (
    <Chip
      size="small"
      label={status.replace('_', ' ')}
      color={color}
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

export function RegisterEmptyState({ colSpan }: { colSpan: number }) {
  return (
    <TableCell colSpan={colSpan} align="center">
      <Box py={4} color="text.secondary">
        No requests found.
      </Box>
    </TableCell>
  );
}
