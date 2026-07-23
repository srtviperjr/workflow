export const COMPANIES = ['BHP', 'Hatch', 'Bantrel', 'Fluor'] as const;
export type Company = (typeof COMPANIES)[number];

/** Projects used for form submission visibility ("within project") */
export const PROJECTS = ['JS1', 'JS2', 'Operations'] as const;
export type Project = (typeof PROJECTS)[number];

export const SYSTEM_ROLE_NAMES = [
  'Requestor',
  'Manager',
  'Project Director',
  'Admin',
] as const;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: Company;
  /** Project assignment — used when a form's visibility is "within project" */
  project: Project;
  roleIds: string[];
  createdAt: string;
}

export type RoleScope = 'app' | 'form';

export interface Role {
  id: string;
  name: string;
  description: string;
  /** Azure AD / Active Directory group names that map to this role */
  adGroupNames: string[];
  /** app = core application role; form = only for specific forms */
  scope: RoleScope;
  /** When scope is 'form', this role applies only to these forms */
  formIds: string[];
  isSystem: boolean;
}

export type WorkflowNodeType =
  | 'start'
  | 'step'
  | 'decision'
  | 'notification'
  | 'end';

/** How a decision node chooses its outgoing route */
export type DecisionMode = 'manual' | 'conditional';

export interface WorkflowNodeData {
  label: string;
  roleId?: string;
  description?: string;
  /** Manual = actor picks outcome; conditional = route by form field rules */
  decisionMode?: DecisionMode;
  /**
   * User decision: which form status outcomes the actor may choose
   * (ids from FormDefinition.statusOptions after the first/submit status).
   */
  decisionActions?: string[];
  /** When true, the actor can edit form field values at this step */
  allowFieldEdits?: boolean;
  /**
   * Notification template for this form (subject + body).
   * Recipients are configured on the node via notifyRoleIds / notifySubmitter.
   */
  notificationTemplateId?: string;
  /** Roles whose members receive this notification */
  notifyRoleIds?: string[];
  /** Also notify the request submitter */
  notifySubmitter?: boolean;
  /**
   * @deprecated Prefer NotificationTemplate via notificationTemplateId
   */
  notifySubject?: string;
  /**
   * @deprecated Prefer NotificationTemplate via notificationTemplateId
   */
  notifyBody?: string;
  /**
   * @deprecated Prefer notifySubject — kept for older saved workflows
   */
  emailSubject?: string;
  /**
   * @deprecated Prefer notifyBody — kept for older saved workflows
   */
  emailBody?: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export type ConditionOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'empty'
  | 'not_empty'
  | 'changed'
  | 'unchanged';

export const CONDITION_OP_LABELS: Record<ConditionOp, string> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'greater than',
  gte: 'greater than or equal',
  lt: 'less than',
  lte: 'less than or equal',
  contains: 'contains',
  empty: 'is empty',
  not_empty: 'is not empty',
  changed: 'has changed from submitted value',
  unchanged: 'has not changed from submitted value',
};

export interface EdgeCondition {
  fieldId: string;
  op: ConditionOp;
  /** Compared value for eq/neq/gt/…/contains; unused for empty/changed ops */
  value?: string | number;
}

