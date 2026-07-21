import type {
  FormDefinition,
  FormSubmission,
  FormVisibility,
  User,
  Workflow,
} from '../types';
import { canUserActOnNode } from './workflowEngine';
import type { Role } from '../types';

/** Whether the viewer may see this submission in lists / detail. */
export function canViewSubmission(
  viewer: User | null | undefined,
  submission: FormSubmission,
  form: FormDefinition | undefined,
  users: User[],
  opts?: {
    roles?: Role[];
    workflows?: Workflow[];
    /** When true, users who can act on the current step also see it */
    includeActionable?: boolean;
    delegations?: import('../types').ApprovalDelegation[];
  },
): boolean {
  if (!viewer) return false;
  if (viewer.roleIds.includes('role-admin')) return true;
  if (submission.submittedBy === viewer.id) return true;

  if (opts?.includeActionable && opts.roles && opts.workflows) {
    const wf = opts.workflows.find((w) => w.id === submission.workflowId);
    const node = wf?.nodes.find((n) => n.id === submission.currentNodeId);
    if (
      submission.status === 'in_progress' &&
      node &&
      (node.type === 'step' || node.type === 'decision') &&
      canUserActOnNode(viewer, node, opts.roles, submission.formId, {
        workflowId: submission.workflowId,
        delegations: opts.delegations ?? [],
        users,
      })
    ) {
      return true;
    }
  }

  const visibility: FormVisibility = form?.visibility ?? 'project';
  const submitter = users.find((u) => u.id === submission.submittedBy);

  if (visibility === 'own') {
    return false;
  }
  if (!submitter) return false;
  if (visibility === 'company') {
    return submitter.company === viewer.company;
  }
  // project
  return submitter.project === viewer.project;
}

export function filterVisibleSubmissions(
  viewer: User | null | undefined,
  submissions: FormSubmission[],
  forms: FormDefinition[],
  users: User[],
  opts?: Parameters<typeof canViewSubmission>[4],
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
