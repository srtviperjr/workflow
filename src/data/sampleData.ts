import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  AppNotification,
  FormDefinition,
  FormSubmission,
  HistoryEntry,
  Role,
  User,
  Workflow,
  WorkflowNode,
} from '../types';
import {
  createId,
  createInitialData,
  createSampleCatalog,
} from './defaults';
import { enforceFormWorkflowOneToOne } from './formWorkflowLink';
import { buildNotificationFromNode } from '../utils/notifications';

const now = () => new Date().toISOString();

/** Default requests created for each sample form when not overridden. */
export const DEFAULT_REQUESTS_PER_FORM = 2;

export const SAMPLE_FORM_META = [
  { id: 'form-overtime', name: 'Overtime Request' },
  { id: 'form-vehicle', name: 'Vehicle Registration' },
  { id: 'form-change', name: 'Change Request' },
  { id: 'form-leave', name: 'Leave Request' },
] as const;

export type RequestsPerForm = Record<string, number>;

export type SampleSeedMode = 'replace' | 'append';

export interface SampleSeedOptions {
  /** Number of sample requests to generate for each form id. */
  requestsPerForm?: RequestsPerForm;
  /**
   * When true (default), seed in-app notifications for submission /
   * approval / rejection paths.
   */
  includeNotifications?: boolean;
  /**
   * `replace` (default) clears existing sample-form requests/notifications
   * then recreates them. `append` keeps existing records and adds more.
   */
  mode?: SampleSeedMode;
}

export interface SampleSeedStats {
  submissionsAdded: number;
  notificationsAdded: number;
  submissionsCleared: number;
  notificationsCleared: number;
  mode: SampleSeedMode;
}

function userName(u: User): string {
  return `${u.firstName} ${u.lastName}`;
}

