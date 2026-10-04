/** Question-shape limits: the API caps a Choice at 255 options, so we must never build more. */

import { describe, expect, it } from "vitest";

import { MAX_CHOICE_OPTIONS, choiceQ, noulQ, scoreQ } from "../src/reflex/jev/questions.js";

const options = (count: number): Record<string, string | null> =>
  Object.fromEntries(Array.from({ length: count }, (_, index) => [`o${index}`, null]));

describe("choiceQ", () => {
  it("accepts a normal option set", () => {
    expect(Object.keys(choiceQ("pick one", options(19)).criteria)).toHaveLength(19);
  });

  it("accepts exactly the documented maximum", () => {
    expect(Object.keys(choiceQ("pick one", options(MAX_CHOICE_OPTIONS)).criteria)).toHaveLength(MAX_CHOICE_OPTIONS);
  });

  it("refuses one option more than the maximum", () => {
    expect(() => choiceQ("pick one", options(MAX_CHOICE_OPTIONS + 1))).toThrow(/above the 255 limit/);
  });

  it("refuses an empty option set", () => {
    expect(() => choiceQ("pick one", {})).toThrow(/no options/);
  });
});

describe("other question types", () => {
  it("builds a noul with optional criteria", () => {
    expect(noulQ("is it worth it?").criteria).toBeUndefined();
    expect(noulQ("is it worth it?", { true: "yes", false: "no" }).criteria).toEqual({ true: "yes", false: "no" });
  });

  it("requires at least two score levels", () => {
    expect(() => scoreQ("how bad?", ["only one"])).toThrow(/at least two levels/);
    expect(scoreQ("how bad?", ["fine", "bad"]).criteria).toHaveLength(2);
  });
});
