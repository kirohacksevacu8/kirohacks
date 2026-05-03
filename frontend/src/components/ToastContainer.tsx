import { useToastStore } from "../stores/toastStore";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="toast-stack" aria-live="polite" aria-label="System notifications">
      {toasts.map((toast) => (
        <article className={`toast toast--${toast.tone}`} key={toast.id}>
          <div>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button
            className="icon-button icon-button--small"
            type="button"
            aria-label={`Dismiss ${toast.title}`}
            onClick={() => dismiss(toast.id)}
          >
            ✕
          </button>
        </article>
      ))}
    </div>
  );
}