export function generateSampleUsers(): User[] {
  const ts = now();
  return [
    {
      id: 'user-alex',
      firstName: 'Alex',
      lastName: 'Chen',
      email: 'alex.chen@bhp.com',
      company: 'BHP',
      project: 'JS1',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-morgan',
      firstName: 'Morgan',
      lastName: 'Lee',
      email: 'morgan.lee@bhp.com',
      company: 'BHP',
      project: 'JS2',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-jordan',
      firstName: 'Jordan',
      lastName: 'Patel',
      email: 'jordan.patel@hatch.com',
      company: 'Hatch',
      project: 'JS1',
      roleIds: ['role-manager'],
      createdAt: ts,
    },
    {
      id: 'user-taylor',
      firstName: 'Taylor',
      lastName: 'Brooks',
      email: 'taylor.brooks@fluor.com',
      company: 'Fluor',
      project: 'Operations',
      roleIds: ['role-requestor', 'role-manager'],
      createdAt: ts,
    },
    {
      id: 'user-sam',
      firstName: 'Sam',
      lastName: 'Rivera',
      email: 'sam.rivera@bantrel.com',
      company: 'Bantrel',
      project: 'Operations',
      roleIds: ['role-project-director', 'role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-casey',
      firstName: 'Casey',
      lastName: 'Nguyen',
      email: 'casey.nguyen@bhp.com',
      company: 'BHP',
      project: 'JS1',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
  ];
}

function makeHistory(
  stepId: string,
  stepLabel: string,
  stepType: HistoryEntry['stepType'],
  user: User,
  action: string,
  outcome?: string,
  hoursAgo = 0,
  comment?: string,
): HistoryEntry {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return {
    id: uuidv4(),
    stepId,
    stepLabel,
    stepType,
    userId: user.id,
    userName: userName(user),
    action,
    outcome,
    comment,
    timestamp: d.toISOString(),
  };
}

function hoursAgoIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function findNotifyNode(
  workflow: Workflow,
  kind: 'submit' | 'ok' | 'no',
): WorkflowNode | undefined {
  const byId = workflow.nodes.find((n) => {
    if (n.type !== 'notification') return false;
    if (kind === 'submit') return n.id.endsWith('-notify-submit');
    if (kind === 'ok') return n.id.endsWith('-notify-ok');
    return n.id.endsWith('-notify-no');
  });
  if (byId) return byId;

  return workflow.nodes.find((n) => {
    if (n.type !== 'notification') return false;
    const label = n.data.label.toLowerCase();
    if (kind === 'submit') return label.includes('submission') || label.includes('submit');
    if (kind === 'ok') return label.includes('approval') || label.includes('approved');
    return label.includes('rejection') || label.includes('rejected');
  });
}

/** Fallback notification when a workflow has no Notify node for this event. */
function synthesizeNotification(opts: {
  form: FormDefinition;
  submission: FormSubmission;
  users: User[];
  roles: Role[];
  triggeredBy: User;
  kind: 'submit' | 'ok' | 'no';
  hoursAgo: number;
}): AppNotification {
  const subject =
    opts.kind === 'submit'
      ? `New ${opts.form.name} from {{submitter}}`
      : opts.kind === 'ok'
        ? `${opts.form.name} approved`
        : `${opts.form.name} rejected`;
  const body =
    opts.kind === 'submit'
      ? 'A new request needs review.\n\nForm: {{formName}}\nRequest: {{requestId}}\nSubmitted by: {{submitter}}'
      : opts.kind === 'ok'
        ? 'Your request was approved.\n\nForm: {{formName}}\nRequest: {{requestId}}'
        : 'Your request was rejected.\n\nForm: {{formName}}\nRequest: {{requestId}}';

  const fakeNode: WorkflowNode = {
    id: `${opts.submission.workflowId ?? opts.form.id}-notify-${opts.kind}`,
    type: 'notification',
    position: { x: 0, y: 0 },
    data: {
      label:
        opts.kind === 'submit'
          ? 'Notify on submission'
          : opts.kind === 'ok'
            ? 'Notify on approval'
            : 'Notify on rejection',
      notifyRoleIds: opts.kind === 'submit' ? ['role-manager', 'role-admin'] : [],
      notifySubmitter: opts.kind !== 'submit',
      notifySubject: subject,
      notifyBody: body,
    },
  };

  const notif =
    buildNotificationFromNode(fakeNode, {
      form: opts.form,
      submission: opts.submission,
      users: opts.users,
      roles: opts.roles,
      triggeredBy: opts.triggeredBy,
    }) ?? {
      id: createId('notif'),
      submissionId: opts.submission.id,
      formId: opts.form.id,
      workflowId: opts.submission.workflowId,
      nodeId: fakeNode.id,
      nodeLabel: fakeNode.data.label,
      toUserIds: [] as string[],
      toUserNames: [] as string[],
      subject: opts.form.name,
      body: '',
      sentAt: new Date().toISOString(),
      triggeredByUserId: opts.triggeredBy.id,
      readByUserIds: [],
    };

  const sent = new Date();
  sent.setHours(sent.getHours() - opts.hoursAgo);
  notif.sentAt = sent.toISOString();
  return notif;
}

function sampleFieldData(
  form: FormDefinition,
  index: number,
): Record<string, string | number> {
  switch (form.id) {
    case 'form-overtime':
      return {
        'ot-date': `2026-07-${String(18 + (index % 10)).padStart(2, '0')}`,
        'ot-hours': 2 + (index % 6),
        'ot-shift': ['Day', 'Night', 'Weekend'][index % 3],
        'ot-reason': [
          'Concrete pour continuation',
          'Commissioning support',
          'Shutdown coverage',
          'Crane window extension',
        ][index % 4],
      };
    case 'form-vehicle':
      return {
        'vh-make': ['Toyota', 'Ford', 'Chevrolet', 'Ram'][index % 4],
        'vh-model': ['Hilux', 'F-150', 'Silverado', '1500'][index % 4],
        'vh-plate': `SASK-${1000 + index}`,
        'vh-expiry': `2027-${String((index % 12) + 1).padStart(2, '0')}-15`,
        'vh-purpose': [
          'Site logistics',
          'Survey crew transport',
          'Emergency response standby',
          'Material haul between pads',
        ][index % 4],
      };
    case 'form-change':
      return {
        'cr-title': [
          'Update permit checklist',
          'Revise visitor induction',
          'Adjust lockout tags',
          'New toolbox talk template',
        ][index % 4],
        'cr-description': [
          'Add electrical isolation step to daily permit form',
          'Shorten safety video segment for contractors',
          'Clarify group lockout sequence',
          'Standardize weekly safety briefing notes',
        ][index % 4],
        'cr-priority': ['Low', 'Medium', 'High', 'Critical'][index % 4],
        'cr-impact': ['Low', 'Medium', 'High'][index % 3],
      };
    case 'form-leave':
      return {
        'lv-type': ['Annual', 'Sick', 'Personal', 'Other'][index % 4],
        'lv-start': `2026-08-${String(1 + (index % 20)).padStart(2, '0')}`,
        'lv-end': `2026-08-${String(2 + (index % 20)).padStart(2, '0')}`,
        'lv-notes': index % 2 === 0 ? 'Family travel' : '',
      };
    default: {
      const data: Record<string, string | number> = {};
      for (const field of form.fields) {
        if (field.type === 'number') data[field.id] = index + 1;
        else if (field.type === 'select' && field.options?.length)
          data[field.id] = field.options[index % field.options.length];
        else if (field.type === 'date')
          data[field.id] = `2026-07-${String(10 + (index % 15)).padStart(2, '0')}`;
        else data[field.id] = `Sample ${field.label} ${index + 1}`;
      }
      return data;
    }
  }
}

function recordNotification(
  node: WorkflowNode | undefined,
  form: FormDefinition,
  submission: FormSubmission,
  users: User[],
  roles: Role[],
  triggeredBy: User,
  hoursAgo: number,
  kind: 'submit' | 'ok' | 'no',
  out: AppNotification[],
  history: HistoryEntry[],
) {
  let notif: AppNotification | null = null;
  if (node) {
    notif = buildNotificationFromNode(node, {
      form,
      submission,
      users,
      roles,
      triggeredBy,
    });
    if (notif) {
      const sent = new Date();
      sent.setHours(sent.getHours() - hoursAgo);
      notif.sentAt = sent.toISOString();
    }
  }
  if (!notif) {
    notif = synthesizeNotification({
      form,
      submission,
      users,
      roles,
      triggeredBy,
      kind,
      hoursAgo,
    });
  }

  // Ensure at least one recipient so the inbox is demonstrable
  if (notif.toUserIds.length === 0) {
    const fallback =
      kind === 'submit'
        ? users.find((u) => u.roleIds.includes('role-manager')) ??
          users.find((u) => u.roleIds.includes('role-admin'))
        : users.find((u) => u.id === submission.submittedBy);
    if (fallback) {
      notif.toUserIds = [fallback.id];
      notif.toUserNames = [`${fallback.firstName} ${fallback.lastName}`];
    }
  }

  out.push(notif);
  history.push(
    makeHistory(
      node?.id ?? notif.nodeId,
      node?.data.label ?? notif.nodeLabel,
      'notification',
      triggeredBy,
      'Notification sent',
      undefined,
      hoursAgo,
    ),
  );
}

export function generateSampleSubmissions(
  forms: FormDefinition[],
  workflows: Workflow[],
  users: User[],
  roles: Role[],
  requestsPerForm: RequestsPerForm = {},
  includeNotifications = true,
): { submissions: FormSubmission[]; notifications: AppNotification[] } {
  const byId = Object.fromEntries(forms.map((f) => [f.id, f]));

  // Prefer fixed sample users, then fall back to anyone with the right roles
  const byFixedId = (id: string) => users.find((u) => u.id === id);
  const withRole = (roleId: string) =>
    users.filter((u) => u.roleIds.includes(roleId));

  const submitters = [
    byFixedId('user-alex'),
    byFixedId('user-morgan'),
    byFixedId('user-casey'),
    byFixedId('user-taylor'),
    ...withRole('role-requestor'),
    ...withRole('role-admin'),
  ].filter((u, i, arr): u is User => Boolean(u) && arr.indexOf(u) === i);

  const managers = [
    byFixedId('user-jordan'),
    byFixedId('user-taylor'),
    ...withRole('role-manager'),
    ...withRole('role-admin'),
  ].filter((u, i, arr): u is User => Boolean(u) && arr.indexOf(u) === i);

  const fallbackUser = users[0];
  if (!fallbackUser || submitters.length === 0) {
    return { submissions: [], notifications: [] };
  }
  // If no managers, let requestors/admin act as manager for sample history
  const actingManagers = managers.length > 0 ? managers : submitters;

  const submissions: FormSubmission[] = [];
  const notifications: AppNotification[] = [];
  const kinds: Array<'pending' | 'approved' | 'rejected'> = [
    'pending',
    'approved',
    'rejected',
  ];

  // Normalize counts: empty/missing → defaults; coerce strings; ignore unknown keys
  const normalizedCounts: RequestsPerForm = {};
  const sourceKeys =
    Object.keys(requestsPerForm).length > 0
      ? Object.keys(requestsPerForm)
      : SAMPLE_FORM_META.map((f) => f.id);
  for (const formId of SAMPLE_FORM_META.map((f) => f.id)) {
    const raw = requestsPerForm[formId];
    if (raw === undefined || raw === null) {
      // If caller passed a partial map, missing forms get 0; if empty map, use default
      normalizedCounts[formId] =
        Object.keys(requestsPerForm).length === 0
          ? DEFAULT_REQUESTS_PER_FORM
          : 0;
    } else {
      const n = Number(raw);
      normalizedCounts[formId] = Number.isFinite(n)
        ? Math.max(0, Math.min(50, Math.floor(n)))
        : 0;
    }
  }
  // Also honor any extra form ids present in forms + requestsPerForm
  for (const formId of sourceKeys) {
    if (formId in normalizedCounts) continue;
    const n = Number(requestsPerForm[formId]);
    normalizedCounts[formId] = Number.isFinite(n)
      ? Math.max(0, Math.min(50, Math.floor(n)))
      : 0;
  }

  for (const formId of Object.keys(normalizedCounts)) {
    const form = byId[formId];
    const count = normalizedCounts[formId] ?? 0;
    if (!form || count === 0) continue;

    const workflow =
      workflows.find((w) => w.id === form.workflowId) ??
      workflows.find((w) => w.formId === form.id);
    if (!workflow) continue;

    // Prefer a requestor step + manager decision; fall back to any step/decision
    const submitNode =
      workflow.nodes.find(
        (n) => n.type === 'step' && n.data.roleId === 'role-requestor',
      ) ?? workflow.nodes.find((n) => n.type === 'step');
    const mgrNode =
      workflow.nodes.find(
        (n) => n.type === 'decision' && n.data.roleId === 'role-manager',
      ) ?? workflow.nodes.find((n) => n.type === 'decision');
    const notifySubmit = findNotifyNode(workflow, 'submit');
    const notifyOk = findNotifyNode(workflow, 'ok');
    const notifyNo = findNotifyNode(workflow, 'no');
    const endOk = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('approv'),
    );
    const endNo = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('reject'),
    );
    // Need at least a place to park the request
    if (!submitNode && !mgrNode) continue;
    const parkNode = mgrNode ?? submitNode;
    if (!parkNode) continue;

    for (let i = 0; i < count; i++) {
      const submitter = submitters[i % submitters.length] ?? fallbackUser;
      const manager = actingManagers[i % actingManagers.length] ?? fallbackUser;
      const kind = kinds[i % kinds.length];
      const hours = 4 + i * 6;
      const data = sampleFieldData(form, i);

      const history: HistoryEntry[] = [];
      if (submitNode) {
        history.push(
          makeHistory(
            submitNode.id,
            submitNode.data.label,
            'step',
            submitter,
            'Submitted',
            undefined,
            hours,
          ),
        );
      }

      let status: FormSubmission['status'] = 'in_progress';
      let currentNodeId: string | null = parkNode.id;

      const draft: FormSubmission = {
        id: createId('sub'),
        formId: form.id,
        formName: form.name,
        data,
        baselineData: { ...data },
        submittedBy: submitter.id,
        submittedAt: hoursAgoIso(hours),
        currentNodeId,
        status,
        history,
        workflowId: workflow.id,
      };

      if (includeNotifications) {
        recordNotification(
          notifySubmit,
          form,
          { ...draft, status: 'in_progress' },
          users,
          roles,
          submitter,
          hours,
          'submit',
          notifications,
          history,
        );
      }

      if (kind === 'approved' && endOk) {
        if (mgrNode) {
          history.push(
            makeHistory(
              mgrNode.id,
              mgrNode.data.label,
              'decision',
              manager,
              'Approved',
              'Approve',
              Math.max(0, hours - 2),
            ),
          );
        }
        if (includeNotifications) {
          recordNotification(
            notifyOk,
            form,
            { ...draft, status: 'completed', history },
            users,
            roles,
            manager,
            Math.max(0, hours - 2),
            'ok',
            notifications,
            history,
          );
        }
        history.push(
          makeHistory(
            endOk.id,
            endOk.data.label,
            'end',
            manager,
            'Reached end',
            'Approve',
            Math.max(0, hours - 2),
          ),
        );
        status = 'completed';
        currentNodeId = endOk.id;
      } else if (kind === 'rejected' && endNo) {
        if (mgrNode) {
          history.push(
            makeHistory(
              mgrNode.id,
              mgrNode.data.label,
              'decision',
              manager,
              'Rejected',
              'Reject',
              Math.max(0, hours - 1),
              'Insufficient justification',
            ),
          );
        }
        if (includeNotifications) {
          recordNotification(
            notifyNo,
            form,
            { ...draft, status: 'rejected', history },
            users,
            roles,
            manager,
            Math.max(0, hours - 1),
            'no',
            notifications,
            history,
          );
        }
        history.push(
          makeHistory(
            endNo.id,
            endNo.data.label,
            'end',
            manager,
            'Reached end',
            'Reject',
            Math.max(0, hours - 1),
          ),
        );
        status = 'rejected';
        currentNodeId = endNo.id;
      }

      submissions.push({
        ...draft,
        status,
        currentNodeId,
        history,
      });
    }
  }

  return { submissions, notifications };
}

