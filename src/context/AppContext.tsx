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
  IntegrationSettings,
  NotificationTemplate,
  RegisterColumnConfig,
  Role,
  User,
  Workflow,
} from '../types';
import { createId, createDedicatedWorkflowDraft, createDefaultIntegrations } from '../data/defaults';
import { enforceFormWorkflowOneToOne } from '../data/formWorkflowLink';
import { loadData, saveData } from '../data/storage';
import {
  applyDelegationHandoffs,
  notificationsForEndedDelegation,
} from '../utils/delegationHandoff';
import {
  mergeSampleData,
  resetAllData,
  resetByForm,
  type SampleSeedOptions,
  type SampleSeedStats,
} from '../data/sampleData';
import {
  buildFormPackageCopy,
  buildNotificationTemplateCopy,
  buildWorkflowCopy,
} from '../utils/duplicateCatalog';

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
  /** Clone graph as an unassigned workflow (does not steal the source form). */
  duplicateWorkflow: (id: string) => Workflow | null;
  // Forms
  addForm: (
    form: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ) => FormDefinition;
  updateForm: (id: string, patch: Partial<FormDefinition>) => void;
  deleteForm: (id: string) => void;
  /** Deep-copy form + dedicated workflow + that form's notification templates. */
  duplicateForm: (id: string) => FormDefinition | null;
  // Submissions
  addSubmission: (sub: FormSubmission) => void;
  updateSubmission: (id: string, patch: Partial<FormSubmission>) => void;
  deleteSubmission: (id: string) => void;
  // Notifications
  addNotifications: (items: AppNotification[]) => void;
  markNotificationRead: (id: string, userId: string) => void;
  // Notification templates (admin)
  addNotificationTemplate: (
    tpl: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ) => NotificationTemplate;
  updateNotificationTemplate: (
    id: string,
    patch: Partial<NotificationTemplate>,
  ) => void;
  deleteNotificationTemplate: (id: string) => void;
  /** Clone a template onto the same form. */
  duplicateNotificationTemplate: (id: string) => NotificationTemplate | null;
  getNotificationTemplateById: (id: string) => NotificationTemplate | undefined;
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
  seedSampleData: (options?: SampleSeedOptions) => SampleSeedStats;
  resetEverything: () => void;
  resetFormData: (formId: string) => void;
  // Register column layouts (per user + form)
  setFormRegisterView: (
    formId: string,
    columns: RegisterColumnConfig[],
  ) => void;
  // Production integrations (Azure AD, Azure SQL, email)
  updateIntegrations: (patch: Partial<IntegrationSettings>) => void;
  getUserById: (id: string) => User | undefined;
  getRoleById: (id: string) => Role | undefined;
  getWorkflowById: (id: string) => Workflow | undefined;
  getFormById: (id: string) => FormDefinition | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    applyDelegationHandoffs(loadData()),
  );

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Re-check expired / activating delegations when the calendar day may have changed
  useEffect(() => {
    const tick = () => {
      setData((prev) => applyDelegationHandoffs(prev));
    };
    const id = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, []);

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

    duplicateWorkflow: (id) => {
      let created: Workflow | null = null;
      setData((prev) => {
        const source = prev.workflows.find((w) => w.id === id);
        if (!source) return prev;
        created = buildWorkflowCopy(source);
        return enforceFormWorkflowOneToOne({
          ...prev,
          workflows: [...prev.workflows, created],
        });
      });
      return created;
    },

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
          notifications: (d.notifications ?? []).filter((n) => n.formId !== id),
          notificationTemplates: (d.notificationTemplates ?? []).filter(
            (t) => t.formId !== id,
          ),
          formRegisterViews: (d.formRegisterViews ?? []).filter(
            (v) => v.formId !== id,
          ),
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

    duplicateForm: (id) => {
      let created: FormDefinition | null = null;
      setData((prev) => {
        const pkg = buildFormPackageCopy(prev, id);
        if (!pkg) return prev;
        created = pkg.form;
        return enforceFormWorkflowOneToOne({
          ...prev,
          forms: [...prev.forms, pkg.form],
          workflows: [...prev.workflows, pkg.workflow],
          notificationTemplates: [
            ...(prev.notificationTemplates ?? []),
            ...pkg.templates,
          ],
        });
      });
      return created;
    },

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

    addNotificationTemplate: (tpl) => {
      const ts = new Date().toISOString();
      const created: NotificationTemplate = {
        ...tpl,
        id: createId('notif-tpl'),
        createdAt: ts,
        updatedAt: ts,
      };
      update((d) => ({
        ...d,
        notificationTemplates: [...(d.notificationTemplates ?? []), created],
      }));
      return created;
    },
    updateNotificationTemplate: (id, patch) =>
      update((d) => {
        const existing = (d.notificationTemplates ?? []).find((t) => t.id === id);
        if (!existing) return d;
        const nextFormId = patch.formId ?? existing.formId;
        const formChanged = nextFormId !== existing.formId;
        return {
          ...d,
          notificationTemplates: (d.notificationTemplates ?? []).map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  id: t.id,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
          workflows: formChanged
            ? d.workflows.map((w) => ({
                ...w,
                nodes: w.nodes.map((n) =>
                  n.type === 'notification' &&
                  n.data.notificationTemplateId === id &&
                  w.formId !== nextFormId
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          notificationTemplateId: undefined,
                        },
                      }
                    : n,
                ),
              }))
            : d.workflows,
        };
      }),
    deleteNotificationTemplate: (id) =>
      update((d) => ({
        ...d,
        notificationTemplates: (d.notificationTemplates ?? []).filter(
          (t) => t.id !== id,
        ),
        // Clear references from workflow notify nodes
        workflows: d.workflows.map((w) => ({
          ...w,
          nodes: w.nodes.map((n) =>
            n.type === 'notification' &&
            n.data.notificationTemplateId === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    notificationTemplateId: undefined,
                  },
                }
              : n,
          ),
        })),
      })),

    duplicateNotificationTemplate: (id) => {
      let created: NotificationTemplate | null = null;
      setData((prev) => {
        const source = (prev.notificationTemplates ?? []).find((t) => t.id === id);
        if (!source) return prev;
        created = buildNotificationTemplateCopy(source);
        return {
          ...prev,
          notificationTemplates: [
            ...(prev.notificationTemplates ?? []),
            created,
          ],
        };
      });
      return created;
    },

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
        startHandoffNotifiedAt: null,
        endHandoffNotifiedAt: null,
      };
      update((d) =>
        applyDelegationHandoffs({
          ...d,
          delegations: [...(d.delegations ?? []), created],
        }),
      );
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
        startHandoffNotifiedAt: null,
        endHandoffNotifiedAt: null,
      }));
      update((d) =>
        applyDelegationHandoffs({
          ...d,
          delegations: [...(d.delegations ?? []), ...created],
        }),
      );
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
        return applyDelegationHandoffs({
          ...d,
          delegations: d.delegations.map((del) =>
            del.id === id ? { ...del, ...nextPatch } : del,
          ),
        });
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
        if (!existing) return d;
        const triggeredBy =
          actor ??
          d.users.find((u) => u.roleIds.includes('role-admin')) ??
          d.users[0];
        const endNotes = triggeredBy
          ? notificationsForEndedDelegation(existing, d, triggeredBy)
          : [];
        return {
          ...d,
          delegations: d.delegations.filter((del) => del.id !== id),
          notifications: [...(d.notifications ?? []), ...endNotes],
        };
      }),

    seedSampleData: (options) => {
      let stats: SampleSeedStats = {
        submissionsAdded: 0,
        notificationsAdded: 0,
        submissionsCleared: 0,
        notificationsCleared: 0,
        usersAdded: 0,
        usersCleared: 0,
        mode: options?.mode === 'append' ? 'append' : 'replace',
        userMode: options?.userMode === 'append' ? 'append' : 'replace',
      };
      // Compute against latest state synchronously so returned stats match
      // what was written (and so a failed generate cannot wipe data).
      setData((prev) => {
        const result = mergeSampleData(prev, options);
        stats = result.stats;
        return result.data;
      });
      return stats;
    },
    resetEverything: () => {
      // Preserve production integration settings across demo data resets
      setData((prev) => ({
        ...resetAllData(),
        integrations: prev.integrations ?? createDefaultIntegrations(),
      }));
    },
    resetFormData: (formId) => update((d) => resetByForm(d, formId)),

    setFormRegisterView: (formId, columns) =>
      update((d) => {
        const userId = d.currentUserId;
        if (!userId) return d;
        const views = [...(d.formRegisterViews ?? [])];
        const idx = views.findIndex(
          (v) => v.formId === formId && v.userId === userId,
        );
        const next = { formId, userId, columns };
        if (idx >= 0) views[idx] = next;
        else views.push(next);
        return { ...d, formRegisterViews: views };
      }),

    updateIntegrations: (patch) =>
      update((d) => {
        const current = d.integrations ?? createDefaultIntegrations();
        return {
          ...d,
          integrations: {
            ...current,
            ...patch,
            azureAd: patch.azureAd
              ? { ...current.azureAd, ...patch.azureAd }
              : current.azureAd,
            azureSql: patch.azureSql
              ? { ...current.azureSql, ...patch.azureSql }
              : current.azureSql,
            email: patch.email
              ? { ...current.email, ...patch.email }
              : current.email,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

    getUserById: (id) => data.users.find((u) => u.id === id),
    getRoleById: (id) => data.roles.find((r) => r.id === id),
    getWorkflowById: (id) => data.workflows.find((w) => w.id === id),
    getFormById: (id) => data.forms.find((f) => f.id === id),
    getNotificationTemplateById: (id) =>
      (data.notificationTemplates ?? []).find((t) => t.id === id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
