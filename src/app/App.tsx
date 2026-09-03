import { P117CustomWorkspaceHome } from "../components/custom/P117CustomWorkspaceHome";
import { DecisionIntake } from "../components/intake";
import { UnifiedReviewWorkspace } from "../components/review/UnifiedReviewWorkspace";
import { StartScreen } from "../components/start";
import { hasWebMCP } from "../webmcp/modelContext";
import { useGroundlineWebMCP } from "../webmcp/useGroundlineWebMCP";
import { installP111RepairLifecycle } from "../state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../state/p112CustomSemanticGate";
import { installP113StructuralCycleGuard } from "../state/p113StructuralCycleGuard";
import { useWorkspaceStore } from "../state/workspaceStore";
import groundlineIcon from "../styles/asset/icon.png";
import "../styles/app.css";
import "../styles/p11.css";
import "../styles/p12.css";
import "../styles/p12-2.css";
import "../styles/p12-3.css";

installP111RepairLifecycle();
installP112CustomSemanticGate();
installP113StructuralCycleGuard();

export function App() {
  useGroundlineWebMCP();

  const experienceMode = useWorkspaceStore(
    (state) => state.experienceMode,
  );
  const customInput = useWorkspaceStore(
    (state) => state.customInput,
  );
  const workspace = useWorkspaceStore(
    (state) => state.workspace,
  );
  const ui = useWorkspaceStore((state) => state.ui);

  const startIntake = useWorkspaceStore(
    (state) => state.startIntake,
  );
  const startDemo = useWorkspaceStore(
    (state) => state.startDemo,
  );
  const backToStart = useWorkspaceStore(
    (state) => state.backToStart,
  );
  const createCustomWorkspace = useWorkspaceStore(
    (state) => state.createCustomWorkspace,
  );
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

  const focusCustomPrimaryRisk = useWorkspaceStore(
    (state) => state.focusCustomPrimaryRisk,
  );
  const proposeCustomRepair = useWorkspaceStore(
    (state) => state.proposeCustomRepair,
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

  const graphSelectionRequest =
    ui.graphSelectionRequest ?? {
      itemId: null,
      version: 0,
    };

  const modeClass = `app-shell--${experienceMode.toLowerCase()}`;

  return (
    <main
      className={`app-shell app-shell--unified ${modeClass}`}
      data-experience-mode={experienceMode}
    >
      <header className="masthead masthead--compact site-header">
        <div className="site-header__brand">
          <img src={groundlineIcon} alt="" width="38" height="38" />
          <div className="site-header__brand-copy">
            <h1>GROUNDLINE</h1>
            <span>Auditable reasoning field system</span>
          </div>
        </div>

        {experienceMode === "START" ? (
          <nav className="site-header__nav" aria-label="Groundline sections">
            <a href="#groundline-start">Surface</a>
            <a href="#groundline-method">Method</a>
            <a href="#groundline-entry">Enter field</a>
          </nav>
        ) : (
          <div className="site-header__journey" aria-label="Groundline review lifecycle">
            <span>Check</span>
            <span>Understand</span>
            <span>Decide</span>
          </div>
        )}

        <div className="site-header__status">
          <span>Schema 1.1.0</span>
          <span className={hasWebMCP() ? "is-live" : undefined}>
            {hasWebMCP() ? "WebMCP detected" : "WebMCP not detected"}
          </span>
        </div>
      </header>

      {experienceMode === "START" ? (
        <StartScreen
          onStartOwnDecision={startIntake}
          onStartDemo={startDemo}
        />
      ) : null}

      {experienceMode === "INTAKE" ? (
        <DecisionIntake
          initialValue={customInput}
          onSubmit={createCustomWorkspace}
          onCancel={
            customInput
              ? () =>
                  useWorkspaceStore.setState({
                    experienceMode: "CUSTOM",
                  })
              : backToStart
          }
          onExitHome={backToStart}
        />
      ) : null}

      {experienceMode === "DEMO" ? (
        <UnifiedReviewWorkspace
          mode="DEMO"
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
          focusedItemIds={ui.focusedItemIds}
          graphSelectionRequest={graphSelectionRequest}
          onSelectItem={selectItem}
          onRunAnalysis={runSeededAnalysis}
          onFocusPrimaryRisk={focusPrimaryRisk}
          onProposeRepair={proposeSeededRevision}
          onAccept={acceptLatestRevision}
          onEditAndAccept={editAndAcceptLatestRevision}
          onReject={rejectLatestRevision}
          onDefer={deferLatestRevision}
          onExit={backToStart}
          onResetDemo={resetDemo}
        />
      ) : null}

      {experienceMode === "CUSTOM" ? (
        <P117CustomWorkspaceHome
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
          focusedItemIds={ui.focusedItemIds}
          graphSelectionRequest={graphSelectionRequest}
          onSelectItem={selectItem}
          onRunAnalysis={focusCustomPrimaryRisk}
          onFocusPrimaryRisk={focusCustomPrimaryRisk}
          onProposeRepair={proposeCustomRepair}
          onAccept={acceptLatestRevision}
          onEditAndAccept={editAndAcceptLatestRevision}
          onReject={rejectLatestRevision}
          onDefer={deferLatestRevision}
          onExit={backToStart}
          onEditInput={startIntake}
        />
      ) : null}

      <footer className="product-footnote">
        <span>GROUNDLINE · CHECK → UNDERSTAND → DECIDE</span>
        <span>Agent proposes. Human decides.</span>
        <span>Priority scores are review mechanics, never truth scores.</span>
      </footer>
    </main>
  );
}
