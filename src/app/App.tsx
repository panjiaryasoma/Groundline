import { ReasoningGraph } from "../components/graph";
import { InspectorPanel } from "../components/inspector";
import { RevisionPanel } from "../components/revision";
import { AuditTrail } from "../components/audit";
import { hasWebMCP } from "../webmcp/modelContext";
import {
  isSeededAnalysisFresh,
  isSeededDemoCycleComplete,
  useWorkspaceStore,
} from "../state/workspaceStore";
import "../styles/app.css";

export function App() {
  const workspace = useWorkspaceStore(
    (state) => state.workspace,
  );
  const ui = useWorkspaceStore((state) => state.ui);

  const resetDemo = useWorkspaceStore(
    (state) => state.resetDemo,
  );
  const selectItem = useWorkspaceStore(
    (state) => state.selectItem,
  );
  const runSeededAnalysis = useWorkspaceStore(
    (state) => state.runSeededAnalysis,
  );
  const focusPrimaryRisk = useWorkspaceStore(
    (state) => state.focusPrimaryRisk,
  );
  const proposeSeededRevision = useWorkspaceStore(
    (state) => state.proposeSeededRevision,
  );
  const acceptLatestRevision = useWorkspaceStore(
    (state) => state.acceptLatestRevision,
  );
  const editAndAcceptLatestRevision = useWorkspaceStore(
    (state) => state.editAndAcceptLatestRevision,
  );
  const rejectLatestRevision = useWorkspaceStore(
    (state) => state.rejectLatestRevision,
  );
  const deferLatestRevision = useWorkspaceStore(
    (state) => state.deferLatestRevision,
  );

  const acceptedConclusion =
    workspace.items.find(
      (item) =>
        item.id === workspace.accepted_conclusion_id,
    ) ?? null;

  const hasAnalysis =
    workspace.triage_records.length > 0;
  const analysisFresh = isSeededAnalysisFresh(workspace);
  const demoCycleComplete =
    isSeededDemoCycleComplete(workspace);
  const hasProposal = workspace.revisions.some(
    (revision) => revision.state === "PROPOSED",
  );

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">
            Human-agent reasoning workspace
          </p>
          <h1>GROUNDLINE</h1>
          <p className="tagline">
            See what your conclusions stand on.
          </p>
        </div>

        <div className="status-block">
          <span>SCHEMA 1.1.0</span>
          <span>
            {hasWebMCP()
              ? "WEBMCP DETECTED"
              : "WEBMCP NOT DETECTED"}
          </span>
          <span>
            {demoCycleComplete
              ? "DEMO CYCLE COMPLETE"
              : analysisFresh
                ? "ANALYSIS ACTIVE"
                : hasAnalysis
                  ? "ANALYSIS STALE"
                  : "ANALYSIS NOT RUN"}
          </span>
        </div>
      </header>

      <section className="workspace-header">
        <div>
          <p className="section-label">
            Integration 001 · seeded contract fixture
          </p>
          <h2>{workspace.title}</h2>
          <p className="question">
            {
              workspace.items.find(
                (item) =>
                  item.id === workspace.question_id,
              )?.text
            }
          </p>
        </div>

        <aside className="accepted-conclusion">
          <p className="eyebrow">
            Accepted conclusion
          </p>
          <p>
            {acceptedConclusion?.text ??
              "No accepted conclusion."}
          </p>
          <code>
            {workspace.accepted_conclusion_id ?? "NONE"}
          </code>
        </aside>
      </section>

      <nav
        className="workspace-toolbar"
        aria-label="Groundline demo controls"
      >
        <button
          type="button"
          onClick={runSeededAnalysis}
          disabled={demoCycleComplete}
        >
          01 · Run analysis
        </button>
        <button
          type="button"
          onClick={focusPrimaryRisk}
          disabled={!analysisFresh || demoCycleComplete}
        >
          02 · Focus primary risk
        </button>
        <button
          type="button"
          onClick={proposeSeededRevision}
          disabled={!analysisFresh || hasProposal || workspace.revisions.length > 0}
        >
          03 · Propose repair
        </button>

        <span className="toolbar-spacer" />

        <button
          type="button"
          className="secondary-button"
          onClick={resetDemo}
        >
          Reset demo
        </button>
      </nav>

      {demoCycleComplete ? (
        <p className="cycle-complete-note">
          Seeded demo cycle complete. The revised conclusion is intentionally
          unassessed because semantic relations are not inherited automatically.
          Reset the demo to run Integration 001 again.
        </p>
      ) : null}

      <div className="workspace-grid">
        <ReasoningGraph
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
          focusedItemIds={ui.focusedItemIds}
          onSelectItem={selectItem}
        />

        <InspectorPanel
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
        />
      </div>

      <div className="review-grid">
        <RevisionPanel
          workspace={workspace}
          onAccept={acceptLatestRevision}
          onEditAndAccept={
            editAndAcceptLatestRevision
          }
          onReject={rejectLatestRevision}
          onDefer={deferLatestRevision}
        />

        <AuditTrail workspace={workspace} />
      </div>

      <footer className="product-footnote">
        <span>GROUNDLINE · P-06 MINIMAL GRAPH UI</span>
        <span>
          Priority scores are review mechanics, never truth scores.
        </span>
      </footer>
    </main>
  );
}
