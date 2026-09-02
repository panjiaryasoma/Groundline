import { useEffect } from "react";
import { registerGroundlineTools } from "./registerTools";

export function useGroundlineWebMCP(): void {
  useEffect(() => {
    let disposed = false;
    let retryTimer:
      | number
      | undefined;
    const controller =
      new AbortController();

    const tryRegister = async (
      attempt = 0,
    ) => {
      if (disposed) return;

      const result =
        await registerGroundlineTools(
          controller.signal,
        );

      if (
        !result.webmcpAvailable &&
        attempt < 20
      ) {
        retryTimer =
          window.setTimeout(
            () =>
              void tryRegister(
                attempt + 1,
              ),
            250,
          );
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
