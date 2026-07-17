import type {
  FormSubmission,
  HistoryEntry,
  User,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
} from '../types';
import { createId } from '../data/defaults';
import type { Edge, Node } from '@xyflow/react';

export function toFlowNodes(nodes: WorkflowNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n.data },
  }));
}

export function toFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: Boolean(e.label),
  }));
}

export function fromFlowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.type ?? 'step') as WorkflowNodeType,
    position: n.position,
    data: {
      label: String((n.data as { label?: string }).label ?? 'Step'),
      roleId: (n.data as { roleId?: string }).roleId,
      description: (n.data as { description?: string }).description,
    },
  }));
}

export function fromFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === 'string' ? e.label : undefined,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
}

function userDisplay(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

export function getStartNode(workflow: Workflow): WorkflowNode | undefined {
  return workflow.nodes.find((n) => n.type === 'start');
}

export function getNextNodes(
  workflow: Workflow,
  nodeId: string,
  outcome?: string,
): WorkflowNode[] {
  let edges = workflow.edges.filter((e) => e.source === nodeId);

  if (outcome) {
    const labeled = edges.filter((e) => {
      const label = (e.label ?? '').toLowerCase();
      const handle = (e.sourceHandle ?? '').toLowerCase();
      const target = outcome.toLowerCase();
      return label === target || handle === target;
    });
    if (labeled.length > 0) edges = labeled;
  }

  return edges
    .map((e) => workflow.nodes.find((n) => n.id === e.target))
    .filter(Boolean) as WorkflowNode[];
}

export function getDecisionOutcomes(
  workflow: Workflow,
  nodeId: string,
): string[] {
  const edges = workflow.edges.filter((e) => e.source === nodeId);
  const labels = edges
    .map((e) => e.label || e.sourceHandle || 'Continue')
    .filter(Boolean);
  return [...new Set(labels)];
}

export function createHistoryEntry(
  node: WorkflowNode,
  user: User,
  action: string,
  outcome?: string,
  comment?: string,
): HistoryEntry {
  return {
    id: createId('hist'),
    stepId: node.id,
    stepLabel: node.data.label,
    stepType: node.type,
    userId: user.id,
    userName: userDisplay(user),
    action,
    outcome,
    comment,
    timestamp: new Date().toISOString(),
  };
}

/** Advance submission from current node through automatic hops until a user step/decision/end. */
export function advanceSubmission(
  submission: FormSubmission,
  workflow: Workflow,
  user: User,
  options: {
    action: string;
    outcome?: string;
    comment?: string;
    fieldData?: Record<string, string | number>;
  },
): FormSubmission {
  const current = workflow.nodes.find((n) => n.id === submission.currentNodeId);
  if (!current) return submission;

  const history = [
    ...submission.history,
    createHistoryEntry(
      current,
      user,
      options.action,
      options.outcome,
      options.comment,
    ),
  ];

  let nextCandidates = getNextNodes(
    workflow,
    current.id,
    options.outcome,
  );

  // If at start, move to first real step
  if (current.type === 'start') {
    nextCandidates = getNextNodes(workflow, current.id);
  }

  let next = nextCandidates[0];
  let status = submission.status;
  let currentNodeId = next?.id ?? submission.currentNodeId;

  // Skip through start nodes if somehow landed there
  while (next && next.type === 'start') {
    nextCandidates = getNextNodes(workflow, next.id);
    next = nextCandidates[0];
    currentNodeId = next?.id ?? currentNodeId;
  }

  if (next?.type === 'end') {
    history.push(
      createHistoryEntry(next, user, 'Reached end', options.outcome),
    );
    currentNodeId = next.id;
    const label = next.data.label.toLowerCase();
    status = label.includes('reject') ? 'rejected' : 'completed';
  } else if (next) {
    currentNodeId = next.id;
    status = 'in_progress';
  }

  return {
    ...submission,
    data: options.fieldData
      ? { ...submission.data, ...options.fieldData }
      : submission.data,
    currentNodeId,
    status,
    history,
  };
}

export function startSubmission(
  formId: string,
  formName: string,
  workflow: Workflow | null,
  user: User,
  fieldData: Record<string, string | number>,
): FormSubmission {
  const start = workflow ? getStartNode(workflow) : null;
  const submitStep =
    workflow?.nodes.find(
      (n) => n.type === 'step' && n.data.roleId === 'role-requestor',
    ) ??
    workflow?.nodes.find((n) => n.type === 'step') ??
    null;

  const history: HistoryEntry[] = [];
  let currentNodeId: string | null = null;
  let status: FormSubmission['status'] = 'in_progress';

  if (workflow && start && submitStep) {
    // Record submit on the submit step, then advance to next
    history.push(
      createHistoryEntry(submitStep, user, 'Submitted'),
    );
    const nexts = getNextNodes(workflow, submitStep.id);
    const next = nexts[0];
    if (next) {
      currentNodeId = next.id;
      if (next.type === 'end') {
        history.push(createHistoryEntry(next, user, 'Reached end'));
        status = next.data.label.toLowerCase().includes('reject')
          ? 'rejected'
          : 'completed';
      }
    } else {
      currentNodeId = submitStep.id;
    }
  } else if (!workflow) {
    status = 'completed';
    currentNodeId = null;
    history.push({
      id: createId('hist'),
      stepId: 'none',
      stepLabel: 'Submit',
      stepType: 'step',
      userId: user.id,
      userName: userDisplay(user),
      action: 'Submitted (no workflow)',
      timestamp: new Date().toISOString(),
    });
  }

  return {
    id: createId('sub'),
    formId,
    formName,
    data: fieldData,
    submittedBy: user.id,
    submittedAt: new Date().toISOString(),
    currentNodeId,
    status,
    history,
    workflowId: workflow?.id ?? null,
  };
}

export function canUserActOnNode(user: User, node: WorkflowNode): boolean {
  if (user.roleIds.includes('role-admin')) return true;
  if (!node.data.roleId) return true;
  return user.roleIds.includes(node.data.roleId);
}

export function getOrderedWorkflowSteps(workflow: Workflow): WorkflowNode[] {
  const start = getStartNode(workflow);
  if (!start) return workflow.nodes.filter((n) => n.type !== 'start');

  const visited = new Set<string>();
  const order: WorkflowNode[] = [];
  const queue = [start.id];

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = workflow.nodes.find((n) => n.id === id);
    if (node && node.type !== 'start') order.push(node);
    const outs = workflow.edges
      .filter((e) => e.source === id)
      .map((e) => e.target);
    queue.push(...outs);
  }

  // include any disconnected nodes
  for (const n of workflow.nodes) {
    if (!visited.has(n.id) && n.type !== 'start') order.push(n);
  }

  return order;
}

/** Build dynamic history rows: all workflow steps + filled history entries */
export function buildDynamicHistoryView(
  workflow: Workflow | null,
  submission: FormSubmission,
): Array<{
  stepId: string;
  stepLabel: string;
  stepType: WorkflowNodeType;
  entry?: HistoryEntry;
  pending: boolean;
  current: boolean;
}> {
  if (!workflow) {
    return submission.history.map((h) => ({
      stepId: h.stepId,
      stepLabel: h.stepLabel,
      stepType: h.stepType,
      entry: h,
      pending: false,
      current: false,
    }));
  }

  const steps = getOrderedWorkflowSteps(workflow);
  const byStep = new Map<string, HistoryEntry[]>();
  for (const h of submission.history) {
    const list = byStep.get(h.stepId) ?? [];
    list.push(h);
    byStep.set(h.stepId, list);
  }

  return steps.map((step) => {
    const entries = byStep.get(step.id) ?? [];
    const entry = entries[entries.length - 1];
    return {
      stepId: step.id,
      stepLabel: step.data.label,
      stepType: step.type,
      entry,
      pending: !entry && submission.currentNodeId !== step.id,
      current: submission.currentNodeId === step.id && !entry,
    };
  });
}
