/** Production data moved out of Git; legacy unit tests retain one immutable baseline. */
import { expect, vi } from 'vitest';
vi.mock('../src/core/paths.js', async () => {
 const original = await vi.importActual<typeof import('../src/core/paths.js')>('../src/core/paths.js');
 // Historical replay files already define their own FS namespace and golden
 // data. Preserve the paths those mocks intercept; never replace their facts
 // with the general fixture. Read the test source via the native FS to avoid
 // initializing a mock factory which itself imports core/paths.
 const file = expect.getState().testPath;
 if (file) {
  const fs = await vi.importActual<typeof import('node:fs')>('node:fs');
  const source = fs.readFileSync(file, 'utf8');
  if (/vi\.(?:mock|doMock)\(\s*["']node:fs["']/.test(source)) return original;
 }
 const directory = process.env['STS2_TEST_KNOWLEDGE_ROOT'];
 if (!directory) throw Error('fixed knowledge test namespace was not prepared');
 return { ...original, KNOWLEDGE_DIR: directory };
});
