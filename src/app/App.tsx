import { hasWebMCP } from "../webmcp/modelContext";
import { useWorkspaceStore } from "../state/workspaceStore";
import "../styles/app.css";

export function App() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Human-agent reasoning workspace</p>
          <h1>GROUNDLINE</h1>
          <p className="tagline">See what your conclusions stand on.</p>
        </div>

        <div className="status-block" aria-label="Scaffold status">
          <span>SCHEMA 1.1.0</span>
          <span>{hasWebMCP() ? "WEBMCP DETECTED" : "WEBMCP NOT DETECTED"}</span>
        </div>
      </header>

      <section className="ground-section" aria-labelledby="workspace-title">
        <div className="surface-line" />
        <p className="section-label">INTEGRATION 001 · SEEDED CONTRACT FIXTURE</p>
        <h2 id="workspace-title">{workspace.title}</h2>
        <p className="question">
          {workspace.items.find((item) => item.id === workspace.question_id)?.text}
        </p>

        <div className="strata" aria-hidden="true">
          <div className="stratum stratum-claim">CLAIMS</div>
          <div className="stratum stratum-evidence">EVIDENCE</div>
          <div className="stratum stratum-assumption">ASSUMPTIONS</div>
          <div className="stratum stratum-source">SOURCES</div>
          <div className="fault-line" />
        </div>

        <div className="scaffold-note">
          <div>
            <p className="eyebrow">Current milestone</p>
            <h3>Repository scaffold ready</h3>
            <p>
              Domain triage and WebMCP tools are intentionally still pending.
              Their behavior is already frozen by the acceptance contracts.
            </p>
          </div>
          <button type="button" onClick={resetDemo}>
            Reset demo fixture
          </button>
        </div>
      </section>
    </main>
  );
}
