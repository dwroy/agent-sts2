# 静默原经验提案补链核验报告

本批14条经验、14个账本与原提案的链接已核齐，CLI复用原ID `silent-proposal-0293de647a6db596`；策略处置仍为 waiting。没有生产源码或正式知识修改，没有新提交、合入、版本或成功测试。本次补链不能补造原经验批次缺失的源码commit，也不能关闭学习父要求。

## 绑定与基线

本批为 `20261024-131302-strategy-proposal`，只绑定 `proposal_repair=20261024-061302-experience-update`，reason=proposal；没有proposal_ids、research_request或implementation_request。普通专题文件绑定另一历史批次，不承接；第1.4节明确排除补链任务，本次不扩为流派剧本、rk或旧244条回刷。没有读取其他角色私有知识或外部原库，没有下级agent、联网、play或新模型调用。

开工HEAD为 `91fd612628405d84d84fa9b957650378ca149b74`，status干净；按普通任务merge main快进无冲突，合后base及结束HEAD均为 `e61ce508b68634c5ea63a00b83fcd50b92259389`。开工合入的是现成main提交，不把其22文件变动当本批实现。生产源码、knowledge及任务模板相对此base零差异，工作树干净；产物留在忽略的learner/runs内。

`native-context.json` 保存本线程原生turn_context出处，实际model=gpt-6.1-sol、effort=high、turn=01a16c54-d929-70e1-af37-4447159eed00。未改账号、配置或档位；normal/Fast服务字段未独立证明，不由high推定服务档。

## 原批与逐项补链

`source-batch-receipt.json` 核原经验批次state=failed、rc=0、commit=null、merged=null；原报告保留固定检查受阻。原14项草稿和原提案Markdown不改写。原提案SHA256=`5fe522d5e71d5739e1bbc498be75d9b8c63f3baaf23b6d27094a634c9e0233a8`重新核同；队列此前已waiting。根code_proposals.py add使用原JSON去重返回原ID，未增加重复项，未将waiting改成implemented。

`link-audit-current.json` 逐项核经验ID、账本角色、原补证局、where.proposal和队列关联，missing=[]。14条原经验ID在本树存在，但原批各自新增的局号尚未全部进入相应正式experience.evidence（14项检查均false）；不能用账本旧shipped身份冒充此次增量已发布。原status/version逐项保持，只经根ledger.py update追加本批proposal/report回链，CLI输入、退出回执和实际读回保存在ledger-updates.jsonl、ledger-update.receipt.txt、ledger-readback.json。没有新加经验或重复复盘，也没有把任何条目标成shipped。

## 本角色身份与提证冻结

本批十局在runs.jsonl均唯一匹配SILENT、A10、ended非空、victory=false，冻结457875 bytes；逐行offset/bytes/SHA及终局原文保存在runs-verified.json。全死样本不自动作为牌值或机制的因果反证。

指定evidence_summary命令退出0，摘要SHA256=`0308d62d2d2e8061c35637e59265be5057ea2bef53ac3d743bbc04846eb24dd7`。摘要只作定位；没有把最后五条当完整覆盖。专项和通用extract_evidence均实际执行并退出0，各自manifest原件保留，不覆盖旧冻结切点。

专项manifest：

