import { useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TableCell,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { FormDefinition, Workflow } from '../../types';
import {
  emptyFilterValue,
  formatDateFilterSummary,
  getColumnFilterKind,
  getSelectFilterOptions,
  isFilterActive,
  RELATIVE_DATE_PRESETS,
  type DateFilterMode,
  type RegisterFilterValue,
} from '../../utils/registerColumns';

interface Props {
  columnId: string;
  value: RegisterFilterValue | undefined;
  onChange: (value: RegisterFilterValue) => void;
  form?: FormDefinition | null;
  forms?: FormDefinition[];
  workflows?: Workflow[];
}

/** Shared height so text + select + date trigger align. */
const CONTROL_HEIGHT = 32;

const controlRootSx = {
  height: CONTROL_HEIGHT,
  minHeight: CONTROL_HEIGHT,
  boxSizing: 'border-box',
  bgcolor: 'background.paper',
  borderRadius: 1,
  fontSize: '0.75rem',
} as const;

const textFieldSx = {
  width: '100%',
  minWidth: 110,
  '& .MuiOutlinedInput-root': {
    ...controlRootSx,
    paddingRight: '4px',
  },
  '& .MuiOutlinedInput-input': {
    py: 0,
    height: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    fontSize: '0.75rem',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0,0,0,0.23)',
  },
} as const;

