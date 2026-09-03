import type {
  KnowledgeItem,
  TriageRecord,
  Workspace,
} from "../../domain/schema";

interface InspectorPanelProps {
  workspace: Workspace;
  selectedItemId: string | null;
}

function relationSummary(
  workspace: Workspace,
  itemId: string,
) {
  return workspace.relations.filter(
    (relation) =>
      relation.from_id === itemId ||
      relation.to_id === itemId,
  );
}

function triageFor(
  records: TriageRecord[],
  itemId: string,
) {
  return records.find((record) => record.item_id === itemId);
}

export function InspectorPanel({
  workspace,
  selectedItemId,
}: InspectorPanelProps) {
  const item: KnowledgeItem | undefined =
    workspace.items.find(
      (candidate) => candidate.id === selectedItemId,
    );

  if (!item) {
    return (
      <aside className="inspector-panel">
        <p className="eyebrow">Inspector</p>
        <h2>No item selected</h2>
        <p className="muted-copy">
          Select a reasoning object to inspect its state,
          relations, source provenance, and triage result.
        </p>
      </aside>
    );
  }

  const triage = triageFor(
    workspace.triage_records,
    item.id,
  );
  const relations = relationSummary(workspace, item.id);

  const revisionActivity =
    workspace.revisions
      .filter(
        (revision) =>
          revision.target_item_id === item.id ||
          revision.affected_item_ids.includes(
            item.id,
          ),
      )
      .slice()
      .reverse();

  return (
    <aside className="inspector-panel">
      <div className="inspector-heading">
        <div>
          <p className="eyebrow">{item.type}</p>
          <h2>{item.id}</h2>
        </div>

        <span className="knowledge-state">
          {item.state}
        </span>
      </div>

      <p className="inspector-text">{item.text}</p>

      <section className="inspector-section">
        <p className="eyebrow">Triage</p>

        {triage ? (
          <>
            <div className="triage-readout">
              <span
                className={`triage-badge triage-badge--${triage.state.toLowerCase()}`}
              >
                {triage.state}
              </span>
              <span>
                priority{" "}
                {triage.priority_score_internal ?? "—"}
              </span>
            </div>

            <dl className="metric-grid">
              <div>
                <dt>Weakness</dt>
                <dd>
                  {triage.weakness_score_internal ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>
                  {triage.impact_score_internal ?? "—"}
                </dd>
              </div>
            </dl>

            {triage.reason_codes.length > 0 ? (
              <ul className="reason-list">
                {triage.reason_codes.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="muted-copy">
                No material reason code recorded.
              </p>
            )}
          </>
        ) : (
          <p className="muted-copy">
            No triage result yet. Semantic analysis must run before a risk status appears.
          </p>
        )}
      </section>

      <section className="inspector-section">
        <p className="eyebrow">
          Revision activity
        </p>
        {revisionActivity.length ? (
          <ul className="relation-list">
            {revisionActivity.map(
              (revision) => (
                <li
                  key={
                    revision.revision_id
                  }
                >
                  <span>
                    {revision.state}
                  </span>
                  <code>
                    {
                      revision.revision_id
                    }
                  </code>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="muted-copy">
            No repair activity for this
            item yet.
          </p>
        )}
      </section>

      <section className="inspector-section">
        <p className="eyebrow">Relations</p>
        <ul className="relation-list">
          {relations.length > 0 ? (
            relations.map((relation) => (
              <li key={relation.id}>
                <span>{relation.type}</span>
                <code>
                  {relation.from_id} → {relation.to_id}
                </code>
              </li>
            ))
          ) : (
            <li>No represented relations.</li>
          )}
        </ul>
      </section>

      {item.type === "SOURCE" &&
      item.source_metadata ? (
        <section className="inspector-section">
          <p className="eyebrow">Source provenance</p>
          <dl className="source-meta">
            <div>
              <dt>Class</dt>
              <dd>{item.source_metadata.source_class}</dd>
            </div>
            <div>
              <dt>Publisher</dt>
              <dd>
                {item.source_metadata.publisher ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt>External</dt>
              <dd>
                {item.source_metadata.external_content
                  ? "YES · UNTRUSTED CONTENT"
                  : "NO"}
              </dd>
            </div>
          </dl>

          {item.source_metadata.url ? (
            <a
              href={item.source_metadata.url}
              target="_blank"
              rel="noreferrer"
              className="source-link"
            >
              Open source
            </a>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
