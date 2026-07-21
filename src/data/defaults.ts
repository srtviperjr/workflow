import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  FormDefinition,
  FormVisibility,
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
    project: 'Jansen',
    roleIds: ['role-admin', 'role-requestor'],
    createdAt: now(),
  };
}

/** Basic Requestor → Manager approve/reject workflow, paired to a form. */
export function createManagerApprovalWorkflow(
  opts: {
    id: string;
    name: string;
    description?: string;
    formId: string | null;
  },
): Workflow {
  const startId = `${opts.id}-start`;
  const submitId = `${opts.id}-submit`;
  const mgrId = `${opts.id}-mgr`;
  const endOk = `${opts.id}-end-ok`;
  const endNo = `${opts.id}-end-no`;
  const ts = now();

  return {
    id: opts.id,
    name: opts.name,
    description:
      opts.description ??
      'Requestor submits → Manager approves or rejects',
    formId: opts.formId,
    nodes: [
      {
        id: startId,
        type: 'start',
        position: { x: 280, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: submitId,
        type: 'step',
        position: { x: 280, y: 100 },
        data: {
          label: 'Submit Request',
          roleId: 'role-requestor',
          description: 'Requestor completes and submits the form',
        },
      },
      {
        id: mgrId,
        type: 'decision',
        position: { x: 280, y: 260 },
        data: {
          label: 'Manager Review',
          roleId: 'role-manager',
          description: 'Manager approves or rejects',
          decisionMode: 'manual',
        },
      },
      {
        id: endOk,
        type: 'end',
        position: { x: 120, y: 420 },
        data: { label: 'Approved' },
      },
      {
        id: endNo,
        type: 'end',
        position: { x: 440, y: 420 },
        data: { label: 'Rejected' },
      },
    ],
    edges: [
      { id: `${opts.id}-e1`, source: startId, target: submitId },
      { id: `${opts.id}-e2`, source: submitId, target: mgrId },
      {
        id: `${opts.id}-e3`,
        source: mgrId,
        target: endOk,
        label: 'Approve',
        sourceHandle: 'approve',
      },
      {
        id: `${opts.id}-e4`,
        source: mgrId,
        target: endNo,
        label: 'Reject',
        sourceHandle: 'reject',
      },
    ],
    createdAt: ts,
    updatedAt: ts,
  };
}

function formShell(
  id: string,
  name: string,
  description: string,
  workflowId: string,
  visibility: FormVisibility,
  fields: FormDefinition['fields'],
): FormDefinition {
  const ts = now();
  return {
    id,
    name,
    description,
    fields,
    workflowId,
    visibility,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Four sample forms, each with a dedicated manager-approval workflow. */
export function createSampleCatalog(): {
  forms: FormDefinition[];
  workflows: Workflow[];
} {
  const overtimeWfId = 'workflow-overtime';
  const vehicleWfId = 'workflow-vehicle';
  const changeWfId = 'workflow-change';
  const leaveWfId = 'workflow-leave';

  const overtimeForm = formShell(
    'form-overtime',
    'Overtime Request',
    'Request overtime hours for an upcoming shift',
    overtimeWfId,
    'company',
    [
      {
        id: 'ot-date',
        label: 'Overtime date',
        type: 'date',
        required: true,
      },
      {
        id: 'ot-hours',
        label: 'Hours requested',
        type: 'number',
        required: true,
        placeholder: 'e.g. 4',
      },
      {
        id: 'ot-shift',
        label: 'Shift',
        type: 'select',
        required: true,
        options: ['Day', 'Night', 'Weekend'],
      },
      {
        id: 'ot-reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
        placeholder: 'Why is overtime needed?',
      },
    ],
  );

  const vehicleForm = formShell(
    'form-vehicle',
    'Vehicle Registration',
    'Register a vehicle for site access',
    vehicleWfId,
    'project',
    [
      {
        id: 'vh-make',
        label: 'Make',
        type: 'text',
        required: true,
        placeholder: 'e.g. Toyota',
      },
      {
        id: 'vh-model',
        label: 'Model',
        type: 'text',
        required: true,
        placeholder: 'e.g. Hilux',
      },
      {
        id: 'vh-plate',
        label: 'License plate',
        type: 'text',
        required: true,
      },
      {
        id: 'vh-expiry',
        label: 'Registration expiry',
        type: 'date',
        required: true,
      },
      {
        id: 'vh-purpose',
        label: 'Site purpose',
        type: 'textarea',
        required: true,
        placeholder: 'Where and why will this vehicle be used?',
      },
    ],
  );

  const changeForm = formShell(
    'form-change',
    'Change Request',
    'Propose a process or configuration change',
    changeWfId,
    'own',
    [
      {
        id: 'cr-title',
        label: 'Change title',
        type: 'text',
        required: true,
      },
      {
        id: 'cr-description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the proposed change…',
      },
      {
        id: 'cr-priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: ['Low', 'Medium', 'High', 'Critical'],
      },
      {
        id: 'cr-impact',
        label: 'Business impact',
        type: 'select',
        required: true,
        options: ['Low', 'Medium', 'High'],
      },
    ],
  );

  const leaveForm = formShell(
    'form-leave',
    'Leave Request',
    'Request time away from work',
    leaveWfId,
    'company',
    [
      {
        id: 'lv-type',
        label: 'Leave type',
        type: 'select',
        required: true,
        options: ['Annual', 'Sick', 'Personal', 'Other'],
      },
      {
        id: 'lv-start',
        label: 'Start date',
        type: 'date',
        required: true,
      },
      {
        id: 'lv-end',
        label: 'End date',
        type: 'date',
        required: true,
      },
      {
        id: 'lv-notes',
        label: 'Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Optional notes for your manager',
      },
    ],
  );

  const forms = [overtimeForm, vehicleForm, changeForm, leaveForm];
  const workflows = [
    createManagerApprovalWorkflow({
      id: overtimeWfId,
      name: 'Overtime Approval',
      formId: overtimeForm.id,
    }),
    createManagerApprovalWorkflow({
      id: vehicleWfId,
      name: 'Vehicle Registration Approval',
      formId: vehicleForm.id,
    }),
    createManagerApprovalWorkflow({
      id: changeWfId,
      name: 'Change Request Approval',
      formId: changeForm.id,
    }),
    createManagerApprovalWorkflow({
      id: leaveWfId,
      name: 'Leave Approval',
      formId: leaveForm.id,
    }),
  ];

  return { forms, workflows };
}

/** @deprecated Use createSampleCatalog — kept for older seed helpers */
export function createDefaultWorkflow(): Workflow {
  return createSampleCatalog().workflows[0];
}

/** @deprecated Use createSampleCatalog */
export function createDefaultForm(workflowId: string): FormDefinition {
  const { forms } = createSampleCatalog();
  return { ...forms[0], workflowId };
}

export function createInitialData(): AppData {
  const roles = createDefaultRoles();
  const admin = createDefaultAdmin();
  const { forms, workflows } = createSampleCatalog();

  return {
    users: [admin],
    roles,
    workflows,
    forms,
    submissions: [],
    delegations: [],
    notifications: [],
    currentUserId: admin.id,
    version: 6,
  };
}

export function createId(prefix = 'id'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

/** Minimal start→end workflow used when pairing a new form 1:1. */
export function createDedicatedWorkflowDraft(
  formName = 'New Form',
): Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> {
  const startId = createId('node');
  const endId = createId('node');
  return {
    name: `${formName} Workflow`,
    description: 'Dedicated approval workflow for this form',
    formId: null,
    nodes: [
      {
        id: startId,
        type: 'start',
        position: { x: 250, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: endId,
        type: 'end',
        position: { x: 250, y: 200 },
        data: { label: 'Complete' },
      },
    ],
    edges: [
      {
        id: createId('edge'),
        source: startId,
        target: endId,
      },
    ],
  };
}
