# 四局静默猎手复盘证据报告

记录时间：2026-10-22T23:38:25+08:00。仅授权记录追加；未改代码、未提交或推送、未运行play。

四局均在runs.jsonl结束、character=SILENT、A10，初查lessons无对应标题。已读四份notes/run-*.md。原始事实以日志核验为准，自动局报不代资源链或SL尝试。

## 证据覆盖与缺失

runs.jsonl的code="current"；run-config.commit=null并报git ENOBUFS，精确运行源码提交未记录。本批只读live对照fdae435795f41d771da6df3457eb890e50d8ffeb及live-source.diff不冒充当局源码。construction-log.jsonl不存在，不能重建其省略量或最后快照；run-plans原行仅见v6_direction_ride标记／准备，不当作完整构筑问答。DeepSeek-reasoning按本局首末decision时间窗流式扫描无匹配（原流末端2026-10-06T23:38:26.270Z）；本局大脑决策及brain原行均为Codex，brain原请求model=gpt-6.1-sol、effort=high（不代原生turn_context生效验收）；原brain的act_boss_clock明确缺本角色校准，输出／损血／可活轮数／gap均null，原字节引用见brain-clock-index.json。旧ds_*／deepseek_calls字段不证明实际DeepSeek调用。V6配置on、interfaces_only、delivered=false，v6-build无匹配；entries／jev_answer／fallback／unknown无本批原行可判，保持缺失，不填0。Jev request、answers与error独立统计；单动作selection_dispatch的whole_plan_executed／actual_turn为null，不当整线执行证明。

manifest保留每条流完整冻结前缀SHA与扫描缺口；Jev全流有一条旧无效JSON，decisions有两条旧无效JSON，不把它们归本批。decisions全流还有unknown_identity=1934、unmatched_decision_id=1599，未获本批归属，不按题面或时间借认。原摘要与本批抽取的切点各自保存，后续索引切点可能更晚；同原行SHA核同才关联。全部已选题均explicit_run并有decisions精确decision_id原行关联，没有用正文、时间相邻或question_id字符串关联局号。

- 8FP19V1W4SRQ：原Jev行118，完整语义阅读1题（d521f718-37a6-449b-83f7-2441bbeff876），其余117题仅机械统计／定位，逐条ID、引用、未读原因见coverage.json。v6-build无匹配，不能补构筑题答案或采用情况。
- YXY2RL1E83HM：原Jev行136，完整语义阅读1题（1e0446c4-e17d-4206-ac34-411ba25cc2e3），其余135题仅机械统计／定位，逐条ID、引用、未读原因见coverage.json。v6-build无匹配，不能补构筑题答案或采用情况。
- MLSLQCNZ5291：原Jev行90，完整语义阅读1题（79f205ce-c8bc-4327-b021-2e1319fe9f08），其余89题仅机械统计／定位，逐条ID、引用、未读原因见coverage.json。v6-build无匹配，不能补构筑题答案或采用情况。
- 0VBCQS9V0N87：原Jev行128，完整语义阅读1题（cad659d1-dc26-4764-bb0a-b664002adbf9），其余127题仅机械统计／定位，逐条ID、引用、未读原因见coverage.json。v6-build无匹配，不能补构筑题答案或采用情况。

## 已完整读取问题及实际后果

### 8FP19V1W4SRQ

F29休息原理由预计Boss入场49血，F32再休息后F33实49/70；这只是包含后续回血动作的路径兑现，不是独立预测精度。F23取灵动步法、F25取扫腿 LEG_SWEEP、F27取尖啸 PIERCING_WAIL，F37取咕嘟冒泡+ BUBBLE_BUBBLE，F44取闪躲翻滚+ DODGE_AND_ROLL；F47认为回血仅增11、为两王升级迷雾，原文d479852／479876／479898／480021／480108／480122。末试T3完整题plan1为毒性爆发、预测损0／伤75，Jev信心0.43选择；d480213派发完成，s497596为463敌血与12毒，s497597为430敌血。三选项5轮24样本全死，整场模型每项50/100样本且无赢样本，却有低可信校准文字49%；这些是不同口径，不能称实盘49%可赢。前三试F49均T4判死、第四试T4实际死亡，SL恢复1→16单列，不能累计为回血。机制：敏捷3→5及触媒2已兑现；沙漏T4力量4令实际意图30。末态30−20＝10是攻击穿挡，持钨合金棍情况下实际完整失血并未单独发生可测（只剩1血），不得把静态10当实损或宣称精确救命血差。

Jev原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/jev-prompts.jsonl", "source_size": 2742800632, "line": 79295, "offset": 2711065236, "bytes": 81727, "sha256": "311fa6e690708e2fbfaae25fbff47ef20a7056fbf02d9f7f9a5e183b9db6762e", "run_id": "8FP19V1W4SRQ", "identity": {"status": "explicit_run", "fields": {"run_id": "8FP19V1W4SRQ", "fingerprint.run": "8FP19V1W4SRQ"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879193626, "line": 480213, "offset": 3824196453, "bytes": 47663, "sha256": "644477e78cca522a1bf80c3f6f00628c4cf4cd8cd347cb761c3cb75871f0a8dc"}}}`。

decision原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879488539, "line": 480213, "offset": 3824196453, "bytes": 47663, "sha256": "644477e78cca522a1bf80c3f6f00628c4cf4cd8cd347cb761c3cb75871f0a8dc"}`。

实际chosen/result/gate_reject/selection_dispatch：`{"chosen": {"action": "play_card", "card_index": 2}, "result": "completed: Action completed.", "gate_reject": null, "selection_dispatch": {"schema": 1, "scope": "single_action_receipt", "requested_action": {"action": "play_card", "card_index": 2, "target_index": null, "option_index": null}, "gated_action": {"action": "play_card", "card_index": 2}, "expected_identity": {"card": {"id": "OUTBREAK", "upgraded": false}, "turn": 3, "from": "decision"}, "dispatch_status": "returned", "not_dispatched_reason": null, "returned_status": "completed", "returned_stable": true, "error_kind": null, "state_effect_verified": false, "whole_plan_executed": null, "actual_turn": null}}`。

逐回合边界（原状态引用见analysis.json，净损HP不是敌方毛伤）：

|回合|玩家HP|敌总活体HP净下降|可见扣血下界|新增血池|原状态行|
|---|---|---|---|---|---|
|T1|16→16|3|3|0|s497580→s497589|
|T2|16→1|27|27|0|s497589→s497594|
|T3|1→1|75|75|0|s497594→s497597|
|T4|1→0|27|27|0|s497597→s497601|

同ID信徒重复时下界存在identity_ambiguous，不能用机械下界当完整伤害。该表净变化只对总血池，不断言击杀顺序；确切退场由状态原行另核。

### YXY2RL1E83HM

F47休息原理由为满血及小邮箱两瓶优于单次升级，d481041；F46扫腿+为支持连续两王，d481038。F25跳牌理由称已有毒、选项缺成长，d480669；此为大脑理由，不是牌值验证。末王未抵达。原题plan1无focus字段，只有沙漏单目标；T6首步selection_dispatch只证明撕碎被派发，d481084—481087及s498527—498532另核完整后继。T1两瓶实际饮用，三张升级小刀兑现，不能把最初原计划全部续步当作未重算。机制：怀旧 NOSTALGIA1于T1建立、刀扇 FAN_OF_KNIVES1于T2建立；同一单敌没有群攻收益对照。T4沙漏力量4，T7增至9且有虚弱1，显示26攻；玩家末态没有力量／敏捷，临时格挡必须逐牌兑现。T6总下降38含末4毒，不能全记成撕碎伤害；T7额外下降9与3毒及招架盾 PARRYING_SHIELD至少10挡触发6伤的门槛并存，独立逐击来源帧未记录。无SL重试。

Jev原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/jev-prompts.jsonl", "source_size": 2742800632, "line": 79430, "offset": 2721030288, "bytes": 56337, "sha256": "626ffce978c00052e1a06972431692d40cd3d29f76c8cb88043b9eefae5064ba", "run_id": "YXY2RL1E83HM", "identity": {"status": "explicit_run", "fields": {"run_id": "YXY2RL1E83HM", "fingerprint.run": "YXY2RL1E83HM"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879193626, "line": 481083, "offset": 3845864098, "bytes": 31783, "sha256": "0beeb9baa8a4cd5588fbfe16c0cb8d2f39fa5294d1f58851b260fdba9bfe77ab"}}}`。

