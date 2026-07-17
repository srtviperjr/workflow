import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { FormField } from '../../types';

interface Props {
  fields: FormField[];
  values: Record<string, string | number>;
  onChange: (id: string, value: string | number) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function FormRenderer({
  fields,
  values,
  onChange,
  errors = {},
  disabled,
}: Props) {
  return (
    <Stack spacing={2.5}>
      {fields.map((field) => {
        const error = errors[field.id];
        const value = values[field.id] ?? '';

        if (field.type === 'textarea') {
          return (
            <TextField
              key={field.id}
              label={field.label}
              required={field.required}
              multiline
              minRows={3}
              fullWidth
              disabled={disabled}
              placeholder={field.placeholder}
              value={value}
              error={Boolean(error)}
              helperText={error}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          );
        }

        if (field.type === 'select') {
          return (
            <FormControl
              key={field.id}
              fullWidth
              required={field.required}
              error={Boolean(error)}
              disabled={disabled}
            >
              <InputLabel>{field.label}</InputLabel>
              <Select
                label={field.label}
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              >
                {(field.options ?? []).map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
              {error && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
          );
        }

        return (
          <TextField
            key={field.id}
            label={field.label}
            required={field.required}
            type={
              field.type === 'number'
                ? 'number'
                : field.type === 'date'
                  ? 'date'
                  : 'text'
            }
            fullWidth
            disabled={disabled}
            placeholder={field.placeholder}
            value={value}
            error={Boolean(error)}
            helperText={error}
            InputLabelProps={
              field.type === 'date' ? { shrink: true } : undefined
            }
            onChange={(e) =>
              onChange(
                field.id,
                field.type === 'number'
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        );
      })}
    </Stack>
  );
}

export function FieldTypeChip({ type }: { type: FormField['type'] }) {
  return (
    <Chip
      size="small"
      label={type}
      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
    />
  );
}

export function EmptyFieldsHint() {
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
      No fields yet. Add fields using the panel on the left.
    </Box>
  );
}
