import type {
  ApprovalDelegation,
  ConditionOp,
  EdgeCondition,
  AppNotification,
  FormDefinition,
  FormSubmission,
  HistoryEntry,
  Role,
  User,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
} from '../types';
import { createId } from '../data/defaults';
import type { Edge, Node } from '@xyflow/react';
import {
  fieldValueCompareKey,
  formatFieldDisplayValue,
  isEmptyFieldValue,
} from './formValues';
import type { FormFieldData } from '../types';
import { buildNotificationFromNode } from './notifications';

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
    animated: Boolean(e.label) || e.routeMode === 'condition',
    data: {
      routeMode: e.routeMode ?? 'manual',
      conditions: e.conditions ?? [],
    },
  }));
}

export function fromFlowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((n) => {
    const data = n.data as unknown as WorkflowNode['data'];
    return {
      id: n.id,
      type: (n.type ?? 'step') as WorkflowNodeType,
      position: n.position,
      data: {
        label: String(data.label ?? 'Step'),
        roleId: data.roleId,
        description: data.description,
        decisionMode:
          data.decisionMode === 'conditional' ? 'conditional' : 'manual',
        allowFieldEdits: Boolean(data.allowFieldEdits),
        notifyRoleIds: Array.isArray(data.notifyRoleIds)
          ? data.notifyRoleIds.filter((id): id is string => typeof id === 'string')
          : undefined,
        notifySubmitter: Boolean(data.notifySubmitter),
        notifySubject:
          typeof data.notifySubject === 'string'
            ? data.notifySubject
            : typeof data.emailSubject === 'string'
              ? data.emailSubject
              : undefined,
        notifyBody:
          typeof data.notifyBody === 'string'
            ? data.notifyBody
            : typeof data.emailBody === 'string'
              ? data.emailBody
              : undefined,
      },
    };
  });
}

export function fromFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => {
    const data = (e.data ?? {}) as {
      routeMode?: WorkflowEdge['routeMode'];
      conditions?: EdgeCondition[];
    };
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      routeMode: data.routeMode === 'condition' ? 'condition' : 'manual',
      conditions: Array.isArray(data.conditions) ? data.conditions : [],
    };
  });
}

