# H2 shadow：三完整自然局只读验收

## 验收结论与建议

**本批不建议任何拿牌或跳过题切到Jev实际决定。** 三局观察已完成，不代表具备on条件。42/42题都有成功Jev响应，37题有大脑实际选择可比较，一致18/37（48.65%）；另外4题code-fallback、1题code单列。拿牌一致11/28，跳过一致7/9。

按Jev输出反向看：Jev要拿的14题与大脑同牌11题；Jev要跳过且有大脑答案的23题仅7题相同，16题大脑实际要拿。因此不能据事后“大脑跳过组7/9”部署自动跳过。真正的Jev/大脑分歧19题；另11题只有模块工程兜底不同，合并30题明细不冒成30次Jev分歧。

42/42题都缺完整目标组胜率比较，没有“领先明显”或“接近”的可评估组；模块第一名全部是skip工程兜底。故模块/大脑9/37是兜底一致率，不是模拟排序效果。Jev/模块28/42也不能认证模块质量。三局后继Boss结果只属于实际选线，不是每题独立结果，更不是换牌因果证明。

42/42题都至少有一个候选触发计划外叫醒条件，可能转方向的数值条件则无可用比较，不能把未触发当作已证无需转向。现条件没有给出可不唤醒大脑的题目子集。只有23个接受计划，原始结构完整19/23（82.6%），投影覆盖23/23；1条F23/hp_drop的L2超时没有生成计划，另列而不混进完整率。具体方向仅6/23；其余未定或未提供，不能把默认值当模型输出。

方向全量41个checkpoint，分幕18/14/9；其中2次为GAME_OVER/finalize。决策期39次分幕18/13/8，目标数值已知率仍为0。第二幕主要受`hypothetical_inventory_has_unmodelled_relics`和既有可信闸阻断，第三幕/最终联合保持既定unknown。库存组件满足、实际施放、存活和整局结局分开，不授予核心资格，也不把unknown当胜率0。r1曾把无plan错误行计入actNone，旧分析与audit已保留；原输入始终未改。

H2工作耗时合计每局6.549/6.682/12.279秒，无一次超其声明预算；42次Jev外层调用均成功，最长0.890秒。三局44,260输入token，按冻结本地价格表估计总约$0.001859；实际账单未取，不声称账单成本。分项p50/p90/max及每题原引用在正文/数据。

Boss首试B2由旧两局4/44个有预算输出截断，变为本批0/47；中位样本仍200，不能说普遍增样或证明60秒改善胜率。SL仍10秒，仍有截断；[B2全量与SL分层表](b2-all-and-sl.md)补足所有输出口径，不能把首试0截断外推全体。Boss组合、R384和知识变化保持混杂边界。

BXU0为91.689分钟，超90目标1.689分钟。一次节点读回已GAME_OVER/F48且控制进程退出，无长期停同一题证据。51次L2记录合计33.406分钟（p90 80.291秒/最大89.988秒）；F33、F48各6试，窗口合计25.504分钟，其中10次重试20.807分钟。这些窗口与阶段耗时不能重复相加。H2本局仅12.279秒，无法解释91.689分钟；B2/B3记录2.848/4.573分钟、动作dispatch11.578分钟，compute proxy55.182分钟。未测的动画、等待与IO保持未分解，不据此修改SL或药水规则。

建议先由Claude/Roy决定如何补齐真实inventory/目标数值覆盖及计划外条件过宽；需要游戏机制的部分仍沿学习者证据链，本线程不派发。后续优先验证“明确计划、完整比较、明显领先、非转向/计划外”的常规题；本批满足集合为0，不能批准on。只交报告后停止，不开始新阶段。


请求 `roy-20261017-human-pace`，原 watcher/codex1；只分析日志，未调用模型或模拟、未改线上。

