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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { FormSubmission, Workflow } from '../../types';
import { buildDynamicHistoryView } from '../../utils/workflowEngine';

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

interface Props {
  submission: FormSubmission;
  workflow: Workflow | null;
}

export function WorkflowHistory({ submission, workflow }: Props) {
  const rows = buildDynamicHistoryView(workflow, submission);

  return (
    <Paper elevation={1} sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'primary.dark',
          color: 'white',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Workflow History
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          Steps update automatically when the workflow definition changes
        </Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Step</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action / Outcome</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.stepId}
                sx={{
                  bgcolor: row.current
                    ? 'rgba(20,145,155,0.08)'
                    : row.entry
                      ? 'transparent'
                      : 'rgba(0,0,0,0.02)',
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.stepLabel}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.stepType}
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>{row.entry?.userName ?? '—'}</TableCell>
                <TableCell>
                  {row.entry ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>{row.entry.action}</span>
                      {row.entry.outcome && (
                        <Chip
                          size="small"
                          label={row.entry.outcome}
                          color={
                            row.entry.outcome.toLowerCase().includes('reject')
                              ? 'error'
                              : 'success'
                          }
                        />
                      )}
                    </Stack>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{formatTime(row.entry?.timestamp)}</TableCell>
                <TableCell>
                  {row.entry ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="caption">Done</Typography>
                    </Stack>
                  ) : row.current ||
                    submission.currentNodeId === row.stepId ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <HourglassEmptyIcon color="warning" fontSize="small" />
                      <Typography variant="caption">Current</Typography>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <RadioButtonUncheckedIcon
                        color="disabled"
                        fontSize="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Pending
                      </Typography>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
