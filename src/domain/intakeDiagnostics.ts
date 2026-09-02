import type {
  KnowledgeItem,
  Workspace,
} from "./schema";

export type IntakeDiagnosticCode =
  | "MISSING_ASSUMPTION"
  | "MISSING_EVIDENCE"
  | "MISSING_SOURCE"
  | "READY_FOR_AGENT_REVIEW";

export interface IntakeDiagnostic {
  code: IntakeDiagnosticCode;
  severity: "INFO" | "OPTIONAL";
  title: string;
  explanation: string;
}

function taggedItem(
  workspace: Workspace,
  tag: string,
): KnowledgeItem | undefined {
  return workspace.items.find(
    (item) => item.tags?.includes(tag),
  );
}

/**
 * Structural readiness only.
 *
 * Required custom-intake core:
 * - decision question
 * - current conclusion
 * - main reason
 *
 * Assumption, evidence, and source provenance improve the review but are
 * intentionally optional. Their absence must never block the user from
 * progressing to semantic agent review.
 *
 * This function does NOT infer truth, evidence strength, contradiction,
 * source quality, overgeneralization, or semantic risk.
 */
export function getIntakeDiagnostics(
  workspace: Workspace,
): IntakeDiagnostic[] {
  const diagnostics: IntakeDiagnostic[] = [];

  const question = taggedItem(
    workspace,
    "decision-question",
  );
  const conclusion = taggedItem(
    workspace,
    "current-answer",
  );
  const reason = taggedItem(
    workspace,
    "main-reason",
  );
  const assumption = taggedItem(
    workspace,
    "stated-assumption",
  );
  const evidence = taggedItem(
    workspace,
    "main-evidence",
  );
  const source = taggedItem(
    workspace,
    "user-source",
  );

  const hasRequiredCore = Boolean(
    question && conclusion && reason,
  );

  if (hasRequiredCore) {
    diagnostics.push({
      code: "READY_FOR_AGENT_REVIEW",
      severity: "INFO",
      title:
        "Your reasoning has the minimum structure needed for semantic review.",
      explanation:
        "Groundline has your decision question, current answer, and main reason. Optional context can improve the review but does not block it.",
    });
  }

  if (!assumption) {
    diagnostics.push({
      code: "MISSING_ASSUMPTION",
      severity: "OPTIONAL",
      title:
        "You have not stated what must be true for your reason to hold.",
      explanation:
        "Optional improvement: making the assumption explicit can give the agent a more precise point to challenge.",
    });
  }

  if (!evidence) {
    diagnostics.push({
      code: "MISSING_EVIDENCE",
      severity: "OPTIONAL",
      title:
        "You have not added supporting evidence yet.",
      explanation:
        "Optional improvement: evidence gives the semantic review more material to inspect, but you can continue without it.",
    });
  } else if (!source) {
    diagnostics.push({
      code: "MISSING_SOURCE",
      severity: "OPTIONAL",
      title:
        "You added evidence, but not where it came from.",
      explanation:
        "Optional improvement: adding provenance makes the evidence easier to audit. It is not required to continue.",
    });
  }

  return diagnostics;
}
