import { readFileSync } from "node:fs";
import { setExperienceForTests } from '/home/dw/Projects/agent-sts2/.worktrees/exp/agent/src/knowledge/experience.ts';
setExperienceForTests(JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/learner/runs/20261007-101303-experience-update/slice-knowledge-after/characters/silent/experience.json', "utf8")).entries, JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/learner/runs/20261007-101303-experience-update/slice-knowledge-after/characters/silent/outcome-stats.json', "utf8")));
await import('/home/dw/Projects/agent-sts2/.worktrees/exp/agent/tools/knowledge-slice.ts');
