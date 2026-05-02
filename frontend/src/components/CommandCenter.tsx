import { useState, useCallback } from 'react';

import { cn } from '@/lib/cn';
import { HeaderBar } from '@/components/HeaderBar';
import { ControlPanel } from '@/features/controls/ControlPanel';
import { MapView } from '@/features/map/MapView';
import { ResultsPanel } from '@/features/results/ResultsPanel';

// ---------------------------------------------------------------------------
// Chevron icons for mobile toggle buttons
// ---------------------------------------------------------------------------

function ChevronRight({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('w-5 h-5', className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('w-5 h-5', className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CommandCenter
// ---------------------------------------------------------------------------

export function CommandCenter(): React.JSX.Element {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const closeControls = useCallback(() => setControlsOpen(false), []);
  const closeResults = useCallback(() => setResultsOpen(false), []);

  const toggleControls = useCallback(
    () => setControlsOpen((prev) => !prev),
    [],
  );
  const toggleResults = useCallback(
    () => setResultsOpen((prev) => !prev),
    [],
  );

  // Close all drawers when backdrop is clicked
  const closeAll = useCallback(() => {
    setControlsOpen(false);
    setResultsOpen(false);
  }, []);

  const isAnyDrawerOpen = controlsOpen || resultsOpen;

  return (
    <div className="h-screen flex flex-col bg-surface-base">
      <HeaderBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ---- Desktop Control Panel ---- */}
        <aside className="w-80 shrink-0 bg-surface-raised border-r border-surface-border overflow-y-auto p-4 space-y-4 hidden lg:flex lg:flex-col">
          <ControlPanel />
        </aside>

        {/* ---- Mobile Control Panel Drawer ---- */}
        <div
          className={cn(
            'lg:hidden fixed inset-y-0 left-0 z-20 w-80 bg-surface-raised border-r border-surface-border overflow-y-auto p-4 space-y-4',
            'transform transition-transform duration-300',
            controlsOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Controls
            </h2>
            <button
              onClick={closeControls}
              className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors duration-150"
              aria-label="Close controls panel"
            >
              <ChevronLeft />
            </button>
          </div>
          <ControlPanel />
        </div>

        {/* ---- Map View ---- */}
        <div className="flex-1 relative bg-surface-base">
          <MapView />

          {/* Mobile toggle: open controls (left edge) */}
          <button
            onClick={toggleControls}
            className={cn(
              'lg:hidden absolute top-1/2 left-0 z-10 -translate-y-1/2',
              'bg-surface-raised/90 backdrop-blur-sm border border-surface-border',
              'rounded-r-md p-1.5 text-gray-400 hover:text-gray-200',
              'hover:bg-surface-hover transition-colors duration-150',
            )}
            aria-label="Toggle controls panel"
          >
            <ChevronRight />
          </button>

          {/* Mobile toggle: open results (right edge) */}
          <button
            onClick={toggleResults}
            className={cn(
              'lg:hidden absolute top-1/2 right-0 z-10 -translate-y-1/2',
              'bg-surface-raised/90 backdrop-blur-sm border border-surface-border',
              'rounded-l-md p-1.5 text-gray-400 hover:text-gray-200',
              'hover:bg-surface-hover transition-colors duration-150',
            )}
            aria-label="Toggle results panel"
          >
            <ChevronLeft />
          </button>
        </div>

        {/* ---- Desktop Results Panel ---- */}
        <aside className="w-96 shrink-0 bg-surface-raised border-l border-surface-border overflow-y-auto p-4 space-y-4 hidden lg:flex lg:flex-col">
          <ResultsPanel />
        </aside>

        {/* ---- Mobile Results Panel Drawer ---- */}
        <div
          className={cn(
            'lg:hidden fixed inset-y-0 right-0 z-20 w-96 max-w-[85vw] bg-surface-raised border-l border-surface-border overflow-y-auto p-4 space-y-4',
            'transform transition-transform duration-300',
            resultsOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Results
            </h2>
            <button
              onClick={closeResults}
              className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors duration-150"
              aria-label="Close results panel"
            >
              <ChevronRight />
            </button>
          </div>
          <ResultsPanel />
        </div>

        {/* ---- Backdrop overlay for mobile drawers ---- */}
        {isAnyDrawerOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-10"
            onClick={closeAll}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
