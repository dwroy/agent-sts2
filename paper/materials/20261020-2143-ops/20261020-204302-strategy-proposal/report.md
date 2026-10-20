# 静默猎手策略提案核验报告

记录时点：2026-10-20T20:57:06+08:00。批次20261020-204302-strategy-proposal。

十项提案均保留waiting。当前证据能确认局部事实和若干既有子项，尚不足以落实原提案的剩余范围。本批未改生产源码/知识/规则，未提交或合入，fixes=[]、merged=null，测试三字段为null。报告完成不表示学习父要求、正式发布、下一局消费或自然收益完成。

## 身份与基线

- 先git status干净，HEAD=e42b11dbe8ea41fc4f709427eed1ce539e17701c；本批普通任务按要求git merge --no-edit main，返回Already up to date。结束仍保持此HEAD。
- 只读learn.json对应行保存dispatch.json；角色silent、工作树与十个proposal_ids核同；无research_request、implementation_request、proposal_repair。reason是proposal，不能套用reason=ops纯研究身份。
- 历史专题根请求不是本批绑定，不替代本批任务。十份提案均读原文；六份原路径缺失后从根目录paper/materials/silent保存件按原SHA恢复到本批scratch。proposal-source-refs.json保存路径、字节和SHA；没有用摘要代替原文。
- 只读取本角色证据；UJ0K3G10609Y虽出现在ff原提案，不在派发集合，未读取或计作本批验证。源码中的其他证据注释也不充本批实盘。
- 当前live核验点为64c218a04ebe029fdda0b5f25025302ebf2a4124。这是既有live，不是本批merged。未核原生turn_context/请求回执，因此不自报模型档位已生效。

## 十局结束及角色核验

runs.jsonl原行均为character=SILENT（归一silent），ended非空；原文/offset/bytes/SHA见run-identity.json。首次严格小写比较失败是大小写校验问题，复核原行后修正归一口径，不改原记录。

| 局号 | 进阶 | 终层 | 胜负 | decisions | Jev原行 | 状态 | 战斗尝试 |
|---|---:|---:|---|---:|---:|---:|---:|
| ZTRGYYMLR8SC | 10 | 17 | 败 | 594 | 158 | 607 | 12 |
| 1LMBFGSMCWKU | 4 | 48 | 胜 | 663 | 169 | 689 | 22 |
| 9YT51CK8RC39 | 7 | 17 | 败 | 558 | 140 | 566 | 14 |
| 25226ZFLNR1J | 10 | 48 | 败 | 862 | 184 | 889 | 21 |
| TCFAHJ9K19VY | 10 | 17 | 败 | 476 | 88 | 489 | 15 |
| ULP4TN1GNHMK | 10 | 17 | 败 | 484 | 124 | 493 | 14 |
| 61E2QS63Y9WU | 10 | 28 | 败 | 443 | 70 | 462 | 17 |
| K2JAGKVJAWZJ | 10 | 46 | 败 | 722 | 160 | 814 | 18 |
| 79UCJ0K6R9C1 | 10 | 14 | 败 | 235 | 89 | 243 | 7 |
| 10GPK5XGHCK3 | 3 | 48 | 胜 | 986 | 318 | 1020 | 22 |

战斗尝试包含同局SL，不作为独立样本；资源链标observed_exit可能是GAME_OVER，不能据该标签推断胜利。

## 提证与冻结

已运行指定evidence_summary.py和两次extract_evidence.py（指定四流输出v6-evidence，以及常规证据输出evidence）。均正常退出；manifest按实际冻结source_size保存前缀SHA，每个入选原行保留offset/bytes/SHA/identity，Jev另保留decision_identity_source。两次提证同流切点/SHA一致。摘要只作定位入口，不将每流最后五条当覆盖。

| 流 | 冻结字节 | 本批入选行 | 前缀SHA256 |
|---|---:|---:|---|
| states | 14718684631 | 6272 | 4169a0922f5b4c700a56eabf6283d7ada026b4f71b82e8ace11f426d198e3716 |
| decisions | 2967844963 | 6023 | 8d339ded386f895656fc2f166ac65e8a3a61dd837781720da98d1dec37f45c25 |
| sl-attempts | 49894916 | 50 | f681c8043c5df36b2ca99051d0a7bdbd1a337cc9e6346b96f6fbddd269ae1c64 |
| run-config | 2240582 | 10 | 80ac2f7d9030022fa59a5f5861eccfea3a9423e873bb3ddac6d9d7c921406d40 |
| run-plans | 10120201 | 44 | 13d26e121b50e4b14405327d22328245f5c846f315ce95ed2d38032053b68ed1 |
| brain | 1117125269 | 293 | c731a1a300e41868ff996bfe9d08b13476f83788e0223f9b2f68368d6ccc5df3 |
| v6-build | 64622743 | 0 | d9d6b2891dc95f42d8081c74fe22fe1cf73eea92d323ba2c08b7943a70f58c54 |
| jev-prompts | 2181673141 | 1500 | bc7b6d70b2cdccdf3943d9be85511be62155797836c15dfb84989d67ac1f81cb |


