import type {
  AppData,
  AppNotification,
  ApprovalDelegation,
  FormSubmission,
  User,
} from '../types';
import { createId } from '../data/defaults';
import {
  delegationCoversWorkflow,
  isDelegationActive,
  toDateOnly,
} from './workflowEngine';
import { filterActionableSubmissions } from './submissionVisibility';
import { shortRequestId } from './registerColumns';

/**
 * When more than this many covered requests are open, send one summary
 * notification with a link per request instead of one message each.
 */
export const HANDOFF_SUMMARY_THRESHOLD = 4;

/** In-progress requests the delegator can act on that this delegation covers. */
export function listCoveredActionableSubmissions(
  delegation: Pick<
    ApprovalDelegation,
    'fromUserId' | 'scope' | 'workflowIds'
  >,
  data: Pick<
    AppData,
    'submissions' | 'forms' | 'roles' | 'workflows' | 'users'
  >,
): FormSubmission[] {
  const fromUser = data.users.find((u) => u.id === delegation.fromUserId);
  if (!fromUser) return [];

  return filterActionableSubmissions(
    fromUser,
    data.submissions,
    data.forms,
    {
      roles: data.roles,
      workflows: data.workflows,
      users: data.users,
      // Own roles only — what the delegate inherits from this grant
      delegations: [],
    },
  ).filter((s) => delegationCoversWorkflow(delegation, s.workflowId));
}

function displayName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

function requestListHtml(submissions: FormSubmission[]): string {
  const items = submissions
    .map(
      (s) =>
        `<li><a href="/register/${s.id}">${s.formName} · Request ${shortRequestId(s.id)}</a></li>`,
    )
    .join('');
  return `<ul>${items}</ul>`;
}

function buildHandoffNotification(opts: {
  submission: FormSubmission | null;
  recipient: User;
  triggeredBy: User;
  subject: string;
  body: string;
  nodeId: string;
  nodeLabel: string;
}): AppNotification {
  return {
    id: createId('notif'),
    // Empty for multi-request summaries — links live in the body
    submissionId: opts.submission?.id ?? '',
    formId: opts.submission?.formId ?? '',
    workflowId: opts.submission?.workflowId ?? null,
    nodeId: opts.nodeId,
    nodeLabel: opts.nodeLabel,
    toUserIds: [opts.recipient.id],
    toUserNames: [displayName(opts.recipient)],
    subject: opts.subject,
    body: opts.body,
    sentAt: new Date().toISOString(),
    triggeredByUserId: opts.triggeredBy.id,
    readByUserIds: [],
  };
}

function buildStartBodies(
  delegator: User,
  delegation: ApprovalDelegation,
  submissions: FormSubmission[],
): { subject: string; body: string; submission: FormSubmission | null }[] {
  const intro =
    `<p>${displayName(delegator)} delegated approval authority to you` +
    ` and asked that you be notified of in-progress work.</p>` +
    `<p>Please review and take action while the delegation is active` +
    ` (${delegation.startDate} → ${delegation.endDate}).</p>`;

  if (submissions.length > HANDOFF_SUMMARY_THRESHOLD) {
    return [
      {
        subject: `${submissions.length} delegated requests awaiting action`,
        body:
          intro +
          `<p>The following <strong>${submissions.length}</strong> requests` +
          ` currently await action:</p>` +
          requestListHtml(submissions),
        submission: null,
      },
    ];
  }

  return submissions.map((s) => ({
    subject: `Delegated request awaiting action: ${s.formName}`,
    body:
      intro +
      `<p><a href="/register/${s.id}"><strong>${s.formName}</strong> · Request ${shortRequestId(s.id)}</a></p>`,
    submission: s,
  }));
}

function buildEndBodies(
  delegateName: string,
  delegation: ApprovalDelegation,
  submissions: FormSubmission[],
): { subject: string; body: string; submission: FormSubmission | null }[] {
  const intro =
    `<p>Your delegation to ${delegateName} has ended` +
    ` (${delegation.startDate} → ${delegation.endDate}).</p>`;

  if (submissions.length > HANDOFF_SUMMARY_THRESHOLD) {
    return [
      {
        subject: `Delegation ended — ${submissions.length} requests still need action`,
        body:
          intro +
          `<p>The following <strong>${submissions.length}</strong> covered` +
          ` requests were not completed during the delegation and still` +
          ` await your action:</p>` +
          requestListHtml(submissions),
        submission: null,
      },
    ];
  }

  return submissions.map((s) => ({
    subject: `Delegation ended — request still needs action: ${s.formName}`,
    body:
      intro +
      `<p>This request was not completed during the delegation and still` +
      ` awaits your action:</p>` +
      `<p><a href="/register/${s.id}"><strong>${s.formName}</strong> · Request ${shortRequestId(s.id)}</a></p>`,
    submission: s,
  }));
}

