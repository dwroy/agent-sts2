# 策略队列处置回报

记录时间：2026-10-12T01:21:21+08:00（写前date）。

本批10项均保留waiting，但原因已重新核验并纠正：3个子范围已经在live，不重复实现；普通紧勒有既有未合候选；其余价值/SL或组合结论仍需具体证据。没有源码、知识或参数修改，没有提交、合入、新版本或shipped登记。

- batch：20261012-011302-strategy-proposal；角色silent；普通队列，不属于专题或三原提案扩授权请求。
- 初始和最终基线：`817632b7893e37a8b02b21ae0ce90972688aa32b`；`git merge --no-edit main`返回Already up to date。
- 本次核验live：`079dc2f156601556d48727cb14ad48fb95994afd`。
- 完整逐项提案、证据局/层/回合/账本、反例及验证方法：[proposal.md](proposal.md)。机读结果：[report.json](report.json)。
- 本树tracked/untracked可见状态为空，材料均在被git忽略的本批learner/runs目录。

## 合入边界

`git merge-tree --write-tree --name-only live HEAD`退出1；这是预检，没有对生产工作树执行合并。冲突路径14个，另有`paper/materials/silent/20261011-core-cycle-quantitative-learning`目录重命名歧义。路径列表：

- `notes/core-cycle-quantitative-learning-request.json`
- `notes/fix-queue-v4.md`
- `notes/for-roy.md`
- `notes/lessons.md`
- `ops/inbox-dev.md`
- `paper/data/README.md`
- `paper/data/commits.csv`
- `paper/data/decisions_by_label.csv`
- `paper/data/learning-curve-silent.csv`
- `paper/data/runs.csv`
- `paper/data/summary.json`
- `paper/data/verification.json`
- `paper/materials/decision-log.md`
- `paper/materials/learning/ledger.jsonl`

`knowledge/`不在该冲突清单中，但这不等于完成锁内刷新检查。观察到live仅有并行`notes/fight-value-backtest-silent.md`未提交修改，本批未触碰。用户要求冲突即停，因此未进入flock发布、未覆盖请求/账本/并行记录，交原ops协调后续集成。原件：[merge-preflight.txt](merge-preflight.txt)。

## 已核实的live子实现

| 子范围 | 实际live祖先源码提交 | 本批结论 |
|---|---|---|
| 狡诈生成容量、同轮穿插动作及未打出小刀传递 | `6403fdcdadc803a092beb5165a068e22bf51c412` | a099生成子项已覆盖；计划妥当保留与完整后继收益未整包验收 |
| 观察到的王室猛毒开场4血扣费 | `e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a` | 479开场子项已覆盖；未知组合、SL/持药价值仍待证 |
| 观察到的中段重接清旧毒/力量 | `0970bc0d112718d45c8ebf86ff7f84e0f36a7498` | 38a重接子项已覆盖；紧勒和整包联合验收未完成 |

三项均独立用`merge-base --is-ancestor <source> live`核实，且读取当前live消费者/固定测试源码。原候选SHA不一定为祖先，不能仅凭原SHA判断尚未上线。没有把某个子实现的祖先证明冒报成整个提案implemented/duplicate，也没有重跑其历史检查后冒报本批实现。

普通紧勒候选`5c7105ff0294466da8319f2934beda05c6040794`仍非live祖先，当前live普通STRANGLE_POWER接线缺口仍在；缺的是适配/合入验收，不是两条普通无挡证据。详情：[candidate-ancestry.json](candidate-ancestry.json)。

## 证据与限制

原始日志按run_id及角色筛选；16个相关局身份保存于[run-identities.json](run-identities.json)，10个原提案和账本链接保存于[assigned-proposals.json](assigned-proposals.json)、[ledger-links.json](ledger-links.json)。不读其他角色知识，不把runs锚点当完整历史覆盖。K3676LU8B0UH本批仅核角色与原提案/账本链接，未重新抽取其油灯历史窗口；相关结论不扩大。

原始1647决策、1763状态各保留行号、字节offset和原行SHA256；重新seek核验全部一致。固定观测核验15项通过，包含紧勒19→23/27→29、沙虫同盘13损24伤对22损39伤、首boss退出4血后入口死、转向少报1伤、9局42饮的生成3/2/0分布37/2/3。狡诈实际新增卡全部升级，Damage基值6。细节：[observations.json](observations.json)、[source-receipt.json](source-receipt.json)。

这是已有观测的复核，不是模型策略收益测试。局部SL选择以后动作/牌序改变、完整替代线未实打、dirty对局树未完整保存，不能据此拟合通用阈值或宣称胜率提高。资源链对照仍缺，现有单局尝试不能拆成独立训练/验证样本。后续按局与时间切分；未观察进阶/组合保持原分支。

## 验证、失败与记录

没有修改生产代码，因此撤源码失败/恢复通过不适用；未运行tsc/vitest/沙箱生产检查，三项值均为null。没有代码提交，不制造测试成功、游戏版本、合入记录或shipped。

