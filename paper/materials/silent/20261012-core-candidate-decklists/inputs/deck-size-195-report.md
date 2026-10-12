本批不能支持牌越多越好，也没有验证越薄越好或固定最佳张数。衡量新增一张牌应把实际牌组变动、当前缺口、首次到手/合法可打/实打与已兑现效果、HP/药水/金币代价分开；拿/跳/删须按现场条件比较。186局纯Codex首试6胜、含SL最终10胜，A10的148局0整局胜，未能识别牌数的独立收益。 这些是历史观察及可供后续构筑使用的评估框架，尚未验证自动拿牌、删牌阈值或收益改善。


# 静默牌组规模与边际收益研究

生成前已运行date：2026-10-10T15:24:44+08:00。请求 `roy-20261010-silent-deck-size-value`；批次 `20261010-150327-strategy-proposal`；完整基线 `a324c6afa3427d6edc5e876f38328e7503b4ccf3`；manifest SHA256 `f816d243230b8e629a9d1ce1a1de42df445a20c978db400b4090de52c1dcc1f3`。


## 身份、冻结与覆盖


根请求running/batch/worktree、learn.json实际research_request、独立registered_bound回执、dispatch_base、两份输入SHA和十个无重复派发锚点均核实匹配。按更严格的任务第1.2节，HEAD保持dispatch_base，不合入后续main。只分析冻结195个SILENT结束局；锚点10局没有替代全历史。covered_runs为全部195局、exclusions=[]，逐局表在文末。每局均实际核对原run记录、脑来源、配置、状态/决策、阶段牌组及结果；深读案例另列，未声称逐局人工复盘每一动作。

本轮通过现有只读DuckDB索引查询明确run_id及off+len<=冻结上限，之后seek原日志、核局号/角色、逐行SHA。单进程nice 10，DuckDB threads=1，不sync，不读取别的角色知识。manifest冻结副本和role-matched复盘/经验、原核心报告的SHA已核；原混合角色复盘全文未读取。源日志持续追加不进入本研究。

| 来源 | 冻结字节上限 | 核对原行 | 核对原字节 |
|---|---|---|---|
| runs.jsonl | 279441 | 195 | 86434 |
| run-config.jsonl | 1188301 | 198 | 903926 |
| brain.jsonl | 374735144 | 6537 | 229337269 |
| sl-attempts.jsonl | 27809868 | 1202 | 24813347 |
| decisions.jsonl | 916121008 | 126960 | 456602016 |
| states.jsonl | 10743826125 | 132387 | 4476736548 |


原抽取共267479行。states原行4.48GB仅角色限定读取，全部分析字段与偏移SHA存compact/offsets，原字节仅封存实际报告引用、全部阶段及终局、组件窗口样本。runs/brain/decisions/SL/config的匹配原行全部gzip保存。精选原行2365条另有127条行动相邻状态原行；无伪造全states前缀SHA。


## size_outcome：张数、阶段与结果


主战绩按eval/brain_source.py的codex-successful-brain-v1：实际成功答案、题号去重、已记录脑题全部闭合；不用启动配置、字段名或理由证明来源。PYE4VXNSLGSS有一个未解决脑题，保守unknown，即使其他成功回答属于Codex也不纳入主组。

| 实际来源 | 独立局 | 首试整局胜 | 含SL最终整局胜 |
|---|---|---|---|
| codex | 186 | 6 | 10 |
| deepseek | 5 | 0 | 0 |
| mixed | 3 | 0 | 0 |
| unknown | 1 | 0 | 0 |

首试失败包括真实死亡和执行层判死截断，不能把predicted_death改写成游戏死亡。判断首试采用最早失败SL记录及最终胜记录；后续SL成功只计最终胜。到达阶段的“首试”意味着尚未经历更早的判死/死亡，不把重打样本当新局。

| A（纯Codex） | 独立局 | 首试胜 | 最终胜 | 获胜末牌N | 失败末牌N |
|---|---|---|---|---|---|
| 0 | 7 | 0 | 1 | 40—40 | 23—44 |
| 1 | 3 | 0 | 1 | 34—34 | 27—31 |
| 2 | 2 | 1 | 1 | 37—37 | 30—30 |
| 3 | 1 | 1 | 1 | 37—37 | 无败样本 |
| 4 | 4 | 1 | 1 | 33—33 | 26—37 |
| 5 | 1 | 0 | 1 | 34—34 | 无败样本 |
| 6 | 9 | 1 | 1 | 49—49 | 16—45 |
| 7 | 7 | 1 | 1 | 32—32 | 24—44 |
| 8 | 1 | 1 | 1 | 41—41 | 无败样本 |
| 9 | 3 | 0 | 1 | 36—36 | 32—32 |
| 10 | 148 | 0 | 0 | 无胜样本 | 17—42 |

末牌表仅描述终点。A6一局49张首试胜，另有16张F6死亡；A7一局32张首试胜而24—44张均有败。低阶进阶、资源和版本不同，不能由这些共现宣布厚/薄导致结果。A10末牌17—42张全部失败，没有任何可拟合“最佳张数”的正例。

阶段取每幕首次有手牌的COMBAT帧，真实牌组、多重集组成、HP/金币/药水和原SHA都保存，不按终牌倒填。首个有手牌之前的初始化空手帧可能早于开场回血，已另存raw_start_ref；没有把初始化HP当完整入战资源。A10主组如下；全部进阶/来源的42层组合见phase-strata.csv。

| 幕 | 含SL到达独立局 | 首试到达 | 当时N最小/中位/最大 | 含SL到下一幕 | 首试到下一幕 |
|---|---|---|---|---|---|
| 1 | 148 | 148 | 13/13.0/16 | 112 | 100 |
| 2 | 112 | 100 | 18/24.0/28 | 57 | 38 |
| 3 | 57 | 38 | 23/30/39 | 三幕整局胜0 | 三幕首试整局胜0 |

没有只看boss幸存者：148个A10主组全含首幕样本，36局未有二幕入战帧；二幕112局、三幕57局是实到分母，未到局不能补N=0或后幕牌组。第三幕首boss胜与完整通关分开，如49HL F48赢但F49仍败。

为检查单调共现，按A10每幕观察N的四分位切组（纯描述，不作游戏阈值）；同值归同组。二幕Q1=22/Q3=25时，到三幕分别20/35、25/54、12/23，未出现稳定“张数越多越好”；这些组仍有路线、资源、组件、来源版本和先前SL差异，不能据此反向声称薄的优势。

