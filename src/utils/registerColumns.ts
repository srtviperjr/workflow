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
  'submitter',
  'formName',
  'submittedAt',
  'lastChangedAt',
  'status',
  'currentStep',
];

/** Meta columns that are sticky by default (Request #, Submitter). */
export const DEFAULT_STICKY_COLUMN_IDS: ReadonlySet<string> = new Set([
  'requestId',
  'submitter',
]);

export function isDefaultStickyColumn(columnId: string): boolean {
  return DEFAULT_STICKY_COLUMN_IDS.has(columnId);
}

/** Approximate widths used for sticky `left` offsets (must match cell width). */
export function stickyColumnWidth(columnId: string): number {
  switch (columnId) {
    case 'requestId':
      return 110;
    case 'submitter':
      return 160;
    case 'formName':
      return 160;
    case 'status':
      return 120;
    case 'currentStep':
      return 150;
    default:
      return 160;
  }
}

/** Keep sticky columns contiguous at the start (relative order preserved). */
export function orderStickyColumnsFirst(
  columns: RegisterColumnConfig[],
): RegisterColumnConfig[] {
  const sticky = columns.filter((c) => c.sticky);
  const rest = columns.filter((c) => !c.sticky);
  return [...sticky, ...rest];
}

/**
 * SX for a sticky register cell. Sticky columns use fixed widths so `left`
 * offsets match the rendered size (avoids gaps where scrolling cells peek through).
 */
export function stickyCellSx(
  columns: Array<Pick<RegisterColumnConfig, 'id' | 'sticky'>>,
  columnId: string,
  opts?: { variant?: 'head' | 'filter' | 'body' },
): Record<string, unknown> {
  const stickyCols = columns.filter((c) => c.sticky);
  const idx = stickyCols.findIndex((c) => c.id === columnId);
  if (idx < 0) return {};

  let left = 0;
  for (let i = 0; i < idx; i++) {
    left += stickyColumnWidth(stickyCols[i].id);
  }

  const variant = opts?.variant ?? 'body';
  const isHead = variant === 'head' || variant === 'filter';
  const isLastSticky = idx === stickyCols.length - 1;
  const width = stickyColumnWidth(columnId);

  // Solid colors only — translucent backgrounds let scrolling cells show through.
  const headBg = '#FDE8D8';
  const bodyBg = '#FFFFFF';

  return {
    position: 'sticky',
    left,
    width,
    minWidth: width,
    maxWidth: width,
    zIndex: variant === 'head' ? 6 : variant === 'filter' ? 5 : 4,
    bgcolor: isHead ? headBg : bodyBg,
    backgroundColor: isHead ? headBg : bodyBg,
    backgroundClip: 'padding-box',
    boxSizing: 'border-box',
    overflow: 'hidden',
    // Edge separator so content does not appear to slide under the pin
    borderRight: isLastSticky ? '1px solid rgba(0,0,0,0.12)' : undefined,
    boxShadow: isLastSticky
      ? '6px 0 8px -4px rgba(0,0,0,0.18)'
      : undefined,
  };
}

/** Table styles required for horizontal sticky columns to work cleanly. */
export const REGISTER_STICKY_TABLE_SX = {
  borderCollapse: 'separate',
  borderSpacing: 0,
} as const;

/** Meta columns available on a per-form register (no form name — it's implied). */
export const FORM_REGISTER_META_COLUMNS: RegisterMetaColumnId[] = [
  'requestId',
  'submitter',
  'submittedAt',
  'lastChangedAt',
  'status',
  'currentStep',
];

/** Overall register layout with default sticky Request # + Submitter. */
export const OVERALL_REGISTER_COLUMN_CONFIG: RegisterColumnConfig[] =
  orderStickyColumnsFirst(
    OVERALL_REGISTER_COLUMNS.map((id) => ({
      id,
      visible: true,
      sticky: isDefaultStickyColumn(id),
    })),
  );

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
  return orderStickyColumnsFirst([
    ...FORM_REGISTER_META_COLUMNS.map((id) => ({
      id,
      visible: true,
      sticky: isDefaultStickyColumn(id),
    })),
    ...form.fields.map((f) => ({
      id: fieldColumnId(f.id),
      visible: true,
      sticky: false,
    })),
  ]);
}

/**
 * Merge a saved layout with the form's current fields.
 * Keeps user order/visibility/sticky for known columns; appends new fields; drops removed ones.
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
    resolved.push({
      id: col.id,
      visible: Boolean(col.visible),
      sticky:
        typeof col.sticky === 'boolean'
          ? col.sticky
          : isDefaultStickyColumn(col.id),
    });
  }
  for (const col of defaults) {
    if (seen.has(col.id)) continue;
    resolved.push({ ...col });
  }
  return orderStickyColumnsFirst(resolved);
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

export type DateFilterMode = 'between' | 'relative';

export type RegisterFilterValue =
  | { kind: 'text'; q: string }
  | { kind: 'select'; values: string[] }
  | {
      kind: 'dateRange';
      mode: DateFilterMode;
      /** Inclusive start (YYYY-MM-DD) when mode is between */
      from: string;
      /** Inclusive end (YYYY-MM-DD) when mode is between */
      to: string;
      /** Last N calendar days (including today) when mode is relative */
      relativeDays: number;
    };

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

