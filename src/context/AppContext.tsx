import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  ApprovalDelegation,
  AppNotification,
  FormDefinition,
  FormSubmission,
  Role,
  User,
  Workflow,
} from '../types';
import { createId, createDedicatedWorkflowDraft } from '../data/defaults';
import { enforceFormWorkflowOneToOne } from '../data/formWorkflowLink';
import { loadData, saveData } from '../data/storage';
import {
  mergeSampleData,
  resetAllData,
  resetByForm,
  type SampleSeedOptions,
} from '../data/sampleData';

interface AppContextValue {
  data: AppData;
  currentUser: User | null;
  isAdmin: boolean;
  setCurrentUserId: (id: string) => void;
  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // Roles
  addRole: (role: Omit<Role, 'id' | 'isSystem'>) => Role;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  assignRolesToUser: (userId: string, roleIds: string[]) => void;
  // Workflows
  addWorkflow: (wf: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Workflow;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  // Forms
  addForm: (
    form: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ) => FormDefinition;
  updateForm: (id: string, patch: Partial<FormDefinition>) => void;
  deleteForm: (id: string) => void;
  // Submissions
  addSubmission: (sub: FormSubmission) => void;
  updateSubmission: (id: string, patch: Partial<FormSubmission>) => void;
  deleteSubmission: (id: string) => void;
  // Notifications
  addNotifications: (items: AppNotification[]) => void;
  markNotificationRead: (id: string, userId: string) => void;
  // Delegations
  addDelegation: (
    delegation: Omit<ApprovalDelegation, 'id' | 'createdAt'>,
  ) => ApprovalDelegation;
  addDelegations: (
    items: Omit<ApprovalDelegation, 'id' | 'createdAt'>[],
  ) => ApprovalDelegation[];
  updateDelegation: (id: string, patch: Partial<ApprovalDelegation>) => void;
  deleteDelegation: (id: string) => void;
  // Admin tools
  seedSampleData: (options?: SampleSeedOptions) => void;
  resetEverything: () => void;
  resetFormData: (formId: string) => void;
  getUserById: (id: string) => User | undefined;
  getRoleById: (id: string) => Role | undefined;
  getWorkflowById: (id: string) => Workflow | undefined;
  getFormById: (id: string) => FormDefinition | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const update = useCallback((fn: (prev: AppData) => AppData) => {
    setData((prev) => fn(prev));
  }, []);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === data.currentUserId) ?? null,
    [data.users, data.currentUserId],
  );

  const isAdmin = useMemo(
    () => Boolean(currentUser?.roleIds.includes('role-admin')),
    [currentUser],
  );

  const value: AppContextValue = {
    data,
    currentUser,
    isAdmin,
    setCurrentUserId: (id) =>
      update((d) => ({ ...d, currentUserId: id })),

    addUser: (user) => {
      const created: User = {
        ...user,
        project: user.project ?? 'JS1',
        id: createId('user'),
        createdAt: new Date().toISOString(),
      };
      update((d) => ({ ...d, users: [...d.users, created] }));
      return created;
    },
    updateUser: (id, patch) =>
      update((d) => ({
        ...d,
        users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      })),
    deleteUser: (id) =>
      update((d) => ({
        ...d,
        users: d.users.filter((u) => u.id !== id),
        delegations: d.delegations.filter(
          (del) => del.fromUserId !== id && del.toUserId !== id,
        ),
        currentUserId:
          d.currentUserId === id
            ? (d.users.find((u) => u.id !== id)?.id ?? null)
            : d.currentUserId,
      })),

    addRole: (role) => {
      const created: Role = {
        ...role,
        adGroupNames: role.adGroupNames ?? [],
        scope: role.scope ?? 'app',
        formIds: role.formIds ?? [],
        id: createId('role'),
        isSystem: false,
      };
      update((d) => ({ ...d, roles: [...d.roles, created] }));
      return created;
    },
    updateRole: (id, patch) =>
      update((d) => ({
        ...d,
        roles: d.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    deleteRole: (id) =>
      update((d) => {
        const role = d.roles.find((r) => r.id === id);
        if (role?.isSystem) return d;
        return {
          ...d,
          roles: d.roles.filter((r) => r.id !== id),
          users: d.users.map((u) => ({
            ...u,
            roleIds: u.roleIds.filter((rid) => rid !== id),
          })),
        };
      }),
    assignRolesToUser: (userId, roleIds) =>
      update((d) => ({
        ...d,
        users: d.users.map((u) =>
          u.id === userId ? { ...u, roleIds } : u,
        ),
      })),

    addWorkflow: (wf) => {
      const ts = new Date().toISOString();
      const created: Workflow = {
        ...wf,
        formId: wf.formId ?? null,
        id: createId('workflow'),
        createdAt: ts,
        updatedAt: ts,
      };
      update((d) => {
        let forms = d.forms;
        let workflows = [...d.workflows, created];
        if (created.formId) {
          // Exclusive: this form leaves any previous workflow; no other form keeps this one
          forms = d.forms.map((f) => {
            if (f.id === created.formId) return { ...f, workflowId: created.id };
            if (f.workflowId === created.id) return { ...f, workflowId: null };
            return f;
          });
          workflows = workflows.map((w) =>
            w.id === created.id
              ? w
              : w.formId === created.formId
                ? { ...w, formId: null }
                : w,
          );
        }
        return enforceFormWorkflowOneToOne({ ...d, workflows, forms });
      });
      return created;
    },
    updateWorkflow: (id, patch) =>
      update((d) => {
        const prev = d.workflows.find((w) => w.id === id);
        const nextFormId =
          patch.formId !== undefined ? patch.formId : prev?.formId ?? null;
        let workflows = d.workflows.map((w) =>
          w.id === id
            ? { ...w, ...patch, formId: nextFormId, updatedAt: new Date().toISOString() }
            : w,
        );
        let forms = d.forms;
        if (patch.formId !== undefined) {
          forms = d.forms.map((f) => {
            if (f.id === nextFormId) return { ...f, workflowId: id };
            if (f.workflowId === id && f.id !== nextFormId) {
              return { ...f, workflowId: null };
            }
            return f;
          });
          // Previous workflow that owned this form (if any) becomes free
          if (nextFormId) {
            workflows = workflows.map((w) =>
              w.id !== id && w.formId === nextFormId
                ? { ...w, formId: null }
                : w,
            );
          }
        }
        return enforceFormWorkflowOneToOne({ ...d, workflows, forms });
      }),
    deleteWorkflow: (id) =>
      update((d) => {
        const linkedForm = d.forms.find((f) => f.workflowId === id);
        let forms = d.forms.map((f) =>
          f.workflowId === id ? { ...f, workflowId: null } : f,
        );
        let workflows = d.workflows.filter((w) => w.id !== id);
        // Re-pair any form left without a workflow
        if (linkedForm) {
          const draft = createDedicatedWorkflowDraft(linkedForm.name);
          const replacement: Workflow = {
            ...draft,
            id: createId('workflow'),
            formId: linkedForm.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          workflows = [...workflows, replacement];
          forms = forms.map((f) =>
            f.id === linkedForm.id
              ? { ...f, workflowId: replacement.id }
              : f,
          );
        }
        return enforceFormWorkflowOneToOne({
          ...d,
          workflows,
          forms,
          delegations: d.delegations
            .map((del) =>
              del.scope === 'workflows'
                ? {
                    ...del,
                    workflowIds: del.workflowIds.filter((wid) => wid !== id),
                  }
                : del,
            )
            .filter(
              (del) => del.scope === 'all' || del.workflowIds.length > 0,
            ),
        });
      }),

    addForm: (form) => {
      const ts = new Date().toISOString();
      const formId = createId('form');
      const requestedWorkflowId = form.workflowId;
      const shared =
        Boolean(requestedWorkflowId) &&
        data.forms.some((f) => f.workflowId === requestedWorkflowId);

      let createdWorkflow: Workflow | null = null;
      let workflowId = requestedWorkflowId;
      if (!workflowId || shared) {
        const draft = createDedicatedWorkflowDraft(form.name || 'New Form');
        createdWorkflow = {
          ...draft,
          id: createId('workflow'),
          formId,
          createdAt: ts,
          updatedAt: ts,
        };
        workflowId = createdWorkflow.id;
      }

      const created: FormDefinition = {
        ...form,
        id: formId,
        workflowId,
        visibility: form.visibility ?? 'project',
        createdAt: ts,
        updatedAt: ts,
      };

      update((d) => {
        let workflows = createdWorkflow
          ? [...d.workflows, createdWorkflow]
          : d.workflows.map((w) =>
              w.id === workflowId
                ? { ...w, formId }
                : w.formId === formId
                  ? { ...w, formId: null }
                  : w,
            );

        if (!createdWorkflow && workflowId) {
          workflows = d.workflows.map((w) =>
            w.id === workflowId
              ? { ...w, formId }
              : w.formId === formId
                ? { ...w, formId: null }
                : w,
          );
        }

        return enforceFormWorkflowOneToOne({
          ...d,
          forms: [...d.forms, created],
          workflows,
        });
      });

      return created;
    },
    updateForm: (id, patch) =>
      update((d) => {
        const prev = d.forms.find((f) => f.id === id);
        let nextWorkflowId =
          patch.workflowId !== undefined
            ? patch.workflowId
            : prev?.workflowId ?? null;

        // Reject attaching to a workflow already owned by another form —
        // create a dedicated replacement instead of sharing
        if (
          nextWorkflowId &&
          d.forms.some(
            (f) => f.id !== id && f.workflowId === nextWorkflowId,
          )
        ) {
          nextWorkflowId = null;
        }

        let workflows = d.workflows;
        if (!nextWorkflowId) {
          const draft = createDedicatedWorkflowDraft(
            patch.name ?? prev?.name ?? 'Form',
          );
          const created: Workflow = {
            ...draft,
            id: createId('workflow'),
            formId: id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          workflows = [...workflows, created];
          nextWorkflowId = created.id;
        }

        const forms = d.forms.map((f) => {
          if (f.id === id) {
            return {
              ...f,
              ...patch,
              workflowId: nextWorkflowId,
              updatedAt: new Date().toISOString(),
            };
          }
          // Clear any other form that somehow pointed at this workflow
          if (f.workflowId === nextWorkflowId) {
            return { ...f, workflowId: null };
          }
          return f;
        });

        workflows = workflows.map((w) => {
          if (w.id === nextWorkflowId) return { ...w, formId: id };
          if (w.formId === id && w.id !== nextWorkflowId) {
            return { ...w, formId: null };
          }
          return w;
        });

        return enforceFormWorkflowOneToOne({ ...d, forms, workflows });
      }),
    deleteForm: (id) =>
      update((d) => {
        const form = d.forms.find((f) => f.id === id);
        const pairedWorkflowId = form?.workflowId;
        return enforceFormWorkflowOneToOne({
          ...d,
          forms: d.forms.filter((f) => f.id !== id),
          // Cascade-delete the dedicated workflow when exclusive
          workflows: d.workflows.filter((w) => {
            if (w.formId === id) return false;
            if (pairedWorkflowId && w.id === pairedWorkflowId) return false;
            return true;
          }),
          submissions: d.submissions.filter((s) => s.formId !== id),
          roles: d.roles.map((r) => ({
            ...r,
            formIds: r.formIds.filter((fid) => fid !== id),
          })),
          delegations: pairedWorkflowId
            ? d.delegations
                .map((del) =>
                  del.scope === 'workflows'
                    ? {
                        ...del,
                        workflowIds: del.workflowIds.filter(
                          (wid) => wid !== pairedWorkflowId,
                        ),
                      }
                    : del,
                )
                .filter(
                  (del) =>
                    del.scope === 'all' || del.workflowIds.length > 0,
                )
            : d.delegations,
        });
      }),

    addSubmission: (sub) =>
      update((d) => ({ ...d, submissions: [...d.submissions, sub] })),
    updateSubmission: (id, patch) =>
      update((d) => ({
        ...d,
        submissions: d.submissions.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      })),
    deleteSubmission: (id) =>
      update((d) => ({
        ...d,
        submissions: d.submissions.filter((s) => s.id !== id),
        notifications: (d.notifications ?? []).filter(
          (n) => n.submissionId !== id,
        ),
      })),

    addNotifications: (items) => {
      if (!items.length) return;
      update((d) => ({
        ...d,
        notifications: [...(d.notifications ?? []), ...items],
      }));
    },
    markNotificationRead: (id, userId) =>
      update((d) => ({
        ...d,
        notifications: (d.notifications ?? []).map((n) => {
          if (n.id !== id) return n;
          const readBy = new Set(n.readByUserIds ?? []);
          readBy.add(userId);
          return { ...n, readByUserIds: [...readBy] };
        }),
      })),

    addDelegation: (delegation) => {
      const actor = data.users.find((u) => u.id === data.currentUserId);
      const actorIsAdmin = Boolean(actor?.roleIds.includes('role-admin'));
      const fromUserId =
        actor && !actorIsAdmin ? actor.id : delegation.fromUserId;
      const created: ApprovalDelegation = {
        ...delegation,
        fromUserId,
        id: createId('deleg'),
        createdAt: new Date().toISOString(),
      };
      update((d) => ({
        ...d,
        delegations: [...(d.delegations ?? []), created],
      }));
      return created;
    },
    addDelegations: (items) => {
      const actor = data.users.find((u) => u.id === data.currentUserId);
      const actorIsAdmin = Boolean(actor?.roleIds.includes('role-admin'));
      const created = items.map((item) => ({
        ...item,
        fromUserId:
          actor && !actorIsAdmin ? actor.id : item.fromUserId,
        id: createId('deleg'),
        createdAt: new Date().toISOString(),
      }));
      update((d) => ({
        ...d,
        delegations: [...(d.delegations ?? []), ...created],
      }));
      return created;
    },
    updateDelegation: (id, patch) =>
      update((d) => {
        const actor = d.users.find((u) => u.id === d.currentUserId);
        const actorIsAdmin = Boolean(actor?.roleIds.includes('role-admin'));
        const existing = d.delegations.find((del) => del.id === id);
        if (!existing) return d;
        if (actor && !actorIsAdmin && existing.fromUserId !== actor.id) {
          return d;
        }
        const nextPatch = { ...patch };
        if (actor && !actorIsAdmin) {
          nextPatch.fromUserId = actor.id;
        }
        return {
          ...d,
          delegations: d.delegations.map((del) =>
            del.id === id ? { ...del, ...nextPatch } : del,
          ),
        };
      }),
    deleteDelegation: (id) =>
      update((d) => {
        const actor = d.users.find((u) => u.id === d.currentUserId);
        const actorIsAdmin = Boolean(actor?.roleIds.includes('role-admin'));
        const existing = d.delegations.find((del) => del.id === id);
        if (
          actor &&
          !actorIsAdmin &&
          existing &&
          existing.fromUserId !== actor.id
        ) {
          return d;
        }
        return {
          ...d,
          delegations: d.delegations.filter((del) => del.id !== id),
        };
      }),

    seedSampleData: (options) => update((d) => mergeSampleData(d, options)),
    resetEverything: () => {
      const fresh = resetAllData();
      setData(fresh);
    },
    resetFormData: (formId) => update((d) => resetByForm(d, formId)),

    getUserById: (id) => data.users.find((u) => u.id === id),
    getRoleById: (id) => data.roles.find((r) => r.id === id),
    getWorkflowById: (id) => data.workflows.find((w) => w.id === id),
    getFormById: (id) => data.forms.find((f) => f.id === id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
