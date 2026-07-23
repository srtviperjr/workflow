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
import {
  confirmDiscardUnsaved,
  useUnsavedChangesGuard,
} from '../hooks/useUnsavedChangesGuard';
import { clearCreateDefaultOnFocus } from '../utils/clearCreateDefault';
import {
  clearEditorDraft,
  isEditorDraft,
} from '../utils/editorDrafts';
import type { WorkflowEdge, WorkflowNode } from '../types';
import { rolesForForm } from '../utils/workflowEngine';
import { defaultWorkflowName } from '../data/defaults';

function shouldReplaceWorkflowName(current: string): boolean {
  const t = current.trim();
  return (
    !t ||
    t === 'New Workflow' ||
    t === 'Untitled Workflow' ||
    / Workflow$/i.test(t)
  );
}

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isAdmin, updateWorkflow, deleteWorkflow, getWorkflowById } =
    useApp();
  const navigate = useNavigate();
  const workflow = id ? getWorkflowById(id) : undefined;
  const isDraft = Boolean(id && isEditorDraft('workflow', id));

  const [name, setName] = useState(workflow?.name ?? '');
  const [description, setDescription] = useState(workflow?.description ?? '');
  const [formId, setFormId] = useState<string>(workflow?.formId ?? '');
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes ?? []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.edges ?? []);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setName(workflow.name);
    setDescription(workflow.description);
    setFormId(workflow.formId ?? '');
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setSaved(false);
    setDirty(false);
  }, [workflow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const discardUnsaved = useCallback(() => {
    if (!id || !isEditorDraft('workflow', id)) return;
    clearEditorDraft('workflow', id);
    deleteWorkflow(id);
  }, [id, deleteWorkflow]);

  const blockLeave = dirty || isDraft;
  const { allowNextNavigation } = useUnsavedChangesGuard({
    when: blockLeave,
    onDiscard: discardUnsaved,
  });

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const onCanvasChange = useCallback((n: WorkflowNode[], e: WorkflowEdge[]) => {
    setNodes(n);
    setEdges(e);
    setDirty(true);
    setSaved(false);
  }, []);

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
      name:
        name.trim() ||
        (linkedForm
          ? defaultWorkflowName(linkedForm.name)
          : 'Untitled Workflow'),
      description,
      formId: formId || null,
      nodes,
      edges,
    });
    clearEditorDraft('workflow', workflow.id);
    setSaved(true);
    setDirty(false);
  };

  const goBack = () => {
    if (!confirmDiscardUnsaved(blockLeave, discardUnsaved)) return;
    allowNextNavigation();
    navigate('/workflows');
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
          <Button startIcon={<ArrowBackIcon />} onClick={goBack}>
            Back
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Workflow Editor
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
          Save
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
          onFocus={() =>
            clearCreateDefaultOnFocus(name, setName, markDirty)
          }
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Related form</InputLabel>
          <Select
            label="Related form"
            value={formId}
            onChange={(e) => {
<<<<<<< HEAD
              const nextId = e.target.value;
              setFormId(nextId);
              const form = data.forms.find((f) => f.id === nextId);
              if (form && shouldReplaceWorkflowName(name)) {
                setName(defaultWorkflowName(form.name));
              }
              setSaved(false);
=======
              setFormId(e.target.value);
              markDirty();
>>>>>>> origin/cursor/status-reorder-field-layout-7657
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
        formStatusOptions={linkedForm?.statusOptions ?? []}
        notificationTemplates={(data.notificationTemplates ?? []).filter(
          (t) => formId && t.formId === formId,
        )}
        onChange={onCanvasChange}
      />
    </Box>
  );
}
