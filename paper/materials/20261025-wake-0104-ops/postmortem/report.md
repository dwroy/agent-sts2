| 本批局 | 流派剧本/策略/rk去向 | 完整局及关键窗口 | 人类赢家可核偏离与限制 | 实际处置 |
|---|---|---|---|---|
| 4CR2N26QAJAV | silent-external-poison-build-playbook-c1；silent-brain-potion-reserve-terminal-proxy-context；silent-r2-card-mirage；候选silent-abf5-4CR2N26QAJAV-1/2/3/4 | whole-run-summary.json#runs/4CR2N26QAJAV；F8/9、F17/33、F46→47→48→49；F49末T8→9 | 外部簇1胜例40ed终局也无触媒/步法，故不能把本局缺触媒定为输因；外部该例F48女王10回合、节点总受伤9后59/70，下一王为沙漏；本局女王胜试10回合但净损74且带复活，下一王实验体。血损口径/配套/后王不同，无可比偏离幅度或因果。 | 复用父ID或真实过渡候选；局部条件待证，formal_publication/consumer_readback=pending；不扩大原触发 |
| Q7HBKHZTSPJ8 | silent-external-poison-build-playbook-c1；silent-brain-insatiable-bite-block-and-weaken；silent-r2-card-blur；候选silent-abf5-Q7HBKHZTSPJ8-1/2/3/4 | whole-run-summary.json#runs/Q7HBKHZTSPJ8；F17、F29→30→31→32→33；末试T5士兵/残影→T6 | 本局前3战即时群伤/毒源并存，外部代表胜负对都在节点2/3拿毒药/毒雾，但祝福、敌人、资源不同；外部赢家无触媒/步法仍过双王，不构成固定拿牌顺序。未建立同前缀/2敏捷士兵可比组，偏离收益未知。 | 复用父ID或真实过渡候选；局部条件待证，formal_publication/consumer_readback=pending；不扩大原触发 |
| FVWXPGMA2DBQ | silent-pb-transition-b3757；silent-brain-act1-rest-smith-resource-proxy；silent-r2-card-leg-sweep；候选silent-abf5-FVWXPGMA2DBQ-1/2/3/4 | whole-run-summary.json#runs/FVWXPGMA2DBQ；F6、F8改线、F17→18→19；T8方案与T12死亡 | 本局未定且未具名成型，无冻结同情境人类赢家可比组。簇1外部数据只作边界背景，不能给本局强行分类、拿牌比例或安全血线。 | 复用父ID或真实过渡候选；局部条件待证，formal_publication/consumer_readback=pending；不扩大原触发 |
| NYX17B18TBWG | silent-external-poison-build-playbook-c1；silent-brain-backflip-external-prefix-context；silent-r2-card-malaise；候选silent-abf5-NYX17B18TBWG-1/2/3/4 | whole-run-summary.json#runs/NYX17B18TBWG；F17→19→20→22→24→25→27；F27末T5SL替线→T6 | 外部代表赢家与败者均早有毒药/毒雾，未能给本局确定的多后空翻比例或毒雾必建顺序；本局资源/敌人及SL与外部不同，偏离收益未知。 | 复用父ID或真实过渡候选；局部条件待证，formal_publication/consumer_readback=pending；不扩大原触发 |
| 7UEFJY5Z4Y85 | silent-external-poison-build-playbook-c1；silent-brain-accelerant-external-prefix-context；silent-poison-rk-amplifier-after-source；候选silent-abf5-7UEFJY5Z4Y85-1/2/3/4 | whole-run-summary.json#runs/7UEFJY5Z4Y85；F17、F28→30→32→33、F29齐持、F38→40→42→43→44→45；T5药水→T6 | 外部簇1胜例40ed在节点17/33/48/49分别同族/知识恶魔/女王/沙漏，首两王11/10回合、末两王10/9回合；终局无触媒/步法仍赢。我们同族10回合净损55、知识恶魔10回合净损21，外部节点总受伤22/18不能当同口径净损直接相减；真正差异是组件与实际启动路线不同。F29具名签名早于死战已持有，F45余像触媒未建，但未核同手牌替线或同资源人类赢家，不能声称强制优先打核心可赢。 | 复用父ID或真实过渡候选；局部条件待证，formal_publication/consumer_readback=pending；不扩大原触发 |

