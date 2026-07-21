import {
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ClearIcon from '@mui/icons-material/Clear';
import { useRef, useState } from 'react';
import type { FormField, FormFieldData, FormFieldValue } from '../../types';
import {
  formatFileSize,
  isFileAttachment,
  MAX_FILE_ATTACHMENT_BYTES,
  readFileAsAttachment,
} from '../../utils/formValues';

interface Props {
  fields: FormField[];
  values: FormFieldData;
  onChange: (id: string, value: FormFieldValue) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

function FileFieldInput({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: FormFieldValue | undefined;
  error?: string;
  disabled?: boolean;
  onChange: (value: FormFieldValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const attachment = isFileAttachment(value) ? value : null;
  const helper = error || localError;

  const onPick = async (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    try {
      const next = await readFileAsAttachment(file);
      onChange(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not attach file');
    }
  };

  return (
    <FormControl fullWidth required={field.required} error={Boolean(helper)} disabled={disabled}>
      <FormLabel sx={{ mb: 0.75, fontWeight: 600 }}>{field.label}</FormLabel>
      <input
        ref={inputRef}
        type="file"
        hidden
        disabled={disabled}
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AttachFileIcon />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {attachment ? 'Replace file' : 'Choose file'}
        </Button>
        {attachment && (
          <>
            <Link
              href={attachment.dataUrl}
              download={attachment.name}
              underline="hover"
              sx={{ fontSize: 14 }}
            >
              {attachment.name}
            </Link>
            <Typography variant="caption" color="text.secondary">
              ({formatFileSize(attachment.size)})
            </Typography>
            {!disabled && (
              <Button
                size="small"
                color="inherit"
                startIcon={<ClearIcon />}
                onClick={() => onChange('')}
              >
                Remove
              </Button>
            )}
          </>
        )}
      </Stack>
      <FormHelperText>
        {helper ||
          field.placeholder ||
          `Optional · max ${Math.round(MAX_FILE_ATTACHMENT_BYTES / 1024)} KB`}
      </FormHelperText>
    </FormControl>
  );
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
        const value = values[field.id];

        if (field.type === 'file') {
          return (
            <Box key={field.id}>
              <FileFieldInput
                field={field}
                value={value}
                error={error}
                disabled={disabled}
                onChange={(v) => onChange(field.id, v)}
              />
            </Box>
          );
        }

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
              value={value ?? ''}
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
                value={value ?? ''}
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
            value={value ?? ''}
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
