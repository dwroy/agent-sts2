# 本批策略提案复核报告

记录时间：2026-10-20T09:59:08+08:00。角色 silent；批次 `20261020-094301-s2-strategy-proposal`；基线及最终 HEAD `eb6b71c143865769d8ae9840f587d2b6f2197905`。

结论：10 个派发提案全部 waiting，本批未取得足以实现新策略或关闭整项提案的新增证据。没有生产源码、任务模板或知识修改，没有提交、live 合入或新发布编号。撤源码失败/恢复通过不适用；tsc、vitest、cases 均为 null，没有冒报成功测试。scratch 内 Python 只生成离线证据材料。

## 身份和范围

开工 git status 为空。只读根 learn.json 的本批行并保存 `dispatch-row.json`：task=strategy-proposal、character=silent、reason=proposal、工作树正确，proposal_ids 正好 10 个；无 research_request、implementation_request 或 proposal_repair。本批不是纯研究专题；根 deck-size 请求属于另一批，不承接、不改请求。按普通流程执行 git merge --no-edit main，结果 Already up to date；没有改写 ordinary_baseline。未领取队列其他 id。

`run-identity.json` 保存 runs.jsonl 原始 10 行、offset/bytes/SHA：角色均 SILENT 且 ended 非空、局号无重复。F4QKG4J1AJJZ 为 A9，其余为 A10；十局均败。原日志记录 dirty 版本，不能由该标记恢复完整运行树。本批不读取其他角色知识；旧题面内自带的其他角色历史统计只作为历史请求字节保留，不作为本角色游戏事实或独立分母。

10 份原 Markdown 均完整阅读并核对登记 SHA。6 份旧 exp 路径失效，通过已验 archive_sha256 的原工作树归档只读取精确成员到本批 scratch，未展开整个仓库或重建旧工作树。出处见 `original-proposal-provenance.json`，原字节在 `original-proposals/`；其余 4 份从原路径核 SHA 复制。未改提案原文、根请求、队列历史或复盘。

## 冻结提证与缺失

按指定入口依次启动 evidence_summary、v6 专项 extract_evidence、默认 extract_evidence。摘要只用作事实索引，没有把 last_five 当完整覆盖。两次 extract 切点独立保留；运行中日志继续增长，所以 decisions/v6-build 的 source_size、前缀 SHA 不同，不把后切点冒充旧切点，不覆盖初稿或虚构截断缺失。

| 产物/流 | source_size | 冻结前缀 SHA256 | 本批匹配行 | 无效/截断行 |
|---|---:|---|---:|---:|
| v6-evidence/v6-build | 21767940 | 00ea46b5d120b1bf639de6066a0d32ef9d7a026faa431604d5ea039120fd909d | 0 | 0/0 |
| v6-evidence/jev-prompts | 1834126838 | 4c8f036966c0352fa9ba766d5dae7ee7b0ce64285a6bc0130916af6712592ee8 | 1676 | 1/0 |
| v6-evidence/decisions | 2781494647 | a2574d2d5637506351124268f983ef1111a4fccece194e9ec5ae1f495a09abc8 | 6415 | 2/0 |
| v6-evidence/run-config | 2192876 | 5e50379b4c54207d9a2fff165bea3b4cdc99016ace44fea2003c5ae2ca3741f4 | 10 | 0/0 |
| evidence/states | 14624000222 | 103a1c3d24bc75a11fe1e0ad059c6e509dbefeb357702a71e39c09f0792c6146 | 6684 | 2/0 |
| evidence/decisions | 2781708180 | 4318ab1a4c84148aad1e119f4ba81166c140a97e73b35c543d495e33cf32459f | 6415 | 2/0 |
| evidence/sl-attempts | 49391038 | b9aaebf30c7735e531d9a32690380a49cf2efbbddfea20eafc71b8d75f8d8407 | 56 | 0/0 |
| evidence/run-config | 2192876 | 5e50379b4c54207d9a2fff165bea3b4cdc99016ace44fea2003c5ae2ca3741f4 | 10 | 0/0 |
| evidence/run-plans | 9719304 | e7d1a900ab27ab4268550c81bc454ea565c6b2e65d1790f4009664a54824f57c | 51 | 0/0 |
| evidence/brain | 1092918144 | 30dfc081d353cac3b41f4fe1a378bf6715b34b90c8feeace3261d06d817694d1 | 304 | 2/0 |
| evidence/v6-build | 23018643 | 209bbaafefaf5fe82930ba5dfc5b19c60f9424dd0c8e528b0503103ae9b3f8fe | 0 | 0/0 |
| evidence/jev-prompts | 1834126838 | 4c8f036966c0352fa9ba766d5dae7ee7b0ce64285a6bc0130916af6712592ee8 | 1676 | 1/0 |

