import type {
  AppData,
  AppNotification,
  ApprovalDelegation,
  FormDefinition,
  FormSubmission,
  FormVisibility,
  Project,
  Role,
  Workflow,
  WorkflowEdge,
} from '../types';
import { PROJECTS } from '../types';
import { createInitialData } from './defaults';
import { enforceFormWorkflowOneToOne } from './formWorkflowLink';

const STORAGE_KEY = 'jansen-workflows-data';

const VISIBILITIES: FormVisibility[] = ['own', 'company', 'project'];

function normalizeRole(role: Role): Role {
  return {
    ...role,
    adGroupNames: Array.isArray(role.adGroupNames) ? role.adGroupNames : [],
    scope: role.scope === 'form' ? 'form' : 'app',
    formIds: Array.isArray(role.formIds) ? role.formIds : [],
  };
}

function normalizeDelegation(d: ApprovalDelegation): ApprovalDelegation {
  return {
    ...d,
    scope: d.scope === 'workflows' ? 'workflows' : 'all',
    workflowIds: Array.isArray(d.workflowIds) ? d.workflowIds : [],
    durationDays:
      typeof d.durationDays === 'number' && d.durationDays > 0
        ? d.durationDays
        : 1,
    startDate: d.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: d.endDate ?? d.startDate ?? new Date().toISOString().slice(0, 10),
  };
}

function normalizeNotification(raw: AppNotification & { toEmails?: string[] }): AppNotification {
  return {
    id: raw.id,
    submissionId: raw.submissionId,
    formId: raw.formId,
    workflowId: raw.workflowId ?? null,
    nodeId: raw.nodeId,
    nodeLabel: raw.nodeLabel ?? 'Notification',
    toUserIds: Array.isArray(raw.toUserIds) ? raw.toUserIds : [],
    toUserNames: Array.isArray(raw.toUserNames)
      ? raw.toUserNames
      : Array.isArray(raw.toEmails)
        ? raw.toEmails
        : [],
    subject: raw.subject ?? '',
    body: raw.body ?? '',
    sentAt: raw.sentAt ?? new Date().toISOString(),
    triggeredByUserId: raw.triggeredByUserId,
    readByUserIds: Array.isArray(raw.readByUserIds) ? raw.readByUserIds : [],
  };
}

function normalizeProject(value: unknown): Project {
  if (typeof value === 'string' && (PROJECTS as readonly string[]).includes(value)) {
    return value as Project;
  }
  // Migrate legacy project names from earlier sample data
  const legacy: Record<string, Project> = {
    Jansen: 'JS1',
    'Olympic Dam': 'JS2',
    Spence: 'Operations',
    Corporate: 'Operations',
  };
  if (typeof value === 'string' && value in legacy) {
    return legacy[value];
  }
  return 'JS1';
}

function normalizeVisibility(value: unknown): FormVisibility {
  if (typeof value === 'string' && VISIBILITIES.includes(value as FormVisibility)) {
    return value as FormVisibility;
  }
  return 'project';
}

function normalizeForm(form: FormDefinition): FormDefinition {
  return {
    ...form,
    visibility: normalizeVisibility(form.visibility),
  };
}

function normalizeEdge(edge: WorkflowEdge): WorkflowEdge {
  return {
    ...edge,
    routeMode: edge.routeMode === 'condition' ? 'condition' : 'manual',
    conditions: Array.isArray(edge.conditions) ? edge.conditions : [],
  };
}

function normalizeWorkflow(workflow: Workflow, forms: AppData['forms']): Workflow {
  let formId = workflow.formId ?? null;
  if (!formId) {
    const linked = forms.find((f) => f.workflowId === workflow.id);
    formId = linked?.id ?? null;
  }
  return {
    ...workflow,
    formId,
    nodes: workflow.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        decisionMode:
          n.data.decisionMode === 'conditional' ? 'conditional' : 'manual',
      },
    })),
    edges: workflow.edges.map(normalizeEdge),
  };
}

function normalizeSubmission(sub: FormSubmission): FormSubmission {
  return {
    ...sub,
    baselineData:
      sub.baselineData && typeof sub.baselineData === 'object'
        ? sub.baselineData
        : { ...sub.data },
  };
}

function normalizeData(data: AppData): AppData {
  const rawForms = (data.forms ?? []).map(normalizeForm);
  const workflows = (data.workflows ?? []).map((w) =>
    normalizeWorkflow(w, rawForms),
  );

  // Keep form.workflowId in sync with workflow.formId when missing
  const syncedForms = rawForms.map((f) => {
    if (f.workflowId) return f;
    const owner = workflows.find((w) => w.formId === f.id);
    return owner ? { ...f, workflowId: owner.id } : f;
  });

  const users = (data.users ?? []).map((u) => ({
    ...u,
    project: normalizeProject(u.project),
  }));

  const normalized: AppData = {
    ...data,
    users,
    roles: (data.roles ?? []).map(normalizeRole),
    workflows,
    forms: syncedForms,
    submissions: (data.submissions ?? []).map(normalizeSubmission),
    delegations: (data.delegations ?? []).map(normalizeDelegation),
    notifications: (Array.isArray(data.notifications) ? data.notifications : []).map(
      (n) => normalizeNotification(n as AppNotification & { toEmails?: string[] }),
    ),
    version: Math.max(data.version ?? 1, 6),
  };

  // Each form must own exactly one workflow (repairs shared / missing links)
  return enforceFormWorkflowOneToOne(normalized);
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialData();
      saveData(initial);
      return initial;
    }
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    const initial = createInitialData();
    saveData(initial);
    return initial;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
