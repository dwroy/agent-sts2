// Local plain-HTTP relay to https://api.deepseek.com/anthropic (for the C-relay latency check): dsh talks to
// 127.0.0.1 over HTTP, the relay forwards with Node fetch and passes the (decoded) SSE stream through as it
// arrives. Logs one line per request (timings only; no bodies, no keys). Stop it with kill.
import http from "node:http";
const port = Number(process.argv[2] ?? "18766");
http.createServer(async (req, res) => {
  const start = Date.now();
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = { ...req.headers };
  delete headers.host; delete headers["content-length"];
  try {
    const up = await fetch(`https://api.deepseek.com/anthropic${req.url}`, { method: req.method, headers, body: Buffer.concat(chunks) });
    res.writeHead(up.status, Object.fromEntries([...up.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k))));
    const reader = up.body.getReader(); let first = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; first ||= Date.now() - start; res.write(value); }
    res.end();
    console.log(`${new Date().toISOString()} ${req.url} ${up.status} first-byte ${first} ms end ${Date.now() - start} ms`);
  } catch (error) {
    console.log(`${new Date().toISOString()} ${req.url} relay error ${error.message}`);
    res.writeHead(502); res.end();
  }
}).listen(port, "127.0.0.1", () => console.log(`relay on ${port}`));
