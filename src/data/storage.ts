import type { AppData, Role } from '../types';
import { createInitialData } from './defaults';

const STORAGE_KEY = 'jansen-workflows-data';

function normalizeRole(role: Role): Role {
  return {
    ...role,
    adGroupNames: Array.isArray(role.adGroupNames) ? role.adGroupNames : [],
  };
}

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    roles: data.roles.map(normalizeRole),
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialData();
      saveData(initial);
      return initial;
    }
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    const initial = createInitialData();
    saveData(initial);
    return initial;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
