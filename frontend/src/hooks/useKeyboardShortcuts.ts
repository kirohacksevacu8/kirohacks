import { useEffect } from "react";
import { useSimulationStore } from "../stores/simulationStore";
import { useSimulation } from "./useSimulation";

export function useKeyboardShortcuts() {
  const setSelectIgnitionMode = useSimulationStore((s) => s.setSelectIgnitionMode);
  const setPanel = useSimulationStore((s) => s.setPanel);
  const setAnimation = useSimulationStore((s) => s.setAnimation);
  const animation = useSimulationStore((s) => s.animation);
  const result = useSimulationStore((s) => s.result);
  const maxTimesteps = useSimulationStore((s) => s.maxTimesteps);
  const { toggleDemoMode } = useSimulation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl+D — demo mode
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleDemoMode();
        return;
      }

      // Esc — cancel ignite mode / dismiss drawers
      if (event.key === "Escape") {
        setSelectIgnitionMode(false);
        setPanel("controls", false);
        setPanel("results", false);
        return;
      }

      // Space — play/pause animation (only when result exists)
      if (event.key === " " && result) {
        event.preventDefault();
        setAnimation({ playing: !animation.playing });
        return;
      }

      // Arrow keys — scrub timeline
      if (result) {
        const max = result.max_timesteps ?? maxTimesteps;
        if (event.key === "ArrowRight") setAnimation({ timestep: Math.min(max, animation.timestep + 1) });
        else if (event.key === "ArrowLeft") setAnimation({ timestep: Math.max(0, animation.timestep - 1) });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleDemoMode, setSelectIgnitionMode, setPanel, setAnimation, animation, result, maxTimesteps]);
}
