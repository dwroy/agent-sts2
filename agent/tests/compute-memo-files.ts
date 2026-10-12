import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Fixed historical inputs shared by the test thread and the real simulation workers. */
export function computeMemoFiles(): string {
  const dir = fs.mkdtempSync(join(tmpdir(), "compute-memo-"));
  const pinned = JSON.parse(fs.readFileSync(new URL("./boss-lines-data/pinned-knowledge.json", import.meta.url), "utf8")) as Record<string, unknown>;
  for (const [name, data] of Object.entries(pinned)) {
    const subdir = join(dir, name === "monster-db.json" || name === "move-model.json" ? "common" : "characters/ironclad");
    fs.mkdirSync(subdir, { recursive: true });
    fs.writeFileSync(join(subdir, name), JSON.stringify(data));
  }
  return dir;
}

/** Redirect only knowledge reads; all simulation code and worker messages remain real. */
export function fixedKnowledgeFs(original: typeof fs, root: string, fixture: string, reads?: Int32Array): typeof fs {
  const isLive = (path: unknown): path is string => typeof path === "string" && (path === root || path.startsWith(root + "/"));
  const redirect = (path: fs.PathLike | number) => {
    if (!isLive(path)) return path;
    if (reads) Atomics.add(reads, 0, 1);
    return fixture + path.slice(root.length);
  };
  const checked = (path: fs.PathLike | number) => {
    if (isLive(path)) throw new Error("compute-memo tests must not read live knowledge");
    return path;
  };
  return {
    ...original,
    readFileSync: ((path: fs.PathLike | number, ...args: unknown[]) => Reflect.apply(original.readFileSync, original, [checked(redirect(path)), ...args])) as typeof fs.readFileSync,
    existsSync: ((path: fs.PathLike) => original.existsSync(checked(redirect(path)) as fs.PathLike)) as typeof fs.existsSync,
    readdirSync: ((path: fs.PathLike, ...args: unknown[]) => Reflect.apply(original.readdirSync, original, [checked(redirect(path)), ...args])) as typeof fs.readdirSync,
  };
}