本批 3 局，42 道拿牌题；成功 Jev 与已接受大脑实际选择一致率 18/37 (48.6%)。
其中有数值比较依据的模块第一名与大脑一致率 0/0（无可估计分母）；含工程兜底的模块记录第一名一致率 9/37 (24.3%)。两者不可合称模拟最佳组。

最终是否让 Jev 实际接管仍待 Claude/Roy 另派；本报告不启用或改变决策。

## 准入、截点与边界

最低启动代码3910f41的实际祖先关系、Silent/F1/非重启、H2 shadow及Boss60均逐原run-config核。S5GZG328S1LN从158d910启动，排除。新局的原始终局与启动行见 `three-terminal-event.json`；冻结范围和逐行SHA见 `inputs-final/manifest.json`，重算投影与原字节校验见 `inputs-final/provenance-verification.json`、`audit-final.json`。

统计口径在首个合格启动前写入 `analysis-definitions.md`。一题按实际决策ID，拿牌必须同一张才算一致；空答案、未核实际动作和Jev fallback不冒成功判断。三局不是每道题都独立的因果试验。

|局|启动代码|开局|终局|分钟|终点|拿牌题|
|---|---|---|---|---|---|---|
|4JS3T2UNKPVM|3910f41b9|2026-10-17T09:12:14.167Z|2026-10-17T09:42:20.716Z|30.109|F22|11|
|WQB3YYNTRB2L|6f2a20594|2026-10-17T09:51:15.561Z|2026-10-17T10:23:30.876Z|32.255|F24|11|
|BXU0CKWKH2RU|6f2a20594|2026-10-17T10:32:19.620Z|2026-10-17T12:04:00.987Z|91.689|F48|20|

各局知识dirty路径、相对3910的生产/知识改动及H2逐源码SHA都在 `audit-final.json`。启动提交与受检提交不等于所有dirty知识输入曾被同一宿主全检；同期H0/知识更新也是观察比较的混杂因素。

## 1. Jev、模块与大脑的一致性

|大脑实际|比较难度|题数|Jev成功回答/大脑|模块记录/大脑|数值模块/大脑|Jev成功/模块|
|---|---|---|---|---|---|---|
|take|clear_lead|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|take|close|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|take|comparison_unknown|28|11/28 (39.3%)|0/28 (0.0%)|0/0（无可估计分母）|16/28 (57.1%)|
|skip|clear_lead|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|skip|close|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|skip|comparison_unknown|9|7/9 (77.8%)|9/9 (100.0%)|0/0（无可估计分母）|7/9 (77.8%)|
|not_accepted_brain|clear_lead|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|not_accepted_brain|close|0|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|
|not_accepted_brain|comparison_unknown|5|0/0（无可估计分母）|0/0（无可估计分母）|0/0（无可估计分母）|5/5 (100.0%)|

领先明显=完整Act2比较中第一名对所有对手的均值差都超过2×两者SE之和；仅MC误差，不覆盖模型错误。接近和comparison_unknown如实分开。
更广的事实unknown为 42/42 题，包括S/支撑件/第三幕/下一个Boss等；胜率比较完整也不等于全部信息已知。逐字段：`{"core_component": 33, "support_component": 42, "target_act2_unknown": 42, "target_act3_unknown": 42, "target_delta_S": 42, "target_delta_win": 42, "next_boss_delta_win": 4, "next_boss_low_trust": 15}`。

|比较|一致分子/分母|
|---|---|
|Jev成功 vs 大脑实际|18/37 (48.6%)|
|模块记录（含工程兜底）vs 大脑|9/37 (24.3%)|
|数值模块第一名 vs 大脑|0/0（无可估计分母）|
|Jev成功 vs 模块记录|28/42 (66.7%)|
|Jev成功 vs 数值模块|0/0（无可估计分母）|
|Jev记录答案（含兜底）vs 实际动作|18/42 (42.9%)|

