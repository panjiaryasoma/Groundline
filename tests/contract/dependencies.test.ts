import { describe, expect, it } from "vitest";
import {
  getAcceptedConclusion,
  getDownstreamAcceptedIds,
  getDownstreamDependencies,
  getIncomingRelations,
  getItem,
  getOutgoingRelations,
  getUpstreamDependencies,
  hasDirectRelationToAcceptedConclusion,
} from "../../src/domain/dependencies";
import { GroundlineError } from "../../src/domain/errors";
import type { Workspace } from "../../src/domain/schema";
import { integration001 } from "../../src/fixtures/integration001";

describe("P-02 graph/domain helpers", () => {
  it("looks up an existing item and returns structured NOT_FOUND for a missing item", () => {
    expect(getItem(integration001, "A-001").type).toBe("ASSUMPTION");

    try {
      getItem(integration001, "DOES-NOT-EXIST");
      throw new Error("Expected getItem to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(GroundlineError);
      expect((error as GroundlineError).code).toBe("NOT_FOUND");
    }
  });

  it("returns typed incoming and outgoing relations", () => {
    const incoming = getIncomingRelations(integration001, "C-001");
    expect(incoming.map((relation) => relation.id)).toEqual(
      expect.arrayContaining(["R-001", "R-003", "R-007"]),
    );

    const outgoing = getOutgoingRelations(integration001, "A-001");
    expect(outgoing.map((relation) => relation.id)).toEqual(
      expect.arrayContaining(["R-003", "R-008"]),
    );

    const challengesOnly = getIncomingRelations(
      integration001,
      "C-001",
      ["CHALLENGES"],
    );
    expect(challengesOnly.map((relation) => relation.id)).toEqual(["R-007"]);
  });

  it("resolves the accepted conclusion and validates its contract state", () => {
    const conclusion = getAcceptedConclusion(integration001);
    expect(conclusion?.id).toBe("CONC-001");
    expect(conclusion?.type).toBe("CONCLUSION");
    expect(conclusion?.state).toBe("ACCEPTED");
  });

  it("traces downstream from the critical assumption to the accepted conclusion", () => {
    const result = getDownstreamDependencies(integration001, "A-001");

    expect(result.node_ids).toEqual(
      expect.arrayContaining(["C-001", "CONC-001"]),
    );
    expect(result.relation_ids).toEqual(
      expect.arrayContaining(["R-003", "R-008", "R-004"]),
    );
    expect(result.cycle_detected).toBe(false);
    expect(result.truncated).toBe(false);
  });

  it("traces upstream from the accepted conclusion to its represented support", () => {
    const result = getUpstreamDependencies(integration001, "CONC-001");

    expect(result.node_ids).toEqual(
      expect.arrayContaining([
        "A-001",
        "C-001",
        "E-AGG-001",
        "CC-001",
        "E-SUB-001",
        "SRC-NIST-001",
      ]),
    );
  });

  it("returns downstream accepted IDs and identifies a direct accepted-conclusion relation", () => {
    const accepted = getDownstreamAcceptedIds(integration001, "A-001");

    expect(accepted).toEqual(
      expect.arrayContaining(["C-001", "CONC-001"]),
    );
    expect(
      hasDirectRelationToAcceptedConclusion(integration001, "A-001"),
    ).toBe(true);
    expect(
      hasDirectRelationToAcceptedConclusion(integration001, "E-AGG-001"),
    ).toBe(false);
  });

  it("is cycle-safe without confusing converging paths with cycles", () => {
    const cyclic: Workspace = {
      ...structuredClone(integration001),
      relations: [
        ...structuredClone(integration001.relations),
        {
          id: "R-CYCLE",
          from_id: "CONC-001",
          to_id: "A-001",
          type: "DEPENDS_ON",
        },
      ],
    };

    const result = getDownstreamDependencies(cyclic, "A-001", {
      maxDepth: 20,
      maxNodes: 100,
    });

    expect(result.cycle_detected).toBe(true);
    expect(result.node_ids).toEqual(
      expect.arrayContaining(["C-001", "CONC-001"]),
    );
    expect(result.node_ids.length).toBeLessThanOrEqual(100);
  });

  it("bounds traversal output and reports truncation", () => {
    const result = getUpstreamDependencies(integration001, "CONC-001", {
      maxDepth: 12,
      maxNodes: 2,
    });

    expect(result.node_ids).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("rejects invalid traversal bounds with structured INVALID_INPUT", () => {
    expect(() =>
      getDownstreamDependencies(integration001, "A-001", { maxNodes: 0 }),
    ).toThrowError(GroundlineError);

    try {
      getDownstreamDependencies(integration001, "A-001", { maxDepth: -1 });
      throw new Error("Expected invalid bound to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(GroundlineError);
      expect((error as GroundlineError).code).toBe("INVALID_INPUT");
    }
  });
});
