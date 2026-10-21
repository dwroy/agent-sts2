# 四局静默猎手离线复盘报告

Wed Oct 21 11:43:01 CST 2026

四局均为已结束Silent A10失败局，runs.jsonl第881—884行；既有正式标题为0，本批每局用独立一次cat追加一节到notes/lessons.md，未改旧内容，逐次前缀长度/SHA与追加正文指纹见append-receipts.json。没有提交、推送、源码/知识修改或测试/上线。本任务仅记录，无需运行源码测试。

## 产出与结论边界

|局号|结果|账本更新（均support，非repeat）|代码提案／实现任务|
|---|---|---|---|
|CEN1Z8HEU7NM|A10，静默猎手，第49层，死于连续第二Boss实验体 #C98 TEST_SUBJECT：四试24/85血空药进场，前三试T3／T13／T3判死；末试T13仅1血7挡，对36攻击及两张各2伤灼伤，敌第三阶段终态172/313血|silent-0228,silent-0028,silent-0125,silent-0027|silent-proposal-da1c4bf1dc97f44c → strategy-proposal（pending，待原调度器）|
|36VNKZKABGB4|A10，静默猎手，第48层，死于永世沙漏 AEONGLASS：四试72/75血带肌肉药水与能力药水进场，前三试T11／T10／T11判死；末试T11仅10血12挡对19×2＝38攻击，完整需损26、存活差17血，敌终态213/535血|silent-0024,silent-0025,silent-0125,silent-0023|silent-proposal-38d70cb44cf37f4a → strategy-proposal（pending，待原调度器）|
|GWE810ZD014M|A10，静默猎手，第39层，死于组装师 FABRICATOR／噪音机器人 NOISEBOT／守护机器人 GUARDBOT／戳刺机器人 STABBOT／电击机器人 ZAPBOT：39/76血带毒药水进场，T7仅3血5挡对12＋13＝25攻击，完整需损20、存活差18血，本体终态32/155血|silent-0348,silent-0023,silent-0119|silent-proposal-8452b92588322658 → strategy-proposal（pending，待原调度器）|
|TS0BHDLAH8ME|A10，静默猎手，第17层，死于墨影幻灵 VANTOM：四试62/70血空药进场，前三试T10判死；末试T10仅14血5挡对11×2＝22攻击，完整需损17、存活差4血，结毒后敌20/183血|silent-0224,silent-0020,silent-0418|silent-proposal-d7c38f35e4bd613d → strategy-proposal（pending，待原调度器）|

没有新增账本条目；更新的是已有同角色观察，原claim、first_run、prior、status、version均保持。silent-0119仍按其原proposed状态标“之前见过”，不因旧version字段冒称shipped。其余标签按账本读回的shipped/version标“之前学过”，本批并未认定重复策略错误。新机制参数为0，已有机制支持沿原id追加。CLI回执、每局find读回和整体check保存在本目录；ledger.py check退出码0。

三条经验逐局写在lessons对应标题下；资源表覆盖全部69个战斗/重载窗口：CEN22、36V20、GWE16、TS0 11。包含所有赢战、非战HP/maxHP变化、带槽位药水、SL重载与截断。净HP不是敌人总伤，当前活敌HP池不是跨阶段需伤；召唤/复活可能令池增加；瀑布巨兽999999999壳标记按未知处理，没有当伤害相加。所有首战帧均T1；SL前无退出帧的窗口明确只记已观察前缀，不能计真实死亡。

## 原始证据冻结与身份

按用户指定运行evidence_summary.py及extract_evidence.py（streams v6-build jev-prompts decisions run-config）；摘要仅事实入口。实际读取摘要、manifest、原始题面，并对本批原行按offset/bytes/SHA重新seek读取核对；共6419次原行核验，覆盖2652 decisions、2812 states、192 run-plans、154 brain、4 run-config、19 SL以及586 Jev原行。audit.py只从大states/decisions的512MiB尾窗逐行筛精确run_id，本批decision数量和全流extract一致；states首尾及每个资源链入口/出口/变化均核精确UTC时间和原帧，未把整局states灌入模型。

