// Read the deployed definitions through a separate local MCP; never contact the running controller.
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = '/home/dw/Projects/agent-sts2/.worktrees/live';
const output = dirname(fileURLToPath(import.meta.url));
const load = path => import(pathToFileURL(join(root, path)).href);
const { buildKnowledgeTools } = await load('agent/src/brain/tools/agent-knowledge.ts');
const { KnowledgeMcp } = await load('agent/src/brain/tools/knowledge-mcp.ts');
const { setKnowledgeCharacter } = await load('agent/src/knowledge/files.ts');
setKnowledgeCharacter('silent');
const ctx = { ascension: 10, knowledgeDir: join(root, 'knowledge'), logsDir: '', label: 'reward/card' };
const defs = buildKnowledgeTools(ctx);
const mcp = new KnowledgeMcp();
const host = mcp.begin(defs, ctx, 8, Infinity, () => {});
try {
  const url = await mcp.start();
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) });
  if (!response.ok) throw new Error('isolated tools/list failed');
  const listed = await response.json();
  const tools = listed.result.tools;
  if (tools.length !== 14 || tools.filter(t => t.name.startsWith('external_stats_')).length !== 6 || host.calls.length) {
    throw new Error('unexpected deployed tool list');
  }
  const data = readFileSync(join(root, 'knowledge/external/sts2fun/silent-a10.json'));
  writeFileSync(join(output, 'mcp-list.json'), JSON.stringify({
    observed_at: new Date().toISOString(), isolated_loopback: true, production_endpoint_contacted: false,
    model_or_game_calls: 0, tools_call_requests: host.calls.length, tools,
    dataset_bytes: data.length, dataset_sha256: createHash('sha256').update(data).digest('hex'),
  }, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ tools: tools.length, external: 6, tool_calls: host.calls.length }) + '\n');
} finally { await mcp.close(); }
