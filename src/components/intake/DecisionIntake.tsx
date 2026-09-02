import { useMemo, useState } from "react";

import type { CustomDecisionInput } from "../../domain/customWorkspace";

interface DecisionIntakeProps {
  initialValue?: CustomDecisionInput | null;
  onSubmit: (input: CustomDecisionInput) => void;
  onCancel: () => void;
  onExitHome: () => void;
}

const EMPTY_INPUT: CustomDecisionInput = {
  question: "",
  conclusion: "",
  reason: "",
  assumption: "",
  evidence: "",
  sourceUrl: "",
};

function isValidRequired(
  value: string,
): boolean {
  return value.trim().length >= 3;
}

export function DecisionIntake({
  initialValue,
  onSubmit,
  onCancel,
  onExitHome,
}: DecisionIntakeProps) {
  const [step, setStep] = useState(1);
  const [input, setInput] =
    useState<CustomDecisionInput>({
      ...EMPTY_INPUT,
      ...(initialValue ?? {}),
    });
  const [error, setError] =
    useState<string | null>(null);

  const canLeaveStep1 =
    isValidRequired(input.question) &&
    isValidRequired(input.conclusion);

  const canLeaveStep2 =
    isValidRequired(input.reason);

  const sourceWithoutEvidence =
    Boolean(input.sourceUrl?.trim()) &&
    !Boolean(input.evidence?.trim());

  const reviewRows = useMemo(
    () => [
      {
        label: "What you are deciding",
        value: input.question,
        required: true,
      },
      {
        label: "Your current answer",
        value: input.conclusion,
        required: true,
      },
      {
        label: "Your main reason",
        value: input.reason,
        required: true,
      },
      {
        label: "What must be true",
        value: input.assumption,
        required: false,
      },
      {
        label: "What supports the reason",
        value: input.evidence,
        required: false,
      },
      {
        label: "Where the evidence came from",
        value: input.sourceUrl,
        required: false,
      },
    ],
    [input],
  );

  function update(
    key: keyof CustomDecisionInput,
    value: string,
  ) {
    setInput((current) => ({
      ...current,
      [key]: value,
    }));
    setError(null);
  }

  function next() {
    if (step === 1 && !canLeaveStep1) {
      setError(
        "Tell Groundline what you are deciding and what you currently think.",
      );
      return;
    }

    if (step === 2 && !canLeaveStep2) {
      setError(
        "Add at least one main reason. It can be rough.",
      );
      return;
    }

    if (step === 3 && sourceWithoutEvidence) {
      setError(
        "Tell Groundline what the source supports before adding its URL.",
      );
      return;
    }

    setError(null);
    setStep((current) => Math.min(4, current + 1));
  }

  function submit() {
    try {
      onSubmit({
        question: input.question.trim(),
        conclusion: input.conclusion.trim(),
        reason: input.reason.trim(),
        assumption: input.assumption?.trim(),
        evidence: input.evidence?.trim(),
        sourceUrl: input.sourceUrl?.trim(),
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Groundline could not create the workspace.",
      );
    }
  }

  return (
    <section className="intake-shell">
      <div className="intake-heading intake-heading--with-exit">
        <button
          type="button"
          className="focus-text-action"
          onClick={onCancel}
        >
          ← Back
        </button>

        <div>
          <p className="eyebrow">
            Build your reasoning
          </p>
          <h2>
            Answer normal questions. Groundline
            handles the structure.
          </h2>
          <p>
            Required: your decision, your current
            answer, and one reason. Everything else
            can be added later.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button intake-exit-button"
          onClick={onExitHome}
        >
          Exit workspace
        </button>
      </div>

      <ol className="intake-progress">
        {[
          ["Decision", 1],
          ["Reason", 2],
          ["Evidence", 3],
          ["Review", 4],
        ].map(([label, number]) => (
          <li
            key={String(label)}
            className={
              step === number
                ? "is-current"
                : step > Number(number)
                  ? "is-complete"
                  : ""
            }
          >
            <span>{number}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      <div className="intake-card">
        {step === 1 ? (
          <>
            <p className="eyebrow">
              Step 1 · The decision
            </p>
            <h3>
              What are you trying to decide?
            </h3>

            <label className="intake-field">
              <span>The question</span>
              <textarea
                rows={3}
                value={input.question}
                onChange={(event) =>
                  update(
                    "question",
                    event.target.value,
                  )
                }
                placeholder="Example: Should our team switch to a four-day workweek?"
              />
              <small>
                Write the real question you are
                trying to answer.
              </small>
            </label>

            <label className="intake-field">
              <span>
                What do you currently think the
                answer is?
              </span>
              <textarea
                rows={3}
                value={input.conclusion}
                onChange={(event) =>
                  update(
                    "conclusion",
                    event.target.value,
                  )
                }
                placeholder="Example: I think we should try a four-day workweek."
              />
              <small>
                This is your current position, not a
                final truth.
              </small>
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="eyebrow">
              Step 2 · Why
            </p>
            <h3>
              Why do you currently believe that?
            </h3>

            <label className="intake-field">
              <span>Your main reason</span>
              <textarea
                rows={3}
                value={input.reason}
                onChange={(event) =>
                  update(
                    "reason",
                    event.target.value,
                  )
                }
                placeholder="Example: Productivity could stay the same while burnout falls."
              />
              <small>
                Start with the single reason that
                matters most.
              </small>
            </label>

            <label className="intake-field">
              <span>
                What has to be true for that reason
                to hold?
                <em> Optional</em>
              </span>
              <textarea
                rows={3}
                value={input.assumption}
                onChange={(event) =>
                  update(
                    "assumption",
                    event.target.value,
                  )
                }
                placeholder="Example: The team can reorganize work without increasing overtime."
              />
              <small>
                If you are not sure, leave it blank.
                Groundline will flag the gap later.
              </small>
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="eyebrow">
              Step 3 · What supports it
            </p>
            <h3>
              What makes you think your main reason
              is true?
            </h3>

            <label className="intake-field">
              <span>
                Evidence
                <em> Optional</em>
              </span>
              <textarea
                rows={4}
                value={input.evidence}
                onChange={(event) =>
                  update(
                    "evidence",
                    event.target.value,
                  )
                }
                placeholder="Example: A pilot team delivered the same output with fewer reported burnout symptoms."
              />
              <small>
                A study, measurement, observation,
                document, or concrete example all
                count as something to inspect.
              </small>
            </label>

            <label className="intake-field">
              <span>
                Source URL
                <em> Optional</em>
              </span>
              <input
                type="url"
                value={input.sourceUrl}
                onChange={(event) =>
                  update(
                    "sourceUrl",
                    event.target.value,
                  )
                }
                placeholder="https://..."
              />
              <small>
                No source yet? Leave it blank. Do not
                invent one just to satisfy the form.
              </small>
            </label>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="eyebrow">
              Step 4 · Check what Groundline heard
            </p>
            <h3>
              This is what will go into your
              workspace.
            </h3>

            <div className="intake-review-list">
              {reviewRows.map((row) => (
                <article key={row.label}>
                  <span>{row.label}</span>
                  <p>
                    {row.value?.trim() ||
                      (row.required
                        ? "Missing"
                        : "Not added yet")}
                  </p>
                </article>
              ))}
            </div>

            <p className="intake-review-note">
              Groundline will connect these pieces
              behind the scenes. You do not need to
              place cards on the graph yourself.
            </p>
          </>
        ) : null}

        {error ? (
          <p
            className="intake-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="intake-actions">
          {step > 1 ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setStep((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              Back
            </button>
          ) : null}

          {step < 4 ? (
            <button
              type="button"
              className="focus-primary-action"
              onClick={next}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="focus-primary-action"
              onClick={submit}
            >
              Create my reasoning workspace
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
