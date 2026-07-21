import type { AppData, FormDefinition, Workflow } from '../types';
import { createDedicatedWorkflowDraft, createId } from './defaults';

/**
 * Enforce exclusive 1:1 form ↔ workflow pairing.
 * - Every form gets exactly one workflow
 * - No two forms share a workflow
 * - Reverse pointers stay in sync
 */
export function enforceFormWorkflowOneToOne(data: AppData): AppData {
  const forms = [...(data.forms ?? [])];
  let workflows = [...(data.workflows ?? [])];
  const ts = new Date().toISOString();

  const claimedWorkflowIds = new Set<string>();

  const ensureWorkflowForForm = (
    form: FormDefinition,
    preferredWorkflowId: string | null,
  ): { form: FormDefinition; workflows: Workflow[] } => {
    let nextWorkflows = workflows;

    const canClaim = (workflowId: string) =>
      !claimedWorkflowIds.has(workflowId) &&
      nextWorkflows.some((w) => w.id === workflowId);

    let workflowId =
      preferredWorkflowId && canClaim(preferredWorkflowId)
        ? preferredWorkflowId
        : null;

    if (!workflowId) {
      const draft = createDedicatedWorkflowDraft(form.name);
      const created: Workflow = {
        ...draft,
        id: createId('workflow'),
        formId: form.id,
        createdAt: ts,
        updatedAt: ts,
      };
      nextWorkflows = [...nextWorkflows, created];
      workflowId = created.id;
    }

    claimedWorkflowIds.add(workflowId);
    workflows = nextWorkflows.map((w) =>
      w.id === workflowId
        ? { ...w, formId: form.id }
        : w.formId === form.id
          ? { ...w, formId: null }
          : w,
    );

    return {
      form: { ...form, workflowId },
      workflows,
    };
  };

  const nextForms: FormDefinition[] = [];
  for (const form of forms) {
    // Prefer explicit form.workflowId, else workflow that already points at this form
    const reverseOwner = workflows.find((w) => w.formId === form.id);
    const preferred = form.workflowId ?? reverseOwner?.id ?? null;
    const result = ensureWorkflowForForm(form, preferred);
    workflows = result.workflows;
    nextForms.push(result.form);
  }

  // Clear formId on workflows that are no longer claimed by any form
  const formIds = new Set(nextForms.map((f) => f.id));
  workflows = workflows.map((w) => {
    if (w.formId && !formIds.has(w.formId)) {
      return { ...w, formId: null };
    }
    const owner = nextForms.find((f) => f.workflowId === w.id);
    return owner ? { ...w, formId: owner.id } : { ...w, formId: null };
  });

  return { ...data, forms: nextForms, workflows };
}

/** Workflows a form may attach to: its current one, or any unassigned workflow. */
export function workflowsAvailableForForm(
  formId: string,
  currentWorkflowId: string | null | undefined,
  forms: FormDefinition[],
  workflows: Workflow[],
): Workflow[] {
  return workflows.filter((w) => {
    if (w.id === currentWorkflowId) return true;
    const taken = forms.some(
      (f) => f.id !== formId && f.workflowId === w.id,
    );
    return !taken;
  });
}