逐行原始 offset/bytes/SHA、identity 字段与精确 decision_id 关联出处在各 evidence.jsonl，manifest 保留 source_size/source_sha256、计数、全局未知身份计数及有限 gap_refs。未知身份的最后五条只是定位入口。主专项 decisions 全局 unknown_identity=1934、unmatched_decision_id=1377，不将其正文、时间邻近或 question_id 类似字符串分配给本批。Jev 原始行采用显式 run_id 或 decisions 精确 decision_id 关联；目标 9 行同时核 fingerprint 和 run_id，无冲突。

V6 文件存在，但在两个冻结切点均未选到本批行；历史本批流缺口记 no_match，不记文件 missing，也不据此推断有效 entries、jev_answer、fallback 或 unknown 为零。这四类记录在本批均无可解释原行。十条 run-config 已核 Jev enabled/context=v1 和真实代码提交，但没有 V6 开关字段：显式 V6 off 未获记录，开关状态 unknown，不能把缺字段写为 off。没有本批 V6 完整题面，不能借新局题面或当前知识替补。

Jev 选中 1676 条 ask 行；已解析选中行未见非空 error，九个阅读窗口都有 answers；全源另有 1 条 invalid_json，无法分配给本批，不按“没有错误”消除。9 个精确 decision_id 在专项冻结 decisions 中各只匹配一行（`exact-dispatch-rows.json`）；本批 6415 条显式身份决策都没有 gate_reject/selection_dispatch 字段，记历史未记录，不能写成 gate 已通过或无拒绝。源码选择、Jev 答案、执行 result 和后继 states 分列。

默认提证完整流式读取 6684 个本角色 state，模型没有阅读整份 states 或所有局面。`selected-states.evidence.jsonl` 的 340 行和 `selected-decisions.evidence.jsonl` 的 50 行均逐行 seek 原 logs，重新核 offset/bytes/SHA 及解析对象一致。9 个题目的 before 均以显式 run、observed_ts 与完整 fingerprint 精确匹配；后果只沿该局原始连续状态窗口读取，不用时间近似建立所属局。

内容存储回执有 pending_host_seal=true/deferred_errno=18；这表示沙箱跨文件系统封存待宿主处理。本地证据和 SHA 验证已完成，不称宿主 sealed 或正式发布。

## 完整题面覆盖

模型逐字读了下面 9 条原 Jev request/state/questions（所有候选）、answers 和关联错误字段，再核 decisions 的 chosen/result/sl_explore 与后续状态。`raw-questions/` 保存其中及另 7 个预选窗口的原始字节；“保存”不等于已模型阅读。

| Jev 源行 | 精确 decision_id | decisions 行 | before state 行 | 后继边界 state 行 |
|---:|---|---:|---:|---:|
| 21832 | 7317119f-b368-4e07-8372-2812ffe7a802 | 248014 | 253285 | 253296 |
| 24819 | 179d25eb-635a-4870-9469-e3793b4e4637 | 260564 | 266259 | 266270 |
| 28209 | f459d9ea-34bc-4054-91d8-3b6094462289 | 274267 | 280348 | 280359 |
| 28211 | fed78f61-e646-42f4-b93d-84efa3e6575d | 274272 | 280354 | 280359 |
| 28424 | d0cca878-edab-48eb-93b2-7427cd07ebbe | 275342 | 281480 | 281484 |
| 28446 | 15fc6d36-ed83-4cde-b5e6-cbe4dffe9f5e | 275383 | 281536 | 281539 |
| 28628 | 2ef38219-ff73-4fcf-851b-c625adc04a86 | 275894 | 282075 | 282079 |
| 28663 | 8c880109-456d-43b3-887f-04302c922d89 | 275960 | 282144 | 282148 |
| 28764 | 64c16c85-cdb7-4b7d-ba05-95cda0851041 | 276139 | 282330 | 282336 |

