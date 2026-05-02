import { useSimulationContext } from '@/context/SimulationContext';

export function WindRose(): React.JSX.Element {
  const { state } = useSimulationContext();
  const { wind_speed, wind_direction, wind_gust } = state.windParams;

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 relative flex items-center justify-center">
        {/* Compass circle */}
        <div className="absolute inset-0 rounded-full border border-surface-border bg-surface-overlay" />
        {/* Arrow */}
        <svg
          className="w-5 h-5 relative z-10 transition-transform duration-500"
          style={{ transform: `rotate(${wind_direction}deg)` }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M12 2L8 10H16L12 2Z" fill="#00E5FF" />
          <path d="M12 22L8 14H16L12 22Z" fill="#374151" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-mono text-gray-400">
          {wind_speed} mph · {wind_direction}°
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          Gust {wind_gust} mph
        </span>
      </div>
    </div>
  );
}