export type EdgeRouteMode = 'manual' | 'condition';

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
  /**
   * When this edge leaves a decision, the form status option applied
   * (and shown as the actor action).
   */
  statusOptionId?: string;
  /** manual = actor chooses; condition = evaluate form field rules */
  routeMode?: EdgeRouteMode;
  /** AND-combined rules; used when routeMode is 'condition' */
  conditions?: EdgeCondition[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  /**
   * Exclusive form this workflow belongs to (1:1).
   * A workflow may be temporarily unassigned (`null`), but two forms
   * never share the same workflow.
   */
  formId: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'file';

/** Canvas placement for the visual form layout editor (px on the layout board). */
export interface FormFieldLayout {
  x: number;
  y: number;
  /** Width in px; defaults in the renderer when omitted */
  w?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  /** Optional position from the visual layout editor */
  layout?: FormFieldLayout;
}

/** File stored as a data URL in localStorage (see formValues helpers). */
export interface FileAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export type FormFieldValue = string | number | FileAttachment;
export type FormFieldData = Record<string, FormFieldValue>;

/**
 * Who can see submissions for this form in the register / listings.
 * Approvers who can act on a request always see it regardless.
 * Admins always see everything.
 */
export type FormVisibility = 'own' | 'company' | 'project';

export const FORM_VISIBILITY_LABELS: Record<FormVisibility, string> = {
  own: 'Only own submissions',
  company: 'Within company',
  project: 'Within project',
};

/**
 * Form-owned request status vocabulary (ordered).
 * First entry = status on submit; remaining = decision outcomes.
 * Typical defaults: Submitted, Approved, Rejected.
 */
export interface FormStatusOption {
  id: string;
  label: string;
}

export interface FormDefinition {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  /** Required exclusive workflow for this form (1:1 with Workflow.formId) */
  workflowId: string | null;
  /** Submission visibility boundary for this form */
  visibility: FormVisibility;
  /**
   * Required ordered statuses for this form.
   * Index 0 = on submit; the rest are available as decision outcomes.
   */
  statusOptions: FormStatusOption[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  stepId: string;
  stepLabel: string;
  stepType: WorkflowNodeType;
  userId: string;
  userName: string;
  action: string;
  outcome?: string;
  comment?: string;
  timestamp: string;
}

/**
 * Request status id — normally a FormStatusOption.id for the form
 * (e.g. submitted / approved / rejected). Legacy values may still appear
 * until migrated: draft | in_progress | completed | rejected.
 */
export type SubmissionStatus = string;

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  data: FormFieldData;
  /** Original values at submit time — used for "changed" / "unchanged" conditions */
  baselineData: FormFieldData;
  submittedBy: string;
  submittedAt: string;
  currentNodeId: string | null;
  /** Form status option id (see FormDefinition.statusOptions) */
  status: SubmissionStatus;
  history: HistoryEntry[];
  workflowId: string | null;
}

/** All workflows → one delegate, or specific workflows (possibly different delegates) */
export type DelegationScope = 'all' | 'workflows';

/**
 * Temporary grant of the delegator's approval permissions to another user.
 * Additive only: the delegate keeps their own roles and gains the
 * delegator's roles for covered workflows while the dates are active.
 */
export interface ApprovalDelegation {
  id: string;
  /** User whose approval authority is being delegated */
  fromUserId: string;
  /** User who receives the delegator's permissions (in addition to their own) */
  toUserId: string;
  scope: DelegationScope;
  /** When scope is 'workflows', these workflows are covered */
  workflowIds: string[];
  /** Inclusive start date (YYYY-MM-DD) */
  startDate: string;
  /** Inclusive end date (YYYY-MM-DD) */
  endDate: string;
  /** Duration in whole days used when creating/editing */
  durationDays: number;
  createdAt: string;
  /**
   * When true, notify the delegate of the delegator's in-progress actionable
   * requests once the delegation becomes active.
   */
  notifyDelegateOnStart?: boolean;
  /** ISO timestamp when the start handoff notification(s) were sent */
  startHandoffNotifiedAt?: string | null;
  /** ISO timestamp when the end handoff notification(s) were sent to the delegator */
  endHandoffNotifiedAt?: string | null;
}

/** In-app notification produced by a workflow notification step (not email). */
export interface AppNotification {
  id: string;
  submissionId: string;
  formId: string;
  workflowId: string | null;
  nodeId: string;
  nodeLabel: string;
  /** Recipient user ids */
  toUserIds: string[];
  /** Display names for recipients at send time */
  toUserNames: string[];
  subject: string;
  /** Rendered message; may contain simple HTML from rich-text templates */
  body: string;
  sentAt: string;
  triggeredByUserId: string;
  /** True until the recipient opens/views it (admins see all) */
  readByUserIds?: string[];
}

/**
 * Admin-designed notification template, dedicated to one form.
 * Workflow Notify nodes pick a template for content; recipients are
 * configured on the workflow node itself.
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  /** Exclusive form this template belongs to */
  formId: string;
  description: string;
  /** Plain-text subject; supports {{tokens}} */
  subject: string;
  /** Rich-text HTML body; supports {{tokens}} as plain text inside HTML */
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
}

