import { createServer } from "node:http";
import { expect, it, vi } from "vitest";
import { board, FakeDeepSeek, play, scriptedDeepSeek, setupOneshotTests } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

// Fail immediately if a consumer falls back to an actual listening socket.
vi.mock("node:http", async (original) => ({ ...await original<object>(), createServer: vi.fn(() => {
  throw new Error("question consumer fixtures must not open sockets");
}) }));
setupOneshotTests();

it("runs a serialized historical question and action without listening sockets", async () => {
  const deepseek = new FakeDeepSeek((options) => Object.keys(options)[0]!);
  const { actions, records } = await play([board("xljq-f5-reward", "reward"), mainMenuPayload()], deepseek);
  expect(deepseek.calls).toHaveLength(1);
  expect(actions).toHaveLength(1);
  expect(actions[0]?.["action"]).toBe("choose_reward_card");
  expect(records.find((row) => row["label"] === "reward/card")).toMatchObject({ decider: "deepseek", result: expect.stringMatching(/^completed:/) });
  expect(createServer).not.toHaveBeenCalled();
});

it("keeps the real chat client JSON parsing and Chinese reasoning without a socket", async () => {
  const { client, bodies } = await scriptedDeepSeek([{ content: '{"choice":"o0","reason":"固定回执"}', reasoning: "Decisive: o0." }]);
  const answer = await client.choose({}, "fixed", { o0: "first", o1: "second" });
  expect(answer).toMatchObject({ choice: "o0", reason: "固定回执", inputTokens: 100, outputTokens: 10 });
  expect(bodies).toHaveLength(1);
  expect(createServer).not.toHaveBeenCalled();
});
