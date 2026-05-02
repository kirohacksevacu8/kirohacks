import { cn } from '@/lib/cn';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  delta?: string;
  large?: boolean;
}

export function MetricCard({ label, value, unit, color = 'text-gray-100', delta, large }: MetricCardProps): React.JSX.Element {
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn('font-bold font-mono mt-1', color, large ? 'text-4xl' : 'text-2xl')}>
        {value}
      </p>
      {unit && <p className="text-sm text-gray-500 mt-0.5">{unit}</p>}
      {delta && (
        <p className="text-xs text-accent-success mt-2 flex items-center gap-1">
          <span>▲</span> {delta}
        </p>
      )}
    </div>
  );
}
