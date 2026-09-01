import { z } from "zod";

export const KNOWLEDGE_TYPES = [
  "QUESTION",
  "CLAIM",
  "COUNTERCLAIM",
  "EVIDENCE",
  "ASSUMPTION",
  "SOURCE",
  "CONCLUSION",
] as const;

export const KNOWLEDGE_STATES = [
  "DRAFT",
  "ACCEPTED",
  "SUPERSEDED",
] as const;

export const RELATION_TYPES = [
  "SUPPORTS",
  "CHALLENGES",
  "DEPENDS_ON",
  "SOURCED_FROM",
  "QUALIFIES",
  "SUPERSEDES",
] as const;

export const REVISION_STATES = [
  "PROPOSED",
  "ACCEPTED",
  "REJECTED",
  "EDITED_AND_ACCEPTED",
  "DEFERRED",
] as const;

export const TRIAGE_STATES = [
  "CRITICAL",
  "REVIEW",
  "STABLE",
  "UNASSESSED",
] as const;

export const DIMENSION_RATINGS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "UNASSESSED",
] as const;

export const ACTOR_TYPES = ["HUMAN", "AGENT", "SYSTEM"] as const;

export const SOURCE_CLASSES = [
  "PRIMARY",
  "SECONDARY",
  "TERTIARY",
  "UNKNOWN",
] as const;

export const KnowledgeTypeSchema = z.enum(KNOWLEDGE_TYPES);
export const KnowledgeStateSchema = z.enum(KNOWLEDGE_STATES);
export const RelationTypeSchema = z.enum(RELATION_TYPES);
export const RevisionStateSchema = z.enum(REVISION_STATES);
export const TriageStateSchema = z.enum(TRIAGE_STATES);
export const DimensionRatingSchema = z.enum(DIMENSION_RATINGS);
export const ActorTypeSchema = z.enum(ACTOR_TYPES);
export const SourceClassSchema = z.enum(SOURCE_CLASSES);

export const ScopeSchema = z
  .object({
    population: z.string().nullable().optional(),
    context: z.string().nullable().optional(),
    timeframe: z.string().nullable().optional(),
  })
  .optional();

export const SourceMetadataSchema = z
  .object({
    source_class: SourceClassSchema,
    title: z.string().min(1),
    publisher: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    url: z.string().url().nullable().optional(),
    locator: z.string().nullable().optional(),
    accessed_at: z.string().nullable().optional(),
    content_hash: z.string().nullable().optional(),
    external_content: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const hasLocator =
      Boolean(value.url) ||
      Boolean(value.locator) ||
      Boolean(value.content_hash) ||
      value.source_class === "UNKNOWN";

    if (!hasLocator) {
      ctx.addIssue({
        code: "custom",
        message:
          "SOURCE requires a provenance locator or an explicit UNKNOWN source class.",
      });
    }
  });

export const KnowledgeItemSchema = z
  .object({
    id: z.string().min(1),
    type: KnowledgeTypeSchema,
    text: z.string().min(1),
    state: KnowledgeStateSchema,
    created_at: z.string().min(1),
    created_by: ActorTypeSchema,
    updated_at: z.string().min(1),
    scope: ScopeSchema,
    tags: z.array(z.string()).optional().default([]),
    supersedes_id: z.string().nullable().optional(),
    source_metadata: SourceMetadataSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type !== "SOURCE" && value.source_metadata) {
      ctx.addIssue({
        code: "custom",
        message: "source_metadata is only valid for SOURCE knowledge items.",
      });
    }
    if (value.type === "SOURCE" && !value.source_metadata) {
      ctx.addIssue({
        code: "custom",
        message: "SOURCE knowledge items require source_metadata.",
      });
    }
  });

export const RelationSchema = z
  .object({
    id: z.string().min(1),
    from_id: z.string().min(1),
    to_id: z.string().min(1),
    type: RelationTypeSchema,
    created_at: z.string().nullable().optional(),
    created_by: ActorTypeSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from_id === value.to_id) {
      ctx.addIssue({
        code: "custom",
        message: "Self-relations are forbidden by the active contract.",
      });
    }
  });

