import { closeSync, fsyncSync, ftruncateSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { ACTIONS, REQUEST_ID, validateRequest, type OpsPaths } from "./lib.js";

export interface BrokerResult { code: number; out: string }
export type BrokerAction = (root: string, action: string, args: string[], ms: number) => Promise<BrokerResult>;

// runAction caps output at 64 KiB. Reserve room for JSON escaping before executing any action.
const RESPONSE_RESERVE = 1024 * 1024;

/** Retain claimed requests and completed results until their atomic response is durable. */
export function durableBroker(p: OpsPaths, root: string, onLog: (text: string) => void, run: BrokerAction): () => Promise<void> {
  mkdirSync(p.broker, { recursive: true });
  let busy: Promise<void> = Promise.resolve();
  let stopped = false;
  const queued = new Set<string>();
  const pending = new Map<string, BrokerResult>();
  const log = (message: string): void => { try { onLog(message); } catch { /* Logging cannot poison the queue. */ } };
  const failureCode = (error: unknown): string => {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    return typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "io_error";
  };
  const reserve = (id: string): void => {
    const fd = openSync(join(p.broker, `${id}.res.tmp`), "wx");
    try {
      writeFileSync(fd, Buffer.alloc(RESPONSE_RESERVE));
      fsyncSync(fd);
    } finally { closeSync(fd); }
  };
  const answer = (id: string, body: BrokerResult): boolean => {
    const tmp = join(p.broker, `${id}.res.tmp`);
    try {
      const payload = Buffer.from(JSON.stringify(body));
      let fd: number;
      try { fd = openSync(tmp, "r+"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        fd = openSync(tmp, "wx");
      }
      try {
        let written = 0;
        while (written < payload.length) {
          const count = writeSync(fd, payload, written, payload.length - written, written);
          if (count === 0) throw new Error("response write made no progress");
          written += count;
        }
        ftruncateSync(fd, payload.length);
        fsyncSync(fd);
      } finally { closeSync(fd); }
      renameSync(tmp, join(p.broker, `${id}.res`));
      pending.delete(id);
      try { rmSync(join(p.broker, `${id}.run`)); }
      catch (error) { log(`broker ${id} response saved; claimed request cleanup failed (${failureCode(error)})`); }
      return true;
    } catch (error) {
      log(`broker ${id} response persistence failed (${failureCode(error)}); claimed request and temporary result retained; action will not be repeated`);
      return false;
    }
  };
  const handle = async (id: string): Promise<void> => {
    const claimed = join(p.broker, `${id}.run`);
    try { renameSync(join(p.broker, `${id}.req`), claimed); }
    catch { return; }
    let result: BrokerResult;
    try {
      reserve(id);
    } catch (error) {
      log(`broker ${id} capacity preflight failed (${failureCode(error)}); action not started`);
      // The claim remains visible even when no space is available for a failure response.
      result = { code: 1, out: "broker 回执容量预检失败，动作未执行；保留请求，容量恢复后仅补写此失败回执。\n" };
      pending.set(id, result);
      answer(id, result);
      return;
    }
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(claimed, "utf8")); }
    catch { raw = undefined; }
    const request = validateRequest(raw);
    if (!request.ok) {
      log(`broker refused ${id}: ${request.error}`);
      result = { code: 2, out: `拒绝：${request.error}\n` };
    } else {
      log(`broker ${request.action} ${request.args.join(" ")}`.trim());
      try { result = await run(root, request.action, request.args, ACTIONS[request.action]!.ms); }
      catch (error) {
        log(`broker ${id} action runner failed (${failureCode(error)}); outcome unknown, no automatic replay`);
        result = { code: 1, out: "broker 动作执行器异常，结果未知；保留请求供核实，不自动重跑。\n" };
      }
      log(`broker ${request.action} exit ${result.code}`);
    }
    pending.set(id, result);
    answer(id, result);
  };
  const poll = (): void => {
    if (stopped) return;
    // Retrying persistence never invokes the action again.
    for (const [id, result] of pending) answer(id, result);
    let names: string[];
    try { names = readdirSync(p.broker); }
    catch { return; }
    for (const name of names.sort()) {
      const id = name.endsWith(".req") ? name.slice(0, -4) : "";
      if (!REQUEST_ID.test(id) || queued.has(id)) continue;
      queued.add(id);
      busy = busy.then(() => handle(id)).catch((error) => {
        log(`broker ${id} failed (${failureCode(error)}); retained files require inspection, no automatic replay`);
      }).finally(() => queued.delete(id));
    }
  };
  const timer = setInterval(poll, 500);
  return async () => {
    stopped = true;
    clearInterval(timer);
    await busy;
    for (const [id, result] of pending) answer(id, result);
    if (pending.size) throw new Error(`broker stopped with ${pending.size} unpersisted response(s); inspect retained .run/.res.tmp files`);
  };
}
