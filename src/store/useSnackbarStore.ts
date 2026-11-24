import { create } from 'zustand';

export interface Snackbar {
  id: number;
  message: string;
  tone: 'info' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarState {
  current: Snackbar | null;
  show: (s: Omit<Snackbar, 'id' | 'tone'> & { tone?: Snackbar['tone'] }) => void;
  dismiss: () => void;
}

let nextId = 1;

/** One lightweight, app-wide message with an optional action (e.g. Undo). */
export const useSnackbarStore = create<SnackbarState>((set) => ({
  current: null,
  show: (s) => set({ current: { tone: 'info', ...s, id: nextId++ } }),
  dismiss: () => set({ current: null }),
}));