成功回答take/skip混淆表：`{"brain_take/jev_skip": 16, "brain_take/jev_take": 12, "brain_skip/jev_take": 2, "brain_skip/jev_skip": 7}`；fallback原因：`{}`。
实际拿牌题缺sidecar 0，重复sidecar 0；缺项不从分母消失，详见analysis-final。

逐题分歧及事后观察见 [disagreements.md](disagreements.md)；完整逐题JSON及CSV包括所有一致题。下一个Boss是实际选线后的共同结果，不能推断替代拿牌会赢，也不能把同局多题当多局支持。

## 2. 叫醒条件（仅shadow）

|局|可能转方向|任一选项计划未覆盖|任一触发|计划覆盖未知|
|---|---|---|---|---|
|4JS3T2UNKPVM|0|11|11|0|
|WQB3YYNTRB2L|0|11|11|0|
|BXU0CKWKH2RU|0|20|20|0|

|局/题|层|方向变化|未覆盖|实际所选触发|触发选项|
|---|---|---|---|---|---|
|4JS3T2UNKPVM/787a01b6-d769-41be-8637-111cb877611c|2|False|True|(None, True)|('card0', 'PRECISE_CUT', None, True);('card1', 'LEG_SWEEP', None, True);('card2', 'SNAKEBITE', None, True)|
|4JS3T2UNKPVM/bf67308e-a28b-483d-87c7-76206443eea9|3|False|True|(None, False)|('card0', 'PREPARED', None, True);('card2', 'SNAKEBITE', None, True)|
|4JS3T2UNKPVM/06a20653-1e50-4abf-9d4a-80df170a50d9|5|False|True|(None, False)|('card0', 'DEFLECT', None, True);('card2', 'SNAKEBITE', None, True)|
|4JS3T2UNKPVM/9f5b7c05-e6ad-47d2-bee2-166a7ddf86ce|6|False|True|(None, True)|('card0', 'BUBBLE_BUBBLE', None, True);('card1', 'DODGE_AND_ROLL', None, True);('card2', 'PIERCING_WAIL', None, True)|
|4JS3T2UNKPVM/1ff5989b-2229-436e-8666-36425da395ff|8|False|True|(None, False)|('card0', 'ABRASIVE', None, True);('card1', 'SKEWER', None, True);('card2', 'HAND_TRICK', None, True)|
|4JS3T2UNKPVM/30270656-f0a9-4b18-a3d0-ef371dd10324|9|False|True|(None, False)|('card1', 'FLICK_FLACK', None, True);('card2', 'SLICE', None, True)|
|4JS3T2UNKPVM/00f84004-9713-4cab-a1f1-55b4cd2fb432|12|False|True|(None, True)|('card0', 'HAZE', None, True);('card1', 'SLICE', None, True);('card2', 'HAND_TRICK', None, True)|
|4JS3T2UNKPVM/4976bba6-8b16-4266-b72d-f2b7fc45bd1f|14|False|True|(None, True)|('card0', 'DEFLECT', None, True);('card1', 'LEADING_STRIKE', None, True);('card2', 'CLOAK_AND_DAGGER', None, True)|
|4JS3T2UNKPVM/87c8c601-97ff-4332-af44-b37dd8beca57|17|False|True|(None, False)|('card0', 'MURDER', None, True);('card1', 'BLADE_OF_INK', None, True);('card2', 'STORM_OF_STEEL', None, True)|
|4JS3T2UNKPVM/6fedc730-38a1-492e-ae36-9b8ab3c90089|19|False|True|(None, False)|('card1', 'SPEEDSTER', None, True);('card2', 'BUBBLE_BUBBLE', None, True)|
|4JS3T2UNKPVM/ebd9e3f4-f415-4257-bd74-d118d846e5b0|21|False|True|(None, True)|('card0', 'EXPERTISE', None, True);('card1', 'PREDATOR', None, True);('card2', 'ANTICIPATE', None, True)|
|WQB3YYNTRB2L/cb5daec0-8dde-40dd-b7a6-9b46cd59e94d|2|False|True|(None, True)|('card0', 'ECHOING_SLASH', None, True);('card1', 'CLOAK_AND_DAGGER', None, True);('card2', 'STRANGLE', None, True)|
|WQB3YYNTRB2L/6d0a65bc-04df-48bc-9826-91efc47dd252|3|False|True|(None, True)|('card0', 'POISONED_STAB', None, True);('card1', 'FLICK_FLACK', None, True);('card2', 'UNTOUCHABLE', None, True)|
|WQB3YYNTRB2L/120df640-4e37-489c-b2ff-cc669fe5765c|5|False|True|(None, False)|('card1', 'PIERCING_WAIL', None, True);('card2', 'STRANGLE', None, True)|
|WQB3YYNTRB2L/9a5112de-5c4f-4dda-a714-dd997e31492c|9|False|True|(None, True)|('card0', 'HAZE', None, True);('card1', 'FLICK_FLACK', None, True);('card2', 'SPEEDSTER', None, True)|
|WQB3YYNTRB2L/29c911f2-67f3-4fa9-82ce-fecdac6809c1|12|False|True|(None, True)|('card0', 'ACCURACY', None, True);('card1', 'SHADOW_STEP', None, True);('card2', 'HIDDEN_DAGGERS', None, True)|
|WQB3YYNTRB2L/3488fd7e-61ba-4292-a884-3bfefffdee9f|14|False|True|(None, False)|('card0', 'DEFLECT', None, True);('card2', 'DAGGER_SPRAY', None, True)|
|WQB3YYNTRB2L/858a5a71-4483-4ad4-82bd-8d6da78ba632|15|False|True|(None, True)|('card0', 'POISONED_STAB', None, True);('card1', 'MIRAGE', None, True);('card2', 'LEADING_STRIKE', None, True)|
|WQB3YYNTRB2L/9633201e-67ae-4230-821d-1095a6edff6e|17|False|True|(None, True)|('card0', 'STORM_OF_STEEL', None, True);('card2', 'THE_HUNT', None, True)|
|WQB3YYNTRB2L/9a57895e-c1e6-45df-8629-b34a9c1dd5f2|19|False|True|(None, True)|('card0', 'PREDATOR', None, True);('card1', 'BLUR', None, True);('card2', 'BACKSTAB', None, True)|
|WQB3YYNTRB2L/4c1d8434-53f4-49b7-a100-121a290cc8ae|20|False|True|(None, False)|('card0', 'ANTICIPATE', None, True);('card1', 'DAGGER_THROW', None, True);('card2', 'POUNCE', None, True)|
|WQB3YYNTRB2L/194162c2-629e-4248-9311-2fe06f2b997d|22|False|True|(None, True)|('card0', 'SNAKEBITE', None, True);('card1', 'SPEEDSTER', None, True);('card2', 'BLADE_DANCE', None, True)|
|BXU0CKWKH2RU/841903af-f9fd-4795-9b51-9a3be9560a81|2|False|True|(None, False)|('card0', 'UNTOUCHABLE', None, True);('card1', 'PREPARED', None, True);('card2', 'SIDESTEP', None, True)|
|BXU0CKWKH2RU/2e9be68b-4041-415e-9c67-7f85b9b1f867|3|False|True|(None, True)|('card0', 'SKEWER', None, True);('card1', 'STRANGLE', None, True);('card2', 'FLICK_FLACK', None, True)|
|BXU0CKWKH2RU/38969cab-6bf6-45b0-9c11-ebb76562df09|4|False|True|(None, False)|('card0', 'UP_MY_SLEEVE', None, True);('card2', 'CALCULATED_GAMBLE', None, True)|
|BXU0CKWKH2RU/b29b1790-3765-4b0a-9c2c-b42d5202d276|9|False|True|(None, False)|('card0', 'MEMENTO_MORI', None, True);('card1', 'UP_MY_SLEEVE', None, True)|
|BXU0CKWKH2RU/3f148562-3f8e-437d-94d5-6dcb6eca26a2|13|False|True|(None, True)|('card0', 'ACCELERANT', None, True);('card1', 'HIDDEN_DAGGERS', None, True);('card2', 'SNAKEBITE', None, True)|
|BXU0CKWKH2RU/19c21f2a-53ff-4664-a20d-029c25bb8da5|15|False|True|(None, True)|('card0', 'SIDESTEP', None, True);('card1', 'BACKFLIP', None, True);('card2', 'SNAKEBITE', None, True)|
|BXU0CKWKH2RU/08e6c680-0e93-48a8-8849-4ac322e1dfa3|17|False|True|(None, True)|('card0', 'AFTERIMAGE', None, True);('card1', 'TOOLS_OF_THE_TRADE', None, True);('card2', 'BULLET_TIME', None, True)|
|BXU0CKWKH2RU/5064a6fc-445a-46b3-a70e-a228e7d5a39e|19|False|True|(None, True)|('card0', 'FLICK_FLACK', None, True);('card1', 'TACTICIAN', None, True);('card2', 'HAZE', None, True)|
|BXU0CKWKH2RU/481f1488-5e27-4ed5-9822-bc46f82aac27|20|False|True|(None, False)|('card0', 'DAGGER_SPRAY', None, True);('card1', 'HAND_TRICK', None, True);('card2', 'UNTOUCHABLE', None, True)|
|BXU0CKWKH2RU/2c906d76-b37e-433b-9768-f2ae12169469|22|False|True|(None, True)|('card0', 'DEFLECT', None, True);('card1', 'DODGE_AND_ROLL', None, True);('card2', 'FLICK_FLACK', None, True)|
|BXU0CKWKH2RU/6e3d4a48-7a92-46a7-bb7f-5e824a70285a|23|False|True|(None, True)|('card0', 'RICOCHET', None, True);('card1', 'PIERCING_WAIL', None, True);('card2', 'SUCKER_PUNCH', None, True)|
|BXU0CKWKH2RU/61f3b96b-a5e6-4e0c-98de-35621c656918|25|False|True|(None, False)|('card0', 'TOOLS_OF_THE_TRADE', None, True);('card1', 'POISONED_STAB', None, True);('card2', 'DAGGER_THROW', None, True)|
|BXU0CKWKH2RU/01869734-5a87-445c-8e38-386f58a9e85f|28|False|True|(None, False)|('card0', 'UNTOUCHABLE', None, True);('card1', 'PREPARED', None, True);('card2', 'DODGE_AND_ROLL', None, True)|
|BXU0CKWKH2RU/9c356c5c-0d37-415a-95c6-c65c4e9e3404|30|False|True|(None, False)|('card0', 'HAZE', None, True);('card1', 'BLADE_DANCE', None, True);('card2', 'DODGE_AND_ROLL', None, True)|
|BXU0CKWKH2RU/5ec773d0-1823-4e61-a794-8165d08f5242|33|False|True|(None, True)|('card0', 'STORM_OF_STEEL', None, True);('card1', 'ASSASSINATE', None, True);('card2', 'BLADE_OF_INK', None, True)|
|BXU0CKWKH2RU/df1afd64-effb-468d-8c6d-1be87269bba5|35|False|True|(None, True)|('card0', 'SLICE', None, True);('card1', 'PIERCING_WAIL', None, True);('card2', 'FLICK_FLACK', None, True)|
|BXU0CKWKH2RU/85f43efd-47b2-4b83-b247-bfc42ddce317|38|False|True|(None, True)|('card0', 'POUNCE', None, True);('card1', 'SUCKER_PUNCH', None, True);('card2', 'FLECHETTES', None, True)|
|BXU0CKWKH2RU/da4d93cc-eba7-47df-ad6b-28a66c25392f|39|False|True|(None, True)|('card0', 'HAZE', None, True);('card1', 'PREDATOR', None, True);('card2', 'ANTICIPATE', None, True)|
|BXU0CKWKH2RU/5697f494-293e-46d9-a7ba-ce72da7e4f55|44|False|True|(None, False)|('card0', 'EXPOSE', None, True);('card1', 'TACTICIAN', None, True)|
|BXU0CKWKH2RU/ba26df45-0bd2-42c0-bf27-3cda679c6e25|46|False|True|(None, True)|('card0', 'PREPARED', None, True);('card1', 'DAGGER_SPRAY', None, True)|

