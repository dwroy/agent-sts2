# #81 决策点默认知识摘要交付

基线 `beaa87f2c3f94f0a95f2829cb0329188d4de5ced`，保留分支/工作树 `issue-81-decision-knowledge-injection`。本包只供 review；#80 与主管评论 [6428233307](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6428233307) 要求 Roy 审阅前不集成上线。固定源码 SHA 由交付评论及仅准备的队列请求给出，不自引用改写源码提交。

## 行为与契约

默认 `BRAIN_DECISION_KNOWLEDGE=off`。开启后，Silent 知识工具大脑在选牌、商店、升级/删牌、开局/幕初计划、Boss入场、路线/营火题面默认收到有界已发布知识，原工具仍可按需查询。Codex 与 DeepSeek 共用请求接线；不修改 Jev、出牌、药水、SL、终局规则或知识内容。

- `decision-context-v1` 保留 #80 候选的正文、分母、来源、反证、限制与原审阅条件。正式机器条件严格校验；不解释文字、不把历史节点簇当当前牌组几何。#80 原 review-only 草稿拒绝直接消费，无合格规则时不造优先级或 HP 数值。
- 原 K1 发布链新增一个允许的 Silent 文档叶；按绑定发布的 release_files/documents 读取并核 manifest SHA，不读 latest，不从可编辑文件、另一角色或另一 K1 兜底。没有 SQLite schema 迁移。
- 默认预算8000字节，可配置2048–24000；整个摘要信封受限。按显式 priority、条件特异性、原 confidence 和 ID 稳定排序；过大条目保有界正文/来源入口，省略路径与数量明示。参考 #78 固定提交 `6fc6f41206bf98f7b0e8746a5b0166fa19a852d2` 的投影原则与全文片段协议，没有提前合入其分支。
- `kb_decision_context` 仅启用时加入工具清单；同 K1、本角色、本题全部条件约束，全文按 ID/分片游标取回并核 SHA。当前 Boss 取 fight_state 中实际敌人；合法一次题的升级/删牌同时匹配，不把货架牌当删牌候选。
- 开关关闭与未设置的请求字节等价，Ironclad、历史适配器及非目标请求保持。启用配置写原 run-config，摘要写原 router payload；生成/送达、自然采用及收益分别验收。

最小契约、所有入口、配置、转换门与回退见 [docs/decision-knowledge-injection.md](../../../docs/decision-knowledge-injection.md)。原 #80 合同位置及 SHA 记在 `authority.json`。测试全部是合成格式夹具，不包含开发者给出的游戏知识。

## 检查与原失败

所有检查 nice 19；测试单 worker。为遵守进程限制，没有添加 `with-temp` 常驻父包装；广域自测从原 `agent/tools/test-sandbox.sh` 提取精确固定排除名单，单线程执行，再单独执行其 paths fork 检查。生产 tsc 与知识 runtime tsc 单独执行，不把沙箱排除结果称为实际组合 full。

| 检查 | 结果/原件 |
| --- | --- |
| 生产 `tsc -p tsconfig.json --noEmit` | exit0；`tsc.log` |
| 知识 runtime `tsc -p tsconfig.knowledge-runtime.json --noEmit` | exit0；`tsc-runtime.log` |
| 7文件相关回归 | 121通过；`targeted-final.log` |
| 新增消费测试终版 | 34通过；`budget-final.log` |
| 固定沙箱名单广域 | 645文件中644过/1败，5980项过/1败；旧稀疏夹具缺失，原exit1保留；`sandbox-wide.log` |
| 失败点及paths独立fork | 恢复基线原blob后2文件/12项通过、exit0；`imports-paths.log` |

首个 targeted 启动把 agent 路径重复了一层，Node 模块定位失败，未启动测试。修正命令后的首轮31项中29过、2败：空工具配置使自动注入拿不到 context。修复为启用时直接沿原 Brain context 注入；`targeted-first.log` 留原失败，之后118过、补充覆盖后121过。最低预算正文入口最终调整后34项重过。首败与后继通过分别留存，不改写原日志。

广域唯一失败是旧 `agent/tools/issue29-deepseek-stream.test.ts` 引用稀疏分配未展开的 `paper/materials/issue29-brain-speed/results.jsonl`。从指定基线逐字节恢复211076字节原blob（记录在 `cold-fixture-restoration.json`），没有改夹具内容/跳过名单；失败点和 paths 共12项复验通过。源码9输入SHA全程相同；不另起第二轮广域，不把原exit1改称最终完整回归绿。

检查日志留在本工作树材料目录；SHA、字节与命令/终态摘录在 `verification.json`。适用测试没有模型调用、真实对局、生产库写入或外部统计重算。工程自测不冒充原队列实际 ROOT/LIVE 组合检查或运行验收。

## 接收与运行责任

本分支不推 main/live、不写 STOP/PAUSE、账号或共用配置、不运行 play、不关其他会话、不分配行为号。正式 knowledge 叶及36条候选均未改动；没有 candidate/finish/seal/publish 的生产调用。

固定队列请求只准备、不提交。等 Roy 审阅 #80/#78/#81 后，由原集成员核组合及 ROOT/LIVE 叶映射和完整检查；知识负责人明确转换机器条件、解析来源引用并走 K1；原 ops 按获准边界发布、开关、读回自然题的 K1/ID/字节及实际采用。不能转换的原条件继续 pending，不能靠删条件增加匹配。回退为下一获准自然启动点关闭开关，保留全部知识、原研究、历史与反证。

#80 的长期五维知识有效性、50局分阶段效果、原保存局恢复和科学父要求继续由原负责人接续。本树/分支/日志保留供原线程返工；没有调用 retention complete 或删除回收。