decision原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879488539, "line": 481083, "offset": 3845864098, "bytes": 31783, "sha256": "0beeb9baa8a4cd5588fbfe16c0cb8d2f39fa5294d1f58851b260fdba9bfe77ab"}`。

实际chosen/result/gate_reject/selection_dispatch：`{"chosen": {"action": "play_card", "card_index": 0, "target_index": 0}, "result": "completed: Action completed.", "gate_reject": null, "selection_dispatch": {"schema": 1, "scope": "single_action_receipt", "requested_action": {"action": "play_card", "card_index": 0, "target_index": 0, "option_index": null}, "gated_action": {"action": "play_card", "card_index": 0, "target_index": 0}, "expected_identity": {"card": {"id": "REND", "upgraded": false}, "target": {"id": "AEONGLASS"}, "turn": 6, "from": "decision"}, "dispatch_status": "returned", "not_dispatched_reason": null, "returned_status": "completed", "returned_stable": true, "error_kind": null, "state_effect_verified": false, "whole_plan_executed": null, "actual_turn": null}}`。

逐回合边界（原状态引用见analysis.json，净损HP不是敌方毛伤）：

|回合|玩家HP|敌总活体HP净下降|可见扣血下界|新增血池|原状态行|
|---|---|---|---|---|---|
|T1|70→57|63|63|0|s498478→s498497|
|T2|57→35|0|0|0|s498497→s498502|
|T3|35→35|18|18|0|s498502→s498507|
|T4|35→11|39|39|0|s498507→s498518|
|T5|11→11|5|5|0|s498518→s498525|
|T6|11→4|38|38|0|s498525→s498532|
|T7|4→0|9|9|0|s498532→s498537|

同ID信徒重复时下界存在identity_ambiguous，不能用机械下界当完整伤害。该表净变化只对总血池，不断言击杀顺序；确切退场由状态原行另核。

### MLSLQCNZ5291

F13改线投影到F16为64/80，实际休息前63/80；原d481300明确旧线40/80，新旧未来并未实打配对。F16选择回血的原理由是22点缓冲及永久上限，d481321。F12、F13、F15构筑原文d481281／481299／481318。末试T1完整题rollout为5轮24样本、plan1与p0并列；不喝线后续24/24也会喝，不能称为整战无药对照。整场100/200样本、rankingEligible=false且因爪牙伤害归属100项缺失；约13轮是获胜样本模型时钟，末试实际7轮死亡不是“杀王只需7轮”。原题推演先信徒约T3／T5再神官约T13，而末试实到T6才退首个信徒，余信徒与神官至死未退场；两条模型杀序均非实际击杀。前三试在T10／T7／T7判死，第四试T7实死。机制：信徒力量0→3→6、神官0→3已见；末试T6脆弱使两张防御各仅3，共6挡，T7恢复后防御5与生存者8。玩家没有已建力量／敏捷／能力增益；壶铃 GIRYA stack0不能当已获得力量。

Jev原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/jev-prompts.jsonl", "source_size": 2742800632, "line": 79511, "offset": 2729119019, "bytes": 60049, "sha256": "6af8af703ababa8e094585d3a2179d8f3a619fd463a20025aac0be768b3390ab", "run_id": "MLSLQCNZ5291", "identity": {"status": "explicit_run", "fields": {"run_id": "MLSLQCNZ5291", "fingerprint.run": "MLSLQCNZ5291"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879193626, "line": 481436, "offset": 3854620551, "bytes": 54835, "sha256": "708051731d4ec23446a98ed1158d4bf6f399dc93e3ca89c74ba409a8533f65b9"}}}`。

decision原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879488539, "line": 481436, "offset": 3854620551, "bytes": 54835, "sha256": "708051731d4ec23446a98ed1158d4bf6f399dc93e3ca89c74ba409a8533f65b9"}`。

实际chosen/result/gate_reject/selection_dispatch：`{"chosen": {"action": "end_turn"}, "result": "completed: Action completed.", "gate_reject": null, "selection_dispatch": {"schema": 1, "scope": "single_action_receipt", "requested_action": {"action": "end_turn", "card_index": null, "target_index": null, "option_index": null}, "gated_action": {"action": "end_turn"}, "expected_identity": {"turn": 1, "from": "decision"}, "dispatch_status": "returned", "not_dispatched_reason": null, "returned_status": "completed", "returned_stable": true, "error_kind": null, "state_effect_verified": false, "whole_plan_executed": null, "actual_turn": null}}`。

逐回合边界（原状态引用见analysis.json，净损HP不是敌方毛伤）：

|回合|玩家HP|敌总活体HP净下降|可见扣血下界|新增血池|原状态行|
|---|---|---|---|---|---|
|T1|85→76|52|10|0|s498886→s498892|
|T2|76→55|0|0|0|s498892→s498896|
|T3|55→49|4|4|0|s498896→s498901|
|T4|49→48|22|0|0|s498901→s498906|
|T5|48→22|8|6|0|s498906→s498910|
|T6|22→16|61|31|0|s498910→s498915|
|T7|16→0|14|14|0|s498915→s498920|

同ID信徒重复时下界存在identity_ambiguous，不能用机械下界当完整伤害。该表净变化只对总血池，不断言击杀顺序；确切退场由状态原行另核。

### 0VBCQS9V0N87

F24升级理由称当前血药足以支持两战并改善防御时建立保留，d481824；F25取连续反弹 RICOCHET并改无精英路线，d481868／481869；F27取斗篷与匕首 CLOAK_AND_DAGGER，d481899。末试T2 Jev0.88选plan4（focus胧光怪），预测损5／伤24；SL改为亮剑 FLASH_OF_STEEL打寄生惧魔的plan2前缀，随后d481987预算耗尽兜底，实中和 NEUTRALIZE打主怪、余小刀 SHIV杀幻象。s499469—499472实8→6，主怪87血回到T3；不能拿原plan4的77敌血作为实际，也未完整执行显示的plan2：打击未打，不能将差异全称模型误差。末试T3致命毒药+ DEADLY_POISON给主怪7毒；T2和T3各新增21血幻象，敌总活体HP净降17／23与可见扣血38／44分列。前三试均T4判死、第四试T4实死。机制：手套力量提高攻击，小刀在3力量时每刀7伤；敌T4均3力量，对应20及14攻，成长与幻象复活共同超过本局防御。末态34−18＝16需损，6血维持同末态存活至少差11血；没有未执行分支的胜利证据。

Jev原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/jev-prompts.jsonl", "source_size": 2742800632, "line": 79646, "offset": 2738078778, "bytes": 67186, "sha256": "a297d7e80997bcf49b60eaaf3febb17dc33f78ada0ef04c9d2b32ee9204e0eb6", "run_id": "0VBCQS9V0N87", "identity": {"status": "explicit_run", "fields": {"run_id": "0VBCQS9V0N87", "fingerprint.run": "0VBCQS9V0N87"}, "decision_ref": {"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879193626, "line": 481986, "offset": 3865967089, "bytes": 33288, "sha256": "37270795cb51bd3c835527706e500ec3641251069445448f2c7376480e76c71a"}}}`。

decision原行引用：`{"source": "/home/dw/Projects/agent-sts2/logs/decisions.jsonl", "source_size": 3879488539, "line": 481986, "offset": 3865967089, "bytes": 33288, "sha256": "37270795cb51bd3c835527706e500ec3641251069445448f2c7376480e76c71a"}`。

实际chosen/result/gate_reject/selection_dispatch：`{"chosen": {"action": "play_card", "card_index": 0, "target_index": 0}, "result": "completed: Action completed.", "gate_reject": null, "selection_dispatch": {"schema": 1, "scope": "single_action_receipt", "requested_action": {"action": "play_card", "card_index": 0, "target_index": 0, "option_index": null}, "gated_action": {"action": "play_card", "card_index": 0, "target_index": 0}, "expected_identity": {"card": {"id": "FLASH_OF_STEEL", "upgraded": false}, "target": {"id": "PARAFRIGHT"}, "turn": 2, "from": "decision"}, "dispatch_status": "returned", "not_dispatched_reason": null, "returned_status": "completed", "returned_stable": true, "error_kind": null, "state_effect_verified": false, "whole_plan_executed": null, "actual_turn": null}}`。

逐回合边界（原状态引用见analysis.json，净损HP不是敌方毛伤）：

|回合|玩家HP|敌总活体HP净下降|可见扣血下界|新增血池|原状态行|
|---|---|---|---|---|---|
|T1|8→8|4|25|21|s499460→s499465|
|T2|8→6|17|38|21|s499465→s499472|
|T3|6→6|23|44|21|s499472→s499481|
|T4|6→0|6|6|0|s499481→s499486|

同ID信徒重复时下界存在identity_ambiguous，不能用机械下界当完整伤害。该表净变化只对总血池，不断言击杀顺序；确切退场由状态原行另核。

## 原始状态与资源链核验

每局正文下表列全部战斗，包含赢的战斗与每次SL；场间回血、上限与补药、SL恢复分列。所有开场帧为T1，无missing_exit窗口；SL截点不冒充实际退场。资源JSON内outcome是工具未判定占位，本报告按后继奖励／地图、存活体及sl-attempts逐段核实；不由工具占位自动判赢。