记录时间：2026-10-25T00:45:27+08:00。来源批次abf5aa6f-b0a9-4a7f-bbe5-aedeee8000ae。

两份实际主产物：[whole-run-summary.json](/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/whole-run-summary.json)、[playbook-rk-candidates.json](/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/playbook-rk-candidates.json)。候选文件内20个决策单元是5局×用药/休息路线/冷启动/战内兑现的证据归集，并非20条新经验。每个候选均写角色、版本、局号、原始窗口、目标ID、observed偏离、限制与两个pending。

## 输入、排除与三输入边界

- 五局runs原行均已结束、SILENT、A10，初核无复盘标题；已逐局一次cat追加。Roy手动记录排除Z2KBGZQMSRV5，手动窗口08:38:01—09:56:28（+08:00）；本批最早首决策为2026-10-24T07:54:08.448Z，即15:54:08.448+08:00，不在该窗口，也未命中排除ID。恢复自动局按实际Codex run-config核定，未操作游戏、STOP、批次、会话或原运行记录。
- 五局runs.code均current，两条run-config的git采集均ENOBUFS、commit=null；对局精确源码SHA/release_id及游戏版本未知。当前live 487ce58924ff9e511cfbf76bfaad73608d310de3只用于file:line定位，source-reference.json/live-reference.diff保存原参考与指纹，不冒称为当局代码。
- 按#54 three-input-freeze.json逐文件bytes/SHA核同，只读已交付安全聚合/投影；未下载或读取外部原库，未读取本批以外自有原始局。input-receipts.json保留实际输入、来源、版本、过滤、许可、分母与SHA。外部来源external:sts2fun，https://sts2.fun/static/sts2_public.db.zst，下载2026-10-21，数据库来源SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5；沿交付回执继承，未重新读原库算SHA。许可未明确，只署名安全聚合，不分发原始玩家标识。
- 外部代表只核簇1的projection-40ed0656498ebe5e（胜，完整49节点投影）与projection-a7d1a45b65eee902（败，止15节点）；初始牌组推定，终局取得时点并非全精确，缺回合药水/真实战前快照。它们是外部整局节点代理，不是本系统验证，也不是本批同手牌/同前缀人类对照。三类输入都有相关材料，完整可比科学剧本仍缺；不据此停掉可核整局产出。
- 自有四表已实际交付，冻结run-index无本批五局；每局n=1附加对照，不能向旧分母直接加五、不能把SL试次当独立局。下表仅并列冻结描述，不给拿牌比例/安全HP/药量/因果收益。

| #54四表 | 外部v0.111/A10簇1 | 自有A10簇1、游戏版本unknown | 本批贡献/限制 |
|---|---|---|---|
| 流派 | 223上传记录，42胜；独立玩家未知 | 无重试证据48局、3胜；该标签不证明完全无SL | 按当时牌组/计划辨认，4局P计划或局部混合、FV未定，不强制回分终局簇 |
| 组合 | ACCELERANT+DEADLY_POISON：27匹配对，胜端8/27、败端11/27，q=1 | 无重试证据2对：2/2对1/2；重试/判死3对：1/3对2/3，均q=1 | 方向不同与小样本并列；不合分母，不推触媒必拿/必胜。7UE F29持有签名、F45未建立的实际对照 |
| 时间线 | 三牌药瓶/触媒/毒药在终局可还原赢家8/41观察齐备，其余33未见；非必要充分定义 | 无重试证据4/48观察齐备；其中3个赢家均未观察该三牌齐备 | 自有F29是实际floor；外部ordinal不可相减成早/晚几层。模板齐持、实建、实际胜分别列 |
| 克制/遭遇 | 知识恶魔27上传局/记录，胜局/后继代理22；非统一单战战绩 | 无重试证据6局6胜；重试/判死29局、20胜；净HP另以18条可用记录计 | 本批4CR首试15轮、7UE首试10轮胜，但净损41/21；SL与口径分开，不把整场均值认当前安全线 |

