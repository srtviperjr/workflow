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
  getSavedFormRegisterView,
  matchesColumnFilter,
  resolveFormRegisterColumns,
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
  const [filters, setFilters] = useState<Record<string, string>>({});
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
    currentUser,
  ]);

  const rows = useMemo(() => {
    const ctx = { users: data.users, workflows: data.workflows };
    return visible.filter((s) =>
      visibleColumns.every((col) =>
        matchesColumnFilter(col.id, filters[col.id] ?? '', s, ctx),
      ),
    );
  }, [visible, visibleColumns, filters, data.users, data.workflows]);

  if (!form) {
    return <Navigate to="/register" replace />;
  }

  const setFilter = (columnId: string, value: string) => {
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
            Customize visible fields and filter from each column header.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ViewColumnIcon />}
          onClick={() => setCustomizeOpen(true)}
        >
          Customize columns
        </Button>
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
            bgcolor: 'rgba(13,115,119,0.08)',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell key={col.id}>{columnLabel(col.id, form)}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell key={`${col.id}-filter`} sx={{ top: 37 }}>
                  <RegisterColumnFilter
                    columnId={col.id}
                    value={filters[col.id] ?? ''}
                    onChange={(v) => setFilter(col.id, v)}
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
                    '&:hover': { bgcolor: 'rgba(13,115,119,0.04)' },
                  }}
                >
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      sx={{
                        whiteSpace:
                          col.id === 'submittedAt' || col.id === 'lastChangedAt'
                            ? 'nowrap'
                            : undefined,
                        fontFamily:
                          col.id === 'requestId' ? 'monospace' : undefined,
                        maxWidth: col.id.startsWith('field:') ? 220 : undefined,
                      }}
                    >
                      {col.id === 'status' ? (
                        <StatusChip status={s.status} />
                      ) : (
                        <Typography
                          variant="body2"
                          noWrap={col.id.startsWith('field:')}
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
        onSave={(next) => setFormRegisterView(form.id, next)}
      />
    </Box>
  );
}
