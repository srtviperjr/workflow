import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  Grid2 as Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useApp } from '../context/AppContext';
import { markEditorDraft } from '../utils/editorDrafts';

const FORM_FILTER_KEY = 'jansen-notification-form-filter';

function readStoredFormFilter(formIds: string[]): string {
  try {
    const stored = sessionStorage.getItem(FORM_FILTER_KEY);
    if (stored && formIds.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return formIds[0] ?? '';
}

/** Admin catalog of form-dedicated notifications (message content). */
export function NotificationTemplatesPage() {
  const {
    data,
    isAdmin,
    addNotificationTemplate,
    deleteNotificationTemplate,
    duplicateNotificationTemplate,
  } = useApp();
  const navigate = useNavigate();

  const forms = useMemo(
    () => [...data.forms].sort((a, b) => a.name.localeCompare(b.name)),
    [data.forms],
  );
  const formIds = useMemo(() => forms.map((f) => f.id), [forms]);

  const [formFilter, setFormFilter] = useState(() =>
    readStoredFormFilter(formIds),
  );

  // Keep filter valid when forms change (e.g. after delete / seed)
  const activeFormId =
    formFilter && formIds.includes(formFilter)
      ? formFilter
      : (formIds[0] ?? '');

  if (!isAdmin) {
    return <Navigate to="/requests" replace />;
  }

  const templates = [...(data.notificationTemplates ?? [])]
    .filter((t) => !activeFormId || t.formId === activeFormId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedForm = forms.find((f) => f.id === activeFormId);

  const setFilter = (formId: string) => {
    setFormFilter(formId);
    try {
      sessionStorage.setItem(FORM_FILTER_KEY, formId);
    } catch {
      /* ignore */
    }
  };

  const createTemplate = () => {
    if (!activeFormId) return;
    let tplId = '';
    flushSync(() => {
      const tpl = addNotificationTemplate({
        name: 'New notification',
        formId: activeFormId,
        description: '',
        subject: 'Update on {{formName}}',
        bodyHtml:
          '<p>Hello,</p><p>A request was updated.</p><p>Form: {{formName}}<br>Request: {{requestId}}</p>',
      });
      tplId = tpl.id;
      markEditorDraft('notification-template', tpl.id);
    });
    navigate(`/notification-templates/${tplId}/edit`);
  };

  const copyTemplate = (id: string) => {
    let tplId = '';
    flushSync(() => {
      const copy = duplicateNotificationTemplate(id);
      if (copy) {
        tplId = copy.id;
        markEditorDraft('notification-template', copy.id);
      }
    });
    if (tplId) navigate(`/notification-templates/${tplId}/edit`);
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Notifications
        </Typography>
        <Typography color="text.secondary" mb={2}>
          Create message content for a form, then place Notify steps in that
          form&apos;s workflow. Notifications send when the workflow reaches
          them — no separate type is required.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createTemplate}
          disabled={!activeFormId}
          sx={{ mb: 2 }}
        >
          Create Notification
        </Button>
        {forms.length > 0 && (
          <FormControl sx={{ display: 'block', maxWidth: 320 }} size="small">
            <InputLabel>Form</InputLabel>
            <Select
              label="Form"
              value={activeFormId}
              onChange={(e) => setFilter(e.target.value)}
              fullWidth
            >
              {forms.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {forms.length === 0 ? (
        <Typography color="text.secondary">
          Create a form first, then add its notifications, then design the
          workflow that sends them.
        </Typography>
      ) : templates.length === 0 ? (
        <Typography color="text.secondary">
          No notifications for {selectedForm?.name ?? 'this form'} yet. Create
          one, then wire it into the workflow with a Notify step.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {templates.map((t) => {
            const form = data.forms.find((f) => f.id === t.formId);
            return (
              <Grid key={t.id} size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <NotificationsNoneIcon color="action" fontSize="small" />
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ flex: 1, minWidth: 0 }}
                        noWrap
                      >
                        {t.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{ maxWidth: '45%' }}
                      >
                        {form?.name ?? 'Unknown form'}
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      component={RouterLink}
                      to={`/notification-templates/${t.id}/edit`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyTemplate(t.id)}
                    >
                      Copy
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete notification"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete notification “${t.name}”? Workflow steps using it will need a new notification.`,
                          )
                        ) {
                          deleteNotificationTemplate(t.id);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
