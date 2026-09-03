export interface WebMCPToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: any,
    client?: {
      signal?: AbortSignal;
    },
  ) => unknown | Promise<unknown>;
}

export interface ModelContextLike {
  registerTool?: (
    definition: WebMCPToolDefinition,
    options?: {
      signal?: AbortSignal;
    },
  ) => unknown | Promise<unknown>;
}

export function getModelContext(): ModelContextLike | null {
  const documentWithModelContext =
    document as Document & {
      modelContext?: ModelContextLike;
    };

  return (
    documentWithModelContext.modelContext ??
    null
  );
}

export function hasWebMCP(): boolean {
  return Boolean(
    getModelContext()?.registerTool,
  );
}
