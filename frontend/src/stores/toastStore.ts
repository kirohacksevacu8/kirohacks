import { create } from "zustand";

export type ToastTone = "success" | "warning" | "critical" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