|流|冻结字节|冻结前缀SHA256|本批匹配数 CEN／36V／GWE／TS0|无效／截断及归属限制|
|---|---|---|---|---|
|v6-build|64678849|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|0／0／0／0|0无效JSON／0切点截断；identity_gaps={}|
|jev-prompts|2357679136|5d7f15a38fbcbb33f27d48db4ad476b9d647a6c576bd96bea95f7f7745fe02ce|154／269／99／64|1无效JSON／0切点截断；identity_gaps={}|
|decisions|3256056932|428f8f09fce0370ee1f35bf4f069931e3cd3e615543c553350703476e09eaefd|816／913／517／406|2无效JSON／0切点截断；identity_gaps={"unknown_identity": 1934, "unmatched_decision_id": 1467}|
|run-config|2385267|1b59a374abb8fcb4516b254a8d4fcac299e4e297fe3484c591c4142159b36a8e|1／1／1／1|0无效JSON／0切点截断；identity_gaps={}|

manifest中的历史无效JSON、unknown_identity/unmatched_decision_id与其ref保持；这些全流缺口不是本批已归属行。Jev本批每条均显式run_id/指纹一致，亦以精确decision_id连decisions核对。没有使用正文提及、时间接近、question_id相似字符串认局。v6-build本批全部no_match；不是V6整体off，也不是已证entries/jev_answer/fallback/unknown各为0，故不生成不存在的V6原行或跨角色补证。

实际run-config四局皆mode on、card/potion/shop/rest brain、reflex off、direction_replan off；delivered=false/interfaces_only原值保留。Jev request/answers/error另行解释。提证、格式齐全、模型排名和单步完成均不证明本批正式发布、下一局消费或自然收益。

补充原流冻结切点见audit-cuts.json；这些切点晚于主extract冻结，但本批各原行字节/SHA核同，不能把后续追加行纳入原科学输入。deepseek-reasoning.jsonl按四个首末decision时间窗逐行核无匹配，冻结与窗口见reasoning-window-check.json；实际brain engine均codex，兼容ds字段不表示DeepSeek。run-plans精确run字段行全部已保存并机械核原字节，主要v6_direction_ride字段不等于已启用方向重规划。

## Jev逐问题覆盖与后果

完整人工阅读全文8条；其余578条未完整语义审阅。每条未读行号及原因逐项在coverage.json；全586条都机械核原始行字节/身份/回答或错误，并连精确decisions的chosen/result/gate_reject/selection_dispatch与前后states索引，结果在question-receipts.json。未读原因是本次有界关键决策复盘，不声称全策略验收，不把最后五条当全部覆盖。

|局号|request／answers／error|完整阅读全文|未读完整题面|原答选rollout best/tied|低信心<0.35|
|---|---|---|---|---|---|
|CEN1Z8HEU7NM|154／153／1|j73790、j73829|152|118/122|31|
|36VNKZKABGB4|269／265／4|j73973、j74099|267|178/185|55|
|GWE810ZD014M|99／98／1|j74190、j74198|97|81/81|18|
|TS0BHDLAH8ME|64／64／0|j74248、j74256|62|49/54|7|

原答最优比例只以available且明确best/tied及plan答案为分母；focus只统计题内标签，不代实际击杀率。代码自主轮数按资源窗口/回合首个非continue战斗决定计，分别43／31／24／34；原始decider=code中包含续步，不使用runs派生jev-plan计数冒自主轮。抽牌、生成、弃牌、SL与护栏之后仍需重新核动作；selection_dispatch的state_effect_verified=false、whole_plan_executed=null、actual_turn=null原值保持，未见gate_reject字段只表示该流未记录，不证明整线全成功。

完整精读题的原始定位及实际后果：

### CEN1Z8HEU7NM j73790

CEN首试T1：原答plan4，rollout best为plan1，首步刺杀completed；下一T2仍24血、敌111→51。候选54伤和活敌池净扣60不是相同口径，不据6差额判新伤害bug。

jev-prompts.jsonl offset=2325375328 bytes=61483 SHA256=f7cf67e06e2ced0bcbe1edecfe3e4725f18553bdd6863b5a647b8cc80559b2ae；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "CEN1Z8HEU7NM", "fingerprint.run": "CEN1Z8HEU7NM"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 455703, "offset": 3205470884, "bytes": 41803, "sha256": "a88b52786806c20fec22e0d4c73a45433df4080e7306b5b7763217de610712bb"}}。

