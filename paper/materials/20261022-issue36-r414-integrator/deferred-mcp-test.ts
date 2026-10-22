it("observes MCP tool start before its return and includes errors without altering the original record", async () => {
  const seen: BrainLiveEvent[] = [];
  const mcp = new KnowledgeMcp();
  try {
    let release!: () => void; const ready = new Promise<void>((done) => { release = done; });
    const host = mcp.begin([{ name: "kb_fixed", description: "fixed", inputSchema: {}, run: async () => { await ready; throw new Error("fixed failure"); } }],
      { ascension: 0, knowledgeDir: "", logsDir: "" }, 3, Infinity, () => {}, (e) => seen.push(e));
    const running = host.call("kb_fixed", { query: "fixture" });
    expect(seen.map(e => e.kind)).toEqual(["tool-start"]);
    release(); expect((await running).isError).toBe(true);
    expect(seen.map(e => e.kind)).toEqual(["tool-start", "tool-end"]);
    expect(host.calls[0]!.output).toContain("fixed failure");
  } finally { await mcp.close(); }
});
