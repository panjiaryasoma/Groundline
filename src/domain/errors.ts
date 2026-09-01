export type GroundlineErrorCode =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "HUMAN_APPROVAL_REQUIRED"
  | "UNASSESSED"
  | "CYCLE_DETECTED_OR_BOUNDED"
  | "OUTPUT_TRUNCATED";

export class GroundlineError extends Error {
  constructor(
    public readonly code: GroundlineErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GroundlineError";
  }
}
