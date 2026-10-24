# 静默策略提案逐项核验报告

本批未修改生产源码或知识，十项保留 waiting。现有确定性子实现保留；本次没有新实现、源码提交、合入、发布号或自然收益结论。

- 批次：20261023-124241-strategy-proposal；角色：silent；普通提案队列任务。
- base / 实际 HEAD：`8934c2a4472c9427c5cc3a19ac290225fe915cb6`。开工 git status 干净，`git merge --no-edit main` 返回 Already up to date；无 research_request / implementation_request，未套用专题完成协议。
- 实际只读 live 上下文：`f3fb25b73be7f170f46b240353995b9fe73596a6`；仅作祖先核验，本任务未写 live。
- 只处理 learn.json 本批领取的十个 id；没有领取其他队列、重写原提案、重记历史复盘、改请求或改变运行档位。未取得本会话原生 turn_context 回执，不宣称模型/档位已独立核验。

## 身份、冻结和原文恢复

`run-identity.json` 保存 runs.jsonl 原始行和 offset/bytes/SHA。十局均恰有一条 SILENT 已结束记录，均败；A7一局、A9一局、A10八局。SL尝试和42次饮用不是42个独立局。

| 局号 | 进阶 | 结束层 | decisions匹配行 | Jev匹配行 | V6-build |
|---|---:|---:|---:|---:|---|
| TXZ6RVMQA09D | 10 | 49 | 762 | 171 | no_match |
| WQZVENQ7DTRP | 10 | 33 | 766 | 328 | no_match |
| 02HB4L0C3C67 | 10 | 12 | 211 | 42 | no_match |
| 4D4J8USKCPAV | 10 | 17 | 527 | 167 | no_match |
| F4QKG4J1AJJZ | 9 | 38 | 703 | 167 | no_match |
| JLN5SK17W4FQ | 10 | 33 | 790 | 147 | no_match |
| LS8035TB32P3 | 10 | 42 | 816 | 182 | no_match |
| NB8KCF6HRGVF | 10 | 31 | 466 | 116 | no_match |
| S9UZAK0JP0C0 | 10 | 33 | 826 | 247 | no_match |
| SADL3CGYTGSR | 7 | 48 | 1115 | 271 | no_match |

已按指定根目录 evidence_summary.py 建摘要，再用本工作树 extract_evidence.py 提取 v6-build/jev-prompts/decisions/run-config 和默认原始流。摘要、v6-evidence、evidence 三次冻结切点各自保存，日志继续增长导致切点与全前缀SHA不同；未覆盖旧初稿、未把三次切点混称同一冻结。所选历史局计数一致。
六份原 exp Markdown 原路径缺失，HEAD 的相对原路径无 Git 文件；精确 SHA 检索现有 scratch 未命中后，在已核归档中找到六份逐字节相同副本。只从归档读出六个匹配成员到本批 scratch，未整体展开、未复原或改写他树。归档 `codex-strategy-silent-20261022-111302-s2.tar.gz` SHA256=`6881a145f18041e31339a5a52fd622965ac08d828b0937b9172e085a905de3ca`；成员路径、六份SHA在 recovered-proposals.json。另四份原路径直接读回、SHA匹配，记录在 proposal-readback.json。十份Markdown均实际读过；首次缺失记录保留。

## V6 与 Jev 覆盖及证据边界

v6-build全冻结流682行均扫描，本批无匹配，所选原始文件为空；因此本角色本批没有可读取的V6 raw row。十份run-config均无V6配置字段，保留历史缺字段/无匹配，不倒填显式off。entries、jev_answer、fallback、unknown均是**不可评估/无匹配**，不是零条规则、零次fallback或收益为零。也不能把Jev的answers当成V6的jev_answer。
Jev共1,838条精确匹配，机械检查均有request和answers、无已解析error字段；这只是字段检查，不是逐题阅读、答案采用或调用成功收益验收。完整读了以下4条原始题面（包括全部state、选项、previous_attempts、answers），并按原源offset/bytes/SHA重新seek核字节：

