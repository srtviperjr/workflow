export const COMPANIES = ['BHP', 'Hatch', 'Bantrel', 'Fluor'] as const;
export type Company = (typeof COMPANIES)[number];

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

export type WorkflowNodeType = 'start' | 'step' | 'decision' | 'end';

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
  /** Primary form this workflow is designed for (field conditions / form roles) */
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

export interface FormDefinition {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  workflowId: string | null;
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

export interface AppData {
  users: User[];
  roles: Role[];
  workflows: Workflow[];
  forms: FormDefinition[];
  submissions: FormSubmission[];
  currentUserId: string | null;
  version: number;
}
