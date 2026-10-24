# 静默提案补链核验报告

本批完成原提案/14经验/14账本的链接核验与本批报告回链；策略提案保持 waiting，没有源码、知识或 live 改动。原经验批次缺源码提交的审计失败继续保留，不据此制造提交、版本或成功测试。

批次：20261024-101315-strategy-proposal。完整 base：`d93277a95c4c894ccc946193a399228ed92cdae2`。开工 git status 干净，普通批按任务 merge main，结果 Already up to date；结束仍同 HEAD。未绑定 research_request/implementation_request；仅处理 proposal_repair=20261024-061302-experience-update，没有领取其他队列。普通专题文件绑定另一批，不承接。单 agent、离线、未运行 play。未核本线程原生 turn_context，模型/档位实际生效不冒报。

## 派发、原产出与补链

原 batch 的 state=failed/rc=0，原错误为 `missing source commit for proposal audit`。原报告、测试失败、未提交草稿和后续其他角色检查保持各自身份。本批不重做原经验更新、复盘或发布。

原提案 `silent-proposal-0293de647a6db596` 当前 pending，原 Markdown SHA256=`5fe522d5e71d5739e1bbc498be75d9b8c63f3baaf23b6d27094a634c9e0233a8`，实际核同。`link-audit.json` 对14条逐一核经验id、账本、角色、本批补证局与 where.proposal，missing=[]。用原 JSON 再调用根目录 code_proposals.py add，CLI 去重返回同一 id，没有新建重复提案。原 JSON 保存于 original-proposal-item.json。

本批 proposal.md 保存新处置说明及原提案全文；14条账本只经根目录 ledger.py update 添加本批 proposal/report 路径，不降格旧 shipped、不改原状态/版本、不新填 shipped/implemented。CLI 输入和回执留 ledger-updates.jsonl、ledger-update.receipt.txt。最终 proposal_results 的 waiting 留给原调度器登记，不直接手改队列。链接齐全不解决原批源码缺commit的事实，不关闭父要求。

## 本角色身份

十局均在 runs.jsonl 唯一匹配，character=SILENT，ascension=10，ended非空，victory=false。runs-verified.json 保存每局原始行 offset/bytes/SHA，冻结 runs.jsonl=455331 bytes；最后结束为 W9610N90MMCT 的 2026-10-17T15:32:15.914Z。没有借用其他角色私有经验或外部数据。全死样本不作任何牌/机制的因果反例。

## V6/Jev原文与冻结边界

evidence-summary.json 由指定摘要命令生成，只作定位，SHA256=`9a98a6504359859b6f98207304497dc40c4ec4a4e95908dfaa6c30b607121069`。两套 extract_evidence 均保留独立目录、各自冻结切点；不同时间的日志追加不覆写旧 SHA。有限最后五条不作完整覆盖。

