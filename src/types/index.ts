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
   * Notification node: roles whose members receive the in-app notification.
   * Form-scoped roles only apply when the role is linked to this form.
   */
  notifyRoleIds?: string[];
  /**
   * When true, the request submitter always receives the notification
   * (in addition to any selected roles).
   */
  notifySubmitter?: boolean;
  /** Subject template; supports {{Field Label}} and {{formName}} */
  notifySubject?: string;
  /** Message body template; static text plus {{field}} tokens */
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

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

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
  data: Record<string, string | number>;
  /** Original values at submit time — used for "changed" / "unchanged" conditions */
  baselineData: Record<string, string | number>;
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
  body: string;
  sentAt: string;
  triggeredByUserId: string;
  /** True until the recipient opens/views it (admins see all) */
  readByUserIds?: string[];
}

export interface AppData {
  users: User[];
  roles: Role[];
  workflows: Workflow[];
  forms: FormDefinition[];
  submissions: FormSubmission[];
  delegations: ApprovalDelegation[];
  notifications: AppNotification[];
  currentUserId: string | null;
  version: number;
}
