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
  Paper,
  Stack,
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

export function NotificationsPage() {
  const {
    data,
    currentUser,
    isAdmin,
    getUserById,
    markNotificationRead,
  } = useApp();
  const [selected, setSelected] = useState<AppNotification | null>(null);

  const rows = useMemo(() => {
    const all = [...(data.notifications ?? [])].sort(
      (a, b) => b.sentAt.localeCompare(a.sentAt),
    );
    if (!currentUser) return [];
    if (isAdmin) return all;
    return all.filter((n) => n.toUserIds.includes(currentUser.id));
  }, [data.notifications, currentUser, isAdmin]);

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

  return (
    <Box>
      <Stack mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Notifications
        </Typography>
        <Typography color="text.secondary">
          In-app messages created by workflow Notify steps. These are not sent
          as email — open them here to review.
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <Alert severity="info">
          No notifications yet. Add a <strong>Notify</strong> step in a workflow
          to create messages for selected roles when requests reach that step.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((n) => {
                const unread = isUnread(n);
                return (
                  <TableRow
                    key={n.id}
                    hover
                    onClick={() => openNotification(n)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: unread ? 'rgba(13,115,119,0.06)' : undefined,
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        display="block"
                        sx={{ maxWidth: 360 }}
                      >
                        {n.body}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
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
                        {(n.toUserNames?.length ?? n.toUserIds.length) === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No recipients
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        component={RouterLink}
                        to={`/register/${n.submissionId}`}
                        variant="body2"
                        fontWeight={600}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ color: 'primary.main', textDecoration: 'none' }}
                      >
                        {n.submissionId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {unread ? (
                        <Chip size="small" color="primary" label="Unread" />
                      ) : (
                        <Chip size="small" label="Read" variant="outlined" />
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
                {new Date(selected.sentAt).toLocaleString()} · {selected.nodeLabel}
              </Typography>
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
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
              >
                {selected.body}
              </Typography>
              <Button
                component={RouterLink}
                to={`/register/${selected.submissionId}`}
                size="small"
                onClick={() => setSelected(null)}
              >
                Open related request
              </Button>
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
