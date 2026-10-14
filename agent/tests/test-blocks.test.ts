import { describe, expect, it } from "vitest";
import { testBlocks } from "../tools/test-blocks.js";

describe("logged-board timeout inspection", () => {
  it("reads nested controlled-clock wrappers and parameterized calls without merging test boundaries", () => {
    const blocks = testBlocks(`
      it("wrapped full scan", () => withClock(() => {
        for (const board of BOARDS) plan(board);
      }), 120_000);
      it.each(BOARDS)("board %s", (name) => outer(inner(() => {
        plan(name); // }), 1); is only a comment
        const text = "}, 2);";
      })), 30_000);
      it.each\`name
        \${"fixed"}
      \`("tagged $name", ({ name }) => { logged(name); }, 30_000);
    `);
    expect(blocks.map(({ title, timeout }) => ({ title, timeout }))).toEqual([
      { title: "wrapped full scan", timeout: 120_000 },
      { title: "board %s", timeout: 30_000 },
      { title: "tagged $name", timeout: 30_000 },
    ]);
    expect(blocks[0]!.body).toContain("BOARDS");
    expect(blocks[0]!.body).not.toContain("board %s");
    expect(blocks[1]!.body).not.toContain("tagged $name");
    expect(blocks[1]!.body).not.toContain("BOARDS");
  });

  it("keeps truly missing or nonliteral timeouts unknown and preserves short-timeout values", () => {
    const blocks = testBlocks(`
      it("missing", () => withClock(() => { plan("fixed"); }));
      it.each([1])("missing each", () => { logged("fixed"); });
      it("short", () => { plan("fixed"); }, 5_000);
      it("dynamic", () => { plan("fixed"); }, LIMIT);
      it("next", () => { logged("fixed"); }, 30_000);
    `);
    expect(blocks.map(({ timeout }) => timeout)).toEqual([null, null, 5_000, null, 30_000]);
    expect(blocks[0]!.body).not.toContain("missing each");
    expect(blocks[1]!.body).not.toContain("short");
  });
});
