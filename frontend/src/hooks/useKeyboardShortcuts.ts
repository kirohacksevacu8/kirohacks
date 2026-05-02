import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseKeyboardShortcutsOptions {
  /** Toggle demo mode (Ctrl+D). */
  onToggleDemoMode: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Registers global keyboard shortcuts.
 *
 * Currently supported:
 * - **Ctrl+D** — toggle demo mode
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions,
): void {
  const { onToggleDemoMode } = options;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Ctrl+D (or Cmd+D on macOS) — toggle demo mode
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        onToggleDemoMode();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleDemoMode]);
}
