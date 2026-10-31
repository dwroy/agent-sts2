import type { TestProject } from "vitest/node";
import { cleanupTempScope } from "../tools/temp-root.mjs";
import { createKnowledgeTestFixture } from '../tools/knowledge-test-fixture.mjs';

export default function setup(project: TestProject) {
  const directory = project.config.env["STS2_TEST_TMP_ROOT"];
  const token = project.config.env["STS2_TEST_TMP_OWNER"];
  const knowledge = createKnowledgeTestFixture();
  project.config.env['STS2_TEST_KNOWLEDGE_ROOT'] = knowledge.directory;
  return () => { knowledge.cleanup(); cleanupTempScope(directory, token); };
}
