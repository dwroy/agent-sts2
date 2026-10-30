# #78 交付：typed 知识的有界消费与完整证据读取

基线 main `3f72590d1943914a254188b1763362bf1692d320`，保留分支/工作树 `issue-78-typed-tool-projection`。源码只改消费者；不改游戏事实、出牌/药水/SL/终局规则、账号/档位、生产知识、main/LIVE/STOP 或其他会话。原对局继续；检查请求单 worker、nice19，不调用 play、游戏或模型。未核本开发会话原生档位，不以 ops 的启动请求冒称已生效。

## 修复与合同

旧工具把整条证据及重复来源元数据塞入 24KB，装不下就推进游标，单 ID 最终匹配 1/返回 0。新实现保留原动态选择器，先把大条目转换为有界投影，再按响应总预算分页；不再跳过匹配。来源明细也有总预算和明确省略数量，避免补证把来源列表挤爆。

大条目完整保留通常大小的 ID/trigger/策略正文/confidence/冲突状态，返回证据计数、反证摘要、数组末尾/最大外部分母的少量引用及补证历史摘要，明示 truncated/omitted_fields；不将外部分母相加、不推断证据更强或自然采用。特别大的核心字段明确为 partial_fields，不把部分条件冒充完整条件。库内原条目与所有历史不删、不压缩、不改写。

同一工具新增 `detail=full/document_id/document_offset`，返回有 SHA256 的无损 JSON 分片；仍受角色/进阶/本题/关键词/楼层/牌组等原条件约束。每个完整响应仍 ≤24000 UTF-8 字节；分片不切 Unicode 码点。小条目表示保持，参数自动进入同源动态 ToolDef/MCP/提示定义；原初始计划和后续复用不动。合同与回退见 `docs/knowledge-consumer-projection.md`。

ROOT/LIVE 五个源码叶及三个测试叶的精确前/后 blob、SHA 和回退映射见 `delivery-manifest.json`。本项不需要 schema 迁移或知识候选；不分配行为发布号。实际部署由原集成员/ops 沿原队列和自然边界执行。

## 两个原 K1 的五次固定回归

用只读 SQLite 一致备份隔离原知识库，按原 release_files/document SHA 恢复快照，保留原 K1 身份。仅固定选择器，不把合成题当实盘或对照收益。`probe.mts` 可复跑，完整原条目只留忽略目录。

| 绑定 K1 前缀 | ID | 原响应字节 | 新响应字节 | 匹配/返回 |
| --- | --- | ---: | ---: | --- |
| 98d57ac5 | silent-route-hp-observation | 25523 | 7590 | 1/1 |
| 98d57ac5 | silent-brain-blade-flexible-formation-review | 25229 | 7726 | 1/1 |
| 533bcdcf | silent-route-hp-observation | 31072 | 7418 | 1/1 |
| 533bcdcf | silent-brain-first-boss-power-hp-review | 29247 | 7542 | 1/1 |
| 533bcdcf | silent-brain-blade-flexible-formation-review | 34161 | 7728 | 1/1 |

五项 trigger/正文/confidence/evidence_status 与原条目精确相等；全文所有分片拼接、SHA 与原条目对象核同，快照文件保持原字节。首 Boss 楼层不符为空；两个 K1 上 poison-footwork 缺 FOOTWORK 为空，恢复全部原要求牌后返回 1；五项铁甲负例为空。详见 `frozen-k1-receipt.json`；原故障依据为 #62 评论 6413435422/6413760642 及 ops 原目录 `20261026-knowledge171221-ops`、`20261026-knowledge175024-ops`。

原五条是五个故障记录、三个去重 ID。额外将五份查询全部在同一指定 `K1-533bcdcf7832a397912dde52919892be2ddf92a6b97f560d27f4b00409a25c95` 重放，五次均匹配 1/返回 1，原 trigger/正文/confidence/conflict 核同；重复 ID 不计新知识条目或独立样本。原逐版本回归与当前同版本重放分别见 receipt 的 receipts/sameVersionReplay。