触发未执行叫醒；null并非false。本批转方向数值比较42/42题不可评估，表中0触发不能解释成已经证明无需转向。另一方向关键件的当前牌差不是另一完整方向更好的证明。

## 3. 方向与整幕计划覆盖

|当前幕/目标幕|variant×target输出|完整已知比例|partial/unknown比例|有胜率数值|有S数值|
|---|---|---|---|---|---|
|current_act1/target_act2|3663|0/3663 (0.0%)|3663/3663 (100.0%)|0|0|
|current_act1/target_act3|3663|0/3663 (0.0%)|3663/3663 (100.0%)|0|0|
|current_act2/target_act2|1944|0/1944 (0.0%)|1944/1944 (100.0%)|0|0|
|current_act2/target_act3|1944|0/1944 (0.0%)|1944/1944 (100.0%)|0|0|
|current_act3/target_act2|858|0/858 (0.0%)|858/858 (100.0%)|0|0|
|current_act3/target_act3|858|0/858 (0.0%)|858/858 (100.0%)|0|0|

|当前幕/目标幕|不重复checkpoint×Boss|全部variant已知|部分或全部unknown|
|---|---|---|---|
|current_act1/target_act2|54|0|54|
|current_act1/target_act3|54|0|54|
|current_act2/target_act2|42|0|42|
|current_act2/target_act3|42|0|42|
|current_act3/target_act2|27|0|27|
|current_act3/target_act3|27|0|27|

