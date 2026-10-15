import { resolve } from "node:path";

/** Roy's 2026-10-15 authorization is limited to this main Silent play lane and login home. */
export const MAIN_SILENT_CREDIT_SCOPE = "main-silent-codex1-20261015";
const MAIN_ROOT = "/home/dw/Projects/agent-sts2";
const MAIN_LIVE = `${MAIN_ROOT}/.worktrees/live`;
const CODEX1_BRAIN_HOME = `${MAIN_ROOT}/ops/codex-ops/accounts/codex1/brain`;

/** An inherited on flag alone cannot enable credits in another checkout, home or character. */
export function mainSilentCreditsAllowed(env: NodeJS.ProcessEnv, character: string, projectRoot: string): boolean {
  return env["BRAIN_CODEX_PAID_CREDITS"] === MAIN_SILENT_CREDIT_SCOPE
    && character === "silent"
    && resolve(projectRoot) === MAIN_LIVE
    && env["STS2_WORKSPACE"] === MAIN_ROOT
    && env["BRAIN_CODEX_HOME"] === CODEX1_BRAIN_HOME;
}
