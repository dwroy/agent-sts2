import { Worker } from 'node:worker_threads';
import { createWriteStream, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { getPriority } from 'node:os';
import { createHash } from 'node:crypto';
const scratch = '/home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration';
const compiled = scratch + '/published-compiled/backtest.mjs';
mkdirSync(scratch + '/published-results', { recursive: true });
const original = readFileSync(compiled);
if (/\b(?:isMainThread|parentPort)\b|process\.chdir\(/.test(original.toString())) throw new Error('unexpected thread-sensitive entry');
const limits = { maxYoungGenerationSizeMb: 128, maxOldGenerationSizeMb: 2048 };
const workers = [];
const tasks = [];
for (let shard = 0; shard < 4; shard += 1) {
  const argv = ['--character', 'silent', '--game-data', scratch + '/frozen-game-data.json',
    '--in', scratch + '/dataset/fights.jsonl', '--out-dir', scratch + '/published-results',
    '--samples', '200', '--starts', 't1,pre', '--no-rollout', '--shard', String(shard), '--shards', '4',
    '--keys', scratch + '/published-replay-keys.json'];
  const log = createWriteStream(scratch + `/published-thread-${shard}.log`);
  const worker = new Worker(new URL('file://' + compiled), { argv, resourceLimits: limits,
    env: { ...process.env, CHARACTER: 'silent', TMPDIR: scratch }, stdout: true, stderr: true });
  worker.stdout.pipe(log, { end: false }); worker.stderr.pipe(log, { end: false });
  workers.push({ shard, thread_id: worker.threadId, argv });
  tasks.push(new Promise(resolve => {
    worker.on('error', error => log.write(String(error.stack ?? error) + '\n'));
    worker.on('exit', code => { log.end(); resolve({ shard, code }); });
  }));
}
writeFileSync(scratch + '/published-thread-start.json', JSON.stringify({ started: new Date().toISOString(),
  pid: process.pid, nice: getPriority(), compiled_sha256: createHash('sha256').update(original).digest('hex'),
  resource_limits_per_thread: limits, workers,
  process_limit: 'One Python coordinator + one Node process; four independent V8 compute threads, no transpiler/pool child processes.',
  method: 'Byte-identical original compiled replay. Four-way index partition only; seed=1+full input index*101.' }, null, 2) + '\n');
const exits = await Promise.all(tasks);
writeFileSync(scratch + '/published-thread-exits.json', JSON.stringify({ ended: new Date().toISOString(), exits }, null, 2) + '\n');
if (exits.some(x => x.code !== 0)) process.exitCode = 1;