### 8FP19V1W4SRQ

资源链（表中敌ID为开场身份；净损HP不是敌总伤害；s为原states行，全部首帧均T1）：

|层／尝试窗|开场敌ID|进场HP／上限；药槽|离场或截点HP／上限；药槽|净损HP／边界|原状态行／时间|
|---|---|---|---|---|---|
|F2／窗1|NIBBIT|56/70；空|49/70；空|7；观测退出（奖励／地图与战斗终帧核对）|s496842@2026-10-22T12:17:04.171Z→s496862@2026-10-22T12:17:45.638Z|
|F3／窗2|FUZZY_WURM_CRAWLER|49/70；0:EXPLOSIVE_AMPOULE|49/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s496868@2026-10-22T12:18:02.463Z→s496889@2026-10-22T12:18:45.936Z|
|F4／窗3|WRIGGLER|70/70；0:DUPLICATOR|55/70；空|15；观测退出（奖励／地图与战斗终帧核对）|s496897@2026-10-22T12:19:19.374Z→s496927@2026-10-22T12:20:42.506Z|
|F5／窗4|SHRINKER_BEETLE|55/70；空|55/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s496933@2026-10-22T12:21:02.012Z→s496946@2026-10-22T12:21:31.250Z|
|F6／窗5|INKLET|55/70；空|46/70；空|9；观测退出（奖励／地图与战斗终帧核对）|s496951@2026-10-22T12:21:53.639Z→s496968@2026-10-22T12:22:31.149Z|
|F7／窗6|FLYCONID／TWIG_SLIME_M|46/70；空|31/70；空|15；观测退出（奖励／地图与战斗终帧核对）|s496973@2026-10-22T12:22:50.774Z→s497005@2026-10-22T12:24:01.349Z|
|F9／窗7|VINE_SHAMBLER|52/70；0:GAMBLERS_BREW|45/70；空|7；观测退出（奖励／地图与战斗终帧核对）|s497015@2026-10-22T12:24:45.875Z→s497041@2026-10-22T12:25:34.742Z|
|F11／窗8|BYGONE_EFFIGY|45/70；0:POTION_OF_BINDING|9/70；空|36；观测退出（奖励／地图与战斗终帧核对）|s497051@2026-10-22T12:25:52.936Z→s497078@2026-10-22T12:26:54.508Z|
|F17／窗9|VANTOM|70/70；空|27/70；空|43；观测退出（奖励／地图与战斗终帧核对）|s497102@2026-10-22T12:28:59.641Z→s497134@2026-10-22T12:30:36.225Z|
|F19／窗10|BOWLBUG_EGG／BOWLBUG_ROCK|61/70；空|60/70；空|1；观测退出（奖励／地图与战斗终帧核对）|s497142@2026-10-22T12:31:19.167Z→s497150@2026-10-22T12:31:33.242Z|
|F22／窗11|TUNNELER|60/70；0:POWDERED_DEMISE|49/70；0:POWDERED_DEMISE|11；观测退出（奖励／地图与战斗终帧核对）|s497165@2026-10-22T12:33:03.469Z→s497173@2026-10-22T12:33:21.756Z|
|F23／窗12|SPINY_TOAD|49/70；0:POWDERED_DEMISE|31/70；空|18；观测退出（奖励／地图与战斗终帧核对）|s497179@2026-10-22T12:33:43.499Z→s497192@2026-10-22T12:34:16.943Z|
|F25／窗13|DECIMILLIPEDE_SEGMENT_BACK／DECIMILLIPEDE_SEGMENT_FRONT／DECIMILLIPEDE_SEGMENT_MIDDLE|52/70；0:FIRE_POTION|25/70；空|27；观测退出（奖励／地图与战斗终帧核对）|s497201@2026-10-22T12:35:06.036Z→s497217@2026-10-22T12:35:54.191Z|
|F27／窗14|EXOSKELETON|25/70；空|25/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s497227@2026-10-22T12:36:12.983Z→s497241@2026-10-22T12:36:50.893Z|
|F28／窗15|HUNTER_KILLER|25/70；空|7/70；空|18；观测退出（奖励／地图与战斗终帧核对）|s497246@2026-10-22T12:37:10.007Z→s497262@2026-10-22T12:37:55.734Z|
|F33／窗16|CRUSHER／ROCKET|49/70；0:STRENGTH_POTION、1:POWDERED_DEMISE|17/70；空|32；观测退出（奖励／地图与战斗终帧核对）|s497288@2026-10-22T12:40:26.149Z→s497319@2026-10-22T12:42:53.022Z|
|F35／窗17|DEVOTED_SCULPTOR|59/70；0:SHIP_IN_A_BOTTLE|59/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s497328@2026-10-22T12:43:28.591Z→s497345@2026-10-22T12:44:09.490Z|
|F37／窗18|SCROLL_OF_BITING|59/70；空|59/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s497354@2026-10-22T12:44:51.383Z→s497369@2026-10-22T12:45:30.348Z|
|F38／窗19|AXEBOT|59/70；0:OROBIC_ACID|48/70；空|11；观测退出（奖励／地图与战斗终帧核对）|s497375@2026-10-22T12:46:01.288Z→s497407@2026-10-22T12:47:32.697Z|
|F44／窗20|SLIMED_BERSERKER|73/77；0:DEXTERITY_POTION|66/77；空|7；观测退出（奖励／地图与战斗终帧核对）|s497438@2026-10-22T12:50:51.662Z→s497460@2026-10-22T12:51:45.625Z|
|F48／窗21|QUEEN／TORCH_HEAD_AMALGAM|66/77；0:VULNERABLE_POTION、1:REGEN_POTION|16/77；空|50；观测退出（奖励／地图与战斗终帧核对）|s497482@2026-10-22T12:54:05.956Z→s497520@2026-10-22T12:56:28.965Z|
|F49／窗22|AEONGLASS|16/77；空|1/77；空|15；SL截断，非实死|s497522@2026-10-22T12:56:30.574Z→s497541@2026-10-22T12:57:11.215Z|
|F49／窗23|AEONGLASS|16/77；空|1/77；空|15；SL截断，非实死|s497542@2026-10-22T12:57:18.456Z→s497559@2026-10-22T12:57:49.296Z|
|F49／窗24|AEONGLASS|16/77；空|1/77；空|15；SL截断，非实死|s497560@2026-10-22T12:57:57.380Z→s497579@2026-10-22T12:58:34.254Z|
|F49／窗25|AEONGLASS|16/77；空|0/77；空|16；实际死亡|s497580@2026-10-22T12:58:40.935Z→s497601@2026-10-22T12:59:23.430Z|

场间补充／消耗与SL恢复（新增槽只称观测获得，缺具体取得动作不补猜；SL恢复不算获得或回血）：

