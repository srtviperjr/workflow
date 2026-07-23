import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  FormDefinition,
  FormVisibility,
  IntegrationSettings,
  NotificationTemplate,
  Role,
  User,
  Workflow,
} from '../types';
import { DEFAULT_FORM_STATUS_OPTIONS } from '../utils/formStatus';

const now = () => new Date().toISOString();

/** Empty / disabled production integration settings. */
export function createDefaultIntegrations(): IntegrationSettings {
  return {
    azureAd: {
      enabled: false,
      tenantId: '',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      authorityHost: 'login.microsoftonline.com',
      scopes: 'openid profile email User.Read',
      allowedDomain: '',
      ssoEnabled: true,
      syncUsersEnabled: false,
      groupClaim: 'groups',
    },
    azureSql: {
      enabled: false,
      server: '',
      port: 1433,
      database: '',
      authMethod: 'sql',
      username: '',
      password: '',
      encrypt: true,
      trustServerCertificate: false,
      connectionTimeoutSeconds: 30,
      connectionStringOverride: '',
    },
    email: {
      enabled: false,
      provider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpEncryption: 'starttls',
      smtpUsername: '',
      smtpPassword: '',
      graphTenantId: '',
      graphClientId: '',
      graphClientSecret: '',
      graphSenderUserId: '',
      fromAddress: '',
      fromDisplayName: 'Jansen Workflows',
      replyToAddress: '',
    },
    updatedAt: null,
  };
}

/** Stable template ids for sample form notification catalog */
export function sampleNotifyTemplateId(
  formId: string,
  kind: 'submit' | 'ok' | 'no',
): string {
  return `notif-tpl-${formId}-${kind}`;
}

