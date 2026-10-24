## 修 bug 回报
- 合并基线：main → 520a2b7a3771dac00fc7d6126ae26c2fc6275edc
- 修复（每条一行）：无已提交修复；两个候选保留在工作区及独立补丁中。
- 已被别人修掉的：core-build-notify-222802-rc2（失败诊断子项） — 5c92f2aaf0b758a1a5e7d591745694004664f83a
- 已被别人修掉的：codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：ascension-up目标误当实际进阶 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7
- 已被别人修掉的：infra-learner-launch-shared-main-config-race（有界启动恢复） — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2
- 已被别人修掉的：infra-target-options-fixed-fixture-timeout — c57105ca66bd75c6d6952772dcf712399eda828b
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018 — 0b240cbd109a5e004f010d9659a871204c455639
- 已被别人修掉的：infra-manual-learning-notice-ack-scope-20261019 — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee
- 已被别人修掉的：infra-ordinary-close-candidate-failure-isolation-20261020 — b675eb67f3687fb137434ef9610f1503edbbe8bc
- 已被别人修掉的：infra-v6-publication-task-link-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：infra-ordinary-unassigned-tick-no-change-20261020 — ca6897f2e433c9c3bb45d0dad46ba685d864c87d
- 已被别人修掉的：infra-proposal-repair-no-source-waiting-20261023 — 86b3b1721b4b6ad4db48b0279504144e490db010
- 已被别人修掉的：h1-budget-completion-health-contract（R394 indifferent） — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9
- 已被别人修掉的：h1-b2-margin-sample-identity — 660b194c950f017e356a4b3da952e127c7e5c768
- 已被别人修掉的：retention UUID scratch归属 — d91236326bc1af7a5417ce016c1a182f8084e7a3
- 已被别人修掉的：retention旧经验布局归属 — 0699b05c436d3d51d00ee92f153d16d16e64bea4
- 已被别人修掉的：历史事件流同秒重名 — b6ee3f8c29cc10d4652a67d14f0e0e394aa6ce6f
- 已被别人修掉的：strategy-proposal报告scratch归属 — 5f04139cefe5c651dd5bf62f7e164014dbf5f23b
- 已被别人修掉的：postmortem-capacity-failure-proposal-repair — 3fdcd77927f01b35c20c6c5c1fcfd790676032d2
- 已被别人修掉的：learning-notice-ordinary-ack-registry — 672e198a4730012330f599068a0ef1efadb02002
- 已被别人修掉的：共享经验固定文件系统快照 — 8390c62d76fc8c7d7b6b7292121a621f4666d39c
- 已被别人修掉的：历史cap30消费者夹具隔离 — ec8c578b66bf5498372f1b779ae58a766dff8112
- 已被别人修掉的：infra-stall-between-run-quiet — 21a9c52484f04d510bd397959c958ec9767f1d2d
- 已被别人修掉的：infra-h0固定时钟/报告文件关闭/Herdr退出夹具子项 — 9aec57cd7bf8d6c5f67bdaa6b5b9bc115df73239
- 已被别人修掉的：infra-h0重复workspace预置夹具 — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4
- 已被别人修掉的：外部strategy报告JSON合同 — d23925417fbac45cfc7b68218a72cb6042ecdb4f
- 已被别人修掉的：kb_strategies宽查询有界封包 — 91fd612628405d84d84fa9b957650378ca149b74
- 已被别人修掉的：#36显式service_tier覆盖与短agent名 — cb11e5f5beaf2d9ce1320b4222d435dc9cdf0de1
- 已被别人修掉的：ops/learner_tabs.py发布缺口 — aab5613eee3a548badd7d3df18798f522cba375f
- 已被别人修掉的：silent-0254无COMBAT决策死亡战斗漏记 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 没修的：infra-run-config-git-status-enobufs-20261023 — 候选已完成固定红绿和最终tsc；原完整沙箱出现EPERM等失败且尚无终态退出码，按提交前必须exit0的任务要求未提交、未合入；独立补丁及工作区修改保留
- 没修的：silent-0617 遗物energyPrefix图标重复数字 — 候选已完成固定红绿和最终tsc；原完整沙箱出现EPERM等失败且尚无终态退出码，按提交前必须exit0的任务要求未提交、未合入；独立补丁及工作区修改保留
- 没修的：游戏机制/出牌/药水/SL/终局及路线策略条目（含silent-0516/0579/0581/0604） — 策略类；按任务边界沿已有strategy-proposal链，不重复实现，不补游戏知识
- 没修的：v5-dpr-health/H1在V6奖励及战斗选牌路由中的监测适配 — 太大；当前summarize仍按旧V5及boss_sim路径，需要原六叶候选、正式V6计算回执和负控的独立组合验收，不能按开关全豁免
- 没修的：infra-v6-refresh-invalid-json-provenance-20261020 — 证据不足；原全流坏行归属和覆盖契约仍需原owner核定，不静默跳行或重写原流
- 没修的：20261022-231302-s2账本补链接回退既有shipped及历史上线时间 — 太大；当前CLI仅有物理/Git前缀分歧保护，需有原发布证据的更正入口并区分真正新学习和纯补链；不直接改历史账本或伪造新shipped_at
- 没修的：框架合后检查分段续验及外层1200秒超时处置 — 太大；涉及发布锁/精确树覆盖/回退和进程身份，需原框架通道独立实现，保原失败及已过分段证据
- 没修的：调度公平性核查及arch-*独立功能/归因调查 — 策略类或独立功能；不属于普通fix-batch纯bug
- 没修的：core-build-notify历史rc2的安全恢复（诊断子项已修） — 证据不足；当前保留失败stdout/stderr和幂等身份，但历史是否实际送达未证，不自动重发或代称成功
- 没修的：sandbox-glob-startup-race上游扫描/删除生命周期根因 — 证据不足；有界启动恢复及租约绑定子项已修，具体删除者/上游扫描身份未证，不放宽deny或更改账号权限
- 测试：最终 tsc exit0；新增固定回归2文件/6用例/exit0，撤掉两项各2失败1通过/exit1；阻塞定向复验4文件/18用例/exit1；原完整沙箱仍运行、无终态退出码。
- 合入：未合入；未执行 live 合并、上线记录、eval编号或账本状态更新。
- 需要 Roy 定的事（没有写「无」）：无

