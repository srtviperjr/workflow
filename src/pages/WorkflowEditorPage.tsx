import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useApp } from '../context/AppContext';
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas';
import type { WorkflowEdge, WorkflowNode } from '../types';

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isAdmin, updateWorkflow, getWorkflowById } = useApp();
  const navigate = useNavigate();
  const workflow = id ? getWorkflowById(id) : undefined;

  const [name, setName] = useState(workflow?.name ?? '');
  const [description, setDescription] = useState(workflow?.description ?? '');
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes ?? []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.edges ?? []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    setDescription(workflow.description);
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setSaved(false);
  }, [workflow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCanvasChange = useCallback(
    (n: WorkflowNode[], e: WorkflowEdge[]) => {
      setNodes(n);
      setEdges(e);
      setSaved(false);
    },
    [],
  );

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  if (!workflow) {
    return (
      <Box>
        <Alert severity="error">Workflow not found.</Alert>
        <Button component={RouterLink} to="/workflows" sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  const save = () => {
    updateWorkflow(workflow.id, {
      name: name.trim() || 'Untitled Workflow',
      description,
      nodes,
      edges,
    });
    setSaved(true);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
        mb={2}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/workflows')}
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Workflow Editor
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
          Save Workflow
        </Button>
      </Stack>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Workflow saved. New steps will appear automatically in request history.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <TextField
          label="Workflow name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
          fullWidth
        />
      </Stack>

      <WorkflowCanvas
        workflow={{ ...workflow, nodes, edges, name, description }}
        roles={data.roles}
        onChange={onCanvasChange}
      />
    </Box>
  );
}