## #72 与检查边界

#72 固定 `5ec842acc70c9c46617f109d40b544b3f97f691b` 自带研究目录/结构/附件分页，不走旧 typed 超限跳过逻辑，本项不重写该工具或接管来源。隔离视图从本基线复制当前代码，应用 #72 的固定生产/测试差量，仅调和 agent-knowledge.ts、store.ts 的新增 import；保留 #73 continuation。`kb_build_research` 完整五阶段、长证据、原文与附件分页和低可信/反证/unknown/未验证状态仍通过。真实 ROOT/LIVE 最终组合及 #72 schema4 部署门仍由原 owner 核收。

- 最终定向：本项 8 项、原策略 8 项、外部证据 43 项，共 59 项通过。
- 旧超限断言更新为投影+全文往返后，brain-query-guidance 16 项及 paths 11 项，共 27 项通过。
- 最终隔离 #72 组合：4 文件 70 项通过，其中整局研究 11 项；生产 tsc 通过。该视图没有进入 main/LIVE，不冒实际发布组合 full。
- 生产 tsc 和知识 runtime CLI tsc 均 exit0；最终沙箱 645 文件/5955 项全过，独立 paths 11 项通过，脚本 exit0。八个源码/测试叶与 source-freeze-release.json 逐 SHA 相同；见 checks/final-summary.json、sandbox-release.log。
- 固定回归覆盖超大策略/经验/rk、中文/转义/Unicode、全文 SHA 往返、多条命中预算裁剪、limit/offset、来源总预算、原筛选与角色负例及旧文件源。原 typed/rk 29 项首轮也通过，后由最终沙箱覆盖。

过程失败保留在 `.artifacts/issue78/`：探针最初的 CJS 顶层 await、用 migration 重建 K1 身份不相等、题型标签/换行不符，均属隔离探针准备问题，改用 .mts、只读一致备份和实际题型后通过。#72 首次应用的两个 import 冲突、缺 ops/codex 模块/package 边界及旧外部来源元数据测试差异均保留；补齐精确依赖/恢复来源元数据后复验。两轮未完成沙箱分别因补来源总预算、补外部字符串引用的来源分账而明确作废，仅按 PID 停止本树检查的已核进程，未触碰其他 owner；最终冻结后重跑。不把早期失败、作废或单项绿冒充最终检查。

首个完整沙箱终态为 645 文件中 644 过/1 败、5955 项中 5954 过/1 败，1228.09 秒；唯一失败是 brain-query-guidance 的旧断言仍要求超大策略 isError/空条目。已改为新合同的返回投影与完整原证据往返断言，单文件复验通过。生产五叶未因这次测试修正而再改；旧红原件 checks/sandbox-delivery.log 保留，最终全量重跑另记，不改写首败。

## 后续负责人

原集成员按本项固定提交、精确五叶与 #72 共享 agent-knowledge.ts 逐块合并，执行原队列唯一实际组合完整检查；默认 host-only 队列策略不能直接当本游戏 ToolDef 的消费者检查。应冻结实际 ROOT/LIVE 前像并设置五叶的实际部署映射及原消费者命令。

原 ops 在合法自然边界部署后，用实际 LIVE ToolDefs 对原两个 K1 五项实调读回，再在下一正常局核原 brain 工具调用中的 ID/K1/返回内容。实际全文读取、计划采用、动作和收益分账；不为验收开新游戏或模型，不关闭 #51/胜率等科学父项。回退只撤本项五个消费者叶的差量，保留 #72/#73 与后续代码、K1 和所有证据；旧超限限制会随旧实现恢复。

最终沙箱于20:34结束，645/5955全过、paths11过；原首败不改写。原队列实际 ROOT/LIVE 组合 full 与部署/自然消费仍待原 owner，不拿本次沙箱或隔离组合替代。
