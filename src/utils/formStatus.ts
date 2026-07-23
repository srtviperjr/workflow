import { v4 as uuidv4 } from 'uuid';
import type { FormDefinition, FormStatusOption } from '../types';

/** Default request statuses every form starts with (ordered: first = on submit). */
export const DEFAULT_FORM_STATUS_OPTIONS: FormStatusOption[] = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

/** Ensure a form has a valid ordered status list (min 2: submit + ≥1 outcome). */
export function normalizeStatusOptions(
  raw: FormStatusOption[] | undefined | null,
): FormStatusOption[] {
  const list = Array.isArray(raw)
    ? raw
        .filter((o) => o && typeof o.id === 'string' && o.id.trim())
        .map((o) => ({
          id: String(o.id).trim(),
          label: String(o.label ?? o.id).trim() || String(o.id),
        }))
    : [];

  if (list.length === 0) {
    return DEFAULT_FORM_STATUS_OPTIONS.map((o) => ({ ...o }));
  }
  return list;
}

/** First status in the list is applied when a request is submitted. */
export function getInitialStatusId(form?: FormDefinition | null): string {
  const options = normalizeStatusOptions(form?.statusOptions);
  return options[0]?.id ?? 'submitted';
}

/** Remaining statuses (after the first) are available as decision outcomes. */
export function getActionStatusOptions(
  form?: FormDefinition | null,
): FormStatusOption[] {
  return normalizeStatusOptions(form?.statusOptions).slice(1);
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

/** Open = still the submit status (or legacy open values). */
export function isOpenStatus(
  statusId: string,
  form?: FormDefinition | null,
): boolean {
  if (statusId === 'in_progress' || statusId === 'draft') return true;
  if (statusId === 'completed' || statusId === 'rejected') return false;
  const initial = getInitialStatusId(form);
  return statusId === initial || statusId === 'submitted';
}

export function statusToneFromLabel(
  labelOrId: string,
): 'success' | 'error' | 'warning' | 'info' | 'default' {
  const s = labelOrId.toLowerCase();
  if (s.includes('reject') || s.includes('deny') || s.includes('decline')) {
    return 'error';
  }
  if (s.includes('approv') || s.includes('complete') || s.includes('accept')) {
    return 'success';
  }
  if (s.includes('submit') || s.includes('progress') || s.includes('pending')) {
    return 'warning';
  }
  return 'info';
}

export function statusChipColor(
  statusId: string,
  form?: FormDefinition | null,
): 'default' | 'success' | 'error' | 'warning' | 'info' {
  const label = statusOptionLabel(form, statusId);
  return statusToneFromLabel(label);
}

/** Map legacy submission status strings onto form status ids. */
export function migrateLegacyStatus(status: string): string {
  if (status === 'in_progress') return 'submitted';
  if (status === 'completed') return 'approved';
  return status;
}

export function createStatusOption(label = 'New status'): FormStatusOption {
  return {
    id: `status-${uuidv4().slice(0, 8)}`,
    label,
  };
}