精确decision_id=3c81763c-17b5-4211-9109-4a76198774a2；decisions offset=3205470884 bytes=41803 SHA256=a88b52786806c20fec22e0d4c73a45433df4080e7306b5b7763217de610712bb。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### CEN1Z8HEU7NM j73829

CEN末试T12：完整弃牌题选card6伤口，chosen选6且completed；后继毒药/防御重规划，不把原抽牌前预测当已执行。

jev-prompts.jsonl offset=2328943155 bytes=8651 SHA256=2e05db0f45824a96bec4c9f8786361106adc090674b73198cef5e83c745a66b9；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "CEN1Z8HEU7NM", "fingerprint.run": "CEN1Z8HEU7NM"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 455866, "offset": 3207609748, "bytes": 4803, "sha256": "a232b9e1d1482833bb1acf835b8b8443769c408be350395f0072eb16c296e41b"}}。

精确decision_id=b381d085-6a59-4b5d-987a-49242c0d617b；decisions offset=3207609748 bytes=4803 SHA256=a232b9e1d1482833bb1acf835b8b8443769c408be350395f0072eb16c296e41b。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### 36VNKZKABGB4 j73973

36V首试T2：原答不喝药的小刀plan2；原不喝线的后续8/8样本仍用药，不能当全场无药。chosen小刀completed，当轮实损15、原线预测18，未隔离后续重规划，不作留药收益。

jev-prompts.jsonl offset=2337253070 bytes=42269 SHA256=925a6337df1981639273a87730bd3c8923e464ff837fc40fe73bc7b73afae7e8；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "36VNKZKABGB4", "fingerprint.run": "36VNKZKABGB4"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 456536, "offset": 3227277285, "bytes": 30519, "sha256": "38621a5312f303eff262304fd8e93a94ed72dafdce2032a79d7126a7ff79fbe8"}}。

精确decision_id=d143f8df-d2dc-4660-bf76-5f60d2d0f04e；decisions offset=3227277285 bytes=30519 SHA256=38621a5312f303eff262304fd8e93a94ed72dafdce2032a79d7126a7ff79fbe8。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### 36VNKZKABGB4 j74099

36V末试T11：card0为12伤凋萎，原答0.76，chosen选0 completed，后继无凋萎；最终由代码防御/尖啸、10血12挡对38攻击实死。

jev-prompts.jsonl offset=2347887400 bytes=7950 SHA256=d1ae3d2f62c307b60831a40031e0682b9b573860d7f62b8705ab7cd69016a50c；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "36VNKZKABGB4", "fingerprint.run": "36VNKZKABGB4"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 456787, "offset": 3234888565, "bytes": 4135, "sha256": "99179b0960e0a560e661a03ac326f76ffeb6a0be79d32b8ec7ea460c582e2156"}}。

精确decision_id=74960345-97a8-48cf-a764-b23c8f56905d；decisions offset=3234888565 bytes=4135 SHA256=99179b0960e0a560e661a03ac326f76ffeb6a0be79d32b8ec7ea460c582e2156。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### GWE810ZD014M j74190

GWE T5：原题明确FABRICATE_MOVE新增体未建模，原答结束而不喝未建模毒药，chosen结束completed；后继新增噪音/戳刺等，3/8模拟胜不算实际胜。

jev-prompts.jsonl offset=2353193133 bytes=24388 SHA256=b938df53aa4dacb8413b121088a25e0cbdf4969317fbc4189f4fe1d6815b71cc；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "GWE810ZD014M", "fingerprint.run": "GWE810ZD014M"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 457298, "offset": 3248311499, "bytes": 10045, "sha256": "10da7eaf314ff0f550c4c13ccb7b2d36a931195d48dc9a45c43a4a5c4fb18143"}}。

精确decision_id=63463a6d-9994-4bd1-90c1-f465934116cc；decisions offset=3248311499 bytes=10045 SHA256=10da7eaf314ff0f550c4c13ccb7b2d36a931195d48dc9a45c43a4a5c4fb18143。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### GWE810ZD014M j74198

GWE T7：完整单步题有预算耗尽error、无answers，精确decision_id回执为code-fallback打击噪音completed，下一决定才兜底喝药；不能补造第二条Jev错误或归Jev选药。

