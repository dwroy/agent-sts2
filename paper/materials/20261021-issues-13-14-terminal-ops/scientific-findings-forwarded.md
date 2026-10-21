
- 2026-10-21T12:08:18+08:00 ops：#13/#14 原学习者五项异议/限定，逐项原文与原始证据引用如下。公开 issue 评论不代 watcher 实读或 Roy 可见通知；原研究身份尚不被现行 ACK CLI 支持，不改名/造父/代理登记，后续两角色回执 pending。原报告和科学父保留。

  Issue #13 / notice 7430982d1c28981e46d44d75；原文 learner/runs/20261021-111653-8735c888-1393-4256-84d9-821d4e4a14ea-issue-13-card-models-task/disagreements.json SHA256 03dffced1675adff2d33b4fcb8b2afa2cd6d1121de30c317bf9c3b395fae15d8；核验 paper/materials/20261021-issues-13-14-terminal-ops/issue-13/ops-audit.json。

{
  "prior": "Issue #13 列出EXPOSE 208、SPORE_MIND 60等unknown标签，容易被理解为独立实盘覆盖。",
  "finding": "重算完全复现原标签计数；EXPOSE的208只来自1局13道题的候选/目标槽，SPORE_MIND的60只来自1局3题。其余卡A标签为11/4/4，不是施放分母。",
  "evidence": [
    "shadow-unknown-inventory.json",
    "coverage.csv"
  ],
  "affected_ids": [
    "github-issue-13-silent-learning-20261021"
  ],
  "next_step": "保留R409原结果；发布与消费者验收按逐卡独立局/真实施放和分支重新计数，不关闭父要求。"
}

  Issue #13 / notice 99c134c7850ae5bae9fb64c9；原文 learner/runs/20261021-111653-8735c888-1393-4256-84d9-821d4e4a14ea-issue-13-card-models-task/disagreements.json SHA256 03dffced1675adff2d33b4fcb8b2afa2cd6d1121de30c317bf9c3b395fae15d8；核验 paper/materials/20261021-issues-13-14-terminal-ops/issue-13/ops-audit.json。

{
  "prior": "silent-0066已shipped；普通EXPOSE在当前消费者known=true。",
  "finding": "这仅覆盖普通Power→易伤。R410升级EXPOSE仍known=false且vulnerable=0；当前CardModel也没有清格挡/全部人工制品的字段。7XS普通清8挡、升级清18挡/1制品/加3易伤均直接兑现。silent-0217修预览消耗，与这些缺口独立。",
  "evidence": [
    "r410-consumer-replay.json",
    "effect-audit.json"
  ],
  "affected_ids": [
    "silent-0066",
    "silent-0073",
    "silent-0208",
    "silent-0217",
    "silent-proposal-00a6a10b15a62b38"
  ],
  "next_step": "复用原机制提案补CardModel/solver/rollout及离手物化、目标语义测试；旧shipped状态不代表本新增范围已发布。"
}

  Issue #13 / notice 3d8e3359ffe4d6992bd3960e；原文 learner/runs/20261021-111653-8735c888-1393-4256-84d9-821d4e4a14ea-issue-13-card-models-task/disagreements.json SHA256 03dffced1675adff2d33b4fcb8b2afa2cd6d1121de30c317bf9c3b395fae15d8；核验 paper/materials/20261021-issues-13-14-terminal-ops/issue-13/ops-audit.json。

{
  "prior": "空rules_text、空dynamic_values且只显示消耗的SPORE_MIND可能可以按零效果known。",
  "finding": "本批仅10行真实手牌、4个局/层/回合键、1独立局，0施放；另有显示昏眩版本。不能证实零效果，也未绑定其生成来源。索引唯一同名施放是非Silent，已拒绝。",
  "evidence": [
    "shadow-card-observations.json",
    "historical-index-discovery.json"
  ],
  "affected_ids": [
    "github-issue-13-silent-learning-20261021"
  ],
  "next_step": "继续unmodelled，等待Silent真实选择/施放与状态后继，不按卡名或其他角色补机制。"
}

  Issue #13 / notice 7dcddb0749fa60e0f2f78f3f；原文 learner/runs/20261021-111653-8735c888-1393-4256-84d9-821d4e4a14ea-issue-13-card-models-task/disagreements.json SHA256 03dffced1675adff2d33b4fcb8b2afa2cd6d1121de30c317bf9c3b395fae15d8；核验 paper/materials/20261021-issues-13-14-terminal-ops/issue-13/ops-audit.json。

{
  "prior": "旧钢铁风暴升级手牌边界已implemented，可能被读作完整生成/自动效果已实现。",
  "finding": "旧71e742提案原文明确只清旧手牌并停线，known仍false；普通0费69776提案也明确尚无完整生成。实际12次施放见N-1刀转换，但32VS净6挡、K643净11挡、其他0挡，不能实现固定格挡或未知奇巧顺序。",
  "evidence": [
    "prior-proposal-boundary.md",
    "prior-proposal-sly.md",
    "effect-audit.json",
    "r410-consumer-replay.json"
  ],
  "affected_ids": [
    "silent-0455",
    "silent-0456",
    "silent-0458",
    "silent-proposal-71e742c6453608bf",
    "silent-proposal-c1dd614cdf7bfc37",
    "silent-proposal-69776c308a3b298e"
  ],
  "next_step": "复用原ID；生成与自动交互分开，先验动态张数和原手牌离手保护，再沿原闭环实现。"
}

  Issue #14 / notice 751e5b79d972608c69f79626；原文 learner/runs/20261021-111653-dbbc4dc0-8ef7-4421-8395-2c1621797aec-issue-14-act3-calibration-task/notice-request.json SHA256 fcbe8d2191c6e5510e04e4815fd7af3a159fb015b7cba923141a99c24c368663；核验 paper/materials/20261021-issues-13-14-terminal-ops/issue-14/ops-audit.json。

{
  "kind": "scope-limitation",
  "prior": "当前整战源码将给定firstPlan直接交applyPlan；初始候选计划不一定覆盖实盘同回合后续补牌。",
  "finding": "SVBEFF首试T1原四步后，实盘另打基础防御及精准切割，25→31挡、预计损1而实际净损0；这是局部可核策略路径差异，尚未证明R410固定回放或整体4.40倍误差的机制根因。",
  "evidence": [
    "/home/dw/Projects/agent-sts2/learner/runs/20261021-111653-dbbc4dc0-8ef7-4421-8395-2c1621797aec-issue-14-act3-calibration-task/policy-prefix-case.json",
    "/home/dw/Projects/agent-sts2/learner/runs/20261021-111653-dbbc4dc0-8ef7-4421-8395-2c1621797aec-issue-14-act3-calibration-task/verified-raw-refs.jsonl"
  ],
  "affected_ids": [
    "silent-0559",
    "silent-proposal-40be025a2ec4528e",
    "roy-20261017-human-pace-h0",
    "issue-14"
  ],
  "next_step": "原owner固定R410单案例逐步轨迹对照；旧验证已读只作诊断/回归，正式候选验收另用未读新局留出。"
}