| 幕 | 观察分组 | Q1/Q3 | 独立局 | 含SL到下一幕 |
|---|---|---|---|---|
| 1 | N<=Q1 | 13/14 | 86 | 64 |
| 1 | Q1<N<=Q3 | 13/14 | 34 | 27 |
| 1 | N>Q3 | 13/14 | 28 | 21 |
| 2 | N<=Q1 | 22/25 | 35 | 20 |
| 2 | Q1<N<=Q3 | 22/25 | 54 | 25 |
| 2 | N>Q3 | 22/25 | 23 | 12 |
| 3 | N<=Q1 | 29/33 | 23 | 整局胜0 |
| 3 | Q1<N<=Q3 | 29/33 | 24 | 整局胜0 |
| 3 | N>Q3 | 29/33 | 10 | 整局胜0 |

实际版本按阶段时点之前的run-config匹配，198条配置、176个记录commit、197个知识prefix SHA；196条dirty，不能把commit当作完整当时树。完整(version,experience,prefix,进阶,来源,幕)分层见version-strata.json，430个阶段层均n=1。版本分层已经做，但不足以隔离张数；不能强行合并为同版本试验或用终局code=current冒充固定提交。


## marginal_value：怎样复算一张牌的收益与代价


本轮提炼的是可解释的观察向量，不是未经验证的评分权重。先记ΔN=N_after−N_before，以及Added/Removed两个卡牌多重集差；再分项记当前已观察缺口、首次见手牌t_seen、首次现场playable=true的t_legal、首次真实出牌t_play、实际支付能量、增益/挡/抽弃/生成/敌血变化与资源变化。每一个未知字段保持unknown/null，不能默认为0。

| 指标 | 可复算口径 | 不能推出的结论 |
|---|---|---|
| 规模/来源 | 前后真实deck多重集及ΔN；连到奖励、购买、事件、返还、偷窃、变形/升级原命令 | 一次选择一定只加1张，或N不变就是无变化 |
| 启动窗口 | 初始持有c的战斗，分别记录首次见手牌、合法可打、实际出牌及终止回合 | 没见手牌等于全战永远抽不到，已见就会支付/产生收益 |
| 费用与兑现 | 同一真实动作的前后energy、playable/阻止原因、powers、block及牌堆原组 | 牌面或大脑愿望就是整战实际收益 |
| 逐轮生存/推进 | turns保存HP、挡、意图、出牌和边界；行动帧另保存敌血及增益 | 净HP差就是未被回血掩盖的总损伤，池消失就是本体毛伤 |
| 资源/机会成本 | 相邻实帧HP/药水/金币；战后回血、开场回血、SL恢复单列 | 删除100金币的收益必高于药水/遗物，或留药必能赢 |
| 后续验证 | 同阶段/进阶/已核来源与记录版本的到达、资源和启动变化，按独立局计 | 自然观察直接证明单卡因果或胜率已提高 |

真正的边际收益需在相同状态比较“选该牌”和“维持/其他选择”的后果。本历史没有受控整场配对，ΔN与局部已执行效果可核，未选择分支的Δ胜率、Δ抽到时点和Δ整战HP不可识别。已有boss_sim只是模型预测，未当实盘对照，也未新调用模型或模拟器。推演同值仍为并列，不删选项。

A10主组在最早整局失败之前、初始持有能力组件的boss首个尝试窗口如下。一个run可以出现多个boss，两个分母同时给出；这不是多个独立整局，也不是卡牌胜率。未见/未打包括战斗提前结束和判死截尾，合法但未打还可能是现场取舍；不能将差值归因牌组厚度。

| 组件 | 独立局 | 战斗窗口 | 见手牌 | 见合法可打 | 实际打出 | 见但未打 |
|---|---|---|---|---|---|---|
| ACCELERANT | 48 | 84 | 82 | 81 | 76 | 6 |
| ACCURACY | 2 | 4 | 4 | 4 | 2 | 2 |
| AFTERIMAGE | 19 | 28 | 27 | 27 | 22 | 5 |
| FOOTWORK | 71 | 119 | 117 | 117 | 113 | 4 |
| INFINITE_BLADES | 6 | 8 | 8 | 8 | 6 | 2 |
| MIRAGE | 23 | 38 | 37 | 37 | 29 | 8 |
| NOXIOUS_FUMES | 62 | 124 | 123 | 123 | 115 | 8 |
| SERPENT_FORM | 5 | 11 | 10 | 10 | 4 | 6 |
| TOOLS_OF_THE_TRADE | 10 | 12 | 10 | 10 | 7 | 3 |
| WELL_LAID_PLANS | 6 | 9 | 8 | 8 | 2 | 6 |

first_seen/first_play的中位数来自不同未截尾子集，不能相减当平均等待成本。未区分相同ID的物理副本、临时生成或复制；本表只用于检查“持有/到手/执行不是同一个量”。全历史3528个战斗片段、5417个组件窗口仅为明细，未当3528/5417个独立局。

4,453次相邻状态的牌组变化：3,546次净增、270次净减、637次N相同。基于邻接命令的来源链接有2383次reward_linked、754次purchase_linked、320次event_linked、131次removal_linked、49次transform_linked、583次upgrade_or_enchantment、233次other_or_ambiguous。它们是时序候选关联，含重打/多动作交叠；只有深读案例据原卡和现场兑现确认具体来源，不能把所有净减都称主动删牌。reward命令2383次与实际加牌净数2386不同，PU80复制明确解释一部分；不把总差强归某一种机制。


## construction_guidance：有限、可使用的拿/跳/删评估


以下是下一次构筑问题可采用的检查问题。证据支持分账方法和各局现场事实，尚未证明采用这些检查会提升胜率；不转换为自动执行规则。按本轮对195局的综合，只保留一个跨历史候选silent-0374，局部机制和四核心沿原身份合并。

