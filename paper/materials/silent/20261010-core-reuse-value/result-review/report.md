让能量更多地产生收益，已有证据支持的做法是把一次支付后的持续触发、免费后继和技能重放分开评估，并保证关键后继实际到手、可付费且仍能存活。让核心牌更多发挥作用，也须分别看能力建立后的持续效果、回返/复制/重放，以及抽到后再次执行；额外能量不能替代这些条件。201个冻结静默局中，192局纯Codex首试6胜、含SL最终10胜；A10的154局0通关，尚未验证通用循环、最佳执行顺序或收益改善。

# 静默能量利用与核心牌循环研究

生成前date：2026-10-10T17:05:33+08:00。请求 `roy-20261010-silent-core-reuse-value`；批次 `20261010-164301-strategy-proposal`；基线 `b6533a36d8f12bee369c6f6d20ce1d2e043befbb`；manifest SHA256 `c8560fe798ff37b7b97c2d370736d57157e544d60e700b979f81657c888ce3b2`。

## 身份、输入与复算

根请求running/batch/worktree、learn.json的实际research_request、独立registered_bound回执、完整dispatch_base和task/manifest SHA均已核实；没有proposal_ids/proposal_repair。本批承接独立能量/核心循环专题，未读取另一根请求替代身份、未合并后续main、未领取普通队列。201局全部核对runs.jsonl的SILENT角色、结束/进阶/原code、成功脑题、状态/行动/SL/config；covered_runs全部201、exclusions=[]。逐局汇总而非逐动作人工复盘；深读证据15独立局见C01—C15，统计分母也来自全部201局，不将10个锚点冒充全历史。
输入冻结于2026-10-10T16:19:19.648354+08:00。四份冻结历史产物SHA已核：核心报告cd8b20e83eea9548ca16711d45f35ef2861d3a0c6b134ee8a5b607b3ac3a2a2d、牌组报告425472888f736d115f77ab81b1dc8ef2a5b59481bdb030d3b5b05ecc3c926a69、静默经验a7a43f2364b92f44c64c9b6847bf69997b238507574efecdd5ea8ea5fcffe841、角色复盘ab01b49e7f65124d7e5e10cb738cc32b9c92f714e0f1905d37244e4780f62d28。历史意见只作线索，以下案例重新回查原行。

| 日志 | 冻结上限字节 | 实核行 | 实核字节 |
|---|---:|---:|---:|
| runs.jsonl | 282481 | 201 | 冻结前缀282481、匹配行逐SHA见runs.json |
| states.jsonl | 10811958757 | 134637 | 4542863739 |
| decisions.jsonl | 923743942 | 129137 | 463556467 |
| brain.jsonl | 378783048 | 6648 | 232686731 |
| sl-attempts.jsonl | 28083270 | 1227 | 25111855 |
| run-config.jsonl | 1215741 | 204 | 931466 |

只读现有DuckDB索引，指定201局、off+len不超完整行截止，再seek原JSONL核局号/角色与逐行SHA；不sync。单进程nice 10、DuckDB threads=1，无网络/LLM/游戏调用。extract.py、analyze.py、complete_stats.py、cases.py、supplement.py保存精确步骤；extraction.json保存SQL参数和计数。辅助库初次根路径导入，最终逐字节核对query/extract/sync/views及brain_source与dispatch_base和本树相等，helper-source-verification.json留SHA；复算脚本已固定本树路径。原状态分析字段及全部原行偏移SHA存states.jsonl.gz/states-offsets.jsonl.gz，其他日志同名；精选2501动作及前后原行5338条、131740679字节封存case-originals.jsonl.gz及索引，补充原行独立封存supplement-originals.jsonl.gz。大日志完整前缀SHA未知；引用SHA是原字节、不是重序列化JSON。

## energy_value：从费用到已兑现收益

衡量能量使用，采用可复算向量而非本批拟造权重：行动前现场能量与牌面实际费用、行动后能量净差、HP/挡/敌HP与增益变化、后继仍可打的牌和条件。即时能量净增与支付不能简单抵消成“总成本”：若一动作同时产能/返费或分阶段选择，内部毛收支未知。毒建立、下一轮回返或能力增益不算当步已造成伤害；下一轮生存、敌状态与实际执行另核。结束时余额和多打牌只说明过程，不等有效或浪费。
C01（ZZMY A2 F33T1，独立n=1）：毒雾使能量3→2、建立3层毒雾，随后触媒2→1建1层；另一触媒现场费用0，能量1→1而触媒1→3。已有后继降费事实使本轮资源可继续使用，不能把未来能力一律视为不可负担，也不能指定随机免费对象。能力当步敌HP仍321；后续毒结算与五轮胜、63→52血来自原SL记录，不把胜因单归降费。关联silent-0067、0011/0027。反例C07/C10：有额外费但抽牌封锁或核心不到手时，不能预支启动。
C02/C03（C48 A0 F33第6试T11、K367 A1 F48第2试T11，独立n=2）：C48已建3敏捷，1费防御各8、零费偏折+10，三张合26；与无敏捷的同牌面基础5+7+5相比增9。K367已建8敏捷，2费冲刺+实21挡、1费防御13，合34。是同一次能力支付后作用于多张后继的可见收益；敏捷建立本身没有即时补旧挡。C48仍2HP面对32攻而死；K367首试判死、SL第2试胜且最终仅5HP，不能把敏捷可复用等同通杀。关联silent-0005；支持持续价值、同时保留生存反例。
C05（L704 A10 F48第3试T3，独立n=1）：爆发+付1能量3→2并建2次技能重放；杂技只支付1次2→1，但两次抽弃分别完成，绷带两弃合补6挡。之后肾上腺素能0→2、消耗剩余爆发层；计算下注现场0费、能量1→1，实际弃九张使挡6→33，新增27。步法+最后付1费只把敏捷1→4，不倒补已有33挡。费用、重复技能效果、弃牌遗物收益分源记录；该场三试均败、末试实死，重复兑现确实存在却不足以赢。关联silent-0114/0115、0194、0355。
C07（KV0 A10 F33末试T1，独立n=1）：子弹时间8→5、剩余手牌变免费并建NO_DRAW；后空翻5→5仍补5挡，肾上腺素5→6仍加1能，却都没有抽牌；原抽牌堆22张不变、手牌6→5→4→3。药水随后6→7、建明耀3，次轮额外能量窗口另计。省下/获得费用不恢复已被封锁的过牌，尚在牌堆的步法不能借这笔费启动。六试均败，不推出固定“先抽后子弹”顺序能赢。C08（25226 A10 F48末试T8）另有小提琴下后空翻付1费、实际10挡而抽牌堆6→6：封抽不是全部效果无效。两独立封抽案例，关联silent-0248/0249、0157。
C10/C15：4XL A10 F33六试首个可操作T1均7能、手里无能力，持有的能力没有在该开场窗口兑现；最后一试死亡，之前F17已从70损到21，后续回补/损耗不能忽略。64R A10 F33末试T1只有1能，余像付完后后轮才建步法；后轮增能不能倒补首轮启动。两独立资源时序反例，关联silent-0304/0109。FH2 A6 F6只有19HP进场、未来腐蚀波协同尚未兑现而早死，是额外独立早死反例，不因未来循环目标忽略已有防御缺口（silent-0096）。
按最早真实死亡/判死SL记录截断整局首试窗口；未SL的局保留全部。以下是匹配原状态的结束回合**决策记录数**，包括可能的再次询问/执行未落定；既不是独立局，也不是毛未用能量。正余额+现场可打仍可能是威胁、持牌伤、额度或选择取舍，不能强制全部继续出牌。

| 进阶（纯Codex） | 独立局 | 首试胜/最终胜 | 结束回合记录 | 正余额记录 | 正余额且可打记录 |
|---|---:|---:|---:|---:|---:|
| A0 | 7 | 0/1 | 414 | 88 | 56 |
| A1 | 3 | 0/1 | 215 | 74 | 50 |
| A2 | 2 | 1/1 | 177 | 56 | 52 |
| A3 | 1 | 1/1 | 115 | 34 | 23 |
| A4 | 4 | 1/1 | 344 | 78 | 70 |
| A5 | 1 | 0/1 | 99 | 23 | 21 |
| A6 | 9 | 1/1 | 687 | 214 | 166 |
| A7 | 7 | 1/1 | 610 | 210 | 163 |
| A8 | 1 | 1/1 | 84 | 26 | 22 |
| A9 | 3 | 0/1 | 203 | 46 | 34 |
| A10 | 154 | 0/0 | 9866 | 2822 | 2365 |

A10这三类记录来自154独立局。2822/9866正余额的共现不识别未花费的因果损失；2365个“还可打”记录也不能据此判执行错误。每一条现场费用、阻止原因及源SHA在end-turns.json；本批没有拟合花费奖励或低余额门槛。

## core_reuse：核心怎样更多发挥作用

本角色证据形成四种不同过程，不能统称“多抽几次核心”。能力建立以后应跟踪实际后继触发，回返/复制需要到下一轮仍活着且再次合法可打，重放要核实额度和每次效果，抽弃需要真实抽入及保留正确后缀。战内持续收益与下一房/下一boss重新建立分开。

| 过程 | 持有→到手→可用→首打→后继/再打的实证 | 独立支持局与反例 |
|---|---|---|
| 一次建立、持续触发 | C02/C03敏捷再作用于多张挡；C13 LLY A8 F48T3余像付1建1、本身挡0→0；后续毒药/切割/肾上腺素各+1、防御基础3另+1、蜃景26另+1 | 支持C48/K367/LLY，n=3；C48同场死，C09换战需重建，不能追求能力本体反复出牌 |
| 一次动作、多次执行 | C12 LRN A0 F48T3翻越撑击+原牌写重放1，一次动作敌377→353、挡13→15；C05爆发+下杂技与肾上腺素重复，绷带按真正弃牌各触发 | 支持LRN/L704，n=2；LRN最终败、L704三败；C11零费生成刀受额度阻止，不能预支所有后继 |
| 逐轮返回、再付费用或再次用 | C04 KAY A0 F48第2试，流星锤T7—T14每轮手动打出；T8零能量成本、敌283→268，T12 112→93。各次真实手牌和回返文本留原行 | 支持KAY，n=1；同局T7和T13无实体时实际仅1伤，胜局也靠其他攻防/毒/药，A10本批无初始BOLAS窗口 |
| 先选目标、下一轮副本 | C06 4Y A7 F33T4夜魇+付2（3→1），真实选择蛇咬+；T5手里4张蛇咬，含原保留牌及三副本，仍按各现场费用支付。F48T10选毒药+，T11见三副本 | 支持4Y，n=1；不是复制步法，不能归严格D；多副本到手不等全部可付/可打，也没有与不复制配对胜率 |

抽弃辅助的真正瓶颈在于获得的牌能否变成后继收益：C05重放杂技与实际弃牌已兑现；C07/C08抽牌封锁，C11（J8 A10 F33末试T13）隐秘匕首虽0费、生成两张牌面13的小刀，第三牌额度已用，后继小刀被SLOTH_POWER阻止，没有那26伤。计算下注、肾上腺素等现场带消耗；多次同ID发出可能是副本、复制或临时生成，不能据此宣布无限循环。战术大师/本能反应的弃后自动链本批未逐步隔离到足够新机制证据，不按预训练常识给出回费循环公式。
以下所有窗口都来自A10纯Codex、最早首试截断前、入窗真实deck持有该ID的战斗片段（包括走廊/精英/boss）。全部201局共3596个可分析战斗片段；窗口不是独立局。列中“发出”仅指结果completed或pending的play_card指令，pending未据此算全部效果已兑现；“即时完成”是动作返回completed，杂技/夜魇常先排队再选择，所以0不是从未施放。精准兑现只由上面回查的完整动作链证明。

