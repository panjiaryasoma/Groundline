import type { Workspace } from "../../domain/schema";

interface AuditTrailProps {
  workspace: Workspace;
}

export function AuditTrail({
  workspace,
}: AuditTrailProps) {
  const events = [...workspace.audit_events].reverse();

  return (
    <section className="audit-panel">
      <div className="audit-heading">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h2>Decision history</h2>
        </div>
        <span>{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <p className="muted-copy">
          No analysis or review events yet.
        </p>
      ) : (
        <ol className="audit-list">
          {events.map((event) => (
            <li key={event.event_id}>
              <div>
                <strong>{event.event_type}</strong>
                <span>{event.actor_type}</span>
              </div>
              <code>{event.entity_ids.join(" · ")}</code>
              <time dateTime={event.timestamp}>
                {new Date(event.timestamp).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
