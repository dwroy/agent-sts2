import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";

it("confines startup checks to a fixed, argument-free Regent action", () => {
  expect(validateRequest({action:"regent-startup-check",args:[]}).ok).toBe(true);
  expect(validateRequest({action:"regent-startup-check",args:["8080"]}).ok).toBe(false);
  expect(execFileSync("python3",["-B","-m","unittest","discover","-s","../ops/tests","-p","test_regent_startup_check.py"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]})).toBe("");
  expect(validateRequest({action:"regent-native-repair",args:[]}).ok).toBe(true);
  expect(validateRequest({action:"regent-native-repair",args:["34676"]}).ok).toBe(false);
  expect(execFileSync("python3",["-B","-m","unittest","discover","-s","../ops/tests","-p","test_regent_native_repair.py"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]})).toBe("");
});
