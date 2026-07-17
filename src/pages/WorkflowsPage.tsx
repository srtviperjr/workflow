import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Stack,
  Typography,
  Grid2 as Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import { createId } from '../data/defaults';

export function WorkflowsPage() {
  const { data, isAdmin, addWorkflow, deleteWorkflow } = useApp();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const createBlank = () => {
    const startId = createId('node');
    const endId = createId('node');
    const wf = addWorkflow({
      name: 'New Workflow',
      description: '',
      nodes: [
        {
          id: startId,
          type: 'start',
          position: { x: 250, y: 0 },
          data: { label: 'Start' },
        },
        {
          id: endId,
          type: 'end',
          position: { x: 250, y: 200 },
          data: { label: 'Complete' },
        },
      ],
      edges: [
        {
          id: createId('edge'),
          source: startId,
          target: endId,
        },
      ],
    });
    navigate(`/workflows/${wf.id}`);
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
            Workflows
          </Typography>
          <Typography color="text.secondary">
            Visual flowchart editor with decision routing
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createBlank}
        >
          New Workflow
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {data.workflows.map((wf) => {
          const attached = data.forms.filter((f) => f.workflowId === wf.id);
          return (
            <Grid key={wf.id} size={{ xs: 12, md: 6 }}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>
                    {wf.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {wf.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {wf.nodes.length} nodes · {wf.edges.length} connections
                    {attached.length > 0 &&
                      ` · Used by ${attached.map((f) => f.name).join(', ')}`}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/workflows/${wf.id}`}
                  >
                    Edit
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (confirm(`Delete workflow "${wf.name}"?`))
                        deleteWorkflow(wf.id);
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