本批观测核验脚本两次格式适配失败原件保留：第一次将dynamic_values列表误当字典，第二次未跳过无chosen记录；修正scratch读取后retry2退出0、15项通过，原始数据没有修改。最初检查旧WQ切片时也遇到行号冒号前缀导致JSON Extra data，之后直接抽取原始日志。以上均为材料解析问题，不是生产代码失败。

原提案id和账本证据链接已经齐全，未重复追加同一历史观察、未新建重复id、未直接编辑台账/队列。本次未实际上线，不触发版本、decision-log上线登记或Roy双通知。运维可据本报告消费10项proposal_results，协调既有冲突；无须用新局掩盖工程未合入。

完整结构化回报：

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261012-011302-strategy-proposal",
  "base": "817632b7893e37a8b02b21ae0ce90972688aa32b",
  "runs": [
    "KEN58SH9SLZ6",
    "TXZ6RVMQA09D",
    "WQZVENQ7DTRP",
    "02HB4L0C3C67",
    "4D4J8USKCPAV",
    "F4QKG4J1AJJZ",
    "JLN5SK17W4FQ",
    "LS8035TB32P3",
    "NB8KCF6HRGVF",
    "S9UZAK0JP0C0"
  ],
  "fixes": [],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-08eaa60bcc449852",
    "silent-proposal-92920295a648b540",
    "silent-proposal-a327449c331efbc1",
    "silent-proposal-a099e89437e942bb",
    "silent-proposal-47910f82a1fdd98f",
    "silent-proposal-f1374df72d8e6a25",
    "silent-proposal-1b9e29122364fa68",
    "silent-proposal-38a49e6c97f31eea",
    "silent-proposal-ef0e38a5dbd3bc07",
    "silent-proposal-cfecb5580938873d"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-08eaa60bcc449852",
      "state": "waiting",
      "reason": "缺同入口不饮用/留至boss的完整后继对照，七次实际饮用与真实回复不能校准留药价。"
    },
    {
      "id": "silent-proposal-92920295a648b540",
      "state": "waiting",
      "reason": "缺同抽序和相同后续动作的连续通关对照；未校准的0%不能拟SL阈值或终局血价。"
    },
    {
      "id": "silent-proposal-a327449c331efbc1",
      "state": "waiting",
      "reason": "六次尝试未提供同后续受控胜局；局部9血/15伤与4血/延时不足以拟固定血价或改变SL排序。"
    },
    {
      "id": "silent-proposal-a099e89437e942bb",
      "state": "waiting",
      "reason": "生成容量与同轮穿插子项已由live祖先6403fdcdadc803a092beb5165a068e22bf51c412覆盖；未来保留选择、未观察饮药触发及完整后继收益尚未验证，整项保留waiting。"
    },
    {
      "id": "silent-proposal-47910f82a1fdd98f",
      "state": "waiting",
      "reason": "开场扣血子项已由live祖先e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a覆盖；SL血价、留药及未知开场组合仍缺完整后继/结算时序证据，不能整项关闭。"
    },
    {
      "id": "silent-proposal-f1374df72d8e6a25",
      "state": "waiting",
      "reason": "缺早饮/留药实际完整执行及相同营火条件的后继对照；不能从两条失败资源链校准药价、护栏或终局权重。"
    },
    {
      "id": "silent-proposal-1b9e29122364fa68",
      "state": "waiting",
      "reason": "普通无挡分支证据已足且已有候选5c7105ff0294466da8319f2934beda05c6040794；该候选仍非live祖先。本次合入预检有14个冲突路径及目录冲突，依任务停止，缺当前基线适配、实际合入与合后验收回执；不是缺同分支游戏证据。"
    },
    {
      "id": "silent-proposal-38a49e6c97f31eea",
      "state": "waiting",
      "reason": "中段重接重置已由live祖先0970bc0d112718d45c8ebf86ff7f84e0f36a7498覆盖，再生已有代码分支；普通紧勒候选未合，临时敏捷分源、荆棘致死相位与阈值/SL时序整包联合验收未完成，且存在合入冲突。"
    },
    {
      "id": "silent-proposal-ef0e38a5dbd3bc07",
      "state": "waiting",
      "reason": "缺相同入口下替代路线、休息/锻造、用药及完整后继战对照，尚不能校准路线、持药或终局门槛。"
    },
    {
      "id": "silent-proposal-cfecb5580938873d",
      "state": "waiting",
      "reason": "复核证实当前转向公式在该现场少报1；本批未完成可追溯原始招式底值及力量/虚弱组合的联合取整验证，不将floor全改ceil或凭显示1猜底值。合入预检冲突亦未消除。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-011302/learner/runs/20261012-011311-strategy-proposal/report.md"
}
```

最终材料检查：本批身份/提案集合未变；全部原提案SHA一致；gitleaks材料扫描退出0、发现0。15项原始观测检查通过，生产测试仍为null，工作树干净。回执见final-verification.json。
