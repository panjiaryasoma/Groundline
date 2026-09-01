import { integration001 } from "./integration001";
import { integration001Evaluations } from "./integration001Evaluations";
import {
  attachWorkspaceAnalysis,
  triageWorkspaceFromEvaluations,
} from "../domain/workspaceAnalysis";
import { getDownstreamDependencies } from "../domain/dependencies";
import {
  acceptRevision,
  proposeRevision,
} from "../domain/revisions";

export const INTEGRATION_001_PROPOSED_TEXT =
  "Do not use face recognition as the sole high-stakes access-control mechanism until performance is evaluated across the intended populations and capture conditions; retain an alternative review or access path.";

export function runIntegration001BeforeHumanReview() {
  const analysis = triageWorkspaceFromEvaluations(
    integration001,
    integration001Evaluations,
  );

  const analyzedWorkspace = attachWorkspaceAnalysis(
    integration001,
    analysis,
  );

  const trace = getDownstreamDependencies(
    analyzedWorkspace,
    "A-001",
  );

  const proposedWorkspace = proposeRevision({
    workspace: analyzedWorkspace,
    revisionId: "REV-INT-001",
    targetItemId: "CONC-001",
    proposedText: INTEGRATION_001_PROPOSED_TEXT,
    reasonCodes: [
      "UNSUPPORTED_ASSUMPTION",
      "OVERGENERALIZATION",
    ],
    affectedItemIds: ["A-001", "C-001", "CONC-001"],
    createdBy: "AGENT",
    createdAt: "2026-09-02T00:05:00+07:00",
    auditEventId: "AUD-INT-PROPOSE",
  });

  return {
    analysis,
    analyzedWorkspace,
    trace,
    proposedWorkspace,
  };
}

export function runIntegration001HumanAcceptance() {
  const beforeReview = runIntegration001BeforeHumanReview();

  const acceptedWorkspace = acceptRevision({
    workspace: beforeReview.proposedWorkspace,
    revisionId: "REV-INT-001",
    actor: "HUMAN",
    reviewedAt: "2026-09-02T00:10:00+07:00",
    auditEventId: "AUD-INT-ACCEPT",
    acceptedItemId: "CONC-002",
  });

  return {
    ...beforeReview,
    acceptedWorkspace,
  };
}