- 场间观测：F2 49/70；空→F2 49/70；0:EXPLOSIVE_AMPOULE；s496863@2026-10-22T12:17:45.871Z→s496864@2026-10-22T12:17:46.127Z。
- 场间观测：F3 49/70；空→F3 49/70；0:DUPLICATOR；s496890@2026-10-22T12:18:46.170Z→s496891@2026-10-22T12:18:46.420Z。
- 场间观测：F4 49/70；0:DUPLICATOR→F4 70/70；0:DUPLICATOR；s496895@2026-10-22T12:19:17.098Z→s496896@2026-10-22T12:19:18.184Z。
- 场间观测：F7 31/70；空→F7 31/70；0:GAMBLERS_BREW；s497007@2026-10-22T12:24:02.613Z→s497008@2026-10-22T12:24:02.845Z。
- 场间观测：F8 31/70；0:GAMBLERS_BREW→F8 52/70；0:GAMBLERS_BREW；s497012@2026-10-22T12:24:44.103Z→s497013@2026-10-22T12:24:44.381Z。
- 场间观测：F9 45/70；空→F9 45/70；0:POTION_OF_BINDING；s497042@2026-10-22T12:25:34.974Z→s497043@2026-10-22T12:25:35.207Z。
- 场间观测：F12 9/70；空→F12 30/70；空；s497084@2026-10-22T12:27:29.336Z→s497085@2026-10-22T12:27:29.610Z。
- 场间观测：F14 30/70；空→F14 70/70；空；s497092@2026-10-22T12:28:10.804Z→s497093@2026-10-22T12:28:11.180Z。
- 场间观测：F17 27/70；空→F18 61/70；空；s497138@2026-10-22T12:30:57.431Z→s497139@2026-10-22T12:31:16.797Z。
- 场间观测：F20 60/70；空→F20 60/70；0:POWDERED_DEMISE；s497158@2026-10-22T12:32:44.841Z→s497159@2026-10-22T12:32:45.071Z。
- 场间观测：F23 31/70；空→F23 31/70；0:FIRE_POTION；s497193@2026-10-22T12:34:17.191Z→s497194@2026-10-22T12:34:17.415Z。
- 场间观测：F24 31/70；0:FIRE_POTION→F24 52/70；0:FIRE_POTION；s497198@2026-10-22T12:35:04.072Z→s497199@2026-10-22T12:35:04.327Z。
- 场间观测：F28 7/70；空→F28 7/70；0:STRENGTH_POTION；s497264@2026-10-22T12:37:56.989Z→s497265@2026-10-22T12:37:57.221Z。
- 场间观测：F29 7/70；0:STRENGTH_POTION→F29 28/70；0:STRENGTH_POTION；s497269@2026-10-22T12:38:44.611Z→s497270@2026-10-22T12:38:44.878Z。
- 场间观测：F31 28/70；0:STRENGTH_POTION→F31 28/70；0:STRENGTH_POTION、1:POWDERED_DEMISE；s497280@2026-10-22T12:40:01.650Z→s497281@2026-10-22T12:40:01.881Z。
- 场间观测：F32 28/70；0:STRENGTH_POTION、1:POWDERED_DEMISE→F32 49/70；0:STRENGTH_POTION、1:POWDERED_DEMISE；s497285@2026-10-22T12:40:24.183Z→s497286@2026-10-22T12:40:24.449Z。
- 场间观测：F33 17/70；空→F33 17/70；0:SHIP_IN_A_BOTTLE；s497320@2026-10-22T12:42:53.256Z→s497321@2026-10-22T12:42:53.502Z。
- 场间观测：F33 17/70；0:SHIP_IN_A_BOTTLE→F34 59/70；0:SHIP_IN_A_BOTTLE；s497324@2026-10-22T12:43:12.090Z→s497325@2026-10-22T12:43:26.299Z。
- 场间观测：F35 59/70；空→F35 59/70；0:BLOCK_POTION；s497346@2026-10-22T12:44:09.740Z→s497347@2026-10-22T12:44:09.936Z。
- 场间观测：F36 59/70；0:BLOCK_POTION→F36 59/70；空；s497351@2026-10-22T12:44:49.093Z→s497352@2026-10-22T12:44:49.499Z。
- 场间观测：F37 59/70；空→F37 59/70；0:OROBIC_ACID；s497370@2026-10-22T12:45:30.579Z→s497371@2026-10-22T12:45:30.815Z。
- 场间观测：F39 48/70；空→F39 46/70；空；s497413@2026-10-22T12:48:15.421Z→s497414@2026-10-22T12:48:28.081Z。
- 场间观测：F39 46/70；空→F39 43/70；空；s497414@2026-10-22T12:48:28.081Z→s497415@2026-10-22T12:48:47.586Z。
- 场间观测：F39 43/70；空→F39 39/70；空；s497415@2026-10-22T12:48:47.586Z→s497416@2026-10-22T12:49:01.236Z。
- 场间观测：F39 39/70；空→F39 34/70；空；s497416@2026-10-22T12:49:01.236Z→s497417@2026-10-22T12:49:16.784Z。
- 场间观测：F39 34/70；空→F39 28/70；空；s497417@2026-10-22T12:49:16.784Z→s497418@2026-10-22T12:49:33.131Z。
- 场间观测：F40 28/70；空→F40 28/70；0:DEXTERITY_POTION；s497423@2026-10-22T12:50:13.235Z→s497424@2026-10-22T12:50:13.471Z。
- 场间观测：F41 28/70；0:DEXTERITY_POTION→F41 35/77；0:DEXTERITY_POTION；s497428@2026-10-22T12:50:15.253Z→s497429@2026-10-22T12:50:15.554Z。
- 场间观测：F42 35/77；0:DEXTERITY_POTION→F42 73/77；0:DEXTERITY_POTION；s497431@2026-10-22T12:50:47.812Z→s497432@2026-10-22T12:50:48.065Z。
- 场间观测：F44 66/77；空→F44 66/77；0:VULNERABLE_POTION；s497461@2026-10-22T12:51:45.856Z→s497462@2026-10-22T12:51:46.093Z。
- 场间观测：F46 66/77；0:VULNERABLE_POTION→F46 66/77；0:VULNERABLE_POTION、1:REGEN_POTION；s497474@2026-10-22T12:53:29.483Z→s497475@2026-10-22T12:53:29.698Z。
- SL恢复：F49 1/77；空→F49 16/77；空；s497541@2026-10-22T12:57:11.215Z→s497542@2026-10-22T12:57:18.456Z。
- SL恢复：F49 1/77；空→F49 16/77；空；s497559@2026-10-22T12:57:49.296Z→s497560@2026-10-22T12:57:57.380Z。
- SL恢复：F49 1/77；空→F49 16/77；空；s497579@2026-10-22T12:58:34.254Z→s497580@2026-10-22T12:58:40.935Z。

药水动作及回执（chosen只表示所选动作；not dispatched未执行，pending仅排队，另核槽位消失；每次SL尝试分列）：

- d479543 F3T1／尝试未标（该场无重试记录）：饮用槽0 EXPLOSIVE_AMPOULE；completed: Action completed.。
- d479580 F4T3／尝试未标（该场无重试记录）：饮用槽0 DUPLICATOR；completed: Action completed.。
- d479681 F9T1／尝试未标（该场无重试记录）：饮用槽0 GAMBLERS_BREW；pending (unstable): Action queued but state is still transitioning.。
- d479717 F11T1／尝试未标（该场无重试记录）：饮用槽0 POTION_OF_BINDING；completed: Action completed.。
- d479841 F23T1／尝试未标（该场无重试记录）：饮用槽0 POWDERED_DEMISE；completed: Action completed.。
- d479864 F25T1／尝试未标（该场无重试记录）：饮用槽0 FIRE_POTION；completed: Action completed.。
- d479944 F33T1／尝试1：饮用槽0 STRENGTH_POTION；completed: Action completed.。
- d479947 F33T1／尝试1：饮用槽1 POWDERED_DEMISE；completed: Action completed.。
- d479991 F35T3／尝试未标（该场无重试记录）：饮用槽0 SHIP_IN_A_BOTTLE；completed: Action completed.。
- d480031 F38T2／尝试未标（该场无重试记录）：饮用槽0 OROBIC_ACID；completed: Action completed.。
- d480093 F44T2／尝试未标（该场无重试记录）：饮用槽0 DEXTERITY_POTION；completed: Action completed.。
- d480131 F48T1／尝试1：饮用槽0 VULNERABLE_POTION；completed: Action completed.。
- d480132 F48T1／尝试1：饮用槽1 REGEN_POTION；completed: Action completed.。

### YXY2RL1E83HM

资源链（表中敌ID为开场身份；净损HP不是敌总伤害；s为原states行，全部首帧均T1）：

