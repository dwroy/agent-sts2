// Forward the inherited leases through the check runner's Node spawn/fork APIs.
// This module has no effects outside a queue check environment.
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';

const raw = process.env.MAS_QUEUE_LEASE_FDS;
const contextPath = process.env.STS2_BOARD_CHECK_CONTEXT;
if (raw && contextPath) {
  const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  const descriptors = [...raw.split(',').map(Number), context.full_lock_fd,
    ...(context.custody ? [context.custody.k_fd, context.custody.life_fd] : [])];
  for (const fd of descriptors) fs.fstatSync(fd);
  if (context.custody) {
    // EOF is broadcast by the kernel to all inheritors when the keeper exits.
    // It must terminate the original full instead of leaving checking suspended.
    if (!fs.fstatSync(context.custody.life_fd).isFIFO()) throw Error('custody lifeline must be a kernel pipe');
    // libuv makes a wrapped descriptor close-on-exec. Monitor a separate read
    // end so the original inheritable capability survives finalizer execve.
    const monitor = fs.openSync(`/proc/self/fd/${context.custody.life_fd}`, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    const lifeline = new net.Socket({ fd: monitor, readable: true, writable: false });
    lifeline.on('end', () => process.exit(75));
    lifeline.on('error', () => process.exit(75));
    lifeline.resume();
    lifeline.unref();
  }
  function record(child, api) {
    if (!context.job_path || !child?.pid) return child;
    const directory = path.join(path.dirname(context.job_path), 'check-children');
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${process.pid}-${child.pid}-${process.hrtime.bigint()}.json`);
    const row = { schema: 'sts2-check-child-v1', job_path: context.job_path, candidate: context.job.candidate,
      pid: child.pid, ppid: process.pid, boot_id: context.worker.boot_id,
      api, finished: api === 'spawnSync', started_at: Date.now() / 1000,
      inherited_fd_inodes: descriptors.map(fd => fs.fstatSync(fd).ino) };
    try {
      row.start = fs.readFileSync(`/proc/${child.pid}/stat`, 'utf8').split(')').at(-1).trim().split(/\s+/)[19];
      row.observed_fd_inodes = descriptors.map(fd => {
        try { return fs.statSync(`/proc/${child.pid}/fd/${fd}`).ino; } catch { return null; }
      });
    } catch { row.start = null; }
    const save = () => { fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(row)}\n`); fs.renameSync(`${file}.tmp`, file); };
    if (row.finished) { row.exit_code = child.status; row.signal = child.signal; }
    save();
    if (!row.finished) child.once('exit', (code, signal) => {
      row.finished = true; row.exit_code = code; row.signal = signal; row.ended_at = Date.now() / 1000; save();
    });
    return child;
  }
  function options(value, fork = false) {
    const result = { ...value };
    const original = result.stdio;
    const stdio = Array.isArray(original) ? [...original]
      : Array(3).fill(original || (fork && !result.silent ? 'inherit' : 'pipe'));
    if (fork && !stdio.includes('ipc')) stdio.push('ipc');
    for (let fd = stdio.length; fd <= Math.max(...descriptors); fd++) stdio[fd] = 'ignore';
    for (const fd of descriptors) {
      if (stdio[fd] !== 'ignore' && stdio[fd] !== undefined && stdio[fd] !== fd) {
        throw Error('child stdio conflicts with a queue lease descriptor');
      }
      stdio[fd] = fd;
    }
    result.stdio = stdio;
    return result;
  }
  for (const name of ['spawn', 'spawnSync', 'fork']) {
    const original = childProcess[name];
    childProcess[name] = function (command, args, value) {
      const child = Array.isArray(args)
        ? original(command, args, options(value, name === 'fork'))
        : original(command, options(args, name === 'fork'));
      return record(child, name);
    };
  }
  syncBuiltinESMExports();
}
