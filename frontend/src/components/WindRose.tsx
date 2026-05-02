import { useSimulation } from '@/hooks/useSimulation';

/**
 * Compact wind direction indicator — placeholder.
 * Full implementation in Task 10.
 */
export function WindRose(): React.JSX.Element {
  const { windParams } = useSimulation();

  return (
    <div
      className="w-10 h-10 relative flex items-center justify-center"
      title={`Wind ${windParams.wind_speed} mph @ ${windParams.wind_direction}°`}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full text-gray-500"
        aria-label={`Wind direction ${windParams.wind_direction} degrees`}
      >
        <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <polygon
          points="20,4 24,20 20,16 16,20"
          fill="currentColor"
          style={{ transform: `rotate(${windParams.wind_direction}deg)`, transformOrigin: '20px 20px' }}
        />
      </svg>
    </div>
  );
}
