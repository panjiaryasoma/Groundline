interface StartScreenProps {
  onStartOwnDecision: () => void;
  onStartDemo: () => void;
}

export function StartScreen({
  onStartOwnDecision,
  onStartDemo,
}: StartScreenProps) {
  return (
    <section className="start-screen">
      <div className="start-screen__lead-grid">
        <div className="start-screen__copy">
          <p className="eyebrow">
            Before you trust a decision
          </p>
          <h2>
            Check what it actually stands on.
          </h2>
          <p>
            Groundline asks a few ordinary questions,
            turns your answers into a reasoning
            structure, then helps you see what deserves
            review.
          </p>
        </div>

        <aside className="start-screen__field-note">
          <span>Field note 01</span>
          <strong>
            Conclusions depend on what lies beneath.
          </strong>
          <p>
            Trace a decision from its visible conclusion
            down through claims, evidence, assumptions,
            and sources. Weak ground should stay visible,
            not disappear behind a confident sentence.
          </p>
        </aside>
      </div>

      <div className="start-choice-grid">
        <article className="start-choice start-choice--primary">
          <span>Your own decision</span>
          <h3>Bring something you are actually deciding.</h3>
          <p>
            You only need three things to start:
            what you are deciding, what you currently
            think, and your main reason.
          </p>

          <ul>
            <li>Evidence is optional.</li>
            <li>A source URL is optional.</li>
            <li>You can leave gaps and fix them later.</li>
          </ul>

          <button
            type="button"
            onClick={onStartOwnDecision}
          >
            Check my own decision
          </button>
        </article>

        <article className="start-choice start-choice--example">
          <span>Example</span>
          <h3>See Groundline work first.</h3>
          <p>
            Use the seeded face-recognition example
            to understand the check → understand →
            decide flow without entering anything.
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

      <div
        className="start-strata-guide"
        aria-label="Groundline reasoning layers"
      >
        <article data-stratum="claim">
          <span>01</span>
          <div>
            <strong>Claim</strong>
            <p>What is being asserted.</p>
          </div>
        </article>
        <article data-stratum="evidence">
          <span>02</span>
          <div>
            <strong>Evidence</strong>
            <p>What substantiates it.</p>
          </div>
        </article>
        <article data-stratum="assumption">
          <span>03</span>
          <div>
            <strong>Assumption</strong>
            <p>What must quietly hold true.</p>
          </div>
        </article>
        <article data-stratum="source">
          <span>04</span>
          <div>
            <strong>Source</strong>
            <p>Where the reasoning comes from.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
