import type {
  FormDefinition,
  FormRegisterViewConfig,
  FormSubmission,
  RegisterColumnConfig,
  RegisterMetaColumnId,
  SubmissionStatus,
  User,
  Workflow,
} from '../types';
import { formatFieldDisplayValue } from './formValues';

export const FIELD_COLUMN_PREFIX = 'field:';

export function fieldColumnId(fieldId: string): string {
  return `${FIELD_COLUMN_PREFIX}${fieldId}`;
}

export function parseFieldColumnId(columnId: string): string | null {
  if (!columnId.startsWith(FIELD_COLUMN_PREFIX)) return null;
  return columnId.slice(FIELD_COLUMN_PREFIX.length);
}

export const META_COLUMN_LABELS: Record<RegisterMetaColumnId, string> = {
  requestId: 'Request #',
  formName: 'Form',
  submitter: 'Submitter',
  submittedAt: 'Submission date',
  lastChangedAt: 'Last change',
  status: 'Status',
  currentStep: 'Current step',
};

/** Fixed columns for the overall (cross-form) register. */
export const OVERALL_REGISTER_COLUMNS: RegisterMetaColumnId[] = [
  'requestId',
  'formName',
  'submitter',
  'submittedAt',
  'lastChangedAt',
  'status',
  'currentStep',
];

/** Meta columns available on a per-form register (no form name — it's implied). */
export const FORM_REGISTER_META_COLUMNS: RegisterMetaColumnId[] = [
  'requestId',
  'submitter',
  'submittedAt',
  'lastChangedAt',
  'status',
  'currentStep',
];

export function lastChangedAt(submission: FormSubmission): string {
  let latest = submission.submittedAt;
  for (const entry of submission.history ?? []) {
    if (entry.timestamp > latest) latest = entry.timestamp;
  }
  return latest;
}

export function formatRegisterTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function shortRequestId(id: string): string {
  return id.slice(-8);
}

export function submitterName(
  submission: FormSubmission,
  users: User[],
): string {
  const user = users.find((u) => u.id === submission.submittedBy);
  return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
}

export function currentStepLabel(
  submission: FormSubmission,
  workflows: Workflow[],
): string {
  const wf = workflows.find((w) => w.id === submission.workflowId);
  const node = wf?.nodes.find((n) => n.id === submission.currentNodeId);
  return node?.data.label ?? '—';
}

export function defaultFormRegisterColumns(
  form: FormDefinition,
): RegisterColumnConfig[] {
  return [
    ...FORM_REGISTER_META_COLUMNS.map((id) => ({ id, visible: true })),
    ...form.fields.map((f) => ({
      id: fieldColumnId(f.id),
      visible: true,
    })),
  ];
}

/**
 * Merge a saved layout with the form's current fields.
 * Keeps user order/visibility for known columns; appends new fields; drops removed ones.
 */
export function resolveFormRegisterColumns(
  form: FormDefinition,
  saved: RegisterColumnConfig[] | undefined,
): RegisterColumnConfig[] {
  const defaults = defaultFormRegisterColumns(form);
  if (!saved || saved.length === 0) return defaults;

  const allowed = new Set(defaults.map((c) => c.id));
  const seen = new Set<string>();
  const resolved: RegisterColumnConfig[] = [];

  for (const col of saved) {
    if (!allowed.has(col.id) || seen.has(col.id)) continue;
    seen.add(col.id);
    resolved.push({ id: col.id, visible: Boolean(col.visible) });
  }
  for (const col of defaults) {
    if (seen.has(col.id)) continue;
    resolved.push(col);
  }
  return resolved;
}

export function getSavedFormRegisterView(
  views: FormRegisterViewConfig[] | undefined,
  formId: string,
  userId: string | null | undefined,
): FormRegisterViewConfig | undefined {
  if (!userId || !views) return undefined;
  return views.find((v) => v.formId === formId && v.userId === userId);
}

export function columnLabel(
  columnId: string,
  form?: FormDefinition | null,
): string {
  if (columnId in META_COLUMN_LABELS) {
    return META_COLUMN_LABELS[columnId as RegisterMetaColumnId];
  }
  const fieldId = parseFieldColumnId(columnId);
  if (fieldId && form) {
    return form.fields.find((f) => f.id === fieldId)?.label ?? fieldId;
  }
  return columnId;
}

export function cellValue(
  columnId: string,
  submission: FormSubmission,
  ctx: { users: User[]; workflows: Workflow[]; form?: FormDefinition | null },
): string {
  switch (columnId) {
    case 'requestId':
      return shortRequestId(submission.id);
    case 'formName':
      return submission.formName;
    case 'submitter':
      return submitterName(submission, ctx.users);
    case 'submittedAt':
      return formatRegisterTime(submission.submittedAt);
    case 'lastChangedAt':
      return formatRegisterTime(lastChangedAt(submission));
    case 'status':
      return submission.status.replace('_', ' ');
    case 'currentStep':
      return currentStepLabel(submission, ctx.workflows);
    default: {
      const fieldId = parseFieldColumnId(columnId);
      if (!fieldId) return '';
      const raw = submission.data[fieldId];
      return formatFieldDisplayValue(raw);
    }
  }
}

/** Raw value used for filtering (ISO dates, status codes, full request id). */
export function filterValue(
  columnId: string,
  submission: FormSubmission,
  ctx: { users: User[]; workflows: Workflow[] },
): string {
  switch (columnId) {
    case 'requestId':
      return submission.id;
    case 'formName':
      return submission.formName;
    case 'submitter':
      return submitterName(submission, ctx.users);
    case 'submittedAt':
      return submission.submittedAt;
    case 'lastChangedAt':
      return lastChangedAt(submission);
    case 'status':
      return submission.status;
    case 'currentStep':
      return currentStepLabel(submission, ctx.workflows);
    default: {
      const fieldId = parseFieldColumnId(columnId);
      if (!fieldId) return '';
      const raw = submission.data[fieldId];
      return formatFieldDisplayValue(raw);
    }
  }
}

export function matchesColumnFilter(
  columnId: string,
  filterText: string,
  submission: FormSubmission,
  ctx: { users: User[]; workflows: Workflow[] },
): boolean {
  const q = filterText.trim().toLowerCase();
  if (!q) return true;
  const value = filterValue(columnId, submission, ctx).toLowerCase();
  if (columnId === 'status') {
    const normalized = q.replace(/\s+/g, '_');
    return (
      value === normalized ||
      value.includes(q) ||
      value.replace('_', ' ').includes(q)
    );
  }
  if (columnId === 'requestId') {
    return value.toLowerCase().includes(q) || shortRequestId(value).includes(q);
  }
  // Dates: match locale display or ISO fragment
  if (columnId === 'submittedAt' || columnId === 'lastChangedAt') {
    const display = formatRegisterTime(filterValue(columnId, submission, ctx)).toLowerCase();
    return value.includes(q) || display.includes(q);
  }
  return value.includes(q);
}

export const STATUS_FILTER_OPTIONS: Array<{
  value: '' | SubmissionStatus;
  label: string;
}> = [
  { value: '', label: 'All' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
];
