# V4 A8 批次（20 局）的非阻塞 bug 队列

这一批代码冻结，只合阻塞性修复。下面的纯 bug 等 20 局打完再修（在 jev-sts2-v4step / v4-step 上，按 ops/ops-session-v4-prompt.md 的合入流程）。file:line 以 jev-sts2-v4run（v4-live de62ab5）为准。

- 2026-09-30 10:09 boss 时钟题面血量把回血额度当成本体血量：`src/strategy/boss-clock.ts:200` bossHp() 返回 `db.hp + profile.addedHp`，`:1141` hpNote 再把这个和标成「(A8)」来源。证据：HFNEL0CRKF96 F17 大脑 16 道题都写瀑布巨兽「270 (A8)」，A8 实测 250（多的 20 是回血）；Y648C8QL2MRX 同族写「259 (A8)」，实际神官 199 + 60。只是题面误导，不阻塞。
