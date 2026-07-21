import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  FormDefinition,
  FormSubmission,
  HistoryEntry,
  User,
  Workflow,
} from '../types';
import {
  createId,
  createInitialData,
  createSampleCatalog,
} from './defaults';
import { enforceFormWorkflowOneToOne } from './formWorkflowLink';

const now = () => new Date().toISOString();

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
      project: 'Jansen',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-morgan',
      firstName: 'Morgan',
      lastName: 'Lee',
      email: 'morgan.lee@bhp.com',
      company: 'BHP',
      project: 'Olympic Dam',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-jordan',
      firstName: 'Jordan',
      lastName: 'Patel',
      email: 'jordan.patel@hatch.com',
      company: 'Hatch',
      project: 'Jansen',
      roleIds: ['role-manager'],
      createdAt: ts,
    },
    {
      id: 'user-taylor',
      firstName: 'Taylor',
      lastName: 'Brooks',
      email: 'taylor.brooks@fluor.com',
      company: 'Fluor',
      project: 'Spence',
      roleIds: ['role-requestor', 'role-manager'],
      createdAt: ts,
    },
    {
      id: 'user-sam',
      firstName: 'Sam',
      lastName: 'Rivera',
      email: 'sam.rivera@bantrel.com',
      company: 'Bantrel',
      project: 'Corporate',
      roleIds: ['role-project-director', 'role-requestor'],
      createdAt: ts,
    },
    {
      id: 'user-casey',
      firstName: 'Casey',
      lastName: 'Nguyen',
      email: 'casey.nguyen@bhp.com',
      company: 'BHP',
      project: 'Jansen',
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

export function generateSampleSubmissions(
  forms: FormDefinition[],
  workflows: Workflow[],
  users: User[],
): FormSubmission[] {
  const byId = Object.fromEntries(forms.map((f) => [f.id, f]));
  const overtime = byId['form-overtime'];
  const vehicle = byId['form-vehicle'];
  const change = byId['form-change'];
  const leave = byId['form-leave'];

  const alex = users.find((u) => u.id === 'user-alex') ?? users[0];
  const morgan = users.find((u) => u.id === 'user-morgan') ?? users[0];
  const casey = users.find((u) => u.id === 'user-casey') ?? users[0];
  const jordan = users.find((u) => u.id === 'user-jordan') ?? users[0];
  const taylor = users.find((u) => u.id === 'user-taylor') ?? users[0];

  const submissions: FormSubmission[] = [];

  const pushMgrFlow = (
    form: FormDefinition | undefined,
    submitter: User,
    manager: User,
    data: Record<string, string | number>,
    kind: 'pending' | 'approved' | 'rejected',
    hours: number,
  ) => {
    if (!form) return;
    const workflow =
      workflows.find((w) => w.id === form.workflowId) ??
      workflows.find((w) => w.formId === form.id);
    if (!workflow) return;

    const submitNode = workflow.nodes.find((n) => n.type === 'step');
    const mgrNode = workflow.nodes.find(
      (n) => n.type === 'decision' && n.data.roleId === 'role-manager',
    );
    const endOk = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('approv'),
    );
    const endNo = workflow.nodes.find(
      (n) => n.type === 'end' && n.data.label.toLowerCase().includes('reject'),
    );
    if (!submitNode || !mgrNode) return;

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

    if (kind === 'approved' && endOk) {
      history.push(
        makeHistory(
          mgrNode.id,
          mgrNode.data.label,
          'decision',
          manager,
          'Approved',
          'Approve',
          hours - 2,
        ),
        makeHistory(
          endOk.id,
          endOk.data.label,
          'end',
          manager,
          'Reached end',
          'Approve',
          hours - 2,
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
          hours - 1,
          'Insufficient justification',
        ),
        makeHistory(
          endNo.id,
          endNo.data.label,
          'end',
          manager,
          'Reached end',
          'Reject',
          hours - 1,
        ),
      );
      status = 'rejected';
      currentNodeId = endNo.id;
    }

    submissions.push({
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
    });
  };

  // Overtime — company visibility (BHP peers can see each other's)
  pushMgrFlow(
    overtime,
    alex,
    jordan,
    {
      'ot-date': '2026-07-25',
      'ot-hours': 4,
      'ot-shift': 'Night',
      'ot-reason': 'Concrete pour continuation through night shift',
    },
    'pending',
    8,
  );
  pushMgrFlow(
    overtime,
    casey,
    jordan,
    {
      'ot-date': '2026-07-22',
      'ot-hours': 3,
      'ot-shift': 'Day',
      'ot-reason': 'Commissioning support',
    },
    'approved',
    48,
  );

  // Vehicle — project visibility (Jansen peers)
  pushMgrFlow(
    vehicle,
    alex,
    jordan,
    {
      'vh-make': 'Toyota',
      'vh-model': 'Hilux',
      'vh-plate': 'SASK-4421',
      'vh-expiry': '2027-03-01',
      'vh-purpose': 'Site logistics between laydown and shaft area',
    },
    'pending',
    12,
  );
  pushMgrFlow(
    vehicle,
    morgan,
    taylor,
    {
      'vh-make': 'Ford',
      'vh-model': 'F-150',
      'vh-plate': 'OD-9910',
      'vh-expiry': '2026-11-15',
      'vh-purpose': 'Olympic Dam survey crew transport',
    },
    'approved',
    72,
  );

  // Change request — own visibility only
  pushMgrFlow(
    change,
    alex,
    jordan,
    {
      'cr-title': 'Update permit checklist',
      'cr-description': 'Add electrical isolation step to daily permit form',
      'cr-priority': 'High',
      'cr-impact': 'Medium',
    },
    'pending',
    5,
  );
  pushMgrFlow(
    change,
    morgan,
    taylor,
    {
      'cr-title': 'Revise visitor induction',
      'cr-description': 'Shorten safety video segment for contractors',
      'cr-priority': 'Low',
      'cr-impact': 'Low',
    },
    'rejected',
    96,
  );

  // Leave — company visibility
  pushMgrFlow(
    leave,
    casey,
    jordan,
    {
      'lv-type': 'Annual',
      'lv-start': '2026-08-10',
      'lv-end': '2026-08-14',
      'lv-notes': 'Family travel',
    },
    'pending',
    3,
  );
  pushMgrFlow(
    leave,
    alex,
    jordan,
    {
      'lv-type': 'Sick',
      'lv-start': '2026-07-18',
      'lv-end': '2026-07-18',
      'lv-notes': '',
    },
    'approved',
    60,
  );

  return submissions;
}

export function mergeSampleData(data: AppData): AppData {
  const catalog = createSampleCatalog();
  const sampleUsers = generateSampleUsers();
  const existingEmails = new Set(data.users.map((u) => u.email.toLowerCase()));
  const newUsers = sampleUsers.filter(
    (u) => !existingEmails.has(u.email.toLowerCase()),
  );
  // Re-link fixed sample user ids when regenerating over empty extras
  const users = [...data.users, ...newUsers].map((u) => ({
    ...u,
    project: u.project ?? ('Jansen' as const),
  }));

  // Replace forms/workflows with the sample catalog (removes legacy Simple Request)
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

  const sampleSubs = generateSampleSubmissions(forms, workflows, users);
  // Drop submissions for forms that no longer exist, then add samples
  const kept = data.submissions.filter((s) =>
    forms.some((f) => f.id === s.formId),
  );
  const submissions = [...kept, ...sampleSubs];

  return {
    ...paired,
    users,
    workflows,
    forms,
    submissions,
    delegations: data.delegations ?? [],
    notifications: data.notifications ?? [],
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