上表自有克制格的精确口径：重试/判死层29局，结果wins=20；净HP可用n=18、缺11，均34.72222222222222。20是结果胜数，18仅是HP可用分母；原表完全保留。无重试6局净损均值47也只是旧样本描述。本报告下列本批净变化来自逐试资源链，与外部gross damage不相减。

## 决策类型字段回执

| 类型 | 直接可用字段 | 缺失或代理 | 本批处置 |
|---|---|---|---|
| 用药（首位，rk+策略） | 外部节点获得/是否实选、使用/丢弃；自有逐槽+实际action/result/后继 | 外部无回合时点、即时HP；未使用不能当有机会拒用；本批未控留药替线 | 逐槽获得/持有/补充/饮用/丢弃/自动仙女/SL恢复分别列，未给新药价或阈值 |
| 休息/锻造与路线 | 外部选择ID/升级ID；自有题前HP、完整备选与理由、走线后继 | 外部休息前HP仅前节点末代理；未走分支/休息替线无实打 | 复用相关原ID；投影与实到只作明确同条件或带限制的对照 |
| 冷启动 | 外部第一幕ancient/早期拿牌顺序；自有前3战奖励、备选、跳过/原理由 | 古老祝福为代理；本批F1题前原state缺失，首次state与决策ts同刻不当observed_ts前帧 | 保持未定或暂定P，不以第一幕Boss结果倒填当时判断 |
| 商店/删牌/遗物 | bought_*为显式买，cards_removed为真实移除ID | 缺价格/购买前金币/完整货架；移除不必付费 | 原完整大脑题/实牌组与construction-log分列；state差分不冒主动选择 |
| 事件/按遭遇 | 外部部分title，节点遭遇；自有题面与后继 | 外部缺变量/完整备选；遭遇型与路线普通/精英文本不必同口径 | 后排局部候选；本批不编造缺失表/外部机制 |

## 五局整局摘要

### 4CR2N26QAJAV

- 流派/转向：F1—F7未定：后空翻、偏折、步法先铺防守；F8拿毒雾时计划首次转P，后蛇咬/双药瓶施毒，蜃景与步法余像防守，小刀只作过渡。
- 核心首次齐备：完整具名P模板未齐：全局未见触媒；D未见双步法，S未见精准/幻影之刃，R虽F46有杂技但无铜钹/绷带。局部毒雾+步法+后空翻首次同持在第一幕F8奖励，余像第二幕F33才加入。模板是候选签名，缺触媒不等于已证构筑错误或必败。
- 首次尝试与Boss：F17仪式兽12回合胜、F33知识恶魔15回合胜；F48首试T12预判死、次试T8预判死、第三试T10胜11血；F49三次预判死后第四试T9实际死亡。 实际F48胜后F49死，首次尝试并未通过F48；重载不是独立局，F49四次均以36/85及相同四槽药开场。
- 死因/关键赢战失血：实验体 #C113（TEST_SUBJECT）；F49第4次T9为20血18挡对8×8=64攻击，敌122血25毒；结算后玩家0、敌97/212，未进入下一阶段。死亡帧名为#C114而ID仍TEST_SUBJECT，标题沿runs记录#C113。 F8飞蝇菌子/闪光贾克斯果67→49，F9旧日雕像49→29，F17仪式兽67→23；F22寄生惧魔/胧光怪67→40，F33知识恶魔85→44。F46青蛙骑士83→67，入F47先因营火入口效果到85，再锻造余像+，非锻造治疗。F48女王/火炬头聚合体85→11（第三试获胜，净-74含仙女触发）；F49首帧36/85，+25与缩放仪一致。F48末药空，F49娇嫩蕨草重新补四槽，不能称全战空药或沿用四瓶。
- 第1幕末：s538352，23/80、药槽[]；牌组STRIKE_SILENT×4；DEFEND_SILENT×5；NEUTRALIZE+×1；SURVIVOR×1；ASCENDERS_BANE×1；BACKFLIP×1；DEFLECT×1；FOOTWORK×1；NOXIOUS_FUMES+×1；MALAISE×1；BLADE_DANCE×1；DARK_SHACKLES×1；PIERCING_WAIL×1；SNAKEBITE×1；THE_HUNT×1。
- 第2幕末：s538638，44/85、药槽[[0, 'SNECKO_OIL']]；牌组STRIKE_SILENT×4；DEFEND_SILENT×3；NEUTRALIZE+×1；SURVIVOR×1；ASCENDERS_BANE×1；BACKFLIP×1；DEFLECT+×1；FOOTWORK+×1；NOXIOUS_FUMES+×1；MALAISE+×1；BLADE_DANCE×1；PIERCING_WAIL×1；SNAKEBITE×1；THE_HUNT×1；ULTIMATE_DEFEND×1；DARK_SHACKLES×1；BOUNCING_FLASK+×1；MIRAGE×1；ESCAPE_PLAN×1；AFTERIMAGE×1。
- 第3幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 计划/预测/后继：F47满血锻造余像+，理由比较本火仅增5血；F48仍净损74，不能由此判升级错误。F49末试T8题面预测43挡、当轮损0、推进20；实0→43挡，T9仍20血、敌157→137，当前轮核同而T9仍失败。；各原检查点、endgame、完整选择/备选/理由与construction-log历史在主JSON，不把计划当能力或短理由当结论。
- 账本：新增无；更新silent-0020、silent-0493、silent-0028、silent-0125；只加support，不强判重犯。
- 未记录：准确对局源码SHA/release_id与自有游戏版本；F1开局选择observed_ts之前的原始state资源快照；与本批同前缀/同资源人类赢家可比组及偏离收益；未走线/未拿/未锻造/未留药的真实反事实收益；逐伤害来源总伤、自伤与回复的完整分解；Boss需要/估计/实打同起点完整配对误差；完整最优击杀顺序/focus收益；未到或未胜幕末牌组及资源；V6-build entries/jev_answer/fallback/unknown：冻结无匹配。

