import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { AppNotification } from '../types';
import { canViewSubmission } from '../utils/submissionVisibility';
import { plainTextFromHtml } from '../utils/htmlText';

export function NotificationsPage() {
  const {
    data,
    currentUser,
    isAdmin,
    getUserById,
    getFormById,
    markNotificationRead,
  } = useApp();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  /** Admins default to their own inbox; optional override to audit all. */
  const [showAll, setShowAll] = useState(false);

  const viewOpts = {
    roles: data.roles,
    workflows: data.workflows,
    includeActionable: true as const,
    delegations: data.delegations ?? [],
    notifications: data.notifications ?? [],
  };

  const canOpenRequest = (submissionId: string) => {
    const submission = data.submissions.find((s) => s.id === submissionId);
    if (!submission || !currentUser) return false;
    return canViewSubmission(
      currentUser,
      submission,
      getFormById(submission.formId),
      data.users,
      viewOpts,
    );
  };

  const rows = useMemo(() => {
    const all = [...(data.notifications ?? [])].sort(
      (a, b) => b.sentAt.localeCompare(a.sentAt),
    );
    if (!currentUser) return [];
    if (isAdmin && showAll) return all;
    return all.filter((n) => n.toUserIds.includes(currentUser.id));
  }, [data.notifications, currentUser, isAdmin, showAll]);

  const openNotification = (n: AppNotification) => {
    setSelected(n);
    if (currentUser && n.toUserIds.includes(currentUser.id)) {
      markNotificationRead(n.id, currentUser.id);
    }
  };

  if (!currentUser) {
    return <Typography>Select a user identity to view notifications.</Typography>;
  }

  const isUnread = (n: AppNotification) =>
    n.toUserIds.includes(currentUser.id) &&
    !(n.readByUserIds ?? []).includes(currentUser.id);

  const viewingOthers = isAdmin && showAll;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'flex-start' }}
        spacing={1.5}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Notifications
          </Typography>
          <Typography color="text.secondary">
            In-app messages created by workflow Notify steps. Design templates
            under Administration → Notifications. Messages are not sent as email
            — open them here to review.
          </Typography>
        </Box>
        {isAdmin && (
          <FormControlLabel
            control={
              <Switch
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                color="primary"
              />
            }
            label="Show all (admin)"
            sx={{ flexShrink: 0 }}
          />
        )}
      </Stack>

      {viewingOthers && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing every notification in the system. Turn off{' '}
          <strong>Show all (admin)</strong> to see only messages addressed to
          you.
        </Alert>
      )}

      {rows.length === 0 ? (
        <Alert severity="info">
          {viewingOthers
            ? 'No notifications have been created yet.'
            : 'No notifications for you yet. Add a Notify step in a workflow (and assign a notification template) to create messages when requests reach that step.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Subject</TableCell>
                {viewingOthers && <TableCell>Recipients</TableCell>}
                <TableCell>Request</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((n) => {
                const unread = isUnread(n);
                const preview = plainTextFromHtml(n.body);
                return (
                  <TableRow
                    key={n.id}
                    hover
                    onClick={() => openNotification(n)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: unread ? 'rgba(226,82,0,0.06)' : undefined,
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={unread ? 700 : 400}
                      >
                        {new Date(n.sentAt).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.nodeLabel}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={unread ? 700 : 600}
                      >
                        {n.subject}
                      </Typography>
                      {preview && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          display="block"
                          sx={{ maxWidth: 360 }}
                        >
                          {preview}
                        </Typography>
                      )}
                    </TableCell>
                    {viewingOthers && (
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {(n.toUserNames?.length
                            ? n.toUserNames
                            : n.toUserIds.map((id) => {
                                const u = getUserById(id);
                                return u
                                  ? `${u.firstName} ${u.lastName}`
                                  : id;
                              })
                          ).map((name) => (
                            <Chip key={name} size="small" label={name} />
                          ))}
                          {(n.toUserNames?.length ?? n.toUserIds.length) ===
                            0 && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              No recipients
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell>
                      {!n.submissionId ? (
                        <Typography variant="body2" color="text.secondary">
                          Multiple
                        </Typography>
                      ) : canOpenRequest(n.submissionId) ? (
                        <Typography
                          component={RouterLink}
                          to={`/register/${n.submissionId}`}
                          variant="body2"
                          fontWeight={600}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                          }}
                        >
                          {n.submissionId}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {n.submissionId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {n.toUserIds.includes(currentUser.id) ? (
                        unread ? (
                          <Chip size="small" color="primary" label="Unread" />
                        ) : (
                          <Chip size="small" label="Read" variant="outlined" />
                        )
                      ) : (
                        <Chip
                          size="small"
                          label="Other recipient"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{selected?.subject}</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(selected.sentAt).toLocaleString()} ·{' '}
                {selected.nodeLabel}
              </Typography>
              {viewingOthers && (
                <Typography variant="body2" color="text.secondary">
                  To:{' '}
                  {(selected.toUserNames?.length
                    ? selected.toUserNames
                    : selected.toUserIds.map((id) => {
                        const u = getUserById(id);
                        return u ? `${u.firstName} ${u.lastName}` : id;
                      })
                  ).join(', ') || 'No recipients'}
                </Typography>
              )}
              <Typography
                variant="body1"
                component="div"
                sx={{
                  lineHeight: 1.6,
                  whiteSpace: /<[a-z][\s\S]*>/i.test(selected.body)
                    ? 'normal'
                    : 'pre-wrap',
                  '& p': { m: 0, mb: 1 },
                  '& ul, & ol': { pl: 2.5, m: 0, mb: 1 },
                  '& a': {
                    color: 'primary.main',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  },
                }}
                {...(/<[a-z][\s\S]*>/i.test(selected.body)
                  ? { dangerouslySetInnerHTML: { __html: selected.body } }
                  : { children: selected.body })}
              />
              {selected.submissionId ? (
                canOpenRequest(selected.submissionId) ? (
                  <Button
                    component={RouterLink}
                    to={`/register/${selected.submissionId}`}
                    size="small"
                    onClick={() => setSelected(null)}
                  >
                    Open related request
                  </Button>
                ) : (
                  <Alert severity="info">
                    You no longer have access to open this request under the
                    form&apos;s visibility rules.
                  </Alert>
                )
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Use the request links above to open each item.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
