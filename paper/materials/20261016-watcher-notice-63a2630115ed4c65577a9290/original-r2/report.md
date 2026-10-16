# silent-0332 revision 2：诊断实现和限定经验已准备，交付受阻

本阶段没有修复根缺陷，也没有原失败的精确固定重现或实际live交付。新增诊断源码10叶保留为暂存补丁；限定经验独立提交79f65431cb8fcb998219d9c334777d432fb8fed1，未合入live。原请求、旧failed/rc0、旧错误/台账及六原提案全部保持。

## 冻结输入与边界

r2输入SHA逐字匹配42e1109c87911b5df200d332d1e9f9037e3c0770647395c45ba7c4a39d6ce0cf；六份原Markdown逐SHA匹配。开工干净并先FF main至7ce4afa2bdcf2f7ec2e96bec11f3594973c1c88b。7f658abe742c5b62d14ff9f8047ac11837d10489已核base/main/live祖先；五个相关源码叶在开工base/live同字节，最终10个受影响源码/测试路径的live提交内容仍与源父相同（四个新增文件两边尚无）。
只复用既有RQ/DHY/TCD等封套及原183355三条TCD核验；新增直接读回RQ F40原失败行SHA ba875e41d63753a069b6bb20aaff10ad57424c9ace2ad8b91a59ee45cc69eefd。没有重扫全历史、8192模拟、模型实验、真实LLM/API、额外对局、A/B或校准。
原RQ F40 seed607614716与TCD F40 seed76490739的错误在worker内continuationInput已出现，早于worker返回；singleFightSample的won和resources来自末TurnRecord。该nonpositive-hp分支不等于父进程漏字段。是否由solver outcome、终局顺序或其他来源产生，旧完整输入/末资源/轨迹缺失，无法确定；当前代码中的胜利优先分支只记为候选位置，不冒称原根因。

## 逐项验收

| requirement | 新增产物与实际结果 | 尚缺内容 |
|---|---|---|
| silent-0332-trigger-and-resource-boundaries | frozen-inputs-and-source.json、producer-boundary.json；限定经验 silent-0332-continuation-contract-boundary，canonical SHA b8701fdb9e5f72671d5e1699be2fe00407ab72826ebe9c99ba886609b92de231 | 经验仅在本分支，非live引用 |
| silent-0332-fixed-failure-and-repair | 完整失败封套源码；合成契约/真实worker handler/主进程C1接线红3、恢复32过 | 原失败完整输入、首处分歧、根修复及原失败红绿仍缺 |
| silent-0332-live-source-and-knowledge-consumer | 本工作树实际知识文件加载/渲染0；Silent A10适用、A9/铁甲不消费；实际live探针1，断言条目不存在 | 源码提交、窄合/发布号/双通知/精确宿主及实际live passed回执 |
| silent-0332-objections-and-unresolved-scopes | 未发现需要反驳既有知识的新增机制结论；明确不将F49中位6/救回下降归因为0332，也不把C1出口/诊断当修复 | 未知机制、未观察组合、自然采用和收益保持unknown；根要求及宽父不关闭 |

coverage只允许实际live经验引用，因此四项均空；proposed_experience另列本分支对象，不伪造覆盖或receipt。没有代ops/watcher/Roy填ACK，没有把排队当送达。

## 诊断源码（未提交）

原branch/seed及严格拒绝条件保持。新增独立V8原字节封套，保引用、undefined/非有限数、输入/计划/seed/maxTurns/scripts/kill order、首战原结果及逐轮resourceAudit（原求解steps/outcome、资源和成功标志）；worker另传deck/order/sample/seed，父进程保完整数据。摘要仍按旧160/2000字符边界，完整封套只进独立文件及日志引用，不进入模型题面。
每个payload上限1 MiB、封套文件2 MiB、每run至多16题，一题保首个完整不可变文件；重复题明确current_sample_saved。超限、序列化/校验/写入失败及已有残片均明确不完整，不覆盖原件。合法样本的数值/排序/资源结算、正HP、300最低、C1 pending/degraded、C2、P1/P2/P3、SL药价与预算不改。其他角色仅可能增加异常对象的内部诊断，合法对局行为保持；未加入游戏规则或知识生成器。
源码补丁 source.patch SHA 55fa212892a1c020bc8047590f5b9158f42aaaf6bd3a5193d5180cfbf52a495b；原整套检查树 0a4c12c8b240e627b31ffe10f2767eb5ad10e490（退出1，非绿）；数据提交后的实际暂存树 938e0fef8219cefe9876c57ae8da25245e6fafdd。10叶SHA见source-handoff.json，与原检查叶逐字节相同。源码不能因已有补丁或暂存树冒称source commit/live。