| 流 | 冻结bytes | 前缀SHA256 | 本批行数 | 非法/截断 |
| --- | ---: | --- | ---: | --- |
| v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` | 0 | 0/0 |
| jev-prompts | 3280195523 | `2c86c6167f58ea6f91400958c4531a6fe6d3b78f31295ebb84876d313bc16f23` | 1420 | 1/0 |
| decisions | 4701515551 | `c2f547a10d4f33a4b259c0e90ed4c964fc98f413193ddfef09f21f4f4cb30d89` | 5738 | 2/0 |
| run-config | 3395622 | `bdefe261cbea778780bbc55c4c6eca06e0012652df465246efbb4668dbcb5dab` | 10 | 0/0 |

通用manifest：

| 流 | 冻结bytes | 前缀SHA256 | 本批行数 | 非法/截断 |
| --- | ---: | --- | ---: | --- |
| states | 17104938547 | `95474e61a7e62581011747378480c6b78e1d7765acff50609e8e5ff18f15f491` | 6112 | 2/0 |
| decisions | 4701621880 | `24cca48584df374c9a5adbe0db13331d07d7ed90085de139d3407b491be72026` | 5738 | 2/0 |
| sl-attempts | 61637486 | `7aef62ec66409a931af8eb4f1e76435984c9360a7eb4029cd8efdd718236c266` | 64 | 0/0 |
| run-config | 3395622 | `bdefe261cbea778780bbc55c4c6eca06e0012652df465246efbb4668dbcb5dab` | 10 | 0/0 |
| run-plans | 13561468 | `6510e0a70ceb74675ef6be130b6480a4fbd79fdd965f8cce6f1f5b3fd5a528a3` | 73 | 0/0 |
| brain | 1589406262 | `73fb25db60b29637c1b52e981d53e00f6c6d4f7110760330507c3d1f0deb1e5b` | 301 | 2/0 |
| v6-build | 64753212 | `1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3` | 0 | 0/0 |
| jev-prompts | 3280422988 | `c928998b2b99c9e9c36220834412eaafd7ae8019663e02bdfe2443768a6a45c4` | 1420 | 1/0 |

全部source_size、前缀SHA、逐行offset/bytes/SHA、身份关联出处与非法/截断原行引用见两份manifest和对应evidence.jsonl。special decisions全源identity_gaps={"unknown_identity": 1934, "unmatched_decision_id": 1797}，这不是本批未知行计数，不按时间邻近补归局。内容存储回执的pending_host_seal/deferred_errno=18原样保留，不声称宿主封存完成。通用提取完整扫描不等模型逐题通读，不将全量states灌进上下文。

V6-build十局均no_match。entries、jev_answer、fallback、unknown均没有本批匹配原行，不能解释为零发生或有收益。十条配置逐行seek/hash核同，均V5 construction shadow、无V6开关字段；显式off未观察到，on/off未知，历史缺流/无匹配与显式关闭分开。configuration-audit.json、configuration-raw-readback.json保存来源。没有匹配V6行可读的缺口明确保留，不借其他角色填补。

## Jev逐问题覆盖与原始后果

全部1420行机械检查身份/答案/错误；1389有答案、31为human-pace budget exhausted错误。错误不是有效答案，也不等实际执行失败或玩法反证。仅显式run_id、state.run_id/fingerprint.run一致，或精确decision_id沿decisions原行建立归属；未使用正文、相似question_id或时间邻近。

| 局号 | Jev行 | 答案 | 错误 | 完整读题 |
| --- | ---: | ---: | ---: | ---: |
| 2PQK67ULZY90 | 206 | 193 | 13 | 0 |
| J2VR2DFJG8K4 | 144 | 143 | 1 | 0 |
| S5GZG328S1LN | 162 | 162 | 0 | 0 |
| 4JS3T2UNKPVM | 82 | 82 | 0 | 0 |
| WQB3YYNTRB2L | 83 | 83 | 0 | 2 |
| BXU0CKWKH2RU | 255 | 243 | 12 | 0 |
| U5W7NUE925NK | 179 | 177 | 2 | 0 |
| 75DAD6GBWEU1 | 194 | 191 | 3 | 0 |
| U1JMSKC80LQE | 25 | 25 | 0 | 0 |
| W9610N90MMCT | 90 | 90 | 0 | 1 |

本次完整读3题：Jev原行65966、65967、66706，分别对应decisions423626、423627、426878；完整原request/全部候选/答案保存在question-*、request-*、jev-selected.json。其余1417行未逐题通读，因为本批仅补原提案链并复核其中两个关键争议窗，不用未读题证明新策略、采用或收益。jev-coverage.json对每行保存refs、identity、full_read和具体未读原因。

本次69条去重的关键窗口原行重新seek核SHA，另核10条runs和10条run-config。raw-readback.json保留最初58行，wqb-window-raw-readback.json补23状态（与前者重叠12行）；panels.json保存16个决策前后窗。题面存在、答案选择、chosen、result、gate_reject、selection_dispatch及后继分别核，不能合并成“成功整线”。

WQB3YYNTRB2L F24T1：两道题已有removes_planned_continuation=true，第二题discard_plan=invalidated；Jev均答card1，分别狩猎/打击，confidence .10/.23。decisions第一result=pending unstable，第二completed；两条gate_reject/selection_dispatch均未记录(null)，不补认证。第二题后手牌实际少两牌并得到两小刀，后继转蛇咬、压扁和小刀；原57伤条件不成立。本次独立核该层T1—3的23原始状态：开场动画132血→稳定开场129，背刺后118；两次弃牌后118→108→102→96，敌行动后89，T3终局玩家0血。净变化中的直伤、毒、开场被动分账，不拿57与实际推进直接报模型误差。没有同盘保留原后继的受控整战胜例，不能据此强保牌。

W9610N90MMCT F17第5试T2：Jev选plan3毒药+防御，confidence .82；代码SL另选打击/匕首雨/打击。三线整场模型各200样本零胜并列，短窗模型死亡19/24→24/24、当轮损6→11、伤1→9。chosen实际为打击且completed；selection_dispatch仅single_action_receipt、state_effect_verified=false、whole_plan_executed=null。原第1试T2末27血5挡、T3初21血；第5试T2末27血0挡、T3初16血，实际多损5。原线后来亦败，所以保留即时血价限定，不能断言禁探索会赢。原题历史run_plan中的异常指令文本原样留档，仅作为历史数据，不执行或用作游戏结论。

turn-results.json保留7个原索引窗口；其中WQB T1的旧first/last均命中开场动画空手帧，不能自称完整回合，已用上述23状态补核并明确索引限制。W96第1/5试T2—3边界可核血量差。其余机制局部动作按proposal.md列出，未重算旧全历史分母、未完整分析其他问题/流派、未拿暂死或Heal意图冒已回血、未把不同SL试次拼成一条轨迹。

## 每项处置与下一步


下表位置来自原提案；只有上节明确列出的窗口在本次精读，其他全历史统计和未列机制没有冒称重验。全部仍 waiting。

| 原账本 | 原经验ID | 证据入口 | 具体缺口 |
| --- | --- | --- | --- |
| silent-0005 | silent-footwork-block | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T13 | 后继挡的兑现不提供新启动血价门槛；缺当前公式偏差固定复现。 |
| silent-0006 | silent-strength-weak-observation | S5GZG328S1LN F28T2；U1JMSKC80LQE F6T3—7 | 已弱临减沿原0349；本次不另扩领旧缺陷。 |
| silent-0023 | silent-afterimage-per-card-block | BXU0CKWKH2RU F48T8；U5W7NUE925NK F33T3 | 实际施放与生成分源；缺新强制启动策略的可归因收益。 |
| silent-0027 | silent-accelerant-triggers | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T2/13 | 不将条件毒结算观察升格整战牌值；缺当前公式错误复现。 |
| silent-0046 | silent-piercing-wail-temporary-strength | S5GZG328S1LN F28T2；BXU0CKWKH2RU F48T8 | 沿旧0349，不因显示值直接相减另造实现。 |
| silent-0253 | silent-speed-potion-temporary-dexterity | WQB3YYNTRB2L F24T2；W9610N90MMCT异鸟T1/4（层未重核） | 缺早/晚/留药受控整战，不拟新药价。 |
| silent-0143 | silent-fasten-defend-extra-block | WQB3YYNTRB2L啃咬机T2/3（层未重核） | 原提案特定牌挡观察，缺新规则收益或模型失配复现。 |
| silent-0102 | silent-knowledge-demon-healing-sl-observation | U5W7NUE925NK F33第4/6试T12—13 | 两试资源不同且均未胜，缺换线净收益对照；未重算整战回血。 |
| silent-0205 | silent-survivor-neutralize-discard | WQB3YYNTRB2L F24T1 | 原题已有失效提示；缺同盘保牌优于另线的完整对照。 |
| silent-0064 | silent-decimillipede-reattach-poison | S5GZG328S1LN F28T4—5 | 本次所选T5动作中中段仍0血/Heal意图，不能拿它作已重接证明；完整重接观察沿原提案，缺固定最优杀序。 |
| silent-0385 | silent-deck-burst-observation | 2PQK67ULZY90 F40T3；U1JMSKC80LQE F6 | 到手不等已建；缺同成本候选对照，不重跑独立冻结专题。 |
| silent-0019 | silent-route-hp-observation | WQB3YYNTRB2L F21—24；U1JMSKC80LQE F1—6 | 累计291局属于原批口径，本次未复算；替路未走，不能设安全血线。 |
| silent-0020 | silent-rest-buffer-observation | 75DAD6GBWEU1末火至F37；2PQK67ULZY90八火 | 原50火统计不作新验；缺休息/锻造整局受控收益。 |
| silent-0079 | silent-vantom-sl-observation | W9610N90MMCT F17第1/5试T2—3 | 多损5已核，原线亦败；缺替换现探索规则的充分证据。 |



本批新增/更新/复用正式策略或rk均0，14项只完成补链核验、继续待证。第1.4节不适用，没有新策略/rk候选或消费者读回；逐项映射为link-audit-current.json及proposal.md表格，不能算新策略。后续新局需提供当前公式偏差固定复现，或同盘保牌、药时、SL资源和路线取舍的可归因后继对照；机制观察不自动变成最优选择或安全阈值。

## 实现、检查与交接

当前源码selection.ts已有条件预测失效提示，silent-sl-comparison.ts和silent-sl-resource-comparison.ts已有即时资源与执行未知分账。这仅是源码检查，不声称整条14项提案已有实际live祖先实现。因此不填implemented/duplicate commit，统一waiting。

本批无生产源码改动；没有运行撤源码失败/恢复通过测试、tsc或vitest，均null，不复用原批44定向用例充本批测试成功。scratch审计脚本不是生产测试；14链接、3完整题、69关键原行和账本回链检查已通过。没有合live、知识生成器重建、eval版本或规则上线通知；未推送、未停止对局、未声称正式发布、下一局消费、自然采用或收益。原经验批次失败与待办保留，学习父要求开放。

交运维：本目录proposal.md、report.md、result.json及CLI/账本读回回执。不把补链完成当原批源码审计通过，也不代运维登记shipped。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261024-131302-strategy-proposal",
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
    "原14项补链齐全，复用原提案；弃牌题已有后继失效提示，SL换线实多损5血但原线亦败。缺当前机制错误固定复现、保牌/禁探索/药时或路线新规则的充分对照，继续waiting；原经验批次commit=null及failed/rc0保留。"
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
      "reason": "原14项补链齐全，复用原提案；弃牌题已有后继失效提示，SL换线实多损5血但原线亦败。缺当前机制错误固定复现、保牌/禁探索/药时或路线新规则的充分对照，继续waiting；原经验批次commit=null及failed/rc0保留。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-131302/learner/runs/20261024-131308-95a15bad-dda8-44ec-9347-9c7713c22596-strategy-proposal/report.md"
}
```
