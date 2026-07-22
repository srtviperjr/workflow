import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useApp } from '../context/AppContext';
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from '../components/notifications/RichTextEditor';
import {
  BUILTIN_TEMPLATE_TOKENS,
  fieldToken,
} from '../utils/notifications';
import { rolesForForm } from '../utils/workflowEngine';

export function NotificationTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    isAdmin,
    updateNotificationTemplate,
    getNotificationTemplateById,
  } = useApp();
  const navigate = useNavigate();
  const tpl = id ? getNotificationTemplateById(id) : undefined;
  const bodyRef = useRef<RichTextEditorHandle>(null);

  const [name, setName] = useState(tpl?.name ?? '');
  const [description, setDescription] = useState(tpl?.description ?? '');
  const [formId, setFormId] = useState(tpl?.formId ?? '');
  const [subject, setSubject] = useState(tpl?.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(tpl?.bodyHtml ?? '');
  const [roleIds, setRoleIds] = useState<string[]>(tpl?.roleIds ?? []);
  const [notifySubmitter, setNotifySubmitter] = useState(
    Boolean(tpl?.notifySubmitter),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tpl) return;
    setName(tpl.name);
    setDescription(tpl.description);
    setFormId(tpl.formId);
    setSubject(tpl.subject);
    setBodyHtml(tpl.bodyHtml);
    setRoleIds(tpl.roleIds);
    setNotifySubmitter(tpl.notifySubmitter);
    setSaved(false);
    setError(null);
  }, [tpl?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = data.forms.find((f) => f.id === formId);
  const availableRoles = useMemo(
    () => (formId ? rolesForForm(data.roles, formId) : data.roles),
    [data.roles, formId],
  );

  if (!isAdmin) {
    return <Navigate to="/requests" replace />;
  }

  if (!tpl) {
    return (
      <Box>
        <Alert severity="error">Notification template not found.</Alert>
        <Button
          component={RouterLink}
          to="/notification-templates"
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const save = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formId) {
      setError('Assign this template to a form');
      return;
    }
    updateNotificationTemplate(tpl.id, {
      name: name.trim(),
      description: description.trim(),
      formId,
      subject: subject.trim(),
      bodyHtml,
      roleIds,
      notifySubmitter,
    });
    setError(null);
    setSaved(true);
  };

  const insertIntoSubject = (token: string) => {
    setSubject((prev) => `${prev}${token}`);
  };

  const insertIntoBody = (token: string) => {
    bodyRef.current?.insertText(token);
  };

  return (
    <Box maxWidth={880} mx="auto">
      <Button
        startIcon={<ArrowBackIcon />}
        component={RouterLink}
        to="/notification-templates"
        sx={{ mb: 2 }}
      >
        Back to notifications
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Edit notification
        </Typography>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
          Save
        </Button>
      </Stack>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Saved. Workflow Notify steps for this form can select this template.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            fullWidth
            multiline
            minRows={2}
          />
          <FormControl fullWidth required>
            <InputLabel>Form</InputLabel>
            <Select
              label="Form"
              value={formId}
              onChange={(e) => {
                setFormId(e.target.value);
                setRoleIds([]);
                setSaved(false);
              }}
            >
              {data.forms.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Templates are dedicated to one form. Workflows for other forms
            cannot select this template.
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Notify roles</InputLabel>
            <Select
              multiple
              label="Notify roles"
              value={roleIds}
              onChange={(e) => {
                const value = e.target.value;
                setRoleIds(
                  typeof value === 'string' ? value.split(',') : value,
                );
                setSaved(false);
              }}
              renderValue={(selected) =>
                (selected as string[])
                  .map((rid) => data.roles.find((r) => r.id === rid)?.name ?? rid)
                  .join(', ')
              }
            >
              {availableRoles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                  {r.scope === 'form' ? ' (form)' : ' (app)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={notifySubmitter}
                onChange={(e) => {
                  setNotifySubmitter(e.target.checked);
                  setSaved(false);
                }}
              />
            }
            label="Also notify the request submitter"
          />

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSaved(false);
            }}
            fullWidth
            helperText="Plain text. Use {{tokens}} for dynamic values."
          />
          <Box>
            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
              Insert into subject
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {BUILTIN_TEMPLATE_TOKENS.map((t) => (
                <Chip
                  key={`sub-${t.token}`}
                  size="small"
                  label={t.label}
                  onClick={() => insertIntoSubject(t.token)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              {(form?.fields ?? []).map((f) => (
                <Chip
                  key={`sub-f-${f.id}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={f.label}
                  onClick={() => insertIntoSubject(fieldToken(f))}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Message
            </Typography>
            <RichTextEditor
              ref={bodyRef}
              value={bodyHtml}
              onChange={(html) => {
                setBodyHtml(html);
                setSaved(false);
              }}
            />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
              Insert into message
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {BUILTIN_TEMPLATE_TOKENS.map((t) => (
                <Chip
                  key={`body-${t.token}`}
                  size="small"
                  label={t.label}
                  onClick={() => insertIntoBody(t.token)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              {(form?.fields ?? []).map((f) => (
                <Chip
                  key={`body-f-${f.id}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={f.label}
                  onClick={() => insertIntoBody(fieldToken(f))}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
            {!form && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Select a form to insert its field tokens.
              </Typography>
            )}
          </Box>

          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => navigate('/notification-templates')}
            >
              Done
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