## 固定校验及原失败保留

- 独立生产tsc退出0（tsc-initial.log和原工具退出）；源码/经验gitleaks均0，diff --check 0。
- 首轮5文件22例0；只stash六处生产接线，保新诊断模块和测试以检查集成：3文件中3失败/4通过，分别断在原错误未带typed payload、worker丢封套、B3日志无引用；恢复7文件32例0。不是仅删文件制造import失败。
- 唯一整套sandbox：450文件448过2败；4166例4164过2败；1788.02s。旧shrink 15秒超时、旧global-build-health同步封装spawnSync EPERM（内4Python已OK）。原入口退出1永久保留；没有新增排除或修改断言/时限。
- 原shrink精确用例单worker原15000ms一次补验0（8.74s，1过13未选）；paths补验1文件11例0；直接相同Python4项0且stdout为空。以上是分段覆盖，不把full1改成full0；未重未变源整套。
- 全部新增回归为固定合成契约/故障注入。不能用seed标签或另一随机样本冒称原RQ/TCD失败精确复现；原末资源为何非正仍未知。

## 经验、消费者和账本

知识文件只新增一个去重后的结构限定条目，旧236条逐对象保持；版本2026-10-16.2→2026-10-16.3。只依据RQ/TCD两局A10错误与降级记录，confidence=high仅适用于错误/缺证边界，不支持机制或收益。新条目明确关联silent-0332与六原proposal id；check-experience missing=[]，没有新增同题提案。
consumer-predeploy-*保最初隔离知识夹具读回；consumer-worktree-*读本工作树已提交真实知识文件，实际loadExperience/queryExperience完整输出lesson，A9和铁甲排除均断言通过。consumer-live-before-deployment.*实际加载live，退出1且新条目undefined，证明尚未交付；没有生成或手写passed消费者回执。准备好的consumer-input.json/probe.mjs只能在实际部署后重跑取得新输出和真实receipt。
学习账本只经根learner/ledger.py追加where/note，链接79f65431、经验ID及本报告；原claim/first_run VAC6Z1PZ1QJG/asc/prior/status proposed/version和旧证据前缀已核不变。没有新增support/repeat、没有status/shipped、没有手改账本/注册/learn.json/通知确认。

## 合入阻挡与原ops接续

最终只读live=3f81fcbbdd04a57a38c17c2dcb8cb200ad7bb938；候选知识提交79f65431不是其祖先。对实际候选提交的merge-tree退出1，21项冲突包括：notes/fix-queue-v4.md、notes/for-roy.md、notes/lessons.md、notes/ops-handoff.md、ops/inbox-dev.md、paper/data/README.md、paper/data/commits.csv、paper/data/cost-curve-silent.csv、paper/data/cost-silent.csv、paper/data/cost-sources.json、paper/data/cost-unattributed.csv、paper/data/decisions_by_label.csv、paper/data/learning-curve-silent.csv、paper/data/runs.csv、paper/data/summary.json、paper/data/verification.json、paper/materials/STATE-2026-10-16.md、paper/materials/decision-log.md、paper/materials/discussions/2026-10-16-v5-global-build-direction.md、paper/materials/learning/ledger.jsonl、paper/materials/silent/cost.md。只有只读预检，未取得live锁或修改live/index/刷新数据/版本/上线记录/双通知；未触碰watcher的P1/P2配置。
原ops按已授权兜底：先核本WT原owner结束、10叶SHA及source.patch；在宿主补核未变源原失败封装/固定用例后提交10叶（英文稿source-commit-message.txt）；数据79f65431单独保留。随后在原live锁里保留刷新和21项并行记录作窄合，核真实source/live祖先，再给经验前缀实际分号、date后记decision-log及根双通知，并沿原精确组合宿主检查链验收。不能把旧full1、合成测试或本报告改成根修复/implemented/shipped。
实际部署后运行已保存consumer-input.json/probe.mjs并按真实输出生成receipt；成功也只证明限定经验可读。根缺陷下一步仍需首个真实完整失败封套：原输入/任务/seed/轨迹定位第一处won与资源不一致，才做必要固定根修复回归；不重跑旧大模拟、不造资源、不降300或clampHP。继续原silent-0332/r2，不另开研究父项，不关闭roy-20261016-global-build或其他宽父。