### Q7HBKHZTSPJ8

- 流派/转向：第一幕以突然一拳、匕首雨与毒刺/毒药过渡，计划仍未定；第二幕F19拿毒雾时首次转P，F20扫腿、F21步法，后翻滚、手上技法与残影补防守；缺触媒与稳定净抽牌。
- 核心首次齐备：完整P缺触媒；D无双步法，S/R无完整增益/遗物。局部毒源+步法+扫腿于第二幕F21奖励首次同持；这只是持有，不保证士兵每张翻倍或持续安全。
- 首次尝试与Boss：F17瀑布巨兽首试11回合胜16血；F33首/次/三试分别T6/T7/T7预判死亡，第四试T6实际死亡。 未进入第三幕及F48/F49；相邻Boss结果未知。
- 死因/关键赢战失血：无厌沙虫（THE_INSATIABLE）；F33第4次T6为20血3挡对12×2=24攻击，敌180血24毒、沙坑3；实际玩家0、敌156、沙坑2，属攻击死亡而非沙坑归零。 F17瀑布巨兽70→16获胜；第二幕F20盛碗虫59→42，F21虱虫42→27，F22入店后42，F23盛碗虫42→26；F29啃咬机50→49、F30异螨49→37、F31猎人杀手37→17。F32休息17→38，持火焰药进入F33，四试均饮用。
- 第1幕末：s539477，16/70、药槽[[0, 'DISTILLED_CHAOS']]；牌组STRIKE_SILENT×5；DEFEND_SILENT×5；NEUTRALIZE×1；SURVIVOR×1；ASCENDERS_BANE×1；SUCKER_PUNCH×1；DAGGER_SPRAY×1；POISONED_STAB+×1；DEADLY_POISON+×1；POISONED_STAB×1；ASSASSINATE×1。
- 第2幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 第3幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 计划/预测/后继：F32预测回血38，F33实际38一致；末试T5原题plan3预测28挡、当轮损0、推进22；实际21挡、当轮损0、推进22，次轮仅余3。当前live士兵预览检测只识别0/3敏捷，本窗2敏捷不在窄修范围；准确对局源码SHA未知，不称当前代码已在该局运行。；各原检查点、endgame、完整选择/备选/理由与construction-log历史在主JSON，不把计划当能力或短理由当结论。
- 账本：新增无；更新silent-0020、silent-0493、silent-0179、silent-0180、silent-0018；老错silent-0179为2敏捷范围外同现象复现。
- 未记录：准确对局源码SHA/release_id与自有游戏版本；F1开局选择observed_ts之前的原始state资源快照；与本批同前缀/同资源人类赢家可比组及偏离收益；未走线/未拿/未锻造/未留药的真实反事实收益；逐伤害来源总伤、自伤与回复的完整分解；Boss需要/估计/实打同起点完整配对误差；完整最优击杀顺序/focus收益；未到或未胜幕末牌组及资源；V6-build entries/jev_answer/fallback/unknown：冻结无匹配。