/** Three standard templates dedicated to one form (submit / approve / reject). */
export function createFormNotificationTemplates(
  formId: string,
): NotificationTemplate[] {
  const ts = now();
  return [
    {
      id: sampleNotifyTemplateId(formId, 'submit'),
      name: 'Notify on submission',
      formId,
      description: 'Alert managers when a request is submitted',
      subject: 'New {{formName}} from {{submitter}}',
      bodyHtml:
        '<p>A new request needs review.</p><p>Form: {{formName}}<br>Request: {{requestId}}<br>Submitted by: {{submitter}}</p><p>Please open the request register to approve or reject.</p>',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sampleNotifyTemplateId(formId, 'ok'),
      name: 'Notify on approval',
      formId,
      description: 'Tell the submitter their request was approved',
      subject: '{{formName}} approved',
      bodyHtml:
        '<p>Your request was approved.</p><p>Form: {{formName}}<br>Request: {{requestId}}<br>Status: {{status}}</p>',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sampleNotifyTemplateId(formId, 'no'),
      name: 'Notify on rejection',
      formId,
      description: 'Tell the submitter their request was rejected',
      subject: '{{formName}} rejected',
      bodyHtml:
        '<p>Your request was rejected.</p><p>Form: {{formName}}<br>Request: {{requestId}}<br>Status: {{status}}</p>',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

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
    project: 'JS1',
    roleIds: ['role-admin', 'role-requestor'],
    createdAt: now(),
  };
}

/** Basic Requestor → Manager approve/reject workflow with notify steps. */
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
  const notifySubmitId = `${opts.id}-notify-submit`;
  const mgrId = `${opts.id}-mgr`;
  const notifyOkId = `${opts.id}-notify-ok`;
  const notifyNoId = `${opts.id}-notify-no`;
  const endOk = `${opts.id}-end-ok`;
  const endNo = `${opts.id}-end-no`;
  const ts = now();

  return {
    id: opts.id,
    name: opts.name,
    description:
      opts.description ??
      'Requestor submits → notify managers → Manager approves or rejects → notify submitter',
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
        id: notifySubmitId,
        type: 'notification',
        position: { x: 280, y: 220 },
        data: {
          label: 'Notify on submission',
          notificationTemplateId: opts.formId
            ? sampleNotifyTemplateId(opts.formId, 'submit')
            : undefined,
          notifyRoleIds: ['role-manager', 'role-admin'],
          notifySubmitter: false,
        },
      },
      {
        id: mgrId,
        type: 'decision',
        position: { x: 280, y: 360 },
        data: {
          label: 'Manager Review',
          roleId: 'role-manager',
          description: 'Manager approves or rejects',
          decisionMode: 'manual',
          decisionActions: ['approved', 'rejected'],
        },
      },
      {
        id: notifyOkId,
        type: 'notification',
        position: { x: 80, y: 500 },
        data: {
          label: 'Notify on approval',
          notificationTemplateId: opts.formId
            ? sampleNotifyTemplateId(opts.formId, 'ok')
            : undefined,
          notifyRoleIds: [],
          notifySubmitter: true,
        },
      },
      {
        id: notifyNoId,
        type: 'notification',
        position: { x: 480, y: 500 },
        data: {
          label: 'Notify on rejection',
          notificationTemplateId: opts.formId
            ? sampleNotifyTemplateId(opts.formId, 'no')
            : undefined,
          notifyRoleIds: [],
          notifySubmitter: true,
        },
      },
      {
        id: endOk,
        type: 'end',
        position: { x: 80, y: 640 },
        data: { label: 'Approved' },
      },
      {
        id: endNo,
        type: 'end',
        position: { x: 480, y: 640 },
        data: { label: 'Rejected' },
      },
    ],
    edges: [
      { id: `${opts.id}-e1`, source: startId, target: submitId },
      { id: `${opts.id}-e2`, source: submitId, target: notifySubmitId },
      { id: `${opts.id}-e3`, source: notifySubmitId, target: mgrId },
      {
        id: `${opts.id}-e4`,
        source: mgrId,
        target: notifyOkId,
        label: 'Approved',
        sourceHandle: 'approved',
        statusOptionId: 'approved',
      },
      {
        id: `${opts.id}-e5`,
        source: mgrId,
        target: notifyNoId,
        label: 'Rejected',
        sourceHandle: 'rejected',
        statusOptionId: 'rejected',
      },
      { id: `${opts.id}-e6`, source: notifyOkId, target: endOk },
      { id: `${opts.id}-e7`, source: notifyNoId, target: endNo },
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
    statusOptions: DEFAULT_FORM_STATUS_OPTIONS.map((o) => ({ ...o })),
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Four sample forms, each with a dedicated manager-approval workflow + notify templates. */
export function createSampleCatalog(): {
  forms: FormDefinition[];
  workflows: Workflow[];
  notificationTemplates: NotificationTemplate[];
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
      {
        id: 'cr-attachment',
        label: 'Attachment',
        type: 'file',
        required: false,
        placeholder: 'Optional supporting document',
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

  const notificationTemplates = forms.flatMap((f) =>
    createFormNotificationTemplates(f.id),
  );

  return { forms, workflows, notificationTemplates };
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
  const { forms, workflows, notificationTemplates } = createSampleCatalog();

  return {
    users: [admin],
    roles,
    workflows,
    forms,
    submissions: [],
    delegations: [],
    notifications: [],
    notificationTemplates,
    formRegisterViews: [],
    integrations: createDefaultIntegrations(),
    currentUserId: admin.id,
    version: 9,
  };
}

export function createId(prefix = 'id'): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

/** Default workflow title: "{Form name} Workflow". */
export function defaultWorkflowName(formName?: string | null): string {
  const base = (formName ?? '').trim() || 'New Form';
  return `${base} Workflow`;
}

/** Minimal start→end workflow used when pairing a new form 1:1. */
export function createDedicatedWorkflowDraft(
  formName = 'New Form',
): Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> {
  const startId = createId('node');
  const endId = createId('node');
  return {
    name: defaultWorkflowName(formName),
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
