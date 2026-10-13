## 修 bug 回报

- 合并基线：main → 3871fc384741aec05c7aacbaf82efcb7304614f3
- 修复：明确not_simulated候选误计DPR丢失 — c988032d20270b84bacae81a614b50f6704c3804 — 测试 agent/tests/module_health_test.py:Health.test_explicit_unsupported_candidates_preserve_observed_denominator — 去掉修复时失败：是
- 已被别人修掉的：逐项提交及main/live实际祖先见下表。
- 没修的：逐项原因见下表；策略条目沿既有独立提案链，不派下级agent或重复登记。
- 测试：tsc 退出码0；vitest 374文件/3574用例/退出码0；无测试重跑；额外Python9用例通过。
- 合入：未合入；锁内保存刷新提交b09d60f57917dc51261e8e0c01e03ddc82128c04，预检10份刷新知识+19份记录冲突，按要求停止；未创建MERGE_HEAD、未覆盖刷新数据。
- 需要 Roy 定的事：无。

### 新修复证据与验证

WA7FRJ7UABCV / SILENT A10 / F22 / turn不适用（event/choose），decision 23337b4f-2ec4-4070-aa2c-4a5be1d30f3d；offset1236320924/length29802/SHA256 9268f0cec621a57bc359f9bf6c04a79ebe7157c42d305ade0fc61ac0cd3efdaa逐字节核实，samples1000、o0/o1均为not_simulated，无模拟结果。固定测试用写死局面，不读knowledge刷新数据，不给候选补DPR。

只撤掉ops/module_health.py修复，回归exit1（断言多出no_complete_dpr）；恢复Python9用例exit0，日志module-health-without-fix.log/module-health-restored.log。source-sandbox.log第一阶段373文件3563项、paths1文件11项，均0，tsc0。首次测试启动TMPDIR误指agent/learner/runs，在执行测试前重定向失败，随后改为指定绝对路径；该次未执行tsc/vitest，不计为测试重跑。

39条原日志按偏移/SHA核验的只读消费回放：总尝试39、产出16、原覆盖16/39保持；不支持1、适用38、适用覆盖16/38；21次样本不足/1次零样本、最长及末尾失败串10、最大耗时11248ms、告警true均保持，见frozen-health-replay.json。源/刷新提交gitleaks均0。

根目录ledger CLI按WA7FRJ7UABCV、DPR查bug-infra均0项，不新建账本或标shipped。纯运维统计，无新规则/提案/eval版本。未实际上线，不写上线记录或规则双通知；完成事件交原运维兜底合入及宿主完整检查，不冒称已请求或通过。

### 已修且不重复提交

