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

        <article className="start-choice">
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
    </section>
  );
}
