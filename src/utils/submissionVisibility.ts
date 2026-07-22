import type {
  AppNotification,
  ApprovalDelegation,
  FormDefinition,
  FormSubmission,
  FormVisibility,
  Role,
  User,
  Workflow,
} from '../types';
import { canUserActOnNode } from './workflowEngine';

export interface SubmissionAccessOpts {
  roles: Role[];
  workflows: Workflow[];
  users: User[];
  delegations?: ApprovalDelegation[];
  /** Used so notification recipients can open the linked request. */
  notifications?: AppNotification[];
}

/** Whether the viewer may approve / complete the current step. */
export function canActOnSubmission(
  viewer: User | null | undefined,
  submission: FormSubmission,
  opts: SubmissionAccessOpts,
): boolean {
  if (!viewer) return false;
  if (submission.status !== 'in_progress' || !submission.currentNodeId) {
    return false;
  }
  const wf = opts.workflows.find((w) => w.id === submission.workflowId);
  const node = wf?.nodes.find((n) => n.id === submission.currentNodeId);
  if (!node || (node.type !== 'step' && node.type !== 'decision')) {
    return false;
  }
  return canUserActOnNode(viewer, node, opts.roles, submission.formId, {
    workflowId: submission.workflowId,
    delegations: opts.delegations ?? [],
    users: opts.users,
  });
}

function matchesVisibility(
  viewer: User,
  submission: FormSubmission,
  form: FormDefinition | undefined,
  users: User[],
): boolean {
  const visibility: FormVisibility = form?.visibility ?? 'project';
  if (visibility === 'own') return false;
  const submitter = users.find((u) => u.id === submission.submittedBy);
  if (!submitter) return false;
  if (visibility === 'company') {
    return submitter.company === viewer.company;
  }
  return submitter.project === viewer.project;
}

export type CanViewOpts = {
  roles?: Role[];
  workflows?: Workflow[];
  /**
   * When roles/workflows are provided, actionable requests are visible
   * unless explicitly set to false.
   */
  includeActionable?: boolean;
  delegations?: ApprovalDelegation[];
  notifications?: AppNotification[];
};

/**
 * Whether the viewer may see this submission in lists / detail.
 *
 * Allowed when any of:
 * - Admin
 * - Submitter
 * - Can act on the current step (approvers must open the request)
 * - Previously acted (appears in history)
 * - Received an in-app notification about this request
 * - Form visibility boundary (company / project) matches
 */
export function canViewSubmission(
  viewer: User | null | undefined,
  submission: FormSubmission,
  form: FormDefinition | undefined,
  users: User[],
  opts?: CanViewOpts,
): boolean {
  if (!viewer) return false;
  if (viewer.roleIds.includes('role-admin')) return true;
  if (submission.submittedBy === viewer.id) return true;

  if (submission.history?.some((h) => h.userId === viewer.id)) {
    return true;
  }

  if (
    opts?.notifications?.some(
      (n) =>
        n.submissionId === submission.id &&
        n.toUserIds.includes(viewer.id),
    )
  ) {
    return true;
  }

  if (
    opts?.roles &&
    opts?.workflows &&
    opts.includeActionable !== false &&
    canActOnSubmission(viewer, submission, {
      roles: opts.roles,
      workflows: opts.workflows,
      users,
      delegations: opts.delegations,
    })
  ) {
    return true;
  }

  return matchesVisibility(viewer, submission, form, users);
}

export function filterVisibleSubmissions(
  viewer: User | null | undefined,
  submissions: FormSubmission[],
  forms: FormDefinition[],
  users: User[],
  opts?: CanViewOpts,
): FormSubmission[] {
  return submissions.filter((s) =>
    canViewSubmission(
      viewer,
      s,
      forms.find((f) => f.id === s.formId),
      users,
      opts,
    ),
  );
}

/** Pending requests the viewer can both see and act on. */
export function filterActionableSubmissions(
  viewer: User | null | undefined,
  submissions: FormSubmission[],
  forms: FormDefinition[],
  opts: SubmissionAccessOpts,
): FormSubmission[] {
  return submissions.filter((s) => {
    if (!canActOnSubmission(viewer, s, opts)) return false;
    return canViewSubmission(
      viewer,
      s,
      forms.find((f) => f.id === s.formId),
      opts.users,
      {
        roles: opts.roles,
        workflows: opts.workflows,
        delegations: opts.delegations,
        notifications: opts.notifications,
        includeActionable: true,
      },
    );
  });
}