| Jev行 | decision_id | decisions行 | 完整问题/执行结论 |
|---:|---|---:|---|
| 28424 | d0cca878-edab-48eb-93b2-7427cd07ebbe | 275342 | 原答与覆盖分列，后继窗口在audit.json |
| 28446 | 15fc6d36-ed83-4cde-b5e6-cbe4dffe9f5e | 275383 | 原答与覆盖分列，后继窗口在audit.json |
| 28628 | 2ef38219-ff73-4fcf-851b-c625adc04a86 | 275894 | 原答与覆盖分列，后继窗口在audit.json |
| 28663 | 8c880109-456d-43b3-887f-04302c922d89 | 275960 | 原答与覆盖分列，后继窗口在audit.json |

四条题面保存为 question-*.json，定位记录 question-refs.json；完整 decisions 相关14行保存 focused-decisions.json。chosen/result 全部逐行核对为 completed；gate_reject、selection_dispatch 在这些历史行中缺字段，不能解释成闸门通过/无拒绝/已分派。两个覆盖依据是显式 sl_explore，并由 plan-continue 与状态后果证实。
其余1,834条Jev题目未逐题完整阅读：本批限定复核两组SL局部对照及已有狡诈生成子实现；不据未读问题产生规则或收益结论。每条读/未读、精确decision_id和身份出处列在 audit.json.question_coverage，不使用最后五条代表全覆盖。其余八局仅局身份、机械流扫描和狡诈转换得到覆盖，未声称其所有战斗/题目已分析。
原题面里的历史经验与非本批统计只是完整题面的一部分，本轮未把它们当重新核验的本角色/本批游戏证据，更不搬用其他角色知识。
源流损坏/未知身份显式保留：V6提证 decisions invalid=2、unknown_identity=1934、unmatched_decision_id=1674；Jev invalid=1、identity_gaps={}；states invalid=2、unknown_identity=3611；brain invalid=2。各次切点 incomplete_lines 均为0。未知身份和损坏行不归入本批，不表示本批缺失数为0，也不按正文局号/时间邻近/question_id建立身份。摘要另有construction-log缺流。提取器content.pending_host_seal=true/deferred_errno=18仅表示本地证据视图待宿主封存，不作为正式发布或消费回执。

## 实帧结论、反例与限制

1. TXZ6RVMQA09D A10 F48第二/三次T6：原答均plan6。原线咕嘟冒泡+带毒刺击，decisions275342–275344完成，states281480–281484从48HP/敌460到45HP/敌424；第三次SL替成冒泡+羽化，decisions275383–275385完成，states281536–281539到48HP/敌433。少损3、少扣9成立；羽化题面标unmodelled，T7手牌已不同，不是全程受控对照。
2. TXZ首战尾部states281561–281566：F48 T10进11血/敌108，REWARD及MAP4血；F49首COMBAT4血、0出牌，随后GAME_OVER0血、仍0出牌，空药。只核到入口4→0及现场王室猛毒持有，无小血瓶；没有可活操作帧或完整双战获胜线。既有double-boss-start与silent-opening已读，不能再声称漏了整个连战目标。第二次T6也少血但失败，不由局部差额推出新SL阈值。
3. WQZVENQ7DTRP A10 F33第二/三次T9：指纹完全相同。Jev均答plan2；第二次执行侧步+逃离+防御，states282075–282079从26/敌184到13/敌160；第三次SL覆盖成飞镖+侧步+逃离，states282144–282148到4/敌145。多15敌血推进、多9自损；两者轮后沙坑同2，T10手牌相同，但尚无完整获胜反事实。T11原始帧282087/282156分别12/3HP，局部血价延续。原提案T7多4血换沙坑轮是反方向限制，本轮未完整读该题/执行链，仍保留为待复验反例，不把多损血一概禁掉。
4. 本批九局42次狡诈药水：按decisions的use_potion槽位和**完全相等的observed_ts**匹配before，再取同局紧随后原始状态；37次添3、2次添2、3次添0，所有新增小刀升级且Damage.base_value=6；手位min(3,10−手数)、药槽消耗、能量和HP不变全部核同。WQ第五次T11为8→10→10→10（2/0/0），第六次为5→8→10→10（3/2/0）。42个转换来自九个独立run，多SL不扩独立分母；饱和分支只有WQ一局，不扩至其他生成牌或未观察进阶。146条相关decisions/states源字节已seek核SHA，记录 raw-byte-verification.json。仅证明已观察生成/容量，不证明穿插饮用必胜、计划妥当完整联合消费者已验或自然收益。