- V6-build：源存在且完整扫过，十局各0匹配、selection_status=no_match；不能说源文件缺失或游戏效果为0。十局run-config各1行且完整读取，都没有V6字段，因此是历史配置未记录，不能伪记显式off。entries/jev_answer/fallback/unknown在本批均无可归属原行，不补0收益、不冒采用证据。
- Jev：1500行均有request/answers，无error字段；不能据此宣称未记录错误不存在。本批精读8条完整请求与答复；完整题面不证明采用或执行成功，后者另核decisions及states。
- 全源排除项：states有3332 unknown_identity、2无效JSON；decisions有1934 unknown_identity、1395 unmatched_decision_id、2无效JSON；brain有2无效JSON；Jev有1无效JSON。均未按正文提及或时间邻近归给本批。清单/偏移在manifest；它们是全源缺口，不能算成本批失败/成功次数。各流冻结切点无截断行。
- 精读原行再次从source按offset/bytes seek，逐行SHA及JSON原文一致；保存verified-*.raw.jsonl。代码核验与原始dirty运行源码分开，run-config.code完整保存，不用当前源码冒认历史dirty快照。

## 逐题执行链与读取边界

模型完整读取的8条Jev请求如下，未截取最后五条。question-*.json保存完整row；decision-joins.json保留完整出处与chosen/result/gate_reject/selection_dispatch。下表之外1492条未精读，每条decision_id、run_id、offset/bytes/SHA及具体读取状态保存在question-coverage.json；理由是本次有界精读未覆盖，不将其未读部分计作机制验证。特别是七局铜钹/刀扇全题及重放组合仍未逐题验完，这是本批覆盖限制，不是宣称这些证据根本不存在。

| Jev行 | 精确decision_id | 本批问题 |
|---:|---|---|
| 30888 | 74199ac9-2825-4b95-8106-440757b36e39 | ZTRG F11T3护栏 |
| 30918 | f0311d1a-883d-4bbc-97a6-e7aa4ad55b5e | ZTRG F17首试T10护栏 |
| 31022 | 587b51c7-d7c6-4cad-b6dc-dee6b77d1599 | ZTRG F17末试T13护栏 |
| 31081 | 531c7dee-53ae-4094-8604-5446733ee1a9 | K2 F27T2铁心原计划 |
| 31120 | d4646609-d44a-4f2d-b9f7-65fbf715ba6c | K2 F33T10毒药水 |
| 31170 | b3680399-895b-41c6-8da4-a3d4141a75c2 | K2 F46T1零毒蜃景 |
| 31252 | 693ca79d-b7b4-4b3b-9600-038292d39c69 | 79 F14T3空过与尾端估计 |
| 31272 | 22489efa-45e1-48a1-97db-9be938ff4633 | 79 F14T11毒药水与感染 |


十一条精查decisions均result=completed: Action completed.，但这只说明下发动作完成，整轮和终局另看状态。gate_reject、selection_dispatch在本批6023条decisions中均没有字段，不能把缺字段写成明确false；十一条fallback均false。不是每个decisions都有Jev请求：d285252/d286123是code续行，d286716是结束回合，无精确匹配Jev原行；不凭邻近question_id补配。F27原计划d286120与续行d286123分别记录，续行原文明确continuing the Jev-chosen plan，仍不伪造共用decision_id。

十一条动作前states均使用相同run_id、相同observed_ts与相同fingerprint唯一匹配，后继用同局状态顺序检查；不是通过时间近邻建立Jev所属局。第一次分析脚本误用states.ts比较observed_ts导致0匹配，audit-first-zero-joins.log保留；改为相同observed_ts加指纹后11/11唯一匹配。另保留初始导入路径失败说明，未影响原始提证。

84个状态窗口仅提取与这些问题有关的HP/挡/能量/药栏/能力/手牌/敌状态供人工核验，state-window-refs.json保留完整原行出处。脚本流式处理全部6272个本批states建立资源链，模型没有通读全部状态字段。44条run-plans与293条brain已提取保全，但本轮未逐题精读；不据其内容重估路线或大脑构筑。

