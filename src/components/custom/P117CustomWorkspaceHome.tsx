import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  clearP117AgentReviewState,
  clearP117RelationProposalBatch,
  requestP117AgentReview,
  useP117AgentReviewStore,
} from "../../state/p117AgentReview";
import { applyP117ApprovedRelations } from "../../state/p117RelationReview";
import { semanticReviewContract } from "../../webmcp/semanticReviewContract";
import { P112CustomWorkspaceHome } from "./P112CustomWorkspaceHome";
import "../../styles/p11-7.css";

type Props = ComponentProps<typeof P112CustomWorkspaceHome>;

function proposalKey(proposal: {
  from_id: string;
  to_id: string;
  type: string;
}): string {
  return `${proposal.from_id}|${proposal.type}|${proposal.to_id}`;
}

export function P117CustomWorkspaceHome(props: Props) {
  const request = useP117AgentReviewStore((state) => state.request);
  const proposalBatch = useP117AgentReviewStore(
    (state) => state.proposalBatch,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProposalKeys, setSelectedProposalKeys] =
    useState<Set<string>>(new Set());

  const semanticReview = useMemo(
    () => semanticReviewContract(props.workspace),
    [props.workspace],
  );
  const currentToken = semanticReview.review_token;

  const currentProposalBatch =
    proposalBatch?.reviewToken === currentToken
      ? proposalBatch
      : null;

  useEffect(() => {
    const staleRequest = request && request.reviewToken !== currentToken;
    const staleBatch =
      proposalBatch && proposalBatch.reviewToken !== currentToken;

    if (staleRequest || staleBatch) {
      clearP117AgentReviewState();
    }
  }, [currentToken, proposalBatch, request]);

  useEffect(() => {
    if (!currentProposalBatch) return;

    setSelectedProposalKeys(
      new Set(currentProposalBatch.proposals.map(proposalKey)),
    );
    setMessage(null);
  }, [currentProposalBatch]);

  const prepareAgentReview = useCallback(() => {
    try {
      requestP117AgentReview();
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Groundline could not prepare the current semantic review state.",
      );
    }
  }, []);

  useEffect(() => {
    const handleStructureCheck = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(
        ".custom-analysis-action .focus-primary-action",
      );
      if (!button) return;

      prepareAgentReview();
    };

    document.addEventListener("click", handleStructureCheck);
    return () =>
      document.removeEventListener("click", handleStructureCheck);
  }, [prepareAgentReview]);

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
      requestP117AgentReview();
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
      <P112CustomWorkspaceHome {...props} />

      {currentProposalBatch && typeof document !== "undefined"
        ? createPortal(
            <aside
              className="p117-review-panel"
              aria-label="Review suggested semantic connections"
              aria-live="polite"
            >
              <div className="p117-review-panel__heading">
                <div>
                  <span>GROUNDLINE · CONNECTION REVIEW</span>
                  <strong>Review suggested connections</strong>
                </div>
              </div>

              <div className="p117-connection-review">
                <p>
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
                  fresh review of the changed reasoning.
                </small>

                {message ? (
                  <p className="p117-review-panel__message">{message}</p>
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
