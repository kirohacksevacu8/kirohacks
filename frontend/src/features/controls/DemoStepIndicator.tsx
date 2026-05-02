/**
 * DemoStepIndicator — shows progress through the 5-step demo flow
 */

import { cn } from '@/lib/cn';

const STEPS = [
  'Set Ignition',
  'Configure Wind',
  'Run Simulation',
  'Explore Results',
  'Compare',
];

export function DemoStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <div className="w-4 h-px bg-surface-border" />}
            <div className={cn('flex items-center gap-1.5 text-xs', isActive ? 'text-accent-primary font-semibold' : isDone ? 'text-accent-success' : 'text-gray-600')}>
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono border', isActive ? 'border-accent-primary bg-accent-primary/20' : isDone ? 'border-accent-success bg-accent-success/20' : 'border-gray-600')}>
                {isDone ? '✓' : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
