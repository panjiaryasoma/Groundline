import type { WebMCPToolDefinition } from "../modelContext";
import { GroundlineError } from "../../domain/errors";
import { getItem } from "../../domain/dependencies";
import { useWorkspaceStore } from "../../state/workspaceStore";
import { assertActiveGroundlineWorkspace } from "../activeWorkspace";

const MAX_PROPOSED_TEXT_CHARS = 6000;
const MAX_REASON_CODES = 20;
const MAX_AFFECTED_ITEMS = 50;

function requireString(
  value: unknown,
  field: string,
  minimumLength = 1,
): string {
  if (typeof value !== "string") {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must be a string.`,
    );
  }

  const trimmed = value.trim();

  if (trimmed.length < minimumLength) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must contain at least ${minimumLength} characters.`,
    );
  }

  return trimmed;
}

function parseStringArray(
  value: unknown,
  field: string,
  maxItems: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must be an array.`,
    );
  }

  if (value.length > maxItems) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} may contain at most ${maxItems} items.`,
    );
  }

  const parsed = value.map(
    (item: unknown) =>
      requireString(item, field),
  );

  if (new Set(parsed).size !== parsed.length) {
    throw new GroundlineError(
      "INVALID_INPUT",
      `${field} must not contain duplicate values.`,
    );
  }

  return parsed;
}

export function createProposeRevisionTool(): WebMCPToolDefinition {
  return {
    name: "propose_revision",
    title: "Propose Groundline revision",
    description:
      "Create a PROPOSED revision for an existing ACCEPTED Groundline item after inspecting and, when needed, triaging the active workspace. The latest semantic agent focus is preserved as primary-risk context. If a human already prepared a repair target, the proposal must target that same item. Never accept knowledge; a human reviews the proposal.",
    inputSchema: {
      type: "object",
      properties: {
        target_item_id: {
          type: "string",
          minLength: 1,
          description:
            "Existing ACCEPTED item to revise.",
        },
        proposed_text: {
          type: "string",
          minLength: 3,
          maxLength: MAX_PROPOSED_TEXT_CHARS,
          description:
            "Suggested replacement wording.",
        },
        reason_codes: {
          type: "array",
          items: { type: "string", minLength: 1 },
          maxItems: MAX_REASON_CODES,
          uniqueItems: true,
        },
        affected_item_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          maxItems: MAX_AFFECTED_ITEMS,
          uniqueItems: true,
        },
      },
      required: [
        "target_item_id",
        "proposed_text",
        "reason_codes",
        "affected_item_ids",
      ],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
    execute(input) {
      const { workspace } =
        assertActiveGroundlineWorkspace();

      const targetItemId = requireString(
        input?.target_item_id,
        "target_item_id",
      );
      const proposedText = requireString(
        input?.proposed_text,
        "proposed_text",
        3,
      );

      if (
        proposedText.length >
        MAX_PROPOSED_TEXT_CHARS
      ) {
        throw new GroundlineError(
          "INVALID_INPUT",
          `proposed_text may contain at most ${MAX_PROPOSED_TEXT_CHARS} characters.`,
        );
      }

      const reasonCodes = parseStringArray(
        input?.reason_codes,
        "reason_codes",
        MAX_REASON_CODES,
      );
      const affectedItemIds = parseStringArray(
        input?.affected_item_ids,
        "affected_item_ids",
        MAX_AFFECTED_ITEMS,
      );

      getItem(workspace, targetItemId);
      for (const itemId of affectedItemIds) {
        getItem(workspace, itemId);
      }

      useWorkspaceStore
        .getState()
        .proposeAgentRevision({
          targetItemId,
          proposedText,
          reasonCodes,
          affectedItemIds,
        });

      const nextWorkspace =
        useWorkspaceStore.getState().workspace;
      const proposal =
        [...nextWorkspace.revisions]
          .reverse()
          .find(
            (revision) =>
              revision.state === "PROPOSED",
          );

      return {
        proposal,
        accepted_conclusion_id:
          nextWorkspace.accepted_conclusion_id,
        knowledge_changed: false,
        human_review_required: true,
        audit_event:
          "PROPOSE_REVISION",
      };
    },
  };
}
