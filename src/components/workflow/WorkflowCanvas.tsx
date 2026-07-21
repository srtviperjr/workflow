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
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
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
import {
  BUILTIN_TEMPLATE_TOKENS,
  fieldToken,
} from '../../utils/notifications';

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
  onChange: (nodes: Workflow['nodes'], edges: Workflow['edges']) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  workflow,
  roles,
  formFields,
  onChange,
  readOnly,
}: Props) {
  const enrichedNodes = useMemo((): Node[] => {
    return toFlowNodes(workflow.nodes).map((n) => ({
      ...n,
      data: {
        ...n.data,
        roleName: roles.find(
          (r) => r.id === (n.data as { roleId?: string }).roleId,
        )?.name,
      },
    }));
  }, [workflow.nodes, roles]);

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
      const label =
        connection.sourceHandle === 'approve'
          ? 'Approve'
          : connection.sourceHandle === 'reject'
            ? 'Reject'
            : undefined;
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: createId('edge'),
            label,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: Boolean(label),
            data: { routeMode: 'manual', conditions: [] },
          },
          eds,
        );
        sync(nodes, next);
        return next;
      });
    },
    [nodes, readOnly, setEdges, sync],
  );

  const addNode = (type: WorkflowNodeType) => {
    if (readOnly) return;
    const id = createId('node');
    const labels: Record<WorkflowNodeType, string> = {
      start: 'Start',
      end: 'End',
      step: 'New Step',
      decision: 'Decision',
      notification: 'Email Notification',
    };
    const defaultRole = roles[0]?.id;
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
        allowFieldEdits: false,
        notifyRoleIds: type === 'notification' && defaultRole ? [defaultRole] : [],
        emailSubject:
          type === 'notification' ? 'Update on {{formName}}' : undefined,
        emailBody:
          type === 'notification'
            ? 'Hello,\n\nA request was updated.\n\nForm: {{formName}}\nRequest: {{requestId}}\n\nRegards'
            : undefined,
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
    allowFieldEdits?: boolean;
    notifyRoleIds?: string[];
    emailSubject?: string;
    emailBody?: string;
  };
  const selectedEdgeData = (selectedEdge?.data ?? {}) as {
    routeMode?: 'manual' | 'condition';
    conditions?: EdgeCondition[];
  };
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
  }) => {
    if (!selectedEdge || readOnly) return;
    setEdges((eds) => {
      const next = eds.map((e) => {
        if (e.id !== selectedEdge.id) return e;
        const data = {
          ...(e.data as object),
          routeMode: patch.routeMode ?? edgeRouteMode,
          conditions: patch.conditions ?? edgeConditions,
        };
        const label = patch.label !== undefined ? patch.label : e.label;
        return {
          ...e,
          label,
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
          <Background gap={16} color="#c5d6d7" />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'decision') return '#c45c26';
              if (n.type === 'end') return '#2e7d4f';
              if (n.type === 'start') return '#0d7377';
              if (n.type === 'notification') return '#9c27b0';
              return '#14919b';
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
                  startIcon={<EmailOutlinedIcon />}
                  sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
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
            Select a node or connection. Decision routes can be manual
            (Approve/Reject) or based on form field values / changes.
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
                  Sent automatically when the workflow reaches this step.
                  Recipients are users with the selected roles (form-scoped
                  roles only apply on their linked forms).
                </Typography>
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
                <TextField
                  label="Email subject"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  value={selectedData.emailSubject ?? ''}
                  onChange={(e) =>
                    updateSelectedNode({ emailSubject: e.target.value })
                  }
                  helperText="Use {{tokens}} for dynamic values"
                />
                <TextField
                  label="Email body"
                  size="small"
                  fullWidth
                  multiline
                  minRows={5}
                  disabled={readOnly}
                  value={selectedData.emailBody ?? ''}
                  onChange={(e) =>
                    updateSelectedNode({ emailBody: e.target.value })
                  }
                />
                <Box>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                    Insert token
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {BUILTIN_TEMPLATE_TOKENS.map((t) => (
                      <Chip
                        key={t.token}
                        size="small"
                        label={t.label}
                        onClick={() => {
                          if (readOnly) return;
                          updateSelectedNode({
                            emailBody: `${selectedData.emailBody ?? ''}${t.token}`,
                          });
                        }}
                        sx={{ cursor: readOnly ? 'default' : 'pointer' }}
                      />
                    ))}
                    {formFields.map((f) => (
                      <Chip
                        key={f.id}
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={f.label}
                        onClick={() => {
                          if (readOnly) return;
                          updateSelectedNode({
                            emailBody: `${selectedData.emailBody ?? ''}${fieldToken(f)}`,
                          });
                        }}
                        sx={{ cursor: readOnly ? 'default' : 'pointer' }}
                      />
                    ))}
                  </Stack>
                </Box>
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
              helperText="Shown in history (e.g. Approve, High priority)"
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