生成时间：2026-10-16T20:23:36+08:00

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "base": "7ce4afa2bdcf2f7ec2e96bec11f3594973c1c88b",
  "runs": [
    "RQCHNN0W72KF",
    "TCDUBRWMEMNA"
  ],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 1,
    "files": 450,
    "cases": 4166,
    "passed": 4164,
    "failed": 2,
    "targeted": 0,
    "targeted_cases": 32,
    "without_wiring": 1,
    "without_wiring_failed": 3,
    "shrink_retry": 0,
    "shrink_retry_cases": 1,
    "paths": 0,
    "paths_cases": 11,
    "direct_python": 0,
    "direct_python_cases": 4,
    "gitleaks": 0
  },
  "code_proposals": [
    "silent-proposal-0b28f52e415d80d1",
    "silent-proposal-ecbd4b68c5fad954",
    "silent-proposal-5aa2672bd7cd1bf4",
    "silent-proposal-f4e0f382dd79714b",
    "silent-proposal-b02a70a29a4ff6b1",
    "silent-proposal-0c0d4600bc7aa80b"
  ],
  "implementation_domains": [
    "structure"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-0b28f52e415d80d1",
      "state": "waiting",
      "reason": "原VAC成功首战的完整输入/末帧未保存；旧诊断7f658abe已核live祖先，新封套源码仅暂存，根修复未完成。"
    },
    {
      "id": "silent-proposal-ecbd4b68c5fad954",
      "state": "waiting",
      "reason": "复用已上线branch/seed诊断；新增有界全封套及worker/主进程接线未提交/未live，不把诊断子项当根缺陷完成或整项duplicate。"
    },
    {
      "id": "silent-proposal-5aa2672bd7cd1bf4",
      "state": "waiting",
      "reason": "按原5aa要求补全输入、任务身份与逐轮结果通道；合成回归通过不能冒充64V原失败精确复现。"
    },
    {
      "id": "silent-proposal-f4e0f382dd79714b",
      "state": "waiting",
      "reason": "仅处理RQ提案中的0332诊断范围；巨像/资源取舍等其余范围未实现，原失败resources/步骤仍缺。"
    },
    {
      "id": "silent-proposal-b02a70a29a4ff6b1",
      "state": "waiting",
      "reason": "DHY六组原失败缺完整末资源；未改正HP/300/C1契约，仍待实际全封套确定根因。"
    },
    {
      "id": "silent-proposal-0c0d4600bc7aa80b",
      "state": "waiting",
      "reason": "已写尺寸限制、题级去重和摘要分离通道，但TCD原失败精确输入仍缺、根修复及实际live未完成。"
    }
  ],
  "knowledge_commit": "79f65431cb8fcb998219d9c334777d432fb8fed1",
  "source_commit": null,
  "source_handoff": {
    "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261016-183355/learner/runs/silent-0332-r2/source-handoff.json",
    "sha256": "49aef7aa05381a0f08711b89c1568d8e70e970e7f7a0409d8b0ba8a62874663d"
  },
  "proposed_experience": [
    {
      "id": "silent-0332-continuation-contract-boundary",
      "sha256": "b8701fdb9e5f72671d5e1699be2fe00407ab72826ebe9c99ba886609b92de231",
      "experience_version": "2026-10-16.3",
      "live": false
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261016-183355/learner/runs/silent-0332-r2/report.md",
  "learning_result": {
    "request_id": "silent-0332",
    "revision": 2,
    "input_sha256": "42e1109c87911b5df200d332d1e9f9037e3c0770647395c45ba7c4a39d6ce0cf",
    "outcome": "blocked",
    "coverage": {
      "silent-0332-trigger-and-resource-boundaries": [],
      "silent-0332-fixed-failure-and-repair": [],
      "silent-0332-live-source-and-knowledge-consumer": [],
      "silent-0332-objections-and-unresolved-scopes": []
    },
    "consumer_receipt": null,
    "questions": [],
    "reason": "原完整sandbox入口退出1：旧shrink用例15000ms超时、global-build-health同步Python封装EPERM。原时限单例复测0、直接Python4项0及paths11项0保留，不能改写full1；按代码提交前入口须0的任务要求，10叶诊断源码仅暂存，交原ops宿主补验后提交。79f65431仅限定经验数据、不是live祖先；普通merge-tree仍有21项历史记录冲突，未改live。实际live消费者因条目缺失退出1，故无passed回执。原失败完整输入仍缺、首处分歧及根修复未完成。"
  }
}
```