/** Built-in columns shared by overall and per-form registers */
export type RegisterMetaColumnId =
  | 'requestId'
  | 'formName'
  | 'submitter'
  | 'submittedAt'
  | 'status'
  | 'currentStep';

/** One column in a form register layout (order = array order). */
export interface RegisterColumnConfig {
  /**
   * Meta column id, or `field:<formFieldId>` for a form field.
   */
  id: string;
  visible: boolean;
  /**
   * When true, the column stays locked on the left while scrolling
   * horizontally. Sticky columns are kept contiguous at the start.
   */
  sticky?: boolean;
}

/** Per-user column layout for a form's register. */
export interface FormRegisterViewConfig {
  formId: string;
  userId: string;
  columns: RegisterColumnConfig[];
}

/** Azure AD (Entra ID) for SSO and directory identity management. */
export interface AzureAdIntegrationSettings {
  enabled: boolean;
  /** Directory (tenant) ID */
  tenantId: string;
  /** Application (client) ID */
  clientId: string;
  /** Client secret (stored locally until a secure backend is wired) */
  clientSecret: string;
  /** OAuth redirect URI registered in the app registration */
  redirectUri: string;
  /** Authority host, e.g. login.microsoftonline.com */
  authorityHost: string;
  /** Space-separated OAuth scopes */
  scopes: string;
  /** Optional email domain restriction (e.g. contoso.com) */
  allowedDomain: string;
  /** Use Azure AD as the sign-in / SSO provider */
  ssoEnabled: boolean;
  /** Sync / map directory users and groups into the app */
  syncUsersEnabled: boolean;
  /** Optional claim name used to map AD groups to roles (e.g. groups) */
  groupClaim: string;
}

export type AzureSqlAuthMethod = 'sql' | 'azureAd' | 'managedIdentity';

/** Azure SQL Database connection settings for a production back-end. */
export interface AzureSqlIntegrationSettings {
  enabled: boolean;
  /** Server FQDN, e.g. myserver.database.windows.net */
  server: string;
  port: number;
  database: string;
  authMethod: AzureSqlAuthMethod;
  username: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeoutSeconds: number;
  /** When set, used instead of the field-built connection string */
  connectionStringOverride: string;
}

export type EmailProvider = 'smtp' | 'microsoftGraph';
export type SmtpEncryption = 'none' | 'starttls' | 'ssl';

/** Outbound email for workflow / system notifications in production. */
export interface EmailIntegrationSettings {
  enabled: boolean;
  provider: EmailProvider;
  // SMTP
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: SmtpEncryption;
  smtpUsername: string;
  smtpPassword: string;
  // Microsoft Graph sendMail
  graphTenantId: string;
  graphClientId: string;
  graphClientSecret: string;
  /** Mailbox / user id to send as */
  graphSenderUserId: string;
  // Common
  fromAddress: string;
  fromDisplayName: string;
  replyToAddress: string;
}

/** Admin-configured production integrations (stored with app data). */
export interface IntegrationSettings {
  azureAd: AzureAdIntegrationSettings;
  azureSql: AzureSqlIntegrationSettings;
  email: EmailIntegrationSettings;
  updatedAt: string | null;
}

export interface AppData {
  users: User[];
  roles: Role[];
  workflows: Workflow[];
  forms: FormDefinition[];
  submissions: FormSubmission[];
  delegations: ApprovalDelegation[];
  notifications: AppNotification[];
  /** Admin-designed notification templates (each dedicated to one form) */
  notificationTemplates: NotificationTemplate[];
  /** Saved per-form register column layouts */
  formRegisterViews: FormRegisterViewConfig[];
  /** Production integration settings (Azure AD, Azure SQL, email) */
  integrations: IntegrationSettings;
  currentUserId: string | null;
  version: number;
}
