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
  defaultRequestsPerForm,
  type SampleSeedMode,
} from '../data/sampleData';

const MODE_OPTIONS: Array<{ value: SampleSeedMode; label: string }> = [
  { value: 'append', label: 'Create additional' },
  { value: 'replace', label: 'Clear & recreate' },
];

/** Admin page for seeding and resetting local demo data. */
export function DataToolsPage() {
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

  const [includeUsers, setIncludeUsers] = useState(true);
  const [userMode, setUserMode] = useState<SampleSeedMode>('append');
  const [userCount, setUserCount] = useState(6);
  const [includeRequests, setIncludeRequests] = useState(true);
  const [requestMode, setRequestMode] = useState<SampleSeedMode>('append');
  const [requestsPerFormCount, setRequestsPerFormCount] = useState(
    DEFAULT_REQUESTS_PER_FORM,
  );
  const [includeNotifications, setIncludeNotifications] = useState(true);

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const formCount = Math.max(data.forms.length, 4);
  const totalRequests = requestsPerFormCount * formCount;
  const willGenerateUsers = includeUsers && userCount > 0;
  const willGenerateRequests = includeRequests && requestsPerFormCount > 0;
  const canGenerate = willGenerateUsers || willGenerateRequests;

  return (
    <Box maxWidth={800}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Data Tools
        </Typography>
        <Typography color="text.secondary">
          Seed sample users and requests, or reset stored information
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
                  Sample data
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Choose what to generate with the checkboxes below. Users and
                  requests (workflow submissions) can be included independently.
                </Typography>

                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: includeUsers ? 'divider' : 'action.disabledBackground',
                    bgcolor: includeUsers ? 'background.paper' : 'action.hover',
                  }}
                >
                  <FormControlLabel
                    sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        checked={includeUsers}
                        onChange={(e) => setIncludeUsers(e.target.checked)}
                        sx={{ pt: 0.25 }}
                      />
                    }
                    label={
                      <Box>
                        <Typography fontWeight={700}>Include users</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Create or replace demo users for the identity switcher
                        </Typography>
                      </Box>
                    }
                  />
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'flex-start' }}
                    pl={{ sm: 4 }}
                  >
                    <FormControl
                      size="small"
                      sx={{ minWidth: 200, flex: 1 }}
                      disabled={!includeUsers}
                    >
                      <InputLabel>Users mode</InputLabel>
                      <Select
                        label="Users mode"
                        value={userMode}
                        onChange={(e) =>
                          setUserMode(e.target.value as SampleSeedMode)
                        }
                      >
                        {MODE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Number of users"
                      type="number"
                      size="small"
                      disabled={!includeUsers}
                      value={userCount}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setUserCount(
                          Number.isFinite(n)
                            ? Math.max(0, Math.min(50, Math.floor(n)))
                            : 0,
                        );
                      }}
                      inputProps={{ min: 0, max: 50, step: 1 }}
                      sx={{ width: { xs: '100%', sm: 160 } }}
                    />
                  </Stack>
                </Box>

                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: includeRequests
                      ? 'divider'
                      : 'action.disabledBackground',
                    bgcolor: includeRequests
                      ? 'background.paper'
                      : 'action.hover',
                  }}
                >
                  <FormControlLabel
                    sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        checked={includeRequests}
                        onChange={(e) => setIncludeRequests(e.target.checked)}
                        sx={{ pt: 0.25 }}
                      />
                    }
                    label={
                      <Box>
                        <Typography fontWeight={700}>
                          Include requests (workflows)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Seed sample form/workflow catalog submissions through
                          approval flows
                        </Typography>
                      </Box>
                    }
                  />
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    mb={1}
                    alignItems={{ sm: 'flex-start' }}
                    pl={{ sm: 4 }}
                  >
                    <FormControl
                      size="small"
                      sx={{ minWidth: 200, flex: 1 }}
                      disabled={!includeRequests}
                    >
                      <InputLabel>Requests mode</InputLabel>
                      <Select
                        label="Requests mode"
                        value={requestMode}
                        onChange={(e) =>
                          setRequestMode(e.target.value as SampleSeedMode)
                        }
                      >
                        {MODE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Requests per form"
                      type="number"
                      size="small"
                      disabled={!includeRequests}
                      value={requestsPerFormCount}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setRequestsPerFormCount(
                          Number.isFinite(n)
                            ? Math.max(0, Math.min(50, Math.floor(n)))
                            : 0,
                        );
                      }}
                      inputProps={{ min: 0, max: 50, step: 1 }}
                      sx={{ width: { xs: '100%', sm: 160 } }}
                      helperText={
                        includeRequests && requestsPerFormCount > 0
                          ? `≈ ${totalRequests} total across ${formCount} forms`
                          : ' '
                      }
                    />
                  </Stack>
                  <FormControlLabel
                    sx={{ display: 'flex', pl: { sm: 4 } }}
                    control={
                      <Checkbox
                        checked={includeNotifications}
                        disabled={!includeRequests}
                        onChange={(e) =>
                          setIncludeNotifications(e.target.checked)
                        }
                      />
                    }
                    label="Include in-app notifications with requests"
                  />
                </Box>

                {!canGenerate && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Check Include users and/or Include requests, and set a count
                    above zero.
                  </Alert>
                )}

                <Button
                  variant="contained"
                  startIcon={<DatasetIcon />}
                  disabled={!canGenerate}
                  onClick={() => {
                    const stats = seedSampleData({
                      includeUsers: willGenerateUsers,
                      userCount: willGenerateUsers ? userCount : 0,
                      userMode,
                      includeRequests: willGenerateRequests,
                      requestsPerForm: willGenerateRequests
                        ? defaultRequestsPerForm(requestsPerFormCount)
                        : defaultRequestsPerForm(0),
                      includeNotifications:
                        willGenerateRequests && includeNotifications,
                      mode: requestMode,
                    });
                    const parts: string[] = [];
                    if (willGenerateUsers) {
                      parts.push(
                        userMode === 'replace'
                          ? `Users: cleared ${stats.usersCleared}, created ${stats.usersAdded}`
                          : `Users: created ${stats.usersAdded}`,
                      );
                    }
                    if (willGenerateRequests) {
                      parts.push(
                        requestMode === 'replace'
                          ? `Requests: cleared ${stats.submissionsCleared}, created ${stats.submissionsAdded} (+${stats.notificationsAdded} notifications)`
                          : `Requests: created ${stats.submissionsAdded} (+${stats.notificationsAdded} notifications)`,
                      );
                    }
                    setMessage(
                      parts.length > 0
                        ? parts.join('. ') + '.'
                        : 'Nothing changed.',
                    );
                  }}
                >
                  Run Data Tools
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

        <Card
          elevation={1}
          sx={{
            borderColor: 'error.light',
            borderWidth: 1,
            borderStyle: 'solid',
          }}
        >
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

/** @deprecated Use DataToolsPage */
export const AdminToolsPage = DataToolsPage;
