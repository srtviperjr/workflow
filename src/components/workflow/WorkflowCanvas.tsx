import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DecisionIcon from '@mui/icons-material/HelpOutline';
import StopIcon from '@mui/icons-material/Stop';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  StartNode,
  EndNode,
  StepNode,
  DecisionNode,
  NotificationNode,
} from './WorkflowNodes';
import type {
  ConditionOp,
  EdgeCondition,
  FormField,
  FormStatusOption,
  NotificationTemplate,
  Role,
  Workflow,
  WorkflowNodeType,
} from '../../types';
import { CONDITION_OP_LABELS } from '../../types';
import { createId } from '../../data/defaults';
import {
  fromFlowEdges,
  fromFlowNodes,
  toFlowEdges,
  toFlowNodes,
} from '../../utils/workflowEngine';
import { getActionStatusOptions } from '../../utils/formStatus';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  step: StepNode,
  decision: DecisionNode,
  notification: NotificationNode,
};

const VALUE_OPS: ConditionOp[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
];
const NO_VALUE_OPS: ConditionOp[] = [
  'empty',
  'not_empty',
  'changed',
  'unchanged',
];

interface Props {
  workflow: Workflow;
  roles: Role[];
  formFields: FormField[];
  /** Form status vocabulary — decision actions are chosen from these. */
  formStatusOptions?: FormStatusOption[];
  /** Templates dedicated to this workflow's form (no cross-form). */
  notificationTemplates?: NotificationTemplate[];
  onChange: (nodes: Workflow['nodes'], edges: Workflow['edges']) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  workflow,
  roles,
  formFields,
  formStatusOptions = [],
  notificationTemplates = [],
  onChange,
  readOnly,
}: Props) {
  const formTemplates = useMemo(
    () =>
      notificationTemplates.filter(
        (t) => workflow.formId && t.formId === workflow.formId,
      ),
    [notificationTemplates, workflow.formId],
  );

  const actionStatuses = useMemo(
    () =>
      getActionStatusOptions({
        id: workflow.formId ?? '',
        name: '',
        description: '',
        fields: formFields,
        workflowId: workflow.id,
        visibility: 'project',
        statusOptions: formStatusOptions,
        createdAt: '',
        updatedAt: '',
      }),
    [formStatusOptions, formFields, workflow.formId, workflow.id],
  );

  const enrichedNodes = useMemo((): Node[] => {
    return toFlowNodes(workflow.nodes).map((n) => {
      const data = n.data as {
        roleId?: string;
        notificationTemplateId?: string;
        decisionActions?: string[];
      };
      const tpl = formTemplates.find(
        (t) => t.id === data.notificationTemplateId,
      );
      const actionIds =
        data.decisionActions && data.decisionActions.length > 0
          ? data.decisionActions
          : actionStatuses.map((o) => o.id);
      const decisionActionMeta = actionIds.map((id) => {
        const opt = actionStatuses.find((o) => o.id === id) ??
          formStatusOptions.find((o) => o.id === id);
        return {
          id,
          label: opt?.label ?? id,
          kind: opt?.kind ?? ('neutral' as const),
        };
      });
      return {
        ...n,
        data: {
          ...n.data,
          roleName: roles.find((r) => r.id === data.roleId)?.name,
          notificationTemplateName: tpl?.name,
          decisionActionMeta:
            n.type === 'decision' ? decisionActionMeta : undefined,
        },
      };
    });
  }, [workflow.nodes, roles, formTemplates, actionStatuses, formStatusOptions]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(enrichedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toFlowEdges(workflow.edges),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edgeLabel, setEdgeLabel] = useState('');

  useEffect(() => {
    setNodes(enrichedNodes);
    setEdges(toFlowEdges(workflow.edges));
  }, [workflow.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(
    (ns: Node[], es: Edge[]) => {
      onChange(fromFlowNodes(ns), fromFlowEdges(es));
    },
    [onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const handleId = connection.sourceHandle ?? undefined;
      const statusOpt =
        handleId && handleId !== 'other'
          ? actionStatuses.find((o) => o.id === handleId) ??
            formStatusOptions.find((o) => o.id === handleId)
          : undefined;
      const label = statusOpt?.label;
      const statusOptionId = statusOpt?.id;
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: createId('edge'),
            label,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: Boolean(label),
            data: {
              routeMode: 'manual',
              conditions: [],
              statusOptionId,
            },
          },
          eds,
        );
        sync(nodes, next);
        return next;
      });
    },
    [nodes, readOnly, setEdges, sync, actionStatuses, formStatusOptions],
  );

  const addNode = (type: WorkflowNodeType) => {
    if (readOnly) return;
    const id = createId('node');
    const labels: Record<WorkflowNodeType, string> = {
      start: 'Start',
      end: 'End',
      step: 'New Step',
      decision: 'Decision',
      notification: 'Notification',
    };
    const defaultRole = roles[0]?.id;
    const defaultActions = actionStatuses.map((o) => o.id);
    const newNode: Node = {
      id,
      type,
      position: { x: 180 + Math.random() * 120, y: 80 + Math.random() * 200 },
      data: {
        label: labels[type],
        roleId:
          type === 'step' || type === 'decision' ? defaultRole : undefined,
        roleName: roles.find((r) => r.id === defaultRole)?.name,
        decisionMode: type === 'decision' ? 'manual' : undefined,
        decisionActions: type === 'decision' ? defaultActions : undefined,
        allowFieldEdits: false,
        notificationTemplateId:
          type === 'notification' ? formTemplates[0]?.id : undefined,
        notificationTemplateName:
          type === 'notification' ? formTemplates[0]?.name : undefined,
        notifyRoleIds:
          type === 'notification' && defaultRole ? [defaultRole] : undefined,
        notifySubmitter: type === 'notification' ? false : undefined,
      },
    };
    setNodes((nds) => {
      const next = [...nds, newNode];
      sync(next, edges);
      return next;
    });
    setSelectedId(id);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selectedEdge = edges.find((e) => e.id === selectedId);
  const selectedData = (selectedNode?.data ?? {}) as {
    label?: string;
    roleId?: string;
    description?: string;
    roleName?: string;
    decisionMode?: 'manual' | 'conditional';
    decisionActions?: string[];
    allowFieldEdits?: boolean;
    notificationTemplateId?: string;
    notificationTemplateName?: string;
    notifyRoleIds?: string[];
    notifySubmitter?: boolean;
  };
  const selectedEdgeData = (selectedEdge?.data ?? {}) as {
    routeMode?: 'manual' | 'condition';
    conditions?: EdgeCondition[];
    statusOptionId?: string;
  };
  const selectedEdgeSourceIsDecision =
    selectedEdge &&
    nodes.find((n) => n.id === selectedEdge.source)?.type === 'decision';
  const edgeConditions = selectedEdgeData.conditions ?? [];
  const edgeRouteMode = selectedEdgeData.routeMode ?? 'manual';

  const updateSelectedNode = (patch: Record<string, unknown>) => {
    if (!selectedNode || readOnly) return;
    setNodes((nds) => {
      const next = nds.map((n) =>
        n.id === selectedNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                ...patch,
                roleName: patch.roleId
                  ? roles.find((r) => r.id === patch.roleId)?.name
                  : (n.data as { roleName?: string }).roleName,
              },
            }
          : n,
      );
      sync(next, edges);
      return next;
    });
  };

  const updateSelectedEdge = (patch: {
    label?: string;
    routeMode?: 'manual' | 'condition';
    conditions?: EdgeCondition[];
    statusOptionId?: string;
    sourceHandle?: string;
  }) => {
    if (!selectedEdge || readOnly) return;
    setEdges((eds) => {
      const next = eds.map((e) => {
        if (e.id !== selectedEdge.id) return e;
        const statusOptionId =
          patch.statusOptionId !== undefined
            ? patch.statusOptionId
            : selectedEdgeData.statusOptionId;
        const data = {
          ...(e.data as object),
          routeMode: patch.routeMode ?? edgeRouteMode,
          conditions: patch.conditions ?? edgeConditions,
          statusOptionId,
        };
        const label = patch.label !== undefined ? patch.label : e.label;
        return {
          ...e,
          label,
          sourceHandle:
            patch.sourceHandle !== undefined
              ? patch.sourceHandle
              : e.sourceHandle,
          animated: Boolean(label) || data.routeMode === 'condition',
          data,
        };
      });
      sync(nodes, next);
      return next;
    });
  };

  const addCondition = () => {
    const fieldId = formFields[0]?.id ?? '';
    updateSelectedEdge({
      routeMode: 'condition',
      conditions: [
        ...edgeConditions,
        { fieldId, op: 'eq', value: '' },
      ],
    });
  };

  const updateCondition = (index: number, patch: Partial<EdgeCondition>) => {
    const next = edgeConditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    updateSelectedEdge({ routeMode: 'condition', conditions: next });
  };

  const removeCondition = (index: number) => {
    const next = edgeConditions.filter((_, i) => i !== index);
    updateSelectedEdge({
      routeMode: next.length > 0 ? 'condition' : 'manual',
      conditions: next,
    });
  };

  const deleteSelected = () => {
    if (readOnly || !selectedId) return;
    if (selectedNode?.type === 'start') return;
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== selectedId);
      setEdges((eds) => {
        const nextEdges = eds.filter(
          (e) =>
            e.id !== selectedId &&
            e.source !== selectedId &&
            e.target !== selectedId,
        );
        sync(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setSelectedId(null);
  };

  const fieldLabel = (fieldId: string) =>
    formFields.find((f) => f.id === fieldId)?.label ?? fieldId;

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          height: { xs: 480, md: 620 },
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            if (readOnly) return;
            onNodesChange(changes);
          }}
          onEdgesChange={(changes) => {
            if (readOnly) return;
            onEdgesChange(changes);
          }}
          onConnect={onConnect}
          onNodeClick={(_, n) => {
            setSelectedId(n.id);
            setEdgeLabel('');
          }}
          onEdgeClick={(_, e) => {
            setSelectedId(e.id);
            setEdgeLabel(typeof e.label === 'string' ? e.label : '');
          }}
          onNodeDragStop={() => sync(nodes, edges)}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background gap={16} color="#e8ddd4" />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'decision') return '#E25200';
              if (n.type === 'end') return '#2e7d4f';
              if (n.type === 'start') return '#B34200';
              if (n.type === 'notification') return '#6B6B6B';
              return '#F06A1A';
            }}
          />
          {!readOnly && (
            <Panel position="top-left">
              <ButtonGroup variant="contained" size="small" orientation="vertical">
                <Button startIcon={<AssignmentIcon />} onClick={() => addNode('step')}>
                  Step
                </Button>
                <Button
                  startIcon={<DecisionIcon />}
                  color="secondary"
                  onClick={() => addNode('decision')}
                >
                  Decision
                </Button>
                <Button
                  startIcon={<NotificationsNoneIcon />}
                  color="secondary"
                  onClick={() => addNode('notification')}
                >
                  Notify
                </Button>
                <Button startIcon={<StopIcon />} color="success" onClick={() => addNode('end')}>
                  End
                </Button>
                <Button startIcon={<AddIcon />} color="inherit" onClick={() => addNode('start')}>
                  Start
                </Button>
              </ButtonGroup>
            </Panel>
          )}
        </ReactFlow>
      </Paper>

      <Paper
        elevation={1}
        sx={{
          width: { xs: '100%', md: 320 },
          p: 2,
          display: { xs: selectedId ? 'block' : 'none', md: 'block' },
          height: 'fit-content',
          maxHeight: { md: 620 },
          overflow: 'auto',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Properties
        </Typography>
        {!selectedId && (
          <Typography variant="body2" color="text.secondary">
            Select a node or connection. Decision actions come from the form&apos;s
            status options (e.g. Approved, Rejected).
          </Typography>
        )}
        {selectedNode && (
          <Stack spacing={2}>
            <TextField
              label="Label"
              size="small"
              fullWidth
              disabled={readOnly}
              value={selectedData.label ?? ''}
              onChange={(e) => updateSelectedNode({ label: e.target.value })}
            />
            {selectedNode.type === 'decision' && (
              <FormControl size="small" fullWidth disabled={readOnly}>
                <InputLabel>Decision mode</InputLabel>
                <Select
                  label="Decision mode"
                  value={selectedData.decisionMode ?? 'manual'}
                  onChange={(e) =>
                    updateSelectedNode({ decisionMode: e.target.value })
                  }
                >
                  <MenuItem value="manual">Manual (actor chooses)</MenuItem>
                  <MenuItem value="conditional">
                    Conditional (form field rules)
                  </MenuItem>
                </Select>
              </FormControl>
            )}
            {selectedNode.type === 'decision' &&
              (selectedData.decisionMode ?? 'manual') === 'manual' && (
                <FormControl size="small" fullWidth disabled={readOnly}>
                  <InputLabel>Available actions</InputLabel>
                  <Select
                    multiple
                    label="Available actions"
                    value={
                      selectedData.decisionActions?.length
                        ? selectedData.decisionActions
                        : actionStatuses.map((o) => o.id)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      const ids =
                        typeof value === 'string' ? value.split(',') : value;
                      updateSelectedNode({ decisionActions: ids });
                    }}
                    renderValue={(selected) =>
                      (selected as string[])
                        .map(
                          (id) =>
                            actionStatuses.find((o) => o.id === id)?.label ?? id,
                        )
                        .join(', ')
                    }
                  >
                    {actionStatuses.length === 0 && (
                      <MenuItem value="" disabled>
                        Add statuses on the form first
                      </MenuItem>
                    )}
                    {actionStatuses.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" mt={0.5}>
                    These are the statuses the actor can set. Connect each
                    action handle to the next step.
                  </Typography>
                </FormControl>
              )}
            {(selectedNode.type === 'step' ||
              (selectedNode.type === 'decision' &&
                (selectedData.decisionMode ?? 'manual') === 'manual')) && (
              <FormControl size="small" fullWidth disabled={readOnly}>
                <InputLabel>Assigned Role</InputLabel>
                <Select
                  label="Assigned Role"
                  value={selectedData.roleId ?? ''}
                  onChange={(e) =>
                    updateSelectedNode({ roleId: e.target.value })
                  }
                >
                  {roles.length === 0 && (
                    <MenuItem value="" disabled>
                      No roles for this form
                    </MenuItem>
                  )}
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                      {r.scope === 'form' ? ' (form)' : ' (app)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {selectedNode.type === 'step' && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(selectedData.allowFieldEdits)}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelectedNode({
                        allowFieldEdits: e.target.checked,
                      })
                    }
                  />
                }
                label="Allow editing form fields at this step"
              />
            )}
            {selectedNode.type === 'notification' && (
              <Stack spacing={1.5}>
                <Typography variant="caption" color="text.secondary">
                  Fires when the workflow reaches this step (via a decision or
                  connection). Pick a notification created for this form, then
                  choose who receives it.
                </Typography>
                {!workflow.formId ? (
                  <Alert severity="warning">
                    Link this workflow to a form to choose its notifications.
                  </Alert>
                ) : formTemplates.length === 0 ? (
                  <Alert severity="info">
                    No notifications for this form yet. Create them under
                    Administration → Notifications, then return here.
                  </Alert>
                ) : (
                  <FormControl size="small" fullWidth disabled={readOnly}>
                    <InputLabel>Notification</InputLabel>
                    <Select
                      label="Notification"
                      value={selectedData.notificationTemplateId ?? ''}
                      onChange={(e) => {
                        const id = e.target.value as string;
                        const tpl = formTemplates.find((t) => t.id === id);
                        updateSelectedNode({
                          notificationTemplateId: id || undefined,
                          notificationTemplateName: tpl?.name,
                          label: tpl?.name || selectedData.label,
                        });
                      }}
                    >
                      {formTemplates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <FormControl size="small" fullWidth disabled={readOnly}>
                  <InputLabel>Notify roles</InputLabel>
                  <Select
                    multiple
                    label="Notify roles"
                    value={selectedData.notifyRoleIds ?? []}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateSelectedNode({
                        notifyRoleIds:
                          typeof value === 'string' ? value.split(',') : value,
                      });
                    }}
                    renderValue={(selected) =>
                      (selected as string[])
                        .map((id) => roles.find((r) => r.id === id)?.name ?? id)
                        .join(', ')
                    }
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                        {r.scope === 'form' ? ' (form)' : ' (app)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(selectedData.notifySubmitter)}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSelectedNode({
                          notifySubmitter: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Also notify the request submitter"
                />
              </Stack>
            )}
            <TextField
              label="Description"
              size="small"
              fullWidth
              multiline
              rows={2}
              disabled={readOnly}
              value={selectedData.description ?? ''}
              onChange={(e) =>
                updateSelectedNode({ description: e.target.value })
              }
            />
            {!readOnly && selectedNode.type !== 'start' && (
              <Button color="error" variant="outlined" onClick={deleteSelected}>
                Delete Node
              </Button>
            )}
          </Stack>
        )}
        {selectedEdge && (
          <Stack spacing={2}>
            {selectedEdgeSourceIsDecision &&
              edgeRouteMode === 'manual' && (
                <FormControl size="small" fullWidth disabled={readOnly}>
                  <InputLabel>Decision action</InputLabel>
                  <Select
                    label="Decision action"
                    value={selectedEdgeData.statusOptionId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value as string;
                      const opt = actionStatuses.find((o) => o.id === id);
                      setEdgeLabel(opt?.label ?? '');
                      updateSelectedEdge({
                        statusOptionId: id || undefined,
                        sourceHandle: id || undefined,
                        label: opt?.label,
                      });
                    }}
                  >
                    {actionStatuses.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" mt={0.5}>
                    Sets the request status when this route is taken.
                  </Typography>
                </FormControl>
              )}
            <TextField
              label="Route Label"
              size="small"
              fullWidth
              disabled={readOnly}
              value={edgeLabel}
              onChange={(e) => {
                setEdgeLabel(e.target.value);
                updateSelectedEdge({ label: e.target.value });
              }}
              helperText="Shown in history (defaults to the status label)"
            />
            <FormControl size="small" fullWidth disabled={readOnly}>
              <InputLabel>Route type</InputLabel>
              <Select
                label="Route type"
                value={edgeRouteMode}
                onChange={(e) => {
                  const mode = e.target.value as 'manual' | 'condition';
                  updateSelectedEdge({
                    routeMode: mode,
                    conditions:
                      mode === 'condition' && edgeConditions.length === 0
                        ? [
                            {
                              fieldId: formFields[0]?.id ?? '',
                              op: 'eq',
                              value: '',
                            },
                          ]
                        : edgeConditions,
                  });
                }}
              >
                <MenuItem value="manual">Manual outcome</MenuItem>
                <MenuItem value="condition">Form field condition</MenuItem>
              </Select>
            </FormControl>

            {edgeRouteMode === 'condition' && (
              <Box>
                <Typography variant="caption" fontWeight={700} display="block" mb={1}>
                  Conditions (all must match)
                </Typography>
                {formFields.length === 0 && (
                  <Typography variant="body2" color="warning.main" mb={1}>
                    Link a form to this workflow to pick fields.
                  </Typography>
                )}
                <Stack spacing={1.5}>
                  {edgeConditions.map((cond, index) => {
                    const field = formFields.find((f) => f.id === cond.fieldId);
                    const needsValue = !NO_VALUE_OPS.includes(cond.op);
                    return (
                      <Paper key={index} variant="outlined" sx={{ p: 1.25 }}>
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <FormControl size="small" fullWidth disabled={readOnly}>
                              <InputLabel>Field</InputLabel>
                              <Select
                                label="Field"
                                value={cond.fieldId}
                                onChange={(e) =>
                                  updateCondition(index, {
                                    fieldId: e.target.value,
                                  })
                                }
                              >
                                {formFields.map((f) => (
                                  <MenuItem key={f.id} value={f.id}>
                                    {f.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={readOnly}
                              onClick={() => removeCondition(index)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <FormControl size="small" fullWidth disabled={readOnly}>
                            <InputLabel>Operator</InputLabel>
                            <Select
                              label="Operator"
                              value={cond.op}
                              onChange={(e) =>
                                updateCondition(index, {
                                  op: e.target.value as ConditionOp,
                                })
                              }
                            >
                              {[...VALUE_OPS, ...NO_VALUE_OPS].map((op) => (
                                <MenuItem key={op} value={op}>
                                  {CONDITION_OP_LABELS[op]}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {needsValue &&
                            (field?.type === 'select' && field.options ? (
                              <FormControl size="small" fullWidth disabled={readOnly}>
                                <InputLabel>Value</InputLabel>
                                <Select
                                  label="Value"
                                  value={String(cond.value ?? '')}
                                  onChange={(e) =>
                                    updateCondition(index, {
                                      value: e.target.value,
                                    })
                                  }
                                >
                                  {field.options.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <TextField
                                size="small"
                                label="Value"
                                fullWidth
                                disabled={readOnly}
                                type={field?.type === 'number' ? 'number' : 'text'}
                                value={cond.value ?? ''}
                                onChange={(e) =>
                                  updateCondition(index, {
                                    value:
                                      field?.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  })
                                }
                              />
                            ))}
                          {(cond.op === 'changed' || cond.op === 'unchanged') && (
                            <Typography variant="caption" color="text.secondary">
                              Compares current {fieldLabel(cond.fieldId)} to the
                              value submitted on the form.
                            </Typography>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
                {!readOnly && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addCondition}
                    sx={{ mt: 1 }}
                    disabled={formFields.length === 0}
                  >
                    Add condition
                  </Button>
                )}
              </Box>
            )}

            {edgeRouteMode === 'condition' && edgeConditions.length > 0 && (
              <>
                <Divider />
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {edgeConditions.map((c, i) => (
                    <Chip
                      key={i}
                      size="small"
                      variant="outlined"
                      label={`${fieldLabel(c.fieldId)} ${CONDITION_OP_LABELS[c.op]}${
                        NO_VALUE_OPS.includes(c.op) ? '' : ` ${c.value ?? ''}`
                      }`}
                    />
                  ))}
                </Stack>
              </>
            )}

            {!readOnly && (
              <Button color="error" variant="outlined" onClick={deleteSelected}>
                Delete Connection
              </Button>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
