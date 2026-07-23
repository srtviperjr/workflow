/** App display version — keep in sync with package.json. */
export const APP_VERSION = '0.8.2';

/** Opens release notes in a dedicated browser window (newest first). */
export function openReleaseNotesWindow(): void {
  const url = `${window.location.origin}/release-notes`;
  window.open(
    url,
    'jansen-release-notes',
    'noopener,noreferrer,width=920,height=780',
  );
}
