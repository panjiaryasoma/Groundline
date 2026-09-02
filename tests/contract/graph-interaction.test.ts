import { describe, expect, it } from "vitest";
import type { Node, NodeChange } from "@xyflow/react";
import {
  applyGraphNodeChanges,
  mergePreservedPositions,
  setAllGraphNodesSelected,
} from "../../src/components/graph";

function node(
  id: string,
  x: number,
  y: number,
  selected = false,
): Node {
  return {
    id,
    position: { x, y },
    data: { label: id },
    selected,
  };
}

describe("P-06.2 graph interaction semantics", () => {
  it("moves one dragged card while every other card remains stationary", () => {
    const nodes = [
      node("A", 0, 0),
      node("B", 100, 100),
      node("C", 200, 200),
    ];

    const changes: NodeChange<Node>[] = [
      {
        id: "B",
        type: "position",
        position: { x: 160, y: 130 },
        dragging: true,
      },
    ];

    const next = applyGraphNodeChanges(nodes, changes);

    expect(next.find((item) => item.id === "A")?.position)
      .toEqual({ x: 0, y: 0 });
    expect(next.find((item) => item.id === "B")?.position)
      .toEqual({ x: 160, y: 130 });
    expect(next.find((item) => item.id === "C")?.position)
      .toEqual({ x: 200, y: 200 });
  });

  it("moves only the selected subset when React Flow emits grouped drag changes", () => {
    const nodes = [
      node("A", 0, 0, true),
      node("B", 100, 100, false),
      node("C", 200, 200, true),
      node("D", 300, 300, true),
    ];

    const changes: NodeChange<Node>[] = [
      {
        id: "A",
        type: "position",
        position: { x: 50, y: 20 },
        dragging: true,
      },
      {
        id: "C",
        type: "position",
        position: { x: 250, y: 220 },
        dragging: true,
      },
      {
        id: "D",
        type: "position",
        position: { x: 350, y: 320 },
        dragging: true,
      },
    ];

    const next = applyGraphNodeChanges(nodes, changes);

    expect(next.find((item) => item.id === "A")?.position)
      .toEqual({ x: 50, y: 20 });
    expect(next.find((item) => item.id === "B")?.position)
      .toEqual({ x: 100, y: 100 });
    expect(next.find((item) => item.id === "C")?.position)
      .toEqual({ x: 250, y: 220 });
    expect(next.find((item) => item.id === "D")?.position)
      .toEqual({ x: 350, y: 320 });
  });

  it("preserves manually arranged positions across analysis re-renders", () => {
    const current = [
      node("A", 55, 77),
      node("B", 140, 180),
    ];

    const regenerated = [
      node("A", 0, 0),
      node("B", 300, 300),
      node("C", 600, 600),
    ];

    const next = mergePreservedPositions(
      current,
      regenerated,
    );

    expect(next.find((item) => item.id === "A")?.position)
      .toEqual({ x: 55, y: 77 });
    expect(next.find((item) => item.id === "B")?.position)
      .toEqual({ x: 140, y: 180 });
    expect(next.find((item) => item.id === "C")?.position)
      .toEqual({ x: 600, y: 600 });
  });

  it("selects every graph node in one action", () => {
    const nodes = [
      node("A", 0, 0, false),
      node("B", 100, 100, true),
      node("C", 200, 200, false),
    ];

    const next = setAllGraphNodesSelected(
      nodes,
      true,
    );

    expect(
      next.every((item) => item.selected),
    ).toBe(true);
  });

  it("clears the whole graph selection in one action", () => {
    const nodes = [
      node("A", 0, 0, true),
      node("B", 100, 100, true),
    ];

    const next = setAllGraphNodesSelected(
      nodes,
      false,
    );

    expect(
      next.some((item) => item.selected),
    ).toBe(false);
  });


  it("preserves selection state when positions are merged", () => {
    const current = [
      {
        id: "A",
        position: { x: 10, y: 20 },
        data: {},
        selected: true,
      },
    ];

    const next = [
      {
        id: "A",
        position: { x: 999, y: 999 },
        data: {},
      },
    ];

    const merged =
      mergePreservedPositions(
        current,
        next,
      );

    expect(merged[0].selected).toBe(true);
    expect(merged[0].position).toEqual({
      x: 10,
      y: 20,
    });
  });




});
