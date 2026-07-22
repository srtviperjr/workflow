import { useMemo, useState } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
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
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useApp } from '../context/AppContext';
import { CustomizeRegisterColumnsDialog } from '../components/register/CustomizeRegisterColumnsDialog';
import {
  RegisterColumnFilter,
  RegisterEmptyState,
  StatusChip,
} from '../components/register/RegisterTableBits';
import { canViewSubmission } from '../utils/submissionVisibility';
import {
  cellValue,
  columnLabel,
  countActiveFilters,
  getSavedFormRegisterView,
  matchesColumnFilter,
  normalizeRegisterColumnOrder,
  REGISTER_STICKY_TABLE_SX,
  resolveFormRegisterColumns,
  stickyCellSx,
  type RegisterFilterValue,
  type RegisterFilters,
} from '../utils/registerColumns';

export function FormRegisterPage() {
  const { formId = '' } = useParams();
  const {
    data,
    currentUser,
    getFormById,
    setFormRegisterView,
  } = useApp();
  const form = getFormById(formId);
  const [filters, setFilters] = useState<RegisterFilters>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const columns = useMemo(() => {
    if (!form) return [];
    const saved = getSavedFormRegisterView(
      data.formRegisterViews,
      form.id,
      currentUser?.id,
    );
    return resolveFormRegisterColumns(form, saved?.columns);
  }, [form, data.formRegisterViews, currentUser?.id]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns],
  );

  const visible = useMemo(() => {
    if (!form) return [];
    return data.submissions
      .filter((s) => s.formId === form.id)
      .filter((s) =>
        canViewSubmission(currentUser, s, form, data.users, {
          roles: data.roles,
          workflows: data.workflows,
          includeActionable: true,
          delegations: data.delegations ?? [],
          notifications: data.notifications ?? [],
        }),
      )
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  }, [
    form,
    data.submissions,
    data.users,
    data.roles,
    data.workflows,
    data.delegations,
    data.notifications,
    currentUser,
  ]);

  const rows = useMemo(() => {
    const ctx = { users: data.users, workflows: data.workflows, form };
    return visible.filter((s) =>
      visibleColumns.every((col) =>
        matchesColumnFilter(col.id, filters[col.id], s, ctx),
      ),
    );
  }, [visible, visibleColumns, filters, data.users, data.workflows, form]);

  if (!form) {
    return <Navigate to="/register" replace />;
  }

  const activeFilterCount = countActiveFilters(filters);

  const setFilter = (columnId: string, value: RegisterFilterValue) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={1.5}
        mb={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {form.name} register
          </Typography>
          <Typography color="text.secondary">
            Customize visible fields, pin sticky columns, and filter from each
            column header. Request # and Submitter stay locked while scrolling
            by default.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={() => setCustomizeOpen(true)}
          >
            Customize columns
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <Chip
          label="All forms"
          size="small"
          component={RouterLink}
          to="/register"
          clickable
          variant="outlined"
        />
        {data.forms.map((f) => (
          <Chip
            key={f.id}
            label={f.name}
            size="small"
            component={RouterLink}
            to={`/register/form/${f.id}`}
            clickable
            color={f.id === form.id ? 'primary' : 'default'}
            variant={f.id === form.id ? 'filled' : 'outlined'}
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
          '& .MuiTableCell-head:not(.register-sticky-col)': {
            bgcolor: '#FDE8D8',
          },
        }}
      >
        <Table size="small" stickyHeader sx={REGISTER_STICKY_TABLE_SX}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.id}
                  className={col.sticky ? 'register-sticky-col' : undefined}
                  sx={stickyCellSx(visibleColumns, col.id, { variant: 'head' })}
                >
                  {columnLabel(col.id, form)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={`${col.id}-filter`}
                  className={col.sticky ? 'register-sticky-col' : undefined}
                  sx={{
                    top: 37,
                    ...stickyCellSx(visibleColumns, col.id, {
                      variant: 'filter',
                    }),
                  }}
                >
                  <RegisterColumnFilter
                    columnId={col.id}
                    value={filters[col.id]}
                    onChange={(v) => setFilter(col.id, v)}
                    form={form}
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
                  colSpan={Math.max(visibleColumns.length, 1)}
                />
              </TableRow>
            )}
            {rows.map((s) => {
              const ctx = {
                users: data.users,
                workflows: data.workflows,
                form,
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
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={col.sticky ? 'register-sticky-col' : undefined}
                      sx={{
                        whiteSpace:
                          col.id === 'submittedAt' ? 'nowrap' : undefined,
                        fontFamily:
                          col.id === 'requestId' ? 'monospace' : undefined,
                        ...(col.sticky
                          ? {}
                          : col.id.startsWith('field:')
                            ? { maxWidth: 220 }
                            : {}),
                        ...stickyCellSx(visibleColumns, col.id, {
                          variant: 'body',
                        }),
                      }}
                    >
                      {col.id === 'status' ? (
                        <StatusChip status={s.status} />
                      ) : (
                        <Typography
                          variant="body2"
                          noWrap={col.id.startsWith('field:') || Boolean(col.sticky)}
                          title={cellValue(col.id, s, ctx)}
                        >
                          {cellValue(col.id, s, ctx) || '—'}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <CustomizeRegisterColumnsDialog
        open={customizeOpen}
        form={form}
        columns={columns}
        onClose={() => setCustomizeOpen(false)}
        onSave={(next) =>
          setFormRegisterView(form.id, normalizeRegisterColumnOrder(next))
        }
      />
    </Box>
  );
}
