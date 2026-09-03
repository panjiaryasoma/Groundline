import { P117CustomWorkspaceHome } from "../components/custom/P117CustomWorkspaceHome";
import { DecisionIntake } from "../components/intake";
import { P111FocusWorkspace } from "../components/focus";
import { StartScreen } from "../components/start";
import { hasWebMCP } from "../webmcp/modelContext";
import { useGroundlineWebMCP } from "../webmcp/useGroundlineWebMCP";
import { installP111RepairLifecycle } from "../state/p111RepairLifecycle";
import { installP112CustomSemanticGate } from "../state/p112CustomSemanticGate";
import { useWorkspaceStore } from "../state/workspaceStore";
import "../styles/app.css";
import "../styles/p11.css";

installP111RepairLifecycle();
installP112CustomSemanticGate();

export function App() {
  useGroundlineWebMCP();

  const experienceMode =
    useWorkspaceStore(
      (state) => state.experienceMode,
    );
  const customInput =
    useWorkspaceStore(
      (state) => state.customInput,
    );
  const workspace = useWorkspaceStore(
    (state) => state.workspace,
  );
  const ui = useWorkspaceStore(
    (state) => state.ui,
  );

  const startIntake =
    useWorkspaceStore(
      (state) => state.startIntake,
    );
  const startDemo =
    useWorkspaceStore(
      (state) => state.startDemo,
    );
  const backToStart =
    useWorkspaceStore(
      (state) => state.backToStart,
    );
  const createCustomWorkspace =
    useWorkspaceStore(
      (state) => state.createCustomWorkspace,
    );

  const resetDemo = useWorkspaceStore(
    (state) => state.resetDemo,
  );
  const selectItem = useWorkspaceStore(
    (state) => state.selectItem,
  );
  const runSeededAnalysis =
    useWorkspaceStore(
      (state) => state.runSeededAnalysis,
    );
  const focusPrimaryRisk =
    useWorkspaceStore(
      (state) => state.focusPrimaryRisk,
    );
  const proposeSeededRevision =
    useWorkspaceStore(
      (state) => state.proposeSeededRevision,
    );
  const acceptLatestRevision =
    useWorkspaceStore(
      (state) => state.acceptLatestRevision,
    );
  const editAndAcceptLatestRevision =
    useWorkspaceStore(
      (state) => state.editAndAcceptLatestRevision,
    );
  const rejectLatestRevision =
    useWorkspaceStore(
      (state) => state.rejectLatestRevision,
    );
  const deferLatestRevision =
    useWorkspaceStore(
      (state) => state.deferLatestRevision,
    );
  const focusCustomPrimaryRisk =
    useWorkspaceStore(
      (state) => state.focusCustomPrimaryRisk,
    );
  const proposeCustomRepair =
    useWorkspaceStore(
      (state) => state.proposeCustomRepair,
    );

  return (
    <main className="app-shell app-shell--unified">
      <header className="masthead masthead--compact">
        <div className="compact-brand">
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
        <P111FocusWorkspace
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
          focusedItemIds={ui.focusedItemIds}
          graphSelectionRequest={
            ui.graphSelectionRequest ?? {
              itemId: null,
              version: 0,
            }
          }
          onSelectItem={selectItem}
          onRunAnalysis={runSeededAnalysis}
          onFocusPrimaryRisk={focusPrimaryRisk}
          onProposeRevision={proposeSeededRevision}
          onAccept={acceptLatestRevision}
          onEditAndAccept={editAndAcceptLatestRevision}
          onReject={rejectLatestRevision}
          onDefer={deferLatestRevision}
          onReset={resetDemo}
          onExitExample={backToStart}
        />
      ) : null}

      {experienceMode === "CUSTOM" ? (
        <P117CustomWorkspaceHome
          workspace={workspace}
          selectedItemId={ui.selectedItemId}
          focusedItemIds={ui.focusedItemIds}
          graphSelectionRequest={
            ui.graphSelectionRequest ?? {
              itemId: null,
              version: 0,
            }
          }
          onSelectItem={selectItem}
          onFocusPrimaryRisk={focusCustomPrimaryRisk}
          onProposeRepair={proposeCustomRepair}
          onAccept={acceptLatestRevision}
          onEditAndAccept={editAndAcceptLatestRevision}
          onReject={rejectLatestRevision}
          onDefer={deferLatestRevision}
          onEdit={startIntake}
          onBackToStart={backToStart}
        />
      ) : null}

      <footer className="product-footnote">
        <span>
          GROUNDLINE · CHECK → UNDERSTAND → DECIDE
        </span>
        <span>
          Agent proposes. Human decides.
        </span>
        <span>
          Priority scores are review mechanics,
          never truth scores.
        </span>
      </footer>
    </main>
  );
}
