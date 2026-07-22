import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  AppNotification,
  FormDefinition,
  FormFieldData,
  FormSubmission,
  HistoryEntry,
  NotificationTemplate,
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
import { sampleTextAttachment } from '../utils/formValues';

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
   * approval / rejection paths. Ignored when requests are not included.
   */
  includeNotifications?: boolean;
  /**
   * `replace` (default) clears existing sample-form requests/notifications
   * then recreates them. `append` keeps existing records and adds more.
   */
  mode?: SampleSeedMode;
  /**
   * When true, create sample users (honours userCount / userMode).
   * Explicit `false` skips user generation even if userCount > 0.
   */
  includeUsers?: boolean;
  /**
   * When true, generate sample requests (honours requestsPerForm / mode).
   * Explicit `false` skips request generation. Also controls whether the
   * sample form/workflow catalog is applied.
   */
  includeRequests?: boolean;
  /**
   * `replace` removes existing sample users then recreates them.
   * `append` adds new sample users without removing existing ones.
   */
  userMode?: SampleSeedMode;
  /** How many sample users to create (default: full canned set size). */
  userCount?: number;
}

export interface SampleSeedStats {
  submissionsAdded: number;
  notificationsAdded: number;
  submissionsCleared: number;
  notificationsCleared: number;
  usersAdded: number;
  usersCleared: number;
  mode: SampleSeedMode;
  userMode: SampleSeedMode;
}

/** Emails used by the canned sample users (for replace/clear detection). */
export function sampleUserEmails(): Set<string> {
  return new Set(
    generateSampleUsers().map((u) => u.email.toLowerCase()),
  );
}

