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
  const panels = useSimulationStore((s) => s.panels);
  const setPanel = useSimulationStore((s) => s.setPanel);
  const { toggleDemoMode } = useSimulation();
  const controlsLabel = panels.controls ? "Close controls panel" : "Open controls panel";
  const resultsLabel = panels.results ? "Close results panel" : "Open results panel";

  return (
    <header className="header-bar">
      <div className="brand-lockup">
        <button
          className={`icon-button header-bar__panel-toggle tooltip-button ${panels.controls ? "is-active" : ""}`}
          type="button"
          aria-label={controlsLabel}
          aria-pressed={panels.controls}
          data-tooltip={controlsLabel}
          onClick={() => setPanel("controls", !panels.controls)}
        >
          <ControlsPanelIcon />
        </button>
        <div>
          <strong className="brand-wordmark">evacu8</strong>
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
          className={`icon-button header-bar__panel-toggle tooltip-button tooltip-button--right ${panels.results ? "is-active" : ""}`}
          type="button"
          aria-label={resultsLabel}
          aria-pressed={panels.results}
          data-tooltip={resultsLabel}
          onClick={() => setPanel("results", !panels.results)}
        >
          <ResultsPanelIcon />
        </button>
      </div>
    </header>
  );
}

function ControlsPanelIcon() {
  return (
    <svg className="header-bar__panel-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h6v14H4z" />
      <path d="M14 7h6M14 12h6M14 17h6" />
    </svg>
  );
}

function ResultsPanelIcon() {
  return (
    <svg className="header-bar__panel-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M8 19v-6" />
      <path d="M13 19V9" />
      <path d="M18 19v-3" />
      <path d="M3 19h18" />
    </svg>
  );
}