export function defaultRequestsPerForm(
  count = DEFAULT_REQUESTS_PER_FORM,
): RequestsPerForm {
  return Object.fromEntries(
    SAMPLE_FORM_META.map((f) => [f.id, count]),
  );
}

export function mergeSampleData(
  data: AppData,
  options: SampleSeedOptions = {},
): { data: AppData; stats: SampleSeedStats } {
  const includeNotifications = options.includeNotifications !== false;
  const mode: SampleSeedMode = options.mode === 'append' ? 'append' : 'replace';
  const catalog = createSampleCatalog();
  const sampleUsers = generateSampleUsers();

  // Ensure sample users exist (by email). Additive role merge if already present.
  const usersByEmail = new Map(
    data.users.map((u) => [u.email.toLowerCase(), u] as const),
  );
  const users: User[] = data.users.map((u) => ({
    ...u,
    project: u.project ?? ('JS1' as const),
  }));
  for (const sample of sampleUsers) {
    const key = sample.email.toLowerCase();
    const existing = usersByEmail.get(key);
    if (!existing) {
      users.push({ ...sample });
      usersByEmail.set(key, sample);
    } else {
      const idx = users.findIndex((u) => u.id === existing.id);
      if (idx >= 0) {
        users[idx] = {
          ...users[idx],
          roleIds: Array.from(
            new Set([...users[idx].roleIds, ...sample.roleIds]),
          ),
          project: users[idx].project ?? sample.project,
        };
      }
    }
  }

  let forms = catalog.forms;
  let workflows = catalog.workflows;

  const paired = enforceFormWorkflowOneToOne({
    ...data,
    users,
    workflows,
    forms,
  });
  forms = paired.forms;
  workflows = paired.workflows;

  const requestsPerForm =
    options.requestsPerForm &&
    Object.keys(options.requestsPerForm).length > 0
      ? options.requestsPerForm
      : defaultRequestsPerForm(DEFAULT_REQUESTS_PER_FORM);

  const requestedTotal = Object.values(requestsPerForm).reduce(
    (sum, n) => sum + (Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0),
    0,
  );

  const { submissions: sampleSubs, notifications: sampleNotifs } =
    generateSampleSubmissions(
      forms,
      workflows,
      users,
      paired.roles,
      requestsPerForm,
      includeNotifications,
    );

  const sampleFormIds = new Set(forms.map((f) => f.id));
  const existingSampleSubs = data.submissions.filter((s) =>
    sampleFormIds.has(s.formId),
  );
  const existingSampleNotifs = (data.notifications ?? []).filter((n) =>
    sampleFormIds.has(n.formId),
  );
  const otherSubs = data.submissions.filter((s) => !sampleFormIds.has(s.formId));
  const otherNotifs = (data.notifications ?? []).filter(
    (n) => !sampleFormIds.has(n.formId),
  );

  // Safety: never wipe existing sample requests if generation produced nothing
  // while the user asked for a positive count.
  const effectiveMode: SampleSeedMode =
    mode === 'replace' && sampleSubs.length === 0 && requestedTotal > 0
      ? 'append'
      : mode;

  const submissionsCleared =
    effectiveMode === 'replace' ? existingSampleSubs.length : 0;
  const notificationsCleared =
    effectiveMode === 'replace' ? existingSampleNotifs.length : 0;

  const submissions =
    effectiveMode === 'replace'
      ? [...otherSubs, ...sampleSubs]
      : [...otherSubs, ...existingSampleSubs, ...sampleSubs];

  let notifications = otherNotifs;
  if (effectiveMode === 'append') {
    notifications = [...otherNotifs, ...existingSampleNotifs];
  }
  if (includeNotifications) {
    notifications = [...notifications, ...sampleNotifs];
  }

  return {
    data: {
      ...paired,
      users,
      workflows,
      forms,
      submissions,
      delegations: data.delegations ?? [],
      notifications,
      formRegisterViews: data.formRegisterViews ?? [],
    },
    stats: {
      submissionsAdded: sampleSubs.length,
      notificationsAdded: includeNotifications ? sampleNotifs.length : 0,
      submissionsCleared,
      notificationsCleared,
      mode: effectiveMode,
    },
  };
}

export function resetAllData(): AppData {
  return createInitialData();
}

export function resetByForm(data: AppData, formId: string): AppData {
  return {
    ...data,
    submissions: data.submissions.filter((s) => s.formId !== formId),
    notifications: (data.notifications ?? []).filter((n) => n.formId !== formId),
  };
}
