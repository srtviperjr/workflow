import { flushSync } from 'react-dom';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid2 as Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useApp } from '../context/AppContext';
import { createId } from '../data/defaults';
import { FORM_VISIBILITY_LABELS } from '../types';

/** Admin-only form design catalog. End users submit via /requests. */
export function FormsPage() {
  const { data, isAdmin, addForm, deleteForm, duplicateForm } = useApp();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/requests" replace />;
  }

  const createForm = () => {
    const form = addForm({
      name: 'New Form',
      description: '',
      fields: [
        {
          id: createId('field'),
          label: 'Request',
          type: 'textarea',
          required: true,
          placeholder: 'Enter details…',
        },
      ],
      workflowId: null,
      visibility: 'project',
    });
    navigate(`/forms/${form.id}/edit`);
  };

  const copyForm = (id: string) => {
    let nextId = '';
    flushSync(() => {
      const copy = duplicateForm(id);
      if (copy) nextId = copy.id;
    });
    if (nextId) navigate(`/forms/${nextId}/edit`);
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Forms
          </Typography>
          <Typography color="text.secondary">
            Design forms and their dedicated workflows (admin)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createForm}
        >
          Create Form
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {data.forms.map((f) => {
          const wf = data.workflows.find((w) => w.id === f.workflowId);
          const count = data.submissions.filter((s) => s.formId === f.id).length;
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
                    <Chip size="small" label={`${count} requests`} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {f.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {f.fields.length} field{f.fields.length !== 1 ? 's' : ''}
                    {wf
                      ? ` · Workflow: ${wf.name}`
                      : ' · Workflow missing (will be repaired)'}
                    {` · Visibility: ${FORM_VISIBILITY_LABELS[f.visibility ?? 'project']}`}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/forms/${f.id}/edit`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyForm(f.id)}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    startIcon={<GridOnIcon />}
                    component={RouterLink}
                    to={`/register/form/${f.id}`}
                  >
                    Register
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete form "${f.name}", its dedicated workflow, and its submissions?`,
                        )
                      )
                        deleteForm(f.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