| 局号 | Jev 匹配行数 | 已完整阅读的源行 | 未逐题读行数 |
|---|---:|---|---:|
| F4QKG4J1AJJZ | 167 | 未逐题阅读 | 167 |
| JLN5SK17W4FQ | 147 | 未逐题阅读 | 147 |
| 4D4J8USKCPAV | 167 | 未逐题阅读 | 167 |
| S9UZAK0JP0C0 | 247 | 未逐题阅读 | 247 |
| NB8KCF6HRGVF | 116 | 21832 | 115 |
| LS8035TB32P3 | 182 | 未逐题阅读 | 182 |
| 02HB4L0C3C67 | 42 | 24819 | 41 |
| KEN58SH9SLZ6 | 109 | 28209,28211 | 107 |
| TXZ6RVMQA09D | 171 | 28424,28446 | 169 |
| WQZVENQ7DTRP | 328 | 28628,28663,28764 | 325 |

合计完整阅读 9/1676 行，其余 1667 行未逐题模型阅读。原因：本批只复核已领取提案的局部代价、实际资源与容量窗口；其余题不构成所缺同预算整战对照或原局补证。`coverage.json` 对每条未读记录保存 source line、decision_id、具体未读理由；不把计数、脚本遍历、最后五条或 16 份原行复制称成完整阅读。原证据不在本批的五项按缺数据保留，未向外扩样本。

## 实际发现、反例与后果

1. KEN58SH9SLZ6，silent-0019/0020：本批确有 7 个 use_potion 动作，F3T2 攻击、F4T1 稳定、F5T2 速度、F11T1 虚弱/T2 攻击、F15T1 发光/技能；原始 states 的槽位与选择界面兑现，不能将 pending(unstable) 当已失败，也不能单凭该 result 当成功。F15 发光水原题是未知抽牌抽样、Jev p1，真实喝后七手变十手；后技能药题 Jev p0，decision result pending，后续 states 280355 确见 CARD_SELECTION 且槽位清空，274273 实际选牌后再出牌，280359 到 T2 仍 46 血。初题 no-potion 只是三轮四样本，未整战结束，不是留药到 Boss 的对照。F15 最终 REWARD 280377 仍 46，零损也消耗两药。六场赢战 F2/3/4/5/11/15 净损 0/3/0/37/6/0，总46；F5 53→16 必须计入。F12 states280336→280337 为26/76→53/81；F16 280382→280383 为46/81→75/86，是实际回复，SL复原不能混入。缺不饮/早饮/留药的完整后继，原105局统计本批没有重算。

2. TXZ6RVMQA09D，silent-0228/0255：F48 第二次与第三次 T6 before fingerprint 完全相同，48血/敌460。两题 Jev 都答 plan6；第三次 decisions275383 的 sl_explore 才把后续带毒刺击改羽化，不能将替换归给 Jev。原序列275342–275344，后继281484为45血/敌424，实损3/扣36；替线275383–275385，281539为48血/敌433，实损0/扣27。后续抽牌与能力变化未受控，不能归因整战收益。最终281563首战奖励帧4血空药，281564地图4血，281565新战4血/出牌0/敌111，281566 GAME_OVER0血/仍出牌0/敌111；不是敌22攻击已执行。首胜与连战成功分别验收；本批未读 T8 完整题面，既有“1200首胜全败后战”细节不作为本批新核数据。已读 T6 题面明确低可信、未校准、不能作必死/SL证据。缺两战受控完整替线，保留现规则。

3. WQZVENQ7DTRP，silent-0079/0018：F33 第2/3次 T9 同指纹26血/敌184，Jev都选侧步/逃离/防御；第三次 sl_explore 改飞镖/侧步/逃离。原后继282079为13血/敌160，损13/扣24；替线282148为4血/敌145，损22/扣39，多15输出也多损9血。24/24死亡与1200样本0胜不证明相同安全。反向约束：末次T7 Jev选双防御线，代码改逃离线；282330→282336为26→22血、245→221敌血，实损4/扣24，沙坑延长；不能据T9单例固定“总保血”或“总换伤”。仍缺固定后继与独立胜线，不调探索门槛。

