/**
 * Pre-filled labels used when creating catalog items / form fields.
 * Focusing a field that still has one of these values clears it so the
 * user can type immediately without deleting the placeholder.
 */
const CREATE_DEFAULTS = new Set([
  'New Form',
  'New Workflow',
  'New Form Workflow', // dedicated workflow auto-named from a new form
  'New notification',
  'New field',
  'New text area',
  'Attachment',
  'Update on {{formName}}',
  'Request', // default first field on a new form
  'New status',
]);

/** True when `value` is still an untouched create-time placeholder. */
export function isCreateDefaultValue(value: string): boolean {
  return CREATE_DEFAULTS.has(value.trim());
}

/**
 * onFocus handler: clear the control once if it still shows a create default.
 * Call with the current value and a setter (and optional dirty callback).
 */
export function clearCreateDefaultOnFocus(
  value: string,
  setValue: (next: string) => void,
  onCleared?: () => void,
): void {
  if (!isCreateDefaultValue(value)) return;
  setValue('');
  onCleared?.();
}