方向unknown原因：`{"direction_batch_unknown:hypothetical_inventory_has_unmodelled_relics": 4190, "验证集 21 场（战前起点）：校准 Brier 0.182，高于整体 0.120 的 1.25 倍 0.151": 2155, "Act3_quality_gate_and_production_trust_unknown": 6465, "direction_batch_unknown:invalid_inventory_resource_contract": 120}`。stale上次结果不充本次覆盖。第三幕质量闸、最终连战联合率及生产校准未知保持，不补零。
各当前幕checkpoint数量：`{"1": 18, "2": 14, "3": 9}`；0次未输出目标列表，目标覆盖分母不能回填。最终联合对象状态计数：`{"current_act1/target_final_sequence": {"unknown": 18}, "current_act2/target_final_sequence": {"unknown": 14}, "current_act3/target_final_sequence": {"unknown": 9}}`。未到达的幕没有自然覆盖证据，不写100%。

|幕|原接受计划更新|原始模型字段完整|投影覆盖|投影结构完整|投影内容均非空/有效|
|---|---|---|---|---|---|
|act1|11|9/11 (81.8%)|11/11 (100.0%)|11/11 (100.0%)|2/11 (18.2%)|
|act2|8|7/8 (87.5%)|8/8 (100.0%)|8/8 (100.0%)|4/8 (50.0%)|
|act3|4|3/4 (75.0%)|4/4 (100.0%)|4/4 (100.0%)|0/4 (0.0%)|

