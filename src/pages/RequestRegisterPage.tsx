import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
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
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useApp } from '../context/AppContext';
import {
  RegisterColumnFilter,
  RegisterEmptyState,
  StatusChip,
} from '../components/register/RegisterTableBits';
import { canViewSubmission } from '../utils/submissionVisibility';
import {
  OVERALL_REGISTER_COLUMN_CONFIG,
  META_COLUMN_LABELS,
  REGISTER_STICKY_TABLE_SX,
  cellValue,
  countActiveFilters,
  matchesColumnFilter,
  stickyCellSx,
  type RegisterFilterValue,
  type RegisterFilters,
} from '../utils/registerColumns';
import type { RegisterMetaColumnId } from '../types';

export function RequestRegisterPage() {
  const { data, currentUser, getFormById } = useApp();
  const [filters, setFilters] = useState<RegisterFilters>({});

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
            notifications: data.notifications ?? [],
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
    data.notifications,
    getFormById,
    currentUser,
  ]);

  const rows = useMemo(() => {
    const ctx = { users: data.users, workflows: data.workflows };
    return visible.filter((s) =>
      OVERALL_REGISTER_COLUMN_CONFIG.every((col) =>
        matchesColumnFilter(col.id, filters[col.id], s, ctx),
      ),
    );
  }, [visible, filters, data.users, data.workflows]);

  const activeFilterCount = countActiveFilters(filters);

  const setFilter = (columnId: string, value: RegisterFilterValue) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

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
            Request Register
          </Typography>
          <Typography color="text.secondary">
            Overall view of requests you can see. Request # and Submitter stay
            locked while scrolling. Open a form register to show form fields and
            customize columns.
          </Typography>
        </Box>
        {activeFilterCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterAltOffIcon />}
            onClick={() => setFilters({})}
          >
            Clear filters ({activeFilterCount})
          </Button>
        )}
      </Stack>

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
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
          },
          // Solid head fill for non-sticky only — sticky cells set their own opaque bg
          '& .MuiTableCell-head:not(.register-sticky-col)': {
            bgcolor: '#FDE8D8',
          },
        }}
      >
        <Table size="small" stickyHeader sx={REGISTER_STICKY_TABLE_SX}>
          <TableHead>
            <TableRow>
              {OVERALL_REGISTER_COLUMN_CONFIG.map((col) => (
                <TableCell
                  key={col.id}
                  className={col.sticky ? 'register-sticky-col' : undefined}
                  sx={stickyCellSx(OVERALL_REGISTER_COLUMN_CONFIG, col.id, {
                    variant: 'head',
                  })}
                >
                  {META_COLUMN_LABELS[col.id as RegisterMetaColumnId]}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {OVERALL_REGISTER_COLUMN_CONFIG.map((col) => (
                <TableCell
                  key={`${col.id}-filter`}
                  className={col.sticky ? 'register-sticky-col' : undefined}
                  sx={{
                    top: 37,
                    ...stickyCellSx(OVERALL_REGISTER_COLUMN_CONFIG, col.id, {
                      variant: 'filter',
                    }),
                  }}
                >
                  <RegisterColumnFilter
                    columnId={col.id}
                    value={filters[col.id]}
                    onChange={(v) => setFilter(col.id, v)}
                    forms={data.forms}
                    workflows={data.workflows}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <RegisterEmptyState
                  colSpan={OVERALL_REGISTER_COLUMN_CONFIG.length}
                />
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
                    '&:hover': { bgcolor: 'rgba(226,82,0,0.04)' },
                    '&:hover .register-sticky-col': {
                      bgcolor: '#FFF7F2',
                      backgroundColor: '#FFF7F2',
                    },
                  }}
                >
                  {OVERALL_REGISTER_COLUMN_CONFIG.map((col) => (
                    <TableCell
                      key={col.id}
                      className={col.sticky ? 'register-sticky-col' : undefined}
                      sx={{
                        whiteSpace:
                          col.id === 'submittedAt' ? 'nowrap' : undefined,
                        fontFamily:
                          col.id === 'requestId' ? 'monospace' : undefined,
                        ...stickyCellSx(
                          OVERALL_REGISTER_COLUMN_CONFIG,
                          col.id,
                          { variant: 'body' },
                        ),
                      }}
                    >
                      {col.id === 'status' ? (
                        <StatusChip status={s.status} />
                      ) : (
                        cellValue(col.id, s, ctx)
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
