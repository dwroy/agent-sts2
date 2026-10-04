export const meta = {
  name: 'sts2-architecture-review',
  description: 'Research and debate a new DeepSeek/Jev/code division of labour for the STS2 bot',
  phases: [
    { title: 'Research', detail: 'Jev prompt capability, open-source STS bots, our hard-coded rules' },
    { title: 'Design', detail: 'three independent architecture proposals' },
    { title: 'Synthesis', detail: 'critique and final recommendation' },
  ],
}

const CONTEXT = args.context

const RESEARCH = [
  {
    key: 'jev',
    prompt: `${CONTEXT}

TASK (read-only, do not modify any file): Can Jev be given our accumulated experience via its prompt?
1. Inspect how we call Jev: ~/Projects/sts2-jev/jev-sts2/src/jev/ (questions.ts, client code), src/loop.ts, and the TypeSafe/Jev SDK in node_modules (search for "systemone" / the package the code imports). Find exactly what a Jev request contains (state JSON, instructions, criteria/options, any system/context field), any size/token limits, and how answers/confidence come back. Check logs/decisions.jsonl usage fields for typical input token sizes and latency (sample the last 2000 lines with tail + python).
2. Search the web (load WebSearch/WebFetch via ToolSearch "select:WebSearch,WebFetch") for TypeSafe Jev / jev-1.13 documentation: what it is (fast decision model), whether it accepts free-text instructions or context, recommended prompt size, whether it can use rules/examples in context.
3. Answer concretely: (a) which channel(s) could carry experience (instructions text, a state field like "hints", per-option annotations), (b) expected effect on latency/cost, (c) risks (Jev is small; long context may hurt; it's trained for structured choice), (d) a concrete proposal: what experience to give Jev (e.g. 3-6 retrieved hints relevant to the current fight: enemy mechanics, 'play powers on non-attack turns', HP rules) and in which field.
Return a concise report (≤ 50 lines) with file:line references and URLs.`,
  },
  {
    key: 'oss',
    prompt: `${CONTEXT}

TASK (read-only): Survey open-source and published approaches to AI for Slay the Spire (1 and 2), to inform our architecture. Load WebSearch/WebFetch via ToolSearch "select:WebSearch,WebFetch". Look for: rule/heuristic bots (e.g. bottled_ai, xaved88 STS AI, CommunicationMod-based bots, "Slay the Spire AI" GitHub projects), search/simulation approaches (sts_lightspeed, MCTS, fast simulators), learned approaches (RL, card-pick value models from Spirelogs / community stats), and LLM agents (papers or repos 2023-2026 using GPT/Claude/DeepSeek to play STS or STS2; the CharTyr STS2-Agent mod and DiscreteTom/jev-sts2). For each: architecture (what is search, what is rules, what is learned/LLM), reported results (win rates, ascension), and lessons about where rules vs search vs learning worked. Specifically extract evidence on: (1) combat — search/simulation vs heuristics vs LLM; (2) deck building / pathing — learned card-pick values vs LLM judgement vs rules; (3) how successful bots avoid 'rigid playbooks' (e.g. evaluation functions + search instead of if-then rules).
Return ≤ 60 lines: a table of projects (name, URL, approach, result) and 6-10 bullet lessons relevant to a bot where code = turn solver + rules, Jev = fast small chooser, DeepSeek = slow strong LLM. Mark anything uncertain.`,
  },
  {
    key: 'rules',
    prompt: `${CONTEXT}

TASK (read-only): Inventory the hard-coded strategy in ~/Projects/sts2-jev/jev-sts2/src (screens/*.ts, strategy/*.ts, knowledge/*) and classify it. Buckets:
 A. Mechanics / game-rule modelling (e.g. Vulnerable already in intents, Sandpit countdown, Crab Rage, Beckon HP loss) — objective facts, not strategy.
 B. Safety guards (HP guard, never Gambit, gate fallback) — hard constraints.
 C. Fixed strategy heuristics that are genuinely context-free (e.g. heal before boss below X%).
 D. Contextual strategy encoded as rules that probably should be flexible judgement (card tier table + bonuses, boss-specific card bonuses, map weights, shop scores, Knowledge Demon curse order, potion cost rules, elite HP thresholds, 'scaling' flags...).
For each bucket give counts and 6-12 representative examples with file:line, and for bucket D judge which rules show signs of overfitting (added after 1-2 runs, specific numeric thresholds, boss-specific) — cite notes/lessons.md run ids where the rule came from. Also pull the key numbers from this analysis (already done): combat plan-choice average extra HP vs min-loss line on 873 escalated turns: code rank1 3.67, Jev 2.59, DeepSeek 3.12, after HP guard 1.88; DeepSeek overrides of Jev cost +1.7 HP for +0.4 damage; Jev alone 1.61 vs code rank1 2.13; both wins' decisive build choices mostly by DeepSeek overriding Jev; 34/45 losses primarily code bugs/unmodelled mechanics.
Return ≤ 60 lines: the classification table, overfitting suspects, and which decision types (per screen/label) are currently decided by which layer (code share vs Jev vs DeepSeek) — estimate from jev-sts2/logs/decisions.jsonl (stream with python; group by label prefix and decider over the last ~15 runs).`,
  },
]

