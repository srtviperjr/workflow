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
  Typography,
} from '@mui/material';
import DatasetIcon from '@mui/icons-material/Dataset';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useApp } from '../context/AppContext';

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

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

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
                  Adds sample users across companies and sample requests for
                  existing forms, without removing current data.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<DatasetIcon />}
                  onClick={() => {
                    seedSampleData();
                    setMessage(
                      'Sample users and requests added alongside existing data.',
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
                  admin user, the Standard Approval workflow, and Simple Request
                  form. All custom data will be lost.
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
