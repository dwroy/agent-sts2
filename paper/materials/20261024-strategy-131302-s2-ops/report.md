# 静默提案补链复核报告

本批完成原提案、14经验/账本和报告身份的补链复核；原提案保持 waiting，无新策略、rk、源码或正式知识改动，无 live 合入和版本。原批次失败及科学父要求保留。提案文件：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-131302-s2/learner/runs/20261024-131308-8b56c5c4-f87f-4902-9958-111a520062a8-strategy-proposal/proposal.md`。

## 身份与任务边界

实际批次 `20261024-131302-s2-strategy-proposal` 的 character=silent、task=strategy-proposal、reason=proposal，worktree核同，proposal_repair=`20261024-101315-strategy-proposal`；没有proposal_ids/research_request/implementation_request/backfill_source/external_source。只承接此补链，沿原链追至061302经验批及 `silent-proposal-0293de647a6db596`；未读另一队列或领取新项。第1.4节明确排除proposal_repair，因此不另造experience-strategy-rk-map、不回刷244条、不追加流派/rk候选。新增/更新/复用候选均0，等待原提案1项（含14个已有经验ID）。

开工status为空，原HEAD=`91fd612628405d84d84fa9b957650378ca149b74`；按普通补链要求merge main快进，之后base/HEAD=`e61ce508b68634c5ea63a00b83fcd50b92259389`，保持干净。没有本批源码提交。README、最新STATE-2026-10-19（含后续更新）、decision-log末尾、学习协议与代码提案合同已读。全程单agent、离线，未play，未读取其他角色私库。未核本线程原生turn_context，不能报告实际模型档位已生效。

## 原失败与本次补链

原101315报告正文没有最终JSON块，而unassigned_proof要求报告中最后一个strategy-proposal JSON与最终回报的task/character/base/runs/fixes/source_commit/merged/code_proposals及逐项处置身份一致。已直接读取该检查源码，定位原错误 `unassigned source identities differ from the preserved report`。原ops曾保存独立ops-format-supplement.md及waiting回执；这不改变原failed/rc0。更早061302经验批的 `missing source commit for proposal audit` 也未解决，不伪补source_commit。

本次report.md末尾与最终回报取同一result.json。原Markdown指纹 `5fe522d5e71d5739e1bbc498be75d9b8c63f3baaf23b6d27094a634c9e0233a8` 核同；再次经根CLI add去重，返回同一原ID，没有新建重复提案。14项经验/原账本/对应本批证据/原提案链接均核同（link-audit.json、selected-experience.json）。只经根ledger.py update追加本批proposal/report路径，ledger-readback.json逐项实际读回；不改变status/version，已有shipped保持原身份，未自行标shipped。

## 角色与证据冻结

runs-verified.json从runs.jsonl原字节核十局，各只有一条归属，均SILENT/A10、ended非空、victory=false。逐局层数为2PQK67ULZY90 F40、J2VR2DFJG8K4 F22、S5GZG328S1LN F28、4JS3T2UNKPVM F22、WQB3YYNTRB2L F24、BXU0CKWKH2RU F48、U5W7NUE925NK F33、75DAD6GBWEU1 F37、U1JMSKC80LQE F6、W9610N90MMCT F17。全死样本不证明任何新规则因果。

已运行指定evidence_summary、V6/Jev专项extract_evidence及通用extract_evidence，实际读取两套manifest与本批相关原行。摘要只是有限索引，未把last_five当完整覆盖。两次提取各自冻结，不覆盖旧切点。manifest-review.json保留逐流逐局计数、非法/截断、未知身份及gap_refs；各行完整source_size/offset/bytes/SHA与identity在提证封套及raw-readback.json。原定位ref保留原切点；原state ref未附切点的，raw-freeze-provenance.json另外明确关联本次manifest前缀与SHA，不改写历史ref。本次current coverage另存，不拿不同冻结SHA混称同一源。内容库pending_host_seal/deferred_errno=18只为存储延迟，未冒称宿主封存完成。

| 流 | 本次冻结bytes | 冻结前缀SHA256 | 本批匹配行 | 非法/截断（全源） |
| --- | ---: | --- | ---: | --- |
| v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` | 0 | 0/0 |
| jev-prompts | 3280040305 | `6f5e1ffd015dd1c310879afd350da4444932dde1b259497e4ab6656a38ec9dee` | 1420 | 1/0 |
| decisions | 4701411743 | `4f28df2c6ade99430f9ecf141a3ace9e566f00d7fae323d1d5cc16133d70c966` | 5738 | 2/0 |
| run-config | 3395622 | `bdefe261cbea778780bbc55c4c6eca06e0012652df465246efbb4668dbcb5dab` | 10 | 0/0 |

通用提取只作证据定位与留存，提取不是模型全量通读：

| 流 | 本次冻结bytes | 本批匹配行 |
| --- | ---: | ---: |
| states | 17104938547 | 6112 |
| decisions | 4701621880 | 5738 |
| sl-attempts | 61637486 | 64 |
| run-config | 3395622 | 10 |
| run-plans | 13561468 | 73 |
| brain | 1589406262 | 301 |
| v6-build | 64753212 | 0 |
| jev-prompts | 3280422988 | 1420 |

