/**
 * MetricCard — reusable metric display component
 */

import { cn } from '@/lib/cn';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  delta?: number; // positive = improvement
  size?: 'sm' | 'md' | 'lg';
}

export function MetricCard({ label, value, unit, color, delta, size = 'md' }: MetricCardProps) {
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={cn('font-mono font-bold', size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg', color ?? 'text-gray-100')}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className={cn('text-xs mt-1', delta >= 0 ? 'text-accent-success' : 'text-accent-error')}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
