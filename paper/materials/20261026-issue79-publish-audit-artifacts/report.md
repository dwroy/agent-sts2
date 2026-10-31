# #79 知识来源产物审计交付

基线 `3f72590d1943914a254188b1763362bf1692d320`，独立树 `issue-79-publish-audit-artifacts`。修复 Markdown 批准项被当 JSON 解析，以及原学习者分类候选缺少独立去向时被拒的问题。实际生产受理、工具返回与 wrapper 终态交原集成/ops，尚不以本报告关闭 #79 或 #51/#60 父项。

采用 issue 的第二种方案：复用分类原 `target` 作为声明式关联，只允许同角色、无父项的 strategy 目标，核原路径、ID、规范对象 SHA 和完整批准策略对象。分类仍须经过原格式/引用/证据保留校验，不猜标签，不扩大科学适用范围。其他业务类型的分类继续要求显式批准对象。

非 `.json` 产物只保留作证据，核原字节数和 SHA，不授予对象发布权限；JSON 严格解析并逐对象审计，坏 JSON 不降级。现有 JSON 批准的字节数/SHA 也进入普通完成路径校验。#73 续接与普通完成复用同一审计和批准证据函数，保留原 API 导出与事务/幂等/失败记录。

源码/模式/SHA 和 ROOT/运行 CLI/学习模板映射见 [delivery-leaves.json](delivery-leaves.json)；接口、原批合法重试和回退见 [合同](../../../docs/knowledge-source-approval.md)。实际知识 CLI 必须配套新增 `approval.ts` 与 `store.ts`，ROOT 接学习 helper；新增导入叶也须纳入原集成实际 ROOT/LIVE 消费者及部署映射，保留共享叶的后续改动。无游戏规则、正式知识、生产库、schema 或行为编号变化。

验证记录见 [checks.json](checks.json)。生产与知识 CLI 两套 tsc 通过，首轮三个定向文件 29 项通过，覆盖混合 Markdown/JSON、缺关联拒绝、合法关联通过、错角色/类型/ID/父项/SHA、档案不能授权对象、JSON/档案篡改、同 submitted ID 重试与 #73 续接幂等。

单 worker 沙箱首轮 645 文件中 644 过、1 败，5958 项过、1 败；唯一失败是原稀疏树缺 `paper/materials/issue29-brain-speed/results.jsonl`，不是源码导入错误。按固定基线恢复其原 Git blob `b84d95c5185941eec143cbcf2966d5770309cca5`（211076 字节），核 hash-object 相同；源码不改。随后导入检查加本项三个文件共 4 文件 30 项通过，补执行原脚本未到达的单 fork paths 11 项通过。首败原件保留，不冒首轮沙箱全绿，不重跑整套；原集成仍须核实际 ROOT/LIVE 匹配组合的唯一完整回归。

## 原 182334 的只读重放

[original-replay.json](original-replay.json) 记录原文件 SHA、原 base/current 和两个原拒绝。直接运行固定基线的审计函数，混合批准复现 `Unexpected token '#'`；只保留 JSON 后复现缺 `silent-class-a10-continuity-route-hp-observation` 批准。新审计使用全部原批准通过。

在本树 `.artifacts/issue79/original-replay/` 从原 base 文档重建隔离库。生成 seed 有独立 K1，重放只在内存将候选 base 映射到该 seed；原文件和候选 ID/知识文档原字节不改。以原 ID 完成并重复完成返回同一回执，只有一个完成事件；索引精确读回 `silent-brain-poison-flexible-prefix-continuity-review` 及分类。隔离回执 code 为固定格式夹具，不是生产源码 SHA，隔离 K1 不冒生产新版本。

同一隔离库调用当前 `kb_strategies` 仍返回来源元数据超 24KB 的错误，75 字节、无条目；#78 尚未进入本树。这明确保留了完整工具读回缺口。本项不能替代 #78，更不能以索引读回称生产工具验收通过。

重放首轮因本机已安装的 TypeScript 不含 `lib/typescript.js` 而准备失败；原脚本保留在 `.artifacts/issue79/replay-r1.mjs`，随后只修重放 helper，剥离固定基线函数的已知类型注解，不加依赖、不改修复源码。复现脚本见 [replay.mjs](replay.mjs)，只读指定原 runtime/候选/批准，写入仅接受本树 `.artifacts` 子目录。

## 接续范围

原集成核固定源码组合与实际 CLI 消费者后，原 ops 沿原完成 recheck 用 `20261026-182334-strategy-proposal` 受理。只读重放时原 base=current=`K1-533bcdcf7832a397912dde52919892be2ddf92a6b97f560d27f4b00409a25c95`；实际执行前鲜核，变化时先按 #73 验证并显式受理续接，不覆盖原 candidate/report/approval，不重开模型。实际发布、完成事件与原 ID 幂等回执核同后，配套 #78 核生产工具新增 ID 与完整返回 ≤24KB。

wrapper 监督证明与真实终态仍按 #65/#77 原合同由原 owner 核收；本开发树未 finish/seal 或补造 wrapper，未关会话、未改 live/STOP/账号/共享容量。父要求、反证、失败及待验项保留。交付仅准备固定队列请求，不在开发树 submit、tick 或安装生产 authority。回退先停此类新受理，反向三源码叶差量，保留已发布知识/完成回执和原材料，知识回退另走原事务。
