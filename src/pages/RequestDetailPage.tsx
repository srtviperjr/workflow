import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useApp } from '../context/AppContext';
import { WorkflowHistory } from '../components/forms/WorkflowHistory';
import {
  advanceSubmission,
  canUserActOnNode,
  getDecisionOutcomes,
} from '../utils/workflowEngine';

const statusColor = {
  draft: 'default',
  in_progress: 'warning',
  completed: 'success',
  rejected: 'error',
} as const;

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    currentUser,
    getUserById,
    getFormById,
    getWorkflowById,
    updateSubmission,
  } = useApp();
  const navigate = useNavigate();
  const submission = data.submissions.find((s) => s.id === id);
  const [comment, setComment] = useState('');

  if (!submission) {
    return (
      <Box>
        <Alert severity="error">Request not found.</Alert>
        <Button component={RouterLink} to="/register" sx={{ mt: 2 }}>
          Back to register
        </Button>
      </Box>
    );
  }

  const form = getFormById(submission.formId);
  const workflow = submission.workflowId
    ? getWorkflowById(submission.workflowId) ?? null
    : null;
  const submitter = getUserById(submission.submittedBy);
  const currentNode = workflow?.nodes.find(
    (n) => n.id === submission.currentNodeId,
  );

  const canAct =
    currentUser &&
    currentNode &&
    submission.status === 'in_progress' &&
    (currentNode.type === 'step' || currentNode.type === 'decision') &&
    canUserActOnNode(currentUser, currentNode);

  const outcomes =
    workflow && currentNode?.type === 'decision'
      ? getDecisionOutcomes(workflow, currentNode.id)
      : [];

  const act = (action: string, outcome?: string) => {
    if (!currentUser || !workflow || !currentNode) return;
    const updated = advanceSubmission(submission, workflow, currentUser, {
      action,
      outcome,
      comment: comment.trim() || undefined,
    });
    updateSubmission(submission.id, updated);
    setComment('');
  };

  return (
    <Box maxWidth={960} mx="auto">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/register')}
        sx={{ mb: 2 }}
      >
        Back to register
      </Button>

      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'flex-start' }}
          spacing={2}
          mb={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {submission.formName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {submission.id} · Submitted{' '}
              {new Date(submission.submittedAt).toLocaleString()}
              {submitter &&
                ` by ${submitter.firstName} ${submitter.lastName} (${submitter.company})`}
            </Typography>
          </Box>
          <Chip
            label={submission.status.replace('_', ' ')}
            color={statusColor[submission.status]}
            sx={{ textTransform: 'capitalize', fontWeight: 700 }}
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Request details
        </Typography>
        <Stack spacing={1.5} mb={3}>
          {(form?.fields ?? []).map((field) => (
            <Box key={field.id}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {field.label}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {submission.data[field.id]?.toString() ?? '—'}
              </Typography>
            </Box>
          ))}
          {!form &&
            Object.entries(submission.data).map(([k, v]) => (
              <Box key={k}>
                <Typography variant="caption" color="text.secondary">
                  {k}
                </Typography>
                <Typography>{String(v)}</Typography>
              </Box>
            ))}
        </Stack>

        {canAct && currentNode && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'rgba(20,145,155,0.06)',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Your action required: {currentNode.data.label}
            </Typography>
            {currentNode.data.description && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                {currentNode.data.description}
              </Typography>
            )}
            <TextField
              label="Comment (optional)"
              fullWidth
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ mb: 2 }}
            />
            {currentNode.type === 'decision' ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(outcomes.length > 0 ? outcomes : ['Approve', 'Reject']).map(
                  (outcome) => {
                    const isReject = outcome.toLowerCase().includes('reject');
                    return (
                      <Button
                        key={outcome}
                        variant="contained"
                        color={isReject ? 'error' : 'success'}
                        onClick={() => act('Decision', outcome)}
                      >
                        {outcome}
                      </Button>
                    );
                  },
                )}
              </Stack>
            ) : (
              <Button
                variant="contained"
                onClick={() => act('Completed step')}
              >
                Complete Step
              </Button>
            )}
          </Paper>
        )}

        {submission.status === 'in_progress' &&
          currentNode &&
          currentUser &&
          !canAct && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Waiting on{' '}
              <strong>
                {data.roles.find((r) => r.id === currentNode.data.roleId)
                  ?.name ?? 'assigned role'}
              </strong>{' '}
              at step &quot;{currentNode.data.label}&quot;. Switch identity in
              the top right to act as that role.
            </Alert>
          )}
      </Paper>

      <WorkflowHistory submission={submission} workflow={workflow} />
    </Box>
  );
}
