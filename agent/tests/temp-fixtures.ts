import { mkdtempSync as createDirectory, rmSync } from "node:fs";
import { afterAll } from "vitest";

const directories = new Set<string>();

// Some fixtures are allocated at module scope and shared across tests in the file.
afterAll(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
  directories.clear();
});

export function mkdtempSync(prefix: string): string {
  const directory = createDirectory(prefix);
  directories.add(directory);
  return directory;
}
