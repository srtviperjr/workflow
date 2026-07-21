import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
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
import { useApp } from '../context/AppContext';
import {
  RegisterColumnFilter,
  RegisterEmptyState,
  StatusChip,
} from '../components/register/RegisterTableBits';
import { canViewSubmission } from '../utils/submissionVisibility';
import {
  OVERALL_REGISTER_COLUMNS,
  META_COLUMN_LABELS,
  cellValue,
  matchesColumnFilter,
} from '../utils/registerColumns';

export function RequestRegisterPage() {
  const { data, currentUser, getFormById } = useApp();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    return data.submissions
      .filter((s) =>
        canViewSubmission(
          currentUser,
          s,
          getFormById(s.formId),
          data.users,
          {
            roles: data.roles,
            workflows: data.workflows,
            includeActionable: true,
            delegations: data.delegations ?? [],
          },
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  }, [
    data.submissions,
    data.users,
    data.roles,
    data.workflows,
    data.delegations,
    getFormById,
    currentUser,
  ]);

  const rows = useMemo(() => {
    const ctx = { users: data.users, workflows: data.workflows };
    return visible.filter((s) =>
      OVERALL_REGISTER_COLUMNS.every((col) =>
        matchesColumnFilter(col, filters[col] ?? '', s, ctx),
      ),
    );
  }, [visible, filters, data.users, data.workflows]);

  const setFilter = (columnId: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Request Register
        </Typography>
        <Typography color="text.secondary">
          Overall view of requests you can see. Open a form register to show
          form fields and customize columns.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <Chip label="All forms" color="primary" size="small" />
        {data.forms.map((f) => (
          <Chip
            key={f.id}
            label={f.name}
            size="small"
            component={RouterLink}
            to={`/register/form/${f.id}`}
            clickable
            variant="outlined"
          />
        ))}
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
            verticalAlign: 'bottom',
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {OVERALL_REGISTER_COLUMNS.map((col) => (
                <TableCell key={col}>{META_COLUMN_LABELS[col]}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              {OVERALL_REGISTER_COLUMNS.map((col) => (
                <TableCell key={`${col}-filter`} sx={{ top: 37 }}>
                  <RegisterColumnFilter
                    columnId={col}
                    value={filters[col] ?? ''}
                    onChange={(v) => setFilter(col, v)}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <RegisterEmptyState colSpan={OVERALL_REGISTER_COLUMNS.length} />
              </TableRow>
            )}
            {rows.map((s) => {
              const ctx = {
                users: data.users,
                workflows: data.workflows,
              };
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
                  {OVERALL_REGISTER_COLUMNS.map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        whiteSpace:
                          col === 'submittedAt' || col === 'lastChangedAt'
                            ? 'nowrap'
                            : undefined,
                        fontFamily: col === 'requestId' ? 'monospace' : undefined,
                      }}
                    >
                      {col === 'status' ? (
                        <StatusChip status={s.status} />
                      ) : (
                        cellValue(col, s, ctx)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
