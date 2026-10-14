# 静默猎手策略队列本批报告

记录时间：2026-10-14T13:55:19+08:00。batch=20261014-134208-s2-strategy-proposal；base=5f520228aa83ac54b4c5a8ade586851d61204f47。

**结果：十项全部waiting；无新源码、提交、live合入或行为版本。** 局部资源差与阶段事实充分，已有诊断子项核实为live祖先；完整候选归属、受控后继与跨战反事实仍不足。

提案交运维路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-134208-s2/learner/runs/20261014-134234-strategy-proposal/proposal.md。逐项局/层/回合、账本、反例、旧/新行为候选及等待条件均在该文件。

## 原始证据与消费者读回

共8293条原行：states 4167、decisions 4071、SL 43、runs 6、run-config 6；每条原offset/length/SHA及冻结字节与只读日志逐一读回相同。关键证据断言46条通过，仅为证据校验，不是源码测试。六局runs与states角色均SILENT/A10。

| 局号 | states | decisions | SL行 | 消费动作 | 候选段 | 可核轮端点/轮窗口 |
|---|---:|---:|---:|---:|---:|---:|
| 751FN9QM9MHQ | 624 | 615 | 6 | 615 | 96 | 83/129 |
| KV0JHNJCKXLS | 686 | 669 | 7 | 667 | 92 | 31/114 |
| YQL8RZ8BWN1E | 582 | 571 | 6 | 570 | 213 | 63/114 |
| L9SGRBB5R698 | 653 | 635 | 6 | 634 | 228 | 65/125 |
| PU80F84P6HPN | 1064 | 1033 | 12 | 1032 | 136 | 103/183 |
| KEN58SH9SLZ6 | 558 | 548 | 6 | 547 | 96 | 70/112 |

既有消费者累计4065动作、861候选段、2336可连接观测区间；777轮窗口中415可核端点、362未知。完整候选认证数0；这表示消费者不认证该量，不表示没有任何合法方案执行。
原完整输入中五局被现行身份门禁拒绝，原因是六条map/route-change元数据无decision_id；751完整输入未拒绝。只在限定读回输入里明确排除这六条无chosen动作的元数据，原行/原错误保留，不重编号、不伪造ID、不放宽生产消费者。详consumer-exclusions.json、consumer-summary.json及各输出。

关键差额：751 T2多5血换多9敌净扣，T7多10血换多6，T13省6但少6；KEN T10多6血换多2，T5省2但能力延后且续问小刀另计；KV T5删毒少7净扣、T1删究极少14，两组都未保血；YQL残壳毒2→8而血26/挡13/自爆41不变；KEN七次耗药逐槽位核实。
反例与未知：省血不必保留能力，毒层不等兑现伤害，本体结束不等战胜；各试后继有变化，没有足够证据把整战结果归单次替换。路线或营火机会也不是实际回复；未喝/留药支线仍未知。

## 验证、记录和边界

既有源码祖先与13叶blob核验见source-audit.json；live只读快照4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac。10相同/3不同，不冒称组合等价；本批fixes=[]、merged=null、版本=null。
tsc=null、vitest=null、cases=null；没有生产代码改动，未运行完整源码测试，未做撤码红绿，也不引用历史成功为本批测试。现行离线证据消费者读回exit0，范围只如上。
只经根ledger.py update追加by=learner:strategy-proposal、proposal/report链接与本批核验备注，既有claim/status/evidence/first_run/prior/version不改；不新建经验、提案ID、不标implemented或shipped。CLI输入、回执及读回保存在本目录。
收尾实际验收：ledger CLI exit0，16项链接和备注逐项读回，受保护历史字段保持；gitleaks对本批工件扫描exit0、结果空。HEAD仍为本报告完整base，git status、工作区diff和暂存diff均干净。详final-verification.json；这些记录验收不替代tsc/vitest或撤码红绿。
无新异议或新机制反证；本批发现的是原宽提案仍未闭合的限制，不强行支持原假设。保持其他角色行为、原始日志、旧提案和失败回执；无联网、LLM调用、play、调度/账号/prompt修改或推送。
路径探查曾遇不存在的loop.ts、silent-potion-holding.ts及glob；已改读实际hand/loop.ts和silent-potion-reference.ts。一次git diff错误把工作树路径当revision，后改用已核完整live SHA；不涉及源码变化或测试失败。

## 逐项proposal_results

```json
[
  {
    "id": "silent-proposal-366288801d9150d9",
    "state": "waiting",
    "reason": "当前预测资源拆项及B2原/替比较已有；缺跨抽弃和续问的完整执行归属、同后继整战对照与独立后期校准，不能拟额外失血阈值。"
  },
  {
    "id": "silent-proposal-85929bdfc8a3fc1b",
    "state": "waiting",
    "reason": "持牌保守项和持有价值未知已有展示；缺F13不喝或留到F17的完整支线，以及重问后毒/荆棘实际归属，不能校准药价或改变弃牌规则。"
  },
  {
    "id": "silent-proposal-efd9f83ee9e1a6dc",
    "state": "waiting",
    "reason": "局部成本充分且预测诊断已有；缺完整实际资源归属、受控整战及独立验证，不能以子诊断关闭原经验提案。"
  },
  {
    "id": "silent-proposal-131042659448ae74",
    "state": "waiting",
    "reason": "资源与能力预测字段已有；跨重问完整执行、逐轮能力兑现和无药/留药跨战支线未联合验证，整项仍未完成。"
  },
  {
    "id": "silent-proposal-990f054036609447",
    "state": "waiting",
    "reason": "两组同盘净资源充分；缺敌回血/毛伤的完整来源、候选末端认证、受控完整后继及路线/休息反事实，不能拟SL或回血门槛。"
  },
  {
    "id": "silent-proposal-e18d3f18e6cac2a0",
    "state": "waiting",
    "reason": "巨兽阶段、占位血说明和饮毒局部事实已有；修改参考排序仍缺受控完整后继、最终资源适用校准与独立验证，不能将展示子项当整项duplicate。"
  },
  {
    "id": "silent-proposal-9733bb80f445aeae",
    "state": "waiting",
    "reason": "残壳收益限制已有展示；缺提前喝/不喝/留药及新参考排序的整战对照，不能认证跨战药值或策略收益。"
  },
  {
    "id": "silent-proposal-c51468c5e8ba6668",
    "state": "waiting",
    "reason": "七次耗药充分；随机选牌/重问后的完整候选净收益、F15不喝及留药到boss的受控支线不足，不能校准跨战预算。"
  },
  {
    "id": "silent-proposal-86a7db08d1a31976",
    "state": "waiting",
    "reason": "T10血价和T5能力延迟充分；缺完整伤源/能力归属、同后继整战及独立校准，不能收窄更差B2探索或调整HP护栏。"
  },
  {
    "id": "silent-proposal-e282a9131b99129a",
    "state": "waiting",
    "reason": "双向取舍充分但六试相关；缺完整后继反事实与独立后期校准，不能由子诊断关闭原经验提案或拟统一血价。"
  }
]
```