|局|已进入幕|该幕原计划更新|该幕H2投影|
|---|---|---|---|
|4JS3T2UNKPVM|1|3|3|
|4JS3T2UNKPVM|2|2|2|
|WQB3YYNTRB2L|1|4|4|
|WQB3YYNTRB2L|2|2|2|
|BXU0CKWKH2RU|1|4|4|
|BXU0CKWKH2RU|2|4|4|
|BXU0CKWKH2RU|3|4|4|

原始输出按run-plans.raw核字段，不把normalize或H2投影补的默认值算模型已输出。结构字段出现、内容非空与计划质量分开；空want/avoid/alternatives数组是已输出，内容表另标非空。未定方向合法但不冒具体方向。逐更新匹配与原始字段/缺checkpoint/pivot_if等在analysis-final的plans。持有组件（真实清单或假设添加）、实际施放、存活、整局结果彼此分开；日志中的inventory满足不算合格核心。

## 4. 新增耗时、预算与成本

|局|模块|计时n|计时缺失|p50/p90/max 毫秒|记录合计秒|timed_out|墙钟超预算|
|---|---|---|---|---|---|---|---|
|4JS3T2UNKPVM|card_module|11|0|0.0/29.0/315.0|0.371|0|0|
|4JS3T2UNKPVM|Jev|11|0|469.0/506.0/533.0|5.208|0|0|
|4JS3T2UNKPVM|direction_module|9|0|57.0/214.0/354.0|0.970|0|0|
|WQB3YYNTRB2L|card_module|11|0|0.0/30.0/88.0|0.145|0|0|
|WQB3YYNTRB2L|Jev|11|0|501.0/631.0/674.0|5.705|0|0|
|WQB3YYNTRB2L|direction_module|8|0|69.5/227.2/251.0|0.832|0|0|
|BXU0CKWKH2RU|card_module|20|0|35.0/84.4/374.0|0.994|0|0|
|BXU0CKWKH2RU|Jev|20|0|460.5/542.0/890.0|9.932|0|0|
|BXU0CKWKH2RU|direction_module|24|0|46.5/97.4/159.0|1.353|0|0|

