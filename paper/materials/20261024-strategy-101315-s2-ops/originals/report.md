# 静默策略补链核验报告

结论：原12条经验的两CLI提案及11账本链接齐全；原批次失败根因是缺来源提交。此次独立完成证据核验和链接附件，不改源码/知识，不制造来源提交、live合并、版本或测试通过。两提案waiting，原failed/rc0及科学父要求保留。

## 身份和边界

工作树/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-101315-s2，开工干净；git merge --no-edit main返回Already up to date，完整base/HEAD为d93277a95c4c894ccc946193a399228ed92cdae2。本批learn绑定task=strategy-proposal、character=silent、reason=proposal、proposal_repair=20261024-091302-experience-update；没有proposal_ids/research_request/implementation_request。普通专题绑定为另一旧batch，故不承接专题，不读其他专题或领取其他队列。独立执行、无下级、无网络、无play。

必读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol及learning-code-proposals均已读。STATE的历史STOP与后续decision-log恢复记录分别保留，不据旧快照干预运行。未修改档位/账号/服务配置，不把任务文字当实际native档位回执。

十局runs.jsonl均显式SILENT/A10、ended非空、victory=false；每局仅一条已结束记录。runs源冻结455331 bytes，SHA561b79baaa17c10c53ee467f6142655bc17f78a53c867077d6943ab9e7bbd6eb。逐行ref见evidence/runs.evidence.jsonl。

| 局号 | 终层 | decision数 | Jev行数 |
| --- | --- | --- | --- |
| 2PQK67ULZY90 | 40 | 857 | 206 |
| J2VR2DFJG8K4 | 22 | 391 | 144 |
| J5E7A3MS9NSH | 23 | 402 | 100 |
| 0NMF36KX3F7Y | 17 | 451 | 206 |
| 559UJVNHZ5NM | 24 | 423 | 102 |
| U6JELGQTBMHN | 28 | 453 | 137 |
| 9W38TRGPJW9Q | 17 | 510 | 108 |
| NRZAYVRMM7M0 | 17 | 422 | 112 |
| KCA04Q3SEYTF | 17 | 562 | 139 |
| DGLWTQGRAT1T | 23 | 393 | 76 |

## 原件与机械提证

已运行宿主evidence_summary.py和本树extract_evidence.py（nice19），实际读取新manifest。摘要SHA为b5e0025a03ba9e3e5a8394ede6e699f78e537ea6cb3f9cf0967fc98f9b051fe0；它只是索引，不替原题和状态。

| 流 | 冻结字节切点 | 原流SHA256 | 本批选中行 |
| --- | --- | --- | --- |
| v6-build | 64753212 | 1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3 | 0 |
| jev-prompts | 3241467184 | 7138c0666b0abd24e15bb3d26391de3852c04428b43d8b1a296e928bd4ee6467 | 1330 |
| decisions | 4644901516 | d6b46b9b2a30f6a21390846d316bf0f040dcbc9ee0a08de892a324d9f7eb4ccd | 4864 |
| run-config | 3332674 | 771dc8eb013453c7849fef0757d0ae4544ccbb4554b22e4418824d4e7f9064cb | 11 |

summary与extract各自冻结：summary的decisions切点4644703428，extract为4644901516，不混写成同一切点；实选4864条decision，不作近邻归属。仅显式run_id/state.run_id/fingerprint.run或原decision精确ID建立身份；本批Jev身份出处逐行保留。全流decisions的unknown_identity=1934、unmatched_decision_id=1782为身份缺口，不归本批；decisions坏JSON2行、Jev坏JSON1行均保留ref，不能填零或推断角色。没有截断行报告不等于无历史缺口。

V6-build在64753212字节/689行中十局均no_match，输出空文件SHA e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855。11个run-config（0N两条）实际construction=V5/shadow，v6字段缺失；历史无匹配不是V6已采用或收益为0。故entries/jev_answer/fallback/unknown都没有可归本批的V6证据，保持未知/不适用，不借其他局补齐。