候选与验证明细：

- infra-run-config-git-status-enobufs-20261023：agent/src/eye/run-config.ts；测试 agent/tests/run-config-git-failure.test.ts；补丁 /home/dw/Projects/agent-sts2/learner/runs/20261024-231333-ebc6a6f1-1752-4166-946b-ff34a88aa315-fix-batch/run-config-candidate.patch。
  证据：R417八局16条run-config；Y3824FJLSUXY等，开局记录不适用战斗层/回合；原审计paper/materials/20261023-issue33-natural-followup-ops/config-audit.json。撤源码：2失败/1通过；exit1；恢复后：3通过；exit0。
- silent-0617 遗物energyPrefix图标重复数字：agent/src/knowledge/relic-values.ts；测试 agent/tests/relic-energy-prefix.test.ts；补丁 /home/dw/Projects/agent-sts2/learner/runs/20261024-231333-ebc6a6f1-1752-4166-946b-ff34a88aa315-fix-batch/relic-render-candidate.patch。
  证据：P4ZBYNW92PPK A10 F48 T3；silent-0617；原提案silent-proposal-4976c043ffdcd610；原relic-render-repro.json。撤源码：2失败/1通过；exit1；恢复后：3通过；exit0。

测试与范围说明：

- 原命令 bash tools/test-sandbox.sh 在 tsc 通过后因共享 node_modules/.vite-temp 为只读（EROFS）退出1；configLoader runner 已通过 paths 11项验证后用于原完整入口，不改变固定排除名单。
- 原完整命令 bash tools/test-sandbox.sh --configLoader runner 从第一候选开始；运行中补充显示候选，并执行其独立撤码/恢复验证。原完整失败日志不冒称最终源码全覆盖或整套通过。
- 阻塞定向复验：brain-agent-codex listen EPERM 127.0.0.1、learner-wrapper-scripts spawnSync git EPERM、strategy-external spawnSync nice EPERM。后者Python直接运行22项通过；Node包装失败保留。
- check-imports原失败是未展开的已跟踪 paper/materials/issue29-brain-speed/results.jsonl；已按授权materialize，HEAD=520a2b7a3771dac00fc7d6126ae26c2fc6275edc、blob=b84d95c5185941eec143cbcf2966d5770309cca5、211076字节；恢复后1文件/1用例/exit0。原失败日志不改写。
- 新增回归只用代码内固定文本与Git结果mock；没有调用LLM或网络，不读取刷新中的知识JSON。遗物候选只修图标单位的重复数字，不补未知每轮能量，不改费用机制或策略；普通遗物/铁甲战士已知文本有固定回归。
- 原完整检查中的codex-saving固定批处理耗时约370秒后失败；没有改时限、排除或生产配置，根因不作推定。
- 两个源码撤改均使用精确单文件备份和EXIT恢复，保存git diff --binary及新增测试；没有复制完整仓库。
- candidates.patch gitleaks stdin --redact：exit0/no leaks；git diff --check通过。
- 未提交，所以没有可登记的提交号；silent-0617保持observed，未伪造proposed/shipped或implemented。run-config搜索未找到属于本缺陷的bug-infra条目，不误用仅提及ENOBUFS的silent-0604。
- 队列未修改；31项去重仅对应列出的已修子项，不关闭原策略/科学父要求。原提案不重复登记。
- 未推送、未运行play、未改运维prompt、账号或共享配置。