### FVWXPGMA2DBQ

- 流派/转向：全局计划uncommitted；零费精确切击、匕首雨和串刺提供即时输出，后空翻/扫腿补防守，F17拿肾上腺素。没有可核成长核心，保留流派未定/过渡，不倒填毒或刀流。
- 核心首次齐备：P/D/S/R完整模板均未齐；未见触媒、步法、余像或弃牌收益遗物，核心首次齐备未知。
- 首次尝试与Boss：F17仪式兽首试18回合胜1血；F19实际死亡，无该战SL条目；缺SL条目不外推为所有系统重试均无。 第二幕Boss与第三幕双王均未到，未知。
- 死因/关键赢战失血：地道虫（TUNNELER）；F19 T12为2血5挡对19攻击，敌7/92血26挡且埋地仍1；结束后玩家0，敌仍7血26挡。 F6毛绒伏地虫/缩小甲虫53→3（赢战净-50），F7治疗到24；F8劫掠者24→17，F11再治疗到38、F12异蛙寄生虫/扭动虫38→35；F13回56，F15赢战56→43，F16回64；F17仪式兽18回合64→1胜。幕间至56后F19地道虫56→0，不能把幕间恢复写成F17战内少掉血。
- 第1幕末：s540195，1/70、药槽[[0, 'WEAK_POTION']]；牌组STRIKE_SILENT×5；DEFEND_SILENT×5；NEUTRALIZE×1；SURVIVOR×1；ASCENDERS_BANE×1；PRECISE_CUT×1；DAGGER_SPRAY×1；SKEWER×1；PIERCING_WAIL×1；BACKFLIP×1；SUCKER_PUNCH×2；LEG_SWEEP×1；ADRENALINE×1。
- 第2幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 第3幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 计划/预测/后继：F8改线预测下一精英F12入场35/70（p75为30），F11选择回血后实际F12入场38/70；此为更新治疗后的后继，不能当冻结同条件误差3。F19 T8 Jev plan5预测本轮13挡、零损、敌31，实三项核同；5轮8样本有5胜2死而实盘T12死亡，单局不证明模型有纯bug。；各原检查点、endgame、完整选择/备选/理由与construction-log历史在主JSON，不把计划当能力或短理由当结论。
- 账本：新增无；更新silent-0020、silent-0493、silent-0125；只加support，不强判重犯。
- 未记录：准确对局源码SHA/release_id与自有游戏版本；F1开局选择observed_ts之前的原始state资源快照；与本批同前缀/同资源人类赢家可比组及偏离收益；未走线/未拿/未锻造/未留药的真实反事实收益；逐伤害来源总伤、自伤与回复的完整分解；Boss需要/估计/实打同起点完整配对误差；完整最优击杀顺序/focus收益；未到或未胜幕末牌组及资源；V6-build entries/jev_answer/fallback/unknown：冻结无匹配。

### NYX17B18TBWG