### 三次护栏

ZTRG F11T3 j30888原答plan1/0.97，d285301记HP guard改plan2；s291941→291944从52HP/敌40到出完三牌5挡/敌22，后继入口32HP，符合替线当轮20损/18伤。原线25损/26伤没有实打，不能说其整战更好或更差。
ZTRG首试F17T10 j30918原答plan1/0.04，d285405改防御；s292048→292050由21HP/敌112到9HP/敌109，替线12损/3毒伤得到核对。原探寻打击会抽3，未执行的后续牌不补成事实。
ZTRG末试F17T13 j31022原答plan1/0.52，d285745改plan2；s292393→292396保持4HP/敌73，16挡和虚弱建立，未造成原线7伤。两线短期各24/24死不证明必死或提供阈值；最后失败不等原线会赢。候选局部省血合计10、少伤24不是整场反事实收益。

### 铁心、蜃景与毒药水

K2 F27T2 j31081完整原题三方案，原答plan1/0.95；d286120开始该线，d286123实饮。s292788→292789 HP57/挡0均不变，覆甲0→7，支持原9c3勘误；旧c64的16原文保留。题面held value=0原因是potion table did not load，不是药效零或实测持有价值零。本批没有当时数据加载异常快照，不能把提示本身报成新的纯bug。

K2 F46T1 j31170三线短推演均0实赢/无地平线内死亡，1样本/3回合且降级；原答plan3/0.11，d286431出蜃景+，s293158→293159能量1→0、挡16→16，敌HP108/97/89不变。lasting value5或10是候选参考，不是兑现格挡。普通蜃景F46T6实际加10挡，是整类无效说的反例。已有5dbb窄分支在实际live祖先中，本批无需再提交相同源码；剩余尾端校准未完成。

79 F14T3 j31252：plan5空过原答0.89，d286684执行结束回合；s293431→293432保持51HP、敌45。plan1同轮0损/19伤、plan3同轮0损/10伤，plan5同轮0损/0伤；它们五轮八样本都无实赢且无死亡，约81/72/76%来自尾端估计，不得把0赢当8死或把较高估计当自然收益。未实打其他线，不能制定强制不空过规则。

K2 F33T10 j31120/d286255实饮毒瓶，s292940→292941毒42→48、敌54HP/78挡不变、玩家10HP/7挡不变，随后s292942恢复62HP及原瓶。第二试s293007胜后28HP且原瓶仍在，反对把首试饮药当最终消耗或必须饮药的胜因。
79 F14T11 j31272原答毒瓶e0/0.55及lethal/0.95，d286715实饮，s293463→293464毒4→10/敌8HP不变；d286716结束后s293465玩家0HP、敌8HP/10毒未结。手中三感染完整文本每张3伤，不能预支毒杀取消玩家先死。两例只证明这两个实盘组合的施毒当步，未验所有修饰和完整候选/rollout消费者。

## 资源链与已有源码

resource-chains.json保留全部十局的进出HP/maxHP、药栏、胜战损耗、首帧/缺出口、restart及敌HP审计。ZTRG六次F17均68/70与铁心/潜能进，前五缺出口标restart，末次GAME_OVER。K2 F31的75→40、F33首试10→SL62、末试62→28且保毒瓶、F35的65→41、F38的61/95→53/91、F39的53→42以及末战86/91→0均保留。79 F8的47→7、F12的49→30、F14的51→0也保留；赢战不免记血价。

机械资源变化不能自动给药栏每次增加判“新取得”或“SL恢复”，没有原动作和SL联合归属时保留未知；observed_net_hp_loss是净差，不等敌伤。缺出口不补终轮，新增敌体不当负伤害。全链可见状态重建不代表所有消费者真实读回，也不提供另一条路线/时点受控结果。既有resource_chain工具足以生成这些材料，本次不重建同功能框架。

code-provenance.json记录实际base/live、六个相关源码文件SHA与祖先核验：

- 5dbb47bfb48d652adfcda2e62c166a804098b6c3：升级蜃景零毒窄分支，实际live祖先；非整项645/ff完成。
- 7c43bbbb98f58ff3bfe9a68a04d8539ebb187d6a：Silent路线绝对HP/maxHP/节点/成本来源，实际live祖先；原提交本身注明partial，不关闭9edf宽链。
- 154c9542711a4daf17bfa0b97eaa1ca81dc3d385：已有另一严格蟹盘面的施毒事实字段，实际live祖先；源码明确whole_turn_simulated=false，证据局不属本批，不据此补68ef全范围验证。