保留文件：git-sandbox.log、git-without-fix.log、relic-without-fix.log、final-fixed.log、final-tsc.log、blockers-targeted.log、external-python-direct.log、imports-restored.log、两个独立候选补丁及resolved-ancestry.json。

```json
{"task": "fix-batch", "base": "520a2b7a3771dac00fc7d6126ae26c2fc6275edc", "fixes": [], "skipped": [{"item": "infra-run-config-git-status-enobufs-20261023", "reason": "候选已完成固定红绿和最终tsc；原完整沙箱出现EPERM等失败且尚无终态退出码，按提交前必须exit0的任务要求未提交、未合入；独立补丁及工作区修改保留"}, {"item": "silent-0617 遗物energyPrefix图标重复数字", "reason": "候选已完成固定红绿和最终tsc；原完整沙箱出现EPERM等失败且尚无终态退出码，按提交前必须exit0的任务要求未提交、未合入；独立补丁及工作区修改保留"}, {"item": "游戏机制/出牌/药水/SL/终局及路线策略条目（含silent-0516/0579/0581/0604）", "reason": "策略类；按任务边界沿已有strategy-proposal链，不重复实现，不补游戏知识"}, {"item": "v5-dpr-health/H1在V6奖励及战斗选牌路由中的监测适配", "reason": "太大；当前summarize仍按旧V5及boss_sim路径，需要原六叶候选、正式V6计算回执和负控的独立组合验收，不能按开关全豁免"}, {"item": "infra-v6-refresh-invalid-json-provenance-20261020", "reason": "证据不足；原全流坏行归属和覆盖契约仍需原owner核定，不静默跳行或重写原流"}, {"item": "20261022-231302-s2账本补链接回退既有shipped及历史上线时间", "reason": "太大；当前CLI仅有物理/Git前缀分歧保护，需有原发布证据的更正入口并区分真正新学习和纯补链；不直接改历史账本或伪造新shipped_at"}, {"item": "框架合后检查分段续验及外层1200秒超时处置", "reason": "太大；涉及发布锁/精确树覆盖/回退和进程身份，需原框架通道独立实现，保原失败及已过分段证据"}, {"item": "调度公平性核查及arch-*独立功能/归因调查", "reason": "策略类或独立功能；不属于普通fix-batch纯bug"}, {"item": "core-build-notify历史rc2的安全恢复（诊断子项已修）", "reason": "证据不足；当前保留失败stdout/stderr和幂等身份，但历史是否实际送达未证，不自动重发或代称成功"}, {"item": "sandbox-glob-startup-race上游扫描/删除生命周期根因", "reason": "证据不足；有界启动恢复及租约绑定子项已修，具体删除者/上游扫描身份未证，不放宽deny或更改账号权限"}], "merged": null, "tests": {"tsc": 0, "vitest": 1, "cases": 18}, "code_proposals": [], "implementation_domains": [], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261024-231333-ebc6a6f1-1752-4166-946b-ff34a88aa315-fix-batch/report.md"}
```