| 建议 | 适用条件与期望行为 | 支持/反例与独立局范围 | 限制 |
|---|---|---|---|
| 拿：补已观察缺口，并检查启动 | 说明新牌本身解决什么、必要配件是否已在、能否支付且活到效果；保留已见即时过渡 | PU80 F6触媒/F19才得毒源/F33未建；LLY F48 T3余像实建且胜；49HL F48/F49重启对比，3独立局 | 不是要求先毒后触媒的固定选牌次序，不能给未获得组件预支收益；低阶反例不迁移A10 |
| 跳：只算仍能兑现的部分 | 候选抽牌被封锁/缺配件时降低该未兑现分支的确信，同时单算挡、弃牌、生成、即时攻击；比较其他选项和整次skip | 25226 F36选偏折/F44选突然一拳/F46整次skip，F48后空翻仍10挡；LLY F9整次skip后照样有41张胜，2独立局 | 不是有封锁就禁拿所有抽牌牌；跳牌是否改善整战未知，理由不等收益 |
| 删：真实替代与资源成本先写清 | 比较删几张、付多少、现有伤害/挡是否还够、替代已兑现否；变形与升级不算缩小 | 49HL F22购两牌后删一打击付100金/F44变形N不变；25226 F31删打击付100金但后购抽牌受小提琴封锁，2独立局 | 无不删/删另一张的受控战果，不设自动删基础牌、统一顺序或固定N门槛 |

四核心核对：毒防silent-0352、叠敏防御0353、刀源增益防御0354、抽弃遗物0355及冻结经验条目保持原身份、原181局口径与置信度。未把新批195局自动改写其签名分母，也未把更早低阶实际能力兑现等同A10全boss方案。前两项提醒主要合并silent-deck-burst-observation、silent-fiddle-draw-lock、silent-bing-bong-tooth-five-rings和四核心；删牌评估限制放入同一综合候选，不另造单局重复经验。


## counterexamples：支持、反例与精确案例


大牌能成功、小牌能失败都只反对无条件必然性；不证明提高/降低N的因果效果。每条建议的支持/失效条件同时保留：

1. PU80F84P6HPN A10：F28佩尔返还升级打击被宾邦复制25→27，卡奖手上技法再27→29；F30再返还29→31、HP14→35（五轮书20＋芝士1），卡奖斗篷31→33；F31计算下注33→35、HP3→23。增长有实际资源收益；F33四轮步法未见、触媒T3见但未打，持牌能力T1确实建，仍死亡。F19普通步法被偷只剩升级步法，采用原勘误，不恢复错误“两步法”。F17相同22张的五次尝试最后以2血通过本体/自爆；数量不变也可有不同结果，整战胜因未隔离。

2. 25226ZFLNR1J A10：F31删打击27→26付100金，后空翻49金26→27、致命毒药51金27→28；F34取得小提琴。F48末试T3毒雾能量4→3、手7→6，draw12→12、能力3已建；T8后空翻能3→2、draw6→6、挡0→10，新增状态牌使手数不能代替抽牌数。不能说全部效果无用；也没有无小提琴/不买后空翻对照。F36与F44是拒选其他抽牌候选但实际拿牌，F46原命令skip_reward_cards且前后35张相同。六次沙漏失败保留，不归单卡或牌数。

3. 49HL2N70CHMU A10：F22买步法37金、后空翻49金，27→28→29，再删打击100金29→28；F44把打击变手上技法35→35、伴随HP33→53，不能称删牌收益。F48实际36张72血、空药，毒雾T1、触媒T3、步法/工具T6，7轮赢至24血；F49开场小血瓶后26血，仍36张，三轮内未见毒雾，末试步法T1实付1费建2敏，触媒T2能1→0建1层但两敌无毒，T3仍失败。没有“不加末张触媒/不删打击会赢”的数据。相同N、不同启动和资源事实支持重新评估，并不能估第36张的边际因果。

4. LLYSRQQ35AVW A8：F9原skip命令、前后19张相同；F17 22张、F33 33张、F48 41张。末bossT3余像付1费实建，毒雾T5/触媒T4也实际打出；T7首试胜、70→60血。足以否定“厚就必坏”的无条件描述，不代表A10可照搬或所有41张都有效。

5. FH2HB2X17F2H A6：F6只有16张，19血进入、3轮死亡，之前已消耗血量；不把少牌作为充分生存条件，不归“薄”致死。10GPK5XGHCK3 A3 37张首试通关与C48LLXBGKXQ9 A0 31张F33失败也只作来源/进阶隔离的规模对照。

6. X4M1GPAJGAB9 A10：F17当时27张、双步法和毒雾，12轮以5血胜；F23实际31张、6血死。增加牌组、路线和前面赢战消耗同时变化，不能从同局27→31且后败断言四张额外牌导致死亡。


以下引用源文件为根目录logs/对应日志；偏移均为原文件字节，区间为[off,off+len)。SHA是原行完整字节而非JSON重序列化。全部原行在evidence/压缩原件与索引中。原派发日志raw也保留。

