# V4 A8 批次（20 局）的非阻塞 bug 队列

这一批代码冻结，只合阻塞性修复。下面的纯 bug 等 20 局打完再修（在 jev-sts2-v4step / v4-step 上，按 ops/ops-session-v4-prompt.md 的合入流程）。file:line 以 jev-sts2-v4run（v4-live de62ab5）为准。

- 2026-09-30 10:09 boss 时钟题面血量把回血额度当成本体血量：`src/strategy/boss-clock.ts:200` bossHp() 返回 `db.hp + profile.addedHp`，`:1141` hpNote 再把这个和标成「(A8)」来源。证据：HFNEL0CRKF96 F17 大脑 16 道题都写瀑布巨兽「270 (A8)」，A8 实测 250（多的 20 是回血）；Y648C8QL2MRX 同族写「259 (A8)」，实际神官 199 + 60。只是题面误导，不阻塞。
- 2026-09-30 14:12 失败的大脑调用在 brain.jsonl 里记 0 耗时、0 用量：`src/brain/router.ts:446-447`（`result?.latencyMs ?? 0`、`result?.usage ?? {0,0}`）。证据：41VAUAM2EFY7 F34 event/act-plan 实际 300 s 超时（控制台 10:04:15 → 10:09:15），brain.jsonl latency 0、usage 0；A8ENYFR4ZWKG F15、RUDHQ1KJ49P8 F11/F37 三次非 JSON，deepseek-reasoning.jsonl 记 1,042 / 815 / 1,787 输出 token，brain.jsonl 记 0。metrics 的大脑耗时和成本因此偏低。不阻塞。
- 2026-09-30 14:12 DeepSeek 回答是合法 JSON 但后面多了字，整题判成非 JSON：`src/llm/deepseek.ts:580-584` parseChoice 用严格 JSON.parse（`:303` pickJsonObject 也只收纯 JSON）。证据：RUDHQ1KJ49P8 F11（合法 JSON 后接「Wait — …」和第二个 JSON）、F37（JSON 后多一个 `'`）；A8ENYFR4ZWKG F15 content 为空。三次都从推理里找回了选择，但 RUDH 两次的路线答案丢了（route_review invalid 2 次；原答案是 keep，没造成错误动作）。不阻塞。
- 2026-09-30 14:12 run-config 记的知识前缀和这局多数调用用的不是同一份：`src/brain/knowledge.ts:113-130` 在知识文件或 notes/lessons.md 变了时重渲前缀，`src/telemetry/run-config.ts:119-120` 只记开局那份。上一局结束后的知识刷新和下一局开局重叠，每局开局 2–3 分钟内系统提示换 1–2 次；6 局 24 次冷缓存（每次约 12.5 万 token 没命中），全在开局前 5 分钟或重启后。按 prefix_sha / config_sha 分组会分错（WLM6YKJ0ASNE 因此被 metrics 标成「局中改过配置」）。不阻塞。
