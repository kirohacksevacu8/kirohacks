import { useSimulationStore } from "../stores/simulationStore";
import { useSimulation } from "../hooks/useSimulation";
import { SimulationStatus } from "./SimulationStatus";
import { WindRose } from "./WindRose";

export function HeaderBar() {
  const selectedScenarioName = useSimulationStore((s) => s.selectedScenarioName);
  const status = useSimulationStore((s) => s.status);
  const modifiedWind = useSimulationStore((s) => s.modifiedWind);
  const wind = useSimulationStore((s) => s.wind);
  const demoMode = useSimulationStore((s) => s.demoMode);
  const setPanel = useSimulationStore((s) => s.setPanel);
  const { toggleDemoMode } = useSimulation();

  return (
    <header className="header-bar">
      <div className="brand-lockup">
        <button
          className="icon-button header-bar__mobile-toggle"
          type="button"
          aria-label="Open controls"
          onClick={() => setPanel("controls", true)}
        >
          <span aria-hidden="true">M</span>
        </button>
        <div className="brand-mark" aria-hidden="true">E</div>
        <div>
          <strong className="brand-wordmark">EvacuAI</strong>
          <span className="brand-subtitle">Wildfire Evacuation Intelligence</span>
        </div>
      </div>

      <div className="header-bar__scenario">
        <span>Scenario</span>
        <strong>{selectedScenarioName}</strong>
      </div>

      <div className="header-bar__right">
        <SimulationStatus status={status} modifiedWind={modifiedWind} />
        <WindRose wind={wind} compact />
        <button
          className={`secondary-button header-bar__demo-btn ${demoMode ? "is-active" : ""}`}
          type="button"
          title="Toggle Demo Mode (Ctrl+D)"
          onClick={toggleDemoMode}
        >
          {demoMode ? "Demo ON" : "Demo"}
        </button>
        <button
          className="icon-button header-bar__mobile-toggle"
          type="button"
          aria-label="Open results"
          onClick={() => setPanel("results", true)}
        >
          <span aria-hidden="true">R</span>
        </button>
      </div>
    </header>
  );
}