| 组件 | 独立局 | 持有窗口 | 到手 | 现场可打 | 发出窗口 | 即时完成窗口 | 同ID在不同回合发出窗口 |
|---|---:|---:|---:|---:|---:|---:|---:|
| ACCELERANT | 54 | 404 | 370 | 369 | 314 | 314 | 8 |
| NOXIOUS_FUMES | 68 | 702 | 665 | 660 | 549 | 549 | 108 |
| FOOTWORK | 82 | 642 | 608 | 604 | 484 | 484 | 71 |
| AFTERIMAGE | 21 | 176 | 163 | 161 | 116 | 116 | 0 |
| INFINITE_BLADES | 9 | 43 | 39 | 39 | 25 | 25 | 0 |
| SERPENT_FORM | 9 | 80 | 73 | 67 | 14 | 14 | 0 |
| TOOLS_OF_THE_TRADE | 11 | 78 | 71 | 71 | 35 | 35 | 1 |
| WELL_LAID_PLANS | 9 | 67 | 61 | 61 | 11 | 11 | 0 |
| ACROBATICS | 22 | 121 | 113 | 111 | 36 | 0 | 3 |
| CALCULATED_GAMBLE | 33 | 260 | 238 | 238 | 140 | 140 | 5 |
| BACKFLIP | 103 | 836 | 790 | 787 | 567 | 567 | 194 |
| DAGGER_THROW | 42 | 384 | 361 | 356 | 276 | 26 | 79 |
| BURST | 15 | 83 | 78 | 78 | 37 | 37 | 5 |
| NIGHTMARE | 6 | 35 | 33 | 33 | 12 | 0 | 0 |
| BOLAS | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADRENALINE | 15 | 129 | 122 | 122 | 112 | 112 | 0 |
| BULLET_TIME | 3 | 10 | 8 | 8 | 2 | 2 | 0 |
| APOTHEOSIS | 3 | 12 | 12 | 12 | 4 | 4 | 0 |
| HIDDEN_DAGGERS | 21 | 161 | 154 | 154 | 112 | 27 | 24 |
| BLADE_DANCE | 30 | 205 | 194 | 192 | 83 | 83 | 2 |
| TACTICIAN | 2 | 10 | 10 | 10 | 0 | 0 | 0 |
| REFLEX | 3 | 24 | 22 | 20 | 1 | 1 | 0 |

这张表追踪的是ID而不是物理副本：例如多毒雾/步法在不同回合建立不表示同一能力回到手里；后空翻不同回合发出也可能来自多张副本。由“合法但未发出”不能单因归牌组厚度、模型漏算或错误取舍。当前证据支持到手、支付与持续效应应分开，尚不支持提高抽牌率/增加费用就必定获得更多有效核心触发。
C09（49HL A10，独立n=1）最清楚地区分战内与下一战：F48/F49都36张，F48 72HP进、T1毒雾实建、T3触媒、T6步法/工具，SL原记录七轮赢、24HP结束；下一战首个可操作帧在开场回血后26HP，增益重新从现场开始，三轮内没见毒雾。末试T1步法付1、T2触媒付1仍两敌无毒，最终真实死。F48有效持续价值不能携带到F49；牌数相同却启动/资源不同，连胜没有得到验证。C13 LLY A8末boss首试胜是低阶已兑现支持，不外推A10。

## construction_execution_guidance：少量有条件指导与去重

指导目标是让大脑/战斗执行者写清已知收益与缺口，不是设置新自动拿牌、删牌、饮药或固定出牌顺序。所有原合法选项保留，相同推演并列；本批不改在线行为。

| 场景 | 当前可用建议 | 支持与反例、资源成本 | 去重与未知 |
|---|---|---|---|
| 构筑缺口 | 先说明缺的是首轮到手、现场费用、持续输出、后续挡或完整配件，再评估新增牌/遗物实际能补哪项；可用普通攻防/施毒作过渡，不给未取得配件预支协同 | C01现场免费后继可用；C10高首轮能量无能力、C14早死，n=3；C09同N重启失败再支持 | 合并silent-0374及0352—0355；未识别最佳张数、拿/跳/删的独立胜率或统一抽牌目标 |
| 当前回合与持续价值 | 将本轮真实伤害/挡和“已建后续触发”并列，能力费用须付、后继也须仍可执行；按现场限额、封抽、敌状态逐项核，余额不作单独奖励 | C02/C03/C13能力多次生效，C07/C11后继失效，n=5；C48少挡不能靠未来补 | 合并0005/0023/0248/0154等已有机制；本批不声称先建能力或先抽牌必胜 |
| 重复使用与转型 | 明确是回返、复制、重放还是持续触发；同时说明要等几轮、何时消耗、每次费用/额度与剩余生存。未到手/不能支付/被拦截时暂停未兑现分支，保留当前实际有效部分 | C04/C05/C06真实重复与C07/C08/C11失效，n=6；C05得挡仍死、C04无实体只1伤 | 回返0042、重放0114/0194、夜魇0353既有更正，不扩大成无限循环或新增流派 |
| 下一房/第二boss | 从新的入场HP/药水/手牌/增益重新评估启动，上一场已建立不能当下一场已经有；路线/休息选择列启动与资源代价 | C09一局F48胜后24HP、F49开场26HP且无毒雾，最终败；C13低阶末boss胜不能证明连战 | 合并0352—0355、0374、已有双boss备战；没有留药/多休息/删另一张的受控反事实 |

建议下一轮经验沉淀只增加一个跨机制综合条目“能量与核心兑现窗口”，既有具体机制和四候选保留原身份；不机械拆单卡。新综合证据关系为“当前能量→实际建立/到手→合法后继→多次兑现→下一战重启”的201局观察范围与原帧案例，不重复写历史复盘。四核心原181局签名分母保持：P 59、严格D 30、S 24、R 6；本轮没有把新201局自动改写旧经验n_support，也没有把旧D的夜魇代理错误恢复。旧牌组研究195局分母保持，本轮192纯Codex/154 A10是本次新切点。
本批新账本：['silent-0376']；仅proposed/by=learner:strategy-proposal。真实代码提案：['silent-proposal-9e1bc1225fae0e30']，Markdown在proposal.md：建议在既有静默planFacts/方案摘要中补条件化收益事实，区分现场已建、方案预测与尚未兑现，不增加模块/游戏阈值，也不重做已实现的子弹时间/爆发局部模型。本专题纯报告禁止源码实现；后续独立strategy-proposal需先对照现有字段/提案去重、固定局面验证，经验交experience-update入库。本批没有源码/知识修改、commit/live合入、版本、shipped、消费者读取或自然采用成功。

## counterexamples：支持、反例、分母与原字节

| 结论 | 深读独立支持局 | 反例/失效独立局 | 证据性质 |
|---|---|---|---|
| 支付可经免费/重复/持续后继产生更多效用 | ZZMY、L704、C48、K367、LLY，n=5 | C48/L704同场失败；KV0封抽、4XL不到手，反例n=4 | 局部真实状态变化；不识别额外能量因果胜率 |
| 核心反复作用须分能力、回返、重放与复制 | C48/K367/LLY/LRN/KAY/L704/4Y，n=7 | KAY无实体；L704三败；J8零费刀受额度阻止，n=3 | 真实持有/到手/支付/执行链；各局同存档反复尝试仅一个样本 |
| 抽牌/更多费不能代替合法后继 | L704真抽弃、ZZMY可付后继，n=2 | KV0/25226封抽、J8额度、4XL无首轮能力、FH2早死，n=5 | 没有移去遗物或换顺序对照；牌面抽数不是实际抽数 |
| 下一boss重新启动且资源预算不同 | 49HL F48/F49，n=1 | 同局F49实际败；LLY A8单末boss胜仅对照范围，不是A10連战反例 | 配对是不同遭遇/资源的同局观察，不是恒定条件试验 |

每项上述支持和反例至少通过原行动、前后状态或战斗窗口/结果核对；原文件均为根logs/。下面是[off,off+len)与完整原行SHA。完整引用/案例关系在report-evidence-index.json；大表不把多个ref/多个SL算多个独立局。

