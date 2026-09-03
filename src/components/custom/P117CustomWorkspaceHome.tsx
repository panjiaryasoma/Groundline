import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  getP114UnlinkedReasoningItemIds,
} from "../../state/p114AddReasoningItem";
import {
  clearP117AgentReviewState,
  clearP117RelationProposalBatch,
  requestP117AgentReview,
  useP117AgentReviewStore,
} from "../../state/p117AgentReview";
import { applyP117ApprovedRelations } from "../../state/p117RelationReview";
import { hasWebMCP } from "../../webmcp/modelContext";
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProposalKeys, setSelectedProposalKeys] =
    useState<Set<string>>(new Set());

  const semanticReview = useMemo(
    () => semanticReviewContract(props.workspace),
    [props.workspace],
  );
  const currentToken = semanticReview.review_token;
  const unlinkedIds = useMemo(
    () => getP114UnlinkedReasoningItemIds(props.workspace),
    [props.workspace],
  );

  const currentRequest =
    request?.reviewToken === currentToken ? request : null;
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
    setPanelOpen(true);
  }, [currentProposalBatch]);

  const requestAgentReview = useCallback(() => {
    try {
      requestP117AgentReview();
      setMessage(null);
      setPanelOpen(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Groundline could not create the current agent review request.",
      );
      setPanelOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleAnalysisClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(
        ".custom-analysis-action .focus-primary-action",
      );
      if (!button) return;

      requestAgentReview();
    };

    document.addEventListener("click", handleAnalysisClick);
    return () => document.removeEventListener("click", handleAnalysisClick);
  }, [requestAgentReview]);

  const acceptSelectedRelations = useCallback(() => {
    if (!currentProposalBatch) return;

    const selected = currentProposalBatch.proposals.filter((proposal) =>
      selectedProposalKeys.has(proposalKey(proposal)),
    );

    if (selected.length === 0) {
      setMessage(
        "Select at least one proposed connection or reject the proposal batch.",
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
      setMessage(
        "Connections accepted. The graph changed, so Groundline created a fresh review request. Ask the WebMCP agent to continue with the current workspace.",
      );
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
    setMessage(
      "No proposed connections were accepted. The UNLINKED cards remain explicit, and the agent may still evaluate the graph exactly as represented.",
    );
  }, []);

  const triageComplete = semanticReview.coverage_complete;
  const panelVisible =
    panelOpen || Boolean(currentProposalBatch);

  let heading = "Agent review requested";
  if (currentProposalBatch) heading = "Human connection review required";
  else if (currentRequest && triageComplete) heading = "Semantic review complete";
  else if (!hasWebMCP()) heading = "WebMCP agent unavailable in this browser";

  const criticalCount = props.workspace.triage_records.filter(
    (record) => record.state === "CRITICAL",
  ).length;
  const reviewCount = props.workspace.triage_records.filter(
    (record) => record.state === "REVIEW",
  ).length;
  const stableCount = props.workspace.triage_records.filter(
    (record) => record.state === "STABLE",
  ).length;

  return (
    <>
      <P112CustomWorkspaceHome {...props} />

      {panelVisible && typeof document !== "undefined"
        ? createPortal(
            <aside
              className="p117-review-panel"
              aria-label="Groundline semantic review"
              aria-live="polite"
            >
              <div className="p117-review-panel__heading">
                <div>
                  <span>GROUNDLINE · WEBMCP REVIEW</span>
                  <strong>{heading}</strong>
                </div>
                <button
                  type="button"
                  aria-label="Close semantic review status"
                  onClick={() => setPanelOpen(false)}
                >
                  ×
                </button>
              </div>

              {currentProposalBatch ? (
                <div className="p117-connection-review">
                  <p>
                    The WebMCP agent proposed these semantic connections. No line has been added to the canonical graph yet.
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
                    <button
                      type="button"
                      onClick={rejectRelationBatch}
                    >
                      Reject all
                    </button>
                  </div>

                  <small>
                    Agent proposes. Human decides. Accepted lines invalidate old semantic triage and require a fresh full-batch review.
                  </small>
                </div>
              ) : currentRequest && triageComplete ? (
                <div className="p117-review-panel__result">
                  <span>FRESH TRIAGE COMMITTED</span>
                  <strong>
                    {criticalCount} CRITICAL · {reviewCount} REVIEW · {stableCount} STABLE
                  </strong>
                  <p>
                    Groundline is now using one complete semantic review for the current accepted graph. Focus primary risk and repair are enabled from this fresh triage.
                  </p>
                </div>
              ) : currentRequest ? (
                <div className="p117-review-panel__fallback">
                  <span>WAITING FOR WEBMCP AGENT</span>
                  <p>
                    Groundline prepared a current review packet. No model runs inside the page and no CRITICAL label is fabricated locally.
                  </p>
                  <p>
                    In ChatGPT's in-app browser, ask your agent:
                  </p>
                  <p>
                    <code>
                      Review this Groundline workspace. Propose defensible connections for any UNLINKED cards, wait for my approval, then evaluate every current semantic target and triage the fresh graph.
                    </code>
                  </p>
                  <ol>
                    <li>
                      Agent calls <code>inspect_workspace</code> and uses the current review token.
                    </li>
                    {unlinkedIds.length > 0 ? (
                      <li>
                        Agent may call <code>propose_relations</code>. Proposed lines stay pending until you approve them here.
                      </li>
                    ) : null}
                    <li>
                      After any approved graph change, the agent calls <code>inspect_workspace</code> again.
                    </li>
                    <li>
                      Agent calls <code>triage_workspace</code> once with exactly one evaluation for every current target.
                    </li>
                  </ol>
                  <small>
                    Current packet: {currentRequest.targetItemIds.length} semantic targets · {currentRequest.unlinkedItemIds.length} unlinked · {currentRequest.reviewToken}
                  </small>
                  <div className="p117-review-panel__actions">
                    <button type="button" onClick={requestAgentReview}>
                      Refresh review request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p117-review-panel__error">
                  <span>NO CURRENT REVIEW PACKET</span>
                  <p>
                    {message ??
                      (hasWebMCP()
                        ? "Run analysis to create a fresh WebMCP review request for the current workspace."
                        : "WebMCP is not detected. Open Groundline in ChatGPT's in-app browser or Chrome with WebMCP enabled.")}
                  </p>
                  <button type="button" onClick={requestAgentReview}>
                    Create current review request
                  </button>
                </div>
              )}

              {message ? (
                <p className="p117-review-panel__message">{message}</p>
              ) : null}

              <small className="p117-review-panel__resize">
                Drag the lower-left corner to resize this panel if it covers reasoning cards.
              </small>
            </aside>,
            document.body,
          )
        : null}
    </>
  );
}
