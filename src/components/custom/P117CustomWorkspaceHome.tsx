import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  getP117LocalReviewerAvailability,
  proposeP117Connections,
  runP117SemanticTriage,
  type P117ConnectionProposal,
  type P117Progress,
  type P117TriageSummary,
} from "../../ai/p117LocalSemanticReviewer";
import { getP114UnlinkedReasoningItemIds } from "../../state/p114AddReasoningItem";
import { applyP117ApprovedRelations } from "../../state/p117RelationReview";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { buildSemanticReviewToken } from "../../webmcp/semanticReviewContract";
import { P112CustomWorkspaceHome } from "./P112CustomWorkspaceHome";
import "../../styles/p11-7.css";

type Props = ComponentProps<typeof P112CustomWorkspaceHome>;

type ReviewStage =
  | "IDLE"
  | "CHECKING_MODEL"
  | "DOWNLOADING_MODEL"
  | "PROPOSING_CONNECTIONS"
  | "AWAITING_CONNECTIONS"
  | "TRIAGING"
  | "COMPLETE"
  | "EXTERNAL_REQUIRED"
  | "ERROR";

function proposalKey(proposal: P117ConnectionProposal): string {
  return `${proposal.from_id}|${proposal.type}|${proposal.to_id}`;
}

function stageLabel(stage: ReviewStage): string {
  switch (stage) {
    case "CHECKING_MODEL":
      return "Checking local semantic reviewer";
    case "DOWNLOADING_MODEL":
      return "Preparing Gemini Nano";
    case "PROPOSING_CONNECTIONS":
      return "Reviewing unlinked reasoning";
    case "AWAITING_CONNECTIONS":
      return "Human connection review required";
    case "TRIAGING":
      return "Evaluating current reasoning";
    case "COMPLETE":
      return "Semantic review complete";
    case "EXTERNAL_REQUIRED":
      return "External WebMCP agent required";
    case "ERROR":
      return "Semantic review stopped";
    case "IDLE":
    default:
      return "Semantic review";
  }
}

