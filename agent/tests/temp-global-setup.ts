import type { TestProject } from "vitest/node";
import { cleanupTempScope } from "../tools/temp-root.mjs";

export default function setup(project: TestProject) {
  const directory = project.config.env["STS2_TEST_TMP_ROOT"];
  const token = project.config.env["STS2_TEST_TMP_OWNER"];
  return () => cleanupTempScope(directory, token);
}