function userDisplay(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

export function getStartNode(workflow: Workflow): WorkflowNode | undefined {
  return workflow.nodes.find((n) => n.type === 'start');
}

export function isConditionEdge(edge: WorkflowEdge): boolean {
  return (
    edge.routeMode === 'condition' ||
    (Array.isArray(edge.conditions) && edge.conditions.length > 0)
  );
}

export function evaluateCondition(
  condition: EdgeCondition,
  data: FormFieldData,
  baselineData: FormFieldData,
): boolean {
  const current = data[condition.fieldId];
  const baseline = baselineData[condition.fieldId];
  const op: ConditionOp = condition.op;

  const asString = (v: FormFieldData[string] | undefined) =>
    fieldValueCompareKey(v);
  const asDisplay = (v: FormFieldData[string] | undefined) =>
    formatFieldDisplayValue(v);
  const asNumber = (v: FormFieldData[string] | string | number | undefined) => {
    if (typeof v === 'object' && v !== null) return NaN;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  switch (op) {
    case 'empty':
      return isEmptyFieldValue(current);
    case 'not_empty':
      return !isEmptyFieldValue(current);
    case 'changed':
      return asString(current) !== asString(baseline);
    case 'unchanged':
      return asString(current) === asString(baseline);
    case 'eq':
      return asDisplay(current) === String(condition.value ?? '');
    case 'neq':
      return asDisplay(current) !== String(condition.value ?? '');
    case 'contains':
      return asDisplay(current)
        .toLowerCase()
        .includes(String(condition.value ?? '').toLowerCase());
    case 'gt':
      return asNumber(current) > asNumber(condition.value);
    case 'gte':
      return asNumber(current) >= asNumber(condition.value);
    case 'lt':
      return asNumber(current) < asNumber(condition.value);
    case 'lte':
      return asNumber(current) <= asNumber(condition.value);
    default:
      return false;
  }
}

export function edgeConditionsMatch(
  edge: WorkflowEdge,
  data: FormFieldData,
  baselineData: FormFieldData,
): boolean {
  const conditions = edge.conditions ?? [];
  if (conditions.length === 0) return false;
  return conditions.every((c) => evaluateCondition(c, data, baselineData));
}

export function getNextNodes(
  workflow: Workflow,
  nodeId: string,
  outcome?: string,
  submission?: Pick<FormSubmission, 'data' | 'baselineData'>,
): WorkflowNode[] {
  let edges = workflow.edges.filter((e) => e.source === nodeId);
  const sourceNode = workflow.nodes.find((n) => n.id === nodeId);

  if (
    sourceNode?.type === 'decision' &&
    sourceNode.data.decisionMode === 'conditional' &&
    submission
  ) {
    const matching = edges.filter(
      (e) =>
        isConditionEdge(e) &&
        edgeConditionsMatch(e, submission.data, submission.baselineData),
    );
    if (matching.length > 0) {
      edges = matching;
    } else {
      // Fall back to first non-condition edge, else first edge
      const fallback = edges.filter((e) => !isConditionEdge(e));
      edges = fallback.length > 0 ? fallback.slice(0, 1) : edges.slice(0, 1);
    }
  } else if (outcome) {
    const labeled = edges.filter((e) => {
      if (isConditionEdge(e) && sourceNode?.data.decisionMode === 'conditional') {
        return false;
      }
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

/** Manual outcomes only (for action buttons). */
export function getDecisionOutcomes(
  workflow: Workflow,
  nodeId: string,
): string[] {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (node?.data.decisionMode === 'conditional') return [];

  const edges = workflow.edges.filter(
    (e) => e.source === nodeId && !isConditionEdge(e),
  );
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

function resolveMatchedEdgeLabel(
  workflow: Workflow,
  fromId: string,
  toId: string,
  submission: Pick<FormSubmission, 'data' | 'baselineData'>,
): string | undefined {
  const edges = workflow.edges.filter(
    (e) => e.source === fromId && e.target === toId,
  );
  const matched = edges.find(
    (e) =>
      isConditionEdge(e) &&
      edgeConditionsMatch(e, submission.data, submission.baselineData),
  );
  return matched?.label ?? edges[0]?.label;
}

export interface AdvanceResult {
  submission: FormSubmission;
  notifications: AppNotification[];
}

export interface AdvanceContext {
  form?: FormDefinition | null;
  users?: User[];
  roles?: Role[];
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
    fieldData?: FormFieldData;
  },
  ctx: AdvanceContext = {},
): AdvanceResult {
  const current = workflow.nodes.find((n) => n.id === submission.currentNodeId);
  if (!current) return { submission, notifications: [] };

  const data = options.fieldData
    ? { ...submission.data, ...options.fieldData }
    : submission.data;
  const working: Pick<FormSubmission, 'data' | 'baselineData'> = {
    data,
    baselineData: submission.baselineData ?? { ...submission.data },
  };

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

  const notifications: AppNotification[] = [];
  let nextCandidates = getNextNodes(
    workflow,
    current.id,
    options.outcome,
    working,
  );

  if (current.type === 'start') {
    nextCandidates = getNextNodes(workflow, current.id, undefined, working);
  }

  let next = nextCandidates[0];
  let status = submission.status;
  let currentNodeId = next?.id ?? submission.currentNodeId;

  const workingSubmission: FormSubmission = {
    ...submission,
    data,
    baselineData: working.baselineData,
  };

  // Skip start nodes, fire notifications, auto-evaluate conditional decisions
  let guard = 0;
  while (next && guard < 30) {
    guard += 1;
    if (next.type === 'start') {
      nextCandidates = getNextNodes(workflow, next.id, undefined, working);
      next = nextCandidates[0];
      currentNodeId = next?.id ?? currentNodeId;
      continue;
    }

    if (next.type === 'notification') {
      if (ctx.form) {
        const note = buildNotificationFromNode(next, {
          form: ctx.form,
          submission: { ...workingSubmission, history },
          users: ctx.users ?? [],
          roles: ctx.roles ?? [],
          triggeredBy: user,
        });
        if (note) {
          notifications.push(note);
          const who =
            note.toUserNames.length > 0
              ? note.toUserNames.join(', ')
              : 'no matching recipients';
          history.push(
            createHistoryEntry(
              next,
              user,
              'Notification sent',
              undefined,
              `To: ${who} · ${note.subject}`,
            ),
          );
        }
      } else {
        history.push(
          createHistoryEntry(
            next,
            user,
            'Notification skipped',
            undefined,
            'Form definition missing',
          ),
        );
      }
      nextCandidates = getNextNodes(workflow, next.id, undefined, working);
      next = nextCandidates[0];
      currentNodeId = next?.id ?? currentNodeId;
      continue;
    }

    if (next.type === 'decision' && next.data.decisionMode === 'conditional') {
      const autoCandidates = getNextNodes(
        workflow,
        next.id,
        undefined,
        working,
      );
      const autoNext = autoCandidates[0];
      const outcomeLabel =
        resolveMatchedEdgeLabel(workflow, next.id, autoNext?.id ?? '', working) ??
        'Auto';
      history.push(
        createHistoryEntry(next, user, 'Conditional route', outcomeLabel),
      );
      next = autoNext;
      currentNodeId = next?.id ?? currentNodeId;
      continue;
    }

    break;
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
    submission: {
      ...submission,
      data,
      baselineData: working.baselineData,
      currentNodeId,
      status,
      history,
    },
    notifications,
  };
}

export function startSubmission(
  formId: string,
  formName: string,
  workflow: Workflow | null,
  user: User,
  fieldData: FormFieldData,
  ctx: AdvanceContext = {},
): AdvanceResult {
  const start = workflow ? getStartNode(workflow) : null;
  const submitStep =
    workflow?.nodes.find(
      (n) => n.type === 'step' && n.data.roleId === 'role-requestor',
    ) ??
    workflow?.nodes.find((n) => n.type === 'step') ??
    null;

  const history: HistoryEntry[] = [];
  const notifications: AppNotification[] = [];
  let currentNodeId: string | null = null;
  let status: FormSubmission['status'] = 'in_progress';
  const baselineData = { ...fieldData };
  const working = { data: fieldData, baselineData };

  const draftSubmission: FormSubmission = {
    id: createId('sub'),
    formId,
    formName,
    data: fieldData,
    baselineData,
    submittedBy: user.id,
    submittedAt: new Date().toISOString(),
    currentNodeId: null,
    status: 'in_progress',
    history: [],
    workflowId: workflow?.id ?? null,
  };

  if (workflow && start && submitStep) {
    history.push(createHistoryEntry(submitStep, user, 'Submitted'));
    let nexts = getNextNodes(workflow, submitStep.id, undefined, working);
    let next = nexts[0];

    let guard = 0;
    while (next && guard < 30) {
      guard += 1;

      if (next.type === 'notification') {
        if (ctx.form) {
          const note = buildNotificationFromNode(next, {
            form: ctx.form,
            submission: { ...draftSubmission, history },
            users: ctx.users ?? [],
            roles: ctx.roles ?? [],
            triggeredBy: user,
          });
          if (note) {
            notifications.push(note);
            const who =
              note.toUserNames.length > 0
                ? note.toUserNames.join(', ')
                : 'no matching recipients';
            history.push(
              createHistoryEntry(
                next,
                user,
                'Notification sent',
                undefined,
                `To: ${who} · ${note.subject}`,
              ),
            );
          }
        }
        nexts = getNextNodes(workflow, next.id, undefined, working);
        next = nexts[0];
        continue;
      }

      if (
        next.type === 'decision' &&
        next.data.decisionMode === 'conditional'
      ) {
        const autoNexts = getNextNodes(workflow, next.id, undefined, working);
        const autoNext = autoNexts[0];
        const outcomeLabel =
          resolveMatchedEdgeLabel(
            workflow,
            next.id,
            autoNext?.id ?? '',
            working,
          ) ?? 'Auto';
        history.push(
          createHistoryEntry(next, user, 'Conditional route', outcomeLabel),
        );
        next = autoNext;
        continue;
      }

      break;
    }

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
    submission: {
      ...draftSubmission,
      currentNodeId,
      status,
      history,
    },
    notifications,
  };
}

export function roleAppliesToForm(role: Role, formId: string | null | undefined): boolean {
  if (role.scope !== 'form') return true;
  if (!formId) return false;
  return role.formIds.includes(formId);
}

/** Calendar date YYYY-MM-DD in local time */
export function toDateOnly(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inclusive end date after durationDays starting on startDate (YYYY-MM-DD). */
export function endDateFromDuration(startDate: string, durationDays: number): string {
  const days = Math.max(1, Math.floor(durationDays));
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() + days - 1);
  return toDateOnly(start);
}

export function isDelegationActive(
  delegation: ApprovalDelegation,
  asOf: string = toDateOnly(),
): boolean {
  return delegation.startDate <= asOf && asOf <= delegation.endDate;
}

export function delegationCoversWorkflow(
  delegation: ApprovalDelegation,
  workflowId: string | null | undefined,
): boolean {
  if (delegation.scope === 'all') return true;
  if (!workflowId) return false;
  return delegation.workflowIds.includes(workflowId);
}

export function getActiveDelegationsForActor(
  actorUserId: string,
  workflowId: string | null | undefined,
  delegations: ApprovalDelegation[],
  asOf: string = toDateOnly(),
): ApprovalDelegation[] {
  return delegations.filter(
    (d) =>
      d.toUserId === actorUserId &&
      isDelegationActive(d, asOf) &&
      delegationCoversWorkflow(d, workflowId),
  );
}

/**
 * Additive role set for a user: their own roles plus any active
 * delegators' roles that cover the given workflow. Never removes roles.
 */
export function getEffectiveRoleIds(
  user: User,
  workflowId: string | null | undefined,
  delegations: ApprovalDelegation[],
  users: User[],
  asOf: string = toDateOnly(),
): string[] {
  const roleIds = new Set(user.roleIds);
  const active = getActiveDelegationsForActor(
    user.id,
    workflowId,
    delegations,
    asOf,
  );
  for (const d of active) {
    const fromUser = users.find((u) => u.id === d.fromUserId);
    if (!fromUser) continue;
    for (const roleId of fromUser.roleIds) {
      roleIds.add(roleId);
    }
  }
  return [...roleIds];
}

function userHasNodeAccess(
  user: User,
  node: WorkflowNode,
  roles: Role[],
  formId?: string | null,
  roleIds: string[] = user.roleIds,
): boolean {
  if (roleIds.includes('role-admin')) return true;
  if (node.type === 'decision' && node.data.decisionMode === 'conditional') {
    return false;
  }
  if (!node.data.roleId) return true;
  if (!roleIds.includes(node.data.roleId)) return false;
  const role = roles.find((r) => r.id === node.data.roleId);
  if (!role) return true;
  return roleAppliesToForm(role, formId);
}

/** Workflows where the user can act on at least one step/decision (own roles). */
export function workflowsAccessibleToUser(
  user: User,
  workflows: Workflow[],
  roles: Role[],
): Workflow[] {
  if (user.roleIds.includes('role-admin')) return [...workflows];
  return workflows.filter((wf) =>
    wf.nodes.some(
      (node) =>
        (node.type === 'step' || node.type === 'decision') &&
        userHasNodeAccess(user, node, roles, wf.formId),
    ),
  );
}

export interface ActPermissionContext {
  workflowId?: string | null;
  delegations?: ApprovalDelegation[];
  users?: User[];
}

export function canUserActOnNode(
  user: User,
  node: WorkflowNode,
  roles: Role[] = [],
  formId?: string | null,
  ctx: ActPermissionContext = {},
): boolean {
  const effectiveRoleIds = getEffectiveRoleIds(
    user,
    ctx.workflowId,
    ctx.delegations ?? [],
    ctx.users ?? [],
  );
  return userHasNodeAccess(user, node, roles, formId, effectiveRoleIds);
}

/** Delegator whose authority the actor is using for this node, if any */
export function getDelegationSource(
  actor: User,
  node: WorkflowNode,
  roles: Role[],
  formId: string | null | undefined,
  ctx: ActPermissionContext,
): User | null {
  // Own permissions take precedence — delegation is additive only
  if (userHasNodeAccess(actor, node, roles, formId)) return null;
  const users = ctx.users ?? [];
  const active = getActiveDelegationsForActor(
    actor.id,
    ctx.workflowId,
    ctx.delegations ?? [],
  );
  for (const d of active) {
    const fromUser = users.find((u) => u.id === d.fromUserId);
    if (fromUser && userHasNodeAccess(fromUser, node, roles, formId)) {
      return fromUser;
    }
  }
  return null;
}

/** Roles available for assignment on a workflow tied to a form */
export function rolesForForm(roles: Role[], formId: string | null | undefined): Role[] {
  return roles.filter(
    (r) => r.scope === 'app' || (formId != null && r.formIds.includes(formId)),
  );
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
