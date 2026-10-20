export function defaultTempParent(): string;
export function cleanupTempScope(directory: string | null | undefined, token: string | null | undefined): void;
export function createTempScope(env?: NodeJS.ProcessEnv, parent?: string): {
  directory: string | null;
  token: string | null;
  env: NodeJS.ProcessEnv;
  cleanup(): void;
};