| 案例 | 局/层/回合 | 原文件 | off | len | SHA256 | 说明 |
|---|---|---|---:|---:|---|---|
| C01 | ZZMYZ5UBCG72/F33/T1 | decisions.jsonl | 488466351 | 10438 | d92ae0297d75fce9ca4cfc2fc207cedbf96ddec5426f8a34401536475d492adf | 决策 NOXIOUS_FUMES |
| C01 | ZZMYZ5UBCG72/F33/T详原行 | states.jsonl | 6563846917 | 43623 | 8247af80922638edf88195333b2aba84e4a548760250285be7babfadb9125372 | 首次就绪帧 |
| C01 | ZZMYZ5UBCG72/F33/T1 | states.jsonl | 6563890540 | 42633 | 50294e3b19edbcbe3dabe24b5bc01c21977902cd65c4505a8ffd9984f4562050 | 前帧 ACCELERANT |
| C01 | ZZMYZ5UBCG72/F33/T1 | decisions.jsonl | 488476789 | 1626 | a706c16c27f3d54e60a0b5452096dca86a7974d3fe0135771c484d288a4b1238 | 决策 ACCELERANT |
| C01 | ZZMYZ5UBCG72/F33/T1 | states.jsonl | 6563933173 | 41739 | f981522214bbddc7c496494e93a43c53ca205ce898cd45691a8269823f9bddc5 | 前帧 ACCELERANT |
| C01 | ZZMYZ5UBCG72/F33/T1 | decisions.jsonl | 488478415 | 1617 | 7f6ec72f7f922b611f6a21e7d3812460bce3dd116b5ac4211b2a997a8f1e1498 | 决策 ACCELERANT |
| C01 | ZZMYZ5UBCG72/F33/T1 | states.jsonl | 6563974912 | 40718 | 18bbc0de571a2b0266a50d0648ae79d76ae11d9b595ad1f157ccc5011fcc8ecf | 后帧 ACCELERANT |
| C01 | ZZMYZ5UBCG72/F33/T详原行 | states.jsonl | 6564786583 | 41075 | 9c6c83a4f5b5aac5a7928a5ae45b8ad27259d8f4236347aeeffd432366a68272 | 末战斗帧（可能早于最终动作） |
| C01 | ZZMYZ5UBCG72/F33/T详原行 | sl-attempts.jsonl | 4941370 | 10194 | ee8cce443527a337643f1c01523f1f899f492d222f0fa9380f82afa6754d97d1 | SL结果 1 |
| C02 | C48LLXBGKXQ9/F33/T11 | decisions.jsonl | 461157050 | 1583 | 0417b93d679421095e862c9b49bbd507d2f3c2a21dc62a9daa87d440dbb748ca | 决策 FRANTIC_ESCAPE |
| C02 | C48LLXBGKXQ9/F33/T11 | states.jsonl | 6292726904 | 44568 | f6f73663452acf0e24e52d6f77b6c4794b1f7dec4bb1e35bbf7e3cd95bb0cba9 | 前帧 FRANTIC_ESCAPE |
| C02 | C48LLXBGKXQ9/F33/T11 | states.jsonl | 6292771472 | 43946 | 76768636b178bbb6ad972e0d017a0e307f978872eb5e8f378b89dba6bec6b4bc | 前帧 DEFEND_SILENT |
| C02 | C48LLXBGKXQ9/F33/T11 | decisions.jsonl | 461158633 | 1539 | 65f55458ca0f416e1a2d34b7c561b80304f207e74af6802b6e4635f1042743e9 | 决策 DEFEND_SILENT |
| C02 | C48LLXBGKXQ9/F33/T11 | states.jsonl | 6292815418 | 43250 | 6048e5a1084b59670c40cc50530f70d603b9968036dfd8b6b6d376192703ad50 | 前帧 DEFLECT |
| C02 | C48LLXBGKXQ9/F33/T11 | decisions.jsonl | 461160172 | 1500 | 5e9570e8ec42a82156efaea603806e593f786970dc8e6450bd3c9ab223143435 | 决策 DEFLECT |
| C02 | C48LLXBGKXQ9/F33/T11 | states.jsonl | 6292858668 | 42486 | 4aeebc7bd924608c82141583192c378d8349ba7024f62f6d8623f5807bfec7fa | 前帧 DEFEND_SILENT |
| C02 | C48LLXBGKXQ9/F33/T11 | decisions.jsonl | 461161672 | 1482 | d7fb66bf50b385f10337bd71db55b8bd7b81f5477106e9b8c806f020a8e5974e | 决策 DEFEND_SILENT |
| C02 | C48LLXBGKXQ9/F33/T详原行 | states.jsonl | 6292901154 | 41538 | fc436a9b819fa52209069835f57f3989c96bd7ec4f4cd8618f34325f5e9b490b | 末战斗帧（可能早于最终动作） |
| C02 | C48LLXBGKXQ9/F33/T详原行 | states.jsonl | 6290069057 | 42680 | 9657c2e2172a5214972defe8cda0a4d35dab6ca21862ca0327a35d6072857301 | 首次就绪帧 |
| C02 | C48LLXBGKXQ9/F33/T详原行 | sl-attempts.jsonl | 3196125 | 40609 | 9a8b644264caf167bc167a5be894771a51516d76dd84fbc2468a86b348f62bf4 | SL结果 6 |
| C03 | K3676LU8B0UH/F48/T11 | decisions.jsonl | 484541049 | 1513 | 4429fa924db640e0dcd43fbb6768c7693830adb1e04509c68640ed6d6151680c | 决策 DASH |
| C03 | K3676LU8B0UH/F48/T11 | states.jsonl | 6527657516 | 50369 | 262ef5da8c91c7187a4816dd4084378a90d4f025347169499e93433058ea7f68 | 前帧 DASH |
| C03 | K3676LU8B0UH/F48/T11 | states.jsonl | 6527707885 | 48905 | ed98d79905f18711ad6fc94abf8872d95c534d1c38188845d94d2923f587dbf3 | 前帧 DEFEND_SILENT |
| C03 | K3676LU8B0UH/F48/T11 | decisions.jsonl | 484542562 | 1471 | 0028bf41eae5497e098c29f015e0baba6d880a225ffd8402c1acbf028c7e2a35 | 决策 DEFEND_SILENT |
| C03 | K3676LU8B0UH/F48/T11 | states.jsonl | 6527756790 | 48126 | b28e9ea88c083e8f0dcd7be92efbf5031722b381acc33eb3ff0d8f40d144e995 | 后帧 DEFEND_SILENT |
| C03 | K3676LU8B0UH/F48/T详原行 | states.jsonl | 6525158984 | 52182 | f8add066470fba355818e792145772f31e522fecb5baf07ddac3732bfaadbb0b | 首次就绪帧 |
| C03 | K3676LU8B0UH/F48/T详原行 | states.jsonl | 6528000386 | 46592 | 1ca24b6e2d6bb0fcc28443f805accf2ac82d582e143b11c6d1b64b1afdd15b7d | 末战斗帧（可能早于最终动作） |
| C03 | K3676LU8B0UH/F48/T详原行 | sl-attempts.jsonl | 4706421 | 30114 | b6404fbf72863939197e37181075ba46c7ca0a51b3e74b8441d869a6516dba28 | SL结果 2 |
| C04 | KAY522KT5NXR/F48/T7 | decisions.jsonl | 477572578 | 1579 | c7234febca6dcaaadc4d53e95cff8627cf255e9b024750063560162667d8a546 | 决策 BOLAS |
| C04 | KAY522KT5NXR/F48/T7 | states.jsonl | 6454631662 | 50621 | 11c2a9a7f341f7ad188e600e29026a535f60fec5ed87ebafd89c364194fd9a9f | 前帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T7 | states.jsonl | 6454682283 | 49793 | 7ef5b3303855fbd6a18c4266e600c8c766fe6f33be5e409f9b1d69d44b4e7682 | 后帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T8 | decisions.jsonl | 477582841 | 8033 | e0f05531815526f60d85f9082bc2195ed2197a35d44a2213d71125696696c1ac | 决策 BOLAS |
| C04 | KAY522KT5NXR/F48/T8 | states.jsonl | 6454838977 | 52899 | d0f4326795096ca9c52c99d720e2e78c749f52d5e8df67e679c58e77c9bacbf3 | 前帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T8 | states.jsonl | 6454891876 | 52071 | 93d52acce1a658afe30b20e521b6964adb02429201427b2db6ef3b21d6099143 | 后帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T12 | decisions.jsonl | 477655117 | 1770 | f96791b71c0fab98bb4ae90deb1c0da3b58d158829923f7b392844ad6af95b55 | 决策 BOLAS |
| C04 | KAY522KT5NXR/F48/T12 | states.jsonl | 6456323465 | 54100 | 8f2d119d62f5c5593e9ecb4ccba52634a024bbd9fb455f64f04316fe6ec752de | 前帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T12 | states.jsonl | 6456377565 | 53269 | 4b478cad47d1dd73c62f0af8e31f28e49eed57996f4f6064f49378a1aaf47320 | 后帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T13 | decisions.jsonl | 477668568 | 1696 | e98bfcdfbdbe1d5c2dea9a1f395857c53d99d33b2892b252351b2845d98e456d | 决策 BOLAS |
| C04 | KAY522KT5NXR/F48/T13 | states.jsonl | 6456755831 | 56899 | 62fc0362a2e47905434053cde3a8859ff48d624a058a294431458b2e72ba698c | 前帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T13 | states.jsonl | 6456812730 | 56071 | 44aa3f57c9f359e1ede1dbb5763179d9834d7580d166310c8ecb916f5da36c59 | 后帧 BOLAS |
| C04 | KAY522KT5NXR/F48/T详原行 | states.jsonl | 6452211365 | 56328 | 192978c57d0df4b504a59e493f3738b7daae0fa88969c7aba93ac50b31e18fad | 首次就绪帧 |
| C04 | KAY522KT5NXR/F48/T详原行 | states.jsonl | 6457152485 | 54596 | a4d59c4c21fe24e087efa5d3099929d529a6941ff168bc67149a3dcfc1f1f51c | 末战斗帧（可能早于最终动作） |
| C04 | KAY522KT5NXR/F48/T详原行 | sl-attempts.jsonl | 4271381 | 40440 | a8122bc57dba0ec203391f40e5e266103fc20f4309f4fdac3ce9e34bdebe577d | SL结果 2 |
| C05 | L704TLETMZBM/F48/T3 | decisions.jsonl | 614899891 | 22997 | e31f1d42cad087f21206ede94dfc85704c2d186667a04cddb1fe6992978f2f73 | 决策 BURST |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860441192 | 56041 | 0cf8dfae7de28c739c4850a4471f00e6260060f96a8f41d3b6723e0755b74f1b | 前帧 BURST |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860497233 | 55835 | 2343cb0f4567833d7affc87f6dcd8c60de211df91cb590858f20af621f227974 | 前帧 ACROBATICS |
| C05 | L704TLETMZBM/F48/T3 | decisions.jsonl | 614922888 | 1655 | ed50b01382a7d019926a93c7a071c886179a31f801468005ef48fd18290f0aaf | 决策 ACROBATICS |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860553068 | 65085 | e50df4c03e02d9ba84af3318d3aaa003414ea6cf051bdf5aaeae87171d57b8c9 | 后帧 ACROBATICS |
| C05 | L704TLETMZBM/F48/T3 | decisions.jsonl | 614945621 | 1676 | 53ea7e88533f43dff73eceb434a1cc1d289afe9384f2ed590f61f7edb216461a | 决策 ADRENALINE |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860743873 | 57920 | a82c55500c473a11ec66b622e719593eb39ba4f0e72e07c06389b332b67bb99e | 前帧 ADRENALINE |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860801793 | 58928 | 63ffb721519d3a9d34966979e642378038d4720c472686a7c3a20dca848459b1 | 后帧 ADRENALINE |
| C05 | L704TLETMZBM/F48/T3 | decisions.jsonl | 614949356 | 2068 | fb1b89b3e0a0f5f81560bffa8e04171a5a79b93cdb2281a27a1e72c8c9206f70 | 决策 CALCULATED_GAMBLE |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860860721 | 58902 | 78b7c862ae71d9086a2ea977129b2c3be448d54a05a1d21257adf24f225ec269 | 前帧 CALCULATED_GAMBLE |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860919623 | 57023 | 65138ebfa396d9b7864ea8cb79afe68414f027cacd516ce5eb6a404a6d4ce329 | 前帧 FOOTWORK |
| C05 | L704TLETMZBM/F48/T3 | decisions.jsonl | 614951424 | 1601 | 7776b094455081ccbe4c0ddffe82c2f0c627942e5c45e38eb136ba394714bdf3 | 决策 FOOTWORK |
| C05 | L704TLETMZBM/F48/T3 | states.jsonl | 7860976646 | 57399 | 3ea48a73a84f3432ac687a31f7b1321277f382390e788f57b0bf6f6b074b5285 | 后帧 FOOTWORK |
| C05 | L704TLETMZBM/F48/T详原行 | states.jsonl | 7859497262 | 57013 | 4844b412415824e81f3b0ae0a1eb41ed5ec4529a124aa04f680d723be3aedc94 | 首次就绪帧 |
| C05 | L704TLETMZBM/F48/T详原行 | states.jsonl | 7861774995 | 50983 | 18a369054334b107c091569a58d7c39f88d6cce610a98005bc9b91cf3b399a65 | 末战斗帧（可能早于最终动作） |
| C05 | L704TLETMZBM/F48/T详原行 | sl-attempts.jsonl | 11626721 | 31773 | 7994723857bcd08f8be159a4dd8f275217acc61dc3675f22deee3f46539425c4 | SL结果 3 |
| C06 | 4Y94N8RDPGPM/F33/T4 | decisions.jsonl | 548996787 | 5780 | 667042016e2076c6022b0d851e915e71e0e06f5f7fe566c39d74227f0655b78d | 决策 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F33/T4 | states.jsonl | 7231191306 | 37076 | 51860216182fb9669122636e2b161d5d9dbf9ea4f1fd863a99c3583087c620ea | 前帧 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F33/T4 | states.jsonl | 7231228382 | 39413 | d4ded920b6ba069fa7159b84b096c8e6ae989e913deff69af11c954e84c4ec46 | 后帧 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F48/T10 | decisions.jsonl | 550085559 | 16163 | 0e140124e808a23c2f53b28b1d6529d013db2a4453f39410fbf4c9182ac969cd | 决策 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F48/T10 | states.jsonl | 7242439238 | 46186 | 6a7d2d0015d64a3b704dc50343f3ebf87a39b65e440cc09c84f6a6477fd6eaa0 | 前帧 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F48/T10 | states.jsonl | 7242485424 | 48648 | 8f26334f975a1bd3f353baa282bc6ee16d5e363e5dd6a48cf77ae5581a4650ed | 后帧 NIGHTMARE |
| C06 | 4Y94N8RDPGPM/F2/T详原行 | states.jsonl | 7219986616 | 22522 | 369373272bb3ad92af3a70402dde31c6d072cd9e3f3fc5b6877fe5fe0c7bc0eb | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F2/T详原行 | states.jsonl | 7220363367 | 20058 | bbc057367d44052ddb1d6dbdf45531a70355598e578808b4c3ce006425f8d2e9 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F3/T详原行 | states.jsonl | 7220511719 | 24060 | 9242462de1674f1a095789f28557bf065a7da776620d8689d9084538fef336c1 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F3/T详原行 | states.jsonl | 7220704836 | 22293 | d573d54a1111fe95e903ca39657b148288071c17b439f02e7af8371d584c0370 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F5/T详原行 | states.jsonl | 7220910392 | 26318 | 1869d35482b98ce83528e7dddd1f1b7f5847786130ba33c7676925b16db09793 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F5/T详原行 | states.jsonl | 7221211079 | 23523 | af5a24c1b2fe12825d95147bb35432d79edeeef9d95697f161e208fe43d01c60 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F6/T详原行 | states.jsonl | 7221376677 | 25850 | d18b4c2b681ccc06a01f273911ce62ccb7bf5855915b39504b9265e97e48cf49 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F6/T详原行 | states.jsonl | 7221753917 | 22724 | 7685306fc74a1df3479170ea17fa5745a1cdcd2c6f20353e66a6932c906f0f29 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F7/T详原行 | states.jsonl | 7221905754 | 26938 | 5406e404a20181abaa079c51cebe691ab1421375c89847741da68b628eb65984 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F7/T详原行 | states.jsonl | 7222677810 | 28868 | 8ae9e0334e82321a8cbf1a00dfdd7825f4bf18e05376c7035e122c1cbcb32595 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F9/T详原行 | states.jsonl | 7222953721 | 28493 | 8a191d3d76e8846a0ee15e8b8db444abc41c15cbd49f0cdf5d76b871d42bcf91 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F9/T详原行 | states.jsonl | 7223390609 | 26883 | d302c9459b657995789ce41d960440e937abbdbf63933a13d1389c321ce657cb | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F13/T详原行 | states.jsonl | 7223791909 | 30714 | f18b2ce19c5879ac924cbb218c425121a0c7b70877ba84a02da778ec1ef932dd | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F13/T详原行 | states.jsonl | 7224240486 | 26453 | 17a08ecf6b0f5e3c9e331c1496224ad2c19474281c3e9ec10122d68543718989 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F15/T详原行 | states.jsonl | 7224550638 | 31158 | 8825157f8f2a61b434e3bbbcc246b0ca1bbea760bff7e6b922deec8fce4891e8 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F15/T详原行 | states.jsonl | 7225124189 | 29080 | 4f2b3d318b326efb1214985da030ded0a1cc02284eef4810f1181d3b373ddcf7 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F17/T详原行 | states.jsonl | 7225439382 | 32261 | 52f378e8957398bcea5fd0e493a98454b9f2003685284b176f6adca50240477d | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F17/T详原行 | states.jsonl | 7226697619 | 29575 | 3d515138e6d6ccc2866ca14f8316eaeece7f54a46cd9497e65cec171f69df9d6 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F17/T详原行 | sl-attempts.jsonl | 7991447 | 13919 | 12764225d78ddccfb3cf6f747a671682ae7405484cb3a645a81f18d15d6f0f78 | SL结果 1 |
| C06 | 4Y94N8RDPGPM/F19/T详原行 | states.jsonl | 7226986851 | 35049 | 5ce77b4e889f30f779f479a7078ae4b5450c456b8c19073a427a5534650f0e1a | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F19/T详原行 | states.jsonl | 7227089592 | 32704 | 3326de1be956fd57626db3e218761caed1f707a55db91218ad38448aea4ac4aa | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F23/T详原行 | states.jsonl | 7227745330 | 35974 | 75959e99c30998d122d23ae0c68cce125078dad7d9e4660e7c416cdcdf381cdf | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F23/T详原行 | states.jsonl | 7228444638 | 33269 | 4bcfd22cf7eec777fe9e020861609a4cf9b45da54f0b077c4c0fd6e4264ba28f | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F30/T详原行 | states.jsonl | 7229363160 | 41479 | ff0f2cf07933eebc6a07ae5cb453fbcf093f95d734267b294926a6f292c1d1f3 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F30/T详原行 | states.jsonl | 7229974925 | 35891 | 163668dab046cb01ddaae094fefa356317436459bba361a95a6625fec4c46f06 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7230473882 | 40217 | 65577c72be1f149a82608668df1b4e3246f2f864e652b41d6d6cb250aaf9b15d | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7232324666 | 37093 | 2eb87466cc99c258cb3b1feebab18c2959041b5ccb9a0a46f1b44ad5bf1dec3e | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F33/T详原行 | sl-attempts.jsonl | 8005366 | 28556 | 7220c8d57f9f0626e6f5288c2fd4d19a9087611abef8dd71340c43b61734cdf0 | SL结果 1 |
| C06 | 4Y94N8RDPGPM/F35/T详原行 | states.jsonl | 7232670728 | 42013 | cf5335fda98877e003c8703838c5ade41cadd949e1db93df3b5b67e6a96ad4ab | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F35/T详原行 | states.jsonl | 7233563317 | 38430 | 2ebe16199af619f1285a9b0b9cd9920eb57fd7c60972489c6e796edd9e4c8d02 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F38/T详原行 | states.jsonl | 7233970091 | 44661 | abdbf690d7bc915d1fab9cb218b45a9341d0378f684e1bc4f2ce9a31d63bf680 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F38/T详原行 | states.jsonl | 7234591025 | 40767 | e9d03262f4403b5bc9ba6000e869836efa7be41a2c3824c0c14f3eb8191f87a6 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F43/T详原行 | states.jsonl | 7235411503 | 47875 | dee3bc243f20d6149986824325daa874077514100ec8197859b1f77be35b41cb | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F43/T详原行 | states.jsonl | 7236664706 | 42602 | b6d09513b7f4004602fe5180455bf4154dc040c16b16c224d12ea15ab087a845 | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F45/T详原行 | states.jsonl | 7237058284 | 45460 | 79959f04165eed7e2192fe54e4286f4266b592d8ecfbac2eb582dda91ffa0be6 | 首次就绪帧 |
| C06 | 4Y94N8RDPGPM/F45/T详原行 | states.jsonl | 7238958698 | 45306 | 34093bebd430fb1fd2ca617c63732f2f601b341b7541c4c5046f83478bbe5bda | 末战斗帧（可能早于最终动作） |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7239706862 | 49476 | d05291e2302eb0edc26a87f078842643012a0da06c7bbb7c7446e10c8767f85d | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7243584942 | 45980 | 477242a0a837cfb9f94c8ee33cb5fdf2efa7cf4109e11db13ecab61d24e1a984 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F48/T详原行 | sl-attempts.jsonl | 8033922 | 35559 | a5d4536bf306b3fe340c2c7cc35408563ea77001db4e12e68ab452bf7f5e9d16 | SL结果 1 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231340111 | 38152 | 06ace040835e4f82d31118d24d54dc55c44324edce85d9be6eb49e9f577f6694 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231378263 | 38317 | e4e47f81625acef15ac9f070cfc06555bf09971edb56a46c0b396913a93deec4 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231416580 | 37617 | 71a680d8bd1d7e4c585a915ce059090322d7a0f3a435215d2f5f768ecded2bec | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231454197 | 37010 | a5f8fc7a6e36ef94b89dddb05f462e89ca158f7a4a1844dbb5ee416e3089f1aa | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231491207 | 37019 | f18be8f3ba4d1ee15d91a3f21d5e512f074f22154160e3d9987ae1350d78e24c | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7231528226 | 37019 | 3cbe5301d6aa6c93dc6dae3552610e100aac167a43bc879b6024024c14c59d8d | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7242669217 | 51127 | 46a80fb85a1dec258345a98761a7b2774d79efbb34f6454ad034f8543327ca66 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7242720344 | 49298 | bc9adc134f9700e5dd16b80b58e452c1f44ae4708ae630e1285b3a7d7db0148c | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7242769642 | 48235 | d7d60b65116c7aacf6dc891331cc044ca9779dce87981a3fd2c793c4a1661dc0 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7242817877 | 47168 | a1af354435ec8e8ff2a486528b09d996b8818ed16d4bda8fc71f63d08a852d3f | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | states.jsonl | 7242865045 | 46383 | 9e44978f6e709f14c2fc7d087793a69f5ffe57c9f85a3e993f1fe4678f4f59dc | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | decisions.jsonl | 548988513 | 2386 | fb09115105f296a91e59959ae6fd6d836abee9351d5a0140733dd23be0bb5b17 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | decisions.jsonl | 549002567 | 2410 | 061fb1123ca7b2a2927a173819fddc895790a9527341a79ee7dbdec6e2a59866 | 完整选择/副本/重放窗口；详见supplement索引 |
| C06 | 4Y94N8RDPGPM/F详索引/T详原行 | decisions.jsonl | 550101722 | 2462 | 063b195bc0c9618dcc42a835dbb0d4a67171e303486922742dbc3bdf7f6fe9cd | 完整选择/副本/重放窗口；详见supplement索引 |
| C07 | KV0JHNJCKXLS/F33/T1 | decisions.jsonl | 693578025 | 1600 | 6e415a426c2c386545fbcefe4cb27dfee269fb0409fb50a6e73b0d96faf7ebaa | 决策 BULLET_TIME |
| C07 | KV0JHNJCKXLS/F33/T1 | states.jsonl | 8621920244 | 40396 | e5615f29f7f5f6bd2dbd412d546e9233d6f3c84e43b9457e8f60dd36eea288c8 | 前帧 BULLET_TIME |
| C07 | KV0JHNJCKXLS/F33/T1 | states.jsonl | 8621960640 | 39805 | fad16e01cdd30c96a80abd12beb79b8d1d89dcee8a79421f6350f6692f89e8db | 后帧 BULLET_TIME |
| C07 | KV0JHNJCKXLS/F33/T1 | decisions.jsonl | 693581279 | 1549 | 96c48cd526e97a70688f814ff1e404fd4bdc69932fc67c2fb93795e741511069 | 决策 BACKFLIP |
| C07 | KV0JHNJCKXLS/F33/T1 | states.jsonl | 8622000445 | 39026 | f468279a1e74cb87756eae2b8f3a650f9283fdccba310becd3b24b71cbd558db | 前帧 BACKFLIP |
| C07 | KV0JHNJCKXLS/F33/T1 | states.jsonl | 8622039471 | 38124 | 1df4ec683ec04cea119ac6ab922d850e8d747c3f94c43c2ff585ab447a97b1b3 | 前帧 ADRENALINE |
| C07 | KV0JHNJCKXLS/F33/T1 | decisions.jsonl | 693582828 | 1532 | c9e566e70b3adf8a768a2f903a3a5797d28e201297075d12fdd8233ff72f149d | 决策 ADRENALINE |
| C07 | KV0JHNJCKXLS/F33/T1 | states.jsonl | 8622077595 | 37227 | fe32bba284c2117a60f82cc37b8d261531d3e589a5837e355a290096ff48c82b | 后帧 ADRENALINE |
| C07 | KV0JHNJCKXLS/F33/T详原行 | states.jsonl | 8621879150 | 41094 | 849c0bed4284fbbbab691aef25c12d720649e9ad47eb4530fbbaba4c4de79b51 | 首次就绪帧 |
| C07 | KV0JHNJCKXLS/F33/T详原行 | states.jsonl | 8623472659 | 38138 | a3768b9ff88fc771190d32b9f9d7da51b02585e58af26f8a37eaef64b63cbe23 | 末战斗帧（可能早于最终动作） |
| C07 | KV0JHNJCKXLS/F33/T详原行 | sl-attempts.jsonl | 15768100 | 25101 | 87c75013107cef274257920c3e7eb8b71c3ac3e10cd24666cd78838cb3bc5e89 | SL结果 6 |
| C08 | 25226ZFLNR1J/F48/T8 | decisions.jsonl | 563448327 | 1568 | 8d3c83876ae37c1f3489d63b6687b531b6f580e5337b4699378e1a06db8b5864 | 决策 BACKFLIP |
| C08 | 25226ZFLNR1J/F48/T8 | states.jsonl | 7384780798 | 49786 | ff5bd1c4c2f49e0302669464c6d7939fc23e92fbf867e796b17961c6aec4241a | 前帧 BACKFLIP |
| C08 | 25226ZFLNR1J/F48/T8 | states.jsonl | 7384830584 | 50173 | 39873f3ccb7ebaec52f4a357cc923507bfd9f7792b849b508a0a1a7105f340b4 | 后帧 BACKFLIP |
| C08 | 25226ZFLNR1J/F48/T详原行 | states.jsonl | 7383186786 | 51004 | 66057de47ba0d8d29a9ebb46d92fecc50907c0687347fb9989b893d8e6c79c97 | 首次就绪帧 |
| C08 | 25226ZFLNR1J/F48/T详原行 | states.jsonl | 7384929839 | 49431 | 30f59e4fc75559a4d25742115705ae803fd8b356bcc138651afcda6fd6e2b4d4 | 末战斗帧（可能早于最终动作） |
| C08 | 25226ZFLNR1J/F48/T详原行 | sl-attempts.jsonl | 8659148 | 13832 | 1ff0ccf5fd18bcfed22569e9f3b0b85c7aad8e770f472f5b72e9092033a7f28a | SL结果 6 |
| C09 | 49HL2N70CHMU/F48/T1 | decisions.jsonl | 914470330 | 1597 | 28e90a09c54caeb9db8199c5a887828fb594c26093b50d1fba6328e139341117 | 决策 NOXIOUS_FUMES |
| C09 | 49HL2N70CHMU/F48/T1 | states.jsonl | 10726772602 | 50798 | de5bedf7d1a839ae3975dc4dd8a6cda699a1f18570654d8014037daa418f5f28 | 前帧 NOXIOUS_FUMES |
| C09 | 49HL2N70CHMU/F48/T1 | states.jsonl | 10726823400 | 49808 | e3d1901131b4fc3fff63575167e2ee96bd665244c83cd9a4fc7641b7761179c7 | 后帧 NOXIOUS_FUMES |
| C09 | 49HL2N70CHMU/F48/T3 | decisions.jsonl | 914508225 | 1442 | 718725e6f7986cff24a2b07dcf9df72f163f02106d091952b58397f82ed282bc | 决策 ACCELERANT |
| C09 | 49HL2N70CHMU/F48/T3 | states.jsonl | 10727349053 | 48069 | 11ef9ca8c9edd43a413292b40e35de791e00828d10f4edb4ee74e8b06a6904ce | 前帧 ACCELERANT |
| C09 | 49HL2N70CHMU/F48/T3 | states.jsonl | 10727397122 | 47175 | f605dc47ee60db5b6fcbdb88f2b50bf1f017a332d364cc710f600f158bd6e609 | 后帧 ACCELERANT |
| C09 | 49HL2N70CHMU/F48/T6 | decisions.jsonl | 914566438 | 1532 | 1bdb4a2c4e097e67b136c68bbe94d5cbe9f0c13494991670763fecd66aea2d32 | 决策 TOOLS_OF_THE_TRADE |
| C09 | 49HL2N70CHMU/F48/T6 | states.jsonl | 10728205403 | 48005 | 7ce93a5b0dd9007082a8bf2c7266cfaea7ebc00e38e6e2d2e4a04dde797dc656 | 前帧 TOOLS_OF_THE_TRADE |
| C09 | 49HL2N70CHMU/F48/T6 | states.jsonl | 10728253408 | 47167 | 83164c368776c242418b92423d0c5e86752ce3ce8997c8e5962d227659922917 | 前帧 FOOTWORK |
| C09 | 49HL2N70CHMU/F48/T6 | decisions.jsonl | 914567970 | 1494 | 475af706f45a094f51a462ba48c1a870bfa91517455ee03ee8d0e7af31e96963 | 决策 FOOTWORK |
| C09 | 49HL2N70CHMU/F48/T6 | states.jsonl | 10728300575 | 47564 | 6f98197c4b2a53d4323469423b69e947e3ef6926c0349323d098a650cb4ba03a | 后帧 FOOTWORK |
| C09 | 49HL2N70CHMU/F49/T1 | decisions.jsonl | 914946788 | 1599 | 13ed1899820ee4185374c9b214c3347aa78daa244815b11543afdeb46b13c8e5 | 决策 FOOTWORK |
| C09 | 49HL2N70CHMU/F49/T1 | states.jsonl | 10732003435 | 51355 | 05613ae3c61f3cc5f8117ef6bd40ca63b36b0aa774080a7d9403ce00b13bb695 | 前帧 FOOTWORK |
| C09 | 49HL2N70CHMU/F49/T1 | states.jsonl | 10732054790 | 50467 | b9c8ca7de0b35c642a286c5d2fda7e4e3cfa24e4671bff76cb6e23c2b1e6d509 | 后帧 FOOTWORK |
| C09 | 49HL2N70CHMU/F49/T2 | decisions.jsonl | 914981394 | 1454 | 35c1336d609695e2a2c51b67a04944eed0cd5848711674f51febebfa713dcace | 决策 ACCELERANT |
| C09 | 49HL2N70CHMU/F49/T2 | states.jsonl | 10732400649 | 47729 | 3e865c4845c1bc4fbaff99bb05ac236209f0a673f5472d23e6d89c4019391bb7 | 前帧 ACCELERANT |
| C09 | 49HL2N70CHMU/F49/T2 | states.jsonl | 10732448378 | 46797 | c9bb867e2650f8b3facb6494277b2b883a6751fc1bd72f0d6f16b193dc2e7379 | 后帧 ACCELERANT |
| C09 | 49HL2N70CHMU/F48/T详原行 | states.jsonl | 10726669432 | 51593 | fc1558380b415b0ef8b861e28ddae5d832a69f5e7d4006c4b9a51116bddcbc35 | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F48/T详原行 | states.jsonl | 10728595577 | 47708 | 09ea0bab6820b7662278756fe63ff3edd621bb9a62948e0b66017396a668d458 | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F48/T详原行 | sl-attempts.jsonl | 27682309 | 17087 | 278869d6c49f78495744c737791d064f249d9fda28530f5a67384deeb2947a7e | SL结果 1 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10728809075 | 52732 | c8650f60ec7f3b3c6e814c44df0c6b5c2842a1ca21787dc2d301f073f2caddb4 | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10729405145 | 50295 | 2007ad89195e30eaa932d51a65ba79e7fbb9f4eea909b30e942a958cd8327045 | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27699396 | 7680 | a56cb8bb5cc57cf8539a0be9d9b9a1b985c49fc3f34533c9736c92a603cd0f53 | SL结果 1 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10729455440 | 52732 | b11628a683e87a6acb97d7e4ee9956ce223b317f6db5c80eb7f6dbacc6c423aa | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10730051510 | 50295 | 6e4e2025f75057a36099113905cafbbbae4725e187aa62d313889948db26ff2f | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27707076 | 8172 | 63eb99924fc51f715b03d04f4bb2ce9bf00471e89cf9c7f5f8a1e7f0c72d18af | SL结果 2 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10730101805 | 52732 | 55984efb56a5e11841cbb8fd47129e356d0a3bb300cbdaa30f596a67672217cd | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10730697875 | 50295 | 205db3650985dccb500b5220bc4d8a2f588f4893ea29afea0a23b4d5e516931d | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27715248 | 9094 | 2b3f2350fb236920c98f2ce673a1a838cbf31e8014bcf0215dc4857130b8bdbe | SL结果 3 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10730748170 | 52732 | c6ad75f97d2ccb02423466051066205df8fa1686c88b09bd0184d7b52e846e47 | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10731302017 | 48916 | f6707eac4e4ef095b7e4f6e530cf5e632f164ade26df3915fb9b10222986266c | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27724342 | 10457 | 29b5c26882de92d3dd7024d9af94ca886ab7cb23940d87e1ea4a926465abd0c4 | SL结果 4 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10731350933 | 52732 | d8350839c86408c1c83c1d52e38e276120dd8fea5a576bb7cf53b616d02f4d1a | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10731900307 | 50396 | e885bcd4d92d3f17655f21db6840cee030b424c4f760a061ef53934bf96250ad | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27734799 | 9636 | 7df44895c4ee675aeac05185e555c7fcb92db49eaca83f04d7e5e9a3c0daf2c7 | SL结果 5 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10731950703 | 52732 | 4bca63773e93d05b061b25372d4c838bbde826d4a8cceaa1cec1fc1702453b66 | 首次就绪帧 |
| C09 | 49HL2N70CHMU/F49/T详原行 | states.jsonl | 10732545827 | 50295 | e6d359ca24cee236780b59c483a23b5d46ec87639ae72e2db2311989c1d8dada | 末战斗帧（可能早于最终动作） |
| C09 | 49HL2N70CHMU/F49/T详原行 | sl-attempts.jsonl | 27744435 | 9534 | d9bc480022fcf4a47bd0cd7f8f9310205748f621da5adcaa454c1504f3273ab8 | SL结果 6 |
| C10 | 4XLZURXMD872/F33/T详原行 | states.jsonl | 9388591283 | 38534 | bf1dc2e09ee4e41318219b153132e91b3d686166869dde0bd5f587328053a4c3 | 首次就绪帧 |
| C10 | 4XLZURXMD872/F33/T详原行 | states.jsonl | 9389151747 | 38413 | 803bbf1b2344bfeed3699f5dd06807e467f531ad82be8e630076f5e34d8ac6c2 | 末战斗帧（可能早于最终动作） |
| C10 | 4XLZURXMD872/F33/T详原行 | sl-attempts.jsonl | 19857806 | 5267 | 82725306239b8ed62c5cbb9ac419ab92882747acf944990666b43ef77364c3ed | SL结果 1 |
| C11 | J8PHG72DGD90/F33/T13 | decisions.jsonl | 810384565 | 3088 | ac42a6c33a0d1e80d92e243716b28de29de981bdbeb918e7bbbc7bb8ad824004 | 决策 HIDDEN_DAGGERS |
| C11 | J8PHG72DGD90/F33/T13 | states.jsonl | 9741817038 | 38716 | da8a07d7451e39d3326350f5f52bef8f38458ab0a078349166db00fb7dfb0f9d | 前帧 HIDDEN_DAGGERS |
| C11 | J8PHG72DGD90/F33/T13 | states.jsonl | 9741855754 | 38179 | 6f628b1f8e3b1cd4678c64869779a1463818ab9a16b82159ef87555fbee232f3 | 后帧 HIDDEN_DAGGERS |
| C11 | J8PHG72DGD90/F33/T详原行 | states.jsonl | 9739130397 | 40755 | 215e4eaa2733194941750912c940870107819980a77d0b661c9a1175b34c7515 | 首次就绪帧 |
| C11 | J8PHG72DGD90/F33/T详原行 | states.jsonl | 9741893933 | 37894 | 07f8f64365128ff2955ac6add5487bfa1cb1a1011823de32323eae5e6d6dd346 | 末战斗帧（可能早于最终动作） |
| C11 | J8PHG72DGD90/F33/T详原行 | sl-attempts.jsonl | 21865484 | 29821 | bc1f91818a9cd5017877d768ac4b1dc4969bba38eba793fdbb5f9b5ea0ee42e5 | SL结果 6 |
| C12 | LRN0HPZ0FZS1/F48/T详原行 | states.jsonl | 6334612441 | 50349 | a4d5b88dfcf7dc9f7e0537fc35a6a2e27f11e72d160f2fe841237d20bcb7962f | 首次就绪帧 |
| C12 | LRN0HPZ0FZS1/F48/T详原行 | states.jsonl | 6337149680 | 48966 | 340b0a95aaed4dcc8a252fdba02e7dc1bca449fff56c593f27fd6a3f32120e4f | 末战斗帧（可能早于最终动作） |
| C12 | LRN0HPZ0FZS1/F48/T详原行 | sl-attempts.jsonl | 3545774 | 32636 | 92888bd59397b36932accdd054a3a2c50c3b461ad9d8f2de33c60de674c20c70 | SL结果 1 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466226320 | 12342 | 0137b0d8409545d4a53e4e84db5ee8ab248417163a98c6d4d53960ea3c5c7a79 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466238662 | 1565 | b5599c14c436afb073e97d7f63b29f76ec4d3a789aa3cbcaca76eb5004214478 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466240227 | 5963 | f16dd3745f7f821dd6413c8be3e5f063d88d27654150ab43ef3ee35fb09b53f8 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466246190 | 1581 | f805e282273fde36f62fbf0681e3a087789328e91bfc17bf52b37ddaeb782a9a | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466247771 | 1564 | c84f615431aa255b1ed8f890e45156e27eeca62739e8423a9626b3883b8ee086 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466259702 | 1522 | 9f63bae258875b61cef980e59559aa95dafd93e247f7f020b2e5a3c272cd5be4 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466261224 | 1603 | 4cdd20b374fda3392d671de011cf19a4e64df4e50019e48c26869668c17478a0 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466262827 | 1741 | 86a6f8255dad16444ab5354084674f8a83ca8cb41ee99c0a3cae3d948734fc86 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466267671 | 1668 | 2d6333ffa40602cddeb2b18bc6e2bd8002e81394118afd030ec7b905c0abf8a9 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466272613 | 1687 | da02190435516eb81b0cbedd2983cf23951772bd99d0c1cc96b8b542c09d478e | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466274300 | 1738 | f8196446350ff44a5465fb749144a948ddec059ac93f78586799673b0100a242 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466276038 | 1725 | ad923dc4738ae68030e611c43c251c1e6819c2a8c91991bf07e7bec302d739c1 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466280825 | 1628 | 11e5eb4e5aa229a07b569913f93706b43409eefe7aa1c2ea92bc3cc91583bdd0 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466282453 | 1528 | 8a6c2f0710c57596f79843c4764cec0971f595ec3de3fd64ad1282c18a51e544 | 完整选择/副本/重放窗口；详见supplement索引 |
| C12 | LRN0HPZ0FZS1/F48/T3 | decisions.jsonl | 466283981 | 1593 | a999623ca9dcf0624c68393740c9ed231db981857a301af58785d4ec0f39e1f5 | 完整选择/副本/重放窗口；详见supplement索引 |
| C13 | LLYSRQQ35AVW/F48/T3 | decisions.jsonl | 552119620 | 8017 | 8b3b1ef671dc151e8bd46296d273cf407276db76f64a48f16b4fd815e3813acb | 决策 AFTERIMAGE |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7265953608 | 58956 | ba0c232405619c0e0abce652bca245b1400262f0b27184af716559855c78c77c | 前帧 AFTERIMAGE |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266012564 | 57998 | 3faf9041b65fb193d0721d5c13c8736d0909a1054b6a5ef61d1fdea4681722d4 | 后帧 AFTERIMAGE |
| C13 | LLYSRQQ35AVW/F48/T3 | decisions.jsonl | 552129373 | 1630 | 8455003862a05c8531944b9da53f00a3d7e45983a7495798c2b6d6736497e86e | 决策 DEFEND_SILENT |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266070562 | 57610 | 9007b3097ee6261d16a19252c71d126d079dff036c34c8eebe00a8ef74d38f71 | 前帧 DEFEND_SILENT |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266128172 | 56834 | 574a19cf198b083e6c8de51833ff79a0db3f09907d5eacdb25c2c7c4683e1348 | 后帧 DEFEND_SILENT |
| C13 | LLYSRQQ35AVW/F48/T3 | decisions.jsonl | 552132651 | 1585 | 03bc49b3353e585830dd43faea76c486fabd9d99e5b8d5d8f34b66bfeaab6489 | 决策 ADRENALINE |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266185006 | 56037 | b40a4b0ace28aef63bf3aa82407625e4049d0622040add1edc27ea957d95a9f3 | 前帧 ADRENALINE |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266241043 | 56935 | 04e2448f57d3e6e7d29d0afeded585d3b4aa4edaa1a9144fb9eda95716848d3b | 前帧 MIRAGE |
| C13 | LLYSRQQ35AVW/F48/T3 | decisions.jsonl | 552134236 | 1516 | 0fb7b2125a348634990006bb96956d4a34f4dc58aefaf8b726f569b96fbd3fa0 | 决策 MIRAGE |
| C13 | LLYSRQQ35AVW/F48/T3 | states.jsonl | 7266297978 | 55851 | 1d192c52a926c386dc154279ab60b7a916cbf063f8012ef52fabd421b36ea60f | 后帧 MIRAGE |
| C13 | LLYSRQQ35AVW/F48/T详原行 | states.jsonl | 7265158099 | 58882 | 129aaa8b6886c6adab49317518dfdfd6734d47e1905c0b7f51a138d9450b50de | 首次就绪帧 |
| C13 | LLYSRQQ35AVW/F48/T详原行 | states.jsonl | 7267015540 | 56292 | 1225e5ea292803d3ed358d2fda0c32e4f67aaee14c1d8c24f51e2aa316acf7ca | 末战斗帧（可能早于最终动作） |
| C13 | LLYSRQQ35AVW/F48/T详原行 | sl-attempts.jsonl | 8104064 | 18320 | 6569494c06bac51bd380a73ce8d7ed41f0d271021ba8c300ddfb1365d26c0b77 | SL结果 1 |
| C14 | FH2HB2X17F2H/F6/T详原行 | states.jsonl | 6739660467 | 26833 | 8796dd113e8c4e7a01066204cc5ee2b33840e1f3700ef189c1b9ac55cfeeb894 | 首次就绪帧 |
| C14 | FH2HB2X17F2H/F6/T详原行 | states.jsonl | 6739914415 | 24247 | 3de0f26839ddea70ba4ed3e3fbc43ba7a06dac0182a44c17650ffd210ae125f2 | 末战斗帧（可能早于最终动作） |
| C14 | FH2HB2X17F2H/F6/T详原行 | runs.jsonl | 200715 | 422 | f220b17985e648d066fdf0a76798ffbe0c964872020b2dec6cf2455b8e2c81b8 | 整局失败原记录 |
| C15 | 64R0P0MTZWAX/F33/T1 | decisions.jsonl | 851107479 | 11073 | 18c7e883ab85ef6c18d7cbb75c67e60e7acd6f2975a38e2266c6a66b9ddc2ac5 | 决策 AFTERIMAGE |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10135399367 | 37389 | 2f63d167dbb7af6b410cefc9497a1f97cbe0cf087ee81332d6ab5a2df9f3ff8c | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T1 | states.jsonl | 10135436756 | 36710 | e4e4982f049f489e1653d904bc61e61369a728463c79ae3b29ee2770c3918fde | 后帧 AFTERIMAGE |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10123138825 | 37389 | 9e90604092a4b6f3082dbce997fe2a38014d720d4340997632d25d02e0b64dd4 | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10125272048 | 35302 | a74e1697d7848134a3ab2cb2c7c399eabec68f6d0f67701d231010db78c99e07 | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24147814 | 21374 | 16935b3a884fd9721bac70618f1aef57ddd15b882bf9f16224dd5084abb5fa05 | SL结果 1 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10125307350 | 37389 | 4be707652240ff1b97425bb06ac7b660f728d24ddb6e0a8251c9e12999d6e515 | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10127778046 | 34313 | 053d93a5dcd517210e3143726f2c02ae1b7114dbd4c0d09711ac92c2535e310a | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24169188 | 24627 | d4eae12f030f2800788051c4e9e83a0ed218789403ecdf833c660c723674abca | SL结果 2 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10127812359 | 37389 | 84d33873db012bf009876398d6691d3033262515c2a9179e2d5f30c9a9d9347f | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10130252435 | 34313 | ad0075b52c97f1188e1c2dc5e81be644a406fc95a0de5328a9e6603117c23b3a | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24193815 | 25905 | 558481765dc010ceeff2827859a21bb1c81b8bc59dded6efbb7f00b195632ef7 | SL结果 3 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10130286748 | 37389 | ecf2e991c0bf7b5c3371497db2f2de7fd37357404b555ff37bdd1c1ebf5e1274 | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10132757054 | 34313 | 7b7be4be0286ee61ead72d56f31e31631f4fc5e8067267b03411df8cd80bff50 | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24219720 | 26001 | 10db49a239ff5b865ad5f9a450331366d079db67727c3866c1e53d34c6b3600c | SL结果 4 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10132791367 | 37389 | ab719b93bd6a5bff262136348e36371ba28711d769e834bbb45243f5777b0e65 | 首次就绪帧 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10135364956 | 34411 | aea0efb2c000f64ffd953b8a20712cd681b486165c64f97cac16087dcfe0c6e0 | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24245721 | 27527 | ad4c4a42d4a1ca35f0dc9bf0bf12118a459cd70e634616b0e9e0c932255fd88f | SL结果 5 |
| C15 | 64R0P0MTZWAX/F33/T详原行 | states.jsonl | 10137412323 | 34006 | b48c961d817fc64c44c0796dc108d3c1419a5635af63fe1a4971f6f6c132e923 | 末战斗帧（可能早于最终动作） |
| C15 | 64R0P0MTZWAX/F33/T详原行 | sl-attempts.jsonl | 24273248 | 23752 | 1ffca5896bbca69f4001ccc056debfae12e6136fb8bdf5d1cbdc3715327ac54e | SL结果 6 |

