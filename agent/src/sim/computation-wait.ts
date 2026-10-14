/** Progress callbacks also work inside B2's synchronous worker polling loop. */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type SimProgress = (done: number, requested: number) => void;
export interface SimWait {
  start(context: { run: string; floor: number | null; label: string }): { progress: SimProgress; finish(): void };
}

export function fileSimWait(path: string, note: (text: string) => void, now = Date.now): SimWait {
  return { start(context) {
    const started = now();
    let emitted = started;
    let previous = 0;
    let done = 0;
    let requested = 0;
    let lastProgress = emitted;
    const write = (active: boolean) => {
      const ts = now();
      const row = { ts: new Date(ts).toISOString(), ...context, pid: process.pid, active,
        samples_done: done, requested, previous_samples: previous, elapsed_ms: ts - started,
        progress_ts: new Date(lastProgress).toISOString(), unit: "sample-outcomes" };
      try {
        mkdirSync(dirname(path), { recursive: true });
        const temp = `${path}.${process.pid}.tmp`;
        writeFileSync(temp, JSON.stringify(row) + "\n");
        renameSync(temp, path);
      } catch (error) { note(`simulation heartbeat write failed: ${String(error)}`); }
      if (active) note(`required simulation ${context.label}: ${done}/${requested} sample outcomes, ${Math.round((ts - started) / 1000)} s`);
      emitted = ts;
      previous = done;
    };
    // Inactive until a real progress callback; an old computation cannot keep a new one alive.
    write(false);
    return {
      progress(count, total) {
        if (total !== requested || count < done) { previous = 0; done = 0; }
        if (count > done) lastProgress = now();
        done = count;
        requested = total;
        if (now() - emitted >= 60_000) write(true);
      },
      finish() { write(false); },
    };
  } };
}
