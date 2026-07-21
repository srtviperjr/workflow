import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DatasetIcon from '@mui/icons-material/Dataset';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useApp } from '../context/AppContext';
import {
  DEFAULT_REQUESTS_PER_FORM,
  SAMPLE_FORM_META,
  defaultRequestsPerForm,
  type RequestsPerForm,
} from '../data/sampleData';

export function AdminToolsPage() {
  const {
    data,
    isAdmin,
    seedSampleData,
    resetEverything,
    resetFormData,
  } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [formId, setFormId] = useState('');
  const [confirmFormReset, setConfirmFormReset] = useState(false);
  const [requestsPerForm, setRequestsPerForm] = useState<RequestsPerForm>(() =>
    defaultRequestsPerForm(DEFAULT_REQUESTS_PER_FORM),
  );

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const totalRequests = SAMPLE_FORM_META.reduce(
    (sum, f) => sum + (Number(requestsPerForm[f.id]) || 0),
    0,
  );

  return (
    <Box maxWidth={800}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Admin Tools
        </Typography>
        <Typography color="text.secondary">
          Seed sample data or reset stored information
        </Typography>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <Stack spacing={2}>
        <Card elevation={1}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <DatasetIcon color="primary" sx={{ mt: 0.5 }} />
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  Create sample data
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Replaces forms with Overtime, Vehicle Registration, Change
                  Request, and Leave Request (manager-approval workflows with
                  notifications on submission, approval, and rejection), adds
                  sample users across companies/projects, and sample
                  submissions plus in-app notifications.
                </Typography>

                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Requests per form
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  flexWrap="wrap"
                  useFlexGap
                  mb={2}
                >
                  {SAMPLE_FORM_META.map((form) => (
                    <TextField
                      key={form.id}
                      label={form.name}
                      type="number"
                      size="small"
                      value={requestsPerForm[form.id] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const next = Number.isFinite(raw)
                          ? Math.max(0, Math.min(50, Math.floor(raw)))
                          : 0;
                        setRequestsPerForm((prev) => ({
                          ...prev,
                          [form.id]: next,
                        }));
                      }}
                      inputProps={{ min: 0, max: 50, step: 1 }}
                      sx={{ width: { xs: '100%', sm: 180 } }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <Button
                    size="small"
                    onClick={() =>
                      setRequestsPerForm(defaultRequestsPerForm(2))
                    }
                  >
                    Set all to 2
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      setRequestsPerForm(defaultRequestsPerForm(5))
                    }
                  >
                    Set all to 5
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      setRequestsPerForm(defaultRequestsPerForm(0))
                    }
                  >
                    Clear counts
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {totalRequests} total request
                    {totalRequests === 1 ? '' : 's'}
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  startIcon={<DatasetIcon />}
                  onClick={() => {
                    seedSampleData({ requestsPerForm });
                    setMessage(
                      `Sample catalog loaded with ${totalRequests} request${
                        totalRequests === 1 ? '' : 's'
                      } and matching notifications.`,
                    );
                  }}
                >
                  Generate Sample Data
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={1}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <DeleteSweepIcon color="warning" sx={{ mt: 0.5 }} />
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  Reset by form
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Delete all submissions for a selected form. Form definition and
                  workflow stay intact.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
                    <InputLabel>Form</InputLabel>
                    <Select
                      label="Form"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                    >
                      {data.forms.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.name} (
                          {
                            data.submissions.filter((s) => s.formId === f.id)
                              .length
                          }{' '}
                          requests)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={!formId}
                    startIcon={<DeleteSweepIcon />}
                    onClick={() => setConfirmFormReset(true)}
                  >
                    Clear Form Requests
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={1} sx={{ borderColor: 'error.light', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <RestartAltIcon color="error" sx={{ mt: 0.5 }} />
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  Delete &amp; reset all information
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Clears local storage and restores default roles, the system
                  admin user, sample forms, and manager-approval workflows.
                  All custom data will be lost.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RestartAltIcon />}
                  onClick={() => setConfirmReset(true)}
                >
                  Reset Everything
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Reset all data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes all users, roles, workflows, forms, and
            requests from local storage and restores defaults.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              resetEverything();
              setConfirmReset(false);
              setMessage('All data reset to defaults.');
            }}
          >
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmFormReset} onClose={() => setConfirmFormReset(false)}>
        <DialogTitle>Clear form requests?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete all submissions for{' '}
            {data.forms.find((f) => f.id === formId)?.name ?? 'this form'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFormReset(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              resetFormData(formId);
              setConfirmFormReset(false);
              setMessage('Form submissions cleared.');
            }}
          >
            Clear Requests
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
