import type {
  AppData,
  AppNotification,
  ApprovalDelegation,
  FormDefinition,
  FormRegisterViewConfig,
  FormSubmission,
  FormVisibility,
  NotificationTemplate,
  Project,
  Role,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types';
import { PROJECTS } from '../types';
import { createId, createInitialData } from './defaults';
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
    notifyDelegateOnStart: Boolean(d.notifyDelegateOnStart),
    startHandoffNotifiedAt: d.startHandoffNotifiedAt ?? null,
    endHandoffNotifiedAt: d.endHandoffNotifiedAt ?? null,
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
  const withVisibility = {
    ...form,
    visibility: normalizeVisibility(form.visibility),
  };
  // Ensure Change Request includes the optional Attachment field for older localStorage data
  if (withVisibility.id !== 'form-change') return withVisibility;
  if (
    withVisibility.fields.some(
      (f) => f.id === 'cr-attachment' || f.type === 'file',
    )
  ) {
    return withVisibility;
  }
  return {
    ...withVisibility,
    fields: [
      ...withVisibility.fields,
      {
        id: 'cr-attachment',
        label: 'Attachment',
        type: 'file',
        required: false,
        placeholder: 'Optional supporting document',
      },
    ],
  };
}

function normalizeEdge(edge: WorkflowEdge): WorkflowEdge {
  return {
    ...edge,
    routeMode: edge.routeMode === 'condition' ? 'condition' : 'manual',
    conditions: Array.isArray(edge.conditions) ? edge.conditions : [],
  };
}