4. 狡诈容量，silent-0030/0257/0258：完整读 NB8KCF6HRGVF F31T5 和02HB4L0C3C67 F2T2 原题，均把效果标未模拟。Jev分别 p0(confidence0)、p1(0.06)，实际 decisions248014/260564喝药；states253285→253286五手→八手，266259→266260两手→五手，均新增三张 upgraded=true 的 SHIV，基础6，现场力量使当前7/8，HP/能量未变。02 后续三刀与获奖实际存在，不把低信心当未采用。全批脚本精确动作/状态核41饮，分布36次添3、2次添2、3次添0；这是八个本批局，不冒称原九局42饮。WQ 第5次T11 decisions276102/103/104对应八→十、十→十、十→十（添2/0/0）；第6次276161/162/163对应五→八、八→十、十→十（添3/2/0），满手仍耗瓶。原九局中 SADL3CGYTGSR 不在本批，不借其补41为42。局部机制已实现，但本批旧版本记录不能证明当前版本跨动作、保留与SL恢复联合派发已自然采用，更不能证明穿插用药能救局。

5. 另外五项原局1913SE84AXQF/Q6M2Y34MWKRE/NHA2KW0RB7VP/K3676LU8B0UH/SADL3CGYTGSR不在本批。只读其已派提案原文及账本，不把本批相似情形重贴原局证据，不重写历史复盘，不拟新参数、不扩大角色或进阶。

`resource-observations.json` 保存115个精确use_potion前后窗口、实际战斗边界及上述回复源引用；其中多次SL耗同一存档的药，不能作独立获药量或独立局。初稿曾将战斗内CARD_SELECTION误分割为战斗退出，已改离线分析条件并重算；`resource-observations.initial.json` 和 `resource_observations.initial.py.txt` 原样保留，初稿边界作废，不用于结论。一次沙箱启动在执行分析前因并行临时目录消失而失败（bubblewrap/ripgrep），按同输入重启成功，不记生产代码或测试失败。

## 已有源码与逐项处置

核实际 live HEAD `c351dbe7b5603bbb591e0f63d88be32fa60df56f` 时，以下源码均是祖先；仅确认窄实现存在，不代表整项 duplicate、正式经验重新发布、下一局读回或自然收益。当前源码中生成限silent A7/A9/A10，开场扣血限已观察组合，普通紧勒保留未知交互标记。本批没有修改铁甲或任何角色行为。

- `6403fdcdadc803a092beb5165a068e22bf51c412`：Model observed Silent Cunning Potion generation and hand capacity；`git merge-base --is-ancestor` 返回 0。
- `e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`：Model observed Silent opening HP loss in continuous fights；`git merge-base --is-ancestor` 返回 0。
- `5c7105ff0294466da8319f2934beda05c6040794`：Model observed ordinary Strangle losses for Silent；`git merge-base --is-ancestor` 返回 0。

