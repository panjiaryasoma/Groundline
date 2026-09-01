import { expect } from "vitest";
import { buildEvaluationRecord } from "../../src/domain/evaluation";
import { triageEvaluation } from "../../src/domain/triage";
import { TRIAGE_ACCEPTANCE_FIXTURES } from "./acceptanceFixtures";

export function assertTriageAcceptance(fixtureId: string): void {
  const fixture = TRIAGE_ACCEPTANCE_FIXTURES[fixtureId];

  if (!fixture) {
    throw new Error(`Unknown triage acceptance fixture: ${fixtureId}`);
  }

  const immutableSnapshot = JSON.stringify(fixture);

  const evaluation = buildEvaluationRecord({
    evaluationId: `EVAL-${fixture.id}`,
    itemId: fixture.itemId,
    ratings: fixture.ratings,
    reasonCodes: fixture.reasonCodes,
    referencedItemIds: fixture.referencedItemIds,
    generatedBy: "SYSTEM",
    createdAt: "2026-09-02T00:00:00+07:00",
  });

  const triage = triageEvaluation(evaluation, {
    downstreamAcceptedIds: fixture.downstreamAcceptedIds,
    directToAcceptedConclusion: fixture.directToAcceptedConclusion,
  });

  expect(evaluation.status).toBe(fixture.expected.evaluationStatus);
  expect(evaluation.referenced_item_ids).toContain(fixture.itemId);

  expect(triage.item_id).toBe(fixture.itemId);
  expect(triage.weakness_score_internal).toBe(fixture.expected.weakness);
  expect(triage.impact_score_internal).toBe(fixture.expected.impact);
  expect(triage.priority_score_internal).toBe(fixture.expected.priority);
  expect(triage.state).toBe(fixture.expected.state);
  expect(triage.direct_to_accepted_conclusion).toBe(
    fixture.directToAcceptedConclusion,
  );

  for (const reasonCode of fixture.reasonCodes) {
    expect(triage.reason_codes).toContain(reasonCode);
  }

  for (const forbidden of fixture.forbiddenReasonCodes ?? []) {
    expect(triage.reason_codes).not.toContain(forbidden);
  }

  // Evaluation/triage are pure analysis operations at P-03.
  // The fixture object remains byte-for-byte equivalent.
  expect(JSON.stringify(fixture)).toBe(immutableSnapshot);

  // Contract: triage output is not a truth/confidence object.
  expect("truth_score" in triage).toBe(false);
  expect("truth_probability" in triage).toBe(false);
  expect("confidence_of_truth" in triage).toBe(false);
}