jev-prompts.jsonl offset=2353401999 bytes=7616 SHA256=62a431772837eaddab9d55f92cad72926f71a8e6828d58222f09c30b98011988；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "GWE810ZD014M", "fingerprint.run": "GWE810ZD014M"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 457308, "offset": 3248444103, "bytes": 5312, "sha256": "12ecbd1abcc26cbefd28230598a61b72c051c6609512719bd7769b242c22ef6b"}}。

精确decision_id=187d91d6-5ab0-44ba-8d25-a3a91a6efdda；decisions offset=3248444103 bytes=5312 SHA256=12ecbd1abcc26cbefd28230598a61b72c051c6609512719bd7769b242c22ef6b。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### TS0BHDLAH8ME j74248

TS0第二试T8：完整抽牌/取回题原答plan1，13/24短窗胜和校准86%分列；打击completed后进入涅奥之怒选择与重规划，当轮33净扣、14血不变，T10仍判死。

jev-prompts.jsonl offset=2356176902 bytes=54401 SHA256=4ec9e5e136c9ca817e4c24850369caa2cd824b4f1dd05e8dd824fa701e5e6873；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "TS0BHDLAH8ME", "fingerprint.run": "TS0BHDLAH8ME"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 457616, "offset": 3254110748, "bytes": 39998, "sha256": "e9f76756ebb373d71f0f3dd40a3244f5fe192a8741ec2d133dbc9ee0ff21ed7e"}}。

精确decision_id=24e6cb1d-b364-4aea-bef5-3f4985173d73；decisions offset=3254110748 bytes=39998 SHA256=e9f76756ebb373d71f0f3dd40a3244f5fe192a8741ec2d133dbc9ee0ff21ed7e。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

### TS0BHDLAH8ME j74256

TS0末试T1：完整生存者弃牌题，两防御均不可付费，原答card0，chosen选0 completed，后继保留一防御、当轮62血不变；不是额外挡或凭弃牌通关。

jev-prompts.jsonl offset=2356717648 bytes=7660 SHA256=536eeee21b8c5d3209c2e7640e49e41e0d67458cf1ad2aa2190c4364b6722983；源切点=2357679136；身份={"status": "explicit_run", "fields": {"run_id": "TS0BHDLAH8ME", "fingerprint.run": "TS0BHDLAH8ME"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3256056932, "line": 457676, "offset": 3254570765, "bytes": 4654, "sha256": "6c1281fd3aaa483d28228516c6b68c9d898713927e809dd594a2e0ee39ae476f"}}。

精确decision_id=0be0152b-d6d0-4ca8-8cc3-0bd781d36211；decisions offset=3254570765 bytes=4654 SHA256=6c1281fd3aaa483d28228516c6b68c9d898713927e809dd594a2e0ee39ae476f。chosen/result/gate_reject/selection_dispatch及后继原帧offset/bytes/SHA详question-receipts.json相应条，不用相似题号归局。

## 机制、资源与数值复核

CEN：F48女王/聚合体76→24、F49四次24血空药入口；末试T4新212血阶段清旧激怒/力量，玩家常驻能力保留；T13无实体使两攻击各只扣1，7挡仍不能保1血。末态敌172/313。36V：T10四凋萎各12、29攻、44挡→33净耗；T11已弃凋萎，2敏/余像形成12挡、尖啸把敌13力50攻改7力38攻，10血不够。GWE：T5旧体清完但活本体仍召唤，T7先杀电击，兜底打击/饮毒后腰带扣空槽加2敏却不追补既有5挡；3血对戳刺12＋本体13。TS0：滑溜首轮四击只扣4，敌T9有4力量；末T10 14血5挡对22，预计剩血−3与17完整需损一致，不能误读为仅掉3血。所有数字已在原始seek读取、追加前断言和追加后抽核中分开验，不把死亡截顶HP扣减当完整攻击损失。

药水非SL槽位新增观察：19／12／11／4瓶；use_potion动作19／17／11／4，36V包含SL重复用药；discard_potion仅36V 1次，buy_potion CEN2／GWE2。逐动作饮用/丢弃/补充、槽位、层/回合、相邻原帧与UTC见各resources.md和lessons；重载回来的药不计新瓶。36V休息补药不同于战后满槽弃药，本复盘不提出取消Roy当前满槽奖励边界。

