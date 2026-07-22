import { jsPDF } from 'jspdf';
import type { FormDefinition, FormSubmission, User } from '../types';
import { formatFieldDisplayValue, isFileAttachment } from './formValues';

const COLORS = {
  primary: [226, 82, 0] as [number, number, number],
  primaryDark: [179, 66, 0] as [number, number, number],
  primaryLight: [240, 106, 26] as [number, number, number],
  charcoal: [43, 43, 43] as [number, number, number],
  muted: [107, 107, 107] as [number, number, number],
  border: [230, 220, 212] as [number, number, number],
  fieldBg: [255, 250, 247] as [number, number, number],
  pageBg: [244, 242, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function statusLabel(status: FormSubmission['status']): string {
  return status.replace(/_/g, ' ');
}

/** Generate and download a branded PDF snapshot of the form submission. */
export function downloadFormPdf(opts: {
  form: FormDefinition;
  submission: FormSubmission;
  submitter?: User;
}): void {
  const { form, submission, submitter } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      // Subtle page background wash
      doc.setFillColor(...COLORS.pageBg);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
      return true;
    }
    return false;
  };

  const drawBanner = () => {
    const bannerH = 88;
    // Gradient approximation: stacked bands
    doc.setFillColor(...COLORS.primaryDark);
    doc.rect(0, 0, pageWidth, bannerH, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth * 0.72, bannerH, 'F');
    doc.setFillColor(...COLORS.primaryLight);
    doc.rect(pageWidth * 0.72, 0, pageWidth * 0.28, bannerH, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Jansen Workflows', margin, 28);

    doc.setFontSize(20);
    const title = submission.formName || form.name;
    const titleLines = doc.splitTextToSize(title, contentWidth) as string[];
    doc.text(titleLines[0] ?? title, margin, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Request ${submission.id}`, margin, 74);

    y = bannerH + 20;
  };

  const metaChip = (label: string, value: string, x: number, chipY: number, w: number) => {
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, chipY, w, 44, 6, 6, 'FD');
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 10, chipY + 14);
    doc.setTextColor(...COLORS.charcoal);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, w - 20) as string[];
    doc.text(lines[0] ?? value, x + 10, chipY + 30);
  };

  // First page background
  doc.setFillColor(...COLORS.pageBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  drawBanner();

  // Meta row — three cards like a form header
  const gap = 10;
  const chipW = (contentWidth - gap * 2) / 3;
  metaChip('Status', statusLabel(submission.status), margin, y, chipW);
  metaChip(
    'Submitted',
    new Date(submission.submittedAt).toLocaleString(),
    margin + chipW + gap,
    y,
    chipW,
  );
  metaChip(
    'Submitter',
    submitter
      ? `${submitter.firstName} ${submitter.lastName}`
      : 'Unknown',
    margin + (chipW + gap) * 2,
    y,
    chipW,
  );
  y += 56;

  if (submitter) {
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `${submitter.email} · ${submitter.company}${submitter.project ? ` · ${submitter.project}` : ''}`,
      margin,
      y,
    );
    y += 16;
  }

  if (form.description) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(form.description, contentWidth) as string[];
    for (const ln of descLines) {
      ensureSpace(14);
      doc.text(ln, margin, y);
      y += 13;
    }
    y += 6;
  }

  // Form fields section
  ensureSpace(28);
  doc.setTextColor(...COLORS.charcoal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Form details', margin, y);
  y += 6;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 56, y);
  y += 14;

  for (const field of form.fields) {
    const raw = submission.data[field.id];
    let display = formatFieldDisplayValue(raw);
    if (isFileAttachment(raw)) {
      display = raw.name
        ? `${raw.name}${raw.size ? ` (${Math.round(raw.size / 1024)} KB)` : ''}`
        : display;
    }
    const value = display.trim() === '' ? '—' : display;
    const valueLines = doc.splitTextToSize(value, contentWidth - 24) as string[];
    const boxH = Math.max(48, 28 + valueLines.length * 13);

    ensureSpace(boxH + 10);
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, contentWidth, boxH, 6, 6, 'FD');

    // Left accent bar (form-field feel)
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, 4, boxH, 'F');

    doc.setFillColor(...COLORS.fieldBg);
    doc.rect(margin + 4, y, contentWidth - 4, 20, 'F');

    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const req = field.required ? ' *' : '';
    doc.text(`${field.label.toUpperCase()}${req}`, margin + 14, y + 13);

    doc.setTextColor(...COLORS.charcoal);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    let textY = y + 34;
    for (const ln of valueLines) {
      doc.text(ln, margin + 14, textY);
      textY += 13;
    }

    y += boxH + 8;
  }

  // Workflow history — user actions only
  const history = (submission.history ?? []).filter(
    (h) => h.stepType === 'step' || h.stepType === 'decision',
  );
  if (history.length) {
    ensureSpace(40);
    y += 6;
    doc.setTextColor(...COLORS.charcoal);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Workflow history', margin, y);
    y += 6;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 72, y);
    y += 14;

    for (const h of history) {
      const when = new Date(h.timestamp).toLocaleString();
      const headline = `${h.stepLabel} · ${h.action}${h.outcome ? ` (${h.outcome})` : ''}`;
      const detail = `${when} · ${h.userName}`;
      const commentLines = h.comment
        ? (doc.splitTextToSize(h.comment, contentWidth - 28) as string[])
        : [];
      const boxH = 40 + commentLines.length * 12;

      ensureSpace(boxH + 8);
      doc.setFillColor(...COLORS.white);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, y, contentWidth, boxH, 6, 6, 'FD');

      doc.setFillColor(...COLORS.charcoal);
      doc.circle(margin + 14, y + 16, 3, 'F');

      doc.setTextColor(...COLORS.charcoal);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(headline, margin + 24, y + 14);

      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(detail, margin + 24, y + 28);

      if (commentLines.length) {
        let cy = y + 42;
        doc.setTextColor(...COLORS.charcoal);
        doc.setFontSize(9);
        for (const ln of commentLines) {
          doc.text(ln, margin + 24, cy);
          cy += 12;
        }
      }

      y += boxH + 8;
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Jansen Workflows', margin, pageHeight - 14);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 14, {
      align: 'right',
    });
  }

  const safeName = (submission.formName || form.name || 'form')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 40);
  doc.save(`${safeName}_${submission.id}.pdf`);
}
