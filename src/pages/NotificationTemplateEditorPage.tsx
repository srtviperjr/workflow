import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
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
  confirmDiscardUnsaved,
  useUnsavedChangesGuard,
} from '../hooks/useUnsavedChangesGuard';
import {
  clearEditorDraft,
  isEditorDraft,
} from '../utils/editorDrafts';
import {
  BUILTIN_TEMPLATE_TOKENS,
  fieldToken,
} from '../utils/notifications';

export function NotificationTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    isAdmin,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    getNotificationTemplateById,
  } = useApp();
  const navigate = useNavigate();
  const tpl = id ? getNotificationTemplateById(id) : undefined;
  const isDraft = Boolean(id && isEditorDraft('notification-template', id));
  const bodyRef = useRef<RichTextEditorHandle>(null);

  const [name, setName] = useState(tpl?.name ?? '');
  const [description, setDescription] = useState(tpl?.description ?? '');
  const [formId, setFormId] = useState(tpl?.formId ?? '');
  const [subject, setSubject] = useState(tpl?.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(tpl?.bodyHtml ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!tpl) return;
    setName(tpl.name);
    setDescription(tpl.description);
    setFormId(tpl.formId);
    setSubject(tpl.subject);
    setBodyHtml(tpl.bodyHtml);
    setSaved(false);
    setDirty(false);
    setError(null);
  }, [tpl?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const discardUnsaved = useCallback(() => {
    if (!id || !isEditorDraft('notification-template', id)) return;
    clearEditorDraft('notification-template', id);
    deleteNotificationTemplate(id);
  }, [id, deleteNotificationTemplate]);

  const blockLeave = dirty || isDraft;
  const { allowNextNavigation } = useUnsavedChangesGuard({
    when: blockLeave,
    onDiscard: discardUnsaved,
  });

  const form = data.forms.find((f) => f.id === formId);

  if (!isAdmin) {
    return <Navigate to="/requests" replace />;
  }

  if (!tpl) {
    return (
      <Box>
        <Alert severity="error">Notification not found.</Alert>
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

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const save = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formId) {
      setError('Assign this notification to a form');
      return;
    }
    const html = bodyRef.current?.getHTML() ?? bodyHtml;
    updateNotificationTemplate(tpl.id, {
      name: name.trim(),
      description: description.trim(),
      formId,
      subject: subject.trim(),
      bodyHtml: html,
    });
    clearEditorDraft('notification-template', tpl.id);
    setBodyHtml(html);
    setError(null);
    setSaved(true);
    setDirty(false);
  };

  const goBack = () => {
    if (!confirmDiscardUnsaved(blockLeave, discardUnsaved)) return;
    allowNextNavigation();
    navigate('/notification-templates');
  };

  const insertIntoSubject = (token: string) => {
    setSubject((prev) => `${prev}${token}`);
    markDirty();
  };

  const insertIntoBody = (token: string) => {
    bodyRef.current?.insertText(token);
    markDirty();
  };

  return (
    <Box maxWidth={880} mx="auto">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={goBack}
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
          Saved. Add a Notify step on this form&apos;s workflow to send it when
          the flow reaches that step.
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
              markDirty();
            }}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
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
                markDirty();
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
            Dedicated to one form. This is message content only — the workflow
            Notify step chooses when it fires and who receives it.
          </Typography>

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              markDirty();
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
                markDirty();
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
        </Stack>
      </Paper>
    </Box>
  );
}
