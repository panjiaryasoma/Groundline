interface StartScreenProps {
  onStartOwnDecision: () => void;
  onStartDemo: () => void;
}

export function StartScreen({
  onStartOwnDecision,
  onStartDemo,
}: StartScreenProps) {
  return (
    <section className="start-screen" id="groundline-start">
      <section className="start-scene start-scene--hero" aria-labelledby="groundline-hero-title">
        <div className="start-hero__copy">
          <p className="start-hero__kicker">Reasoning field · Surface level</p>
          <h2 id="groundline-hero-title">
            See what your <em>conclusions</em> stand on.
          </h2>
          <div className="start-hero__rule" aria-hidden="true" />
          <p className="start-hero__lede">
            Groundline turns a decision into a visible structure of claims,
            evidence, assumptions, and sources, then helps humans and agents
            inspect weak ground without confusing review priority with truth.
          </p>
          <div className="start-hero__actions">
            <a href="#groundline-entry"><span>Enter reasoning field</span><span>↓</span></a>
            <a href="#groundline-method"><span>Read the method</span><span>↓</span></a>
          </div>
        </div>

        <figure className="reasoning-specimen" aria-label="Illustrative Groundline reasoning specimen">
          <div className="reasoning-specimen__topline">
            <span className="reasoning-specimen__accession">FIELD.GL.001</span>
            <span>Illustrative structure</span>
          </div>

          <div className="reasoning-specimen__conclusion">
            <span>CONCLUSION</span>
            <strong>The proposal is feasible.</strong>
          </div>

          <div className="reasoning-specimen__stack">
            <div className="reasoning-specimen__layer" data-layer="claim">
              <span>CLAIM</span>
              <strong>The operating model can support the expected load.</strong>
            </div>
            <div className="reasoning-specimen__layer" data-layer="evidence">
              <span>EVIDENCE</span>
              <strong>Observed pilot results support part of that claim.</strong>
            </div>
            <div className="reasoning-specimen__layer" data-layer="assumption">
              <span>ASSUMPTION</span>
              <strong>Pilot conditions will remain representative at scale.</strong>
            </div>
            <div className="reasoning-specimen__layer" data-layer="source">
              <span>SOURCE</span>
              <strong>Evaluation record and represented origin of evidence.</strong>
            </div>
          </div>

          <span className="reasoning-specimen__fault" aria-hidden="true" />
          <span className="reasoning-specimen__fault-label">
            Fault detected · unsupported assumption weakens the structure above
          </span>
          <figcaption>Reasoning specimen · conceptual, not a truth score</figcaption>
        </figure>
      </section>

      <section
        id="groundline-method"
        className="start-scene start-scene--method"
        aria-labelledby="groundline-method-title"
      >
        <div className="start-method__copy">
          <p className="start-method__kicker">How to read the ground</p>
          <h2 id="groundline-method-title">
            A decision is only as strong as the layers beneath it.
          </h2>
          <p>
            Groundline keeps different reasoning roles separate so a polished
            conclusion cannot hide unsupported assumptions, missing evidence,
            or unclear provenance.
          </p>
        </div>

        <div className="start-method__principles">
          <article>
            <span>01 / CLAIM</span>
            <h3>Assertions stay explicit.</h3>
            <p>
              Claims are represented as inspectable reasoning objects instead
              of disappearing inside prose.
            </p>
          </article>
          <article>
            <span>02 / EVIDENCE</span>
            <h3>Support stays observable.</h3>
            <p>
              Evidence records what substantiates a claim without pretending
              that represented support automatically proves it.
            </p>
          </article>
          <article>
            <span>03 / ASSUMPTION</span>
            <h3>Quiet dependencies become visible.</h3>
            <p>
              Assumptions can be challenged, reviewed, and repaired instead of
              remaining invisible load-bearing beliefs.
            </p>
          </article>
          <article>
            <span>04 / SOURCE</span>
            <h3>Reasoning keeps its provenance.</h3>
            <p>
              Sources preserve where represented information came from so the
              path to a conclusion remains auditable.
            </p>
          </article>
        </div>
      </section>

      <section
        id="groundline-entry"
        className="start-scene start-scene--entry"
        aria-labelledby="groundline-entry-title"
      >
        <div className="start-entry__copy">
          <p className="start-entry__kicker">Enter the reasoning field</p>
          <h2 id="groundline-entry-title">Bring in a decision worth testing.</h2>
          <p>
            Start with ordinary language. Groundline maps it into reasoning
            objects first, then lets you inspect, focus, repair, and decide in
            one shared workspace.
          </p>
          <ol className="start-entry__steps">
            <li><b>01</b><span>State what you are deciding.</span></li>
            <li><b>02</b><span>Write your current conclusion and main reason.</span></li>
            <li><b>03</b><span>Add evidence or a source if you have one.</span></li>
            <li><b>04</b><span>Review weak ground before trusting the conclusion.</span></li>
          </ol>
        </div>

        <div className="start-choice-grid">
          <article className="start-choice start-choice--primary">
            <span>Your own decision</span>
            <h3>Check something you are actually deciding.</h3>
            <p>
              You only need three things to start: what you are deciding, what
              you currently think, and your main reason.
            </p>
            <ul>
              <li>Evidence is optional.</li>
              <li>A source URL is optional.</li>
              <li>You can leave gaps and fix them later.</li>
            </ul>
            <button type="button" onClick={onStartOwnDecision}>
              Check my own decision
            </button>
          </article>

          <article className="start-choice start-choice--example">
            <span>Example field record</span>
            <h3>See the full review loop before entering anything.</h3>
            <p>
              Use the seeded face-recognition example to understand the
              check → understand → decide flow without entering your own data.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={onStartDemo}
            >
              Try the example
            </button>
          </article>
        </div>
      </section>
    </section>
  );
}