- 流派/转向：F1—F6猎杀者/回响斩击/翻越撑击即时群攻过渡；F8拿致命毒药时计划转P；F12孵蛋、F15毒雾、F16升级，后萎靡与多后空翻补防，仍缺永久敏捷与毒加速。
- 核心首次齐备：P缺触媒/步法，D无双步法，S/R无完整组件；完整核心首次齐备未知。局部毒雾+毒药+减力+后空翻在F18四升级后可观察，不等于形成完整毒防。
- 首次尝试与Boss：F17同族首试9回合胜20血；F22首试T8预判死、次试T5胜12血；F25首试6回合胜21血。F27首/次/三试T7/T6/T6预判死、第四试T6死亡。 第二幕Boss与第三幕双王未到，未知；F27实际遭遇虱虫，Jev题面标elite；原计划称下一普通战，房型文字不代遭遇危险度。
- 死因/关键赢战失血：虱虫之祖（LOUSE_PROGENITOR）；F27第4次T6为5血11挡对19攻击，敌68血5挡、10力量且虚弱3，玩家脆弱1；结束后玩家0、敌67。 F17同族53→20获胜；幕间到60，F19地道虫60→39，F20盛碗虫39→33；F22寄生惧魔/胧光怪首试到4后重载，次试33→12胜且用完迅捷/能量药；F23购敏捷药、F24治疗12→33；F25啃咬机33→21并饮敏捷药；F27战前已有小血瓶，地图21到战斗首帧23，四试均23、空药。
- 第1幕末：s540529，20/70、药槽[]；牌组STRIKE_SILENT×4；STRIKE_SILENT+×1；DEFEND_SILENT×5；NEUTRALIZE×1；SURVIVOR×1；ASCENDERS_BANE×1；PREDATOR+×1；ECHOING_SLASH×1；FLICK_FLACK×1；DEADLY_POISON×1；EQUILIBRIUM×1；DEFLECT×1；POISONED_STAB×1；BYRD_SWOOP×1；PIERCING_WAIL×1；BACKFLIP×1；NOXIOUS_FUMES+×1；MALAISE×1。
- 第2幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 第3幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 计划/预测/后继：F25计划下火前一普通战、维持无精英双火路线；F27实际虱虫之祖，不能用路线房型文字替实际遭遇。末试T5 Jev答plan1但SL探索改plan2：原预测推进36，实际异鸟/打击/生存者推进22（含后继2毒），不能把16点进度差归Jev原选失误。；各原检查点、endgame、完整选择/备选/理由与construction-log历史在主JSON，不把计划当能力或短理由当结论。
- 账本：新增无；更新silent-0020、silent-0493、silent-0316；只加support，不强判重犯。
- 未记录：准确对局源码SHA/release_id与自有游戏版本；F1开局选择observed_ts之前的原始state资源快照；与本批同前缀/同资源人类赢家可比组及偏离收益；未走线/未拿/未锻造/未留药的真实反事实收益；逐伤害来源总伤、自伤与回复的完整分解；Boss需要/估计/实打同起点完整配对误差；完整最优击杀顺序/focus收益；未到或未胜幕末牌组及资源；V6-build entries/jev_answer/fallback/unknown：冻结无匹配。

### 7UEFJY5Z4Y85