## 十项处置

已关联的31个既有ledger id均在根账本中找到，历史原记录留存 linked-ledger-history.json；本轮只重复核验已有事实，没有新增游戏结论/代码提案，未追加重复账本、不标shipped。以下ledger来源逐项沿用原CLI提案，不伪造id。

| 提案 | 账本 | 本轮处置与缺口 |
|---|---|---|
| silent-proposal-92920295a648b540 | silent-0228, silent-0255 | waiting：已重核TXZ F48第二/三次T6原答与SL覆盖及后继：少损3血也少扣敌9血；F48胜后4血、F49开场0。没有完整受控双战获胜对照及两战校准，不能拟合SL/终局新门槛。 |
| silent-proposal-a327449c331efbc1 | silent-0079, silent-0018 | waiting：已重核WQ F33第二/三次T9同指纹：原线损13/扣24、覆盖线损22/扣39，T11分别12/3血。缺后续完整获胜对照；原提案T7延长沙坑的反例本轮未完整重核，不拟9血/15伤统一阈值。 |
| silent-proposal-a099e89437e942bb | silent-0030, silent-0257, silent-0258 | waiting：42次狡诈饮用的容量/生成实帧已核；生成子实现6403fdcdadc803a092beb5165a068e22bf51c412为实际live祖先。计划妥当跨轮、抽牌容量及SL联合消费者尚未全量验收，整项保留waiting，不将子实现冒作完整duplicate。 |
| silent-proposal-47910f82a1fdd98f | silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255 | waiting：TXZ F49开场4到0及现有silent-opening/double-boss-start源码已核，已有开场模型不重复实现。完整后战胜线、SL两边界及路线条件反事实仍缺；整项不能登记完成。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019, silent-0020, silent-0050, silent-0253 | waiting：原Markdown与SHA已核；原证据1913SE84AXQF/Q6M2Y34MWKRE不在本批十局中，本轮未重新提取其完整连续资源链，亦无早饮/留药配对后继胜线；保留原药价/终局阈值。 |
| silent-proposal-38a49e6c97f31eea | silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262 | waiting：原Markdown已从归档按SHA读回，普通紧勒子实现5c7105ff0294466da8319f2934beda05c6040794为live祖先；原1913/Q6再生、临时敏捷、反伤、重接、活力及制品联合窗口不在本轮完整复验范围，不能以子修复关闭整项。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019, silent-0020, silent-0021 | waiting：原提案已按SHA读回；109局路线/营火统计本轮未复算，1913/Q6条件变化及替代路线无本批完整同条件对照，不能据旧观察拟合路线或终局参数。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | waiting：NHA2KW0RB7VP原提案与SHA已核，原证据不在本批十局；本轮未重新提取其完整蟹战动作/存活推进及胜线，不从其他局的SL血价替代该项验证。 |
| silent-proposal-04b6b430759815ed | silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265 | waiting：原机制提案已按SHA读回；17个油灯窗口及NHA/K367朝向取整、手数、脆弱、能量联合消费者未逐项复验，SADL在本批也仅机械提证/狡诈转换，不能冒称完成油灯专项。 |
| silent-proposal-9952ee8e8df9a0fe | silent-0019, silent-0020, silent-0065, silent-0264, silent-0079 | waiting：NHA原提案已按SHA读回；完整资源链、110局统计及替代路线/SL整战获胜对照本轮未复算，不能从本批TXZ/WQ局部血价推出该项新门槛。 |

