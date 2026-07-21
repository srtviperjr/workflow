import type { FileAttachment, FormFieldValue } from '../types';

/** Soft cap so localStorage stays within typical browser quotas. */
export const MAX_FILE_ATTACHMENT_BYTES = 512 * 1024;

export function isFileAttachment(value: unknown): value is FileAttachment {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === 'string' &&
    typeof v.mimeType === 'string' &&
    typeof v.size === 'number' &&
    typeof v.dataUrl === 'string' &&
    v.dataUrl.startsWith('data:')
  );
}

export function isEmptyFieldValue(
  value: FormFieldValue | undefined | null,
): boolean {
  if (value === undefined || value === null) return true;
  if (isFileAttachment(value)) return !value.dataUrl || !value.name;
  if (typeof value === 'number') return false;
  return String(value).trim() === '';
}

/** Human-readable value for registers, PDF, notifications, and detail views. */
export function formatFieldDisplayValue(
  value: FormFieldValue | undefined | null,
): string {
  if (value === undefined || value === null) return '';
  if (isFileAttachment(value)) return value.name || '';
  return String(value);
}

/** Stable key for empty/changed comparisons (avoids "[object Object]"). */
export function fieldValueCompareKey(
  value: FormFieldValue | undefined | null,
): string {
  if (isEmptyFieldValue(value)) return '';
  if (isFileAttachment(value)) {
    return `file:${value.name}:${value.size}:${value.dataUrl}`;
  }
  return String(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_ATTACHMENT_BYTES) {
      reject(
        new Error(
          `File must be under ${Math.round(MAX_FILE_ATTACHMENT_BYTES / 1024)} KB (browser storage limit).`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: String(reader.result ?? ''),
      });
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Tiny in-memory attachment for sample/demo submissions. */
export function sampleTextAttachment(
  name: string,
  text: string,
): FileAttachment {
  const dataUrl = `data:text/plain;base64,${btoa(text)}`;
  return {
    name,
    mimeType: 'text/plain',
    size: text.length,
    dataUrl,
  };
}
