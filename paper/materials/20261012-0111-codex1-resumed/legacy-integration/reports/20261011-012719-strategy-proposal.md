# 策略实现回报：生存者单弃的逐候选手牌与费用事实

已实现并提交 `4b0823f519f1b724d6cff2b1cd50b74146dc4a9d`；沙箱类型检查与2702项测试通过。**未合入 live**：锁内核实已有其他合并的19个未解冲突，未修改该现场。没有新版本、implemented 或 shipped；交运维兜底集成并核实实际发布。

## 批次身份

- batch：20261011-012719-strategy-proposal；角色 silent；普通策略批，reason=tick，无 research_request / proposal_ids / proposal_repair。未承接专题或其他队列。
- 初始干净；`git merge --no-edit main` 返回 Already up to date；完整 base：`5bac765a110a4159247f2695637c6e59e7103e89`。源码提交的父提交就是这个 base。
- 十个派发来源局均核为 SILENT/A10，身份原件 `run-identities.json`；本项实际分析 A5HKP18P4Q0T、N3YHJMV1ATFR，不冒称十局全面复盘。
- 源码、固定测试共4个文件已提交，最终工作树干净；knowledge、经验库、其他角色和运维prompt没有本批改动。

## 提案、证据与边界

提案正文（交运维）：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-012719/learner/runs/20261011-012726-strategy-proposal/proposal.md`。

CLI代码提案：`silent-proposal-48d7b4466ecbcc94`；关联账本 `silent-0205`；来源/实现任务均 strategy-proposal，领域 combat。账本仅经根 `learner/ledger.py update` 追加本批提案与源码链接，status=proposed；保留旧claim/prior/首证/证据和发布历史，未重复写复盘。

| 局号 | 层/回合 | 已核原件 | 支持的变化 |
|---|---|---|---|
| A5HKP18P4Q0T | F14 T5 | d343375/343377，s353126—353131 | 打击、生存者后35HP/8挡/1能量。弃后空翻后实际剩藏宝图、打击，1能量没有退还；再打击保持8挡，对36攻击实损28。若保留后空翻，当前1费牌面8挡/抽2可列为独立条件，不能预支未知抽牌或声称整战必胜。 |
| N3YHJMV1ATFR | F42 首试T4 | d344069/344070，s353850—353854 | code原唯一线生存者→毒爆+报零损/48伤；生存者后2HP/18挡/3能量。弃毒爆后其副本确实消失，仍3能量；各剩余牌只列单独费用，不把拳斗1费、蛇咬2费、毒爆3费同时当可支付整线。 |

15条原件按字节偏移与结构全等核对，SHA见 `raw-verification.json`；原状态与决策在 `states-verified.json` / `decisions-verified.json`，提交测试只用固定投影。

实际 live 已有后继布尔提示，其源码 `97efc0618936c6d7783fbf36e79b056b90d65589` 已验证为 live 祖先；本树main缺这段不代表live缺。本次不复制旧提示，新加独立 `discard_snapshot`，展示移除的副本、留下的当前手牌、当前HP/格挡/能量、原始文本、选择前可打性及逐卡独立能量余额。仅 SILENT/A10、同战同轮最后出牌SURVIVOR、实际PlayCardAction、强制单弃且手牌/选择副本一致时启用。关键资源缺失或映射不一致退回原题面；候选未知费用用null，不猜。

反例与限制：藏宝图不能打，−1费用不能算返能；N3拳斗牌面7伤而实际挡18→28，不能简单把当前牌面当整轮精确挡伤。弃牌触发后的变化需重读，未见抽牌和最终结果仍未知。缺少同盘保留后空翻/毒爆的实战，因此不拟保牌权重、不改护栏、药价、SL或终局价值。所有原弃牌选项保留、Jev仍可选择；未来新局才用于检验采用与收益。

已有两份宽提案 `silent-proposal-23a7ac9ead48e758`、`silent-proposal-0ad95588136023c7` 仅参考其证据，本批没有领取或关闭它们；完整候选伤害/剩血模拟仍待后续证据。本批新提案也尚非live实现。

## 验证

| 检查 | 实际结果 | 日志 |
|---|---|---|
| 原始证据核验 | 15条原行一致，2个固定选择帧 | raw-verification.json |
| 首次固定专项 | 20过；随后补PlayCardAction边界 | targeted-first.log |
| 撤生产入口改动 | exit1，2失败/19通过；两真实题面缺新增字段而失败，非导入/编译失败 | targeted-withdrawn.log |
| 恢复生产入口 | exit0，21/21通过 | targeted-restored.log |
| 提交前 `bash tools/test-sandbox.sh` | exit0，tsc通过；主段265文件2691例，paths另1文件11例；总266文件2702例 | sandbox.log、sandbox.exit |
| gitleaks暂存差异扫描 | exit0，无泄漏 | gitleaks.log、gitleaks.json |
| 差异/身份 | diff --check通过，4文件SHA与被测输入一致，提交后工作树干净 | source-paths.json |

完整沙箱主段852.51秒，paths段3.09秒，正常结束，无超时重跑；没有把等待中的检查先报成功。沙箱固定排除项由原脚本定义，本批未修改排除名单，沙箱外完整套件尚未运行。一次额外只读工具启动遭遇并行临时文件消失导致的bubblewrap glob scan失败，下一次只读重试成功；不是测试失败，原件见 `tool-environment-note.txt`。撤入口前后源码按原字节保存在 `.txt` 材料，未添加临时可执行.ts副本。

## 合入与接续

锁内最后核实 live HEAD=`56268f61928e0330d91293e585efab075839bb4a`、已有 MERGE_HEAD=`a83d9ab675560a177249aa638e99df40bcfb5553`，19个冲突路径和原文件SHA保存在 `live-merge-preflight.json`。本批源码不是live祖先（merge-base检查exit1）。因已有未解合并，未执行本批merge、未提交刷新数据、未abort/reset、未覆盖知识刷新，live_mutated=false。

因此 merged=null、version=null，没有合后测试或上线双通知。运维先处理既有合并现场，再集成 `4b0823f519f1b724d6cff2b1cd50b74146dc4a9d`；集成 selection.ts 时保留live原 discard_plan/后继提示和撤线重算。源码补丁为 `source.patch`，本批仅4文件。实际上线后按既有流程复测、登记唯一版本、双通知、核台账shipped。回退本次独立源码提交即可撤新事实，不移除旧提示。

最终JSON：

```json
{"task": "strategy-proposal", "character": "silent", "batch": "20261011-012719-strategy-proposal", "base": "5bac765a110a4159247f2695637c6e59e7103e89", "runs": ["EWLY3PWDDXJK", "U51W81MEBCLZ", "7S8HCC0M6G9W", "LWQYSREHMMJ7", "3R3LY2HVPPG0", "UV5YK5721RPB", "BHSVN6X84UMN", "U1QYLX1AE1WX", "A5HKP18P4Q0T", "N3YHJMV1ATFR"], "fixes": [{"summary": "静默A10生存者单弃逐候选手牌和独立费用事实", "commit": "4b0823f519f1b724d6cff2b1cd50b74146dc4a9d", "source_parent": "5bac765a110a4159247f2695637c6e59e7103e89", "ledger": ["silent-0205"], "runs": ["A5HKP18P4Q0T", "N3YHJMV1ATFR"]}], "skipped": [{"item": "live合入", "reason": "live已有MERGE_HEAD及19个未解冲突；锁内停止，保留原现场，交运维兜底。"}, {"item": "完整后继伤害/剩血及保牌权重", "reason": "两局没有同盘保留后继的完整实战；弃牌触发、未知抽牌和逐敌结果未受控验证，本次仅实现当前手牌与费用事实。"}], "merged": null, "version": null, "tests": {"tsc": 0, "vitest": 0, "cases": 2702}, "code_proposals": ["silent-proposal-48d7b4466ecbcc94"], "implementation_domains": ["combat"], "proposal_results": [], "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-012719/learner/runs/20261011-012726-strategy-proposal/report.md"}
```