export const DimensionResultSchema = z.object({
  rating: DimensionRatingSchema,
  reason_codes: z.array(z.string()),
  referenced_item_ids: z.array(z.string()),
});

export const EvaluationRecordSchema = z.object({
  evaluation_id: z.string().min(1),
  item_id: z.string().min(1),
  status: z.enum(["COMPLETE", "PARTIAL", "UNASSESSED"]),
  dimensions: z.object({
    evidence_strength: DimensionResultSchema,
    source_quality: DimensionResultSchema,
    contradiction: DimensionResultSchema,
    assumption_burden: DimensionResultSchema,
    generalization_risk: DimensionResultSchema,
    downstream_impact: DimensionResultSchema,
  }),
  reason_codes: z.array(z.string()),
  referenced_item_ids: z.array(z.string()),
  created_at: z.string().min(1),
  generated_by: z.enum(["SYSTEM", "AGENT"]),
});

export const TriageRecordSchema = z.object({
  item_id: z.string().min(1),
  state: TriageStateSchema,
  weakness_score_internal: z.number().int().min(0).max(3).nullable(),
  impact_score_internal: z.number().int().min(1).max(3).nullable(),
  priority_score_internal: z.number().int().min(0).max(9).nullable(),
  reason_codes: z.array(z.string()),
  downstream_accepted_ids: z.array(z.string()),
  direct_to_accepted_conclusion: z.boolean(),
});

export const RevisionSchema = z
  .object({
    revision_id: z.string().min(1),
    target_item_id: z.string().min(1),
    proposed_text: z.string().min(1),
    state: RevisionStateSchema,
    reason_codes: z.array(z.string()),
    affected_item_ids: z.array(z.string()),
    created_by: ActorTypeSchema,
    created_at: z.string().min(1),
    reviewed_by: ActorTypeSchema.nullable().optional(),
    reviewed_at: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.created_by === "AGENT" && value.state !== "PROPOSED") {
      ctx.addIssue({
        code: "custom",
        message: "Agent-created revisions must begin in PROPOSED state.",
      });
    }
  });

export const AuditEventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.enum([
    "CREATE",
    "EDIT",
    "PROPOSE_REVISION",
    "ACCEPT_REVISION",
    "REJECT_REVISION",
    "SUPERSEDE",
    "EVALUATE",
    "TRIAGE",
    "FOCUS",
  ]),
  timestamp: z.string().min(1),
  actor_type: ActorTypeSchema,
  entity_ids: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const WorkspaceSchema = z
  .object({
    schema_version: z.literal("1.1.0"),
    workspace_id: z.string().min(1),
    title: z.string().min(1),
    question_id: z.string().min(1),
    accepted_conclusion_id: z.string().nullable(),
    items: z.array(KnowledgeItemSchema),
    relations: z.array(RelationSchema),
    evaluations: z.array(EvaluationRecordSchema),
    triage_records: z.array(TriageRecordSchema),
    revisions: z.array(RevisionSchema),
    audit_events: z.array(AuditEventSchema),
  })
  .superRefine((workspace, ctx) => {
    const ids = new Set(workspace.items.map((item) => item.id));

    if (!ids.has(workspace.question_id)) {
      ctx.addIssue({
        code: "custom",
        message: "question_id must reference an existing knowledge item.",
      });
    }

    if (
      workspace.accepted_conclusion_id &&
      !ids.has(workspace.accepted_conclusion_id)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "accepted_conclusion_id must reference an existing knowledge item.",
      });
    }

    for (const relation of workspace.relations) {
      if (!ids.has(relation.from_id) || !ids.has(relation.to_id)) {
        ctx.addIssue({
          code: "custom",
          message: `Relation ${relation.id} references a missing item.`,
        });
      }
    }
  });

export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;
export type TriageRecord = z.infer<typeof TriageRecordSchema>;
export type Revision = z.infer<typeof RevisionSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
