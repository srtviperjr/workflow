/** Session-scoped markers for create/copy drafts that must be discarded if never saved. */

export type EditorDraftKind = 'form' | 'workflow' | 'notification-template';

const PREFIX = 'jansen-editor-draft:';

function key(kind: EditorDraftKind, id: string): string {
  return `${PREFIX}${kind}:${id}`;
}

export function markEditorDraft(kind: EditorDraftKind, id: string): void {
  try {
    sessionStorage.setItem(key(kind, id), '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearEditorDraft(kind: EditorDraftKind, id: string): void {
  try {
    sessionStorage.removeItem(key(kind, id));
  } catch {
    /* ignore */
  }
}

export function isEditorDraft(kind: EditorDraftKind, id: string): boolean {
  try {
    return sessionStorage.getItem(key(kind, id)) === '1';
  } catch {
    return false;
  }
}