const selectSx = {
  ...controlRootSx,
  width: '100%',
  minWidth: 110,
  '& .MuiSelect-select': {
    py: 0,
    display: 'flex',
    alignItems: 'center',
    minHeight: `${CONTROL_HEIGHT - 2}px !important`,
    fontSize: '0.75rem',
  },
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

function DateFilterControl({
  value,
  onChange,
}: {
  value: RegisterFilterValue | undefined;
  onChange: (value: RegisterFilterValue) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const filter: Extract<RegisterFilterValue, { kind: 'dateRange' }> =
    value?.kind === 'dateRange'
      ? value
      : {
          kind: 'dateRange',
          mode: 'between',
          from: '',
          to: '',
          relativeDays: 90,
        };

  const active = isFilterActive(filter);
  const summary = formatDateFilterSummary(filter);

  const patch = (
    next: Partial<Extract<RegisterFilterValue, { kind: 'dateRange' }>>,
  ) => {
    onChange({ ...filter, ...next, kind: 'dateRange' });
  };

  const setMode = (mode: DateFilterMode) => {
    patch({
      mode,
      relativeDays: filter.relativeDays || 90,
    });
  };

  return (
    <>
      <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minWidth: 120 }}>
        <ButtonBase
          ref={anchorRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          sx={{
            ...controlRootSx,
            flex: 1,
            px: 1,
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.23)',
            justifyContent: 'flex-start',
            gap: 0.5,
            textAlign: 'left',
            '&:hover': { borderColor: 'text.primary' },
          }}
        >
          <CalendarMonthIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography
            variant="caption"
            noWrap
            sx={{
              fontSize: '0.75rem',
              color: active ? 'text.primary' : 'text.secondary',
              fontWeight: active ? 600 : 400,
            }}
          >
            {summary}
          </Typography>
        </ButtonBase>
        {active && (
          <Tooltip title="Clear filter">
            <IconButton
              size="small"
              aria-label="Clear filter"
              onClick={(e) => {
                e.stopPropagation();
                onChange(emptyFilterValue('dateRange'));
              }}
              sx={{ p: 0.25 }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { p: 2, width: 280 } } }}
      >
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          Date filter
        </Typography>
        <RadioGroup
          value={filter.mode}
          onChange={(e) => setMode(e.target.value as DateFilterMode)}
        >
          <FormControlLabel
            value="between"
            control={<Radio size="small" />}
            label="Between dates"
          />
          <FormControlLabel
            value="relative"
            control={<Radio size="small" />}
            label="Relative"
          />
        </RadioGroup>

        <Divider sx={{ my: 1.5 }} />

        {filter.mode === 'between' ? (
          <Stack spacing={1.25}>
            <TextField
              size="small"
              type="date"
              label="From"
              value={filter.from}
              onChange={(e) => patch({ from: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{ max: filter.to || undefined }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={filter.to}
              onChange={(e) => patch({ to: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              inputProps={{ min: filter.from || undefined }}
            />
          </Stack>
        ) : (
          <Stack spacing={1}>
            {RELATIVE_DATE_PRESETS.map((p) => (
              <Button
                key={p.days}
                size="small"
                variant={
                  filter.relativeDays === p.days ? 'contained' : 'outlined'
                }
                onClick={() => patch({ relativeDays: p.days, mode: 'relative' })}
                sx={{ justifyContent: 'flex-start' }}
              >
                {p.label}
              </Button>
            ))}
            <TextField
              size="small"
              type="number"
              label="Custom days"
              value={
                RELATIVE_DATE_PRESETS.some((p) => p.days === filter.relativeDays)
                  ? ''
                  : filter.relativeDays || ''
              }
              placeholder="e.g. 14"
              onChange={(e) => {
                const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                patch({ relativeDays: n, mode: 'relative' });
              }}
              inputProps={{ min: 1, max: 3650 }}
              fullWidth
            />
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between" mt={2}>
          <Button
            size="small"
            onClick={() => {
              onChange(emptyFilterValue('dateRange'));
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button size="small" variant="contained" onClick={() => setOpen(false)}>
            Done
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

/** Compact filter control rendered under a register column header. */
export function RegisterColumnFilter({
  columnId,
  value,
  onChange,
  form,
  forms,
  workflows,
}: Props) {
  const kind = getColumnFilterKind(columnId, form);
  const active = isFilterActive(value);

  if (kind === 'select') {
    const options = getSelectFilterOptions(columnId, {
      form,
      forms,
      workflows,
    });
    const selected = value?.kind === 'select' ? value.values : [];
    return (
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Select
          multiple
          size="small"
          displayEmpty
          value={selected}
          onChange={(e) => {
            const next = e.target.value;
            onChange({
              kind: 'select',
              values: typeof next === 'string' ? next.split(',') : next,
            });
          }}
          onClick={(e) => e.stopPropagation()}
          sx={{ ...selectSx, flex: 1 }}
          renderValue={(vals) => {
            const list = vals as string[];
            if (list.length === 0) {
              return (
                <Typography
                  component="span"
                  sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                >
                  All
                </Typography>
              );
            }
            if (list.length === 1) {
              return (
                options.find((o) => o.value === list[0])?.label ?? list[0]
              );
            }
            return `${list.length} selected`;
          }}
          MenuProps={{
            PaperProps: { sx: { maxHeight: 280 } },
          }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} dense>
              <Checkbox
                size="small"
                checked={selected.includes(opt.value)}
                sx={{ py: 0, pl: 0, pr: 1 }}
              />
              <ListItemText
                primary={opt.label}
                primaryTypographyProps={{ fontSize: '0.85rem' }}
              />
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
    return <DateFilterControl value={value} onChange={onChange} />;
  }

  const text = value?.kind === 'text' ? value.q : '';
  return (
    <TextField
      size="small"
      placeholder="Search…"
      value={text}
      onChange={(e) => onChange({ kind: 'text', q: e.target.value })}
      onClick={(e) => e.stopPropagation()}
      sx={textFieldSx}
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

export function StatusChip({
  status,
  label,
}: {
  status: string;
  /** Display label from the form status option when available */
  label?: string;
}) {
  const color =
    status === 'completed' || status === 'approved'
      ? 'success'
      : status === 'rejected'
        ? 'error'
        : status === 'in_progress' || status === 'submitted'
          ? 'warning'
          : 'default';
  return (
    <Chip
      size="small"
      label={(label ?? status).replace('_', ' ')}
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