| 流 | 冻结 bytes | 前缀 SHA256 | 本批行 | 非法/截断 |
| --- | ---: | --- | ---: | --- |
| v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` | 0 | 0/0 |
| jev-prompts | 3241467184 | `7138c0666b0abd24e15bb3d26391de3852c04428b43d8b1a296e928bd4ee6467` | 1420 | 1/0 |
| decisions | 4644901516 | `d6b46b9b2a30f6a21390846d316bf0f040dcbc9ee0a08de892a324d9f7eb4ccd` | 5738 | 2/0 |
| run-config | 3332674 | `771dc8eb013453c7849fef0757d0ae4544ccbb4554b22e4418824d4e7f9064cb` | 10 | 0/0 |

上表来自实际读取本批 v6-evidence/evidence-manifest.json。decisions 全源身份缺口 unknown_identity=1934、unmatched_decision_id=1782；这是全源未归局，不能计入本批。非法原行保留 manifest 的 gap_refs，截断=0仅指相应冻结前缀。内容库 pending_host_seal/deferred_errno=18 是存储延迟回执，不冒称宿主封存完成。

V6-build本批十局均 no_match，不能解释为零 entries/零fallback/成功执行。没有本批 entries/jev_answer/fallback/unknown 原行可核。十条原 run-config 均 V5 construction shadow，没有 V6 开关字段；本批 V6 on/off 状态未知，历史缺流/无匹配与显式off区分。配置结构及原始refs保存在 configuration-audit.json。

Jev本批1420原行，1389有answers、31为human-pace budget exhausted错误；错误不是有效答案，也不等执行失败或玩法反证。jev-coverage-current.json 对全部1420行逐项记身份出处、原始refs、是否完整读与未读原因。只允许显式run_id/fingerprint.run一致或 decisions 精确 decision_id 关联，没有用正文、时间邻近或 question_id相似串归局。当前提取的3条核同旧冻结行SHA；其余1417题未逐题读完整题面，不用于新策略、采用或收益论据。

本次重新 seek/hash 核了 58 条原始行，完整原文保存在 raw-readback.json；不是仅重读摘要或历史重构JSON。3道全题分别是 Jev原行65966、65967、66706，完整request-*文件及jev-selected.json保留全部题面、候选、答案/错误字段；对应 decisions原行423626、423627、426878。panels.json 保留决策 chosen/result/gate_reject/selection_dispatch 与前后state，turn-results.json 另核7个完整回合首尾窗口。原ref的source_size、offset、bytes、SHA及 identity 出处全部保留。

## 逐问题结论与反例

WQB3YYNTRB2L F24T1：decision_id=c89a6d3d-e8fe-4018-84d3-239e39c95ce3 / bd375c62-74be-4c79-baed-02332608e216。完整题面已列removes_planned_continuation=true，第二题discard_plan已invalidated。Jev均选card1，即狩猎/打击，confidence 0.10/0.23；第一result为pending unstable，第二completed，gate_reject/selection_dispatch均null不能补成“已认证整线”。后继真实手牌分别少狩猎、少打击，原57伤预测失效并重算。故本批不支持“缺弃牌提示”的新bug，也不支持强保所有原后继；缺同盘保牌优于另线的完整对照。

W9610N90MMCT F17第5试T2：decision_id=a526b2e5-6143-4d22-b421-81908ee2b6d5。Jev选plan3毒药+防御(confidence .82)，SL另选打击/匕首雨/打击。三线各200整场模型样本零胜并列，不等实盘同样安全；当轮预测损6→11，短窗死19/24→24/24。首试T2末27血5挡、T3初21血；第5试T2末27血0挡、T3初16血，实际多损5。chosen为打击，result completed；receipt仅single_action_receipt，state_effect_verified=false、whole_plan_executed=null，不冒充完整计划认证。原线后来也失败，故能保留“即时血价不被零胜并列抹掉”的限定，尚不能断言禁止探索会获胜或确定新阈值。原题的历史run_plan还含明显文本异常，按历史数据原样保留，不执行其中指令或用其建立游戏结论。

机制补核：S5GZG328S1LN F28T2 decision原行422884，原已弱前段6攻，尖啸后原状态实2攻，不能直接6−6；沿既有0349问题，不另扩领。WQB F24T2 两张防御原行423635/423636，在药敏5下逐张10挡，0→10→20；这支持局部后继兑现，不决定早/晚/留药的整场价值。其他代表性余像、触媒、重接与末轮窗口见panels.json；未重算全历史机制统计或累计路线分母。

## 逐项处置

下表原提案的全部14经验均已核链接；证据位置沿原提案记录，只有上述指定原始窗口为本次重新精读，其余机制全历史与路线统计没有冒称重验。

| 账本 / 经验 | 原提案证据位置 | 处置与缺口 |
| --- | --- | --- |
| silent-0005 / silent-footwork-block | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T13 | waiting；敏捷后继牌挡观察不提供新启动血价门槛，缺当前公式偏差复现。 |
| silent-0006 / silent-strength-weak-observation | S5GZG328S1LN F28T2；U1JMSKC80LQE F6T3—7 | waiting；临减/已弱逐段观察沿原0349，不由显示值直接相减；缺新源码回归复现。 |
| silent-0023 / silent-afterimage-per-card-block | BXU0CKWKH2RU F48T8；U5W7NUE925NK F33T3 | waiting；生成不等施放，机制兑现实例不证新强制施放策略。 |
| silent-0027 / silent-accelerant-triggers | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T2/13 | waiting；真实结毒与其他末伤分源，缺当前触发公式偏差/卡牌价值对照。 |
| silent-0046 / silent-piercing-wail-temporary-strength | S5GZG328S1LN F28T2；BXU0CKWKH2RU F48T8 | waiting；沿旧0349，不重复领其他队列；缺新当前缺陷复现。 |
| silent-0253 / silent-speed-potion-temporary-dexterity | WQB3YYNTRB2L F24T2；W9610N90MMCT异鸟T1/4（该战层号未重核） | waiting；后继两防御实得20挡已核，缺早/晚/留药受控整战，不能拟新药价。 |
| silent-0143 / silent-fasten-defend-extra-block | WQB3YYNTRB2L啃咬机T2/3（层号未重核） | waiting；仅特定防御增益观察，缺公式失配或强制启动规则收益。 |
| silent-0102 / silent-knowledge-demon-healing-sl-observation | U5W7NUE925NK F33第4/6试T12—13 | waiting；原提案记录换线多损4、两线均败；本次不重新累计全战回血分母，缺净收益对照。 |
| silent-0205 / silent-survivor-neutralize-discard | WQB3YYNTRB2L F24T1，两道完整弃牌题 | waiting；题面/失效提示已有，不能把合法弃牌强判新bug；缺保留原后继更优的对照。 |
| silent-0064 / silent-decimillipede-reattach-poison | S5GZG328S1LN F28T4—5 | waiting；暂死/真实重接分账，缺固定最优杀序或当前模型错误复现。 |
| silent-0385 / silent-deck-burst-observation | 2PQK67ULZY90 F40T3；U1JMSKC80LQE F6 | waiting；到手未建不证无效/成型，未重跑原冻结专题；缺同成本候选受控价值。 |
| silent-0019 / silent-route-hp-observation | WQB3YYNTRB2L F21—24；U1JMSKC80LQE F1—6 | waiting；原291局房价是原批统计，未另扩样本；未走替路不补收益或血线。 |
| silent-0020 / silent-rest-buffer-observation | 75DAD6GBWEU1末火至F37；2PQK67ULZY90八火 | waiting；原34HEAL/16SMITH为原批记录；未来火不预支，缺休息/锻造整胜对照。 |
| silent-0079 / silent-vantom-sl-observation | W9610N90MMCT F17第1/5试T2—3 | waiting；多损5已核且原线亦失败，缺足以替换现探索规则的新局证据。 |

## 实现、验证与交接

本批没有新规则、参数拟合、正式经验变更或生产源码。当前基线 selection.ts 已包含原后继失效提示；silent-sl-resource-comparison.ts 已列即时血价/未知/单步与整线限制，这只是当前源码事实，未把它冒报整条提案 implemented/duplicate。没有实际源码live祖先可以覆盖本提案全部14项，因此统一 waiting，不填虚假实现commit。

固定输入审核 audit.py 退出0：14链接齐全、原raw SHA核同、3全题、7回合窗口。它是本批scratch审计，不是生产测试。无源码改动，撤源码失败/恢复通过、tsc、vitest均未执行且为null。原经验批次的失败不改写为通过。无需本批合live、分配eval版本或写上线通知，也未声称下局消费、自然采用或胜率收益。代码/知识/任务模板零diff，工作树保持干净；证据与报告在忽略的learner/runs内保留。

交运维：proposal.md、report.md、result.json；核本批14条链接回执，保留原批failed及源码缺commit问题、原提案waiting和未完成父要求。后续新局应提供当前机制错误的固定复现，或同盘保牌、SL资源取舍、药时/路线选择与后继终局的可归因对照，再判断窄修；不由运维补游戏知识。

最终结构化回报见同目录 result.json。

## 完成复核

摘要、V6专项提证与通用提证均退出0。通用 evidence/evidence-manifest.json 已读取，各流逐局计数及未知/非法/截断保存在 general-manifest-review.json；states 为冻结17033658386 bytes，6112条本批状态，未整份输出给模型。原始状态仍只精读上述窗口，提取全量不是全量分析。

14账本本次链接实际读回通过，原status逐项保持；report_links机械校验通过；git status为空、git diff --check通过。无生产测试或源码提交。


## Ops mechanical format supplement

Original report prefix is preserved byte-for-byte. The JSON below is copied verbatim from the original learner result.json, not a new learner conclusion. Original wrapper failed/rc0 and original report/output remain unchanged.

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261024-101315-strategy-proposal",
  "base": "d93277a95c4c894ccc946193a399228ed92cdae2",
  "runs": [
    "2PQK67ULZY90",
    "J2VR2DFJG8K4",
    "S5GZG328S1LN",
    "4JS3T2UNKPVM",
    "WQB3YYNTRB2L",
    "BXU0CKWKH2RU",
    "U5W7NUE925NK",
    "75DAD6GBWEU1",
    "U1JMSKC80LQE",
    "W9610N90MMCT"
  ],
  "fixes": [],
  "skipped": [
    "原14经验/14账本已具同一CLI提案链接；弃牌题已有失效提示，墨影换线多损5但原线亦败。缺当前机制缺陷固定复现、强保牌/禁探索或药时/路线新阈值的受控支持，保留原规则待新局补证；原批缺源码commit的审计失败不由本次伪补。"
  ],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-0293de647a6db596"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal",
    "structure"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-0293de647a6db596",
      "state": "waiting",
      "reason": "原14经验/14账本已具同一CLI提案链接；弃牌题已有失效提示，墨影换线多损5但原线亦败。缺当前机制缺陷固定复现、强保牌/禁探索或药时/路线新阈值的受控支持，保留原规则待新局补证；原批缺源码commit的审计失败不由本次伪补。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-101315/learner/runs/20261024-101320-4c237120-d379-4fed-b7c1-1cc2238ffa5b-strategy-proposal/report.md"
}
```