export function P117CustomWorkspaceHome(props: Props) {
  const [stage, setStage] = useState<ReviewStage>("IDLE");
  const [proposals, setProposals] = useState<P117ConnectionProposal[]>([]);
  const [selectedProposalKeys, setSelectedProposalKeys] =
    useState<Set<string>>(new Set());
  const [proposalToken, setProposalToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<P117TriageSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busyRef = useRef(false);

  const setProgress = useCallback((progress: P117Progress) => {
    if (progress === "DOWNLOADING_MODEL") {
      setStage("DOWNLOADING_MODEL");
    } else if (progress === "PROPOSING_CONNECTIONS") {
      setStage("PROPOSING_CONNECTIONS");
    } else if (progress === "TRIAGING") {
      setStage("TRIAGING");
    }
  }, []);

  const runTriage = useCallback(async () => {
    setStage("TRIAGING");
    setMessage(null);
    const result = await runP117SemanticTriage(setProgress);
    setSummary(result);
    setStage("COMPLETE");
    setProposals([]);
    setSelectedProposalKeys(new Set());
    setProposalToken(null);
  }, [setProgress]);

  const startReview = useCallback(async () => {
    if (busyRef.current || stage === "AWAITING_CONNECTIONS") {
      return;
    }

    busyRef.current = true;
    setStage("CHECKING_MODEL");
    setMessage(null);
    setSummary(null);

    try {
      const availability = await getP117LocalReviewerAvailability();

      if (
        availability === "unsupported" ||
        availability === "unavailable"
      ) {
        setStage("EXTERNAL_REQUIRED");
        setMessage(
          "This browser cannot run Groundline's optional on-device semantic reviewer. The workspace is still fully available to a WebMCP-aware external agent through inspect_workspace and triage_workspace.",
        );
        return;
      }

      const current = useWorkspaceStore.getState().workspace;
      const unlinkedIds = getP114UnlinkedReasoningItemIds(current);

      if (unlinkedIds.length > 0) {
        const token = buildSemanticReviewToken(current);
        const suggested = await proposeP117Connections(
          current,
          setProgress,
        );

        if (suggested.length > 0) {
          setProposalToken(token);
          setProposals(suggested);
          setSelectedProposalKeys(
            new Set(suggested.map(proposalKey)),
          );
          setStage("AWAITING_CONNECTIONS");
          return;
        }
      }

      await runTriage();
    } catch (error) {
      setStage("ERROR");
      setMessage(
        error instanceof Error
          ? error.message
          : "Semantic review failed before any result was committed.",
      );
    } finally {
      busyRef.current = false;
    }
  }, [runTriage, setProgress, stage]);

  useEffect(() => {
    const handleAnalysisClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(
        ".custom-analysis-action .focus-primary-action",
      );
      if (!button) return;

      void startReview();
    };

    document.addEventListener("click", handleAnalysisClick);
    return () => {
      document.removeEventListener("click", handleAnalysisClick);
    };
  }, [startReview]);

  const finishConnectionReview = useCallback(
    async (acceptSelected: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setMessage(null);

      try {
        if (acceptSelected) {
          const selected = proposals.filter((proposal) =>
            selectedProposalKeys.has(proposalKey(proposal)),
          );

          if (selected.length === 0) {
            setMessage(
              "Select at least one suggested connection, or continue without accepting connections.",
            );
            return;
          }

          applyP117ApprovedRelations(
            selected,
            proposalToken ?? "",
          );
        }

        setProposals([]);
        setSelectedProposalKeys(new Set());
        setProposalToken(null);
        await runTriage();
      } catch (error) {
        setStage("ERROR");
        setMessage(
          error instanceof Error
            ? error.message
            : "Groundline could not commit the reviewed semantic structure.",
        );
      } finally {
        busyRef.current = false;
      }
    },
    [
      proposalToken,
      proposals,
      runTriage,
      selectedProposalKeys,
    ],
  );

  const panelVisible = stage !== "IDLE";
  const busy = [
    "CHECKING_MODEL",
    "DOWNLOADING_MODEL",
    "PROPOSING_CONNECTIONS",
    "TRIAGING",
  ].includes(stage);

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
                  <span>GROUNDLINE SEMANTIC REVIEW</span>
                  <strong>{stageLabel(stage)}</strong>
                </div>

                {!busy && stage !== "AWAITING_CONNECTIONS" ? (
                  <button
                    type="button"
                    aria-label="Close semantic review status"
                    onClick={() => setStage("IDLE")}
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {busy ? (
                <div className="p117-review-panel__working">
                  <span className="p117-review-panel__pulse" />
                  <p>
                    {stage === "DOWNLOADING_MODEL"
                      ? "Chrome is preparing the on-device Gemini Nano model. No reasoning result is committed while the model is unavailable."
                      : stage === "PROPOSING_CONNECTIONS"
                        ? "The on-device agent is looking for defensible links involving the UNLINKED cards. Suggestions still require human approval."
                        : stage === "TRIAGING"
                          ? "The on-device agent is evaluating every current review target. Groundline will accept the result only as one fresh, complete batch."
                          : "Checking whether the optional on-device reviewer is available."}
                  </p>
                </div>
              ) : null}

              {stage === "AWAITING_CONNECTIONS" ? (
                <div className="p117-connection-review">
                  <p>
                    The agent proposed these semantic connections. Nothing has been added to the canonical graph yet.
                  </p>

                  <div className="p117-connection-review__list">
                    {proposals.map((proposal) => {
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
                      onClick={() => void finishConnectionReview(true)}
                      disabled={selectedProposalKeys.size === 0}
                    >
                      Accept selected + continue
                    </button>
                    <button
                      type="button"
                      onClick={() => void finishConnectionReview(false)}
                    >
                      Continue without connections
                    </button>
                  </div>

                  <small>
                    Agent proposes. Human decides. Accepted connections are recorded as HUMAN-approved relations, then semantic triage runs again on the new graph.
                  </small>
                </div>
              ) : null}

              {stage === "COMPLETE" && summary ? (
                <div className="p117-review-panel__result">
                  <span>FRESH TRIAGE COMMITTED</span>
                  <strong>
                    {summary.critical} CRITICAL · {summary.review} REVIEW · {summary.stable} STABLE
                  </strong>
                  <p>
                    {summary.primaryRiskId
                      ? `Primary review target: ${summary.primaryRiskId}. The graph and inspector now use this fresh semantic review.`
                      : "No CRITICAL or REVIEW item was produced by the current complete review."}
                  </p>
                </div>
              ) : null}

              {stage === "EXTERNAL_REQUIRED" ? (
                <div className="p117-review-panel__fallback">
                  <span>ON-DEVICE REVIEWER UNAVAILABLE</span>
                  <p>{message}</p>
                  <ol>
                    <li>Agent calls inspect_workspace.</li>
                    <li>Agent evaluates every semantic_review.target_item_id.</li>
                    <li>Agent calls triage_workspace once with the current review_token and the full batch.</li>
                  </ol>
                  <small>
                    Groundline will not invent CRITICAL labels merely because the local model is unavailable.
                  </small>
                </div>
              ) : null}

              {stage === "ERROR" ? (
                <div className="p117-review-panel__error">
                  <span>NO RESULT COMMITTED</span>
                  <p>{message}</p>
                  <button
                    type="button"
                    onClick={() => void startReview()}
                  >
                    Retry current workspace
                  </button>
                </div>
              ) : null}

              {message &&
              stage !== "ERROR" &&
              stage !== "EXTERNAL_REQUIRED" ? (
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