| 条目/已实现范围 | 提交（均为main/live实际祖先） |
|---|---|
| silent-0254 无动作死亡统计 | 3b48088dec5fc6eafe576a1296bbdadde43432ee |
| silent-0256 已观察狡诈药水生成 | 6403fdcdadc803a092beb5165a068e22bf51c412 |
| silent-0260 普通紧勒传播 | 5c7105ff0294466da8319f2934beda05c6040794 |
| silent-0263 已观察转向取整 | ec29ea34b919344b707e57ba472ea210f9c39d62 |
| silent-0266 投斧首牌去重 | e784dd9f043bf87c29109573f48975f9903280d3 |
| silent-0268 生存者单弃 | bf423c173d3be348a4ad714e1d26516df619ff41 |
| silent-0271 连战毒胜防御候选 | 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f |
| silent-0272 商店移除预览 | db20ec3cc6cd0e47ac014d0c523dd4ed1c781d26 |
| silent-0273 待接续部件输入 | c915888d0fabf3c8f1b5d466fe75729161b16835 |
| silent-0317 升级计算下注 | b49112dbc106e315bd7156361d290fc4c73d29e2 |
| silent-0324 普通刀刃之舞 | 66c22ba7d87b8748690a4183fff838acd346bd3e |
| silent-0338 奥利哈钢诊断 | c1d84804956bedbd29a7f0e81294114e18415b9d |
| silent-0367 已消耗尾巴事实 | 5baf663d7e6678efa3690e5a48329c4f8baee109 |
| silent-0245 懒惰防御重放 | 790b76d00dc23dedb970cb82a00cb3db6ff1cbb7 |
| silent-0246 子弹时间 | a6ed582e8c26e1cc7d51fd21459d1c46481bfa10 |
| silent-0250 SL占位残血 | b14880d1b1780d03e4c1c87b5afdc2a1e08fd456 |
| silent-0297 A10可见凋萎缓存子项 | 9b65f1bee0f26ced606ec256fc3d173db48caa3e |
| codex-usage-credit-baseline-recovery | e5e2995d659d15af79ec8bba67a4a25c1cb7295f |
| ascension-up 实际进阶 | 8045d9fbf0a12523b1dbe39bbed8af06c7497b09 |
| host-targeted-check-continuation及框架收尾入口 | 24c2e3a75b5db6bac76d6c924f86b7fcd9438316 |
| host-checks-broker-push-registration | c519952b31e3a0bb3acdd2115883ae8671b8a090 |
| host-checks-session-exit-fixture | 874ae603b3927173f805e0b2fe789330bab710c7 |
| core-cycle-implementation-binding-entry | fc95760d4ff8a9cbd45577efdd79b1215bd2cb92 |
| sandbox-glob-startup-race 恢复子项 | bc2c40e313cc36682196277c53c50e30744b88c5 |
| sandbox-glob-startup-race 租约子项 | d9983263ffecea1bed4e29d65e7f854a3d2e33d7 |
| blocked-experience-proposal-repair-dispatch | 84366ad06ee4f978394c1b9489a82c83ea12bd36 |
| multi-character-potion-table-fixture-isolation | 5ef3c4612bd2673c19968c5a2d24bf62af519ee1 |
| named-card-facts-transport 事件子项 | 42c920f34d9dc1c783ce894659849ab37ed6fd1b |
| compute-memo-worker-data-signature | 8fbb441eb61eef226eb7366f9612003480c83988 |
| S1.exp100遗漏rollout最佳线固定夹具 | 81d6226fe2c0220be145b5ff1487acbf512153f1 |
| rollout-live-best-test-determinism | bbc5b993a7524bbb8e80a975f204f8d193657b46 |
| ops-stall-recovery-test-subprocess-timeout | 95e7f050ef2abe5c85a0367555392652ad73fbfe |
| jev-context-limit-restart-loop | fab7c90945bd4a899d411438a22952b252272aa4 |
| batch-c-fixed-fixture-timeout | 5dd8a20c9d2dd4ed43120b1684e5577b993ac2ff |
| host-fixed-test-timeouts-010547 eval | d9881ba593b0b8d701ebbe1c95626c0ebdd554c7 |
| host-fixed-test-timeouts-010547 神化 | 9e8c93555131c3347f9e809d9722a848a75c2692 |
| paper-dataset-git-consistency-race | 16bfe0bd6ecaa91d04a91c01edc94cecc781f71f |
| boss-sim-codex-home-preflight | 5921f8cd045853182c867a6430e75c3fcde00a87 |
| host-loop-time-cap-wall-clock-061301 | b3c6dd700b00d0d8b17d5d2efe6fe9aa353618fa |
| learner-recheck 拒绝诊断 | 63f656fb07a21a7496353234269901a832eae497 |
| ops-worktree-history-disk-pressure 回执容量子项 | a136ddc4b5b0a8696f10b2fae3073322d57e724c |
| ops-worktree-history-disk-pressure 无终态退出子项 | db072ddab47ba94efb46dce2913927f936ecb97e |
| ops-worktree-history-disk-pressure JSONL边界子项 | 9b07240b18f862efdbe630889ade04e8976eaace |
| learning-notice-ordinary-ack-registry | 672e198a4730012330f599068a0ef1efadb02002 |
| learning-notice-ordinary-ack-registry 前阶段校验 | 1594def2e1b65b665d3b345f31444194eb4d09e6 |
| postmortem-capacity-failure-proposal-repair | 3fdcd77927f01b35c20c6c5c1fcfd790676032d2 |
| silent-deck-cap-consumer-fixture-isolation（c099等价集成） | ebdebbcde48fd9a515f17c309813d8783debc434 |
| shared-experience-fixed-filesystem-snapshot | 8390c62d76fc8c7d7b6b7292121a621f4666d39c |
| core-build-notify 失败诊断子项 | 5c92f2aaf0b758a1a5e7d591745694004664f83a |

