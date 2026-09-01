export interface ModelContextLike {
  registerTool?: (definition: unknown) => unknown;
}

export function getModelContext(): ModelContextLike | null {
  const documentWithModelContext = document as Document & {
    modelContext?: ModelContextLike;
  };

  return documentWithModelContext.modelContext ?? null;
}

export function hasWebMCP(): boolean {
  return Boolean(getModelContext()?.registerTool);
}