export function isSampleUserEmail(email: string): boolean {
  return sampleUserEmails().has(email.toLowerCase());
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

const EXTRA_FIRST = [
  'Riley',
  'Avery',
  'Quinn',
  'Jamie',
  'Cameron',
  'Drew',
  'Parker',
  'Reese',
  'Skyler',
  'Finley',
];
const EXTRA_LAST = [
  'Nguyen',
  'Singh',
  'Walsh',
  'Okoro',
  'Martinez',
  'Andersen',
  'Kowalski',
  'Berg',
  'Silva',
  'Nakamura',
];
const EXTRA_COMPANIES = ['BHP', 'Hatch', 'Bantrel', 'Fluor'] as const;
const EXTRA_PROJECTS = ['JS1', 'JS2', 'Operations'] as const;
const EXTRA_ROLES: string[][] = [
  ['role-requestor'],
  ['role-manager'],
  ['role-requestor', 'role-manager'],
  ['role-project-director', 'role-requestor'],
  ['role-requestor'],
];

/** True for canned or generated demo sample users (never the system admin). */
export function isDemoSampleUser(u: User): boolean {
  if (u.id === 'user-admin' || u.email.toLowerCase() === 'admin@jansen.local') {
    return false;
  }
  const email = u.email.toLowerCase();
  if (sampleUserEmails().has(email)) return true;
  if (email.endsWith('@sample.jansen.local')) return true;
  if (
    u.id.startsWith('user-alex') ||
    u.id.startsWith('user-morgan') ||
    u.id.startsWith('user-jordan') ||
    u.id.startsWith('user-taylor') ||
    u.id.startsWith('user-sam') ||
    u.id.startsWith('user-casey') ||
    u.id.startsWith('user-sample')
  ) {
    return true;
  }
  return false;
}

/**
 * Build `count` sample users. Prefers the canned demo set, then generates
 * extras with unique @sample.jansen.local emails.
 */
export function generateNSampleUsers(
  count: number,
  opts?: { existingEmails?: Set<string>; uniqueSuffix?: string },
): User[] {
  const n = Math.max(0, Math.min(50, Math.floor(count)));
  if (n === 0) return [];
  const existing = opts?.existingEmails ?? new Set<string>();
  const suffix = opts?.uniqueSuffix ?? '';
  const canned = generateSampleUsers();
  const out: User[] = [];
  const used = new Set(existing);

  for (const u of canned) {
    if (out.length >= n) break;
    const email = u.email.toLowerCase();
    if (used.has(email)) continue;
    out.push({ ...u });
    used.add(email);
  }

  let i = 0;
  while (out.length < n) {
    const first = EXTRA_FIRST[i % EXTRA_FIRST.length];
    const last = EXTRA_LAST[Math.floor(i / EXTRA_FIRST.length) % EXTRA_LAST.length];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${
      suffix ? `.${suffix}` : ''
    }.${i + 1}@sample.jansen.local`;
    if (used.has(email)) {
      i += 1;
      continue;
    }
    out.push({
      id: createId('user-sample'),
      firstName: first,
      lastName: last,
      email,
      company: EXTRA_COMPANIES[i % EXTRA_COMPANIES.length],
      project: EXTRA_PROJECTS[i % EXTRA_PROJECTS.length],
      roleIds: [...EXTRA_ROLES[i % EXTRA_ROLES.length]],
      createdAt: now(),
    });
    used.add(email);
    i += 1;
  }

  return out;
}

function randInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pickRandom<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)]!;
}

/** Weighted pick — weights need not sum to 1. */
function pickWeighted<T extends string>(
  options: Array<{ value: T; weight: number }>,
): T {
  const total = options.reduce((s, o) => s + Math.max(0, o.weight), 0);
  let r = Math.random() * (total || 1);
  for (const o of options) {
    r -= Math.max(0, o.weight);
    if (r <= 0) return o.value;
  }
  return options[options.length - 1]!.value;
}

function hoursAgoIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function dateDaysFromNow(dayOffset: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
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
    timestamp: hoursAgoIso(hoursAgo),
  };
}

/**
 * Age the sample request by status:
 * - open (pending): within the last week
 * - approved: older (1 week – ~3 months)
 * - rejected: mixed (a few days – ~2 months)
 */
function sampleTiming(kind: 'pending' | 'approved' | 'rejected'): {
  submitHoursAgo: number;
  decideHoursAgo: number;
} {
  let submitHoursAgo: number;
  if (kind === 'pending') {
    submitHoursAgo = randInt(2, 6 * 24); // 2h – 6 days
  } else if (kind === 'approved') {
    submitHoursAgo = randInt(8 * 24, 90 * 24); // 8–90 days
  } else {
    submitHoursAgo = randInt(3 * 24, 60 * 24); // 3–60 days
  }
  const lag = randInt(1, Math.min(48, Math.max(1, submitHoursAgo - 1)));
  return {
    submitHoursAgo,
    decideHoursAgo: Math.max(0, submitHoursAgo - lag),
  };
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
  templates?: NotificationTemplate[];
}): AppNotification {
  const templateId = opts.templates?.find(
    (t) =>
      t.formId === opts.form.id &&
      ((opts.kind === 'submit' && t.name.toLowerCase().includes('submission')) ||
        (opts.kind === 'ok' && t.name.toLowerCase().includes('approval')) ||
        (opts.kind === 'no' && t.name.toLowerCase().includes('rejection'))),
  )?.id;

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
    data: templateId
      ? {
          label:
            opts.kind === 'submit'
              ? 'Notify on submission'
              : opts.kind === 'ok'
                ? 'Notify on approval'
                : 'Notify on rejection',
          notificationTemplateId: templateId,
        }
      : {
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
      templates: opts.templates,
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
  /** Hours before “now” when the request was submitted — dates stay coherent. */
  submitHoursAgo = 24,
): FormFieldData {
  const submitDayOffset = -Math.floor(submitHoursAgo / 24);
  const r = () => Math.floor(Math.random() * 4);

  switch (form.id) {
    case 'form-overtime':
      return {
        'ot-date': dateDaysFromNow(submitDayOffset - randInt(0, 3)),
        'ot-hours': 2 + randInt(0, 5),
        'ot-shift': pickRandom(['Day', 'Night', 'Weekend']),
        'ot-reason': pickRandom([
          'Concrete pour continuation',
          'Commissioning support',
          'Shutdown coverage',
          'Crane window extension',
        ]),
      };
    case 'form-vehicle':
      return {
        'vh-make': pickRandom(['Toyota', 'Ford', 'Chevrolet', 'Ram']),
        'vh-model': pickRandom(['Hilux', 'F-150', 'Silverado', '1500']),
        'vh-plate': `SASK-${1000 + randInt(0, 8999)}`,
        'vh-expiry': dateDaysFromNow(randInt(60, 400)),
        'vh-purpose': pickRandom([
          'Site logistics',
          'Survey crew transport',
          'Emergency response standby',
          'Material haul between pads',
        ]),
      };
    case 'form-change':
      return {
        'cr-title': pickRandom([
          'Update permit checklist',
          'Revise visitor induction',
          'Adjust lockout tags',
          'New toolbox talk template',
        ]),
        'cr-description': pickRandom([
          'Add electrical isolation step to daily permit form',
          'Shorten safety video segment for contractors',
          'Clarify group lockout sequence',
          'Standardize weekly safety briefing notes',
        ]),
        'cr-priority': pickRandom(['Low', 'Medium', 'High', 'Critical']),
        'cr-impact': pickRandom(['Low', 'Medium', 'High']),
        ...(Math.random() < 0.5
          ? {
              'cr-attachment': sampleTextAttachment(
                `change-brief-${index + 1}.txt`,
                `Supporting notes for change request sample ${index + 1}`,
              ),
            }
          : {}),
      };
    case 'form-leave': {
      const startOffset = submitDayOffset + randInt(1, 14);
      return {
        'lv-type': pickRandom(['Annual', 'Sick', 'Personal', 'Other']),
        'lv-start': dateDaysFromNow(startOffset),
        'lv-end': dateDaysFromNow(startOffset + randInt(1, 5)),
        'lv-notes': Math.random() < 0.5 ? 'Family travel' : '',
      };
    }
    default: {
      const data: FormFieldData = {};
      for (const field of form.fields) {
        if (field.type === 'number') data[field.id] = randInt(1, 20);
        else if (field.type === 'select' && field.options?.length)
          data[field.id] = pickRandom(field.options);
        else if (field.type === 'date')
          data[field.id] = dateDaysFromNow(submitDayOffset - randInt(0, 5));
        else if (field.type === 'file') {
          if (Math.random() < 0.5) {
            data[field.id] = sampleTextAttachment(
              `sample-${field.id}-${index + 1}.txt`,
              `Sample attachment for ${field.label}`,
            );
          }
        } else data[field.id] = `Sample ${field.label} ${index + 1 + r()}`;
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
  templates?: NotificationTemplate[],
) {
  let notif: AppNotification | null = null;
  if (node) {
    notif = buildNotificationFromNode(node, {
      form,
      submission,
      users,
      roles,
      triggeredBy,
      templates,
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
      templates,
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
  templates: NotificationTemplate[] = [],
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
      const submitter = pickRandom(submitters);
      // Prefer a different manager than the submitter when possible
      const otherManagers = actingManagers.filter((m) => m.id !== submitter.id);
      const manager = pickRandom(
        otherManagers.length > 0 ? otherManagers : actingManagers,
      );

      // Prefer open + approved; keep some rejections in the mix
      let kind = pickWeighted<'pending' | 'approved' | 'rejected'>([
        { value: 'pending', weight: 0.4 },
        { value: 'approved', weight: 0.45 },
        { value: 'rejected', weight: 0.15 },
      ]);
      if (kind === 'approved' && !endOk) kind = 'pending';
      if (kind === 'rejected' && !endNo) kind = endOk ? 'approved' : 'pending';

      const { submitHoursAgo, decideHoursAgo } = sampleTiming(kind);
      const data = sampleFieldData(form, i, submitHoursAgo);

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
            submitHoursAgo,
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
        submittedAt: hoursAgoIso(submitHoursAgo),
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
          submitHoursAgo,
          'submit',
          notifications,
          history,
          templates,
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
              decideHoursAgo,
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
            decideHoursAgo,
            'ok',
            notifications,
            history,
            templates,
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
            decideHoursAgo,
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
              decideHoursAgo,
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
            decideHoursAgo,
            'no',
            notifications,
            history,
            templates,
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
            decideHoursAgo,
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
  const userCount = Math.max(
    0,
    Math.min(50, Math.floor(options.userCount ?? 0)),
  );
  const includeUsers =
    options.includeUsers === false ? false : userCount > 0;

  const requestsPerForm =
    options.requestsPerForm &&
    Object.keys(options.requestsPerForm).length > 0
      ? options.requestsPerForm
      : defaultRequestsPerForm(DEFAULT_REQUESTS_PER_FORM);

  const requestedTotal = Object.values(requestsPerForm).reduce(
    (sum, n) => sum + (Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0),
    0,
  );

  const includeRequests =
    options.includeRequests === false ? false : requestedTotal > 0;

  const includeNotifications =
    includeRequests && options.includeNotifications !== false;

  const mode: SampleSeedMode = options.mode === 'append' ? 'append' : 'replace';
  const userMode: SampleSeedMode =
    options.userMode === 'append' ? 'append' : 'replace';
  const catalog = createSampleCatalog();

  let users: User[] = data.users.map((u) => ({
    ...u,
    project: u.project ?? ('JS1' as const),
  }));
  let usersCleared = 0;
  let usersAdded = 0;
  let currentUserId = data.currentUserId;
  let delegations = [...(data.delegations ?? [])];

  // Remap old sample-user ids → new ids when replacing
  const idRemap = new Map<string, string>();

  if (includeUsers && userCount > 0) {
    if (userMode === 'replace') {
      const removed = users.filter((u) => isDemoSampleUser(u));
      usersCleared = removed.length;
      const removedIds = new Set(removed.map((u) => u.id));
      users = users.filter((u) => !removedIds.has(u.id));
      delegations = delegations.filter(
        (d) => !removedIds.has(d.fromUserId) && !removedIds.has(d.toUserId),
      );
      if (currentUserId && removedIds.has(currentUserId)) {
        currentUserId =
          users.find((u) => u.roleIds.includes('role-admin'))?.id ??
          users[0]?.id ??
          null;
      }
      const created = generateNSampleUsers(userCount);
      // Prefer remapping canned emails when possible
      for (const old of removed) {
        const match = created.find(
          (s) => s.email.toLowerCase() === old.email.toLowerCase(),
        );
        if (match) idRemap.set(old.id, match.id);
      }
      users.push(...created);
      usersAdded = created.length;
    } else {
      const existingEmails = new Set(
        users.map((u) => u.email.toLowerCase()),
      );
      const created = generateNSampleUsers(userCount, {
        existingEmails,
        uniqueSuffix: Date.now().toString(36),
      });
      users.push(...created);
      usersAdded = created.length;
    }
  }

  const remapUserId = (id: string): string => idRemap.get(id) ?? id;

  // Only apply the sample form/workflow catalog when generating requests.
  // User-only runs keep the current forms and workflows intact.
  let forms = includeRequests ? catalog.forms : data.forms;
  let workflows = includeRequests ? catalog.workflows : data.workflows;
  let notificationTemplates = includeRequests
    ? catalog.notificationTemplates
    : (data.notificationTemplates ?? []);

  const paired = enforceFormWorkflowOneToOne({
    ...data,
    users,
    workflows,
    forms,
    notificationTemplates,
    currentUserId,
    delegations,
  });
  forms = paired.forms;
  workflows = paired.workflows;
  users = paired.users;
  notificationTemplates = paired.notificationTemplates ?? notificationTemplates;

  const { submissions: sampleSubs, notifications: sampleNotifs } =
    includeRequests && requestedTotal > 0
      ? generateSampleSubmissions(
          forms,
          workflows,
          users,
          paired.roles,
          requestsPerForm,
          includeNotifications,
          notificationTemplates,
        )
      : { submissions: [], notifications: [] };

  const sampleFormIds = new Set(forms.map((f) => f.id));
  // Remap submitter ids on existing data when sample users were replaced
  const remapSubmission = <T extends { submittedBy: string; history: { userId: string }[] }>(
    s: T,
  ): T => ({
    ...s,
    submittedBy: remapUserId(s.submittedBy),
    history: s.history.map((h) => ({ ...h, userId: remapUserId(h.userId) })),
  });
  const existingSubs = data.submissions.map(remapSubmission);
  const existingNotifs = (data.notifications ?? []).map((n) => ({
    ...n,
    toUserIds: n.toUserIds.map(remapUserId),
    triggeredByUserId: remapUserId(n.triggeredByUserId),
  }));

  const existingSampleSubs = existingSubs.filter((s) =>
    sampleFormIds.has(s.formId),
  );
  const existingSampleNotifs = existingNotifs.filter((n) =>
    sampleFormIds.has(n.formId),
  );
  const otherSubs = existingSubs.filter((s) => !sampleFormIds.has(s.formId));
  const otherNotifs = existingNotifs.filter(
    (n) => !sampleFormIds.has(n.formId),
  );

  // When requests are not included, leave existing requests/notifications alone
  // (user-only seeding should not wipe the register).
  const touchRequests = includeRequests && requestedTotal > 0;

  const effectiveMode: SampleSeedMode = !touchRequests
    ? 'append'
    : mode === 'replace' && sampleSubs.length === 0 && requestedTotal > 0
      ? 'append'
      : mode;

  const submissionsCleared =
    touchRequests && effectiveMode === 'replace'
      ? existingSampleSubs.length
      : 0;
  const notificationsCleared =
    touchRequests && effectiveMode === 'replace'
      ? existingSampleNotifs.length
      : 0;

  const submissions = !touchRequests
    ? existingSubs
    : effectiveMode === 'replace'
      ? [...otherSubs, ...sampleSubs]
      : [...otherSubs, ...existingSampleSubs, ...sampleSubs];

  let notifications: typeof existingNotifs;
  if (!touchRequests) {
    notifications = existingNotifs;
  } else {
    notifications = otherNotifs;
    if (effectiveMode === 'append') {
      notifications = [...otherNotifs, ...existingSampleNotifs];
    }
    if (includeNotifications) {
      notifications = [...notifications, ...sampleNotifs];
    }
  }

  return {
    data: {
      ...paired,
      users,
      workflows,
      forms,
      submissions,
      delegations,
      notifications,
      notificationTemplates,
      formRegisterViews: data.formRegisterViews ?? [],
      currentUserId,
    },
    stats: {
      submissionsAdded: sampleSubs.length,
      notificationsAdded: includeNotifications ? sampleNotifs.length : 0,
      submissionsCleared,
      notificationsCleared,
      usersAdded,
      usersCleared,
      mode: effectiveMode,
      userMode: includeUsers ? userMode : 'append',
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
