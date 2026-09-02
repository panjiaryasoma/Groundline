import { useEffect } from "react";
import { registerGroundlineTools } from "./registerTools";

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export function useGroundlineWebMCP(): void {
  useEffect(() => {
    let disposed = false;
    let retryTimer:
      | number
      | undefined;
    const controller =
      new AbortController();

    const scheduleRetry = (
      attempt: number,
    ) => {
      if (
        disposed ||
        controller.signal.aborted ||
        attempt >= 20
      ) {
        return;
      }

      retryTimer =
        window.setTimeout(
          () =>
            void tryRegister(
              attempt + 1,
            ),
          250,
        );
    };

    const tryRegister = async (
      attempt = 0,
    ) => {
      if (
        disposed ||
        controller.signal.aborted
      ) {
        return;
      }

      try {
        const result =
          await registerGroundlineTools(
            controller.signal,
          );

        if (!result.webmcpAvailable) {
          scheduleRetry(attempt);
        }
      } catch (error) {
        if (
          disposed ||
          controller.signal.aborted ||
          isAbortError(error)
        ) {
          return;
        }

        console.error(
          "[Groundline WebMCP] tool registration failed",
          error,
        );

        scheduleRetry(attempt);
      }
    };

    void tryRegister();

    return () => {
      disposed = true;
      controller.abort();

      if (retryTimer !== undefined) {
        window.clearTimeout(
          retryTimer,
        );
      }
    };
  }, []);
}
