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

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export type WorkflowNodeType = 'start' | 'step' | 'decision' | 'end';

export interface WorkflowNodeData {
  label: string;
  roleId?: string;
  description?: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
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