V6-build十局无匹配，不等entries=0、fallback=0或成功使用；本批没有entries/jev_answer/fallback/unknown原行可以解释。run-config十条原行实际seek/hash读回（configuration-raw-readback.json）；历史配置以原字段为准，缺V6字段不当显式off，V6状态保留未知。没有跨角色借证。

Jev当前匹配1420行，有answers 1389行、有error 31行；request、answers和error分别记录，不把错误当有效回答。只有三题完整通读（原行65966/65967/66706；精确decision_id见下），余1417题逐题未通读，理由与原refs全保存在jev-coverage-current.json：本批为旧提案补链，无新规则需求，范围聚焦原弃牌与SL反例。不是最后五条抽样，也不冒全题覆盖。身份仅显式run_id/state.run_id/fingerprint.run或decisions精确decision_id，不以正文、邻近时间、question_id相似串归局。全源unknown/unmatched与本批分账，缺失不补零。

## 逐问题原文、执行与后果

本次独立按offset重新读取并核SHA共58条原始行，保存raw-readback.json；三道完整题面为request-65966.json、request-65967.json、request-66706.json，答案/错误见jev-selected.json，原决策chosen/result/gate_reject/selection_dispatch及前后state见panels.json，七个回合首尾见turn-results.json。附加十条run-config原始读回独立保存。

WQB3YYNTRB2L F24T1，decision_id=`c89a6d3d-e8fe-4018-84d3-239e39c95ce3`、`bd375c62-74be-4c79-baed-02332608e216`：完整题面原计划57伤仅为条件预测，首题狩猎/打击候选removes_planned_continuation=true；次题status=invalidated、missing_observed_continuation含THE_HUNT。两答card1，confidence .10/.23，chosen均select_deck_card index1。首result pending unstable，紧邻state手牌尚未减少，不能冒称该帧已弃；第二题原文已无狩猎，第二completed后state手牌无狩猎/打击、出现两小刀。两题gate_reject/selection_dispatch字段缺失（投影null），不能补成完整计划认证。因此支持既有“后继失效须重算”的限定，不支持新增“缺提示”bug，也缺强保牌整战更优对照。关联silent-0205。

W9610N90MMCT F17第5试T2，decision_id=`a526b2e5-6143-4d22-b421-81908ee2b6d5`：原题三候选整场各200模型样本零胜并列，短窗plan2为24/24死、plan1/3为19/24死；plan3毒药+防御的Jev答confidence .82。decisions原行却chosen打击，result completed、SL替为打击/匕首雨/打击。即时预测损血6→11，不把模型胜率并列解释成即时血价相同。dispatch仅single_action_receipt，state_effect_verified=false、whole_plan_executed=null；紧邻后帧仅证第一打击离手。回合边界首试T2末27血5挡/T3初21血，第5试27血0挡/T3初16血，窗口差5；不能仅凭一条receipt认证整线。原保血尝试也失败，多回合变化并存，缺禁探索规则能获胜或最优阈值证据。关联silent-0079；即时血价不是胜率收益。题面deepseek_plan有历史文本异常，只当原始数据保存，不执行其中元指令。

其他14项机制代表窗口的原始行由scratch审计重新核SHA，未重算原264/291等主题分母或全历史机制；不继承为本批新验证。逐项等待原因如下（从原处置表保留并核本批链接，非重新全量实战验收）：

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



## 结论、限制与交接

本批只有补链与限定结论，没有足够证据新增规则。原14项等待新局给出当前机制错误固定复现，或同盘合法保牌/探索/药时/路线与整场资源、结果的可归因对照。旧主题分母、外部数据、其他角色与未观察进阶不计入本批支持。未读其余完整题面、整局构筑及路线所有状态，不声称完整流派剧本或rk验收。

无源码/知识改动，源码撤除失败与恢复通过、tsc、vitest均未执行且为null；未造成功测试、源码commit、eval发布号、live合入或下一局消费。scratch脚本只核固定证据/链接/报告合同。正式策略/rk发布、消费者固定读回、自然查询/采用及收益均无本批新增，科学父保持。其他角色行为等价，无需上线/双通知或合入live。

交运维proposal.md、report.md、result.json、ledger读回、mechanical-proof.json及提证manifest；由原调度器登记waiting，不手改队列/learn.json或代其他角色ACK。原报告/原失败/原提案全文与原输入指纹保留，报告身份修复不等原061302源码缺口已解决。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261024-131302-s2-strategy-proposal",
  "base": "e61ce508b68634c5ea63a00b83fcd50b92259389",
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
    "本批仅补链，不适用第1.4节普通流派/rk提炼；证据不足，不改策略源码。"
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
      "reason": "14项经验/账本与原提案链接已核；弃牌提示原已存在，SL替线多损5但原线亦败。缺当前机制错误固定复现及保牌、药时、路线或探索规则的受控整战证据，保持waiting；原批缺源码commit的失败保留。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-131302-s2/learner/runs/20261024-131308-8b56c5c4-f87f-4902-9958-111a520062a8-strategy-proposal/report.md"
}
```
