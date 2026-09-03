import { GroundlineError } from "./errors";
import {
  WorkspaceSchema,
  type Workspace,
} from "./schema";

export interface CustomDecisionInput {
  question: string;
  conclusion: string;
  reason: string;
  assumption?: string;
  evidence?: string;
  sourceUrl?: string;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function requireText(
  value: string,
  field: string,
): string {
  const normalized = clean(value);

  if (normalized.length < 3) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must contain at least 3 characters.`,
      { field },
    );
  }

  return normalized;
}

function titleFromQuestion(question: string): string {
  const withoutTerminalPunctuation =
    question.replace(/[.!?]+$/g, "").trim();

  if (withoutTerminalPunctuation.length <= 72) {
    return withoutTerminalPunctuation;
  }

  return `${withoutTerminalPunctuation.slice(0, 69).trim()}...`;
}

export function buildCustomWorkspace(
  rawInput: CustomDecisionInput,
  options: {
    workspaceId?: string;
    createdAt?: string;
  } = {},
): Workspace {
  const question = requireText(
    rawInput.question,
    "question",
  );
  const conclusion = requireText(
    rawInput.conclusion,
    "conclusion",
  );
  const reason = requireText(
    rawInput.reason,
    "reason",
  );

  const assumption = clean(rawInput.assumption);
  const evidence = clean(rawInput.evidence);
  const sourceUrl = clean(rawInput.sourceUrl);

  if (sourceUrl && !evidence) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "A source URL needs evidence text explaining what the source supports.",
      { field: "sourceUrl" },
    );
  }

  if (sourceUrl) {
    try {
      new URL(sourceUrl);
    } catch {
      throw new GroundlineError(
        "INVALID_INPUT",
        "sourceUrl must be a valid absolute URL.",
        { field: "sourceUrl" },
      );
    }
  }

  const createdAt =
    options.createdAt ?? new Date().toISOString();
  const workspaceId =
    options.workspaceId ??
    `WS-USER-${Date.now().toString(36).toUpperCase()}`;

  const items: Workspace["items"] = [
    {
      id: "Q-USER-001",
      type: "QUESTION",
      state: "ACCEPTED",
      text: question,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "decision-question"],
    },
    {
      id: "CONC-USER-001",
      type: "CONCLUSION",
      state: "ACCEPTED",
      text: conclusion,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "current-answer"],
    },
    {
      id: "C-USER-001",
      type: "CLAIM",
      state: "ACCEPTED",
      text: reason,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "main-reason"],
    },
  ];

  const relations: Workspace["relations"] = [
    {
      id: "R-USER-REASON-CONCLUSION",
      from_id: "C-USER-001",
      to_id: "CONC-USER-001",
      type: "SUPPORTS",
      created_at: createdAt,
      created_by: "HUMAN",
    },
  ];

  if (assumption) {
    items.push({
      id: "A-USER-001",
      type: "ASSUMPTION",
      state: "ACCEPTED",
      text: assumption,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "stated-assumption"],
    });

    relations.push({
      id: "R-USER-ASSUMPTION-REASON",
      from_id: "A-USER-001",
      to_id: "C-USER-001",
      type: "SUPPORTS",
      created_at: createdAt,
      created_by: "HUMAN",
    });
  }

  if (evidence) {
    items.push({
      id: "E-USER-001",
      type: "EVIDENCE",
      state: "ACCEPTED",
      text: evidence,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "main-evidence"],
    });

    relations.push({
      id: "R-USER-EVIDENCE-REASON",
      from_id: "E-USER-001",
      to_id: "C-USER-001",
      type: "SUPPORTS",
      created_at: createdAt,
      created_by: "HUMAN",
    });
  }

  if (sourceUrl) {
    items.push({
      id: "SRC-USER-001",
      type: "SOURCE",
      state: "ACCEPTED",
      text: "User-provided source",
      created_at: createdAt,
      updated_at: createdAt,
      created_by: "HUMAN",
      tags: ["custom-intake", "user-source"],
      source_metadata: {
        source_class: "UNKNOWN",
        title: "User-provided source",
        url: sourceUrl,
        external_content: true,
      },
    });

    relations.push({
      id: "R-USER-SOURCE-EVIDENCE",
      from_id: "SRC-USER-001",
      to_id: "E-USER-001",
      type: "SOURCED_FROM",
      created_at: createdAt,
      created_by: "HUMAN",
    });
  }

  const workspace: Workspace = {
    schema_version: "1.1.0",
    workspace_id: workspaceId,
    title: titleFromQuestion(question),
    question_id: "Q-USER-001",
    accepted_conclusion_id: "CONC-USER-001",
    items,
    relations,
    evaluations: [],
    triage_records: [],
    revisions: [],
    audit_events: [
      {
        event_id: "AUD-USER-CREATE-001",
        event_type: "CREATE",
        timestamp: createdAt,
        actor_type: "HUMAN",
        entity_ids: items.map((item) => item.id),
        metadata: {
          origin: "CUSTOM_INTAKE",
        },
      },
    ],
  };

  const parsed = WorkspaceSchema.safeParse(workspace);

  if (!parsed.success) {
    throw new GroundlineError(
      "INVALID_INPUT",
      "Custom intake produced a workspace that violates the active schema.",
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}