|局|记录增量分钟|Jev观测题/外层ask|成功usage|输入/输出tokens|已记录输入估计USD|失败usage未知|
|---|---|---|---|---|---|---|
|4JS3T2UNKPVM|0.1091|(11, 11)|11|(11693, 535)|0.00049111|0|
|WQB3YYNTRB2L|0.1114|(11, 11)|11|(11686, 531)|0.00049081|0|
|BXU0CKWKH2RU|0.2046|(20, 20)|20|(20881, 964)|0.00087700|0|

预算为方向60s、拿牌事实5s、Jev独立1s。每个outer budget只加一次，不叠加stages。未记录读盘/日志/调度开销unknown，这不是因果净慢多少。Jev单次latency与request_id、模型及tokens见逐题原件；失败请求未返回usage不填0。价格是冻结仓库pricing.ts的$0.042/百万输入、输出免费估计，不是账单或外部当前价格核实。

|局|实际外层Jev ask耗时 p50/p90/max毫秒|ask次数|
|---|---|---|
|4JS3T2UNKPVM|469.0/506.0/533.0|11|
|WQB3YYNTRB2L|501.0/632.0/674.0|11|
|BXU0CKWKH2RU|461.0/542.0/890.0|20|
外层ask以原H2_Jev_shadow stage为证；无client或预算先已耗尽不充API调用。SDK内部HTTP重试次数没有完整记录，保持unknown。
此外有 0 条observer级unknown/error；这些不被无声排除，详见原引用。成功metadata若输入usage为0或缺失，也单列未知用量而不认证真实零成本。

## 5. 对局、Boss与R385采样变化

|局|分钟|超过90分钟|Boss真实结果|
|---|---|---|---|
|4JS3T2UNKPVM|30.109|False|F17 LAGAVULIN_MATRIARCH；首试过/含SL过|
|WQB3YYNTRB2L|32.255|False|F17 VANTOM；首试过/含SL过|
|BXU0CKWKH2RU|91.689|True|F17 CEREMONIAL_BEAST；首试过/含SL过;F33 THE_INSATIABLE；首试未过/含SL过;F48 AEONGLASS；首试未过/含SL未过|