function plainBodyToHtml(text: string): string {
  if (!text) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function normalizeNotificationTemplate(
  raw: NotificationTemplate & { roleIds?: string[]; notifySubmitter?: boolean },
): NotificationTemplate | null {
  if (!raw?.id || !raw.formId || !raw.name) return null;
  const ts = new Date().toISOString();
  return {
    id: raw.id,
    name: String(raw.name),
    formId: raw.formId,
    description: raw.description ?? '',
    subject: raw.subject ?? '',
    bodyHtml: plainBodyToHtml(raw.bodyHtml ?? ''),
    createdAt: raw.createdAt ?? ts,
    updatedAt: raw.updatedAt ?? ts,
  };
}

/**
 * Lift inline notify-node content into form-dedicated NotificationTemplate
 * records so workflows reference templates by id for subject/body.
 * Recipients stay on the workflow node (notifyRoleIds / notifySubmitter).
 */
function migrateInlineNotifyNodes(
  workflows: Workflow[],
  existing: NotificationTemplate[],
  rawTemplates: Array<
    NotificationTemplate & { roleIds?: string[]; notifySubmitter?: boolean }
  >,
): { workflows: Workflow[]; notificationTemplates: NotificationTemplate[] } {
  const templates = [...existing];
  const rawById = new Map(rawTemplates.map((t) => [t.id, t]));
  const ts = new Date().toISOString();

  const nextWorkflows = workflows.map((wf) => {
    const formId = wf.formId;
    if (!formId) return wf;

    const nodes: WorkflowNode[] = wf.nodes.map((n) => {
      if (n.type !== 'notification') return n;

      const tplId = n.data.notificationTemplateId;
      const rawTpl = tplId ? rawById.get(tplId) : undefined;

      // Prefer node recipients; fall back to legacy template recipients once
      let notifyRoleIds = Array.isArray(n.data.notifyRoleIds)
        ? n.data.notifyRoleIds
        : undefined;
      let notifySubmitter =
        typeof n.data.notifySubmitter === 'boolean'
          ? n.data.notifySubmitter
          : undefined;
      if (
        (!notifyRoleIds || notifyRoleIds.length === 0) &&
        notifySubmitter === undefined &&
        rawTpl
      ) {
        if (Array.isArray(rawTpl.roleIds) && rawTpl.roleIds.length > 0) {
          notifyRoleIds = rawTpl.roleIds;
        }
        if (typeof rawTpl.notifySubmitter === 'boolean') {
          notifySubmitter = rawTpl.notifySubmitter;
        }
      }

      if (tplId) {
        const exists = templates.some(
          (t) => t.id === tplId && t.formId === formId,
        );
        if (exists) {
          return {
            ...n,
            data: {
              label: n.data.label,
              description: n.data.description,
              notificationTemplateId: tplId,
              notifyRoleIds: notifyRoleIds ?? [],
              notifySubmitter: Boolean(notifySubmitter),
            },
          };
        }
      }

      const hasInlineContent = Boolean(
        n.data.notifySubject ||
          n.data.notifyBody ||
          n.data.emailSubject ||
          n.data.emailBody,
      );

      // Dangling or missing template with no inline content — keep recipients
      if (!hasInlineContent && !tplId) {
        return {
          ...n,
          data: {
            label: n.data.label,
            description: n.data.description,
            notifyRoleIds: notifyRoleIds ?? [],
            notifySubmitter: Boolean(notifySubmitter),
          },
        };
      }

      if (!hasInlineContent && tplId) {
        // Dangling template id — clear content ref, keep recipients
        return {
          ...n,
          data: {
            label: n.data.label,
            description: n.data.description,
            notifyRoleIds: notifyRoleIds ?? [],
            notifySubmitter: Boolean(notifySubmitter),
          },
        };
      }

      const subject =
        n.data.notifySubject ||
        n.data.emailSubject ||
        'Update: request';
      const bodyPlain =
        n.data.notifyBody ||
        n.data.emailBody ||
        'A request was updated.\n\nForm: {{formName}}\nRequest: {{requestId}}';

      const tpl: NotificationTemplate = {
        id: createId('notif-tpl'),
        name: n.data.label || 'Notification',
        formId,
        description: `Migrated from workflow “${wf.name}”`,
        subject,
        bodyHtml: plainBodyToHtml(bodyPlain),
        createdAt: ts,
        updatedAt: ts,
      };
      templates.push(tpl);

      return {
        ...n,
        data: {
          label: n.data.label,
          description: n.data.description,
          notificationTemplateId: tpl.id,
          notifyRoleIds: notifyRoleIds ?? n.data.notifyRoleIds ?? [],
          notifySubmitter: Boolean(
            notifySubmitter ?? n.data.notifySubmitter,
          ),
        },
      };
    });

    return { ...wf, nodes };
  });

  return { workflows: nextWorkflows, notificationTemplates: templates };
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

function normalizeFormRegisterView(
  raw: FormRegisterViewConfig,
): FormRegisterViewConfig | null {
  if (!raw?.formId || !raw?.userId || !Array.isArray(raw.columns)) return null;
  return {
    formId: raw.formId,
    userId: raw.userId,
    columns: raw.columns
      .filter((c) => c && typeof c.id === 'string')
      .map((c) => ({ id: c.id, visible: Boolean(c.visible) })),
  };
}

function normalizeData(data: AppData): AppData {
  const rawForms = (data.forms ?? []).map(normalizeForm);
  let workflows = (data.workflows ?? []).map((w) =>
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

  const formRegisterViews = (
    Array.isArray(data.formRegisterViews) ? data.formRegisterViews : []
  )
    .map(normalizeFormRegisterView)
    .filter((v): v is FormRegisterViewConfig => Boolean(v));

  const rawTemplates = Array.isArray(data.notificationTemplates)
    ? data.notificationTemplates
    : [];
  const existingTemplates = rawTemplates
    .map(normalizeNotificationTemplate)
    .filter((t): t is NotificationTemplate => Boolean(t));

  const migrated = migrateInlineNotifyNodes(
    workflows,
    existingTemplates,
    rawTemplates as Array<
      NotificationTemplate & { roleIds?: string[]; notifySubmitter?: boolean }
    >,
  );
  workflows = migrated.workflows;

  // Drop templates whose form no longer exists
  const formIds = new Set(syncedForms.map((f) => f.id));
  const notificationTemplates = migrated.notificationTemplates.filter((t) =>
    formIds.has(t.formId),
  );

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
    notificationTemplates,
    formRegisterViews,
    version: Math.max(data.version ?? 1, 8),
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
