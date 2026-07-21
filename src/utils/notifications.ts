import type {
  AppNotification,
  FormDefinition,
  FormField,
  FormSubmission,
  Role,
  User,
  WorkflowNode,
} from '../types';
import { createId } from '../data/defaults';

function roleAppliesToForm(role: Role, formId: string): boolean {
  if (role.scope !== 'form') return true;
  return role.formIds.includes(formId);
}

/** Built-in tokens available in every notification template */
export const BUILTIN_TEMPLATE_TOKENS = [
  { token: '{{formName}}', label: 'Form name' },
  { token: '{{requestId}}', label: 'Request ID' },
  { token: '{{status}}', label: 'Status' },
  { token: '{{submitter}}', label: 'Submitter name' },
] as const;

export function fieldToken(field: FormField): string {
  return `{{${field.label}}}`;
}

export function notificationSubjectTemplate(node: WorkflowNode): string {
  return (
    node.data.notifySubject ||
    node.data.emailSubject ||
    `Update: request`
  );
}

export function notificationBodyTemplate(node: WorkflowNode): string {
  return (
    node.data.notifyBody ||
    node.data.emailBody ||
    'A request was updated.\n\nForm: {{formName}}\nRequest: {{requestId}}'
  );
}

/**
 * Replace {{tokens}} in a template with form field values and built-ins.
 * Matches {{Field Label}}, {{fieldId}}, and known builtins.
 */
export function renderNotificationTemplate(
  template: string,
  ctx: {
    form: FormDefinition;
    submission: Pick<
      FormSubmission,
      'id' | 'formName' | 'data' | 'status' | 'submittedBy'
    >;
    users: User[];
  },
): string {
  if (!template) return '';
  const submitter = ctx.users.find((u) => u.id === ctx.submission.submittedBy);
  const builtins: Record<string, string> = {
    formName: ctx.submission.formName || ctx.form.name,
    requestId: ctx.submission.id,
    status: ctx.submission.status.replace('_', ' '),
    submitter: submitter
      ? `${submitter.firstName} ${submitter.lastName}`
      : 'Unknown',
    submitterEmail: submitter?.email ?? '',
  };

  const byLabel = new Map(
    ctx.form.fields.map((f) => [f.label.trim().toLowerCase(), f]),
  );
  const byId = new Map(ctx.form.fields.map((f) => [f.id, f]));

  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, raw: string) => {
    const key = String(raw).trim();
    if (key in builtins) return builtins[key];
    const lower = key.toLowerCase();
    if (lower in builtins) return builtins[lower];

    const field =
      byId.get(key) ??
      byLabel.get(lower) ??
      byLabel.get(key.replace(/^field:/i, '').toLowerCase());
    if (field) {
      const val = ctx.submission.data[field.id];
      return val === undefined || val === null ? '' : String(val);
    }
    return '';
  });
}

/** Users who hold any of the given roles and whose roles apply to this form. */
export function resolveNotificationRecipients(
  roleIds: string[],
  formId: string,
  users: User[],
  roles: Role[],
): User[] {
  const applicableRoleIds = new Set(
    roleIds.filter((rid) => {
      const role = roles.find((r) => r.id === rid);
      return role ? roleAppliesToForm(role, formId) : false;
    }),
  );
  if (applicableRoleIds.size === 0) return [];

  const seen = new Set<string>();
  const recipients: User[] = [];
  for (const user of users) {
    const match = user.roleIds.some((rid) => applicableRoleIds.has(rid));
    if (match && !seen.has(user.id)) {
      seen.add(user.id);
      recipients.push(user);
    }
  }
  return recipients;
}

export function buildNotificationFromNode(
  node: WorkflowNode,
  ctx: {
    form: FormDefinition;
    submission: FormSubmission;
    users: User[];
    roles: Role[];
    triggeredBy: User;
  },
): AppNotification | null {
  const roleIds = node.data.notifyRoleIds ?? [];
  const recipients = resolveNotificationRecipients(
    roleIds,
    ctx.form.id,
    ctx.users,
    ctx.roles,
  );

  if (node.data.notifySubmitter) {
    const submitter = ctx.users.find((u) => u.id === ctx.submission.submittedBy);
    if (submitter && !recipients.some((u) => u.id === submitter.id)) {
      recipients.push(submitter);
    }
  }

  const subjectTemplate =
    node.data.notifySubject ||
    node.data.emailSubject ||
    `Update: ${ctx.submission.formName}`;
  const bodyTemplate = notificationBodyTemplate(node);
  const subject = renderNotificationTemplate(subjectTemplate, ctx);
  const body = renderNotificationTemplate(bodyTemplate, ctx);

  return {
    id: createId('notif'),
    submissionId: ctx.submission.id,
    formId: ctx.form.id,
    workflowId: ctx.submission.workflowId,
    nodeId: node.id,
    nodeLabel: node.data.label || 'Notification',
    toUserIds: recipients.map((u) => u.id),
    toUserNames: recipients.map((u) => `${u.firstName} ${u.lastName}`),
    subject,
    body,
    sentAt: new Date().toISOString(),
    triggeredByUserId: ctx.triggeredBy.id,
    readByUserIds: [],
  };
}
