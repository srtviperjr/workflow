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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DecisionIcon from '@mui/icons-material/HelpOutline';
import StopIcon from '@mui/icons-material/Stop';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  StartNode,
  EndNode,
  StepNode,
  DecisionNode,
} from './WorkflowNodes';
import type { Role, Workflow, WorkflowNodeType } from '../../types';
import { createId } from '../../data/defaults';
import {
  fromFlowEdges,
  fromFlowNodes,
  toFlowEdges,
  toFlowNodes,
} from '../../utils/workflowEngine';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  step: StepNode,
  decision: DecisionNode,
};

interface Props {
  workflow: Workflow;
  roles: Role[];
  onChange: (nodes: Workflow['nodes'], edges: Workflow['edges']) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({ workflow, roles, onChange, readOnly }: Props) {
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
    };
    const newNode: Node = {
      id,
      type,
      position: { x: 180 + Math.random() * 120, y: 80 + Math.random() * 200 },
      data: {
        label: labels[type],
        roleId: type === 'step' || type === 'decision' ? 'role-manager' : undefined,
        roleName: roles.find((r) => r.id === 'role-manager')?.name,
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
  };

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

  const updateSelectedEdge = (label: string) => {
    if (!selectedEdge || readOnly) return;
    setEdges((eds) => {
      const next = eds.map((e) =>
        e.id === selectedEdge.id ? { ...e, label, animated: Boolean(label) } : e,
      );
      sync(nodes, next);
      return next;
    });
  };

  const deleteSelected = () => {
    if (readOnly || !selectedId) return;
    if (selectedNode?.type === 'start') return;
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== selectedId);
      setEdges((eds) => {
        const nextEdges = eds.filter(
          (e) => e.id !== selectedId && e.source !== selectedId && e.target !== selectedId,
        );
        sync(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setSelectedId(null);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
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
          width: { xs: '100%', md: 280 },
          p: 2,
          display: { xs: selectedId ? 'block' : 'none', md: 'block' },
          height: 'fit-content',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Properties
        </Typography>
        {!selectedId && (
          <Typography variant="body2" color="text.secondary">
            Select a node or connection to edit. Drag from decision handles to
            route Approve / Reject outcomes.
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
            {(selectedNode.type === 'step' || selectedNode.type === 'decision') && (
              <FormControl size="small" fullWidth disabled={readOnly}>
                <InputLabel>Assigned Role</InputLabel>
                <Select
                  label="Assigned Role"
                  value={selectedData.roleId ?? ''}
                  onChange={(e) => updateSelectedNode({ roleId: e.target.value })}
                >
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Description"
              size="small"
              fullWidth
              multiline
              rows={2}
              disabled={readOnly}
              value={selectedData.description ?? ''}
              onChange={(e) => updateSelectedNode({ description: e.target.value })}
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
              label="Route Label (outcome)"
              size="small"
              fullWidth
              disabled={readOnly}
              value={edgeLabel}
              onChange={(e) => {
                setEdgeLabel(e.target.value);
                updateSelectedEdge(e.target.value);
              }}
              helperText="e.g. Approve, Reject"
            />
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