末次即时回血投影与下一Boss入口分别76→76、72→72、78→78（GWE F32→F33）、62→62；完整路线多节点投影没有完成成对审阅，保留未记录。传统act_boss_clock输出/失血/存活/缺口字段null，不从其他局或单体HP补造需伤/估值比。

CEN已核18条直接出错nonpositive-hp构筑决定，另18条战斗决定的rationale携同类降级原因；不同计数不相加为独立故障/独立局。原decision-log历史材料所记20次保留，不改写成当前口径。本批精确原件known-nonpositive-errors.json为18条直接错误，覆盖F35/39/40/42/43/44/46。当前live rollout.ts:2377—2378已死亡优先，但历史code=current且ENOBUFS无精确SHA；不倒称旧局已修复或新增本批bug，不据错误认定整个败局根因。

## 当前源码参照与缺失

当前只读live提交5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532；live-source.diff仅存相关源码差异（未改源码）。HP护栏原理参照agent/src/reflex/combat-plan.ts:611、:622；HP审计语义参照silent-hp-guard-audit.ts:36（actual_outcome=null），单步派发语义参照silent-selection-dispatch.ts:30；TS0剩血文案参照combat-plan.ts:3432。均不是本批新增纯bug定位，也不是恢复了历史源码。

未记录项四局分别保留：完整多节点路线预测/实到配对、传统Boss时钟需/估及同窗口实打/估值、全部实线采用率和全局精确击杀序、逐击毛伤/过量伤害、未执行护栏/早喝/留药/换目标的真实胜负、Jev缓存、历史精确源码SHA、原生档位生效回执；未阅读全文的构筑边际效应不补经验。退出帧缺失、SL判死截断、无匹配V6原流与历史无效JSON均非0。

## 代码提案与后续

四份proposal-<run>.md/.json完整保存角色/进阶、证据局/层/回合、账本、旧行为与拟验证行为、反例/缺口、样本/时间留出、验证和回退；均由code_proposals.py add --character silent登记，CLI原生ID及回执保留，target_task=strategy-proposal。领域实际为combat/potion/sl/terminal，不涉及结构改造；没有implemented_commit，队列pending，不等同已派发、实现或shipped。缺受控反事实时保持现行规则；没有改运维prompt、notes/for-roy或ops/inbox-dev（本批无规则实际上线）。

账本校验退出码0。没有新纯bug、没有新增repeat；全部任务进度、失败尝试和过程产物保留，供调用方提交/后续调度。

```json
{"task": "postmortem", "appended": ["CEN1Z8HEU7NM", "36VNKZKABGB4", "GWE810ZD014M", "TS0BHDLAH8ME"], "skipped": [], "bugs": [], "ledger": {"added": [], "updated": ["silent-0228", "silent-0028", "silent-0125", "silent-0027", "silent-0024", "silent-0025", "silent-0023", "silent-0348", "silent-0119", "silent-0224", "silent-0020", "silent-0418"], "repeats": [], "check": 0}, "code_proposals": ["silent-proposal-da1c4bf1dc97f44c", "silent-proposal-38d70cb44cf37f4a", "silent-proposal-8452b92588322658", "silent-proposal-d7c38f35e4bd613d"], "implementation_domains": ["combat", "potion", "sl", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261021-111306-e35f946f-318e-40c4-b79a-93cc27f607e0-postmortem/report.md"}
```

## 追加后勘误与最终复核

GWE经验第2条将三能力共存写成同轮建立，已保留原文并在lessons末尾追加带局号勘误：触媒T5建1，余像T6建1、毒雾+T6建3；机制段原时点正确。原proposal冻结快照不改，其补充更正为correction-GWE810ZD014M.md，已通过ledger.py为silent-0023追加说明，未新增evidence或独立分母。后续实现须连本勘误及原帧读。

追加后再次seek原日志核终战四次入口/末态，原字节SHA相符；final-numeric-evidence.jsonl保留原ref。notes原前缀SHA保持，四个正式标题各1；四份已登记proposal的冻结SHA/本角色局/账本链接核同，均pending且无implemented_commit。每局find再次读回，ledger.py check最终退出码0，原生输出ledger-check-final.txt。