## limitations：分层、未知与下一步自然验证

| 实际成功大脑来源 | 独立局 | 首试胜 | 含SL最终胜 |
|---|---:|---:|---:|
| codex | 192 | 6 | 10 |
| deepseek | 5 | 0 | 0 |
| mixed | 3 | 0 | 0 |
| unknown | 1 | 0 | 0 |

来源采用冻结eval/brain_source.py的codex-successful-brain-v1：有答案、无错误且accepted/历史problems合格，题号+引擎去重；未解决脑题保守unknown，不用ds兼容计数或请求配置证明成功来源。PYE4VXNSLGSS有未解决题，主组排除；DeepSeek5、mixed3及unknown1保留在全201覆盖，不能把它们或同局SL作为额外纯Codex样本。主组A0—A9有低阶胜，A10 154局0整局胜。
实际版本按战斗窗口首帧之前run-config匹配：204条配置、180个不同记录源码commit；(来源、进阶、commit、经验版本、启动prefix SHA)共204层，明细version-strata.json/versions.json。大量dirty和动态知识前缀存在，commit不代表可完整复现当时树；本批基线源码冻结不意味着所有历史局同版本。自然局的路线、牌组、HP/药水、敌人和SL均混杂，没有固定版本的足量受控配对，不能拟因果分数。
未知与限制：手牌/牌堆多重集没有全程物理card-instance ID；同ID再打不等同张再抽，回返仅C04这类局面有直接文本/序列支持。自动重放与奇巧触发不一定都有独立CLI动作；queued既非完成也非失败，完整选择链的局部案例与全局即时完成口径分开。帧只覆盖决策点，内部逐击、过度伤害、回血掩盖的毛损血、随机落点不补零；敌阶段回血/重置不算负伤害，末战斗帧可能早于最后动作/真实死亡，实际结果用runs/SL与结算原行。手位/抽牌封锁/额度只按已见现场条件，不外推全部升级、角色或进阶。
假设和修订保存：最初假设“费不足”可解释核心不运作，C07/C10反例改为“到手、合法后继和存活均须分账”；最初统计把落盘ts限制在observed_ts之前，漏同指纹动作，v1全部废弃保留；v2发现pending不是未打出，又排除not dispatched/失败记录，最终发出/即时完成分列。身份核验首次把manifest.runs的对象当字符串集合产生TypeError、一次空combat结构探查TypeError，随后核实真实schema；均无身份失配/写请求/生产改动，探索失败在analysis-history.md留档。没有把无实体的一伤、封抽后保留的挡/能量或未施能力抹掉。
记录限制：首次CLI前报告草稿未独立记录SHA即被最终稿覆盖；revisions/report-draft-reconstructed按同一生成文本、首次时间与空CLI id重建，并明确标重建、原始SHA未知。第一稿计数84225字节与重建值单独留档；不冒称同期原件。分析v1/v2及原动作/失败材料保留完整原字节。
可证明的是上面原帧中的资源净差和具体后继效果；尚未证明按这些建议执行能提高首试阶段通过/最终胜率，也没有验证无限循环、统一最优费用或牌数、先建/先抽/先喝的固定顺序。未来先经experience-update去重沉淀并分别核实际live版本、消费者输入与真实采用；再按自然新局记录采用动作是否满足条件、核心第一次启动回合、有效后继次数、确认伤害/挡、启动HP和实际药耗、首试与SL到F17/F33/F48/F49和整局胜。每个独立局只计一次，按实际版本/进阶/来源分层，报告与旧切点/失败保持；没有新局的收益结果填未知，不以发布或前缀读取代替采用/因果改善。
本批验证为冻结原件及分析口径检查，没有源码改动；tsc/vitest/cases均null，撤源码失败/恢复通过不适用。HEAD保持完整base，工作树干净，fixes=[]、merged=null；不运行第4节live合入，不生成游戏版本或成功测试。

