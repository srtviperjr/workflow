import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { useApp } from '../context/AppContext';
import { FormRenderer } from '../components/forms/FormRenderer';
import { startSubmission } from '../utils/workflowEngine';
import type { FormFieldData } from '../types';
import { isEmptyFieldValue } from '../utils/formValues';

export function FormSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    getFormById,
    getWorkflowById,
    currentUser,
    addSubmission,
    addNotifications,
  } = useApp();
  const navigate = useNavigate();
  const form = id ? getFormById(id) : undefined;
  const workflow = form?.workflowId
    ? getWorkflowById(form.workflowId) ?? null
    : null;

  const [values, setValues] = useState<FormFieldData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!form) {
    return (
      <Box>
        <Alert severity="error">Form not found.</Alert>
        <Button component={RouterLink} to="/requests" sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  if (!currentUser) {
    return <Alert severity="warning">Select a user from the identity switcher.</Alert>;
  }

  const validate = () => {
    const next: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.required && isEmptyFieldValue(values[field.id])) {
        next[field.id] = 'This field is required';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate() || !currentUser) return;
    const { submission, notifications } = startSubmission(
      form.id,
      form.name,
      workflow,
      currentUser,
      values,
      {
        form,
        users: data.users,
        roles: data.roles,
      },
    );
    addSubmission(submission);
    addNotifications(notifications);
    navigate(`/register/${submission.id}`);
  };

  return (
    <Box maxWidth={720} mx="auto">
      <Button
        startIcon={<ArrowBackIcon />}
        component={RouterLink}
        to="/requests"
        sx={{ mb: 2 }}
      >
        Back to requests
      </Button>

      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {form.name}
        </Typography>
        {form.description && (
          <Typography color="text.secondary" mb={3}>
            {form.description}
          </Typography>
        )}

        {workflow && (
          <Alert severity="info" sx={{ mb: 3 }}>
            This form uses the <strong>{workflow.name}</strong> workflow.
            After submission, approvals will follow the configured steps.
          </Alert>
        )}

        <FormRenderer
          fields={form.fields}
          values={values}
          errors={errors}
          onChange={(fid, val) => {
            setValues((v) => ({ ...v, [fid]: val }));
            setErrors((e) => {
              const next = { ...e };
              delete next[fid];
              return next;
            });
          }}
        />

        <Stack direction="row" justifyContent="flex-end" mt={3}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={submit}
          >
            Submit Request
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
