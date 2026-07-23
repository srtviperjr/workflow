import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { useApp } from '../context/AppContext';
import { WorkflowHistory } from '../components/forms/WorkflowHistory';
import { FormRenderer } from '../components/forms/FormRenderer';
import {
  advanceSubmission,
  getDecisionOutcomes,
  getDelegationSource,
} from '../utils/workflowEngine';
import { downloadFormPdf } from '../utils/formPdf';
import {
  canActOnSubmission,
  canViewSubmission,
} from '../utils/submissionVisibility';
import type { FormFieldData } from '../types';
import {
  formatFieldDisplayValue,
  formatFileSize,
  fieldValueCompareKey,
  isFileAttachment,
} from '../utils/formValues';
import { isOpenStatus, statusChipColor, statusOptionLabel } from '../utils/formStatus';
import Link from '@mui/material/Link';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    currentUser,
    getUserById,
    getFormById,
    getWorkflowById,
    updateSubmission,
    addNotifications,
  } = useApp();
  const navigate = useNavigate();
  const submission = data.submissions.find((s) => s.id === id);
  const [comment, setComment] = useState('');
  const [editValues, setEditValues] = useState<FormFieldData | null>(null);

  const form = submission ? getFormById(submission.formId) : undefined;
  const workflow = submission?.workflowId
    ? getWorkflowById(submission.workflowId) ?? null
    : null;
  const currentNode = workflow?.nodes.find(
    (n) => n.id === submission?.currentNodeId,
  );

  const fieldValues = useMemo(() => {
    if (!submission) return {};
    return editValues ?? { ...submission.data };
  }, [submission, editValues]);

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

  const accessOpts = {
    roles: data.roles,
    workflows: data.workflows,
    users: data.users,
    forms: data.forms,
    delegations: data.delegations ?? [],
    notifications: data.notifications ?? [],
  };

  const allowed = canViewSubmission(
    currentUser,
    submission,
    form,
    data.users,
    {
      roles: accessOpts.roles,
      workflows: accessOpts.workflows,
      forms: accessOpts.forms,
      includeActionable: true,
      delegations: accessOpts.delegations,
      notifications: accessOpts.notifications,
    },
  );

  if (!allowed) {
    return (
      <Box>
        <Alert severity="warning">
          This request is outside your visibility for this form. It will not
          appear in your registers or awaiting-action list.
        </Alert>
        <Button component={RouterLink} to="/register" sx={{ mt: 2 }}>
          Back to register
        </Button>
      </Box>
    );
  }

  const submitter = getUserById(submission.submittedBy);

  const permissionCtx = {
    workflowId: submission?.workflowId,
    delegations: data.delegations ?? [],
    users: data.users,
  };

  // Approve/deny only when the viewer can act — never show actions without access
  const canAct = canActOnSubmission(currentUser, submission, accessOpts);

  const actingFor =
    currentUser && currentNode && canAct
      ? getDelegationSource(
          currentUser,
          currentNode,
          data.roles,
          submission.formId,
          permissionCtx,
        )
      : null;

  const allowEdits = Boolean(canAct && currentNode?.data.allowFieldEdits);
  const outcomes =
    workflow && currentNode?.type === 'decision'
      ? getDecisionOutcomes(workflow, currentNode.id, form)
      : [];

  const act = (action: string, outcome?: string) => {
    if (!currentUser || !workflow || !currentNode) return;
    const onBehalf = actingFor
      ? `On behalf of ${actingFor.firstName} ${actingFor.lastName}`
      : undefined;
    const combinedComment = [comment.trim() || undefined, onBehalf]
      .filter(Boolean)
      .join(' · ');
    const { submission: updated, notifications } = advanceSubmission(
      submission,
      workflow,
      currentUser,
      {
        action: actingFor ? `${action} (delegate)` : action,
        outcome,
        comment: combinedComment || undefined,
        fieldData: allowEdits ? fieldValues : undefined,
      },
      {
        form: form ?? null,
        users: data.users,
        roles: data.roles,
        notificationTemplates: data.notificationTemplates ?? [],
      },
    );
    updateSubmission(submission.id, updated);
    addNotifications(notifications);
    setComment('');
    setEditValues(null);
  };

  const printPdf = () => {
    if (!form) return;
    downloadFormPdf({
      form,
      submission,
      submitter,
    });
  };

  const baseline = submission.baselineData ?? submission.data;

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
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Download PDF">
              <IconButton color="primary" onClick={printPdf} aria-label="Print PDF">
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Chip
              label={statusOptionLabel(form, submission.status)}
              color={statusChipColor(submission.status, form)}
              sx={{ textTransform: 'capitalize', fontWeight: 700 }}
            />
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Request details
        </Typography>

        {allowEdits && form ? (
          <Box mb={3}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You can edit form fields at this step. Changes are compared to the
              original submitted values for workflow conditions.
            </Alert>
            <FormRenderer
              fields={form.fields}
              values={fieldValues}
              onChange={(fieldId, value) =>
                setEditValues((prev) => ({
                  ...(prev ?? submission.data),
                  [fieldId]: value,
                }))
              }
            />
          </Box>
        ) : (
          <Stack spacing={1.5} mb={3}>
            {(form?.fields ?? []).map((field) => {
              const current = submission.data[field.id];
              const original = baseline[field.id];
              const changed =
                original !== undefined &&
                fieldValueCompareKey(current) !==
                  fieldValueCompareKey(original);
              const file = isFileAttachment(current) ? current : null;
              return (
                <Box key={field.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {field.label}
                    </Typography>
                    {changed && (
                      <Chip size="small" label="Changed" color="warning" />
                    )}
                  </Stack>
                  {file ? (
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Link href={file.dataUrl} download={file.name}>
                        {file.name}
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        ({formatFileSize(file.size)})
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {formatFieldDisplayValue(current) || '—'}
                    </Typography>
                  )}
                  {changed && (
                    <Typography variant="caption" color="text.secondary">
                      Originally:{' '}
                      {formatFieldDisplayValue(original) || '—'}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {!form &&
              Object.entries(submission.data).map(([k, v]) => (
                <Box key={k}>
                  <Typography variant="caption" color="text.secondary">
                    {k}
                  </Typography>
                  <Typography>
                    {formatFieldDisplayValue(v) || String(v)}
                  </Typography>
                </Box>
              ))}
          </Stack>
        )}

        {canAct && currentNode && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'rgba(226,82,0,0.06)',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Your action required: {currentNode.data.label}
            </Typography>
            {actingFor && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Acting as delegate for{' '}
                <strong>
                  {actingFor.firstName} {actingFor.lastName}
                </strong>
              </Alert>
            )}
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
                {outcomes.length === 0 ? (
                  <Alert severity="warning">
                    This decision has no actions configured. Edit the workflow
                    and choose available form statuses on the decision node.
                  </Alert>
                ) : (
                  outcomes.map((outcome) => (
                    <Button
                      key={outcome.id}
                      variant="contained"
                      color={
                        outcome.kind === 'negative'
                          ? 'error'
                          : outcome.kind === 'positive'
                            ? 'success'
                            : 'primary'
                      }
                      onClick={() => act('Decision', outcome.id)}
                    >
                      {outcome.label}
                    </Button>
                  ))
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

        {isOpenStatus(submission.status, form) &&
          currentNode &&
          currentUser &&
          !canAct && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {currentNode.data.decisionMode === 'conditional' ? (
                <>
                  Waiting for conditional routing at &quot;
                  {currentNode.data.label}&quot;. Advance from the previous step
                  to evaluate field rules.
                </>
              ) : (
                <>
                  Waiting on{' '}
                  <strong>
                    {data.roles.find((r) => r.id === currentNode.data.roleId)
                      ?.name ?? 'assigned role'}
                  </strong>{' '}
                  at step &quot;{currentNode.data.label}&quot;. Switch identity
                  in the top right to act as that role.
                </>
              )}
            </Alert>
          )}
      </Paper>

      <WorkflowHistory submission={submission} workflow={workflow} />
    </Box>
  );
}
