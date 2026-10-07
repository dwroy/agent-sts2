# 策略提案实施回报（未合入）

记录时间：2026-10-07T16:58:31+08:00。

本次已独立实现“静默推演覆盖与参考排名事实”，提交 `45161a51c2c6b7e4a499b13cf749c4108193bbf5`，分支 `strategy-proposal-20261007-160418`。merge=live 已实际尝试，但 main/live 的知识数据、eval版本、复盘、论文表、决策日志和账本等32路径冲突；按任务停止，已中止合并，live恢复 `606855106dfb90ca8ffe27b985ed3c3b3f2424a2`，无MERGE_HEAD、工作树干净。源码不是当前live祖先，没有上线版本、上线记录或合后测试，不冒称已上线。

## 提案、证据与学习账本

提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-160418-strategy-proposal/proposal.md。代码提案来源 silent-proposal-f2bfceddb1898dca 的事实展示子项；完整预算提案仍waiting。既有账本 silent-0106／silent-0019／silent-0201，本次独立登记 silent-0239，所有本会话操作均经根目录 ledger.py，status=proposed、by=learner:strategy-proposal，未登记shipped。

三来源局 JMH5C51RLN4E、9TG1RP5LFAAK、VLZ6CCT8AQ0A 已从runs.jsonl核对均SILENT、A10。实际本项证据只取 VLZ6CCT8AQ0A F45 T1/T4：269748为药水1/12、707ms和退化1回合/1样本、best=null无并列；269754为药水12/12、11ms，但后续5回合仅3样本、仍有clock削减；269770为5回合8样本、明确plan2/3/4并列，攻击参考31损/32伤与另一线13损/24伤分列。两帧状态275722/275746和三条决策共五条原始日志按字节偏移回读、逐对象相等，并保存原字节SHA256；见 evidence-manifest.json。

实现仅在静默实际Jev原题及v1视图增加simulation_reference，分列推演覆盖、抽样、耗时、未知牌、含抽牌需核验、明确并列与无比较。保留只展示部分并列组的原计数，最佳线未展示时明确outside_shown。撤掉静默全局exact保证；当轮与有限推演结局分账，回退封顶不包装为死亡样本。保留所有选项、分数、预算、执行解析、药水规则与SL；铁甲原题等价，无新游戏常量、无角色知识混用。源码提交仅四文件，不携带启动工作树的旧荆棘/预算夹具修复。

## 验证

- 最终撤实现及集成：exit1，新增11例中8失败、3通过，cases-red-submitted.log。保留空导出检验缺行为而非导入失败。
- 恢复最终源码：exit0，新增11例与87导入/边界相关共98例通过，cases-restored-submitted.log。
- 最终提交前原沙箱：`bash tools/test-sandbox.sh --reporter=verbose`，SANDBOX_WORKERS=4，tsc0、vitest0；主232文件2430例加paths1文件11例，合233文件2441例全过，source-sandbox-submitted.log；退出0。
- 最终暂存gitleaks扫描exit0，source-gitleaks-submitted.log。没有npm install、在线LLM、play或推送。
- 初稿2测试失败、第一次整套2失败、错误cwd的离线ENOTCACHED、早期红绿与第一轮全过均保存；第一次整套tsc0、232文件2429例中2427过2败，原因是本次临时.ts备份与直接类型导入边界，修正备份后缀/结构化事实输入，不改旧断言或排除。不存在高负载超时重跑；后续重复整套由真实修正触发。
- 合后tsc/vitest未运行，因为实际合入冲突已中止；沙箱外完整套件未运行，等待实际集成后由调度器补验。

## 合入尝试与运维交接

锁：`flock /home/dw/Projects/agent-sts2/ops/live-merge.lock`。已按指定pgrep模式等待构建器；锁内无未提交刷新知识，刷新提交跳过；当前刷新路径与分支的交集为空。实际merge仍因两分支已提交历史和知识分叉冲突，清单32项在 live-merge-conflicts.txt，原日志 live-merge.log。已merge --abort，保留原live `606855106dfb90ca8ffe27b985ed3c3b3f2424a2`；无源码进入live、无版本、无上线记录、无知识重建、无读档/停局/play。

请运维兜底集成仅四文件的源码提交 `45161a51c2c6b7e4a499b13cf749c4108193bbf5`，保留live知识及历史；实际合后自测通过、版本登记后再经ledger.py/by=ops将silent-0239标为shipped。此任务没有授权解决notes/paper历史冲突，因此没有续做冲突消解或另造合入。

未实施：预算重新分配、留药/目标优先级缺同盘稳定性和实打对照，保留原行为；神化升级传播为silent-0237/0238独立提案，仍未建模；连续boss相关已有/独立并行实现不重复修改。未证明整场胜率改善。

完整冲突清单：

- eval/versions.json
- knowledge/characters/silent/boss-damage.json
- knowledge/characters/silent/fight-value-gates.json
- knowledge/characters/silent/fight-value.json
- knowledge/characters/silent/monster-records.json
- knowledge/characters/silent/outcome-stats.json
- knowledge/characters/silent/room-costs.json
- knowledge/common/card-upgrades.json
- knowledge/common/monster-db.json
- knowledge/common/move-model.json
- notes/fight-value-backtest-silent.md
- notes/fix-queue-v4.md
- notes/for-dai.md
- notes/lessons.md
- notes/ops-handoff.md
- ops/inbox-dev.md
- paper/data/README.md
- paper/data/commits.csv
- paper/data/cost-curve-silent.csv
- paper/data/cost-silent.csv
- paper/data/cost-sources.json
- paper/data/cost-unattributed.csv
- paper/data/decisions_by_label.csv
- paper/data/learning-curve-silent.csv
- paper/data/runs.csv
- paper/data/summary.json
- paper/data/verification.json
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl
- paper/materials/silent/20261007-1315-events.md
- paper/materials/silent/20261007-1346-events.md
- paper/materials/silent/cost.md
