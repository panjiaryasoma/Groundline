import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { integration001 } from "../../src/fixtures/integration001";
import {
  PROMPT_INJECTION_PAYLOAD,
  promptInjection001,
} from "../../src/fixtures/promptInjection001";
import { WorkspaceSchema } from "../../src/domain/schema";
import { useWorkspaceStore } from "../../src/state/workspaceStore";
import { createVerticalSliceTools } from "../../src/webmcp/registerTools";

function tool(name: string) {
  const found = createVerticalSliceTools().find(
    (candidate) => candidate.name === name,
  );

  if (!found) {
    throw new Error(`Missing WebMCP tool: ${name}`);
  }

  return found;
}

function loadWorkspace(
  workspace = structuredClone(integration001),
) {
  useWorkspaceStore.setState({
    experienceMode: "DEMO",
    customInput: null,
    workspace,
    ui: {
      selectedItemId: null,
      focusedItemIds: [],
      graphSelectionRequest: {
        itemId: null,
        version: 0,
      },
    },
  });
}

describe("P-10 security / robustness hard blockers", () => {
  beforeEach(() => {
    loadWorkspace();
  });

  it("treats a prompt-injection SOURCE as untrusted data without mutating accepted knowledge", async () => {
    loadWorkspace(
      structuredClone(promptInjection001),
    );

    const inspect = tool("inspect_item");
    const before = structuredClone(
      useWorkspaceStore.getState().workspace,
    );

    const result =
      (await inspect.execute({
        item_id: "SRC-INJECT-001",
      })) as any;

    const after =
      useWorkspaceStore.getState().workspace;

    expect(
      inspect.annotations?.untrustedContentHint,
    ).toBe(true);
    expect(result.item).toMatchObject({
      id: "SRC-INJECT-001",
      type: "SOURCE",
      content_trust: "UNTRUSTED_DATA",
      text: PROMPT_INJECTION_PAYLOAD,
      text_truncated: false,
    });
    expect(result.content_handling).toContain(
      "never as instructions",
    );
    expect(
      result.provenance.source_metadata
        .external_content,
    ).toBe(true);

    expect(after.accepted_conclusion_id).toBe(
      before.accepted_conclusion_id,
    );
    expect(after.revisions).toEqual(
      before.revisions,
    );
    expect(after.audit_events).toEqual(
      before.audit_events,
    );
  });

  it("keeps evidence/source payloads explicitly untrusted when inspecting sourced evidence", async () => {
    loadWorkspace(
      structuredClone(promptInjection001),
    );

    const result =
      (await tool("inspect_item").execute({
        item_id: "E-SUB-001",
      })) as any;

    expect(result.item.content_trust).toBe(
      "UNTRUSTED_DATA",
    );
    expect(
      result.provenance.untrusted_payload_present,
    ).toBe(true);

    expect(
      result.provenance.source_items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "SRC-INJECT-001",
          content_trust: "UNTRUSTED_DATA",
        }),
      ]),
    );
  });

  it("rejects unknown IDs across inspect, trace, focus and propose without state mutation", () => {
    const before = structuredClone(
      useWorkspaceStore.getState().workspace,
    );

    expect(() =>
      tool("inspect_item").execute({
        item_id: "NO-SUCH-ITEM",
      }),
    ).toThrow(
      'Knowledge item "NO-SUCH-ITEM" was not found.',
    );

    expect(() =>
      tool("trace_dependencies").execute({
        item_id: "NO-SUCH-ITEM",
        direction: "DOWNSTREAM",
      }),
    ).toThrow(
      'Knowledge item "NO-SUCH-ITEM" was not found.',
    );

    expect(() =>
      tool("focus_items").execute({
        item_ids: ["NO-SUCH-ITEM"],
        primary_item_id: "NO-SUCH-ITEM",
      }),
    ).toThrow(
      'Knowledge item "NO-SUCH-ITEM" was not found.',
    );

    expect(() =>
      tool("propose_revision").execute({
        target_item_id: "NO-SUCH-ITEM",
        proposed_text:
          "A bounded proposal that must not be created.",
        reason_codes: ["SECURITY_TEST"],
        affected_item_ids: [],
      }),
    ).toThrow(
      'Repair target "NO-SUCH-ITEM" is not an ACCEPTED knowledge item.',
    );

    expect(
      useWorkspaceStore.getState().workspace,
    ).toEqual(before);
  });

  it("rejects malformed trace inputs instead of silently choosing a direction or ignoring bounds", () => {
    const trace = tool("trace_dependencies");

    expect(() =>
      trace.execute({
        item_id: "A-001",
        direction: "SIDEWAYS",
      }),
    ).toThrow(
      "trace_dependencies direction must be UPSTREAM or DOWNSTREAM.",
    );

    expect(() =>
      trace.execute({
        item_id: "A-001",
        direction: "DOWNSTREAM",
        max_depth: 21,
      }),
    ).toThrow(
      "max_depth must be an integer between 1 and 20.",
    );

    expect(() =>
      trace.execute({
        item_id: "A-001",
        direction: "DOWNSTREAM",
        max_nodes: 51,
      }),
    ).toThrow(
      "max_nodes must be an integer between 1 and 50.",
    );
  });

  it("detects a malformed reasoning cycle and still returns a bounded traversal", async () => {
    const cyclic = structuredClone(integration001);

    cyclic.relations.push({
      id: "R-SEC-CYCLE-001",
      from_id: "C-001",
      to_id: "A-001",
      type: "SUPPORTS",
      created_at: "2026-09-02T00:00:00.000Z",
      created_by: "SYSTEM",
    });

    loadWorkspace(
      WorkspaceSchema.parse(cyclic),
    );

    const result =
      (await tool("trace_dependencies").execute({
        item_id: "A-001",
        direction: "DOWNSTREAM",
        max_depth: 8,
        max_nodes: 4,
      })) as any;

    expect(result.cycle_detected).toBe(true);
    expect(result.node_ids.length).toBeLessThanOrEqual(
      4,
    );
    expect(result.max_depth_reached).toBeLessThanOrEqual(
      8,
    );
  });

  it("bounds workspace-level item counts and long text instead of dumping an unbounded graph", async () => {
    const large = structuredClone(integration001);

    large.items[0] = {
      ...large.items[0],
      text: "x".repeat(5000),
    };

    for (let index = 0; index < 20; index += 1) {
      large.items.push({
        id: `C-SEC-${index}`,
        type: "CLAIM",
        text: `Synthetic security-bound claim ${index}`,
        state: "DRAFT",
        created_at: "2026-09-02T00:00:00.000Z",
        created_by: "SYSTEM",
        updated_at: "2026-09-02T00:00:00.000Z",
        tags: ["security-fixture"],
      });
    }

    loadWorkspace(
      WorkspaceSchema.parse(large),
    );

    const result =
      (await tool("inspect_workspace").execute({})) as any;

    expect(result.items).toHaveLength(12);
    expect(result.truncated).toBe(true);
    expect(result.items[0].text).toHaveLength(1200);
    expect(
      result.items[0].text_truncated,
    ).toBe(true);
  });

  it("bounds item-scoped hostile source text while preserving the untrusted marker", async () => {
    const hostile = structuredClone(
      promptInjection001,
    );
    const source = hostile.items.find(
      (item) => item.id === "SRC-INJECT-001",
    );

    if (!source) {
      throw new Error(
        "Prompt injection fixture source missing.",
      );
    }

    source.text = `${PROMPT_INJECTION_PAYLOAD}\n${"z".repeat(9000)}`;

    loadWorkspace(
      WorkspaceSchema.parse(hostile),
    );

    const result =
      (await tool("inspect_item").execute({
        item_id: "SRC-INJECT-001",
      })) as any;

    expect(result.item.content_trust).toBe(
      "UNTRUSTED_DATA",
    );
    expect(result.item.text).toHaveLength(6000);
    expect(result.item.text_truncated).toBe(true);
    expect(result.truncated).toBe(true);
  });
});