|层／尝试窗|开场敌ID|进场HP／上限；药槽|离场或截点HP／上限；药槽|净损HP／边界|原状态行／时间|
|---|---|---|---|---|---|
|F2／窗1|SLUDGE_SPINNER|56/70；空|52/70；空|4；观测退出（奖励／地图与战斗终帧核对）|s497608@2026-10-22T13:02:29.164Z→s497638@2026-10-22T13:03:35.633Z|
|F3／窗2|CORPSE_SLUG|52/70；0:ENERGY_POTION|48/70；空|4；观测退出（奖励／地图与战斗终帧核对）|s497644@2026-10-22T13:03:52.847Z→s497665@2026-10-22T13:04:29.990Z|
|F5／窗3|SEAPUNK|48/70；空|48/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s497673@2026-10-22T13:05:05.402Z→s497689@2026-10-22T13:05:32.988Z|
|F8／窗4|GREMLIN_MERC|48/70；0:RADIANT_TINCTURE|43/70；空|5；观测退出（奖励／地图与战斗终帧核对）|s497704@2026-10-22T13:06:37.923Z→s497736@2026-10-22T13:07:42.630Z|
|F12／窗5|SKULKING_COLONY|64/70；0:BLOCK_POTION|60/70；空|4；观测退出（奖励／地图与战斗终帧核对）|s497754@2026-10-22T13:08:53.421Z→s497778@2026-10-22T13:09:44.106Z|
|F14／窗6|PHANTASMAL_GARDENER|60/70；空|48/70；空|12；观测退出（奖励／地图与战斗终帧核对）|s497788@2026-10-22T13:10:28.914Z→s497835@2026-10-22T13:11:59.086Z|
|F15／窗7|SEWER_CLAM|48/70；空|48/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s497841@2026-10-22T13:12:15.580Z→s497859@2026-10-22T13:12:48.901Z|
|F17／窗8|SOUL_FYSH|69/70；0:CLARITY|13/70；空|56；观测退出（奖励／地图与战斗终帧核对）|s497868@2026-10-22T13:13:24.591Z→s497915@2026-10-22T13:15:49.823Z|
|F19／窗9|EXOSKELETON|58/70；空|54/70；空|4；观测退出（奖励／地图与战斗终帧核对）|s497923@2026-10-22T13:16:29.975Z→s497945@2026-10-22T13:17:18.565Z|
|F20／窗10|BOWLBUG_NECTAR／BOWLBUG_ROCK|54/70；0:SKILL_POTION|53/70；空|1；观测退出（奖励／地图与战斗终帧核对）|s497952@2026-10-22T13:17:41.430Z→s497975@2026-10-22T13:18:31.425Z|
|F21／窗11|HUNTER_KILLER|53/70；空|32/70；空|21；观测退出（奖励／地图与战斗终帧核对）|s497980@2026-10-22T13:18:56.306Z→s498004@2026-10-22T13:19:48.168Z|
|F23／窗12|EXOSKELETON|32/70；0:VULNERABLE_POTION、1:BLOCK_POTION|32/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498018@2026-10-22T13:21:09.726Z→s498040@2026-10-22T13:21:59.147Z|
|F25／窗13|INFESTED_PRISM|53/70；0:EXPLOSIVE_AMPOULE|17/70；空|36；观测退出（奖励／地图与战斗终帧核对）|s498050@2026-10-22T13:22:45.918Z→s498080@2026-10-22T13:23:54.327Z|
|F30／窗14|OVICOPTER|59/70；0:ENERGY_POTION、1:FIRE_POTION|59/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498109@2026-10-22T13:26:37.367Z→s498128@2026-10-22T13:27:09.539Z|
|F31／窗15|CHOMPER|59/70；0:VULNERABLE_POTION|51/70；空|8；观测退出（奖励／地图与战斗终帧核对）|s498134@2026-10-22T13:27:30.287Z→s498161@2026-10-22T13:28:25.059Z|
|F33／窗16|KNOWLEDGE_DEMON|70/70；0:HEART_OF_IRON、1:RADIANT_TINCTURE|14/70；空|56；观测退出（奖励／地图与战斗终帧核对）|s498171@2026-10-22T13:29:11.154Z→s498238@2026-10-22T13:31:56.035Z|
|F35／窗17|DEVOTED_SCULPTOR|58/70；空|58/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498246@2026-10-22T13:32:39.541Z→s498267@2026-10-22T13:33:16.901Z|
|F36／窗18|LIVING_SHIELD／TURRET_OPERATOR|58/70；0:VULNERABLE_POTION|40/70；空|18；观测退出（奖励／地图与战斗终帧核对）|s498274@2026-10-22T13:33:44.711Z→s498301@2026-10-22T13:34:44.643Z|
|F38／窗19|BATTLE_FRIEND_V1|40/70；空|40/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498312@2026-10-22T13:35:37.045Z→s498323@2026-10-22T13:35:54.914Z|
|F39／窗20|GLOBE_HEAD|40/70；0:CUNNING_POTION|34/70；空|6；观测退出（奖励／地图与战斗终帧核对）|s498326@2026-10-22T13:35:56.860Z→s498352@2026-10-22T13:36:39.964Z|
|F45／窗21|AXEBOT|55/70；0:BLOCK_POTION、1:STRENGTH_POTION|53/70；空|2；观测退出（奖励／地图与战斗终帧核对）|s498384@2026-10-22T13:39:50.539Z→s498433@2026-10-22T13:41:33.506Z|
|F46／窗22|FABRICATOR|53/70；0:STRENGTH_POTION、1:POTION_SHAPED_ROCK|53/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498439@2026-10-22T13:41:50.582Z→s498468@2026-10-22T13:42:42.082Z|
|F48／窗23|AEONGLASS|70/70；0:EXPLOSIVE_AMPOULE、1:CUNNING_POTION|0/70；空|70；实际死亡|s498478@2026-10-22T13:43:26.385Z→s498537@2026-10-22T13:45:40.970Z|

场间补充／消耗与SL恢复（新增槽只称观测获得，缺具体取得动作不补猜；SL恢复不算获得或回血）：

- 场间观测：F2 52/70；空→F2 52/70；0:ENERGY_POTION；s497639@2026-10-22T13:03:35.865Z→s497640@2026-10-22T13:03:36.098Z。
- 场间观测：F5 48/70；空→F5 48/70；0:RADIANT_TINCTURE；s497691@2026-10-22T13:05:34.275Z→s497692@2026-10-22T13:05:34.475Z。
- 场间观测：F8 43/70；空→F8 43/70；0:BLOCK_POTION；s497738@2026-10-22T13:07:43.096Z→s497739@2026-10-22T13:07:43.310Z。
- 场间观测：F11 43/70；0:BLOCK_POTION→F11 64/70；0:BLOCK_POTION；s497751@2026-10-22T13:08:51.764Z→s497752@2026-10-22T13:08:52.009Z。
- 场间观测：F15 48/70；空→F15 48/70；0:CLARITY；s497860@2026-10-22T13:12:49.134Z→s497861@2026-10-22T13:12:49.367Z。
- 场间观测：F16 48/70；0:CLARITY→F16 69/70；0:CLARITY；s497865@2026-10-22T13:13:22.694Z→s497866@2026-10-22T13:13:23.006Z。
- 场间观测：F17 13/70；空→F18 58/70；空；s497919@2026-10-22T13:16:07.385Z→s497920@2026-10-22T13:16:27.521Z。
- 场间观测：F19 54/70；空→F19 54/70；0:SKILL_POTION；s497947@2026-10-22T13:17:20.126Z→s497948@2026-10-22T13:17:20.360Z。
- 场间观测：F21 32/70；空→F21 32/70；0:VULNERABLE_POTION；s498005@2026-10-22T13:19:48.401Z→s498006@2026-10-22T13:19:48.632Z。
- 场间观测：F22 32/70；0:VULNERABLE_POTION→F22 32/70；0:VULNERABLE_POTION、1:BLOCK_POTION；s498012@2026-10-22T13:21:06.468Z→s498013@2026-10-22T13:21:06.705Z。
- 场间观测：F23 32/70；空→F23 32/70；0:EXPLOSIVE_AMPOULE；s498042@2026-10-22T13:22:00.841Z→s498043@2026-10-22T13:22:01.074Z。
- 场间观测：F24 32/70；0:EXPLOSIVE_AMPOULE→F24 53/70；0:EXPLOSIVE_AMPOULE；s498047@2026-10-22T13:22:44.144Z→s498048@2026-10-22T13:22:44.396Z。
- 场间观测：F27 17/70；空→F27 38/70；空；s498090@2026-10-22T13:24:36.380Z→s498091@2026-10-22T13:24:46.637Z。
- 场间观测：F27 38/70；空→F27 38/70；0:ENERGY_POTION；s498091@2026-10-22T13:24:46.637Z→s498092@2026-10-22T13:24:46.875Z。
- 场间观测：F27 38/70；0:ENERGY_POTION→F27 38/70；0:ENERGY_POTION、1:FIRE_POTION；s498092@2026-10-22T13:24:46.875Z→s498093@2026-10-22T13:24:47.108Z。
- 场间观测：F29 38/70；0:ENERGY_POTION、1:FIRE_POTION→F29 59/70；0:ENERGY_POTION、1:FIRE_POTION；s498105@2026-10-22T13:26:25.311Z→s498106@2026-10-22T13:26:35.607Z。
- 场间观测：F30 59/70；空→F30 59/70；0:VULNERABLE_POTION；s498129@2026-10-22T13:27:09.737Z→s498130@2026-10-22T13:27:09.964Z。
- 场间观测：F32 51/70；空→F32 70/70；空；s498166@2026-10-22T13:28:58.906Z→s498167@2026-10-22T13:29:09.156Z。
- 场间观测：F32 70/70；空→F32 70/70；0:HEART_OF_IRON；s498167@2026-10-22T13:29:09.156Z→s498168@2026-10-22T13:29:09.405Z。
- 场间观测：F32 70/70；0:HEART_OF_IRON→F32 70/70；0:HEART_OF_IRON、1:RADIANT_TINCTURE；s498168@2026-10-22T13:29:09.405Z→s498169@2026-10-22T13:29:09.623Z。
- 场间观测：F33 14/70；空→F34 58/70；空；s498242@2026-10-22T13:32:18.327Z→s498243@2026-10-22T13:32:37.162Z。
- 场间观测：F35 58/70；空→F35 58/70；0:VULNERABLE_POTION；s498269@2026-10-22T13:33:18.468Z→s498270@2026-10-22T13:33:18.690Z。
- 场间观测：F38 40/70；空→F38 40/70；0:CUNNING_POTION；s498323@2026-10-22T13:35:54.914Z→s498324@2026-10-22T13:35:55.144Z。
- 场间观测：F39 34/70；空→F39 34/70；0:SNECKO_OIL；s498354@2026-10-22T13:36:41.798Z→s498355@2026-10-22T13:36:42.029Z。
- 场间观测：F42 34/70；0:SNECKO_OIL→F42 34/70；空；s498367@2026-10-22T13:38:15.000Z→s498368@2026-10-22T13:38:15.225Z。
- 场间观测：F42 34/70；空→F42 55/70；空；s498368@2026-10-22T13:38:15.225Z→s498369@2026-10-22T13:38:25.492Z。
- 场间观测：F42 55/70；空→F42 55/70；0:BLOCK_POTION；s498369@2026-10-22T13:38:25.492Z→s498370@2026-10-22T13:38:25.725Z。
- 场间观测：F42 55/70；0:BLOCK_POTION→F42 55/70；0:BLOCK_POTION、1:STRENGTH_POTION；s498370@2026-10-22T13:38:25.725Z→s498371@2026-10-22T13:38:25.962Z。
- 场间观测：F45 53/70；空→F45 53/70；0:STRENGTH_POTION；s498434@2026-10-22T13:41:33.737Z→s498435@2026-10-22T13:41:33.972Z。
- 场间观测：F45 53/70；0:STRENGTH_POTION→F46 53/70；0:STRENGTH_POTION、1:POTION_SHAPED_ROCK；s498438@2026-10-22T13:41:49.278Z→s498439@2026-10-22T13:41:50.582Z。
- 场间观测：F47 53/70；空→F47 70/70；空；s498473@2026-10-22T13:43:13.788Z→s498474@2026-10-22T13:43:24.079Z。
- 场间观测：F47 70/70；空→F47 70/70；0:EXPLOSIVE_AMPOULE；s498474@2026-10-22T13:43:24.079Z→s498475@2026-10-22T13:43:24.310Z。
- 场间观测：F47 70/70；0:EXPLOSIVE_AMPOULE→F47 70/70；0:EXPLOSIVE_AMPOULE、1:CUNNING_POTION；s498475@2026-10-22T13:43:24.310Z→s498476@2026-10-22T13:43:24.545Z。