export const RELATIVE_DATE_PRESETS: Array<{ days: number; label: string }> = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 365 days' },
];

export function emptyFilterValue(kind: RegisterFilterKind): RegisterFilterValue {
  if (kind === 'select') return { kind: 'select', values: [] };
  if (kind === 'dateRange') {
    return {
      kind: 'dateRange',
      mode: 'between',
      from: '',
      to: '',
      relativeDays: 90,
    };
  }
  return { kind: 'text', q: '' };
}

export function isFilterActive(filter: RegisterFilterValue | undefined): boolean {
  if (!filter) return false;
  if (filter.kind === 'text') return filter.q.trim().length > 0;
  if (filter.kind === 'select') return filter.values.length > 0;
  if (filter.mode === 'relative') return filter.relativeDays > 0;
  return Boolean(filter.from || filter.to);
}

export function countActiveFilters(filters: RegisterFilters): number {
  return Object.values(filters).filter(isFilterActive).length;
}

export function todayDayKey(): string {
  return toDayKey(new Date().toISOString());
}

/** Inclusive from/to day keys for matching a date filter. */
export function resolveDateFilterBounds(filter: Extract<
  RegisterFilterValue,
  { kind: 'dateRange' }
>): { from: string; to: string } {
  if (filter.mode === 'relative' && filter.relativeDays > 0) {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (filter.relativeDays - 1));
    return { from: toDayKey(start.toISOString()), to: toDayKey(end.toISOString()) };
  }
  return { from: filter.from, to: filter.to };
}

export function formatDateFilterSummary(
  filter: Extract<RegisterFilterValue, { kind: 'dateRange' }> | undefined,
): string {
  if (!filter || !isFilterActive(filter)) return 'Any date';
  if (filter.mode === 'relative') {
    const preset = RELATIVE_DATE_PRESETS.find((p) => p.days === filter.relativeDays);
    return preset?.label ?? `Last ${filter.relativeDays} days`;
  }
  if (filter.from && filter.to) return `${filter.from} → ${filter.to}`;
  if (filter.from) return `From ${filter.from}`;
  if (filter.to) return `Until ${filter.to}`;
  return 'Any date';
}

export function getColumnFilterKind(
  columnId: string,
  form?: FormDefinition | null,
): RegisterFilterKind {
  if (columnId === 'status') return 'select';
  if (columnId === 'formName') return 'select';
  if (columnId === 'currentStep') return 'select';
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

/** Distinct step/decision/end labels available for Current step filtering. */
export function collectWorkflowStepLabels(
  workflows: Workflow[],
  formId?: string | null,
): string[] {
  const list = formId
    ? workflows.filter((w) => w.formId === formId)
    : workflows;
  const labels = new Set<string>();
  for (const w of list) {
    for (const n of w.nodes) {
      if (n.type === 'start') continue;
      if (n.type === 'step' || n.type === 'decision' || n.type === 'end') {
        const label = n.data.label?.trim();
        if (label) labels.add(label);
      }
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}

export function getSelectFilterOptions(
  columnId: string,
  ctx: {
    form?: FormDefinition | null;
    forms?: FormDefinition[];
    workflows?: Workflow[];
  },
): Array<{ value: string; label: string }> {
  if (columnId === 'status') {
    return STATUS_FILTER_OPTIONS.filter((o) => o.value !== '').map((o) => ({
      value: o.value,
      label: o.label,
    }));
  }
  if (columnId === 'formName') {
    const names = [...new Set((ctx.forms ?? []).map((f) => f.name))].sort();
    return names.map((n) => ({ value: n, label: n }));
  }
  if (columnId === 'currentStep') {
    return collectWorkflowStepLabels(
      ctx.workflows ?? [],
      ctx.form?.id ?? null,
    ).map((s) => ({ value: s, label: s }));
  }
  const fieldId = parseFieldColumnId(columnId);
  if (fieldId && ctx.form) {
    const field = ctx.form.fields.find((f) => f.id === fieldId);
    if (field?.type === 'select') {
      return (field.options ?? []).map((opt) => ({ value: opt, label: opt }));
    }
  }
  return [];
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
      normalized = {
        kind: 'select',
        values: filter.trim() ? [filter] : [],
      };
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
    const bounds = resolveDateFilterBounds(normalized);
    return matchesDateRange(raw, bounds.from, bounds.to);
  }

  if (normalized.kind === 'select') {
    const selected = normalized.values.map((v) => v.trim()).filter(Boolean);
    if (selected.length === 0) return true;
    const value = filterValue(columnId, submission, ctx);
    if (columnId === 'status') {
      const lower = value.toLowerCase();
      return selected.some((q) => {
        const normalizedQ = q.replace(/\s+/g, '_').toLowerCase();
        return (
          lower === normalizedQ ||
          lower === q.toLowerCase() ||
          lower.replace('_', ' ') === q.toLowerCase()
        );
      });
    }
    const lower = value.toLowerCase();
    return selected.some(
      (q) => value === q || lower === q.toLowerCase(),
    );
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
