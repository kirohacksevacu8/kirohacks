import { useToastStore } from "../stores/toastStore";
import type { ToastTone } from "../stores/toastStore";

export function useToasts() {
  const push = useToastStore((s) => s.push);

  function pushToast(toast: { tone: ToastTone; title: string; message?: string }) {
    push(toast);
  }

  return { pushToast };
}
