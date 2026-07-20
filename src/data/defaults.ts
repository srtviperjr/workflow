import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  FormDefinition,
  Role,
  User,
  Workflow,
} from '../types';

const now = () => new Date().toISOString();

export function createDefaultRoles(): Role[] {
  return [
    {
      id: 'role-requestor',
      name: 'Requestor',
      description: 'Can create and submit form requests',
      adGroupNames: ['Jansen-Workflows-Requestors'],
      scope: 'app',
      formIds: [],
      isSystem: true,
    },
    {
      id: 'role-manager',
      name: 'Manager',
      description: 'Reviews and approves requests at manager level',
      adGroupNames: ['Jansen-Workflows-Managers', 'Jansen-Line-Managers'],
      scope: 'app',
      formIds: [],
      isSystem: true,
    },
    {
      id: 'role-project-director',
      name: 'Project Director',
      description: 'Final project-level approval authority',
      adGroupNames: ['Jansen-Workflows-Project-Directors'],
      scope: 'app',
      formIds: [],
      isSystem: true,
    },
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Full system administration access',
      adGroupNames: ['Jansen-Workflows-Admins'],
      scope: 'app',
      formIds: [],
      isSystem: true,
    },
  ];
}

export function createDefaultAdmin(): User {
  return {
    id: 'user-admin',
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@jansen.local',
    company: 'BHP',
    roleIds: ['role-admin', 'role-requestor'],
    createdAt: now(),
  };
}

export function createDefaultWorkflow(): Workflow {
  const startId = 'node-start';
  const submitId = 'node-submit';
  const mgrDecisionId = 'node-mgr-decision';
  const pdDecisionId = 'node-pd-decision';
  const endApprovedId = 'node-end-approved';
  const endRejectedId = 'node-end-rejected';
  const ts = now();

  return {
    id: 'workflow-standard-approval',
    name: 'Standard Approval',
    description:
      'Requestor submits → Manager decision → Project Director decision → Complete',
    formId: null,
    nodes: [
      {
        id: startId,
        type: 'start',
        position: { x: 250, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: submitId,
        type: 'step',
        position: { x: 250, y: 100 },
        data: {
          label: 'Submit Request',
          roleId: 'role-requestor',
          description: 'Requestor enters and submits the request',
        },
      },
      {
        id: mgrDecisionId,
        type: 'decision',
        position: { x: 250, y: 240 },
        data: {
          label: 'Manager Review',
          roleId: 'role-manager',
          description: 'Manager approves or rejects',
        },
      },
      {
        id: pdDecisionId,
        type: 'decision',
        position: { x: 100, y: 400 },
        data: {
          label: 'Project Director Review',
          roleId: 'role-project-director',
          description: 'Project Director final decision',
        },
      },
      {
        id: endApprovedId,
        type: 'end',
        position: { x: 100, y: 560 },
        data: { label: 'Approved' },
      },
      {
        id: endRejectedId,
        type: 'end',
        position: { x: 400, y: 400 },
        data: { label: 'Rejected' },
      },
    ],
    edges: [
      {
        id: 'e-start-submit',
        source: startId,
        target: submitId,
      },
      {
        id: 'e-submit-mgr',
        source: submitId,
        target: mgrDecisionId,
      },
      {
        id: 'e-mgr-approve',
        source: mgrDecisionId,
        target: pdDecisionId,
        label: 'Approve',
        sourceHandle: 'approve',
      },
      {
        id: 'e-mgr-reject',
        source: mgrDecisionId,
        target: endRejectedId,
        label: 'Reject',
        sourceHandle: 'reject',
      },
      {
        id: 'e-pd-approve',
        source: pdDecisionId,
        target: endApprovedId,
        label: 'Approve',
        sourceHandle: 'approve',
      },
      {
        id: 'e-pd-reject',
        source: pdDecisionId,
        target: endRejectedId,
        label: 'Reject',
        sourceHandle: 'reject',
      },
    ],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createDefaultForm(workflowId: string): FormDefinition {
  const ts = now();
  return {
    id: 'form-simple-request',
    name: 'Simple Request',
    description: 'Submit a request for approval with priority',
    fields: [
      {
        id: 'field-request',
        label: 'What is your request?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your request…',
      },
      {
        id: 'field-priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: ['Low', 'Medium', 'High'],
      },
    ],
    workflowId,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createInitialData(): AppData {
  const roles = createDefaultRoles();
  const admin = createDefaultAdmin();
  const workflow = createDefaultWorkflow();
  const form = createDefaultForm(workflow.id);
  workflow.formId = form.id;

  return {
    users: [admin],
    roles,
    workflows: [workflow],
    forms: [form],
    submissions: [],
    delegations: [],
    currentUserId: admin.id,
    version: 3,
  };
}

export function createId(prefix = 'id'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}