| 案例 | 原文件 | off | len | SHA256 |
|---|---|---|---|---|
| C48LLXBGKXQ9终局规模/结果 | states.jsonl | 6292942692 | 39046 | 67bd93f56a914f5e6f6af68c65b7a115a8b6550d5d64a2626c9414e11e0ff05f |
| FH2HB2X17F2H终局规模/结果 | states.jsonl | 6739938662 | 23764 | 2139dc53d300f0f681ed1ea3f7bf49c308bc1ea157e4c64b32075f64e141a13e |
| LLYSRQQ35AVW终局规模/结果 | states.jsonl | 7267146170 | 36070 | 9874c020db7ff9715c3437deeeb09afc7b01aa473cb4076d0ea285458976f7d1 |
| 10GPK5XGHCK3终局规模/结果 | states.jsonl | 6614842418 | 32813 | f8a9423aeb3d643fa84a058c2c30a1f7c335a4e7b4d7d4d75837039851367ace |
| 25226ZFLNR1J F31 27→26后帧 | states.jsonl | 7363733121 | 31561 | efdd12c8fce37964f6bd4aa4ea5b2af330e4d961a002372c38f2ecc334238692 |
| 25226ZFLNR1J F31 26→27后帧 | states.jsonl | 7363764682 | 31830 | 1ad7fac2feefafba5d8806b733bd9ead79d87f3cb18b78092ea2a4d72f8755c1 |
| 25226ZFLNR1J F31 27→28后帧 | states.jsonl | 7363796512 | 31987 | 1803b771db2291359e223400910570abcdf0bfdf82ced88d2ce34b897ed26f6a |
| PU80F84P6HPN F28 25→27后帧 | states.jsonl | 7729458684 | 25990 | fac8252ef3f3bdab5da7606cf3e78d40b713b50b86f9c8c7aaf0cc758ba02acf |
| PU80F84P6HPN F28 27→29后帧 | states.jsonl | 7729593440 | 27783 | 4395aab4a7e144e93b0c8b4c520e6e545c1ffd77d29853874634ff69717a2aa5 |
| PU80F84P6HPN F30 29→31后帧 | states.jsonl | 7731071646 | 28053 | 4eb4c48a3a6faf315bb845b44f7d9861c64e7d40d700a27fa212ad50def5c1fe |
| PU80F84P6HPN F30 31→33后帧 | states.jsonl | 7731217145 | 29957 | 3224efa64e6faeba75aeb1ff6bd44d77a419ccabcbeb443a6fa172ba4e9efd7e |
| PU80F84P6HPN F31 33→35后帧 | states.jsonl | 7732578212 | 30664 | bb7d3d5d450e6babcef76cf40d8330cec62ee7378b8e7c9e92f07694dd2812d2 |
| 49HL2N70CHMU F22 27→28后帧 | states.jsonl | 10713181999 | 31044 | 1e45cabae8673e107f2cbf59696dc0c65001764a90c7f24f205427566a53b20d |
| 49HL2N70CHMU F22 28→29后帧 | states.jsonl | 10713213043 | 31317 | 8bade3ba688566d7d21e324387abacb551a18336d9534b05bf29aa7a61777713 |
| 49HL2N70CHMU F22 29→28后帧 | states.jsonl | 10713284622 | 30802 | 3eb97323868e2b7ab41a7cc666fea6ef05313d23c0e77b328a03c8b49a496035 |
| 49HL2N70CHMU F44 35→35后帧 | states.jsonl | 10724770788 | 33076 | 99dee1c5155bef9cecbc7455cfb2c5b57a3b51277295f44dd175648e82e4a7ea |
| 25226ZFLNR1J F48 T3 NOXIOUS_FUMES前 | states.jsonl | 7383716194 | 49536 | 88ab952bca40e0a5b4ee635fee8eab4e4ef2d27105dd25800dbfb0331c4285a8 |
| 同一行动后 | states.jsonl | 7383765730 | 48451 | 8881d0da47eaf4405092aa6b014ff079b6fc530003ea6704e4efbeb9264852fe |
| 25226ZFLNR1J F48 T8 BACKFLIP前 | states.jsonl | 7384780798 | 49786 | ff5bd1c4c2f49e0302669464c6d7939fc23e92fbf867e796b17961c6aec4241a |
| 同一行动后 | states.jsonl | 7384830584 | 50173 | 39873f3ccb7ebaec52f4a357cc923507bfd9f7792b849b508a0a1a7105f340b4 |
| 49HL2N70CHMU F49 T1 FOOTWORK前 | states.jsonl | 10732003435 | 51355 | 05613ae3c61f3cc5f8117ef6bd40ca63b36b0aa774080a7d9403ce00b13bb695 |
| 同一行动后 | states.jsonl | 10732054790 | 50467 | b9c8ca7de0b35c642a286c5d2fda7e4e3cfa24e4671bff76cb6e23c2b1e6d509 |
| 49HL2N70CHMU F49 T2 ACCELERANT前 | states.jsonl | 10732400649 | 47729 | 3e865c4845c1bc4fbaff99bb05ac236209f0a673f5472d23e6d89c4019391bb7 |
| 同一行动后 | states.jsonl | 10732448378 | 46797 | c9bb867e2650f8b3facb6494277b2b883a6751fc1bd72f0d6f16b193dc2e7379 |
| LLYSRQQ35AVW F9整次skip原命令 | decisions.jsonl | 550518610 | 7080 | f34338bc21d9721ef29283a73b6b141f5a265bbad3273744cdbd6e117f4caa01 |
| 25226ZFLNR1J F46整次skip原命令 | decisions.jsonl | 562887554 | 9578 | b2dadf11d8491534035b48b809a87fbeb45a7bee90a7654cb65b9e41a7c98725 |
| 49HL2N70CHMU F7整次skip原命令 | decisions.jsonl | 912553416 | 7856 | 561bdcb5326a8b8524e50866270e1a92020809dc9e002afdde7433ed843d88ca |
| X4M1GPAJGAB9 F17入战规模/资源 | states.jsonl | 10597812062 | 37304 | e1fdf5f4fd17f3e11b09c976731f1e2146f403bd9b855129a7aacc4788f16a65 |
| 同场结束资源 | states.jsonl | 10599509512 | 24865 | 112c9c2a15d57a450ae41e993fe4e2e73a2570cdf9e4e7cd1518c5da6f10dc43 |
| X4M1GPAJGAB9 F23入战规模/资源 | states.jsonl | 10603480610 | 39868 | e8f362c329f7d1fbf052ebed898b1fe55e720024516bdbb2e204d83273b814ec |
| 同场结束资源 | states.jsonl | 10604581732 | 34317 | adfd9533dd83ccc172bdb8ab1b203b1dfb3cc2e477a26c59b8fe109b93567e52 |


## limitations：验证边界、收益与后续


- 没有受控加牌、跳牌或删牌整场对照，不能估计一张牌的因果胜率或最佳张数。
- A10纯Codex148局均无整局胜；低阶胜利不能外推A10。
- 后幕和末牌组含存活/累计获得偏差；阶段表按当时真实首个有手牌帧，未倒填早期。
- 430个进阶/来源/阶段/提交/经验/知识前缀精确分层均单局；198条配置196条dirty，不能复原每局完整源码树。
- PYE4VXNSLGSS有一题未闭合，来源unknown；其他5局DeepSeek、3局mixed单列，不用于纯Codex主战绩。
- SL是同局重复观察，判死截断与实际死亡不同；JMH5C51RLN4E F17从T3才可见、TXZ6RVMQA09D F49无入口/过程。
- 冻结复盘49HL2N70CHMU小节complete_section=false；本轮用冻结范围内原日志补核，未改写原复盘。
- 首次见手牌/合法可打/出牌不等实际收益；未区分每张实体副本，未见手牌属观察窗口截尾。
- 大日志全冻结前缀SHA未知（runs除外）；已核使用原行偏移/长度/SHA并封存实际引用原字节。
- 没有源码修改、生产测试、入库、live上线或消费者采用，收益仍待后续自然对局验证。

状态只在决策点及少量观察点记录，动作内部逐击/未记脑题未知。fights.json中enemy_pool_progress是旧实体正向血量下降的诊断字段，未做新池、复活、回血、自爆占位、过量伤害的完整分源，未用于单卡价值排序或跨局输出结论；各深读案例以原敌血/增益与原复盘勘误为准。last_hp可能是结束前一帧，死亡看终局/SL结果；HP净差不能代替逐段总伤害。未见手牌的窗口也不是抽牌概率模型，没有假定均匀洗牌或用预训练知识补机制。