## 全部201局覆盖清单

| run_id | A | 实际脑 | 首试整局胜 | 最终整局胜 | 终层 | 原code | 状态/决策/脑/SL/config |
|---|---:|---|---|---|---:|---|---|
| C48LLXBGKXQ9 | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | bf3ebb7c | 1131/1108/32/8/1 |
| Y6GM2CHWJBEY | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 9692ea6d+dirty | 575/557/20/6/1 |
| LRN0HPZ0FZS1 | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 8d79fd5b+dirty | 830/793/50/4/1 |
| T082DRCUHRRD | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 8d79fd5b+dirty | 1073/1034/47/9/1 |
| 1HC609GTLGN3 | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 22 | 4915e3b3+dirty | 573/561/21/6/1 |
| R0HEV5E3QT6G | 0 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 5de5d518 | 825/801/47/8/1 |
| KAY522KT5NXR | 0 | codex | 非胜；死亡/判死截断见inventory | 胜 | 48 | 5de5d518+dirty | 875/848/55/5/1 |
| E6AVMMVCSRPC | 1 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 7be569b1+dirty | 486/475/18/6/1 |
| XYYQYBRM2A01 | 1 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | bb19732f+dirty | 892/874/33/7/1 |
| K3676LU8B0UH | 1 | codex | 非胜；死亡/判死截断见inventory | 胜 | 48 | ccf1fcde+dirty | 830/805/48/4/1 |
| CSBR5CRDWQNB | 2 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | c4c7ad97+dirty | 592/573/33/8/1 |
| ZZMYZ5UBCG72 | 2 | codex | 胜 | 胜 | 48 | b9c46d66+dirty | 822/797/48/3/1 |
| 10GPK5XGHCK3 | 3 | codex | 胜 | 胜 | 48 | 9e0fda2e+dirty | 1020/986/50/4/1 |
| 1NZ8FE5F34R9 | 4 | codex | 非胜；死亡/判死截断见inventory | 败 | 29 | 45965f49+dirty | 495/477/29/9/1 |
| F9PP859XZ3RJ | 4 | codex | 非胜；死亡/判死截断见inventory | 败 | 37 | d283e641+dirty | 635/614/37/2/1 |
| 9YBKCNBFP0X5 | 4 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | d9a3ea37+dirty | 1065/1035/47/9/1 |
| 1LMBFGSMCWKU | 4 | codex | 胜 | 胜 | 48 | 86b24a1f+dirty | 689/663/45/3/1 |
| ZE8F192FKX24 | 5 | codex | 非胜；死亡/判死截断见inventory | 胜 | 48 | 452f7bc7+dirty | 771/741/46/5/1 |
| FH2HB2X17F2H | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 6 | f8229263+dirty | 95/90/9/0/1 |
| UACFSW4VDDLD | 6 | mixed | 非胜；死亡/判死截断见inventory | 败 | 48 | 103fd5ff+dirty | 1236/1202/50/13/1 |
| VN7RQJMJEFMX | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 42 | 42ac6c1d+dirty | 764/739/41/2/1 |
| 75X1BARMNZ03 | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 20 | 0a066c2f+dirty | 392/376/20/5/1 |
| ARKQLHG6RS4W | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 25a408ef+dirty | 666/651/32/7/1 |
| 6EV5V6PJJS9D | 6 | mixed | 非胜；死亡/判死截断见inventory | 败 | 39 | 3ebbdc6c+dirty | 670/645/38/2/1 |
| 8CFMW9SAGFWQ | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 24 | 7c7f22e3+dirty | 375/362/27/1/1 |
| 2L1BNN9ZJEFU | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 7c7f22e3+dirty | 1176/1130/45/8/1 |
| 53FLQ68CETW0 | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | ee1f4fd1+dirty | 1227/1202/54/10/1 |
| ENKYQMS9W4ZD | 6 | codex | 非胜；死亡/判死截断见inventory | 败 | 43 | 65d99e74+dirty | 818/790/40/3/1 |
| 2SU6XN2AEJRD | 6 | codex | 胜 | 胜 | 48 | 2ec81b9f+dirty | 818/798/58/4/1 |
| SADL3CGYTGSR | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 2c81eb76+dirty | 1151/1115/54/10/1 |
| Z6CFLDR3N4SB | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 48f2bf5a+dirty | 767/742/49/4/1 |
| 3KME36ADUE4U | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 27 | 5ae08a3d+dirty | 546/524/26/6/1 |
| VLV17NUSFS61 | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 7bea7d99+dirty | 1024/980/45/14/1 |
| 9YT51CK8RC39 | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 0d0c4b69+dirty | 566/558/16/6/1 |
| 2PVLGRBGUX9S | 7 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 9988ca8b+dirty | 1226/1189/48/9/1 |
| 4Y94N8RDPGPM | 7 | codex | 胜 | 胜 | 48 | 8b268858+dirty | 719/693/42/3/1 |
| LLYSRQQ35AVW | 8 | codex | 胜 | 胜 | 48 | bf63ab40+dirty | 679/651/54/3/1 |
| HMVJKM56S4Q8 | 9 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 6566b7d3+dirty | 664/642/31/9/1 |
| F4QKG4J1AJJZ | 9 | codex | 非胜；死亡/判死截断见inventory | 败 | 38 | 3a2a2a48+dirty | 728/703/37/4/1 |
| G403VCZ3BH1B | 9 | codex | 非胜；死亡/判死截断见inventory | 胜 | 48 | 473a62f4+dirty | 654/635/48/4/1 |
| MGA0CZDDKC0P | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | a999dba8+dirty | 436/423/19/6/1 |
| 25226ZFLNR1J | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 9852b39f+dirty | 889/862/45/9/1 |
| JLN5SK17W4FQ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | f1d951ec+dirty | 810/790/37/8/1 |
| JMH5C51RLN4E | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 41bd4a44+dirty | 880/853/53/13/2 |
| 9TG1RP5LFAAK | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 141df614+dirty | 923/903/47/11/1 |
| JQPT83P8KDSZ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 25 | 3cbc6955+dirty | 523/510/24/5/1 |
| 4D4J8USKCPAV | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 1e047a36+dirty | 546/527/16/6/1 |
| TD1HVGS7H6LB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | c1f61de9+dirty | 368/358/22/1/2 |
| PJ2LL9KU7FHD | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | eabdd307+dirty | 641/635/18/6/1 |
| S9UZAK0JP0C0 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | be0ee6df+dirty | 861/826/33/10/1 |
| MCCK2602T1SR | 10 | deepseek | 非胜；死亡/判死截断见inventory | 败 | 7 | 4fb81b17+dirty | 164/159/9/0/1 |
| UJ0K3G10609Y | 10 | deepseek | 非胜；死亡/判死截断见inventory | 败 | 48 | 4fb81b17+dirty | 958/913/45/8/1 |
| U8K28UUGYP3U | 10 | deepseek | 非胜；死亡/判死截断见inventory | 败 | 11 | 4fb81b17+dirty | 240/233/10/0/1 |
| L9SGRBB5R698 | 10 | deepseek | 非胜；死亡/判死截断见inventory | 败 | 17 | 4fb81b17+dirty | 653/635/16/6/1 |
| D4LJ9QMGFB8Q | 10 | deepseek | 非胜；死亡/判死截断见inventory | 败 | 22 | 4fb81b17+dirty | 408/397/21/6/1 |
| 0NZXA12NLDMH | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 0fd8e845+dirty | 678/669/31/7/1 |
| 4ANT8D00TP72 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 37 | b219de68+dirty | 651/627/42/9/1 |
| XBD8Z9XLPCPN | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | da2ccb92+dirty | 553/537/31/8/1 |
| PU80F84P6HPN | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 0581ecb3+dirty | 1064/1033/31/12/1 |
| NB8KCF6HRGVF | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 56c64ff8+dirty | 484/466/31/1/1 |
| 5X2GHKJ89PN1 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 3599ab0a+dirty | 948/929/49/11/1 |
| TCFAHJ9K19VY | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | d4026dbb+dirty | 489/476/16/6/1 |
| LS8035TB32P3 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 42 | 74f82413+dirty | 838/816/41/6/1 |
| L704TLETMZBM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | cc1bdc59+dirty | 870/848/55/7/1 |
| KUZVERN40NGK | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 28e339fa+dirty | 418/413/15/6/1 |
| BVF22RSFVBS9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | 28e339fa+dirty | 434/424/23/6/1 |
| ZVYUL2YP3518 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 6ac57ea6+dirty | 1147/1110/46/10/1 |
| VPW8YH7A4QFM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 39 | 3caa860b+dirty | 707/686/49/2/1 |
| DPYF2BAA3DKT | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | ad01f74a+dirty | 991/964/47/9/1 |
| CRK2HNYKSCZC | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 11 | 884c9f33+dirty | 152/148/10/0/1 |
| HUVEPWQAHWFU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 35 | 9e20ade9+dirty | 739/714/34/4/1 |
| UMVLWER4CD98 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | ebd920b4+dirty | 1202/1165/50/9/1 |
| TU3XB4CAEDAW | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 40 | 0068600d+dirty | 791/759/40/11/1 |
| V0383V5S9BCQ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 11 | 3ac2445a+dirty | 191/184/10/0/1 |
| 8R5CXD5C8PW8 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 35 | e8a6fb71+dirty | 671/653/35/4/1 |
| QNTW139MGECA | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 28 | 98d2d508+dirty | 487/476/33/1/1 |
| HSX4HYATB4E2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 09ac8004+dirty | 1013/927/49/13/1 |
| WYB0NCD6W83J | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 15 | e33ca6e0+dirty | 231/222/14/0/1 |
| 87LCSDR5P3DL | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 9 | e33ca6e0+dirty | 179/173/10/0/1 |
| TKXQ6L4N9A6U | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 22 | e33ca6e0+dirty | 378/367/22/2/1 |
| 02HB4L0C3C67 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 12 | e33ca6e0+dirty | 221/211/12/0/1 |
| T3FW7R2R2306 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 8 | 98df162d+dirty | 158/154/8/0/1 |
| P5HT1272P5SB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 25 | 1a89c2d4+dirty | 423/409/25/1/1 |
| KQQELQSZ382Z | 10 | mixed | 非胜；死亡/判死截断见inventory | 败 | 17 | f8e01696+dirty | 530/516/16/6/1 |
| YLYLZWHA0GKU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | f65cbfac+dirty | 683/655/42/2/1 |
| 7ZUC4VPMDS41 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | f0c9dfbf+dirty | 565/550/18/6/1 |
| 2Y27VAYZDA02 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 22 | 1a5e1217+dirty | 663/654/21/8/1 |
| TDLBRNA0R05B | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | dc899f95+dirty | 972/947/49/14/1 |
| MCT1GPTL8D35 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 42 | 0061f599+dirty | 720/696/42/7/1 |
| W7BHM8U02RKG | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 910604a4+dirty | 389/384/16/6/1 |
| 01H1533KSS5C | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | f8dd742d+dirty | 550/545/17/6/1 |
| 2K4H3JEJHRSB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | 2518c73d+dirty | 336/326/25/1/1 |
| ULP4TN1GNHMK | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 92376ca3+dirty | 493/484/16/6/1 |
| CA5KE8GFJ9X2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 13 | 33f02a6f+dirty | 282/265/11/0/1 |
| 61E2QS63Y9WU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 28 | 03d50f0b+dirty | 462/443/27/7/1 |
| 5PM6JAQG6FNQ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 39 | f56da22b+dirty | 660/638/39/7/1 |
| DUZUBAJ3A8GP | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 30 | 93298980+dirty | 623/602/29/6/1 |
| VLZ6CCT8AQ0A | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | ac321b1f+dirty | 729/699/46/2/1 |
| 8JRE1C4H4Z2W | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | b0f41f03+dirty | 676/659/31/7/1 |
| YF0LXT1QSTGG | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 91c1db90+dirty | 1091/1065/47/11/1 |
| XP2SL33HT0D9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 60685510+dirty | 730/712/31/7/1 |
| 751FN9QM9MHQ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 79bee0fc+dirty | 624/615/15/6/1 |
| KV0JHNJCKXLS | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 70c8352b+dirty | 686/669/32/7/1 |
| YQL8RZ8BWN1E | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | b0b0e679+dirty | 582/571/18/6/1 |
| KEN58SH9SLZ6 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | f9db52c1+dirty | 558/548/18/6/1 |
| TXZ6RVMQA09D | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | f17e15ca+dirty | 840/762/48/6/1 |
| WQZVENQ7DTRP | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 31914e4b+dirty | 798/766/31/9/1 |
| 1913SE84AXQF | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 734c0860+dirty | 413/398/31/1/1 |
| Q6M2Y34MWKRE | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 9 | a881e27a+dirty | 135/131/10/0/1 |
| NHA2KW0RB7VP | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | b8ca9311+dirty | 602/584/34/7/1 |
| G33HU22H2543 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 710dc4dc+dirty | 879/850/45/8/1 |
| P74C04AEPL1F | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | fd4c8e52+dirty | 410/395/23/5/1 |
| RC61MFQM63Y6 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 0d6c1a82+dirty | 694/674/33/7/1 |
| BTSRF7JL1W1Y | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 6ad5584f+dirty | 653/635/28/4/1 |
| XTSV1U9JD34T | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 03f4ffe0+dirty | 810/775/49/10/1 |
| 9Z9H2EXKLF3T | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 6c3d8187+dirty | 1018/932/51/9/1 |
| 7X0W3U8TVA2A | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 047c809e+dirty | 461/445/31/1/1 |
| MTQ0EUBJ3R6T | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | ceb74207+dirty | 440/424/23/5/1 |
| KFRDELW2TH2P | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | a73ce7cc+dirty | 620/587/35/8/1 |
| GXNKW8X1XYJP | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | b1714285+dirty | 673/649/48/7/1 |
| PD9AYQVMLQW6 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 7f6d5b4b+dirty | 1125/1017/55/11/1 |
| L2TSFU62Z57Z | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | c1dd721f+dirty | 447/442/17/6/1 |
| ZTRGYYMLR8SC | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | aa1e2136+dirty | 607/594/16/6/1 |
| K2JAGKVJAWZJ | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 46 | 6fd495cc+dirty | 814/722/48/3/1 |
| 79UCJ0K6R9C1 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 14 | f8947651+dirty | 243/235/14/0/1 |
| NEWRFAYKTQHR | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | cecc8317+dirty | 675/658/30/10/1 |
| 9R916WW0V65N | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 8ef00878+dirty | 1405/1165/50/12/1 |
| T0DGVABPV60U | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 261af56e+dirty | 1116/1071/46/12/1 |
| G8NHLL09DLBX | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 24 | d61bf0ec+dirty | 747/726/25/6/1 |
| LYBHQ1X230ZB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 30 | 5925a43d+dirty | 478/455/28/5/1 |
| H1T1F8ML9FUE | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 1a0adbaa+dirty | 930/844/49/9/1 |
| AD3QSC3P41JU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | a340c1ec+dirty | 728/708/43/9/1 |
| 9DAS5L8YM1CN | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | 7f0c04dd+dirty | 396/387/22/6/1 |
| BJLTVSYXCSGS | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 42 | 722518cd+dirty | 628/594/43/8/1 |
| Y5H4CFAQ2WTG | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 2b1a5f6d+dirty | 517/496/32/3/1 |
| SY0WMJNNVRLM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 650a6a84+dirty | 722/636/37/10/1 |
| 4XLZURXMD872 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 187c025a+dirty | 610/591/33/11/1 |
| QHK1XQ928TTM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 69a7b441+dirty | 767/746/34/10/1 |
| UZ1T7AH49WMB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 25 | c70efc8c+dirty | 422/406/24/5/1 |
| 7BNC8QX746YP | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 14 | c70efc8c+dirty | 159/152/14/0/1 |
| CNKR125PFHJ5 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | c70efc8c+dirty | 416/399/30/3/1 |
| PF90JTU0UZ5M | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 22 | 433144fb+dirty | 455/444/23/7/1 |
| 2H311EAD34GD | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | e838a975+dirty | 661/647/16/6/1 |
| WZL2AMEY85S7 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | d07c38fc+dirty | 390/381/15/6/1 |
| R3AJCGQGGMR4 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | 11d759cf+dirty | 697/668/45/7/1 |
| M0GY0A4M2F7H | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 9949a5de+dirty | 539/526/18/6/1 |
| Z91JN3S3PQX2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 049dff24+dirty | 505/481/31/2/1 |
| LY83ZMTFVKJH | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 21 | 049dff24+dirty | 556/538/19/3/1 |
| HEMND3SMQYB8 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 72499093+dirty | 966/850/47/9/1 |
| P2M3DFJ4DEZ3 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 3541bc54+dirty | 1367/1247/51/14/1 |
| PBUBM0LRTEDD | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 8149e4ca+dirty | 963/934/48/13/1 |
| FU8ZUQHBHNV9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 8 | a7c2a411+dirty | 159/153/9/0/1 |
| 456MRNGCPD8E | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | a7c2a411+dirty | 655/634/30/3/1 |
| J8PHG72DGD90 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 20cec89a+dirty | 978/818/33/9/1 |
| 0DJ6GFZZ0TG9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 3cadc990+dirty | 414/401/34/2/1 |
| KSX97DF5H3NY | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 3cadc990+dirty | 544/517/30/6/1 |
| SV2GP9NX4HQD | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 52aa3fcc+dirty | 1244/1108/46/9/1 |
| CSLHFCBSC1UM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | 3d05e954+dirty | 480/468/16/6/1 |
| RZ6YAC7K89NM | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 12 | cfa8112d+dirty | 216/208/12/0/1 |
| SDY5T9XCSQN2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | cfa8112d+dirty | 652/644/17/6/1 |
| VAC6Z1PZ1QJG | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | bb728531+dirty | 1212/1185/52/9/1 |
| NG1FBJTSRLHS | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 9 | 57a7f485+dirty | 128/121/9/0/1 |
| NTMAU4XZ2NN2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 14 | 57a7f485+dirty | 220/214/13/0/1 |
| E6DYYXRX7GVE | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | 5ff4270d+dirty | 752/706/41/5/1 |
| XZUJR08FW801 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 29 | 9a7dc931+dirty | 493/471/28/6/1 |
| JBX9JLH46KVN | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | d5f290f4+dirty | 1079/979/48/16/1 |
| RMNXHZKV716Y | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 6519b8909+dirty | 1059/981/51/11/1 |
| NBJBVSBNPYQB | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 10168ac71+dirty | 768/737/47/10/1 |
| AF76L5UTPP8U | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | d5ad91e80+dirty | 454/438/22/1/1 |
| 833ZM0MJGWHC | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | 57b661f07+dirty | 905/860/47/12/1 |
| 64R0P0MTZWAX | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 7375067d7+dirty | 955/873/31/9/1 |
| C6Z8ATNBNHZ7 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | c7e1e0ed3+dirty | 427/412/24/5/1 |
| XW8B5CHJ814J | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | c7e1e0ed3+dirty | 1276/1223/46/14/1 |
| R6WDLYS19ZTY | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 42 | c308b61e1+dirty | 843/827/41/7/1 |
| HNX4A2WBC34W | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 5957f0563+dirty | 912/850/50/7/1 |
| HXCY44VD9QWU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 17 | d6a39489f+dirty | 375/370/18/6/1 |
| N8A2W8LH39N0 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 15 | 29cd6a323+dirty | 255/248/14/0/1 |
| 54G5683J0E5S | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 44 | eaf3ac162+dirty | 670/639/49/3/1 |
| 9663Y88TYK73 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 46 | 6e8de8ea4+dirty | 743/718/44/6/1 |
| 0PH64C4AWAX9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 24 | a8bb1ebe5+dirty | 335/315/23/5/1 |
| Q389KW7SVWKH | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | a8bb1ebe5+dirty | 770/743/47/9/1 |
| 8HW407EAUYL7 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 77b15f03f+dirty | 1065/1044/46/9/1 |
| WN0HA1L6MJ99 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 21 | d422c5cec+dirty | 655/637/20/6/1 |
| 9GVYTHSXB4Z5 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | b934d888d+dirty | 794/771/36/9/1 |
| 08A0GEAL8KQ5 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | 4cc52f9ab+dirty | 657/638/43/7/1 |
| 9SRPBTZYN44H | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 31 | 334d51498+dirty | 467/450/32/8/1 |
| AYTX5H4H69E3 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 45 | 099656e5f+dirty | 709/686/40/4/1 |
| 0B2567HG3T4D | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | 157808e1e+dirty | 1071/977/50/14/1 |
| PYE4VXNSLGSS | 10 | unknown | 非胜；死亡/判死截断见inventory | 败 | 33 | current | 417/397/75/2/2 |
| Y8GDTNWG4R3X | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | current | 962/923/50/10/1 |
| X4M1GPAJGAB9 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | current | 448/431/23/3/1 |
| 5BU7ZE1PWLSX | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 33 | current | 810/791/32/8/1 |
| KDBWARERSGYW | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 48 | current | 1153/1115/48/9/1 |
| TFYU1MY8NEJ1 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | current | 773/748/49/9/1 |
| 49HL2N70CHMU | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 49 | current | 784/738/48/10/1 |
| F1TP5W6GF56Q | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | current | 529/517/23/7/1 |
| EMRME965K74Q | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 9 | current | 174/167/10/0/1 |
| 0DTPVHFXJ319 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 23 | current | 375/360/22/7/1 |
| JYTQSFJ96MG2 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 9 | current | 176/169/9/0/1 |
| DW8M3G2PV3N7 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 27 | current | 587/571/26/8/1 |
| 675CHRV9HVQ3 | 10 | codex | 非胜；死亡/判死截断见inventory | 败 | 22 | current | 409/393/21/3/1 |
