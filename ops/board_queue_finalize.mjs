// The actual Vitest process retains the worker/request/slot and full-check locks.
import fs from 'node:fs';
import './board_queue_leases.mjs';

const file = process.env.STS2_BOARD_CHECK_CONTEXT;
const context = JSON.parse(fs.readFileSync(file, 'utf8'));
if (process.pid === context.worker.pid) {
  context.full_runs = 1;
  context.started_full_at = Date.now() / 1000;
  context.commands.push({ name: 'full', pid: process.pid, start: context.worker.start,
    argv: process.argv, cwd: process.cwd(), started_at: context.started_full_at });
  fs.writeFileSync(`${file}.starting`, `${JSON.stringify(context)}\n`);
  fs.renameSync(`${file}.starting`, file);
  // Children forward leases but do not install the parent terminal callback.
  for (let i = process.execArgv.length - 2; i >= 0; i--) {
    if (process.execArgv[i] === '--import' && process.execArgv[i + 1] === import.meta.filename)
      process.execArgv[i + 1] = new URL('./board_queue_leases.mjs', import.meta.url).pathname;
  }
  const leases = process.env.MAS_QUEUE_LEASE_FDS.split(',').map(Number);
  const descriptors = [...leases, context.full_lock_fd,
    ...(context.custody ? [context.custody.k_fd, context.custody.life_fd] : [])];
  for (const fd of descriptors) fs.fstatSync(fd);
  if (typeof process.execve !== 'function') throw Error('installed Node must support execve for lease-preserving finalization');
  process.on('exit', code => {
    // Replace this PID instead of starting an asynchronous child during exit.
    // The same kernel leases remain open, with no resident Node wrapper.
    process.execve(context.tools.python.path, [context.tools.python.path, '-B',
      `${context.job.root}/ops/board_queue_checks.py`, '--finalize', file, '--exit-code', String(code)], process.env);
  });
}