- 流派/转向：第一幕群伤/药瓶过渡，直到F17拿余像时计划首次转P；F21购步法，F23迷雾+、F29商店购触媒；第三幕用三许愿检索毒防，仍是毒触媒与步法余像混合，不以刀刃陷阱倒填S。
- 核心首次齐备：第二幕F29 SHOP s541234首次同持P-toxin-footwork、P-flask-afterimage、P-flask-footwork具名四牌签名；这是持有齐备，非全部已施。F45末试步法T1建立2敏捷，但余像与触媒直到死亡都未建。
- 首次尝试与Boss：F17同族10回合胜6血，F30产卵虫组7回合胜9血，F33知识恶魔10回合胜34血；F45实际死亡，无该战SL条目。 第三幕双王未到，未知；不能把F45终局牌组/HP写成幕末。
- 死因/关键赢战失血：灵魂枢纽（SOUL_NEXUS）；F45 T6为8血12挡对21攻击，敌197血13毒；结算后玩家0、敌184/254。 F13多尼斯异鸟51→31，F17同族61→6胜；F25休息51→70后事件至65，F28蜂群术士65→17胜，F30产卵虫组17→9胜；F32休息9→30并获药，F33缩放仪开场55，知识恶魔55→34胜。第三幕失9上限到61；F38构装体61→19，F40回42、F42回60，F43猫头鹰法官60→40胜且用尽复制/明耀，F44治疗并弃铜液获毒药水/技能药，58/61进F45。
- 第1幕末：s541080，6/70、药槽[]；牌组STRIKE_SILENT×5；DEFEND_SILENT×5；NEUTRALIZE+×1；SURVIVOR×1；ASCENDERS_BANE×1；LEADING_STRIKE×1；BOUNCING_FLASK+×1；DAGGER_SPRAY+×2；PIERCING_WAIL×1；BACKFLIP×1；DRAMATIC_ENTRANCE×1；ESCAPE_PLAN×1；DEADLY_POISON+×1；AFTERIMAGE×1。
- 第2幕末：s541376，34/70、药槽[[0, 'STABLE_SERUM']]；牌组STRIKE_SILENT×2；DEFEND_SILENT×5；NEUTRALIZE+×1；SURVIVOR×1；ASCENDERS_BANE×1；LEADING_STRIKE×1；BOUNCING_FLASK+×1；DAGGER_SPRAY+×2；PIERCING_WAIL×1；BACKFLIP×2；DRAMATIC_ENTRANCE×1；ESCAPE_PLAN×1；DEADLY_POISON+×1；AFTERIMAGE×1；HIDDEN_DAGGERS×1；FOOTWORK×1；HAZE+×1；ULTIMATE_STRIKE×1；ACCELERANT×1；CLOAK_AND_DAGGER×1；PIERCING_WAIL+×1；KNIFE_TRAP×1。
- 第3幕末：未到/未过幕末，牌组、HP/maxHP与药水未知；不得以终局回填。
- 计划/预测/后继：F20改线预测F28精英65，F28实65；F25更新后预测F32约32，F32题前实9，期间两赢战净损48/8，不能将旧预测当后继。F32治疗实际30，Boss开场55与理由相符。F44保留路线预测58优于另路47，实入F45为58，但另一条未走，不能给路线收益11。F45 T5毒药水原题效果未模拟/留药价值未知，喝后重规划；实毒+6，最终仍败。；各原检查点、endgame、完整选择/备选/理由与construction-log历史在主JSON，不把计划当能力或短理由当结论。
- 账本：新增无；更新silent-0020、silent-0493、silent-0352；只加support，不强判重犯。
- 未记录：准确对局源码SHA/release_id与自有游戏版本；F1开局选择observed_ts之前的原始state资源快照；与本批同前缀/同资源人类赢家可比组及偏离收益；未走线/未拿/未锻造/未留药的真实反事实收益；逐伤害来源总伤、自伤与回复的完整分解；Boss需要/估计/实打同起点完整配对误差；完整最优击杀顺序/focus收益；未到或未胜幕末牌组及资源；V6-build entries/jev_answer/fallback/unknown：冻结无匹配。

## 原文覆盖、数字与执行核回

- evidence-summary.json是初始事实索引；v6-evidence/evidence-manifest.json实际已读。v6-build冻结64753212字节、全流SHA 1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3，本批均无匹配；不能补entries/jev_answer/fallback/unknown为0，也不称V6未启用。配置on与生成/采用/执行/收益分别验收。
- 每个stream按自身冻结切点读取；evidence_summary、extract_evidence和后续流式抽取切点不是同一时刻，全部原cut保留；本批相同原行SHA核同，未越局号。selected-records.json/state-index.json记录显式run_id；Jev只用显式run_id或decisions精确decision_id关联，正文/时间邻近/question_id不算身份。全局坏行仅报告原manifest，不归成本批错误。
- deepseek-reasoning按五局各自首末决策时间窗流式抽取，均0匹配；没有run_id，不能当作局身份来源。associated-events.json也保留无run_id精确decision_id补联0的结果。
- states全局流式抽中五局1180/645/382/579/799帧；只把有限关键窗口与结构化结果给模型，未整份states灌入。resource_chain五局25/18/11/18/18个逐试战斗窗；包括赢战、SL预判死、真实死亡和缺退出情况，未自动把首末差叫敌人总伤害。完整逐体/逐轮净HP推进与缺口在各run-resources.json，宏观关键资源追溯在逐局小节。

