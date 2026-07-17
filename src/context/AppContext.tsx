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
  FormDefinition,
  FormSubmission,
  Role,
  User,
  Workflow,
} from '../types';
import { createId } from '../data/defaults';
import { loadData, saveData } from '../data/storage';
import {
  mergeSampleData,
  resetAllData,
  resetByForm,
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
  // Admin tools
  seedSampleData: () => void;
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
        currentUserId:
          d.currentUserId === id
            ? (d.users.find((u) => u.id !== id)?.id ?? null)
            : d.currentUserId,
      })),

    addRole: (role) => {
      const created: Role = {
        ...role,
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
        id: createId('workflow'),
        createdAt: ts,
        updatedAt: ts,
      };
      update((d) => ({ ...d, workflows: [...d.workflows, created] }));
      return created;
    },
    updateWorkflow: (id, patch) =>
      update((d) => ({
        ...d,
        workflows: d.workflows.map((w) =>
          w.id === id
            ? { ...w, ...patch, updatedAt: new Date().toISOString() }
            : w,
        ),
      })),
    deleteWorkflow: (id) =>
      update((d) => ({
        ...d,
        workflows: d.workflows.filter((w) => w.id !== id),
        forms: d.forms.map((f) =>
          f.workflowId === id ? { ...f, workflowId: null } : f,
        ),
      })),

    addForm: (form) => {
      const ts = new Date().toISOString();
      const created: FormDefinition = {
        ...form,
        id: createId('form'),
        createdAt: ts,
        updatedAt: ts,
      };
      update((d) => ({ ...d, forms: [...d.forms, created] }));
      return created;
    },
    updateForm: (id, patch) =>
      update((d) => ({
        ...d,
        forms: d.forms.map((f) =>
          f.id === id
            ? { ...f, ...patch, updatedAt: new Date().toISOString() }
            : f,
        ),
      })),
    deleteForm: (id) =>
      update((d) => ({
        ...d,
        forms: d.forms.filter((f) => f.id !== id),
        submissions: d.submissions.filter((s) => s.formId !== id),
      })),

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
      })),

    seedSampleData: () => update((d) => mergeSampleData(d)),
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
