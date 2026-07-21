import { jsPDF } from 'jspdf';
import type { FormDefinition, FormSubmission, User } from '../types';

/** Generate and download a PDF snapshot of the current form submission. */
export function downloadFormPdf(opts: {
  form: FormDefinition;
  submission: FormSubmission;
  submitter?: User;
}): void {
  const { form, submission, submitter } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const ln of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, margin, y);
      y += size + 6;
    }
  };

  line(submission.formName || form.name, 18, 'bold');
  line(`Request ID: ${submission.id}`, 10);
  line(
    `Status: ${submission.status.replace('_', ' ')} · Submitted ${new Date(submission.submittedAt).toLocaleString()}`,
    10,
  );
  if (submitter) {
    line(
      `Submitted by: ${submitter.firstName} ${submitter.lastName} <${submitter.email}> (${submitter.company})`,
      10,
    );
  }
  y += 8;
  doc.setDrawColor(13, 115, 119);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  line('Form fields', 13, 'bold');
  y += 4;

  for (const field of form.fields) {
    const raw = submission.data[field.id];
    const value =
      raw === undefined || raw === null || String(raw).trim() === ''
        ? '—'
        : String(raw);
    line(`${field.label}`, 11, 'bold');
    line(value, 11, 'normal');
    y += 6;
  }

  if (submission.history?.length) {
    y += 8;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
    line('Workflow history', 13, 'bold');
    y += 4;
    for (const h of submission.history) {
      const when = new Date(h.timestamp).toLocaleString();
      line(
        `${when} · ${h.stepLabel} · ${h.userName} · ${h.action}${h.outcome ? ` (${h.outcome})` : ''}`,
        9,
      );
      if (h.comment) line(`  ${h.comment}`, 9);
    }
  }

  const safeName = (submission.formName || form.name || 'form')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 40);
  doc.save(`${safeName}_${submission.id}.pdf`);
}
