import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  FormControl,
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
import { useApp } from '../context/AppContext';
import type { SubmissionStatus } from '../types';

const statusColor: Record<
  SubmissionStatus,
  'default' | 'warning' | 'success' | 'error' | 'info'
> = {
  draft: 'default',
  in_progress: 'warning',
  completed: 'success',
  rejected: 'error',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export function RequestRegisterPage() {
  const { data, getUserById, getFormById } = useApp();
  const [formFilter, setFormFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return data.submissions
      .filter((s) => (formFilter === 'all' ? true : s.formId === formFilter))
      .filter((s) =>
        statusFilter === 'all' ? true : s.status === statusFilter,
      )
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const submitter = getUserById(s.submittedBy);
        const hay = [
          s.formName,
          s.id,
          submitter ? `${submitter.firstName} ${submitter.lastName}` : '',
          ...Object.values(s.data).map(String),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  }, [data.submissions, formFilter, statusFilter, search, getUserById]);

  // Collect dynamic columns from form fields when single form selected
  const matrixColumns = useMemo(() => {
    if (formFilter === 'all') return null;
    const form = getFormById(formFilter);
    return form?.fields ?? null;
  }, [formFilter, getFormById]);

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Request Register
        </Typography>
        <Typography color="text.secondary">
          Matrix-style view of all submitted requests
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        mb={2}
      >
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Form</InputLabel>
          <Select
            label="Form"
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
          >
            <MenuItem value="all">All forms</MenuItem>
            {data.forms.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="in_progress">In progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <TableContainer
        component={Paper}
        elevation={1}
        sx={{
          overflowX: 'auto',
          '& .MuiTableCell-head': {
            fontWeight: 700,
            bgcolor: 'rgba(13,115,119,0.08)',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Submitted</TableCell>
              {matrixColumns ? (
                matrixColumns.map((f) => (
                  <TableCell key={f.id}>{f.label}</TableCell>
                ))
              ) : (
                <TableCell>Summary</TableCell>
              )}
              <TableCell>Current Step</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>
                    No requests found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((s) => {
              const user = getUserById(s.submittedBy);
              const wf = data.workflows.find((w) => w.id === s.workflowId);
              const currentNode = wf?.nodes.find(
                (n) => n.id === s.currentNodeId,
              );
              return (
                <TableRow
                  key={s.id}
                  hover
                  component={RouterLink}
                  to={`/register/${s.id}`}
                  sx={{
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(13,115,119,0.04)' },
                  }}
                >
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {s.id.slice(-8)}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.formName}</TableCell>
                  <TableCell>
                    {user
                      ? `${user.firstName} ${user.lastName}`
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {user ? <Chip size="small" label={user.company} /> : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatTime(s.submittedAt)}
                  </TableCell>
                  {matrixColumns ? (
                    matrixColumns.map((f) => (
                      <TableCell key={f.id} sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap title={String(s.data[f.id] ?? '')}>
                          {s.data[f.id] ?? '—'}
                        </Typography>
                      </TableCell>
                    ))
                  ) : (
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="body2" noWrap>
                        {Object.values(s.data)[0]?.toString() ?? '—'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>{currentNode?.data.label ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={s.status.replace('_', ' ')}
                      color={statusColor[s.status]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
