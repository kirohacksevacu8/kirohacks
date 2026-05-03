/**
 * useKeyboardShortcuts Hook
 *
 * Handles keyboard shortcuts for the application.
 * Supports: Escape, Space (animation), Arrow keys (timeline).
 */

import { useEffect, useCallback } from 'react';

export interface UseKeyboardShortcutsOptions {
  onEscape?: () => void;
  onSpace?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onEscape,
  onSpace,
  onArrowLeft,
  onArrowRight,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (event.key === ' ' && onSpace) {
        event.preventDefault();
        onSpace();
        return;
      }

      if (event.key === 'ArrowLeft') {
        onArrowLeft?.();
        return;
      }

      if (event.key === 'ArrowRight') {
        onArrowRight?.();
        return;
      }
    },
    [enabled, onEscape, onSpace, onArrowLeft, onArrowRight]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [enabled, handleKeyDown]);
}
