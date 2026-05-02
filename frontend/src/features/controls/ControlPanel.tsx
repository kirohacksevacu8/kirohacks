import { useCallback, useState } from 'react';

import { IgnitionSection } from '@/features/controls/IgnitionSection';
import { WindSection } from '@/features/controls/WindSection';
import { ScenarioSelector } from '@/features/controls/ScenarioSelector';
import { MonteCarloSlider } from '@/features/controls/MonteCarloSlider';
import { RunButton } from '@/features/controls/RunButton';

// ---------------------------------------------------------------------------
// Simple toast state for the control panel
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'warning' | 'error';
}

let toastId = 0;

/**
 * Control panel — composes all parameter sections and the run button.
 * Manages a lightweight inline toast for wind fetch / validation feedback.
 */
export function ControlPanel(): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: 'success' | 'warning' | 'error') => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, variant }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  const variantStyles: Record<string, string> = {
    success:
      'bg-accent-success/10 border border-accent-success/30 text-accent-success',
    warning:
      'bg-accent-warning/10 border border-accent-warning/30 text-accent-warning',
    error:
      'bg-accent-error/10 border border-accent-error/30 text-accent-error',
  };

  return (
    <div className="space-y-5">
      {/* Inline toasts */}
      {toasts.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-3 py-2 rounded-lg text-xs animate-fade-in ${variantStyles[t.variant]}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      <IgnitionSection />

      <div className="border-t border-surface-border" />

      <WindSection onToast={showToast} />

      <div className="border-t border-surface-border" />

      <ScenarioSelector />

      <div className="border-t border-surface-border" />

      <MonteCarloSlider />

      <div className="border-t border-surface-border" />

      <RunButton onValidationError={(msg) => showToast(msg, 'error')} />
    </div>
  );
}
