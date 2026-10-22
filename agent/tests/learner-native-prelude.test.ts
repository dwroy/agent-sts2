/** Fixed Codex 0.163 event order; no real credentials, panes, sessions or models. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NativeBatch } from "../../learner/lib/herdr.js";

const cwd = "/fixture/learner";
const marker = "[learner-batch:fixture]";
const prompt = `${marker}\n原始完整任务`;
const row = (type: string, payload: Record<string, unknown>) => ({ type, payload });
const context = (turn = "turn-1", dir = cwd) => row("turn_context", { turn_id: turn, cwd: dir, model: "gpt-6.1-sol", effort: "high" });
function prelude(dir = cwd) {
  return row("response_item", { type: "message", role: "user", content: [
    { type: "input_text", text: `# AGENTS.md instructions for ${dir}\n\n<INSTRUCTIONS>\n固定仓库说明。\n</INSTRUCTIONS>` },
    { type: "input_text", text: `<environment_context>\n  <cwd>${dir}</cwd>\n  <shell>bash</shell>\n</environment_context>` },
  ] });
}
function fixture() {
  const b = new NativeBatch(marker); b.expectPrompt(marker, prompt);
  const start = [row("session_meta", { id: "session", cwd }), row("event_msg", { type: "task_started", turn_id: "turn-1" })];
  return { b, start };
}
const user = (text = prompt) => row("response_item", { type: "message", role: "user", content: [{ type: "input_text", text }] });
const complete = row("event_msg", { type: "task_complete", turn_id: "turn-1", last_agent_message: "报告已保存" });

describe("native bootstrap before the dispatched prompt", () => {
  it("stages only the bootstrap, binds its context, then accepts the exact dispatched body", () => {
    const { b, start } = fixture(); start.forEach((r) => b.feed(r));
    const p = prelude(); b.feed(p);
    expect(b.accepted).toBe(false); expect(b.foreignActivity).toBe(false); expect(b.preludes).toEqual([]);
    b.feed(row("world_state", { full: true, state: {} })); b.feed(context());
    expect(b.accepted).toBe(false);
    const text = (p.payload.content as { text: string }[]).map((part) => part.text).join("\n");
    expect(b.preludes).toEqual([{ turn_id: "turn-1", cwd, sha256: createHash("sha256").update(text).digest("hex") }]);
    b.feed(user()); b.feed(complete);
    expect(b.successful()).toBe(true); expect(b.bindings).toHaveLength(1);
  });
  it.each(["unknown", "event-user", "wrong-cwd", "extra-part", "trailing-text", "duplicate", "after-context", "no-context", "wrong-turn", "changed-context-cwd", "tool-before-prompt"])(
    "rejects %s without clearing foreign activity on the later real marker", (kind) => {
      const { b, start } = fixture(); start.forEach((r) => b.feed(r));
      let p = prelude();
      if (kind === "unknown") p = user("Human request");
      if (kind === "event-user") p = row("event_msg", { type: "user_message", message: (p.payload.content as { text: string }[]).map((part) => part.text).join("\n") });
      if (kind === "wrong-cwd") p = prelude("/foreign");
      if (kind === "extra-part") (p.payload.content as unknown[]).push({ type: "input_text", text: "Human request" });
      if (kind === "trailing-text") (p.payload.content as { text: string }[])[1]!.text += "\nHuman request";
      if (kind === "after-context") b.feed(context());
      b.feed(p);
      if (kind === "tool-before-prompt") b.feed(row("response_item", { type: "function_call", name: "unexpected" }));
      if (kind === "duplicate") b.feed(prelude());
      if (kind !== "no-context") b.feed(context(kind === "wrong-turn" ? "human-turn" : "turn-1", kind === "changed-context-cwd" ? "/foreign" : cwd));
      b.feed(user()); b.feed(complete);
      expect(b.foreignActivity).toBe(true); expect(b.successful()).toBe(false);
    });
  it.each(["same-turn", "new-turn", "continuation"])("does not ignore prelude-shaped human input in %s", (kind) => {
    const { b, start } = fixture(); [...start, prelude(), context(), user(), complete].forEach((r) => b.feed(r));
    if (kind === "continuation") b.expectPrompt("retry", "retry\ncontinue");
    if (kind !== "same-turn") b.feed(row("event_msg", { type: "task_started", turn_id: "turn-2" }));
    b.feed(prelude());
    expect(b.foreignActivity).toBe(true); expect(b.successful()).toBe(false);
  });
  it("requires session metadata and a started turn before accepting bootstrap framing", () => {
    for (const include of ["session", "turn", "neither"]) {
      const { b, start } = fixture();
      if (include === "session") b.feed(start[0]!);
      if (include === "turn") b.feed(start[1]!);
      b.feed(prelude()); b.feed(user()); b.feed(complete);
      expect(b.foreignActivity).toBe(true); expect(b.successful()).toBe(false);
    }
  });
});
