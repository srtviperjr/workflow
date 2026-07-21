import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid2 as Grid,
  Stack,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useApp } from '../context/AppContext';

/**
 * End-user catalog of forms available to submit.
 * Admin form design stays under /forms.
 */
export function RequestsPage() {
  const { data, currentUser } = useApp();

  // Anyone signed in can start a request on any published form.
  // (Submission visibility still controls who sees completed/pending items.)
  const forms = data.forms;

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Requests
        </Typography>
        <Typography color="text.secondary">
          Choose a form to submit a new request
          {currentUser
            ? ` as ${currentUser.firstName} ${currentUser.lastName}`
            : ''}
          .
        </Typography>
      </Box>

      {forms.length === 0 ? (
        <Typography color="text.secondary">
          No forms are available yet. Ask an admin to create one.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {forms.map((f) => {
            const mine = currentUser
              ? data.submissions.filter(
                  (s) =>
                    s.formId === f.id && s.submittedBy === currentUser.id,
                ).length
              : 0;
            return (
              <Grid key={f.id} size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Typography variant="h6" fontWeight={700}>
                        {f.name}
                      </Typography>
                      {mine > 0 && (
                        <Chip
                          size="small"
                          label={`${mine} of yours`}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {f.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.fields.length} field
                      {f.fields.length !== 1 ? 's' : ''}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SendIcon />}
                      component={RouterLink}
                      to={`/forms/${f.id}/submit`}
                      disabled={!currentUser}
                    >
                      Submit request
                    </Button>
                    <Button
                      size="small"
                      startIcon={<GridOnIcon />}
                      component={RouterLink}
                      to={`/register/form/${f.id}`}
                    >
                      View register
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
