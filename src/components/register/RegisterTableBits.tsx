import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TextField,
  Tooltip,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import type { FormDefinition } from '../../types';
import {
  emptyFilterValue,
  getColumnFilterKind,
  getSelectFilterOptions,
  isFilterActive,
  type RegisterFilterValue,
} from '../../utils/registerColumns';

interface Props {
  columnId: string;
  value: RegisterFilterValue | undefined;
  onChange: (value: RegisterFilterValue) => void;
  form?: FormDefinition | null;
  forms?: FormDefinition[];
}

const inputSx = {
  bgcolor: 'background.paper',
  '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' },
} as const;

const selectSx = {
  minWidth: 110,
  bgcolor: 'background.paper',
  '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' },
} as const;

function ClearAdornment({
  visible,
  onClear,
  label = 'Clear filter',
}: {
  visible: boolean;
  onClear: () => void;
  label?: string;
}) {
  if (!visible) return null;
  return (
    <InputAdornment position="end">
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          edge="end"
          sx={{ p: 0.25 }}
        >
          <ClearIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );
}

/** Compact filter control rendered under a register column header. */
export function RegisterColumnFilter({
  columnId,
  value,
  onChange,
  form,
  forms,
}: Props) {
  const kind = getColumnFilterKind(columnId, form);
  const active = isFilterActive(value);

  if (kind === 'select') {
    const options = getSelectFilterOptions(columnId, { form, forms });
    const selectValue =
      value?.kind === 'select' ? value.value : '';
    return (
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Select
          size="small"
          displayEmpty
          value={selectValue}
          onChange={(e) =>
            onChange({ kind: 'select', value: String(e.target.value) })
          }
          onClick={(e) => e.stopPropagation()}
          sx={{ ...selectSx, flex: 1 }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        {active && (
          <Tooltip title="Clear filter">
            <IconButton
              size="small"
              aria-label="Clear filter"
              onClick={(e) => {
                e.stopPropagation();
                onChange(emptyFilterValue('select'));
              }}
              sx={{ p: 0.25 }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  }

  if (kind === 'dateRange') {
    const from = value?.kind === 'dateRange' ? value.from : '';
    const to = value?.kind === 'dateRange' ? value.to : '';
    const patch = (next: { from?: string; to?: string }) =>
      onChange({
        kind: 'dateRange',
        from: next.from ?? from,
        to: next.to ?? to,
      });
    return (
      <Stack spacing={0.5} sx={{ minWidth: 132 }}>
        <TextField
          size="small"
          type="date"
          value={from}
          onChange={(e) => patch({ from: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': 'From date', max: to || undefined }}
          sx={{
            ...inputSx,
            '& .MuiInputBase-input': {
              ...inputSx['& .MuiInputBase-input'],
              minWidth: 108,
            },
          }}
          InputProps={{
            endAdornment: (
              <ClearAdornment
                visible={Boolean(from)}
                onClear={() => patch({ from: '' })}
                label="Clear from date"
              />
            ),
          }}
        />
        <TextField
          size="small"
          type="date"
          value={to}
          onChange={(e) => patch({ to: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'aria-label': 'To date', min: from || undefined }}
          sx={{
            ...inputSx,
            '& .MuiInputBase-input': {
              ...inputSx['& .MuiInputBase-input'],
              minWidth: 108,
            },
          }}
          InputProps={{
            endAdornment: (
              <ClearAdornment
                visible={Boolean(to)}
                onClear={() => patch({ to: '' })}
                label="Clear to date"
              />
            ),
          }}
        />
      </Stack>
    );
  }

  const text = value?.kind === 'text' ? value.q : '';
  return (
    <TextField
      size="small"
      placeholder="Search…"
      value={text}
      onChange={(e) => onChange({ kind: 'text', q: e.target.value })}
      onClick={(e) => e.stopPropagation()}
      sx={{
        minWidth: 96,
        ...inputSx,
      }}
      InputProps={{
        endAdornment: (
          <ClearAdornment
            visible={Boolean(text)}
            onClear={() => onChange(emptyFilterValue('text'))}
          />
        ),
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
