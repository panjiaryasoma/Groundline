import {
  useEffect,
  useState,
} from "react";

import type { Workspace } from "../../domain/schema";
import { AuditTrail } from "../audit";
import { ReasoningGraph } from "../graph";
import { InspectorPanel } from "../inspector";

interface ExpandedReasoningMapProps {
  workspace: Workspace;
  selectedItemId: string | null;
  focusedItemIds: string[];
  onSelectItem: (itemId: string | null) => void;
  onCollapse: () => void;
  forceDetailsOpen?: boolean;
}

export function ExpandedReasoningMap({
  workspace,
  selectedItemId,
  focusedItemIds,
  onSelectItem,
  onCollapse,
  forceDetailsOpen = false,
}: ExpandedReasoningMapProps) {
  const [detailsOpen, setDetailsOpen] =
    useState(forceDetailsOpen);

  useEffect(() => {
    if (forceDetailsOpen) {
      setDetailsOpen(true);
    }
  }, [forceDetailsOpen]);

  return (
    <section className="focus-map-expansion">
      <div className="focus-map-expansion__heading">
        <div>
          <p className="eyebrow">
            Advanced reasoning map
          </p>
          <h3>
            Inspect the structure behind the review.
          </h3>
          <p className="focus-map-expansion__copy">
            This view is optional. The normal Groundline
            workflow does not require editing the graph.
          </p>
        </div>

        <button
          type="button"
          className="focus-text-action"
          onClick={onCollapse}
        >
          Back to simple review
        </button>
      </div>

      <div className="focus-map-legend">
        <span>
          <strong>Cards</strong>
          reasoning objects
        </span>
        <span>
          <strong>Arrows</strong>
          relationships
        </span>
        <span>
          <strong>Click</strong>
          inspect one object
        </span>
        <span>
          <strong>Ctrl / Shift</strong>
          select several
        </span>
      </div>

      <ReasoningGraph
        workspace={workspace}
        selectedItemId={selectedItemId}
        focusedItemIds={focusedItemIds}
        onSelectItem={onSelectItem}
      />

      <div className="focus-map-technical-toggle">
        <button
          type="button"
          onClick={() =>
            setDetailsOpen((value) => !value)
          }
        >
          {detailsOpen
            ? "Hide technical details"
            : "Show selected item and decision history"}
        </button>
      </div>

      {detailsOpen ? (
        <div className="focus-map-details">
          <InspectorPanel
            workspace={workspace}
            selectedItemId={selectedItemId}
          />
          <AuditTrail workspace={workspace} />
        </div>
      ) : null}
    </section>
  );
}
