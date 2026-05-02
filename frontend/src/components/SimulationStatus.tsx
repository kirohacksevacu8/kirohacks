import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';

const STATUS_CONFIG = {
  idle: {
    dotClass: 'bg-gray-500',
    label: 'Idle',
  },
  submitting: {
    dotClass: 'bg-accent-primary animate-pulse',
    label: 'Submitting…',
  },
  running: {
    dotClass: 'bg-accent-primary animate-pulse',
    label: 'Running',
  },
  complete: {
    dotClass: 'bg-accent-success',
    label: 'Complete',
  },
  error: {
    dotClass: 'bg-accent-error',
    label: 'Error',
  },
} as const;

export function SimulationStatus(): React.JSX.Element {
  const { jobStatus, progress } = useSimulation();

  const config = STATUS_CONFIG[jobStatus];

  const progressText =
    jobStatus === 'running' && progress
      ? `${progress.completed}/${progress.total}`
      : '';

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span
        className={cn('w-2 h-2 rounded-full shrink-0', config.dotClass)}
        aria-hidden="true"
      />
      <span className="text-xs font-mono text-gray-400">
        {config.label}
        {progressText ? ` ${progressText}` : ''}
      </span>
    </div>
  );
}
