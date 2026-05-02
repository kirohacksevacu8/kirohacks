/**
 * ZoneEvacuationTable — sortable table of zone results
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import type { ZoneResult } from '@/types/api';

type SortKey = 'zone_id' | 'population' | 'cutoff_time' | 'optimized_viability';
type SortDir = 'asc' | 'desc';

function urgencyColor(cutoff: number) {
  if (cutoff > 30) return 'bg-zone-safe';
  if (cutoff > 15) return 'bg-zone-warning';
  if (cutoff > 5)  return 'bg-fire-medium';
  return 'bg-zone-critical';
}

export function ZoneEvacuationTable({
  zones,
  selectedZoneId,
  onSelectZone,
}: {
  zones: ZoneResult[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('cutoff_time');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  const sorted = [...zones].sort((a, b) => {
    const av = a.properties[sortKey];
    const bv = b.properties[sortKey];
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string }[] = [
    { key: 'zone_id', label: 'Zone' },
    { key: 'population', label: 'Pop' },
    { key: 'cutoff_time', label: 'Cutoff' },
    { key: 'optimized_viability', label: 'Viability' },
  ];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Zone Details</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border">
              {cols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => handleSort(col.key)}
                  className="text-xs uppercase tracking-wider text-gray-500 pb-2 pr-3 cursor-pointer hover:text-gray-300 transition-colors select-none"
                >
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((zone) => {
              const p = zone.properties;
              const isSelected = p.zone_id === selectedZoneId;
              return (
                <tr
                  key={p.zone_id}
                  onClick={() => onSelectZone(p.zone_id)}
                  className={cn(
                    'border-b border-surface-border/50 cursor-pointer transition-colors',
                    isSelected ? 'bg-accent-primary/10' : 'hover:bg-surface-hover'
                  )}
                >
                  <td className="py-2 pr-3 font-mono text-gray-200 flex items-center gap-1.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', urgencyColor(p.cutoff_time))} />
                    {p.zone_id}
                  </td>
                  <td className="py-2 pr-3 text-gray-300">{p.population.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-gray-300">{p.cutoff_time}m</td>
                  <td className="py-2 font-mono text-route-safe">{p.optimized_viability}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
