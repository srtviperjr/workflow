import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid2 as Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useApp } from '../context/AppContext';

/** Admin catalog of form-dedicated notification templates. */
export function NotificationTemplatesPage() {
  const {
    data,
    isAdmin,
    addNotificationTemplate,
    deleteNotificationTemplate,
  } = useApp();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/requests" replace />;
  }

  const templates = [...(data.notificationTemplates ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const createTemplate = () => {
    const formId = data.forms[0]?.id;
    if (!formId) return;
    const tpl = addNotificationTemplate({
      name: 'New notification',
      formId,
      description: '',
      subject: 'Update on {{formName}}',
      bodyHtml:
        '<p>Hello,</p><p>A request was updated.</p><p>Form: {{formName}}<br>Request: {{requestId}}</p>',
      roleIds: [],
      notifySubmitter: true,
    });
    navigate(`/notification-templates/${tpl.id}/edit`);
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Notifications
          </Typography>
          <Typography color="text.secondary">
            Design message templates for each form. Workflow Notify steps pick
            from templates assigned to the same form.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createTemplate}
          disabled={data.forms.length === 0}
        >
          Create Notification
        </Button>
      </Stack>

      {data.forms.length === 0 ? (
        <Typography color="text.secondary">
          Create a form first, then add notification templates for it.
        </Typography>
      ) : templates.length === 0 ? (
        <Typography color="text.secondary">
          No notification templates yet. Create one to use in workflow design.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {templates.map((t) => {
            const form = data.forms.find((f) => f.id === t.formId);
            const roleNames = t.roleIds
              .map((id) => data.roles.find((r) => r.id === id)?.name)
              .filter(Boolean);
            return (
              <Grid key={t.id} size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <NotificationsNoneIcon color="action" fontSize="small" />
                        <Typography variant="h6" fontWeight={700}>
                          {t.name}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={form?.name ?? 'Unknown form'}
                        color={form ? 'default' : 'error'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {t.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Subject: {t.subject || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recipients:{' '}
                      {[
                        ...roleNames,
                        t.notifySubmitter ? 'submitter' : null,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'None'}
                    </Typography>
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
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete template"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete notification “${t.name}”? Workflow steps using it will need a new template.`,
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
