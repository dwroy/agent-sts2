import { expect, it } from "vitest";
import { expectCodexStall } from "./codex-stall-fixture.js";

it("checks delayed first-token and last-event times exactly without assuming process startup at zero", () => {
  const trace = {
    stall_ms: 1000, ttft_ms: 1120,
    events: [{ type: "thread.started", t: 1080 }, { type: "turn.started", t: 1090 }],
    stall: "no stream event for 1 s after the first token at 1 s (last: turn.started at 1 s)",
  };
  expectCodexStall(trace, 1000);
  // A wrong reported timestamp, event or timeout must still fail the original contract.
  expect(() => expectCodexStall({ ...trace, stall: trace.stall.replace("token at 1 s", "token at 0 s") }, 1000)).toThrow();
  expect(() => expectCodexStall({ ...trace, stall: trace.stall.replace("started at 1 s", "started at 0 s") }, 1000)).toThrow();
  expect(() => expectCodexStall({ ...trace, events: [{ type: "item.completed", t: 1090 }] }, 1000)).toThrow();
  expect(() => expectCodexStall(trace, 1500)).toThrow();
  expectCodexStall({ ...trace, ttft_ms: 10, events: [{ type: "turn.started", t: 20 }],
    stall: "no stream event for 1 s after the first token at 0 s (last: turn.started at 0 s)" }, 1000);
});