药水动作及回执（chosen只表示所选动作；not dispatched未执行，pending仅排队，另核槽位消失；每次SL尝试分列）：

- d480264 F3T1／尝试未标（该场无重试记录）：饮用槽0 ENERGY_POTION；completed: Action completed.。
- d480318 F8T1／尝试未标（该场无重试记录）：饮用槽0 RADIANT_TINCTURE；completed: Action completed.。
- d480375 F12T2／尝试未标（该场无重试记录）：饮用槽0 BLOCK_POTION；completed: Action completed.。
- d480463 F17T1／尝试1：饮用槽0 CLARITY；completed: Action completed.。
- d480555 F20T2／尝试未标（该场无重试记录）：饮用槽0 SKILL_POTION；pending (unstable): Action queued but state is still transitioning.。
- d480609 F23T1／尝试1：饮用槽0 VULNERABLE_POTION；completed: Action completed.。
- d480611 F23T1／尝试1：饮用槽1 BLOCK_POTION；completed: Action completed.。
- d480640 F25T1／尝试未标（该场无重试记录）：饮用槽0 EXPLOSIVE_AMPOULE；completed: Action completed.。
- d480703 F30T1／尝试未标（该场无重试记录）：饮用槽1 FIRE_POTION；completed: Action completed.。
- d480708 F30T2／尝试未标（该场无重试记录）：饮用槽0 ENERGY_POTION；completed: Action completed.。
- d480721 F31T1／尝试未标（该场无重试记录）：饮用槽0 VULNERABLE_POTION；completed: Action completed.。
- d480763 F33T1／尝试1：饮用槽0 HEART_OF_IRON；completed: Action completed.。
- d480764 F33T1／尝试1：饮用槽1 RADIANT_TINCTURE；completed: Action completed.。
- d480870 F36T3／尝试未标（该场无重试记录）：饮用槽0 VULNERABLE_POTION；completed: Action completed.。
- d480909 F39T1／尝试未标（该场无重试记录）：饮用槽0 CUNNING_POTION；completed: Action completed.。
- d480939 F42TNone／尝试未标（该场无重试记录）：丢弃槽0 SNECKO_OIL；completed: Action completed.。
- d480970 F45T2／尝试未标（该场无重试记录）：饮用槽0 BLOCK_POTION；completed: Action completed.。
- d480982 F45T4／尝试未标（该场无重试记录）：饮用槽1 STRENGTH_POTION；completed: Action completed.。
- d481010 F46T1／尝试未标（该场无重试记录）：饮用槽0 STRENGTH_POTION；not dispatched: state changed while deciding。
- d481014 F46T1／尝试未标（该场无重试记录）：饮用槽0 STRENGTH_POTION；completed: Action completed.。
- d481020 F46T1／尝试未标（该场无重试记录）：饮用槽1 POTION_SHAPED_ROCK；completed: Action completed.。
- d481055 F48T1／尝试1：饮用槽0 EXPLOSIVE_AMPOULE；completed: Action completed.。
- d481056 F48T1／尝试1：饮用槽1 CUNNING_POTION；completed: Action completed.。

### MLSLQCNZ5291

资源链（表中敌ID为开场身份；净损HP不是敌总伤害；s为原states行，全部首帧均T1）：

|层／尝试窗|开场敌ID|进场HP／上限；药槽|离场或截点HP／上限；药槽|净损HP／边界|原状态行／时间|
|---|---|---|---|---|---|
|F2／窗1|LEAF_SLIME_M／LEAF_SLIME_S／TWIG_SLIME_S|56/70；空|52/70；空|4；观测退出（奖励／地图与战斗终帧核对）|s498544@2026-10-22T13:47:25.095Z→s498579@2026-10-22T13:49:19.262Z|
|F3／窗2|FUZZY_WURM_CRAWLER|52/70；0:DEXTERITY_POTION|52/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498585@2026-10-22T13:49:48.501Z→s498604@2026-10-22T13:50:26.542Z|
|F5／窗3|NIBBIT|52/70；空|52/70；空|0；观测退出（奖励／地图与战斗终帧核对）|s498615@2026-10-22T13:51:24.863Z→s498632@2026-10-22T13:51:57.950Z|
|F6／窗4|VINE_SHAMBLER|52/70；空|43/70；空|9；观测退出（奖励／地图与战斗终帧核对）|s498637@2026-10-22T13:52:31.066Z→s498664@2026-10-22T13:53:31.997Z|
|F8／窗5|PHROG_PARASITE|69/75；0:STRENGTH_POTION|59/75；空|10；观测退出（奖励／地图与战斗终帧核对）|s498673@2026-10-22T13:54:31.974Z→s498700@2026-10-22T13:55:43.522Z|
|F12／窗6|INKLET|80/80；空|68/80；空|12；观测退出（奖励／地图与战斗终帧核对）|s498717@2026-10-22T13:57:20.052Z→s498730@2026-10-22T13:57:50.884Z|
|F13／窗7|FOGMOG|68/80；0:POWER_POTION|64/80；空|4；观测退出（奖励／地图与战斗终帧核对）|s498736@2026-10-22T13:58:22.156Z→s498751@2026-10-22T13:58:55.029Z|
|F15／窗8|ASSASSIN_RUBY_RAIDER／BRUTE_RUBY_RAIDER／CROSSBOW_RUBY_RAIDER|64/80；空|63/80；空|1；观测退出（奖励／地图与战斗终帧核对）|s498760@2026-10-22T13:59:54.965Z→s498769@2026-10-22T14:00:11.809Z|
|F17／窗9|KIN_FOLLOWER／KIN_PRIEST|85/85；0:SKILL_POTION|12/85；空|73；SL截断，非实死|s498778@2026-10-22T14:01:07.245Z→s498825@2026-10-22T14:05:56.993Z|
|F17／窗10|KIN_FOLLOWER／KIN_PRIEST|85/85；0:SKILL_POTION|5/85；空|80；SL截断，非实死|s498826@2026-10-22T14:06:46.353Z→s498855@2026-10-22T14:10:18.567Z|
|F17／窗11|KIN_FOLLOWER／KIN_PRIEST|85/85；0:SKILL_POTION|16/85；空|69；SL截断，非实死|s498856@2026-10-22T14:11:06.537Z→s498885@2026-10-22T14:14:51.250Z|
|F17／窗12|KIN_FOLLOWER／KIN_PRIEST|85/85；0:SKILL_POTION|0/85；空|85；实际死亡|s498886@2026-10-22T14:15:40.208Z→s498920@2026-10-22T14:19:29.017Z|

场间补充／消耗与SL恢复（新增槽只称观测获得，缺具体取得动作不补猜；SL恢复不算获得或回血）：

