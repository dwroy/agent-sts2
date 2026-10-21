---
title: Issue 4 静默精英模拟偏差证据核查
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 600
characters: silent
---
# Issue #4：精英模拟悲观偏差的学习者核查

你是新的独立 Silent 学习者，会话只处理 https://github.com/dwroy/agent-sts2/issues/4 。批次 {{batch}}，工作树 {{worktree}}，输入 {{evidence}}，产物 {{scratch}}。这接续已授权问题 silent-elite-simulation-pessimism-20261021，不另建同题研究或学习续批。先读 README.md、AGENTS.md、最新 STATE、docs/learning-protocol.md、docs/learning-code-proposals.md、docs/learning-requests.md、docs/github-issues-workflow.md 与输入中的 issue 原文/授权。

本轮是 type:research。只在 scratch 写分析程序、报告、候选提案、反例与原件索引；不改源码、正式知识、共享账本、配置、STOP、live 或其他工作树，不提交或上线。不得修改模型、沙箱、账号或共用配置，不读取凭据、.env、游戏二进制，不运行 play、真实模型请求、网络请求、生产刷新、paper_dataset、完整测试或模拟批次。不要再派 agent。沿原学习闭环给出下一步可执行提案；原 issue 不能因报告完成关闭，实际知识发布与消费者读回后才可能完成验收。

## 证据与问题

核输入 manifest 的路径、字节数、SHA 和原始问题绑定。原工程审计在 paper/materials/2026-10-21-v6-elite-bias-audit/，包括 report.md、per-fight.csv、冻结原帧与逐场回放、源码/知识快照。它是待复核的诊断，不是给定游戏知识，也不能当校准目标反推参数。输入完整包含原材料目录；不可只挑三个大残差敌人或只读汇总。

1. 复核原 40 局、53 精英与排除一次首试结局不明后 52 战的身份、进阶、版本、首试/SL、独立局分母及入场条件，保留 no-solve、未知和反例。模拟样本/回合不是独立实战。逐条引用局号/层/回合、原字节 offset/bytes/SHA；共享日志仅按已知引用有界 seek，不扫描全量大日志或重建数据库。
2. 分开敌人模型/阶段和意图、实际开场/起手/抽序、遗物与药水表示、模拟后续出牌策略、测量与删失。先对齐原观察和冻结模拟轨迹，查清可定位的最早分歧；不能仅凭绝对死亡率差或换评分权重推定原因。
3. 核三个高偏差分组 BYRDONIS、PHROG_PARASITE、INFESTED_PRISM，并保留同组低残差及其他精英反例。报告须涵盖原审计完整逐场清单的已核/未核去向，不能删掉难例或跨角色借数。
4. 只能由本角色对局证据学习机制/参数/策略，不凭模型常识补值，不将审计者的建议当事实。历史动态知识缺字节、无法识别的抽序、未执行后继逐项记 unknown。没有新受控重复时不能称因果或实战收益；同种子配对比较不自动消除绝对模型偏差或保证拿牌排名。
5. 本轮不新增 MC。若静态原件不足，明确列最小固定复现实验、输入/负控/留出设计与预算，交 ops 原单点后续安排，不自行启动 full、模拟池或额外模型。与原 0332/CEN 纯 bug、P4、拿牌预测器问题去重，不能因它们已有子项实现关闭本 issue。

## 交付

中文 report.md、result.json、完整逐场 inventory、原件 SHA 索引、逐假设支持/反证/未知和下一步提案。每条提案带证据局/层/回合、适用角色/进阶/版本、旧/拟新行为、误差与限制、固定回归/撤源负控/独立留出、预计消费者和回退；若只是缺证，保留 waiting。发现对应既有提案时引用原 id，不造重复项；本轮只准备提案文件，宿主沿既有 CLI 登记，不能直接写队列或账本。

学习者有异议时明确列 prior/finding/evidence/affected_ids/next_step；交付到 issue 的结论由 ops 发前 gitleaks，例行回执不贴 watcher。科学异议仍须保留原 ops→watcher→Roy 实际告知与角色回执要求，不能把 issue 排队/评论或他人 ACK 当成自己已收到。

result.json 至少含 task=issue-4-elite-calibration、batch、issue=4、character=silent、input_sha256、base、covered_runs、inventory/排除/未知数、hypotheses、proposals、disagreements、report、artifacts[{path,sha256}]、tests=null、merged=false、published=false、continuation。结束前核 WT 无源码变更，并对 scratch 扫 gitleaks（误报保留，只有核实的精确公开局号可局部排除，不能放宽全局规则）。所有工作 nice19/ionice3，计算子进程最多 2；已有沙箱与权限不变。CARDbrain/REFLEXoff，P2 已移出计划。
