// Local timing proxy for probe-c: forwards /v1/messages to https://api.deepseek.com/anthropic and logs, per
// request, when it arrived, when upstream answered, and when each upstream chunk was relayed. No bodies logged.
import http from "node:http";
const t0 = Date.now();
const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = { ...req.headers };
  delete headers.host; delete headers["content-length"];
  const up = await fetch(`https://api.deepseek.com/anthropic${req.url}`, { method: req.method, headers, body });
  console.log("headers:", JSON.stringify(Object.fromEntries(Object.entries(req.headers).filter(([k]) => !["x-api-key", "authorization", "x-dsh-auth-token"].includes(k)))));
  console.log(`req ${req.url} body ${body.length}B at +${start - t0}ms; upstream status ${up.status} after ${Date.now() - start}ms`);
  res.writeHead(up.status, Object.fromEntries([...up.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k))));
  const reader = up.body.getReader(); let n = 0; const marks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; n += 1; const text = Buffer.from(value).toString("utf8"); const ev = [...text.matchAll(/event: (\w+)/g)].map((m) => m[1]); if (n <= 3 || ev.includes("content_block_delta") && !marks.some((m) => m.startsWith("delta"))) marks.push(`${ev[0] ?? "data"}@${Date.now() - start}`); res.write(value); }
  res.end();
  console.log(`  relayed ${n} chunks; marks ${marks.join(" ")}; end +${Date.now() - start}ms`);
});
server.listen(18765, "127.0.0.1", () => console.log("proxy on 18765"));
setTimeout(() => process.exit(0), 150000);