只读源码核对还确认铁心plating与牌挡分列、普通蜃景和HP护栏入口现存。源码存在不等自然采用或收益；这次没有把partial实现改登记整案duplicate。

## 逐项处置

以下每项保持原CLI id与账本链接；无新提案、无重复历史复盘、无账本状态改写。code_proposals为消费的十个既有id，implementation_domains=[]表示本次无实际实现。

- **silent-proposal-0b8ef30de463f317**；账本silent-0013, silent-0277；waiting：铁心即时挡与覆甲分源已有模型；已补可见资源链，但缺原运行药水表加载异常快照、消费者联合归属及晚饮/留药整战对照。

- **silent-proposal-5367449b857450a7**；账本silent-0012, silent-0013, silent-0046, silent-0149, silent-0277, silent-0284；waiting：力敏、脆弱及覆甲窄观察不支持重复接线；铜钹多敌随机分配、多弃/减损隔离及刀扇多目标完整原题与后继尚未核齐，不扩展整个机制组合。

- **silent-proposal-9b8890c2649a2734**；账本silent-0012, silent-0019, silent-0020, silent-0021, silent-0125；waiting：三次护栏原答、改写及实际后继已核；未执行原线没有整战结果，不能用局部省10血/少24伤重拟护栏阈值。

- **silent-proposal-645ff7b72e0b9991**；账本silent-0010, silent-0106, silent-0021, silent-0286；waiting：零毒升级蜃景子项已有live祖先5dbb47bfb48d652adfcda2e62c166a804098b6c3；尾端估计未有终局校准、替线未实打，整项不能记duplicate。

- **silent-proposal-68ef2857229d1287**；账本silent-0278, silent-0286；waiting：两次实际施毒加6、当步不扣本体已核，但一例随后SL、另一例感染先死；跨候选/后继推演/目标的条件化消费者覆盖及校准仍缺，不外推完整毒药水模型。

- **silent-proposal-9edfef7a6b2873c2**；账本silent-0020, silent-0019, silent-0021；waiting：路线来源字段子项已有live祖先7c43bbbb98f58ff3bfe9a68a04d8539ebb187d6a；可见18/7场尝试资源链已重建，仍缺预测节点至实际消费者的完整对齐与SL/取得/丢弃联合读回。

- **silent-proposal-ff1d168227e369e0**；账本silent-0010, silent-0012, silent-0013, silent-0046, silent-0077, silent-0115, silent-0178；waiting：零毒升级蜃景子项已有实现；重放/暗影/临时减力/逐击减损组合的逐消费者覆盖及T7额外2伤源仍未隔离，提案所含UJ0K3G10609Y不在本批，不借证补齐。

- **silent-proposal-c64bdd50a949d16f**；账本silent-0021, silent-0243, silent-0276, silent-0277, silent-0278；waiting：采用F27药前后0挡、覆甲0→7的原勘误并保留旧16原文；缺实际能力/药水时点到终局的条件对照及联合消费者归属。

- **silent-proposal-243ad8dd038a4ff6**；账本silent-0019, silent-0020, silent-0065, silent-0106；waiting：帝王蟹两试初始资源相同且末试保留毒瓶获胜，但目标与多步出牌同时变化；缺单因素整战与替路线实走对照，不能归因留药或首目标。

- **silent-proposal-9c3ff04261867dd2**；账本silent-0021, silent-0243, silent-0276, silent-0277, silent-0278；waiting：F27零即时挡/7覆甲勘误原帧及原题已核；跨幕/SL资源可见链已重建，完整消费者归属、药水表异常现场及饮用时点整战对照仍缺。

## 验证和交接

- 原始提证两个入口、全角色结束核验、10份提案SHA、11个精确动作前关联与精读原行byte/SHA回读通过。它们是证据机械检查，不是tsc/vitest或收益实验。
- 生产源码、任务模板、知识与Git追踪文件无变更；base.diff.patch为空；无提交、无live合并、无release_id分配，未运行play或联网。
- 无生产源码修改，未跑tsc/vitest，不声称撤源码失败/恢复通过。tests固定{"tsc":null,"vitest":null,"cases":null}。没有提交，提交前gitleaks步骤不适用。
- 失败保留：run角色小写断言、分析脚本导入路径错误、第一版0关联检查均见audit-initial-failures.txt/audit-first-zero-joins.log；修正后audit.log正常，原始证据未覆盖。
- 运维交接提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-204302/learner/runs/20261020-204333-9afd2565-40de-45a5-8003-8da9a3e3e5ad-strategy-proposal/proposal.md。逐项proposal_results见result.json；waiting保留原调度重派机制，不标shipped、不关闭父学习要求。
