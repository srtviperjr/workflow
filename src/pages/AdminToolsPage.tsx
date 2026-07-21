import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
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
  type SampleSeedMode,
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
  const [includeNotifications, setIncludeNotifications] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);
  const [seedMode, setSeedMode] = useState<SampleSeedMode>('replace');
  const [userMode, setUserMode] = useState<SampleSeedMode>('replace');

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const totalRequests = SAMPLE_FORM_META.reduce(
    (sum, f) => sum + (Number(requestsPerForm[f.id]) || 0),
    0,
  );
  const canGenerate = includeUsers || totalRequests > 0;

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
                  Loads the sample form catalog (Overtime, Vehicle Registration,
                  Change Request, Leave Request). Optionally seed demo users,
                  requests, and in-app notifications. Each section can clear
                  existing sample data or only add more.
                </Typography>

                <FormControlLabel
                  sx={{ display: 'flex', mb: 0.5 }}
                  control={
                    <Checkbox
                      checked={includeUsers}
                      onChange={(e) => setIncludeUsers(e.target.checked)}
                    />
                  }
                  label="Create sample users"
                />
                {includeUsers && (
                  <FormControl component="fieldset" sx={{ mb: 2, ml: 1 }}>
                    <FormLabel component="legend" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Existing sample users
                    </FormLabel>
                    <RadioGroup
                      value={userMode}
                      onChange={(e) =>
                        setUserMode(e.target.value as SampleSeedMode)
                      }
                    >
                      <FormControlLabel
                        value="replace"
                        control={<Radio size="small" />}
                        label="Clear existing sample users, then recreate"
                      />
                      <FormControlLabel
                        value="append"
                        control={<Radio size="small" />}
                        label="Keep existing users and add any that are missing"
                      />
                    </RadioGroup>
                  </FormControl>
                )}

                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Existing sample requests
                  </FormLabel>
                  <RadioGroup
                    value={seedMode}
                    onChange={(e) =>
                      setSeedMode(e.target.value as SampleSeedMode)
                    }
                  >
                    <FormControlLabel
                      value="replace"
                      control={<Radio size="small" />}
                      label="Clear existing sample requests & notifications, then recreate"
                    />
                    <FormControlLabel
                      value="append"
                      control={<Radio size="small" />}
                      label="Keep existing records and add more"
                    />
                  </RadioGroup>
                </FormControl>

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
                <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap" useFlexGap>
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

                <FormControlLabel
                  sx={{ mb: 2, display: 'flex' }}
                  control={
                    <Checkbox
                      checked={includeNotifications}
                      onChange={(e) =>
                        setIncludeNotifications(e.target.checked)
                      }
                    />
                  }
                  label="Include in-app notifications (submission, approval, rejection)"
                />

                {totalRequests === 0 && !includeUsers && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Enable sample users and/or set at least one request per form
                    to generate data.
                  </Alert>
                )}
                {totalRequests === 0 && includeUsers && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Request counts are all zero — only sample users will be
                    created/updated. Existing requests are left unchanged.
                  </Alert>
                )}

                <Button
                  variant="contained"
                  startIcon={<DatasetIcon />}
                  disabled={!canGenerate}
                  onClick={() => {
                    const stats = seedSampleData({
                      requestsPerForm,
                      includeNotifications,
                      includeUsers,
                      mode: seedMode,
                      userMode,
                    });
                    const parts: string[] = [];
                    if (includeUsers) {
                      parts.push(
                        stats.userMode === 'replace'
                          ? `Users: cleared ${stats.usersCleared}, added ${stats.usersAdded}`
                          : `Users: added ${stats.usersAdded}`,
                      );
                    }
                    if (totalRequests > 0 || stats.submissionsCleared > 0) {
                      const action =
                        stats.mode === 'replace' ? 'Recreated' : 'Added';
                      parts.push(
                        `${action} ${stats.submissionsAdded} request${
                          stats.submissionsAdded === 1 ? '' : 's'
                        } and ${stats.notificationsAdded} notification${
                          stats.notificationsAdded === 1 ? '' : 's'
                        }`,
                      );
                      if (
                        stats.mode === 'replace' &&
                        (stats.submissionsCleared > 0 ||
                          stats.notificationsCleared > 0)
                      ) {
                        parts.push(
                          `cleared ${stats.submissionsCleared} request${
                            stats.submissionsCleared === 1 ? '' : 's'
                          } / ${stats.notificationsCleared} notification${
                            stats.notificationsCleared === 1 ? '' : 's'
                          }`,
                        );
                      }
                    }
                    if (
                      stats.submissionsAdded === 0 &&
                      stats.usersAdded === 0 &&
                      stats.usersCleared === 0 &&
                      stats.submissionsCleared === 0
                    ) {
                      setMessage(
                        'Nothing changed. Try enabling users or setting request counts above zero.',
                      );
                      return;
                    }
                    setMessage(parts.join('. ') + '.');
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