|预算/局|Boss首试B2输出|deadline partial/有预算输出|样本p50/p90/max|样本直方图|pending/degraded|
|---|---|---|---|---|---|
|30s/25MFNPAE37R2|25|(1, 25)|200.0/200.0/600.0|{"600": 2, "200": 22, "81": 1}|(0, 0)|
|30s/2PQK67ULZY90|21|(3, 19)|200.0/300.0/600.0|{"300": 2, "200": 14, "600": 1, "89": 1, "93": 1, "0": 2}|(2, 1)|
|60s/4JS3T2UNKPVM|7|(0, 7)|200.0/360.0/600.0|{"600": 1, "200": 6}|(0, 0)|
|60s/WQB3YYNTRB2L|8|(0, 8)|200.0/600.0/600.0|{"600": 3, "200": 5}|(0, 0)|
|60s/BXU0CKWKH2RU|32|(0, 32)|200.0/200.0/600.0|{"200": 31, "600": 1}|(0, 0)|

重复completion去重、候选/配对样本、请求上限、低可信标记及memo命中在analysis-final各局Boss_first_attempt_B2(_unique)。SL仍10s另列在pacing，不混入此表。旧30s的2PQK有R384已修的身份错误，H0/知识与Boss组合也在变，不能只把差异归因60s。

|预算/局/层|首试B2输出|partial/有预算输出|样本p50/p90/max|
|---|---|---|---|
|30s/25MFNPAE37R2/F17|7|(0, 7)|200.0/600.0/600.0|
|30s/25MFNPAE37R2/F33|12|(0, 12)|200.0/200.0/200.0|
|30s/25MFNPAE37R2/F48|6|(1, 6)|200.0/200.0/200.0|
|30s/2PQK67ULZY90/F17|11|(0, 11)|200.0/300.0/600.0|
|30s/2PQK67ULZY90/F33|10|(3, 8)|200.0/200.0/200.0|
|60s/4JS3T2UNKPVM/F17|7|(0, 7)|200.0/360.0/600.0|
|60s/WQB3YYNTRB2L/F17|8|(0, 8)|200.0/600.0/600.0|
|60s/BXU0CKWKH2RU/F17|6|(0, 6)|200.0/400.0/600.0|
|60s/BXU0CKWKH2RU/F33|8|(0, 8)|200.0/200.0/200.0|
|60s/BXU0CKWKH2RU/F48|18|(0, 18)|200.0/200.0/200.0|

超过90分钟或卡局的归因需按已记录H2增量、原budget、L2与决策间隙分别看。未采样的机器IO/故障原因不回填；慢决策和间隙的原引用在analysis-final各局pacing.attribution。

## 6. 接管建议与停止边界

本次只给移交候选，不执行。优先看完整胜率比较、明显领先、Jev真实成功、原计划覆盖且不触发转向的常规拿/跳题；仍需检查这批真实分母和逐题分歧，不能凭总体一致率移交unknown或超时兜底题。接近题、可能转方向、计划外、资源/目标未知的题继续保留大脑。若本批没有完整比较或成功Jev覆盖，就没有数据支持将任何题型正式交给Jev。

只有3个独立局的后继Boss结果；它们不能证明拿牌判断正确或胜率收益。后续范围与准入标准由Claude/Roy另派，本线程不启用on、不改预算、不开展H3/H4或新研究。

## 复现

原单次监听已终局退出0，不再启动。评分用本目录冻结投影，历史对照复用H1冻结目录，路径/SHA在baseline清单；字节溯源校验另只读原logs的指定范围。用nice19单进程依次运行verify-inputs.py、baseline-boss30.py、analyze.py、audit-analysis.py、render-review.py、render-report.py，不运行游戏/模型/模拟。原始流缺失时不能冒原字节复核成功；只评分可直接使用已核冻结投影。不得再覆盖inputs-final或重复启动监听，历史与失败另存。
