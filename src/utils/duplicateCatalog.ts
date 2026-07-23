import type {
  AppData,
  FormDefinition,
  NotificationTemplate,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../types';
import { createDedicatedWorkflowDraft, createId } from '../data/defaults';

/** Prefix a display name for a duplicated catalog item. */
export function copyName(name: string): string {
  const trimmed = name.trim() || 'Untitled';
  return `Copy of ${trimmed}`;
}

function cloneWorkflowGraph(
  source: Workflow,
  options: {
    formId: string | null;
    name: string;
    description?: string;
    fieldIdMap?: Map<string, string>;
    templateIdMap?: Map<string, string>;
    /** When true (standalone workflow copy), drop template refs that belong to another form */
    clearTemplateRefs?: boolean;
  },
): Workflow {
  const ts = new Date().toISOString();
  const nodeIdMap = new Map<string, string>();
  for (const n of source.nodes) {
    nodeIdMap.set(n.id, createId('node'));
  }

  const nodes: WorkflowNode[] = source.nodes.map((n) => {
    const data = { ...n.data };
    if (options.clearTemplateRefs) {
      delete data.notificationTemplateId;
    } else if (
      data.notificationTemplateId &&
      options.templateIdMap
    ) {
      const mapped = options.templateIdMap.get(data.notificationTemplateId);
      if (mapped) data.notificationTemplateId = mapped;
      else delete data.notificationTemplateId;
    }
    return {
      ...n,
      id: nodeIdMap.get(n.id)!,
      data,
    };
  });

  const edges: WorkflowEdge[] = source.edges.map((e) => ({
    ...e,
    id: createId('edge'),
    source: nodeIdMap.get(e.source) ?? e.source,
    target: nodeIdMap.get(e.target) ?? e.target,
    conditions: e.conditions?.map((c) => ({
      ...c,
      fieldId: options.fieldIdMap?.get(c.fieldId) ?? c.fieldId,
    })),
  }));

  return {
    id: createId('workflow'),
    name: options.name,
    description: options.description ?? source.description,
    formId: options.formId,
    nodes,
    edges,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Shallow clone of a notification template onto the same form. */
export function buildNotificationTemplateCopy(
  source: NotificationTemplate,
): NotificationTemplate {
  const ts = new Date().toISOString();
  return {
    ...source,
    id: createId('notif-tpl'),
    name: copyName(source.name),
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Clone a workflow as unassigned (formId null).
 * Clears notificationTemplateId refs so they do not point at another form's templates.
 */
export function buildWorkflowCopy(source: Workflow): Workflow {
  return cloneWorkflowGraph(source, {
    formId: null,
    name: copyName(source.name),
    clearTemplateRefs: true,
  });
}

export interface FormPackageCopy {
  form: FormDefinition;
  workflow: Workflow;
  templates: NotificationTemplate[];
}

/**
 * Deep-copy a form with its dedicated workflow and notification templates.
 * Field ids, node/edge ids, and template ids are remapped so the package is exclusive.
 */
export function buildFormPackageCopy(
  data: AppData,
  formId: string,
): FormPackageCopy | null {
  const source = data.forms.find((f) => f.id === formId);
  if (!source) return null;

  const ts = new Date().toISOString();
  const newFormId = createId('form');

  const fieldIdMap = new Map<string, string>();
  const fields = source.fields.map((f) => {
    const id = createId('field');
    fieldIdMap.set(f.id, id);
    return { ...f, id };
  });

  const sourceTemplates = (data.notificationTemplates ?? []).filter(
    (t) => t.formId === formId,
  );
  const templateIdMap = new Map<string, string>();
  const templates: NotificationTemplate[] = sourceTemplates.map((t) => {
    const id = createId('notif-tpl');
    templateIdMap.set(t.id, id);
    return {
      ...t,
      id,
      formId: newFormId,
      // Keep template names; the form is the "Copy of …" package
      createdAt: ts,
      updatedAt: ts,
    };
  });

  const sourceWorkflow =
    data.workflows.find((w) => w.id === source.workflowId) ??
    data.workflows.find((w) => w.formId === formId);

  const form: FormDefinition = {
    ...source,
    id: newFormId,
    name: copyName(source.name),
    fields,
    workflowId: null, // set after workflow id known
    createdAt: ts,
    updatedAt: ts,
  };

  let workflow: Workflow;
  if (sourceWorkflow) {
    workflow = cloneWorkflowGraph(sourceWorkflow, {
      formId: newFormId,
      name: copyName(sourceWorkflow.name),
      fieldIdMap,
      templateIdMap,
    });
  } else {
    const draft = createDedicatedWorkflowDraft(form.name);
    workflow = {
      ...draft,
      id: createId('workflow'),
      formId: newFormId,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  form.workflowId = workflow.id;

  return { form, workflow, templates };
}
