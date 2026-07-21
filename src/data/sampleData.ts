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
  createDefaultForm,
  createDefaultWorkflow,
  createId,
  createInitialData,
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
      id: createId('user'),
      firstName: 'Alex',
      lastName: 'Chen',
      email: 'alex.chen@bhp.com',
      company: 'BHP',
      roleIds: ['role-requestor'],
      createdAt: ts,
    },
    {
      id: createId('user'),
      firstName: 'Jordan',
      lastName: 'Patel',
      email: 'jordan.patel@hatch.com',
      company: 'Hatch',
      roleIds: ['role-manager'],
      createdAt: ts,
    },
    {
      id: createId('user'),
      firstName: 'Sam',
      lastName: 'Rivera',
      email: 'sam.rivera@bantrel.com',
      company: 'Bantrel',
      roleIds: ['role-project-director'],
      createdAt: ts,
    },
    {
      id: createId('user'),
      firstName: 'Taylor',
      lastName: 'Brooks',
      email: 'taylor.brooks@fluor.com',
      company: 'Fluor',
      roleIds: ['role-requestor', 'role-manager'],
      createdAt: ts,
    },
    {
      id: createId('user'),
      firstName: 'Morgan',
      lastName: 'Lee',
      email: 'morgan.lee@bhp.com',
      company: 'BHP',
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
    timestamp: d.toISOString(),
  };
}

export function generateSampleSubmissions(
  forms: FormDefinition[],
  workflows: Workflow[],
  users: User[],
): FormSubmission[] {
  const form = forms[0];
  const workflow = workflows.find((w) => w.id === form?.workflowId) ?? workflows[0];
  if (!form || !workflow) return [];

  const requestors = users.filter((u) =>
    u.roleIds.includes('role-requestor'),
  );
  const managers = users.filter((u) => u.roleIds.includes('role-manager'));
  const directors = users.filter((u) =>
    u.roleIds.includes('role-project-director'),
  );

  const req = requestors[0] ?? users[0];
  const mgr = managers[0] ?? users[0];
  const pd = directors[0] ?? users[0];

  const submitNode = workflow.nodes.find((n) => n.type === 'step');
  const mgrNode = workflow.nodes.find(
    (n) => n.type === 'decision' && n.data.roleId === 'role-manager',
  );
  const pdNode = workflow.nodes.find(
    (n) =>
      n.type === 'decision' && n.data.roleId === 'role-project-director',
  );
  const endApproved = workflow.nodes.find(
    (n) => n.type === 'end' && n.data.label.toLowerCase().includes('approv'),
  );
  const endRejected = workflow.nodes.find(
    (n) => n.type === 'end' && n.data.label.toLowerCase().includes('reject'),
  );

  const requests = [
    'Request additional scaffolding for Zone B inspection access',
    'Approve overtime for weekend concrete pour',
    'Need temporary power distribution board for Module 3',
  ];

  const submissions: FormSubmission[] = [];

  // Completed approved
  if (submitNode && mgrNode && pdNode && endApproved) {
    const data0 = {
      [form.fields[0]?.id ?? 'field']: requests[0],
      ...(form.fields[1] ? { [form.fields[1].id]: 'High' } : {}),
    };
    submissions.push({
      id: createId('sub'),
      formId: form.id,
      formName: form.name,
      data: data0,
      baselineData: { ...data0 },
      submittedBy: req.id,
      submittedAt: makeHistory('', '', 'start', req, '', undefined, 48)
        .timestamp,
      currentNodeId: endApproved.id,
      status: 'completed',
      workflowId: workflow.id,
      history: [
        makeHistory(
          submitNode.id,
          submitNode.data.label,
          'step',
          req,
          'Submitted',
          undefined,
          48,
        ),
        makeHistory(
          mgrNode.id,
          mgrNode.data.label,
          'decision',
          mgr,
          'Decision',
          'Approve',
          36,
        ),
        makeHistory(
          pdNode.id,
          pdNode.data.label,
          'decision',
          pd,
          'Decision',
          'Approve',
          24,
        ),
        makeHistory(
          endApproved.id,
          endApproved.data.label,
          'end',
          pd,
          'Completed',
          undefined,
          24,
        ),
      ],
    });
  }

  // In progress at manager
  if (submitNode && mgrNode) {
    const data1 = {
      [form.fields[0]?.id ?? 'field']: requests[1],
      ...(form.fields[1] ? { [form.fields[1].id]: 'Medium' } : {}),
    };
    submissions.push({
      id: createId('sub'),
      formId: form.id,
      formName: form.name,
      data: data1,
      baselineData: { ...data1 },
      submittedBy: req.id,
      submittedAt: makeHistory('', '', 'start', req, '', undefined, 12)
        .timestamp,
      currentNodeId: mgrNode.id,
      status: 'in_progress',
      workflowId: workflow.id,
      history: [
        makeHistory(
          submitNode.id,
          submitNode.data.label,
          'step',
          req,
          'Submitted',
          undefined,
          12,
        ),
      ],
    });
  }

  // Rejected
  if (submitNode && mgrNode && endRejected) {
    const req2 = requestors[1] ?? req;
    const data2 = {
      [form.fields[0]?.id ?? 'field']: requests[2],
      ...(form.fields[1] ? { [form.fields[1].id]: 'Low' } : {}),
    };
    submissions.push({
      id: createId('sub'),
      formId: form.id,
      formName: form.name,
      data: data2,
      baselineData: { ...data2 },
      submittedBy: req2.id,
      submittedAt: makeHistory('', '', 'start', req2, '', undefined, 72)
        .timestamp,
      currentNodeId: endRejected.id,
      status: 'rejected',
      workflowId: workflow.id,
      history: [
        makeHistory(
          submitNode.id,
          submitNode.data.label,
          'step',
          req2,
          'Submitted',
          undefined,
          72,
        ),
        makeHistory(
          mgrNode.id,
          mgrNode.data.label,
          'decision',
          mgr,
          'Decision',
          'Reject',
          60,
        ),
        makeHistory(
          endRejected.id,
          endRejected.data.label,
          'end',
          mgr,
          'Rejected',
          undefined,
          60,
        ),
      ],
    });
  }

  return submissions;
}

export function mergeSampleData(data: AppData): AppData {
  const existingEmails = new Set(data.users.map((u) => u.email.toLowerCase()));
  const newUsers = generateSampleUsers().filter(
    (u) => !existingEmails.has(u.email.toLowerCase()),
  );
  const users = [...data.users, ...newUsers];

  let workflows = data.workflows;
  let forms = data.forms;

  if (workflows.length === 0) {
    workflows = [createDefaultWorkflow()];
  }
  if (forms.length === 0) {
    forms = [createDefaultForm(workflows[0].id)];
    workflows = workflows.map((w, i) =>
      i === 0 ? { ...w, formId: forms[0].id } : w,
    );
  } else {
    workflows = workflows.map((w) => {
      if (w.formId) return w;
      const linked = forms.find((f) => f.workflowId === w.id);
      return linked ? { ...w, formId: linked.id } : w;
    });
  }

  const paired = enforceFormWorkflowOneToOne({
    ...data,
    users,
    workflows,
    forms,
  });
  workflows = paired.workflows;
  forms = paired.forms;

  const sampleSubs = generateSampleSubmissions(forms, workflows, users);
  const submissions = [...data.submissions, ...sampleSubs];

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
  };
}