对后续自然局的验证建议：预先固定进阶、脑来源、源码/知识版本与阶段入口；记录选择前后多重集、理由所指缺口、独立局分母和实际到手/可打/兑现；逐阶段记录HP/药水/金币与首试到下一阶段，把先前SL恢复另列。等价指标保持并列，亏损或缺失条件明确呈现。足够可比数据到来后再评估候选，不预设改善幅度；不为研究运行play、改变参数或在线问脑。

入库候选：silent-0374，只经根ledger.py add登记，status=proposed、by=learner:strategy-proposal；proposal.md与ledger-registration.json保存实际ID/证据/来源。后续experience-update负责与原条目合并，保存before、自测、实际live与消费者读取，再核自然采用和收益。本批没有入库；既有四核心在冻结经验中本来已存在，不能把它们称本批上线。

没有具体出牌/药水/SL/终局价值规则或结构不一致的实现提案；本轮条件化构筑评估不改生产排名、选项或参数，因此code_proposals=[]、implementation_domains=[]。如后续拟改这些领域，另经真实代码提案CLI接链，不用本请求ID伪装提案ID。


## 校验、初稿与提交/合入


研究计算的原行/角色/冻结边界/SHA、统计分母及引用一致性已核；这些不是生产tsc/vitest。源码撤除失败/恢复通过不适用，无生产修改而未运行这两种测试。tests={tsc:null,vitest:null,cases:null}，fixes=[]、merged=null。没有提交、live合入、eval版本、shipped或双上线通知。工作树tracked/untracked非忽略文件保持干净，HEAD仍等于40位dispatch_base。

计算脚本和精确命令均保存本批scratch；执行前设置TMPDIR为本目录、PYTHONDONTWRITEBYTECODE=1、nice 10。extract_evidence.py：只读索引和冻结原行；analyze_history.py：分母/阶段/原帧组件窗口；measure.py：版本分层和原字节封存；inspect_cases.py：行动前后与整次跳牌核实；build_report.py：渲染本报告/JSON；validate_report.py：报告原件/覆盖/统计/基线核验。各次stdout/stderr及command-records.json保留。未联网、未安装依赖、未sync、未运行play。

结论变化/初稿：research-history.json保留H1—H5的初始假设、支持、反例、未知和结论；revisions/保留初始首帧口径、ISO时间配置匹配错误、playable字段补抽、JMH F49尝试分割旧版。JMH原连续片段包含六尝试而回合未下降，已按明确SL起止分开，全历史片段数3523→3528、组件5397→5417；核心研究分母195/186/148及首试/最终结果不变。权限辅助器一次并行临时目录消失的glob错误原文保留于历史记录，同一补丁重试成功，没有升级权限或把它报成代码失败。


## 全部冻结局的覆盖清单


以下195局全为covered，排除清单为空。脑来源unknown局仍有实际角色限定分析，但不入主胜率。逐局配置、原行数、终牌组成、首末SHA及阶段时点见run-inventory.json/version-phase-samples.json；未到阶段写未到，不虚构该阶段牌组。

