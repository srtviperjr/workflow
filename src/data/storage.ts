import type { AppData } from '../types';
import { createInitialData } from './defaults';

const STORAGE_KEY = 'jansen-workflows-data';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialData();
      saveData(initial);
      return initial;
    }
    return JSON.parse(raw) as AppData;
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
