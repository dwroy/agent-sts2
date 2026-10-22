/** In-process, stateless Streamable HTTP MCP endpoint. One unguessable URL per engine instance. */
import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { ToolHost, handlePayload } from "./mcp-server.js";
import { validateInput } from "./validate.js";
import type { ToolContext, ToolDef } from "./types.js";

export class KnowledgeMcp {
  private server: Server | null = null;
  private host: ToolHost | null = null;
  private path = `/mcp/${randomBytes(24).toString("hex")}`;
  private cutoff = Infinity;
  private maximum = 0;
  private used = 0;
  private limited: ((reason: "calls" | "time") => void) | null = null;
  url = "";

  begin(tools: ToolDef[], context: ToolContext, maximum: number, cutoff: number, limited: (reason: "calls" | "time") => void): ToolHost {
    this.maximum = maximum; this.cutoff = cutoff; this.used = 0; this.limited = limited;
    const wrapped = tools.map((tool): ToolDef => ({ ...tool, run: async (input, ctx) => {
      if (this.used >= this.maximum || Date.now() >= this.cutoff) {
        const reason = this.used >= this.maximum ? "calls" : "time";
        // Let the MCP response reach the harness before its tool phase is interrupted.
        const limited = this.limited;
        setTimeout(() => limited?.(reason), 20).unref();
        return { text: "知识查询预算已用完。请根据已有状态与工具结果立即输出答案 JSON。", isError: true };
      }
      this.used += 1;
      const problems = validateInput(tool.inputSchema, input);
      if (problems.length) return { text: problems.join("; "), isError: true };
      try { return await tool.run(input, ctx); }
      finally { if (this.used >= this.maximum) { const limited = this.limited; setTimeout(() => limited?.("calls"), 20).unref(); } }
    } }));
    return this.host = new ToolHost(wrapped, context, undefined, true);
  }
  end(): void { this.host = null; this.limited = null; }

  async start(): Promise<string> {
    if (this.server) return this.url;
    const server = createServer(async (req, res) => {
      if (req.url !== this.path || req.headers.host !== `127.0.0.1:${(server.address() as { port: number }).port}`) { res.writeHead(404).end(); return; }
      if (req.method === "DELETE") { res.writeHead(200).end(); return; }
      if (req.method !== "POST") { res.writeHead(405).end(); return; }
      let raw = "";
      try {
        for await (const chunk of req) {
          raw += chunk.toString();
          if (Buffer.byteLength(raw) > 64_000) { res.writeHead(413).end(); return; }
        }
        const host = this.host ?? new ToolHost([], { ascension: 0, knowledgeDir: "", logsDir: "" });
        const response = await handlePayload(host, JSON.parse(raw));
        if (response === null) res.writeHead(202).end();
        else { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(response)); }
      } catch { res.writeHead(400).end(); }
    });
    server.requestTimeout = 10_000;
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    server.unref(); this.server = server;
    this.url = `http://127.0.0.1:${(server.address() as { port: number }).port}${this.path}`;
    return this.url;
  }
  async close(): Promise<void> { this.end(); const server = this.server; this.server = null; server?.closeAllConnections(); if (server) await new Promise<void>(resolve => server.close(() => resolve())); }
}