export function buildDelegationStartNotifications(
  delegation: ApprovalDelegation,
  submissions: FormSubmission[],
  data: Pick<AppData, 'users'>,
  triggeredBy: User,
): AppNotification[] {
  const delegate = data.users.find((u) => u.id === delegation.toUserId);
  const delegator = data.users.find((u) => u.id === delegation.fromUserId);
  if (!delegate || !delegator || submissions.length === 0) return [];

  return buildStartBodies(delegator, delegation, submissions).map((item) =>
    buildHandoffNotification({
      submission: item.submission,
      recipient: delegate,
      triggeredBy,
      nodeId: `${delegation.id}-start`,
      nodeLabel: 'Delegation started',
      subject: item.subject,
      body: item.body,
    }),
  );
}

export function buildDelegationEndNotifications(
  delegation: ApprovalDelegation,
  submissions: FormSubmission[],
  data: Pick<AppData, 'users'>,
  triggeredBy: User,
): AppNotification[] {
  const delegator = data.users.find((u) => u.id === delegation.fromUserId);
  const delegate = data.users.find((u) => u.id === delegation.toUserId);
  if (!delegator || submissions.length === 0) return [];

  const delegateName = delegate ? displayName(delegate) : 'your delegate';

  return buildEndBodies(delegateName, delegation, submissions).map((item) =>
    buildHandoffNotification({
      submission: item.submission,
      recipient: delegator,
      triggeredBy,
      nodeId: `${delegation.id}-end`,
      nodeLabel: 'Delegation ended',
      subject: item.subject,
      body: item.body,
    }),
  );
}

/**
 * Send start/end handoff notifications for delegations that need them.
 * - Start: when notifyDelegateOnStart and the window is active
 * - End: when the window has finished (endDate before today) and it had started
 */
export function applyDelegationHandoffs(data: AppData): AppData {
  const today = toDateOnly();
  const now = new Date().toISOString();
  const systemActor =
    data.users.find((u) => u.id === data.currentUserId) ??
    data.users.find((u) => u.roleIds.includes('role-admin')) ??
    data.users[0];
  if (!systemActor) return data;

  let changed = false;
  const newNotifications: AppNotification[] = [];
  const nextDelegations = (data.delegations ?? []).map((d) => {
    let next = d;

    if (
      d.notifyDelegateOnStart &&
      !d.startHandoffNotifiedAt &&
      isDelegationActive(d, today)
    ) {
      const items = listCoveredActionableSubmissions(d, data);
      newNotifications.push(
        ...buildDelegationStartNotifications(d, items, data, systemActor),
      );
      next = { ...next, startHandoffNotifiedAt: now };
      changed = true;
    }

    // Ended naturally (past end date) and had begun
    if (
      !d.endHandoffNotifiedAt &&
      d.startDate <= today &&
      d.endDate < today
    ) {
      const items = listCoveredActionableSubmissions(d, data);
      newNotifications.push(
        ...buildDelegationEndNotifications(d, items, data, systemActor),
      );
      next = { ...next, endHandoffNotifiedAt: now };
      changed = true;
    }

    return next;
  });

  if (!changed && newNotifications.length === 0) return data;

  return {
    ...data,
    delegations: nextDelegations,
    notifications: [...(data.notifications ?? []), ...newNotifications],
  };
}

/**
 * Build end-handoff notifications for a delegation that is being removed
 * or ended early (before natural expiry processing can run).
 */
export function notificationsForEndedDelegation(
  delegation: ApprovalDelegation,
  data: AppData,
  triggeredBy: User,
  asOf: string = toDateOnly(),
): AppNotification[] {
  if (delegation.endHandoffNotifiedAt) return [];
  // Only if the delegation had started
  if (delegation.startDate > asOf) return [];
  const items = listCoveredActionableSubmissions(delegation, data);
  return buildDelegationEndNotifications(
    delegation,
    items,
    data,
    triggeredBy,
  );
}
