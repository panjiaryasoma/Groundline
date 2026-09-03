import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Workspace } from "../../domain/schema";
import type {
  GraphSelectionRequest,
} from "../../state/workspaceStore";
import { AuditTrail } from "../audit";
import { InspectorPanel } from "../inspector";
import { RevisionPanel } from "../revision";

const LazyReasoningGraph = lazy(() =>
  import("../graph/ReasoningGraph").then((module) => ({
    default: module.ReasoningGraph,
  })),
);

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
const noopEdit = (_text: string) => undefined;

function GraphLoadingFallback() {
  return (
    <div
      className="p13-graph-loading"
      role="status"
      aria-live="polite"
    >
      <strong>Loading reasoning map</strong>
      <span>
        The rest of the review workspace remains available while the graph loads.
      </span>
    </div>
  );
}

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
  heading = "Inspect the live reasoning workspace.",
  showCollapse = false,
  showHeading = true,
}: ExpandedReasoningMapProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const graphHostRef = useRef<HTMLDivElement | null>(null);
  const [graphRequested, setGraphRequested] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (graphRequested || !graphHostRef.current) return;

    if (typeof IntersectionObserver === "undefined") {
      setGraphRequested(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setGraphRequested(true);
        observer.disconnect();
      },
      { rootMargin: "520px 0px" },
    );

    observer.observe(graphHostRef.current);
    return () => observer.disconnect();
  }, [graphRequested]);

  useEffect(() => {
    const itemId = graphSelectionRequest?.itemId;
    const version = graphSelectionRequest?.version ?? 0;

    if (
      !itemId ||
      version <= 0 ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    setGraphRequested(true);

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;
    const escapedId =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(itemId)
        : itemId.replace(/["\\]/g, "\\$&");

    let cancelled = false;
    let attempt = 0;
    let timeoutId = 0;

    const revealSelection = () => {
      if (cancelled) return;

      const selectedCard = sectionRef.current?.querySelector<HTMLElement>(
        `[data-item-id="${escapedId}"]`,
      );

      if (selectedCard) {
        selectedCard.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
          inline: "nearest",
        });
        return;
      }

      attempt += 1;
      if (attempt < 20) {
        timeoutId = window.setTimeout(revealSelection, 60);
        return;
      }

      sectionRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
        inline: "nearest",
      });
    };

    timeoutId = window.setTimeout(revealSelection, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    graphSelectionRequest?.itemId,
    graphSelectionRequest?.version,
  ]);

  return (
    <section
      ref={sectionRef}
      className={`focus-map-expansion focus-map-expansion--live${
        showHeading ? "" : " focus-map-expansion--no-heading"
      }`}
      aria-label="Live reasoning workspace"
    >
      {showHeading ? (
        <div className="focus-map-expansion__heading">
          <div>
            <p className="eyebrow">Reasoning workspace</p>
            <h3>{heading}</h3>
            <p className="focus-map-expansion__copy">
              Selection, inspector, revision proposal, and decision history share
              the same state. Click any card to inspect it.
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
        <div
          ref={graphHostRef}
          className="live-review-grid__graph"
          aria-busy={!graphRequested}
        >
          {graphRequested ? (
            <Suspense fallback={<GraphLoadingFallback />}>
              <LazyReasoningGraph
                workspace={workspace}
                selectedItemId={selectedItemId}
                focusedItemIds={focusedItemIds}
                graphSelectionRequest={graphSelectionRequest}
                onSelectItem={onSelectItem}
              />
            </Suspense>
          ) : (
            <GraphLoadingFallback />
          )}
        </div>

        <div className="live-review-grid__inspector">
          <InspectorPanel
            workspace={workspace}
            selectedItemId={selectedItemId}
          />
        </div>

        <div className="live-review-grid__revision">
          <RevisionPanel
            workspace={workspace}
            onAccept={onAccept}
            onEditAndAccept={onEditAndAccept}
            onReject={onReject}
            onDefer={onDefer}
          />
        </div>

        <div className="live-review-grid__audit">
          <AuditTrail workspace={workspace} />
        </div>
      </div>

      <p className="live-review-epistemic-note">
        Priority scores are review mechanics, never truth scores.
      </p>
    </section>
  );
}