Jev 1330 request、1244有answers、86有error分开计数。逐行coverage记录在jev-coverage.json。仅以下两题完整request、全部候选、答案已读，另外1328题未逐题通读，原因是本批仅修复已指定经验链接；错误行也仅机械索引，不能称错误题全部读完。U6 d428650、0N d427760在本批均未完整读，不继承上一批的覆盖声明。没有用最后五条作完整覆盖。

原始逐字题面raw-jev-*.json保留原字节，question-decisions.json保留原decision；42条实际动作在execution-decisions.json，战斗原state为combat-states.json加559-states.json（去重44帧）。营火41条原decision、82帧原state均seek/SHA复核，原state截点17026867203来自旧冻结索引，逐帧offset/bytes/SHA重新核实，不声称重新扫描全部17GB或全部历史。

extract内容存储回执pending_host_seal=true/deferred_errno=18，本树实际证据文件可读且核SHA；不称宿主已封存对象。

## 两题执行与真实后果

559UJVNHZ5NM F24T1，原Jev行67116，offset1588435207/44843 bytes/SHA169b3c4f06e69490152479042765384e11b7993a0ee0c5112ba963f93b1db267；精确decision_id=1d7cfd64-71a4-4ae5-b4e9-9c91d87378de，decision行428196/offset2403060827/19892 bytes/SHAdc3bf447624a0af21ca528ac3bbaeb0a5ed6f11ca4373e1c969f4c4f5504ac16。完整题p0的中位样本为触媒，实际药后选余像，不能把中位组件视为实际抽到。Jev p0/.61，但sl_explore明确替为三攻击；chosen为中和，result completed、gate_reject=null，单动作dispatch returned/completed，state_effect_verified=false/whole_plan_executed=null。后继原actions先三攻击、再能力药/余像/毒药，终挡10；前两试先建立后两攻击终挡12。四试均败（前三末动作未下达而SL，第四GAME_OVER），不证明强制早喝或原线必胜，亦不把原答当已照单执行。

DGLWTQGRAT1T F21T6，原Jev行67685，offset1627658062/35933 bytes/SHA68648b45caa2a2628190e2574e0e995352fca415604589757af995bcdd97bdd2；decision_id=5d267c68-39e3-4bc1-b544-4e3a73e51137，decision行430498/offset2452976764/14560 bytes/SHA67c1182cd152fc7ed16e4d99e8a3cb17215bcd434088ab0c677f4c8fbc4fd2b2。原题plan1：15挡/损4、Jev .96，真实依次打击/两防御/升级逃脱/结束回合；chosen打击、completed、gate_reject=null、单动作dispatch returned/completed而非整线认证。原state两防御实挡0→5→10，升级逃脱后仍10，抽到突然一拳；敌30→24、结毒到7，玩家下轮15→6，实损9。历史预测多5挡保留在原0296问题链，不用多5血反事实证明后战可赢，也不在补链任务扩展旧bug。

9W38TRGPJW9Q F16 d428897，decision_id=8d54d292-6e17-48fb-9e15-a0bdddbbb96f，offset2420893160/600917 bytes/SHA50a0d75b4cae527ee17250b33285d12b69c63f5d071bae1a813a19736f3d0062。chosen HEAL(index0)，result failed(wait)请求超时、gate_reject=null、selection_dispatch缺失；原前后state同run，HP34→55，不能重写回执completed或自动建议重发。独立核全部41选择/82状态得到33HEAL、8SMITH、回血792；旧40/32/771初稿和原勘误分别保留。单次超时不提供固定重试/血线规则。

## 逐项链接与处置

原提案Markdown的两个SHA与CLI登记完全一致。每条经验的本批新增证据、账本和原id映射见link-audit.json；原12条不等12个新源码缺陷，未重验的其他机制保留原提案及原反例，不新增支持分母或参数。

