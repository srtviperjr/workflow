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

export interface SampleSeedOptions {
  /** Number of sample requests to generate for each form id. */
  requestsPerForm?: RequestsPerForm;
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
  match: (n: WorkflowNode) => boolean,
): WorkflowNode | undefined {
  return workflow.nodes.find((n) => n.type === 'notification' && match(n));
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
  out: AppNotification[],
  history: HistoryEntry[],
) {
  if (!node) return;
  const notif = buildNotificationFromNode(node, {
    form,
    submission,
    users,
    roles,
    triggeredBy,
  });
  if (!notif) return;
  const sent = new Date();
  sent.setHours(sent.getHours() - hoursAgo);
  notif.sentAt = sent.toISOString();
  out.push(notif);
  history.push(
    makeHistory(
      node.id,
      node.data.label,
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
): { submissions: FormSubmission[]; notifications: AppNotification[] } {
  const byId = Object.fromEntries(forms.map((f) => [f.id, f]));
  const submitters = [
    users.find((u) => u.id === 'user-alex'),
    users.find((u) => u.id === 'user-morgan'),
    users.find((u) => u.id === 'user-casey'),
    users.find((u) => u.id === 'user-taylor'),
  ].filter((u): u is User => Boolean(u));
  const managers = [
    users.find((u) => u.id === 'user-jordan'),
    users.find((u) => u.id === 'user-taylor'),
  ].filter((u): u is User => Boolean(u));

  const fallbackUser = users[0];
  if (!fallbackUser || submitters.length === 0 || managers.length === 0) {
    return { submissions: [], notifications: [] };
  }

  const submissions: FormSubmission[] = [];
  const notifications: AppNotification[] = [];
  const kinds: Array<'pending' | 'approved' | 'rejected'> = [
    'pending',
    'approved',
    'rejected',
  ];

  const formIds =
    Object.keys(requestsPerForm).length > 0
      ? Object.keys(requestsPerForm)
      : SAMPLE_FORM_META.map((f) => f.id);

  for (const formId of formIds) {
    const form = byId[formId];
    const count = Math.max(0, Math.floor(requestsPerForm[formId] ?? 0));
    if (!form || count === 0) continue;

    const workflow =
      workflows.find((w) => w.id === form.workflowId) ??
      workflows.find((w) => w.formId === form.id);
    if (!workflow) continue;

    const submitNode = workflow.nodes.find((n) => n.type === 'step');
    const mgrNode = workflow.nodes.find(
      (n) => n.type === 'decision' && n.data.roleId === 'role-manager',
    );
    const notifySubmit = findNotifyNode(workflow, (n) =>
      n.data.label.toLowerCase().includes('submission'),
    );
    const notifyOk = findNotifyNode(workflow, (n) =>
      n.data.label.toLowerCase().includes('approval'),
    );
    const notifyNo = findNotifyNode(workflow, (n) =>
      n.data.label.toLowerCase().includes('rejection'),
    );
    const endOk = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('approv'),
    );
    const endNo = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('reject'),
    );
    if (!submitNode || !mgrNode) continue;

    for (let i = 0; i < count; i++) {
      const submitter = submitters[i % submitters.length] ?? fallbackUser;
      const manager = managers[i % managers.length] ?? fallbackUser;
      const kind = kinds[i % kinds.length];
      const hours = 4 + i * 6;
      const data = sampleFieldData(form, i);

      const history: HistoryEntry[] = [
        makeHistory(
          submitNode.id,
          submitNode.data.label,
          'step',
          submitter,
          'Submitted',
          undefined,
          hours,
        ),
      ];

      let status: FormSubmission['status'] = 'in_progress';
      let currentNodeId: string | null = mgrNode.id;

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

      // Submission notification (managers)
      recordNotification(
        notifySubmit,
        form,
        { ...draft, status: 'in_progress' },
        users,
        roles,
        submitter,
        hours,
        notifications,
        history,
      );

      if (kind === 'approved' && endOk) {
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
        recordNotification(
          notifyOk,
          form,
          { ...draft, status: 'completed', history },
          users,
          roles,
          manager,
          Math.max(0, hours - 2),
          notifications,
          history,
        );
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
        recordNotification(
          notifyNo,
          form,
          { ...draft, status: 'rejected', history },
          users,
          roles,
          manager,
          Math.max(0, hours - 1),
          notifications,
          history,
        );
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
): AppData {
  const catalog = createSampleCatalog();
  const sampleUsers = generateSampleUsers();
  const existingEmails = new Set(data.users.map((u) => u.email.toLowerCase()));
  const newUsers = sampleUsers.filter(
    (u) => !existingEmails.has(u.email.toLowerCase()),
  );
  const users = [...data.users, ...newUsers].map((u) => ({
    ...u,
    project: u.project ?? ('JS1' as const),
  }));

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
    options.requestsPerForm ?? defaultRequestsPerForm(DEFAULT_REQUESTS_PER_FORM);

  const { submissions: sampleSubs, notifications: sampleNotifs } =
    generateSampleSubmissions(
      forms,
      workflows,
      users,
      paired.roles,
      requestsPerForm,
    );

  const kept = data.submissions.filter((s) =>
    forms.some((f) => f.id === s.formId),
  );
  const submissions = [...kept, ...sampleSubs];
  const notifications = [
    ...(data.notifications ?? []).filter((n) =>
      forms.some((f) => f.id === n.formId),
    ),
    ...sampleNotifs,
  ];

  return {
    ...paired,
    users,
    workflows,
    forms,
    submissions,
    delegations: data.delegations ?? [],
    notifications,
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