源码祖先核验：6403fdcdadc803a092beb5165a068e22bf51c412（狡诈生成/容量）和5c7105ff0294466da8319f2934beda05c6040794（普通紧勒）均经git merge-base --is-ancestor核实为所记实际live祖先，证明在 source-ancestry.json。普通紧勒本轮未重放1913/Q6，所以仅登记源码存在的子范围，不冒作本批完整机制验收。开场当前源码还已有Royal Poison观察组合；本轮未据另一个局AD3补证，不扩大本批范围。

## 后续验证、发布和回退

不拟合新的交换权重/药水持有价/SL准入阈值；当前九局生成分支与两局SL局部对照不是独立样本外验证。后续应按独立run与时间留出新增本角色完局，先隔离模型机制误差，再验证完整后继血量、药栏、沙坑与两战结局；部分机制无需胜局即可算术验证，不能以“缺胜局”否认已证实42次容量子公式。完整提案的剩余范围仍未满足验收。
本次没有生产源码/知识变更：fixes=[]，merged=null。撤源码失败/恢复通过、tsc、vitest和cases均未运行/不适用，tests固定null；不沿用历史成功结果。未进入live合入流程，未新增eval版本、未登记shipped、未发送规则变更通知，也未把报告或提证当正式发布/下一局消费。其他角色行为保持。无需生产回退；原源码、历史失败、首次缺失、原提案、队列与账本均保留。
所有产物仅在本批scratch，未提交或推送。最终提交前扫描不适用（没有提交）；另行对scratch运行gitleaks并保留结果。最终git状态和diff单独记录。

## 冻结流原件目录

以下每个manifest本身及每行source_size/offset/bytes/SHA/identity均保留。表中为本批实际读取manifest的源切点，不将普通流与V6切点互相覆盖。

| 提取目录/流 | source_size | 全冻结前缀SHA256 |
|---|---:|---|
| v6-evidence/v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 |
| v6-evidence/jev-prompts | 2948543428 | fee4114e2082bbe3c2d21520992dafa5a4552b8236d3a55a2ec9f007179f65d5 |
| v6-evidence/decisions | 4208430686 | 416971d5e63e34a33318a279cd548e0a991d3a62a381afe5e21be23df202bac8 |
| v6-evidence/run-config | 2879195 | 384f8961196430d0558c70bd2d0b97c404a351d93b5d47d9905909bbc7569586 |
| evidence/states | 16433439975 | a48bec0792edc16e5187db138ef2e49442e961373e1f1c90bf07cffb88c95bcd |
| evidence/decisions | 4208563468 | 4f0d6007afd1fcb52f5b0261cf38a95bde793bb2f68f597f8e33051df02e01bf |
| evidence/sl-attempts | 58158517 | a6cee8c17d1a8ce13d5f4dd4f87225d6b0abb49a991c6490211e76c9507f49fd |
| evidence/run-config | 2879195 | 384f8961196430d0558c70bd2d0b97c404a351d93b5d47d9905909bbc7569586 |
| evidence/run-plans | 11530896 | 522aaa595eeff76d1c6d256b5c1d0e0adac07f537f260492614123898d384a8f |
| evidence/brain | 1468672447 | 1ac9ce58ee40042d0016b41ad91fc7cafbf5a300274420ae1889620265e8dc2c |
| evidence/v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 |
| evidence/jev-prompts | 2948739023 | a93907fcc7a082712a016faaeb1b187c4fd71a7e8151541171b0c3378672bd75 |

主要交付：proposal.md（逐项策略/限制）、report.md（本报告）、result.json（结构化处置）、audit.py/audit.json（可重复机械定位与覆盖）、question-refs.json、focused-decisions.json、focused-states.jsonl、tail-states.jsonl、raw-byte-verification.json、dispatched-proposals.json、recovered-proposals.json。

收尾复核：gitleaks 8.30.1 对本批证据scratch扫描退出0、发现0项（gitleaks.json）；十个proposal_results与实际派发集合完全一致；HEAD保持8934c2a4472c9427c5cc3a19ac290225fe915cb6，git status空、git diff --binary为0字节（final-verification.json）。生产tsc/vitest/撤源码测试未运行。尾部原始状态另已逐条seek核SHA，见tail-byte-verification.json。