| 经验 | 账本 | 原CLI提案 | 处置 |
| --- | --- | --- | --- |
| silent-footwork-block | silent-0005 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-strength-weak-observation | silent-0006 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-accelerant-triggers | silent-0027 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-afterimage-per-card-block | silent-0023 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-lagavulin-siphon-poison-sl | silent-0030 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-decimillipede-reattach-poison | silent-0064 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-burst-next-skills-replay | silent-0194 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-tough-bandages-discard-block | silent-0194 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-stone-humidifier-rest-growth | silent-0204 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-fortifier-existing-block-triple | silent-0225 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-route-hp-observation | silent-0019 | silent-proposal-d8b438b597e9fb6c | 原提案证据保留，未登记源码实现 |
| silent-rest-buffer-observation | silent-0020 | silent-proposal-d8b438b597e9fb6c,silent-proposal-ff01313ae5fb351a | 原提案证据保留，未登记源码实现 |

两提案完整处置见下方JSON。原来源result.commit=null，原learn.proposal_audit_errors是missing source commit for proposal audit。当前live HEAD为02eb468f8728b47ccbc22f39f14e5b2db1580971，12条完整条目均不等于原草稿；这只是精确内容比较，不代表旧live没有这些经验，也不证明原草稿已发布。没有新建重复CLI id，不把request_id当提案id，不冒称implemented/duplicate/shipped。

本批仅经ledger.py update追加核验附件路径/范围，不再追加旧游戏证据为独立样本，不将已有shipped历史状态降成新的proposed，也不更新版本或标shipped；最新CLI回执及实际消费者读回另存ledger-update.receipt.txt和ledger-readback.json。本批报告不关闭原经验检查/正式发布/消费者采用与收益父要求。原精确候选仍交原ops发布线，不以另建源码提交填补丢失的来源。

## 验证与限制

本批没有生产源码、任务模板、验证输入或知识修改；HEAD保持base，git工作树应干净。固定tsc/vitest、撤源码失败/恢复通过不适用，均未运行，不复用上一批通过或失败值。仅运行证据断言、JSON/链接/SHA校验和gitleaks（结果另存），不会把它们称为游戏自测。无commit、merge、release或上线通知。

预期影响为可追溯性，策略收益未知。其他角色等价；无受控早/晚/留药/替路整战对照，无新拟合或数据切分。未完整通读的题不能用于证明自然采用、整线执行、胜率或收益。proposal.md是补链附件，实际等待项是原来源提交/精确检查发布以及有针对性的新本角色证据。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261024-101315-s2-strategy-proposal",
  "base": "d93277a95c4c894ccc946193a399228ed92cdae2",
  "runs": [
    "2PQK67ULZY90",
    "J2VR2DFJG8K4",
    "J5E7A3MS9NSH",
    "0NMF36KX3F7Y",
    "559UJVNHZ5NM",
    "U6JELGQTBMHN",
    "9W38TRGPJW9Q",
    "NRZAYVRMM7M0",
    "KCA04Q3SEYTF",
    "DGLWTQGRAT1T"
  ],
  "fixes": [],
  "skipped": [
    "原经验缺来源提交；保留failed/rc0和未发布身份，不重复登记提案或扩展旧bug任务"
  ],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-d8b438b597e9fb6c",
    "silent-proposal-ff01313ae5fb351a"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-d8b438b597e9fb6c",
      "state": "waiting",
      "reason": "12条经验与11账本的既有提案链接齐全；原经验批次source commit=null，精确候选尚未正式发布。两道原题仅支持有限机制/执行区分，无受控整战牌药/SL收益证据；不将旧独立bug或知识草稿当本批源码实现。"
    },
    {
      "id": "silent-proposal-ff01313ae5fb351a",
      "state": "waiting",
      "reason": "F16超时但34→55及41/33/792已由原日志复核，勘误提案和账本链接齐全；原经验草稿缺可审计来源提交。单次超时不足以制定重复下达/强制重试或改变营火策略，待原精确候选检查、提交与发布。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-101315-s2/learner/runs/20261024-101320-75af67eb-5a40-42a9-8dd0-17083e5d6be4-strategy-proposal/report.md"
}
```