- 场间观测：F2 52/70；空→F2 52/70；0:DEXTERITY_POTION；s498580@2026-10-22T13:49:19.493Z→s498581@2026-10-22T13:49:19.726Z。
- 场间观测：F6 43/70；空→F6 43/70；0:STRENGTH_POTION；s498665@2026-10-22T13:53:32.230Z→s498666@2026-10-22T13:53:32.464Z。
- 场间观测：F7 43/70；0:STRENGTH_POTION→F7 69/75；0:STRENGTH_POTION；s498670@2026-10-22T13:54:30.259Z→s498671@2026-10-22T13:54:30.514Z。
- 场间观测：F11 59/75；空→F11 80/80；空；s498714@2026-10-22T13:57:18.322Z→s498715@2026-10-22T13:57:18.586Z。
- 场间观测：F12 68/80；空→F12 68/80；0:POWER_POTION；s498731@2026-10-22T13:57:51.094Z→s498732@2026-10-22T13:57:51.327Z。
- 场间观测：F15 63/80；空→F15 63/80；0:SKILL_POTION；s498770@2026-10-22T14:00:12.039Z→s498771@2026-10-22T14:00:12.272Z。
- 场间观测：F16 63/80；0:SKILL_POTION→F16 85/85；0:SKILL_POTION；s498775@2026-10-22T14:01:05.539Z→s498776@2026-10-22T14:01:05.803Z。
- SL恢复：F17 12/85；空→F17 85/85；0:SKILL_POTION；s498825@2026-10-22T14:05:56.993Z→s498826@2026-10-22T14:06:46.353Z。
- SL恢复：F17 5/85；空→F17 85/85；0:SKILL_POTION；s498855@2026-10-22T14:10:18.567Z→s498856@2026-10-22T14:11:06.537Z。
- SL恢复：F17 16/85；空→F17 85/85；0:SKILL_POTION；s498885@2026-10-22T14:14:51.250Z→s498886@2026-10-22T14:15:40.208Z。

药水动作及回执（chosen只表示所选动作；not dispatched未执行，pending仅排队，另核槽位消失；每次SL尝试分列）：

- d481142 F3T1／尝试未标（该场无重试记录）：饮用槽0 DEXTERITY_POTION；completed: Action completed.。
- d481232 F8T2／尝试未标（该场无重试记录）：饮用槽0 STRENGTH_POTION；completed: Action completed.。
- d481287 F13T1／尝试未标（该场无重试记录）：饮用槽0 POWER_POTION；pending (unstable): Action queued but state is still transitioning.。
- d481330 F17T2／尝试1：饮用槽0 SKILL_POTION；pending (unstable): Action queued but state is still transitioning.。
- d481377 F17T2／尝试2：饮用槽0 SKILL_POTION；pending (unstable): Action queued but state is still transitioning.。
- d481407 F17T2／尝试3：饮用槽0 SKILL_POTION；pending (unstable): Action queued but state is still transitioning.。
- d481437 F17T2／尝试4：饮用槽0 SKILL_POTION；pending (unstable): Action queued but state is still transitioning.。

### 0VBCQS9V0N87

资源链（表中敌ID为开场身份；净损HP不是敌总伤害；s为原states行，全部首帧均T1）：

|层／尝试窗|开场敌ID|进场HP／上限；药槽|离场或截点HP／上限；药槽|净损HP／边界|原状态行／时间|
|---|---|---|---|---|---|
|F2／窗1|SLUDGE_SPINNER|67/81；空|59/81；空|8；观测退出（奖励／地图与战斗终帧核对）|s498927@2026-10-22T14:21:06.689Z→s498948@2026-10-22T14:21:56.123Z|
|F3／窗2|SEAPUNK|59/81；空|54/81；空|5；观测退出（奖励／地图与战斗终帧核对）|s498953@2026-10-22T14:22:16.141Z→s498972@2026-10-22T14:23:00.982Z|
|F5／窗3|TOADPOLE|54/81；0:GLOWWATER_POTION|53/81；空|1；观测退出（奖励／地图与战斗终帧核对）|s498981@2026-10-22T14:23:42.870Z→s499006@2026-10-22T14:24:50.677Z|
|F6／窗4|TWO_TAILED_RAT|53/81；0:COLORLESS_POTION|51/81；空|2；观测退出（奖励／地图与战斗终帧核对）|s499012@2026-10-22T14:25:11.974Z→s499031@2026-10-22T14:25:51.879Z|
|F9／窗5|LIVING_FOG|57/87；0:CUNNING_POTION|52/87；空|5；观测退出（奖励／地图与战斗终帧核对）|s499044@2026-10-22T14:26:53.105Z→s499080@2026-10-22T14:28:02.591Z|
|F12／窗6|PHANTASMAL_GARDENER|78/87；空|64/87；空|14；观测退出（奖励／地图与战斗终帧核对）|s499092@2026-10-22T14:29:14.906Z→s499122@2026-10-22T14:30:21.812Z|
|F14／窗7|TERROR_EEL|87/87；空|59/87；空|28；观测退出（奖励／地图与战斗终帧核对）|s499131@2026-10-22T14:31:03.740Z→s499157@2026-10-22T14:32:12.146Z|
|F17／窗8|WATERFALL_GIANT|87/87；0:POISON_POTION|33/87；0:POISON_POTION|54；观测退出（奖励／地图与战斗终帧核对）|s499174@2026-10-22T14:33:11.261Z→s499222@2026-10-22T14:35:51.675Z|
|F19／窗9|EXOSKELETON|76/87；0:POISON_POTION、1:POWDERED_DEMISE|69/87；0:POISON_POTION|7；观测退出（奖励／地图与战斗终帧核对）|s499231@2026-10-22T14:36:38.067Z→s499246@2026-10-22T14:37:16.613Z|
|F22／窗10|TUNNELER|69/87；0:POISON_POTION、1:CLARITY|55/87；0:POISON_POTION|14；观测退出（奖励／地图与战斗终帧核对）|s499260@2026-10-22T14:38:37.594Z→s499289@2026-10-22T14:39:46.901Z|
|F25／窗11|LOUSE_PROGENITOR|55/87；0:POISON_POTION、1:POTION_OF_BINDING|27/87；0:POISON_POTION|28；观测退出（奖励／地图与战斗终帧核对）|s499304@2026-10-22T14:41:52.711Z→s499343@2026-10-22T14:43:29.659Z|
|F27／窗12|BOWLBUG_EGG／BOWLBUG_NECTAR／BOWLBUG_ROCK|27/87；0:POISON_POTION|8/87；空|19；观测退出（奖励／地图与战斗终帧核对）|s499352@2026-10-22T14:44:01.142Z→s499374@2026-10-22T14:44:53.188Z|
|F28／窗13|THE_OBSCURA|8/87；空|3/87；空|5；SL截断，非实死|s499379@2026-10-22T14:45:20.825Z→s499406@2026-10-22T14:46:13.405Z|
|F28／窗14|THE_OBSCURA|8/87；空|6/87；空|2；SL截断，非实死|s499407@2026-10-22T14:46:19.784Z→s499433@2026-10-22T14:47:16.450Z|
|F28／窗15|THE_OBSCURA|8/87；空|3/87；空|5；SL截断，非实死|s499434@2026-10-22T14:47:23.508Z→s499459@2026-10-22T14:48:21.509Z|
|F28／窗16|THE_OBSCURA|8/87；空|0/87；空|8；实际死亡|s499460@2026-10-22T14:48:27.925Z→s499486@2026-10-22T14:49:29.505Z|

场间补充／消耗与SL恢复（新增槽只称观测获得，缺具体取得动作不补猜；SL恢复不算获得或回血）：

