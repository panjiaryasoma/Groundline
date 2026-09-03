import type { Workspace } from "../../domain/schema";
import type {
  GraphSelectionRequest,
} from "../../state/workspaceStore";
import { AuditTrail } from "../audit";
import { ReasoningGraph } from "../graph";
import { InspectorPanel } from "../inspector";
import { RevisionPanel } from "../revision";

interface ExpandedReasoningMapProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  graphSelectionRequest?: GraphSelectionRequest;
  onSelectItem: (
    itemId: string | null,
  ) => void;
  onCollapse?: () => void;
  onAccept?: () => void;
  onEditAndAccept?: (
    editedText: string,
  ) => void;
  onReject?: () => void;
  onDefer?: () => void;
  heading?: string;
  showCollapse?: boolean;
  showHeading?: boolean;
}

const noop = () => undefined;
const noopEdit = (_text: string) =>
  undefined;

export function ExpandedReasoningMap({
  workspace,
  selectedItemId,
  focusedItemIds,
  graphSelectionRequest,
  onSelectItem,
  onCollapse,
  onAccept = noop,
  onEditAndAccept = noopEdit,
  onReject = noop,
  onDefer = noop,
  heading =
    "Inspect the live reasoning workspace.",
  showCollapse = false,
  showHeading = true,
}: ExpandedReasoningMapProps) {
  return (
    <section
      className={`focus-map-expansion focus-map-expansion--live${
        showHeading
          ? ""
          : " focus-map-expansion--no-heading"
      }`}
      aria-label="Live reasoning workspace"
    >
      {showHeading ? (
        <div className="focus-map-expansion__heading">
          <div>
            <p className="eyebrow">
              Reasoning workspace
            </p>
            <h3>{heading}</h3>
            <p className="focus-map-expansion__copy">
              Selection, inspector, revision proposal,
              and decision history share the same state.
              Click any card to inspect it.
            </p>
          </div>

          {showCollapse && onCollapse ? (
            <button
              type="button"
              className="focus-text-action"
              onClick={onCollapse}
            >
              Hide reasoning workspace
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="focus-map-legend">
        <span>
          <strong>Cards</strong>
          reasoning objects
        </span>
        <span>
          <strong>Click</strong>
          inspect one object
        </span>
        <span>
          <strong>Focus</strong>
          return to primary risk
        </span>
        <span>
          <strong>Repair</strong>
          revise the focused accepted item
        </span>
      </div>

      <div className="live-review-grid">
        <div className="live-review-grid__graph">
          <ReasoningGraph
            workspace={workspace}
            selectedItemId={
              selectedItemId
            }
            focusedItemIds={
              focusedItemIds
            }
            graphSelectionRequest={
              graphSelectionRequest
            }
            onSelectItem={
              onSelectItem
            }
          />
        </div>

        <div className="live-review-grid__inspector">
          <InspectorPanel
            workspace={workspace}
            selectedItemId={
              selectedItemId
            }
          />
        </div>

        <div className="live-review-grid__revision">
          <RevisionPanel
            workspace={workspace}
            onAccept={onAccept}
            onEditAndAccept={
              onEditAndAccept
            }
            onReject={onReject}
            onDefer={onDefer}
          />
        </div>

        <div className="live-review-grid__audit">
          <AuditTrail
            workspace={workspace}
          />
        </div>
      </div>

      <p className="live-review-epistemic-note">
        Priority scores are review mechanics,
        never truth scores.
      </p>
    </section>
  );
}