| 局号 | Jev请求/答案/error | 完整题面读/未全文读 | 低信心<0.35 | 答案选rollout最优或并列/可比题 | HP护栏 | 含自主代码战斗动作的回合 |
|---|---|---|---|---|---|---|
| 4CR2N26QAJAV | 253/245/8 | 1/252 | 40 | 192/200 | 4 | 160 |
| Q7HBKHZTSPJ8 | 100/100/0 | 1/99 | 16 | 81/84 | 0 | 90 |
| FVWXPGMA2DBQ | 64/64/0 | 1/63 | 7 | 54/55 | 1 | 71 |
| NYX17B18TBWG | 114/112/2 | 1/113 | 11 | 90/92 | 0 | 94 |
| 7UEFJY5Z4Y85 | 169/165/4 | 1/168 | 17 | 131/132 | 0 | 101 |

- 全部题号、原始offset/bytes/SHA与未读原因在question-coverage.json；完整读的五题各自request、所有候选、答案/error及decisions chosen/result/gate_reject/selection_dispatch、后继在question-readbacks.json。未读题仅机械计数/局部字段，不能称通读每道题或以末五条冒完整覆盖。focus独立题均0；完整杀序收益未记录。
- 核回重点：4CR F49末T8预测43挡/零损/推进20与实盘核同，T9仍死；Q7 T5预测28挡实际21（当前轮均零损、推进22）；FV T8预测13挡/零损/敌31核同却T12死；NYX Jev答plan1后SL改plan2，实际推进22不冒原答推进36；7UE T5药水效果未模拟，实毒4→10，后继仍死。答对模型最优不等执行了原整线，更不等整战正确或自然收益。
- raw decisions decider计数与runs元数据/自动笔记的jev-plan分类分别保留：raw code包含续行动；回合数排除plan-continue并按floor/sl_attempt/turn去重，仍可与Jev共享，不叫代码独占回合。pending回执依后继核实；没有gate_reject不代表执行收益已验证。
- 所有支撑原行按offset/bytes/SHA重读验证（raw-ref-verification.json）；死因血/挡/攻击/后继、士兵逐步挡值、F29齐持/末战未建专项核验fact-verification.json通过。追加后逐节重新rg关键数字与原帧核回、唯一标题及原稿字节核同，completion-verification.json无不一致，无需勘误；既有lessons和ledger原前缀SHA未变。

## 账本与代码提案交接

- 新增账本0；18次证据update涉及9个旧ID，旧claim/status/prior/证据/反例/置信度保持；仅Q7对silent-0179标repeat（原0/3敏捷修补之外），其余support。各局ledger.py find已保存读回，ledger.py check退出0。无新的纯基础设施bug；不改notes/fix-queue.md。
- silent-proposal-aafb1318550a5c2c：combat，账本0179/0180，Q7 F33第4试T5；[提案](/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/proposal-paels-legion-dex2.md)。当前live combat-plan.ts:5162仅认0/3敏捷，新增2敏捷14+7实帧。独立strategy-proposal固定复现后才可窄扩；样本n=1、对局SHA未知，不许推出任意敏捷或胜率/整战可赢。
- silent-proposal-480788e8717544b1：potion/terminal，账本0020/0493/0352，五局资源链；[提案](/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/proposal-resource-playbook-followup.md)。保留旧用药/终局规则，不改成本/阈值；正式文字补充与消费者用例由独立strategy-proposal处理，证据不足可waiting。
- 两项均经code_proposals.py add登记，state=pending、target_task=strategy-proposal；没有implemented_commit，未冒称shipped或自然消费。策略/rk与旧244条经验没有直接改写；旧条目只关联相关父剧本/候选，不全量回刷。没有提交/推送或代码实现；只读复盘无需生产tsc/vitest，已做固定原日志数据核验。

## 文件与完成核验

- 复盘：/home/dw/Projects/agent-sts2/notes/lessons.md，本批五个唯一标题。
- 主产物：/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/whole-run-summary.json；/home/dw/Projects/agent-sts2/learner/runs/20261025-001326-6bdfa98a-ce08-432a-8f76-8eecd8888269-postmortem/playbook-rk-candidates.json。
- 证据：evidence-summary.json、v6-evidence/evidence-manifest.json、input-receipts.json、question-coverage.json、question-readbacks.json、五个资源链文件；过程脚本/失败日志与中间结果保留。
- 检查：fact-verification.json、raw-ref-verification.json、completion-verification.json、ledger-check.txt。记录泄露扫描回执另在record-gitleaks.json/record-gitleaks-receipt.json；完成返回前核实际退出码。