- 场间观测：F1 56/70；空→F1 67/81；空；s498924@2026-10-22T14:20:37.519Z→s498925@2026-10-22T14:20:37.956Z。
- 场间观测：F4 54/81；空→F4 54/81；0:GLOWWATER_POTION；s498978@2026-10-22T14:23:41.066Z→s498979@2026-10-22T14:23:41.298Z。
- 场间观测：F5 53/81；空→F5 53/81；0:COLORLESS_POTION；s499007@2026-10-22T14:24:50.910Z→s499008@2026-10-22T14:24:51.154Z。
- 场间观测：F6 51/81；空→F6 51/81；0:CUNNING_POTION；s499032@2026-10-22T14:25:52.114Z→s499033@2026-10-22T14:25:52.347Z。
- 场间观测：F7 51/81；0:CUNNING_POTION→F7 57/87；0:CUNNING_POTION；s499037@2026-10-22T14:26:26.803Z→s499038@2026-10-22T14:26:27.208Z。
- 场间观测：F11 52/87；空→F11 78/87；空；s499089@2026-10-22T14:29:13.247Z→s499090@2026-10-22T14:29:13.499Z。
- 场间观测：F13 64/87；空→F13 87/87；空；s499128@2026-10-22T14:31:02.054Z→s499129@2026-10-22T14:31:02.306Z。
- 场间观测：F15 59/87；空→F15 59/87；0:POISON_POTION；s499167@2026-10-22T14:32:54.576Z→s499168@2026-10-22T14:32:54.844Z。
- 场间观测：F16 59/87；0:POISON_POTION→F16 87/87；0:POISON_POTION；s499171@2026-10-22T14:33:09.029Z→s499172@2026-10-22T14:33:09.290Z。
- 场间观测：F17 33/87；0:POISON_POTION→F17 33/87；0:POISON_POTION、1:POWDERED_DEMISE；s499223@2026-10-22T14:35:51.905Z→s499224@2026-10-22T14:35:52.106Z。
- 场间观测：F17 33/87；0:POISON_POTION、1:POWDERED_DEMISE→F18 76/87；0:POISON_POTION、1:POWDERED_DEMISE；s499227@2026-10-22T14:36:10.589Z→s499228@2026-10-22T14:36:35.877Z。
- 场间观测：F19 69/87；0:POISON_POTION→F19 69/87；0:POISON_POTION、1:CLARITY；s499247@2026-10-22T14:37:16.845Z→s499248@2026-10-22T14:37:17.078Z。
- 场间观测：F22 55/87；0:POISON_POTION→F22 55/87；0:POISON_POTION、1:POTION_OF_BINDING；s499290@2026-10-22T14:39:47.134Z→s499291@2026-10-22T14:39:47.367Z。
- SL恢复：F28 3/87；空→F28 8/87；空；s499406@2026-10-22T14:46:13.405Z→s499407@2026-10-22T14:46:19.784Z。
- SL恢复：F28 6/87；空→F28 8/87；空；s499433@2026-10-22T14:47:16.450Z→s499434@2026-10-22T14:47:23.508Z。
- SL恢复：F28 3/87；空→F28 8/87；空；s499459@2026-10-22T14:48:21.509Z→s499460@2026-10-22T14:48:27.925Z。

药水动作及回执（chosen只表示所选动作；not dispatched未执行，pending仅排队，另核槽位消失；每次SL尝试分列）：

- d481534 F5T3／尝试未标（该场无重试记录）：饮用槽0 GLOWWATER_POTION；completed: Action completed.。
- d481553 F6T1／尝试未标（该场无重试记录）：饮用槽0 COLORLESS_POTION；pending (unstable): Action queued but state is still transitioning.。
- d481590 F9T1／尝试未标（该场无重试记录）：饮用槽0 CUNNING_POTION；completed: Action completed.。
- d481762 F19T1／尝试未标（该场无重试记录）：饮用槽1 POWDERED_DEMISE；completed: Action completed.。
- d481796 F22T2／尝试未标（该场无重试记录）：饮用槽1 CLARITY；completed: Action completed.。
- d481830 F25T1／尝试未标（该场无重试记录）：饮用槽1 POTION_OF_BINDING；completed: Action completed.。
- d481891 F27T2／尝试1：饮用槽0 POISON_POTION；completed: Action completed.。

## 学习登记与代码提案边界

三条经验逐条关联既有Silent账本，全部以support追加，原prior/first_run不改。每局为既有观察支持；没有受控证据确认可避免错误重犯，不硬标repeat。未发现已隔离到源码原因的新增纯bug。模型33对实际38、least-loss文字与完整来袭差异保留给独立策略任务，不能据本批直接改伤害或药价。

提案按每局保存Markdown/JSON并经code_proposals.py登记；target_task=strategy-proposal。只提可复核的同状态比较、按SL实际前缀核收益和连战资源联动，证据不足保持当前行为；未登记implemented或shipped。无源码改变，无需代码测试。

勘核：关键死亡末态与每轮HP、敌HP及所有资源边界均由状态字节引用复核；原始offset/bytes/SHA验证结果见verification.json。

## 并行账本状态冲突及勘误


### 勘误（2026-10-22T23:40:49+08:00，learner；对应 8FP19V1W4SRQ）

silent-0005当前fold为proposed（账本行36706，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0005」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19515），不将本次waiting处置冒充撤回历史上线或再次发布。
silent-0027当前fold为proposed（账本行36717，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0027」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19522），不将本次waiting处置冒充撤回历史上线或再次发布。


### 勘误（2026-10-22T23:40:49+08:00，learner；对应 YXY2RL1E83HM）

silent-0020当前fold为proposed（账本行36714，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0020」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19519），不将本次waiting处置冒充撤回历史上线或再次发布。
silent-0079当前fold为proposed（账本行36725，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0079」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19525），不将本次waiting处置冒充撤回历史上线或再次发布。


### 勘误（2026-10-22T23:40:49+08:00，learner；对应 MLSLQCNZ5291）

silent-0020当前fold为proposed（账本行36714，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0020」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19519），不将本次waiting处置冒充撤回历史上线或再次发布。


### 勘误（2026-10-22T23:40:49+08:00，learner；对应 0VBCQS9V0N87）

silent-0019当前fold为proposed（账本行36713，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0019」；原「之前学过」引用的历史S1.exp203上线记录仍保留（账本行19518），不将本次waiting处置冒充撤回历史上线或再次发布。
silent-0039当前fold为proposed（账本行36719，2026-10-22T23:34:06+08:00，learner:strategy-proposal），按本任务当前状态标记应读作「之前见过：silent-0039」；原「之前学过」引用的历史S1.exp201上线记录仍保留（账本行19217），不将本次waiting处置冒充撤回历史上线或再次发布。

原先查询快照ledger-search.json／ledger-mittens.json、状态历史ledger-status-provenance.json均保留；未修改旧复盘、未改账本状态或代登记新上线。

## 完成读回

记录时间：2026-10-22T23:43:29+08:00。四局均已通过一次cat追加，追加前原文前缀SHA未变，各草稿正文原样出现且标题各一次；所有关键末态重新按原日志offset/bytes/SHA核同，无数字勘误。状态勘误已追加，见上。

账本：每局三条support，共12条证据追加、11个既有条目；新增0、repeat0。ledger.py check退出0，570项、0问题；本批不更改状态、first_run或prior。

- 8FP19V1W4SRQ：silent-proposal-3125eadafd1d0046，读回状态pending，实现任务strategy-proposal；账本silent-0228,silent-0005,silent-0027。原Markdown SHA已核同。
- YXY2RL1E83HM：silent-proposal-91edd6ff89d1bc1d，读回状态pending，实现任务strategy-proposal；账本silent-0020,silent-0079,silent-0024。原Markdown SHA已核同。
- MLSLQCNZ5291：silent-proposal-de9ca3bd75c1ddf0，读回状态pending，实现任务strategy-proposal；账本silent-0020,silent-0012,silent-0356。原Markdown SHA已核同。
- 0VBCQS9V0N87：silent-proposal-477be65ebb706826，读回状态pending，实现任务strategy-proposal；账本silent-0019,silent-0039,silent-0490。原Markdown SHA已核同。

源码最终只读对照：{"head": "fdae435795f41d771da6df3457eb890e50d8ffeb", "diff_sha256": "60cea0203967500a1edf2f1d12e80ad7537bd1ed2ecc36dd71e6ed412ff0715f", "diff_bytes": 4642059338, "note": "只读live对照，不是运行commit；前次live-source.diff另存。"}。未改源码或知识数据，未运行测试、play、提交或推送。

过程失败保留：首次创建verify_and_propose.py的工具调用在shell启动前被bubblewrap的并行工作树消失/rg unreadable glob scan拒绝；没有执行文件或账本写入，随后同任务目录重试成功。非数据或代码检查失败。

## 源码对照范围更正

前两次宽范围diff包含本地材料存储差异，并非同等数量的源码变更。现将live-source.diff／live-final-source.diff收窄为本次实际核对的combat-plan.ts及silent-selection-dispatch.ts，原宽范围过程采样只保留字节数与SHA于wide-diff-sampling.json；原始对局证据、失败回执和复盘初稿均保留。前文宽diff的字节数/SHA为历史采样，不再指向同名当前文件。最终源码元数据：{"head": "fdae435795f41d771da6df3457eb890e50d8ffeb", "paths": ["agent/src/reflex/silent-selection-dispatch.ts"], "command": ["git", "-C", ".worktrees/live", "diff", "--binary", "--", "agent/src/reflex/combat-plan.ts", "agent/src/reflex/silent-selection-dispatch.ts"], "diff_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "diff_bytes": 0, "wide_sampling_manifest": "wide-diff-sampling.json", "note": "相关源码只读对照，不是运行commit；宽范围diff误含材料存储差异，仅保留采样指纹。"}。

源码范围字段补全：paths为agent/src/reflex/combat-plan.ts和agent/src/reflex/silent-selection-dispatch.ts；原command已包含两者，最终diff为0字节。
