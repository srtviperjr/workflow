import { v4 as uuidv4 } from 'uuid';
import type { FormDefinition, FormStatusKind, FormStatusOption } from '../types';

/** Default request statuses every form starts with (required vocabulary). */
export const DEFAULT_FORM_STATUS_OPTIONS: FormStatusOption[] = [
  { id: 'submitted', label: 'Submitted', kind: 'initial' },
  { id: 'approved', label: 'Approved', kind: 'positive' },
  { id: 'rejected', label: 'Rejected', kind: 'negative' },
];

export const FORM_STATUS_KIND_LABELS: Record<FormStatusKind, string> = {
  initial: 'Initial (on submit)',
  positive: 'Positive (e.g. approved)',
  negative: 'Negative (e.g. rejected)',
  neutral: 'Neutral / other',
};

/** Ensure a form has a valid status list (at least one initial). */
export function normalizeStatusOptions(
  raw: FormStatusOption[] | undefined | null,
): FormStatusOption[] {
  const list = Array.isArray(raw)
    ? raw
        .filter((o) => o && typeof o.id === 'string' && o.id.trim())
        .map((o) => ({
          id: String(o.id).trim(),
          label: String(o.label ?? o.id).trim() || String(o.id),
          kind: (['initial', 'positive', 'negative', 'neutral'] as FormStatusKind[])
            .includes(o.kind as FormStatusKind)
            ? (o.kind as FormStatusKind)
            : ('neutral' as FormStatusKind),
        }))
    : [];

  if (list.length === 0) {
    return DEFAULT_FORM_STATUS_OPTIONS.map((o) => ({ ...o }));
  }
  if (!list.some((o) => o.kind === 'initial')) {
    list.unshift({ ...DEFAULT_FORM_STATUS_OPTIONS[0] });
  }
  return list;
}

export function getInitialStatusId(form?: FormDefinition | null): string {
  const options = normalizeStatusOptions(form?.statusOptions);
  return options.find((o) => o.kind === 'initial')?.id ?? 'submitted';
}

/** Statuses an actor may choose on a decision (non-initial). */
export function getActionStatusOptions(
  form?: FormDefinition | null,
): FormStatusOption[] {
  return normalizeStatusOptions(form?.statusOptions).filter(
    (o) => o.kind !== 'initial',
  );
}

export function findStatusOption(
  form: FormDefinition | null | undefined,
  statusId: string,
): FormStatusOption | undefined {
  return normalizeStatusOptions(form?.statusOptions).find(
    (o) => o.id === statusId,
  );
}

export function statusOptionLabel(
  form: FormDefinition | null | undefined,
  statusId: string,
): string {
  return findStatusOption(form, statusId)?.label ?? statusId;
}

/** Open = still actionable in a workflow (initial / neutral). */
export function isOpenStatus(
  statusId: string,
  form?: FormDefinition | null,
): boolean {
  // Legacy values from before form-owned statuses
  if (statusId === 'in_progress' || statusId === 'draft') return true;
  if (statusId === 'completed' || statusId === 'rejected') return false;
  const opt = findStatusOption(form, statusId);
  if (!opt) return statusId === 'submitted';
  return opt.kind === 'initial' || opt.kind === 'neutral';
}

export function statusChipColor(
  statusId: string,
  form?: FormDefinition | null,
): 'default' | 'success' | 'error' | 'warning' | 'info' {
  const opt = findStatusOption(form, statusId);
  const kind =
    opt?.kind ??
    (statusId === 'completed' || statusId === 'approved'
      ? 'positive'
      : statusId === 'rejected'
        ? 'negative'
        : statusId === 'in_progress' || statusId === 'submitted'
          ? 'initial'
          : 'neutral');
  switch (kind) {
    case 'positive':
      return 'success';
    case 'negative':
      return 'error';
    case 'initial':
      return 'warning';
    default:
      return 'info';
  }
}

/** Map legacy submission status strings onto form status ids. */
export function migrateLegacyStatus(status: string): string {
  if (status === 'in_progress') return 'submitted';
  if (status === 'completed') return 'approved';
  return status;
}

export function createStatusOption(
  label = 'New status',
  kind: FormStatusKind = 'neutral',
): FormStatusOption {
  return {
    id: `status-${uuidv4().slice(0, 8)}`,
    label,
    kind,
  };
}
