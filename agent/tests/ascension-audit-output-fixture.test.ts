import { expect, it } from "vitest";
import { auditOutputFixture, type AuditExecutor } from "./ascension-audit-output-fixture.js";

it("shares one bounded Python launch across valid, rejected and concurrent report requests", async () => {
  const outputs = ['{"task":"ascension-audit"}', "null", "{broken"];
  let launches = 0;
  const execute: AuditExecutor = async (command, args, options) => {
    launches += 1;
    expect(command).toBe("nice");
    expect(options.timeout).toBe(5_000);
    expect(JSON.parse(args.at(-1)!)).toEqual(outputs);
    return { stdout: JSON.stringify([{ task: "ascension-audit" }, {}, {}]), stderr: "" };
  };
  const parse = auditOutputFixture(outputs, execute);
  expect(await Promise.all(outputs.map(parse))).toEqual([{ task: "ascension-audit" }, {}, {}]);
  expect(await parse(outputs[0]!)).toEqual({ task: "ascension-audit" });
  expect(launches).toBe(1);
  await expect(parse("unregistered")).rejects.toThrow("unregistered");
  expect(launches).toBe(1);
});

it("retains a failed child and rejects an incomplete batch without accepting printed data", async () => {
  const cause = Object.assign(new Error("fixed timeout"), { code: null, signal: "SIGTERM", killed: true,
    stdout: '[{"task":"ascension-audit"}]', stderr: "fixed child timeout" });
  const execute: AuditExecutor = async () => { throw cause; };
  await expect(auditOutputFixture(["fixed"], execute)("fixed")).rejects.toMatchObject({ cause,
    message: expect.stringContaining('"signal":"SIGTERM"') });
  await expect(auditOutputFixture(["fixed"], async () => ({ stdout: "[]", stderr: "" }))("fixed"))
    .rejects.toThrow("audit fixture failed");
});
