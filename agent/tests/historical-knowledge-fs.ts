/** Historical replays have no promoted shared lessons, regardless of current checkout data. */
export function historicalKnowledgeFs(fs: typeof import("node:fs")): typeof import("node:fs") {
  const shared = (path: unknown) => typeof path === "string" && /(?:^|[/\\])shared-experience\.json$/.test(path);
  return {
    ...fs,
    existsSync: (path) => shared(path) ? false : fs.existsSync(path),
    statSync: ((path: unknown, ...args: unknown[]) => {
      if (shared(path)) throw Object.assign(new Error("ENOENT: no shared lessons in historical fixture"), { code: "ENOENT" });
      return (fs.statSync as (...args: unknown[]) => unknown)(path, ...args);
    }) as typeof fs.statSync,
  };
}
