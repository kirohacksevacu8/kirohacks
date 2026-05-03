/**
 * RegionSelector Component
 *
 * Fetches available regions from GET /api/regions and renders a dropdown.
 * Shows an alert banner when the typed/selected region is not in the supported list.
 */

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { getApi } from '@/services/api';
import { useSimulation } from '@/hooks/useSimulation';

export function RegionSelector(): React.ReactElement {
  const { state, setRegion } = useSimulation();
  const [regions, setRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const api = await getApi();
        const data = await api.getRegions();
        if (mounted) setRegions(data);
      } catch {
        if (mounted) setFetchError('Failed to load regions');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRegion(e.target.value || null);
    },
    [setRegion]
  );

  const selectedRegion = state.selectedRegion;
  const isUnsupported =
    !isLoading &&
    selectedRegion !== null &&
    regions.length > 0 &&
    !regions.includes(selectedRegion);

  // Format slug for display: "paradise-ca" → "Paradise, CA"
  function formatSlug(slug: string): string {
    return slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
        Region
      </h3>

      {fetchError ? (
        <div
          className="bg-surface-overlay border border-accent-error/30 rounded-lg p-3 text-sm text-accent-error"
          role="alert"
        >
          {fetchError}
        </div>
      ) : (
        <select
          value={selectedRegion ?? ''}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Select region"
          className={cn(
            'w-full bg-surface-base border border-surface-border rounded-md',
            'px-3 py-2 text-sm text-gray-200',
            'focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150'
          )}
        >
          <option value="">
            {isLoading ? 'Loading regions…' : '— Select a region —'}
          </option>
          {regions.map((slug) => (
            <option key={slug} value={slug}>
              {formatSlug(slug)}
            </option>
          ))}
        </select>
      )}

      {/* Unsupported region alert */}
      {isUnsupported && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-2 rounded-lg p-3',
            'bg-accent-warning/10 border border-accent-warning/40',
            'text-xs text-accent-warning'
          )}
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <span>
            Region <strong>"{selectedRegion}"</strong> is not supported. Please
            select one of the available regions above.
          </span>
        </div>
      )}
    </section>
  );
}
