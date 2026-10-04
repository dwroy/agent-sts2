/**
 * Vitest setup (vitest.config.ts): B2's whole-fight lines off by default (BOSS_SIM_LINES=off, read when
 * src/sim/boss-lines.ts loads), so the combat tests on logged boss boards keep their questions and do not run
 * thousands of whole-fight samples each; the B2 tests switch it on (bossLinesOptions.enabled). Only the environment is
 * set here: importing the planner's modules from a setup file would load them before a test file's mocks.
 */
process.env["BOSS_SIM_LINES"] = "off";