| 派发id | 原账本id | 原提案证据局 | 本批 waiting 理由 |
|---|---|---|---|
| silent-proposal-08eaa60bcc449852 | silent-0019,silent-0020 | KEN58SH9SLZ6 | KEN七次实饮、F15零损耗两药和两次真实回复已复核；缺不饮、提前饮或留至Boss的同预算完整后继，不能拟合持药价格。 |
| silent-proposal-92920295a648b540 | silent-0228,silent-0255 | TXZ6RVMQA09D | TXZ两次T6同指纹局部差额与首战4血、F49开场0血已复核；缺两战完整受控替线及独立校准，不能据首胜或低可信0%改变SL/终局权重。 |
| silent-proposal-a327449c331efbc1 | silent-0079,silent-0018 | WQZVENQ7DTRP | WQ同盘T9多15伤同时多损9血，T7付4血换沙坑延长构成反向约束；缺同抽序完整胜负与独立排序验证，不拟固定交换阈值。 |
| silent-proposal-a099e89437e942bb | silent-0030,silent-0257,silent-0258 | 02HB4L0C3C67,4D4J8USKCPAV,F4QKG4J1AJJZ,JLN5SK17W4FQ,LS8035TB32P3,NB8KCF6HRGVF,S9UZAK0JP0C0,SADL3CGYTGSR,WQZVENQ7DTRP | 生成与手位子实现6403fdcdadc803a092beb5165a068e22bf51c412已为实际live祖先；本批41饮只覆盖原9局中的8局，缺当前版本保留容量、跨动作重读、SL恢复和最终派发联合验收，不以子项关闭整项。 |
| silent-proposal-47910f82a1fdd98f | silent-0018,silent-0019,silent-0020,silent-0021,silent-0025,silent-0079,silent-0198,silent-0228,silent-0255 | TXZ6RVMQA09D,WQZVENQ7DTRP | 开场4血子实现e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a已为实际live祖先；仍缺连战完整后继、SL双向血价及持药价值联合校准。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019,silent-0020,silent-0050,silent-0253 | 1913SE84AXQF,Q6M2Y34MWKRE | 原证据1913SE84AXQF/Q6M2Y34MWKRE不在本批；KEN资源链不能替代原两局同预算早喝/留药整战后继，缺独立终局价值验证。 |
| silent-proposal-38a49e6c97f31eea | silent-0006,silent-0011,silent-0025,silent-0044,silent-0050,silent-0064,silent-0133,silent-0253,silent-0259,silent-0261,silent-0262 | 1913SE84AXQF,Q6M2Y34MWKRE | 普通紧勒子实现5c7105ff0294466da8319f2934beda05c6040794已为实际live祖先；原1913/Q6不在本批，弃磨蚀、自动效果、增益分源、再生及恢复后继的联合覆盖未满足。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019,silent-0020,silent-0021 | 1913SE84AXQF,Q6M2Y34MWKRE | 原1913/Q6不在本批；KEN与TXZ的实际入口资源不能代替原事件、路线或休息替线配对，原109局统计未重算，缺完整因果后继。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | NHA2KW0RB7VP | 原证据NHA2KW0RB7VP不在本批；WQ饱和探索不能替代原局跨弃牌计划归属、同预算排序及独立后继验证。 |
| silent-proposal-04b6b430759815ed | silent-0005,silent-0006,silent-0021,silent-0011,silent-0065,silent-0264,silent-0079,silent-0133,silent-0169,silent-0189,silent-0013,silent-0053,silent-0162,silent-0265 | NHA2KW0RB7VP,K3676LU8B0UH,SADL3CGYTGSR | 原证据NHA2KW0RB7VP/K3676LU8B0UH/SADL3CGYTGSR不在本批；缺油灯首次消费在跨动作、新战和SL恢复间的联合验证，不外推通用取整。 |

全部原id保留；不创建重复代码提案id、不直接更新队列文件。最终 JSON 的 code_proposals 是这10个已有CLI登记id；implementation_domains=[] 表示本批没有实现任何新领域。后续验收由原调度器消费 proposal_results，不能把本报告写入当队列已更新。

## 验证、账本与交付边界

证据核验通过：十局身份、十份Markdown SHA、9个题面精确关联、340 state与50 decision原字节回查、3个实际live祖先。它们是离线机械/数值核验，不是生产tsc/vitest，不是撤源码反证测试。未改生产代码，按任务无源码口径跳过测试及合入，不造提交/版本/shipped/规则通知；无需生产回滚。原工作树与失败材料保留，由原调度器回收。

仅经根 learner/ledger.py update 为31个既有账本追加本批报告/提案链接及处置 note；不改 claim/evidence/status，不把已shipped降回proposed，不把waiting升为shipped。新策略提案证据不足，没有新建账本条目。CLI输入/输出和追加后核验另存 ledger-update.jsonl、ledger-update.stdout、ledger-readback.json；若CLI拒绝则保留失败，不冒记已登记。

运维交付路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-094301-s2/learner/runs/20261020-094306-c37883da-e797-4451-815c-57a67f8d77c7-strategy-proposal/proposal.md`；完整结构化结果：`result.json`。本批只交证据复核与具体缺数据处置，不证明正式发布、后续消费者采用、收益或父学习要求完成。

最终验收（2026-10-20T10:01:40+08:00）：根ledger CLI退出0，31条note逐项读回，claim/status均保持；Gitleaks dir退出0，扫描约390MB、无泄漏；HEAD仍为eb6b71c143865769d8ae9840f587d2b6f2197905，git status严格为空，生产/HEAD差异均0字节。验收见verification.json、ledger-readback.json和gitleaks.stderr；不代正式测试或上线。
