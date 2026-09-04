import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const DEFAULT_HOLD_MS = 1200;

interface HumanDecisionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  children: ReactNode;
  onHumanConfirm: () => void;
  holdMs?: number;
}

export function HumanDecisionButton({
  children,
  onHumanConfirm,
  holdMs = DEFAULT_HOLD_MS,
  disabled,
  ...buttonProps
}: HumanDecisionButtonProps) {
  const timerRef = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);

  const cancel = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };

  const start = () => {
    if (disabled || timerRef.current !== null) return;

    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onHumanConfirm();
    }, holdMs);
  };

  useEffect(() => cancel, []);

  return (
    <button
      {...buttonProps}
      type="button"
      disabled={disabled}
      aria-description="Human-only decision control. Press and hold for confirmation. AI and browser agents must not operate this control."
      title="Human-only decision: hold to confirm"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onKeyDown={(event) => {
        if (event.repeat) return;
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          cancel();
        }
      }}
      onClick={(event) => {
        // A normal click is intentionally insufficient. Canonical authority
        // requires a deliberate hold gesture at the human-review boundary.
        event.preventDefault();
      }}
    >
      {holding ? "Keep holding to confirm…" : children}
    </button>
  );
}
