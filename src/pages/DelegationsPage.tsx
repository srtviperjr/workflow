import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import type { ApprovalDelegation, DelegationScope } from '../types';
import {
  endDateFromDuration,
  findConflictingDelegations,
  isDelegationActive,
  toDateOnly,
  workflowsAccessibleToUser,
} from '../utils/workflowEngine';
import { listCoveredActionableSubmissions } from '../utils/delegationHandoff';

interface WorkflowMapping {
  workflowId: string;
  toUserId: string;
}

export function DelegationsPage() {
  const {
    data,
    currentUser,
    isAdmin,
    addDelegation,
    addDelegations,
    updateDelegation,
    deleteDelegation,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalDelegation | null>(null);
  const [fromUserId, setFromUserId] = useState('');
  const [scope, setScope] = useState<DelegationScope>('all');
  const [toUserId, setToUserId] = useState('');
  const [mappings, setMappings] = useState<WorkflowMapping[]>([]);
  const [startDate, setStartDate] = useState(toDateOnly());
  const [durationDays, setDurationDays] = useState(7);
  const [notifyDelegateOnStart, setNotifyDelegateOnStart] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const userName = (id: string) => {
    const u = data.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const workflowName = (id: string) =>
    data.workflows.find((w) => w.id === id)?.name ?? id;

  const fromUser = useMemo(
    () => data.users.find((u) => u.id === fromUserId) ?? null,
    [data.users, fromUserId],
  );

  const accessibleWorkflows = useMemo(() => {
    if (!fromUser) return [];
    return workflowsAccessibleToUser(fromUser, data.workflows, data.roles);
  }, [fromUser, data.workflows, data.roles]);

  const visibleDelegations = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return data.delegations ?? [];
    // Non-admins: own outbound delegations, plus inbound ones they receive
    return (data.delegations ?? []).filter(
      (d) =>
        d.fromUserId === currentUser.id || d.toUserId === currentUser.id,
    );
  }, [currentUser, isAdmin, data.delegations]);

  const endDate = endDateFromDuration(startDate, durationDays);

  /** Preview of in-progress items that would be handed to the chosen delegate(s). */
  const inProgressPreview = useMemo(() => {
    const ownerId = isAdmin ? fromUserId : currentUser?.id;
    if (!ownerId) {
      return { count: 0, byDelegate: [] as { toUserId: string; count: number }[] };
    }

    if (scope === 'all') {
      if (!toUserId) return { count: 0, byDelegate: [] };
      const draft = {
        fromUserId: ownerId,
        toUserId,
        scope: 'all' as const,
        workflowIds: [] as string[],
      };
      const items = listCoveredActionableSubmissions(draft, data);
      return {
        count: items.length,
        byDelegate: [{ toUserId, count: items.length }],
      };
    }

    const selected = mappings.filter((m) => m.workflowId && m.toUserId);
    const byDelegate = new Map<string, string[]>();
    for (const m of selected) {
      const list = byDelegate.get(m.toUserId) ?? [];
      list.push(m.workflowId);
      byDelegate.set(m.toUserId, list);
    }
    const rows = [...byDelegate.entries()].map(([uid, workflowIds]) => {
      const items = listCoveredActionableSubmissions(
        {
          fromUserId: ownerId,
          scope: 'workflows',
          workflowIds,
        },
        data,
      );
      return { toUserId: uid, count: items.length };
    });
    return {
      count: rows.reduce((sum, r) => sum + r.count, 0),
      byDelegate: rows,
    };
  }, [
    isAdmin,
    fromUserId,
    currentUser?.id,
    scope,
    toUserId,
    mappings,
    data,
  ]);

  const buildMappingsForUser = (
    userId: string,
    prefill?: Record<string, string>,
  ): WorkflowMapping[] => {
    const user = data.users.find((u) => u.id === userId);
    if (!user) return [];
    return workflowsAccessibleToUser(user, data.workflows, data.roles).map(
      (wf) => ({
        workflowId: wf.id,
        toUserId: prefill?.[wf.id] ?? '',
      }),
    );
  };

  if (!currentUser) {
    return <Typography>Select a user identity to manage delegations.</Typography>;
  }

  /** Non-admins may only create/edit as themselves; admins may pick any from-user. */
  const resolvedFromUserId = (requested: string) =>
    isAdmin ? requested : currentUser.id;

  const openCreate = () => {
    setEditing(null);
    setFromUserId(currentUser.id);
    setScope('all');
    setToUserId('');
    setMappings(buildMappingsForUser(currentUser.id));
    setStartDate(toDateOnly());
    setDurationDays(7);
    setNotifyDelegateOnStart(true);
    setSaveError(null);
    setOpen(true);
  };

  const openEdit = (d: ApprovalDelegation) => {
    if (!isAdmin && d.fromUserId !== currentUser.id) return;
    const ownerId = resolvedFromUserId(d.fromUserId);
    setEditing(d);
    setFromUserId(ownerId);
    setScope(d.scope);
    setToUserId(d.toUserId);
    if (d.scope === 'workflows') {
      const prefill: Record<string, string> = {};
      for (const wid of d.workflowIds) {
        prefill[wid] = d.toUserId;
      }
      setMappings(buildMappingsForUser(ownerId, prefill));
    } else {
      setMappings(buildMappingsForUser(ownerId));
    }
    setStartDate(d.startDate);
    setDurationDays(d.durationDays || 7);
    setNotifyDelegateOnStart(Boolean(d.notifyDelegateOnStart));
    setSaveError(null);
    setOpen(true);
  };

  const delegateOptions = data.users.filter((u) => u.id !== fromUserId);

  const setMappingDelegate = (workflowId: string, nextToUserId: string) => {
    setMappings((ms) =>
      ms.map((row) =>
        row.workflowId === workflowId
          ? { ...row, toUserId: nextToUserId }
          : row,
      ),
    );
  };

  const save = () => {
    const ownerId = resolvedFromUserId(fromUserId);
    if (!ownerId || durationDays < 1) return;
    if (editing && !isAdmin && editing.fromUserId !== currentUser.id) return;
    setSaveError(null);

    const payloadBase = {
      fromUserId: ownerId,
      startDate,
      endDate,
      durationDays: Math.max(1, Math.floor(durationDays)),
    };

    const groupByDelegate = (rows: WorkflowMapping[]) => {
      const byDelegate = new Map<string, string[]>();
      for (const m of rows) {
        const list = byDelegate.get(m.toUserId) ?? [];
        list.push(m.workflowId);
        byDelegate.set(m.toUserId, list);
      }
      return [...byDelegate.entries()].map(([uid, workflowIds]) => ({
        ...payloadBase,
        toUserId: uid,
        scope: 'workflows' as const,
        workflowIds,
      }));
    };

    const proposed: Array<
      Pick<
        ApprovalDelegation,
        | 'fromUserId'
        | 'toUserId'
        | 'scope'
        | 'workflowIds'
        | 'startDate'
        | 'endDate'
        | 'durationDays'
      >
    > =
      scope === 'all'
        ? toUserId
          ? [
              {
                ...payloadBase,
                toUserId,
                scope: 'all',
                workflowIds: [],
              },
            ]
          : []
        : groupByDelegate(
            mappings.filter((m) => m.workflowId && m.toUserId),
          );

    if (proposed.length === 0) return;

    const excludeIds = editing ? [editing.id] : [];
    const existing = data.delegations ?? [];

    for (const p of proposed) {
      const conflicts = findConflictingDelegations(p, existing, excludeIds);
      if (conflicts.length > 0) {
        const c = conflicts[0];
        const coverage =
          c.scope === 'all'
            ? 'all workflows'
            : c.workflowIds.map(workflowName).join(', ');
        setSaveError(
          `Overlapping delegation already exists for ${userName(ownerId)} ` +
            `(${c.startDate} → ${c.endDate}, ${coverage}). ` +
            `Adjust the dates or coverage so grants for the same user do not overlap.`,
        );
        return;
      }
    }

    // Also block overlaps within a multi-delegate batch (shouldn't happen
    // with disjoint workflow ids, but guard date+scope collisions).
    for (let i = 0; i < proposed.length; i++) {
      for (let j = i + 1; j < proposed.length; j++) {
        const conflicts = findConflictingDelegations(proposed[i], [
          {
            id: `batch-${j}`,
            ...proposed[j],
            durationDays: payloadBase.durationDays,
            createdAt: '',
          },
        ]);
        if (conflicts.length > 0) {
          setSaveError(
            'This save would create overlapping coverage for the same user. ' +
              'Use separate date ranges or non-overlapping workflows.',
          );
          return;
        }
      }
    }

    if (editing) {
      if (scope === 'all') {
        updateDelegation(editing.id, {
          ...proposed[0],
          notifyDelegateOnStart,
        });
      } else {
        const [first, ...rest] = proposed;
        updateDelegation(editing.id, {
          ...first,
          notifyDelegateOnStart,
        });
        if (rest.length > 0) {
          addDelegations(
            rest.map((r) => ({
              ...r,
              notifyDelegateOnStart,
            })),
          );
        }
      }
      setOpen(false);
      return;
    }

    if (scope === 'all') {
      addDelegation({
        ...proposed[0],
        notifyDelegateOnStart,
      });
    } else {
      addDelegations(
        proposed.map((r) => ({
          ...r,
          notifyDelegateOnStart,
        })),
      );
    }
    setOpen(false);
  };

  const canEditRow = (d: ApprovalDelegation) =>
    isAdmin || d.fromUserId === currentUser.id;

  const canDeleteRow = (d: ApprovalDelegation) =>
    isAdmin || d.fromUserId === currentUser.id;

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Delegations
        </Typography>
        <Typography color="text.secondary" mb={2}>
          Grant your approval permissions to another user for a set number of
          days. Their existing permissions are kept — yours are added for the
          duration only. You can notify them of in-progress work when a
          delegation starts; when it ends you are notified of unfinished
          requests. A user cannot have overlapping delegations for the same
          coverage and dates.
          {!isAdmin &&
            ' You can only create and manage delegations for yourself.'}
          {isAdmin &&
            ' As an admin you can create and manage delegations for any user.'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Delegation
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>Delegate</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleDelegations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">
                    No delegations yet. Create one to cover absences.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleDelegations.map((d) => {
              const active = isDelegationActive(d);
              return (
                <TableRow key={d.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {userName(d.fromUserId)}
                    </Typography>
                  </TableCell>
                  <TableCell>{userName(d.toUserId)}</TableCell>
                  <TableCell>
                    {d.scope === 'all' ? (
                      <Chip size="small" label="All workflows" color="primary" />
                    ) : (
                      <Stack spacing={0.5}>
                        <Chip size="small" label="Per workflow" color="secondary" />
                        <Typography variant="caption" color="text.secondary">
                          {d.workflowIds.map(workflowName).join(', ') || '—'}
                        </Typography>
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {d.durationDays} day{d.durationDays === 1 ? '' : 's'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.startDate} → {d.endDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={active ? 'Active' : 'Inactive'}
                      color={active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canEditRow(d) && (
                      <Button size="small" onClick={() => openEdit(d)}>
                        Edit
                      </Button>
                    )}
                    {canDeleteRow(d) && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (
                            confirm(
                              'End this delegation now? You will be notified of any covered requests that are still in progress.',
                            )
                          )
                            deleteDelegation(d.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? 'Edit Delegation' : 'New Delegation'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isAdmin ? (
              <FormControl fullWidth>
                <InputLabel>Delegating user</InputLabel>
                <Select
                  label="Delegating user"
                  value={fromUserId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFromUserId(next);
                    setToUserId('');
                    setMappings(buildMappingsForUser(next));
                  }}
                >
                  {data.users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="info">
                Delegating as {currentUser.firstName} {currentUser.lastName}.
                Only admins can create delegations on behalf of other users.
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Coverage</InputLabel>
              <Select
                label="Coverage"
                value={scope}
                onChange={(e) => {
                  const next = e.target.value as DelegationScope;
                  setScope(next);
                  if (next === 'workflows' && fromUserId) {
                    setMappings(buildMappingsForUser(fromUserId));
                  }
                }}
                disabled={Boolean(editing)}
              >
                <MenuItem value="all">All workflows (one delegate)</MenuItem>
                <MenuItem value="workflows">
                  Different user per workflow
                </MenuItem>
              </Select>
            </FormControl>

            {scope === 'all' ? (
              <FormControl fullWidth required>
                <InputLabel>Delegate to</InputLabel>
                <Select
                  label="Delegate to"
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                >
                  {delegateOptions.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.company})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
                  Workflow delegates
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  All workflows you can act on are listed. Choose a delegate for
                  each one you want to cover (leave blank to skip).
                </Typography>
                {accessibleWorkflows.length === 0 ? (
                  <Alert severity="warning">
                    This user has no workflows they can act on, so there is
                    nothing to delegate.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {mappings.map((m) => {
                      const wf = data.workflows.find(
                        (w) => w.id === m.workflowId,
                      );
                      return (
                        <Stack
                          key={m.workflowId}
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems={{ sm: 'center' }}
                          sx={{
                            py: 1,
                            px: 1.5,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} noWrap>
                              {wf?.name ?? m.workflowId}
                            </Typography>
                            {wf?.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                display="block"
                              >
                                {wf.description}
                              </Typography>
                            )}
                          </Box>
                          <FormControl
                            size="small"
                            sx={{ minWidth: { xs: '100%', sm: 240 } }}
                          >
                            <InputLabel>Delegate to</InputLabel>
                            <Select
                              label="Delegate to"
                              value={m.toUserId}
                              onChange={(e) =>
                                setMappingDelegate(
                                  m.workflowId,
                                  e.target.value,
                                )
                              }
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {delegateOptions.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                  {u.firstName} {u.lastName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <TextField
                label="Duration (days)"
                type="number"
                fullWidth
                inputProps={{ min: 1, step: 1 }}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(Math.max(1, Number(e.target.value) || 1))
                }
                helperText={`Ends ${endDate} (inclusive)`}
              />
            </Stack>

            {inProgressPreview.count > 0 ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notifyDelegateOnStart}
                    onChange={(e) =>
                      setNotifyDelegateOnStart(e.target.checked)
                    }
                  />
                }
                label={
                  scope === 'all' && toUserId
                    ? `Notify ${userName(toUserId)} of ${inProgressPreview.count} in-progress request${inProgressPreview.count === 1 ? '' : 's'} currently awaiting action`
                    : `Notify delegate(s) of ${inProgressPreview.count} in-progress request${inProgressPreview.count === 1 ? '' : 's'} currently awaiting action`
                }
              />
            ) : (
              <Alert severity="info">
                No in-progress requests currently await action for the covered
                workflows, so there is nothing to hand off at the start.
              </Alert>
            )}

            <Alert severity="info">
              During the active dates, each selected delegate gains your
              approval permissions for the covered workflows in addition to
              their own. When the delegation ends, you are notified of any
              covered requests that are still in progress so you can continue
              them. Overlapping date ranges for the same user and covered
              workflows are not allowed.
            </Alert>

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
