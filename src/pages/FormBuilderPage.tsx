import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useApp } from '../context/AppContext';
import { FormRenderer } from '../components/forms/FormRenderer';
import { createId } from '../data/defaults';
import { workflowsAvailableForForm } from '../data/formWorkflowLink';
import type { FieldType, FormField, FormFieldData, FormVisibility } from '../types';
import { FORM_VISIBILITY_LABELS } from '../types';

const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'number',
  'select',
  'date',
  'file',
];

export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isAdmin, updateForm, getFormById } = useApp();
  const navigate = useNavigate();
  const form = id ? getFormById(id) : undefined;

  const [name, setName] = useState(form?.name ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [workflowId, setWorkflowId] = useState<string>(form?.workflowId ?? '');
  const [visibility, setVisibility] = useState<FormVisibility>(
    form?.visibility ?? 'project',
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    form?.fields[0]?.id ?? null,
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<FormFieldData>({});

  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setDescription(form.description);
    setFields(form.fields);
    setWorkflowId(form.workflowId ?? '');
    setVisibility(form.visibility ?? 'project');
    setSelectedFieldId(form.fields[0]?.id ?? null);
    setSaved(false);
    setError(null);
  }, [form?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableWorkflows = form
    ? workflowsAvailableForForm(
        form.id,
        form.workflowId,
        data.forms,
        data.workflows,
      )
    : [];

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  if (!form) {
    return (
      <Box>
        <Alert severity="error">Form not found.</Alert>
        <Button component={RouterLink} to="/forms" sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const addField = (type: FieldType = 'text') => {
    const field: FormField = {
      id: createId('field'),
      label:
        type === 'textarea'
          ? 'New text area'
          : type === 'file'
            ? 'Attachment'
            : 'New field',
      type,
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
      placeholder:
        type === 'file' ? 'Optional supporting document' : undefined,
    };
    setFields((fs) => [...fs, field]);
    setSelectedFieldId(field.id);
    setSaved(false);
  };

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    setFields((fs) =>
      fs.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    );
    setSaved(false);
  };

  const removeField = (fieldId: string) => {
    setFields((fs) => fs.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    setSaved(false);
  };

  const moveField = (fieldId: string, dir: -1 | 1) => {
    setFields((fs) => {
      const idx = fs.findIndex((f) => f.id === fieldId);
      if (idx < 0) return fs;
      const next = idx + dir;
      if (next < 0 || next >= fs.length) return fs;
      const copy = [...fs];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
    setSaved(false);
  };

  const save = () => {
    if (!workflowId) {
      setError('Each form must have its own workflow.');
      return;
    }
    const taken = data.forms.some(
      (f) => f.id !== form.id && f.workflowId === workflowId,
    );
    if (taken) {
      setError(
        'That workflow already belongs to another form. Choose an available workflow.',
      );
      return;
    }
    updateForm(form.id, {
      name: name.trim() || 'Untitled Form',
      description,
      fields,
      workflowId,
      visibility,
    });
    setError(null);
    setSaved(true);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
        mb={2}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/forms')}
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Form Builder
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
          Save Form
        </Button>
      </Stack>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Form saved.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <TextField
          label="Form name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
          fullWidth
        />
        <FormControl fullWidth required>
          <InputLabel>Dedicated Workflow</InputLabel>
          <Select
            label="Dedicated Workflow"
            value={workflowId}
            onChange={(e) => {
              setWorkflowId(e.target.value);
              setSaved(false);
              setError(null);
            }}
          >
            {availableWorkflows.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
                {w.id === form.workflowId ? ' (current)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Submission visibility</InputLabel>
          <Select
            label="Submission visibility"
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value as FormVisibility);
              setSaved(false);
            }}
          >
            {(Object.keys(FORM_VISIBILITY_LABELS) as FormVisibility[]).map(
              (key) => (
                <MenuItem key={key} value={key}>
                  {FORM_VISIBILITY_LABELS[key]}
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>
        Each form must have its own workflow. Visibility controls who can see
        submissions in the register: own only, same company, or same project.
        Approvers who can act on a request always see it. Admins see all.
      </Alert>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
        {/* Field list */}
        <Paper elevation={1} sx={{ p: 2, width: { lg: 280 }, flexShrink: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Fields
          </Typography>
          <Stack spacing={1} mb={2}>
            {fields.map((f, i) => (
              <Paper
                key={f.id}
                variant="outlined"
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  borderColor:
                    selectedFieldId === f.id ? 'primary.main' : 'divider',
                  bgcolor:
                    selectedFieldId === f.id
                      ? 'rgba(226,82,0,0.06)'
                      : 'transparent',
                }}
                onClick={() => setSelectedFieldId(f.id)}
              >
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <DragIndicatorIcon fontSize="small" color="disabled" />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {f.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.type}
                      {f.required ? ' · required' : ''}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(f.id, -1);
                    }}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={i === fields.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(f.id, 1);
                    }}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(f.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => addField('text')}
          >
            Add Field
          </Button>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
            {FIELD_TYPES.map((t) => (
              <Button
                key={t}
                size="small"
                onClick={() => addField(t)}
                sx={{ textTransform: 'capitalize' }}
              >
                + {t}
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* Field properties */}
        <Paper elevation={1} sx={{ p: 2, width: { lg: 300 }, flexShrink: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Field Properties
          </Typography>
          {!selectedField ? (
            <Typography variant="body2" color="text.secondary">
              Select a field to edit its properties.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <TextField
                label="Label"
                fullWidth
                size="small"
                value={selectedField.label}
                onChange={(e) =>
                  updateField(selectedField.id, { label: e.target.value })
                }
              />
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={selectedField.type}
                  onChange={(e) => {
                    const type = e.target.value as FieldType;
                    updateField(selectedField.id, {
                      type,
                      options:
                        type === 'select'
                          ? selectedField.options ?? ['Option 1', 'Option 2']
                          : undefined,
                    });
                  }}
                >
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={
                  selectedField.type === 'file' ? 'Help text' : 'Placeholder'
                }
                fullWidth
                size="small"
                value={selectedField.placeholder ?? ''}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    placeholder: e.target.value,
                  })
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedField.required}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        required: e.target.checked,
                      })
                    }
                  />
                }
                label="Required"
              />
              {selectedField.type === 'select' && (
                <TextField
                  label="Options (one per line)"
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  value={(selectedField.options ?? []).join('\n')}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      options: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              )}
            </Stack>
          )}
        </Paper>

        {/* Live preview */}
        <Paper elevation={1} sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Live Preview
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {fields.length === 0 ? (
            <Typography color="text.secondary">Add fields to preview.</Typography>
          ) : (
            <FormRenderer
              fields={fields}
              values={previewValues}
              onChange={(fid, val) =>
                setPreviewValues((v) => ({ ...v, [fid]: val }))
              }
            />
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
