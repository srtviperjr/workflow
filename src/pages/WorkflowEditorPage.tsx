import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useApp } from '../context/AppContext';
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas';
import type { WorkflowEdge, WorkflowNode } from '../types';
import { rolesForForm } from '../utils/workflowEngine';

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isAdmin, updateWorkflow, getWorkflowById } = useApp();
  const navigate = useNavigate();
  const workflow = id ? getWorkflowById(id) : undefined;

  const [name, setName] = useState(workflow?.name ?? '');
  const [description, setDescription] = useState(workflow?.description ?? '');
  const [formId, setFormId] = useState<string>(workflow?.formId ?? '');
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes ?? []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.edges ?? []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    setDescription(workflow.description);
    setFormId(workflow.formId ?? '');
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

  const linkedForm = useMemo(
    () => data.forms.find((f) => f.id === formId),
    [data.forms, formId],
  );

  const availableRoles = useMemo(
    () => rolesForForm(data.roles, formId || null),
    [data.roles, formId],
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
      formId: formId || null,
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
        <FormControl fullWidth>
          <InputLabel>Related form</InputLabel>
          <Select
            label="Related form"
            value={formId}
            onChange={(e) => {
              setFormId(e.target.value);
              setSaved(false);
            }}
          >
            <MenuItem value="">
              <em>None (unassigned)</em>
            </MenuItem>
            {data.forms.map((f) => {
              const currentOwner = data.workflows.find(
                (w) => w.id === f.workflowId && w.id !== workflow.id,
              );
              return (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                  {f.id === workflow.formId
                    ? ' (current)'
                    : currentOwner
                      ? ` — moves from ${currentOwner.name}`
                      : ''}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Stack>

      {!formId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a related form to enable field-based decision conditions and
          form-scoped roles. Each form can only belong to one workflow — linking
          here moves the form from any previous workflow.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          This workflow is dedicated to the selected form (1:1). Field conditions
          and form-scoped roles use that form&apos;s definition.
        </Alert>
      )}

      <WorkflowCanvas
        workflow={{
          ...workflow,
          nodes,
          edges,
          name,
          description,
          formId: formId || null,
        }}
        roles={availableRoles}
        formFields={linkedForm?.fields ?? []}
        notificationTemplates={(data.notificationTemplates ?? []).filter(
          (t) => formId && t.formId === formId,
        )}
        onChange={onCanvasChange}
      />
    </Box>
  );
}
