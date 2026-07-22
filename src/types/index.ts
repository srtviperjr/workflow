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

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
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

export interface FormDefinition {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  /** Required exclusive workflow for this form (1:1 with Workflow.formId) */
  workflowId: string | null;
  /** Submission visibility boundary for this form */
  visibility: FormVisibility;
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

export type SubmissionStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'rejected';

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
  | 'lastChangedAt'
  | 'status'
  | 'currentStep';

/** One column in a form register layout (order = array order). */
export interface RegisterColumnConfig {
  /**
   * Meta column id, or `field:<formFieldId>` for a form field.
   */
  id: string;
  visible: boolean;
}

/** Per-user column layout for a form's register. */
export interface FormRegisterViewConfig {
  formId: string;
  userId: string;
  columns: RegisterColumnConfig[];
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
  currentUserId: string | null;
  version: number;
}