### 保留条目

| 条目 | 原因 |
|---|---|
| silent-0279 SL改标身份 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0287 历石/毒联合上界 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0290 战斗专注禁抽 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0291 苦无增敏 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0293 螺线飞镖增敏 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0295 随机施毒伪确定斩杀 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0296 普通逃脱计划 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0300 全弃重抽准入 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0308 单动作沙坑截止 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0311 库存恢复血量上限 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0319 升级蛇咬 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0320 普通UNMOVABLE新增挡 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0322 升级神化 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| 升级HIDDEN_DAGGERS弃二/生成小刀 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0329 爬行动物饰品药后力量 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0339 尾巴误核销 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0344 坚韧之环延迟挡 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0362 背向减力倍率 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0365 未建模药水目标 | 策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发 |
| silent-0237 宽范围神化/后续抽牌 | 策略类；部分已观察升级对772b839f8/6e233ede7已实现，宽提案保留 |
| silent-0347 组装师召唤 | 策略类；0fa15f5e只披露覆盖缺口，不等于召唤模型实现 |
| silent-0349 虚弱后临时减力宽条件 | 策略类；84e6cde14已修已观察尖啸子项，不关闭宽提案 |
| silent-0332 successful first-fight resources | 证据不足；7f658abe诊断已保留，仍缺触发样本/种子/首战末资源，不伪造连战资源 |
| rest-timeout-accepted-route-not-committed | 独立结构提案；原silent-0446/2d3aa8dfb27dbe3f沿structure实现链 |
| v5-dpr-health-20261013 采样性能 | 证据不足；六冷暖双线程探针均失败，阶段诊断已上线，未证明新执行/传输根因；保留300/1000/11000ms/24线程 |
| sandbox-glob-startup-race 上游目录生命周期 | 证据不足；已有有界恢复/租约修复不证明具体目录删除者/时序 |
| core-build-notify-222802-rc2 原失败恢复 | 证据不足；历史无stderr且发送状态未知；失败诊断已修，未重放原通知 |
| named-card-facts-transport 其他入口/P1/P2 | 独立功能；事件入口已修，父需求其余消费者/量化/自然验收沿原owner |
| 调度公平性核查 | 独立架构调查；快照不证明永久饥饿，不改队列/并发 |
| arch-funnel-guard | 独立架构功能；普通批次只修纯bug |
| arch-learning-priority | 策略/独立架构功能；普通批次只修纯bug |
| arch-unified-resource-value | 策略/架构类；不新增游戏估值 |
| inv-f33-regression | 独立归因调查；既有报告和证据限制保留 |
| codex-brain-cache-probe home续办 | 独立功能；队列明确仅原缓存独立续批实现，不重开旧pair |

### 合并证据

live-integration.json记录原live0b07f43b3bdf54138e922cb84f2fd41dce9db139、刷新提交、知识重叠和29冲突；locked-live-merge-tree.txt保存预检。原notes/fight-value-backtest-silent.md及notes/monster-db-check.md未提交记录保留。自身分支只新增ops/module_health.py及agent/tests/module_health_test.py两个叶子，工作区干净；未改队列/prompt、不推送、不运行play、无LLM/网络测试。