phase('Research')
const research = await parallel(RESEARCH.map(r => () => agent(r.prompt, { label: `research:${r.key}`, phase: 'Research' })))
const [jevReport, ossReport, rulesReport] = research
const researchBlock = `## Research: can Jev take our experience?\n${jevReport ?? '(missing)'}\n\n## Research: open-source STS AI\n${ossReport ?? '(missing)'}\n\n## Research: our hard-coded rules & layer performance\n${rulesReport ?? '(missing)'}`

const ANGLES = [
  { key: 'user', brief: "Refine the USER'S proposal: DeepSeek = build/direction/playstyle choices incl. mid-run pivots and cross-run important decisions; Jev = in-fight execution (card play); code = fixed, non-flexible operations and not-yet-generalised patterns. Make it concrete and point out where it needs adjusting." },
  { key: 'search', brief: 'Search/evaluation-first: replace brittle rules with a good evaluation function + simulation (turn solver, lookahead over enemy patterns, maybe rollouts) where facts are code, and put learned/LLM judgement only into the evaluation weights and strategic intents. Argue from the open-source evidence.' },
  { key: 'memory', brief: 'Memory-and-intent-first: a strategic layer (DeepSeek with memory/handbook) sets an explicit run plan and per-fight intent (e.g. "race", "turtle until Demon Form", "keep sandpit ≥2") that parametrises the solver and Jev; experience is stored as retrievable, tagged, versioned knowledge given to BOTH models; code keeps only mechanics + safety guards. Include how lessons flow in and get pruned.' },
]

phase('Design')
const proposals = await parallel(ANGLES.map(a => () => agent(`${CONTEXT}

${researchBlock}

TASK: Propose an architecture for the next version of this bot. Angle: ${a.brief}
Cover: (1) division of labour per decision type (combat play, potion timing, card reward, shop, event, upgrade/remove, map/rest, boss-specific tactics, run direction/pivots); (2) how experience flows (post-mortem → code facts / guards / model memory) and how to avoid rigid playbooks while keeping stability; (3) whether and how Jev gets experience in its prompt; (4) latency/cost budget (DeepSeek ~12s p50 now; runs take ~45-60 min); (5) migration steps from the current system in small, testable increments, each with a measurable success metric; (6) main risks. Be concrete and grounded in the research and the numbers; ≤ 70 lines, Chinese.`, { label: `design:${a.key}`, phase: 'Design' })))

phase('Synthesis')
const final = await agent(`${CONTEXT}

${researchBlock}

## Proposal A (refined user proposal)
${proposals[0] ?? '(missing)'}

## Proposal B (search/evaluation-first)
${proposals[1] ?? '(missing)'}

## Proposal C (memory-and-intent-first)
${proposals[2] ?? '(missing)'}

TASK: Act as a critical chief architect. First, critique each proposal against the evidence (our numbers; open-source results; Jev's actual prompt capability) — what is right, what is wishful. Then write the recommended architecture as a single coherent design, in Chinese, for the user (a senior programmer): 
1. 结论（5 行内）: do we adopt the user's division (DS=strategy, Jev=execution, code=fixed), with what modifications.
2. 分工表: decision type → primary layer → what the others do (guard/advice) → why (cite numbers/evidence).
3. 经验如何流动: code facts vs guards vs model knowledge; rules for when an experience becomes code vs stays in model memory; how to retire overfit rules (list 5-8 concrete current rules to demote from code to model knowledge, with file refs from the research).
4. Jev 能否获得经验: concrete answer and the exact mechanism to try.
5. 迁移路线: 4-6 small steps, each with an A/B metric and stop/rollback criterion; note the in-flight experiment (DeepSeek memory v1, 10 runs) must finish first.
6. 风险与未知.
≤ 110 lines. Use tables where helpful. No fluff.`, { label: 'synthesis', phase: 'Synthesis' })

return { final, proposals, research: { jevReport, ossReport, rulesReport } }
