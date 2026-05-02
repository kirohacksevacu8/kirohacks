import { cn } from '@/lib/cn';
import { useSimulationContext } from '@/context/SimulationContext';

export function SimulationStatus(): React.JSX.Element {
  const { state } = useSimulationContext();
  const { jobStatus, progress } = state;

  const dotColor = {
    idle: 'bg-gray-500',
    submitting: 'bg-accent-primary animate-pulse',
    running: 'bg-accent-primary animate-pulse',
    complete: 'bg-accent-success',
    error: 'bg-accent-error',
  }[jobStatus];

  const label = {
    idle: 'Ready',
    submitting: 'Submitting...',
    running: progress ? `${progress.completed} / ${progress.total} runs` : 'Running...',
    complete: 'Complete',
    error: 'Error',
  }[jobStatus];

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
      <span className="text-xs font-mono text-gray-400">{label}</span>
    </div>
  );
}