旧c099来源不是当前祖先；用实际等价集成ebdebbcde记录已修，原失败报告生成断言另保留report-generation-first-failure.log，不将原失败改写。

```json
{"task": "fix-batch", "base": "3871fc384741aec05c7aacbaf82efcb7304614f3", "fixes": [{"item": "v5-dpr-health-20261013：明确not_simulated候选误计no_complete_dpr", "commit": "c988032d20270b84bacae81a614b50f6704c3804", "test": "agent/tests/module_health_test.py:Health.test_explicit_unsupported_candidates_preserve_observed_denominator", "fails_without_fix": true}], "skipped": [{"item": "silent-0279 SL改标身份", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0287 历石/毒联合上界", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0290 战斗专注禁抽", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0291 苦无增敏", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0293 螺线飞镖增敏", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0295 随机施毒伪确定斩杀", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0296 普通逃脱计划", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0300 全弃重抽准入", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0308 单动作沙坑截止", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0311 库存恢复血量上限", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0319 升级蛇咬", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0320 普通UNMOVABLE新增挡", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0322 升级神化", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "升级HIDDEN_DAGGERS弃二/生成小刀", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0329 爬行动物饰品药后力量", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0339 尾巴误核销", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0344 坚韧之环延迟挡", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0362 背向减力倍率", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0365 未建模药水目标", "reason": "策略类；已有独立strategy-proposal登记，本批不加游戏知识、不重复派发"}, {"item": "silent-0237 宽范围神化/后续抽牌", "reason": "策略类；部分已观察升级对772b839f8/6e233ede7已实现，宽提案保留"}, {"item": "silent-0347 组装师召唤", "reason": "策略类；0fa15f5e只披露覆盖缺口，不等于召唤模型实现"}, {"item": "silent-0349 虚弱后临时减力宽条件", "reason": "策略类；84e6cde14已修已观察尖啸子项，不关闭宽提案"}, {"item": "silent-0332 successful first-fight resources", "reason": "证据不足；7f658abe诊断已保留，仍缺触发样本/种子/首战末资源，不伪造连战资源"}, {"item": "rest-timeout-accepted-route-not-committed", "reason": "独立结构提案；原silent-0446/2d3aa8dfb27dbe3f沿structure实现链"}, {"item": "v5-dpr-health-20261013 采样性能", "reason": "证据不足；六冷暖双线程探针均失败，阶段诊断已上线，未证明新执行/传输根因；保留300/1000/11000ms/24线程"}, {"item": "sandbox-glob-startup-race 上游目录生命周期", "reason": "证据不足；已有有界恢复/租约修复不证明具体目录删除者/时序"}, {"item": "core-build-notify-222802-rc2 原失败恢复", "reason": "证据不足；历史无stderr且发送状态未知；失败诊断已修，未重放原通知"}, {"item": "named-card-facts-transport 其他入口/P1/P2", "reason": "独立功能；事件入口已修，父需求其余消费者/量化/自然验收沿原owner"}, {"item": "调度公平性核查", "reason": "独立架构调查；快照不证明永久饥饿，不改队列/并发"}, {"item": "arch-funnel-guard", "reason": "独立架构功能；普通批次只修纯bug"}, {"item": "arch-learning-priority", "reason": "策略/独立架构功能；普通批次只修纯bug"}, {"item": "arch-unified-resource-value", "reason": "策略/架构类；不新增游戏估值"}, {"item": "inv-f33-regression", "reason": "独立归因调查；既有报告和证据限制保留"}, {"item": "codex-brain-cache-probe home续办", "reason": "独立功能；队列明确仅原缓存独立续批实现，不重开旧pair"}], "merged": null, "tests": {"tsc": 0, "vitest": 0, "cases": 3574}, "code_proposals": [], "implementation_domains": [], "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261013-231302/learner/runs/20261013-231332-fix-batch/report.md"}
```
