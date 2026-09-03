import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { UnifiedReviewWorkspace } from "../review/UnifiedReviewWorkspace";
import {
  clearP117AgentReviewState,
  clearP117RelationProposalBatch,
  useP117AgentReviewStore,
} from "../../state/p117AgentReview";
import { applyP117ApprovedRelations } from "../../state/p117RelationReview";
import { hasP113StructuralCycleCandidate } from "../../state/p113StructuralCycleGuard";
import { semanticReviewContract } from "../../webmcp/semanticReviewContract";
import "../../styles/p11-7.css";

type Props = Omit<
  ComponentProps<typeof UnifiedReviewWorkspace>,
  "mode"
>;

function proposalKey(proposal: {
  from_id: string;
  to_id: string;
  type: string;
}): string {
  return `${proposal.from_id}|${proposal.type}|${proposal.to_id}`;
}

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function P117CustomWorkspaceHome(props: Props) {
  const proposalBatch = useP117AgentReviewStore(
    (state) => state.proposalBatch,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProposalKeys, setSelectedProposalKeys] =
    useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const currentToken = useMemo(
    () => semanticReviewContract(props.workspace).review_token,
    [props.workspace],
  );

  const currentProposalBatch =
    proposalBatch?.reviewToken === currentToken
      ? proposalBatch
      : null;

  const effectiveRunAnalysis =
    props.onRunAnalysis && hasP113StructuralCycleCandidate(props.workspace)
      ? props.onRunAnalysis
      : undefined;

  useEffect(() => {
    if (proposalBatch && proposalBatch.reviewToken !== currentToken) {
      clearP117AgentReviewState();
    }
  }, [currentToken, proposalBatch]);

  useEffect(() => {
    if (!currentProposalBatch) return;

    setSelectedProposalKeys(
      new Set(currentProposalBatch.proposals.map(proposalKey)),
    );
    setMessage(null);

    if (typeof document === "undefined") return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = window.requestAnimationFrame(() => {
      const firstControl = panelRef.current
        ? focusableElements(panelRef.current)[0]
        : null;
      (firstControl ?? panelRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const previous = restoreFocusRef.current;
      if (previous?.isConnected) previous.focus();
      restoreFocusRef.current = null;
    };
  }, [currentProposalBatch]);

  useEffect(() => {
    if (!currentProposalBatch || !panelRef.current) return;

    const panel = panelRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusables = focusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleKeyDown);
    return () => panel.removeEventListener("keydown", handleKeyDown);
  }, [currentProposalBatch]);

  const acceptSelectedRelations = useCallback(() => {
    if (!currentProposalBatch) return;

    const selected = currentProposalBatch.proposals.filter((proposal) =>
      selectedProposalKeys.has(proposalKey(proposal)),
    );

    if (selected.length === 0) {
      setMessage(
        "Select at least one suggested connection or reject all suggestions.",
      );
      return;
    }

    try {
      applyP117ApprovedRelations(
        selected,
        currentProposalBatch.reviewToken,
      );
      clearP117RelationProposalBatch();
      setSelectedProposalKeys(new Set());
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Groundline could not accept the reviewed semantic connections.",
      );
    }
  }, [currentProposalBatch, selectedProposalKeys]);

  const rejectRelationBatch = useCallback(() => {
    clearP117RelationProposalBatch();
    setSelectedProposalKeys(new Set());
    setMessage(null);
  }, []);

  return (
    <>
      <UnifiedReviewWorkspace
        {...props}
        onRunAnalysis={effectiveRunAnalysis}
        mode="CUSTOM"
      />

      {currentProposalBatch && typeof document !== "undefined"
        ? createPortal(
            <aside
              ref={panelRef}
              className="p117-review-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Review suggested semantic connections"
              aria-describedby="p117-relation-review-description"
              tabIndex={-1}
            >
              <div className="p117-review-panel__heading">
                <div>
                  <span>GROUNDLINE · CONNECTION REVIEW</span>
                  <strong id="p117-relation-review-title">
                    Review suggested connections
                  </strong>
                </div>
              </div>

              <div className="p117-connection-review">
                <p id="p117-relation-review-description">
                  An AI agent suggested these relationships for the current
                  reasoning map. Nothing changes until you approve it.
                </p>

                <div className="p117-connection-review__list">
                  {currentProposalBatch.proposals.map((proposal) => {
                    const key = proposalKey(proposal);
                    const checked = selectedProposalKeys.has(key);

                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedProposalKeys((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                        />
                        <span>
                          <strong>
                            {proposal.from_id} {proposal.type} {proposal.to_id}
                          </strong>
                          <small>{proposal.rationale}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="p117-review-panel__actions">
                  <button
                    type="button"
                    onClick={acceptSelectedRelations}
                    disabled={selectedProposalKeys.size === 0}
                  >
                    Accept selected connections
                  </button>
                  <button type="button" onClick={rejectRelationBatch}>
                    Reject all
                  </button>
                </div>

                <small>
                  Agent proposes. Human decides. Approved lines become part of
                  the graph, invalidate stale semantic triage, and require a
                  fresh agent review of the changed reasoning.
                </small>

                {message ? (
                  <p
                    className="p117-review-panel__message"
                    role="status"
                    aria-live="polite"
                  >
                    {message}
                  </p>
                ) : null}
              </div>

              <small className="p117-review-panel__resize">
                Drag the lower-left corner to resize this panel if it covers
                reasoning cards.
              </small>
            </aside>,
            document.body,
          )
        : null}
    </>
  );
}
