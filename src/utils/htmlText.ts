/**
 * Strip HTML to a single-line plain-text preview (e.g. notification list).
 */
export function plainTextFromHtml(html: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, ' ')
    .replace(/<\s*li[^>]*>/gi, '• ');
  const stripped = withBreaks.replace(/<[^>]+>/g, ' ');
  return stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
