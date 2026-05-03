import { useEffect } from "react";
import { useSimulationStore } from "../../stores/simulationStore";

export function AnimationTimeline() {
  const result = useSimulationStore((s) => s.result);
  const maxTimesteps = useSimulationStore((s) => s.maxTimesteps);
  const animation = useSimulationStore((s) => s.animation);
  const setAnimation = useSimulationStore((s) => s.setAnimation);

  const maxTimestep = result?.max_timesteps ?? maxTimesteps;
  const cutoffMarkers = result?.zone_results ?? [];

  useEffect(() => {
    if (!animation.playing) return undefined;

    const intervalId = window.setInterval(() => {
      setAnimation({
        timestep:
          animation.timestep >= maxTimestep
            ? 0
            : Math.min(maxTimestep, animation.timestep + animation.speed),
      });
    }, 1000 / 15);

    return () => window.clearInterval(intervalId);
  }, [animation.playing, animation.speed, animation.timestep, maxTimestep, setAnimation]);

  return (
    <div className="timeline" aria-label="Fire spread animation timeline">
      <div className="timeline__controls">
        <button
          className="icon-button"
          type="button"
          aria-label={animation.playing ? "Pause animation" : "Play animation"}
          onClick={() => setAnimation({ playing: !animation.playing })}
        >
          {animation.playing ? "⏸" : "▶"}
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Step backward"
          onClick={() => setAnimation({ timestep: Math.max(0, animation.timestep - 1) })}
        >
          ◀
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Step forward"
          onClick={() => setAnimation({ timestep: Math.min(maxTimestep, animation.timestep + 1) })}
        >
          ▶
        </button>
        <select
          aria-label="Playback speed"
          value={animation.speed}
          onChange={(event) => setAnimation({ speed: Number(event.target.value) })}
        >
          {[0.5, 1, 2, 4].map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
        {cutoffMarkers.length > 0 ? (
          <span className="timeline__hint">● = zone cutoff</span>
        ) : null}
      </div>
      <div className="timeline__range">
        <input
          aria-label="Current fire timestep"
          max={maxTimestep}
          min={0}
          step={1}
          type="range"
          value={animation.timestep}
          onChange={(event) => setAnimation({ timestep: Number(event.target.value) })}
        />
        {cutoffMarkers.map((zone) =>
          zone.cutoff_time ? (
            <span
              className="timeline__marker"
              key={zone.zone_id}
              style={{ left: `${(zone.cutoff_time / maxTimestep) * 100}%` }}
              title={`${zone.zone_id} cutoff at ${zone.cutoff_time} min`}
            />
          ) : null,
        )}
      </div>
      <strong className="timeline__time">t = {Math.round(animation.timestep)} min</strong>
    </div>
  );
}