| run_id | A | 实际来源 | 首试 | 最终 | 终层 | 末牌N | 各幕当时N |
|---|---|---|---|---|---|---|---|
| C48LLXBGKXQ9 | 0 | codex | predicted_death | 败 | 33 | 31 | 13/23 |
| Y6GM2CHWJBEY | 0 | codex | predicted_death | 败 | 17 | 23 | 14 |
| LRN0HPZ0FZS1 | 0 | codex | predicted_death | 败 | 48 | 39 | 12/21/31 |
| T082DRCUHRRD | 0 | codex | predicted_death | 败 | 48 | 35 | 12/22/30 |
| 1HC609GTLGN3 | 0 | codex | predicted_death | 败 | 22 | 29 | 13/25 |
| R0HEV5E3QT6G | 0 | codex | predicted_death | 败 | 48 | 44 | 14/26/36 |
| KAY522KT5NXR | 0 | codex | predicted_death | 胜 | 48 | 40 | 14/26/35 |
| E6AVMMVCSRPC | 1 | codex | predicted_death | 败 | 17 | 27 | 13 |
| XYYQYBRM2A01 | 1 | codex | predicted_death | 败 | 33 | 31 | 12/23 |
| K3676LU8B0UH | 1 | codex | predicted_death | 胜 | 48 | 34 | 12/21/28 |
| CSBR5CRDWQNB | 2 | codex | predicted_death | 败 | 33 | 30 | 12/22 |
| ZZMYZ5UBCG72 | 2 | codex | won | 胜 | 48 | 37 | 15/25/32 |
| 10GPK5XGHCK3 | 3 | codex | won | 胜 | 48 | 37 | 12/25/30 |
| 1NZ8FE5F34R9 | 4 | codex | predicted_death | 败 | 29 | 26 | 12/21 |
| F9PP859XZ3RJ | 4 | codex | died | 败 | 37 | 30 | 12/21/29 |
| 9YBKCNBFP0X5 | 4 | codex | predicted_death | 败 | 48 | 37 | 13/22/33 |
| 1LMBFGSMCWKU | 4 | codex | won | 胜 | 48 | 33 | 12/21/27 |
| ZE8F192FKX24 | 5 | codex | predicted_death | 胜 | 48 | 34 | 14/22/27 |
| FH2HB2X17F2H | 6 | codex | died | 败 | 6 | 16 | 13 |
| UACFSW4VDDLD | 6 | mixed | predicted_death | 败 | 48 | 35 | 14/24/30 |
| VN7RQJMJEFMX | 6 | codex | died | 败 | 42 | 35 | 13/24/28 |
| 75X1BARMNZ03 | 6 | codex | predicted_death | 败 | 20 | 24 | 13/24 |
| ARKQLHG6RS4W | 6 | codex | predicted_death | 败 | 33 | 30 | 13/23 |
| 6EV5V6PJJS9D | 6 | mixed | died | 败 | 39 | 30 | 13/22/27 |
| 8CFMW9SAGFWQ | 6 | codex | died | 败 | 24 | 26 | 16/24 |
| 2L1BNN9ZJEFU | 6 | codex | predicted_death | 败 | 48 | 38 | 14/22/33 |
| 53FLQ68CETW0 | 6 | codex | predicted_death | 败 | 48 | 45 | 13/25/35 |
| ENKYQMS9W4ZD | 6 | codex | predicted_death | 败 | 43 | 36 | 13/23/32 |
| 2SU6XN2AEJRD | 6 | codex | won | 胜 | 48 | 49 | 13/27/35 |
| SADL3CGYTGSR | 7 | codex | predicted_death | 败 | 48 | 36 | 13/24/30 |
| Z6CFLDR3N4SB | 7 | codex | predicted_death | 败 | 48 | 44 | 13/21/27 |
| 3KME36ADUE4U | 7 | codex | predicted_death | 败 | 27 | 31 | 13/24 |
| VLV17NUSFS61 | 7 | codex | predicted_death | 败 | 48 | 40 | 14/25/34 |
| 9YT51CK8RC39 | 7 | codex | predicted_death | 败 | 17 | 24 | 15 |
| 2PVLGRBGUX9S | 7 | codex | predicted_death | 败 | 48 | 35 | 13/23/30 |
| 4Y94N8RDPGPM | 7 | codex | won | 胜 | 48 | 32 | 13/23/28 |
| LLYSRQQ35AVW | 8 | codex | won | 胜 | 48 | 41 | 13/23/34 |
| HMVJKM56S4Q8 | 9 | codex | predicted_death | 败 | 33 | 32 | 15/26 |
| F4QKG4J1AJJZ | 9 | codex | predicted_death | 败 | 38 | 32 | 14/25/30 |
| G403VCZ3BH1B | 9 | codex | predicted_death | 胜 | 48 | 36 | 13/26/34 |
| MGA0CZDDKC0P | 10 | codex | predicted_death | 败 | 17 | 26 | 13 |
| 25226ZFLNR1J | 10 | codex | predicted_death | 败 | 48 | 35 | 13/23/29 |
| JLN5SK17W4FQ | 10 | codex | predicted_death | 败 | 33 | 32 | 14/25 |
| JMH5C51RLN4E | 10 | codex | predicted_death | 败 | 49 | 32 | 13/21/29 |
| 9TG1RP5LFAAK | 10 | codex | predicted_death | 败 | 49 | 36 | 13/21/29 |
| JQPT83P8KDSZ | 10 | codex | predicted_death | 败 | 25 | 24 | 13/20 |
| 4D4J8USKCPAV | 10 | codex | predicted_death | 败 | 17 | 23 | 13 |
| TD1HVGS7H6LB | 10 | codex | predicted_death | 败 | 17 | 23 | 13 |
| PJ2LL9KU7FHD | 10 | codex | predicted_death | 败 | 17 | 23 | 14 |
| S9UZAK0JP0C0 | 10 | codex | predicted_death | 败 | 33 | 30 | 13/23 |
| MCCK2602T1SR | 10 | deepseek | died | 败 | 7 | 17 | 13 |
| UJ0K3G10609Y | 10 | deepseek | predicted_death | 败 | 48 | 36 | 13/22/29 |
| U8K28UUGYP3U | 10 | deepseek | died | 败 | 11 | 21 | 13 |
| L9SGRBB5R698 | 10 | deepseek | predicted_death | 败 | 17 | 20 | 13 |
| D4LJ9QMGFB8Q | 10 | deepseek | predicted_death | 败 | 22 | 25 | 13/23 |
| 0NZXA12NLDMH | 10 | codex | predicted_death | 败 | 33 | 26 | 13/22 |
| 4ANT8D00TP72 | 10 | codex | predicted_death | 败 | 37 | 36 | 14/25/34 |
| XBD8Z9XLPCPN | 10 | codex | predicted_death | 败 | 33 | 28 | 13/25 |
| PU80F84P6HPN | 10 | codex | predicted_death | 败 | 33 | 35 | 13/18 |
| NB8KCF6HRGVF | 10 | codex | died | 败 | 31 | 23 | 13/18 |
| 5X2GHKJ89PN1 | 10 | codex | predicted_death | 败 | 48 | 38 | 14/24/30 |
| TCFAHJ9K19VY | 10 | codex | predicted_death | 败 | 17 | 24 | 15 |
| LS8035TB32P3 | 10 | codex | predicted_death | 败 | 42 | 36 | 13/26/34 |
| L704TLETMZBM | 10 | codex | predicted_death | 败 | 48 | 41 | 14/27/35 |
| KUZVERN40NGK | 10 | codex | predicted_death | 败 | 17 | 21 | 13 |
| BVF22RSFVBS9 | 10 | codex | predicted_death | 败 | 23 | 24 | 13/23 |
| ZVYUL2YP3518 | 10 | codex | predicted_death | 败 | 49 | 40 | 14/26/35 |
| VPW8YH7A4QFM | 10 | codex | died | 败 | 39 | 40 | 14/28/39 |
| DPYF2BAA3DKT | 10 | codex | predicted_death | 败 | 48 | 34 | 13/22/28 |
| CRK2HNYKSCZC | 10 | codex | died | 败 | 11 | 17 | 13 |
| HUVEPWQAHWFU | 10 | codex | predicted_death | 败 | 35 | 32 | 13/24/32 |
| UMVLWER4CD98 | 10 | codex | predicted_death | 败 | 48 | 39 | 13/22/33 |
| TU3XB4CAEDAW | 10 | codex | predicted_death | 败 | 40 | 37 | 16/26/33 |
| V0383V5S9BCQ | 10 | codex | died | 败 | 11 | 20 | 13 |
| 8R5CXD5C8PW8 | 10 | codex | predicted_death | 败 | 35 | 37 | 16/26/37 |
| QNTW139MGECA | 10 | codex | died | 败 | 28 | 29 | 14/24 |
| HSX4HYATB4E2 | 10 | codex | predicted_death | 败 | 48 | 39 | 14/23/29 |
| WYB0NCD6W83J | 10 | codex | died | 败 | 15 | 21 | 14 |
| 87LCSDR5P3DL | 10 | codex | died | 败 | 9 | 20 | 15 |
| TKXQ6L4N9A6U | 10 | codex | died | 败 | 22 | 28 | 14/25 |
| 02HB4L0C3C67 | 10 | codex | died | 败 | 12 | 17 | 13 |
| T3FW7R2R2306 | 10 | codex | died | 败 | 8 | 17 | 13 |
| P5HT1272P5SB | 10 | codex | died | 败 | 25 | 29 | 14/24 |
| KQQELQSZ382Z | 10 | mixed | predicted_death | 败 | 17 | 24 | 13 |
| YLYLZWHA0GKU | 10 | codex | died | 败 | 45 | 33 | 13/23/29 |
| 7ZUC4VPMDS41 | 10 | codex | predicted_death | 败 | 17 | 24 | 13 |
| 2Y27VAYZDA02 | 10 | codex | predicted_death | 败 | 22 | 30 | 13/26 |
| TDLBRNA0R05B | 10 | codex | predicted_death | 败 | 49 | 35 | 13/24/29 |
| MCT1GPTL8D35 | 10 | codex | predicted_death | 败 | 42 | 37 | 13/22/29 |
| W7BHM8U02RKG | 10 | codex | predicted_death | 败 | 17 | 21 | 13 |
| 01H1533KSS5C | 10 | codex | predicted_death | 败 | 17 | 24 | 13 |
| 2K4H3JEJHRSB | 10 | codex | died | 败 | 23 | 27 | 13/25 |
| ULP4TN1GNHMK | 10 | codex | predicted_death | 败 | 17 | 21 | 13 |
| CA5KE8GFJ9X2 | 10 | codex | died | 败 | 13 | 20 | 13 |
| 61E2QS63Y9WU | 10 | codex | predicted_death | 败 | 28 | 29 | 13/22 |
| 5PM6JAQG6FNQ | 10 | codex | predicted_death | 败 | 39 | 37 | 15/24/33 |
| DUZUBAJ3A8GP | 10 | codex | predicted_death | 败 | 30 | 33 | 15/27 |
| VLZ6CCT8AQ0A | 10 | codex | died | 败 | 45 | 34 | 13/25/31 |
| 8JRE1C4H4Z2W | 10 | codex | predicted_death | 败 | 33 | 35 | 15/25 |
| YF0LXT1QSTGG | 10 | codex | predicted_death | 败 | 48 | 35 | 13/22/32 |
| XP2SL33HT0D9 | 10 | codex | predicted_death | 败 | 33 | 33 | 13/24 |
| 751FN9QM9MHQ | 10 | codex | predicted_death | 败 | 17 | 22 | 13 |
| KV0JHNJCKXLS | 10 | codex | predicted_death | 败 | 33 | 29 | 15/25 |
| YQL8RZ8BWN1E | 10 | codex | predicted_death | 败 | 17 | 25 | 15 |
| KEN58SH9SLZ6 | 10 | codex | predicted_death | 败 | 17 | 21 | 13 |
| TXZ6RVMQA09D | 10 | codex | predicted_death | 败 | 49 | 33 | 14/22/30 |
| WQZVENQ7DTRP | 10 | codex | predicted_death | 败 | 33 | 31 | 13/24 |
| 1913SE84AXQF | 10 | codex | died | 败 | 31 | 31 | 13/25 |
| Q6M2Y34MWKRE | 10 | codex | died | 败 | 9 | 20 | 14 |
| NHA2KW0RB7VP | 10 | codex | predicted_death | 败 | 33 | 32 | 13/24 |
| G33HU22H2543 | 10 | codex | predicted_death | 败 | 48 | 37 | 13/25/32 |
| P74C04AEPL1F | 10 | codex | predicted_death | 败 | 23 | 29 | 14/25 |
| RC61MFQM63Y6 | 10 | codex | predicted_death | 败 | 33 | 27 | 13/22 |
| BTSRF7JL1W1Y | 10 | codex | predicted_death | 败 | 31 | 30 | 13/26 |
| XTSV1U9JD34T | 10 | codex | predicted_death | 败 | 49 | 37 | 16/26/33 |
| 9Z9H2EXKLF3T | 10 | codex | predicted_death | 败 | 48 | 38 | 16/26/33 |
| 7X0W3U8TVA2A | 10 | codex | died | 败 | 31 | 28 | 16/26 |
| MTQ0EUBJ3R6T | 10 | codex | predicted_death | 败 | 23 | 28 | 13/25 |
| KFRDELW2TH2P | 10 | codex | predicted_death | 败 | 33 | 26 | 14/24 |
| GXNKW8X1XYJP | 10 | codex | predicted_death | 败 | 45 | 36 | 16/25/30 |
| PD9AYQVMLQW6 | 10 | codex | predicted_death | 败 | 49 | 42 | 14/27/39 |
| L2TSFU62Z57Z | 10 | codex | predicted_death | 败 | 17 | 21 | 16 |
| ZTRGYYMLR8SC | 10 | codex | predicted_death | 败 | 17 | 22 | 13 |
| K2JAGKVJAWZJ | 10 | codex | predicted_death | 败 | 46 | 34 | 13/23/31 |
| 79UCJ0K6R9C1 | 10 | codex | died | 败 | 14 | 21 | 14 |
| NEWRFAYKTQHR | 10 | codex | predicted_death | 败 | 31 | 32 | 16/24 |
| 9R916WW0V65N | 10 | codex | predicted_death | 败 | 49 | 36 | 14/21/32 |
| T0DGVABPV60U | 10 | codex | predicted_death | 败 | 48 | 40 | 13/22/30 |
| G8NHLL09DLBX | 10 | codex | predicted_death | 败 | 24 | 27 | 13/22 |
| LYBHQ1X230ZB | 10 | codex | predicted_death | 败 | 30 | 26 | 13/23 |
| H1T1F8ML9FUE | 10 | codex | predicted_death | 败 | 48 | 38 | 13/23/32 |
| AD3QSC3P41JU | 10 | codex | predicted_death | 败 | 49 | 30 | 13/21/27 |
| 9DAS5L8YM1CN | 10 | codex | predicted_death | 败 | 23 | 25 | 13/23 |
| BJLTVSYXCSGS | 10 | codex | predicted_death | 败 | 42 | 31 | 13/23/27 |
| Y5H4CFAQ2WTG | 10 | codex | died | 败 | 33 | 30 | 14/22 |
| SY0WMJNNVRLM | 10 | codex | predicted_death | 败 | 33 | 32 | 16/25 |
| 4XLZURXMD872 | 10 | codex | predicted_death | 败 | 33 | 28 | 14/23 |
| QHK1XQ928TTM | 10 | codex | predicted_death | 败 | 33 | 35 | 14/25 |
| UZ1T7AH49WMB | 10 | codex | predicted_death | 败 | 25 | 28 | 13/22 |
| 7BNC8QX746YP | 10 | codex | died | 败 | 14 | 21 | 14 |
| CNKR125PFHJ5 | 10 | codex | died | 败 | 33 | 32 | 16/28 |
| PF90JTU0UZ5M | 10 | codex | predicted_death | 败 | 22 | 28 | 13/26 |
| 2H311EAD34GD | 10 | codex | predicted_death | 败 | 17 | 21 | 13 |
| WZL2AMEY85S7 | 10 | codex | predicted_death | 败 | 17 | 19 | 13 |
| R3AJCGQGGMR4 | 10 | codex | predicted_death | 败 | 45 | 40 | 14/25/34 |
| M0GY0A4M2F7H | 10 | codex | predicted_death | 败 | 17 | 20 | 13 |
| Z91JN3S3PQX2 | 10 | codex | died | 败 | 33 | 27 | 14/22 |
| LY83ZMTFVKJH | 10 | codex | predicted_death | 败 | 21 | 23 | 14/22 |
| HEMND3SMQYB8 | 10 | codex | predicted_death | 败 | 49 | 33 | 13/23/29 |
| P2M3DFJ4DEZ3 | 10 | codex | predicted_death | 败 | 49 | 35 | 13/24/29 |
| PBUBM0LRTEDD | 10 | codex | predicted_death | 败 | 49 | 30 | 13/21/26 |
| FU8ZUQHBHNV9 | 10 | codex | died | 败 | 8 | 20 | 16 |
| 456MRNGCPD8E | 10 | codex | died | 败 | 31 | 31 | 14/27 |
| J8PHG72DGD90 | 10 | codex | predicted_death | 败 | 33 | 29 | 13/23 |
| 0DJ6GFZZ0TG9 | 10 | codex | died | 败 | 33 | 27 | 13/21 |
| KSX97DF5H3NY | 10 | codex | predicted_death | 败 | 31 | 30 | 14/24 |
| SV2GP9NX4HQD | 10 | codex | predicted_death | 败 | 48 | 35 | 13/23/30 |
| CSLHFCBSC1UM | 10 | codex | predicted_death | 败 | 17 | 22 | 13 |
| RZ6YAC7K89NM | 10 | codex | died | 败 | 12 | 22 | 13 |
| SDY5T9XCSQN2 | 10 | codex | predicted_death | 败 | 17 | 20 | 13 |
| VAC6Z1PZ1QJG | 10 | codex | predicted_death | 败 | 48 | 35 | 13/21/31 |
| NG1FBJTSRLHS | 10 | codex | died | 败 | 9 | 20 | 15 |
| NTMAU4XZ2NN2 | 10 | codex | died | 败 | 14 | 21 | 14 |
| E6DYYXRX7GVE | 10 | codex | predicted_death | 败 | 45 | 38 | 13/27/34 |
| XZUJR08FW801 | 10 | codex | predicted_death | 败 | 29 | 24 | 13/22 |
| JBX9JLH46KVN | 10 | codex | predicted_death | 败 | 49 | 32 | 13/21/26 |
| RMNXHZKV716Y | 10 | codex | predicted_death | 败 | 49 | 33 | 13/21/26 |
| NBJBVSBNPYQB | 10 | codex | predicted_death | 败 | 49 | 40 | 16/26/34 |
| AF76L5UTPP8U | 10 | codex | died | 败 | 23 | 25 | 13/22 |
| 833ZM0MJGWHC | 10 | codex | predicted_death | 败 | 49 | 33 | 13/20/28 |
| 64R0P0MTZWAX | 10 | codex | predicted_death | 败 | 33 | 26 | 13/20 |
| C6Z8ATNBNHZ7 | 10 | codex | predicted_death | 败 | 23 | 31 | 14/27 |
| XW8B5CHJ814J | 10 | codex | predicted_death | 败 | 49 | 32 | 13/21/26 |
| R6WDLYS19ZTY | 10 | codex | predicted_death | 败 | 42 | 35 | 16/25/32 |
| HNX4A2WBC34W | 10 | codex | predicted_death | 败 | 48 | 37 | 13/25/32 |
| HXCY44VD9QWU | 10 | codex | predicted_death | 败 | 17 | 24 | 16 |
| N8A2W8LH39N0 | 10 | codex | died | 败 | 15 | 21 | 14 |
| 54G5683J0E5S | 10 | codex | died | 败 | 44 | 27 | 13/20/23 |
| 9663Y88TYK73 | 10 | codex | predicted_death | 败 | 46 | 36 | 13/21/29 |
| 0PH64C4AWAX9 | 10 | codex | predicted_death | 败 | 24 | 27 | 14/23 |
| Q389KW7SVWKH | 10 | codex | predicted_death | 败 | 48 | 33 | 13/23/29 |
| 8HW407EAUYL7 | 10 | codex | predicted_death | 败 | 48 | 38 | 14/23/30 |
| WN0HA1L6MJ99 | 10 | codex | predicted_death | 败 | 21 | 30 | 14/28 |
| 9GVYTHSXB4Z5 | 10 | codex | predicted_death | 败 | 33 | 33 | 13/24 |
| 08A0GEAL8KQ5 | 10 | codex | predicted_death | 败 | 33 | 34 | 16/26 |
| 9SRPBTZYN44H | 10 | codex | predicted_death | 败 | 31 | 32 | 13/23 |
| AYTX5H4H69E3 | 10 | codex | predicted_death | 败 | 45 | 37 | 13/20/28 |
| 0B2567HG3T4D | 10 | codex | predicted_death | 败 | 48 | 36 | 13/24/30 |
| PYE4VXNSLGSS | 10 | unknown | died | 败 | 33 | 29 | 13/23 |
| Y8GDTNWG4R3X | 10 | codex | predicted_death | 败 | 48 | 32 | 16/24/29 |
| X4M1GPAJGAB9 | 10 | codex | died | 败 | 23 | 31 | 16/28 |
| 5BU7ZE1PWLSX | 10 | codex | predicted_death | 败 | 33 | 32 | 16/24 |
| KDBWARERSGYW | 10 | codex | predicted_death | 败 | 48 | 37 | 16/26/32 |
| TFYU1MY8NEJ1 | 10 | codex | predicted_death | 败 | 49 | 30 | 13/22/28 |
| 49HL2N70CHMU | 10 | codex | predicted_death | 败 | 49 | 36 | 15/25/33 |


机器回报保存report.json，研究候选保存proposal.md；运维核实专题完成后再派经验任务，不把报告完成当成游戏规则生效。

最终研究核验（写入前date：2026-10-10T15:26:52+08:00）：validate_report.py exit0，2492条封存原行的角色/长度/SHA/冻结范围和31条正文引用通过，195局分区、真实脑来源、阶段/版本分层、SL分割、HEAD与源码/任务模板/知识零差异通过。gitleaks exit0、扫描约278MB可扫描材料、无泄漏；原stdout/stderr与命令SHA见command-records.json。上述研究核验不替代生产tsc/vitest，两者仍未执行/null。
