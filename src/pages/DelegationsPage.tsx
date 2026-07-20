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
  FormControl,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useApp } from '../context/AppContext';
import type { ApprovalDelegation, DelegationScope } from '../types';
import {
  endDateFromDuration,
  isDelegationActive,
  toDateOnly,
} from '../utils/workflowEngine';

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
  const [mappings, setMappings] = useState<WorkflowMapping[]>([
    { workflowId: '', toUserId: '' },
  ]);
  const [startDate, setStartDate] = useState(toDateOnly());
  const [durationDays, setDurationDays] = useState(7);

  const userName = (id: string) => {
    const u = data.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const workflowName = (id: string) =>
    data.workflows.find((w) => w.id === id)?.name ?? id;

  const visibleDelegations = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return data.delegations ?? [];
    return (data.delegations ?? []).filter(
      (d) =>
        d.fromUserId === currentUser.id || d.toUserId === currentUser.id,
    );
  }, [currentUser, isAdmin, data.delegations]);

  if (!currentUser) {
    return <Typography>Select a user identity to manage delegations.</Typography>;
  }

  const openCreate = () => {
    setEditing(null);
    setFromUserId(currentUser.id);
    setScope('all');
    setToUserId('');
    setMappings([{ workflowId: data.workflows[0]?.id ?? '', toUserId: '' }]);
    setStartDate(toDateOnly());
    setDurationDays(7);
    setOpen(true);
  };

  const openEdit = (d: ApprovalDelegation) => {
    setEditing(d);
    setFromUserId(d.fromUserId);
    setScope(d.scope);
    setToUserId(d.toUserId);
    setMappings(
      d.scope === 'workflows' && d.workflowIds.length > 0
        ? d.workflowIds.map((workflowId) => ({
            workflowId,
            toUserId: d.toUserId,
          }))
        : [{ workflowId: data.workflows[0]?.id ?? '', toUserId: d.toUserId }],
    );
    setStartDate(d.startDate);
    setDurationDays(d.durationDays || 7);
    setOpen(true);
  };

  const endDate = endDateFromDuration(startDate, durationDays);

  const delegateOptions = data.users.filter((u) => u.id !== fromUserId);

  const save = () => {
    if (!fromUserId || durationDays < 1) return;
    const payloadBase = {
      fromUserId,
      startDate,
      endDate,
      durationDays: Math.max(1, Math.floor(durationDays)),
    };

    if (editing) {
      if (scope === 'all') {
        if (!toUserId) return;
        updateDelegation(editing.id, {
          ...payloadBase,
          toUserId,
          scope: 'all',
          workflowIds: [],
        });
      } else {
        const first = mappings.find((m) => m.workflowId && m.toUserId);
        if (!first) return;
        updateDelegation(editing.id, {
          ...payloadBase,
          toUserId: first.toUserId,
          scope: 'workflows',
          workflowIds: [first.workflowId],
        });
      }
      setOpen(false);
      return;
    }

    if (scope === 'all') {
      if (!toUserId) return;
      addDelegation({
        ...payloadBase,
        toUserId,
        scope: 'all',
        workflowIds: [],
      });
    } else {
      const valid = mappings.filter((m) => m.workflowId && m.toUserId);
      if (valid.length === 0) return;
      addDelegations(
        valid.map((m) => ({
          ...payloadBase,
          toUserId: m.toUserId,
          scope: 'workflows' as const,
          workflowIds: [m.workflowId],
        })),
      );
    }
    setOpen(false);
  };

  const canEditRow = (d: ApprovalDelegation) =>
    isAdmin || d.fromUserId === currentUser.id;

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
            Delegations
          </Typography>
          <Typography color="text.secondary">
            Delegate your approvals to another user for a set number of days —
            for all workflows or a different person per workflow
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Delegation
        </Button>
      </Stack>

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
                      <>
                        <Button size="small" onClick={() => openEdit(d)}>
                          Edit
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm('Remove this delegation?'))
                              deleteDelegation(d.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? 'Edit Delegation' : 'New Delegation'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isAdmin && (
              <FormControl fullWidth>
                <InputLabel>Delegating user</InputLabel>
                <Select
                  label="Delegating user"
                  value={fromUserId}
                  onChange={(e) => {
                    setFromUserId(e.target.value);
                    setToUserId('');
                    setMappings((ms) =>
                      ms.map((m) => ({ ...m, toUserId: '' })),
                    );
                  }}
                >
                  {data.users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Coverage</InputLabel>
              <Select
                label="Coverage"
                value={scope}
                onChange={(e) => setScope(e.target.value as DelegationScope)}
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
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Workflow delegates
                </Typography>
                <Stack spacing={1.5}>
                  {mappings.map((m, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControl size="small" fullWidth>
                            <InputLabel>Workflow</InputLabel>
                            <Select
                              label="Workflow"
                              value={m.workflowId}
                              onChange={(e) =>
                                setMappings((ms) =>
                                  ms.map((row, i) =>
                                    i === index
                                      ? { ...row, workflowId: e.target.value }
                                      : row,
                                  ),
                                )
                              }
                            >
                              {data.workflows.map((w) => (
                                <MenuItem key={w.id} value={w.id}>
                                  {w.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {!editing && mappings.length > 1 && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setMappings((ms) =>
                                  ms.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Delegate to</InputLabel>
                          <Select
                            label="Delegate to"
                            value={m.toUserId}
                            onChange={(e) =>
                              setMappings((ms) =>
                                ms.map((row, i) =>
                                  i === index
                                    ? { ...row, toUserId: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          >
                            {delegateOptions.map((u) => (
                              <MenuItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
                {!editing && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{ mt: 1 }}
                    onClick={() =>
                      setMappings((ms) => [
                        ...ms,
                        {
                          workflowId: data.workflows[0]?.id ?? '',
                          toUserId: '',
                        },
                      ])
                    }
                    disabled={data.workflows.length === 0}
                  >
                    Add workflow
                  </Button>
                )}
                {editing && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Editing updates this single workflow mapping. Create a new
                    delegation to add more workflows with different people.
                  </Alert>
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
