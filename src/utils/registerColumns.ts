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

export function filterValue(
  columnId: string,
  submission: FormSubmission,
  ctx: { users: User[]; workflows: Workflow[]; form?: FormDefinition | null },
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

/** Calendar day key (YYYY-MM-DD) in local time for ISO timestamps or date fields. */
export function toDayKey(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type RegisterFilterKind = 'text' | 'select' | 'dateRange';

export type RegisterFilterValue =
  | { kind: 'text'; q: string }
  | { kind: 'select'; value: string }
  | { kind: 'dateRange'; from: string; to: string };

export type RegisterFilters = Record<string, RegisterFilterValue>;

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

export function emptyFilterValue(kind: RegisterFilterKind): RegisterFilterValue {
  if (kind === 'select') return { kind: 'select', value: '' };
  if (kind === 'dateRange') return { kind: 'dateRange', from: '', to: '' };
  return { kind: 'text', q: '' };
}

export function isFilterActive(filter: RegisterFilterValue | undefined): boolean {
  if (!filter) return false;
  if (filter.kind === 'text') return filter.q.trim().length > 0;
  if (filter.kind === 'select') return filter.value.trim().length > 0;
  return Boolean(filter.from || filter.to);
}

export function countActiveFilters(filters: RegisterFilters): number {
  return Object.values(filters).filter(isFilterActive).length;
}

export function getColumnFilterKind(
  columnId: string,
  form?: FormDefinition | null,
): RegisterFilterKind {
  if (columnId === 'status') return 'select';
  if (columnId === 'formName') return 'select';
  if (columnId === 'submittedAt' || columnId === 'lastChangedAt') {
    return 'dateRange';
  }
  const fieldId = parseFieldColumnId(columnId);
  if (fieldId && form) {
    const field = form.fields.find((f) => f.id === fieldId);
    if (field?.type === 'date') return 'dateRange';
    if (field?.type === 'select') return 'select';
  }
  return 'text';
}

export function getSelectFilterOptions(
  columnId: string,
  ctx: {
    form?: FormDefinition | null;
    forms?: FormDefinition[];
  },
): Array<{ value: string; label: string }> {
  if (columnId === 'status') {
    return STATUS_FILTER_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    }));
  }
  if (columnId === 'formName') {
    const names = [...new Set((ctx.forms ?? []).map((f) => f.name))].sort();
    return [
      { value: '', label: 'All' },
      ...names.map((n) => ({ value: n, label: n })),
    ];
  }
  const fieldId = parseFieldColumnId(columnId);
  if (fieldId && ctx.form) {
    const field = ctx.form.fields.find((f) => f.id === fieldId);
    if (field?.type === 'select') {
      return [
        { value: '', label: 'All' },
        ...(field.options ?? []).map((opt) => ({ value: opt, label: opt })),
      ];
    }
  }
  return [{ value: '', label: 'All' }];
}

function matchesDateRange(
  rawValue: string,
  from: string,
  to: string,
): boolean {
  const day = toDayKey(rawValue);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function matchesColumnFilter(
  columnId: string,
  filter: RegisterFilterValue | string | undefined,
  submission: FormSubmission,
  ctx: {
    users: User[];
    workflows: Workflow[];
    form?: FormDefinition | null;
  },
): boolean {
  // Back-compat: plain string treated as text / status select
  let normalized: RegisterFilterValue | undefined;
  if (typeof filter === 'string') {
    const kind = getColumnFilterKind(columnId, ctx.form);
    if (kind === 'select') {
      normalized = { kind: 'select', value: filter };
    } else if (kind === 'dateRange') {
      // Legacy free-text date filter: fall back to substring on ISO/display
      if (!filter.trim()) return true;
      const value = filterValue(columnId, submission, ctx).toLowerCase();
      const q = filter.trim().toLowerCase();
      const display = formatRegisterTime(
        filterValue(columnId, submission, ctx),
      ).toLowerCase();
      return value.includes(q) || display.includes(q);
    } else {
      normalized = { kind: 'text', q: filter };
    }
  } else {
    normalized = filter;
  }

  if (!normalized || !isFilterActive(normalized)) return true;

  if (normalized.kind === 'dateRange') {
    const raw = filterValue(columnId, submission, ctx);
    return matchesDateRange(raw, normalized.from, normalized.to);
  }

  if (normalized.kind === 'select') {
    const q = normalized.value.trim();
    if (!q) return true;
    const value = filterValue(columnId, submission, ctx);
    if (columnId === 'status') {
      const lower = value.toLowerCase();
      const normalizedQ = q.replace(/\s+/g, '_').toLowerCase();
      return (
        lower === normalizedQ ||
        lower === q.toLowerCase() ||
        lower.replace('_', ' ') === q.toLowerCase()
      );
    }
    return value === q || value.toLowerCase() === q.toLowerCase();
  }

  // text — partial / contains search
  const q = normalized.q.trim().toLowerCase();
  if (!q) return true;
  const value = filterValue(columnId, submission, ctx).toLowerCase();
  if (columnId === 'requestId') {
    return value.includes(q) || shortRequestId(value).toLowerCase().includes(q);
  }
  return value.includes(q);
}
