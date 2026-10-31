# #51 priority25 外部拿牌候选报告

批次 `20261024-083104-strategy-proposal`；角色 Silent A10；HEAD/dispatch_base `5befa2c600bfc7e86c9c9e4d26ad903408c80d07`。

25/25逐卡processed：24新增策略候选、1复用/补充既有DEADLY_POISON ID、0整卡waiting。所有候选formal_publication=pending、consumer_readback=pending。低支持或单侧子组仍跳过；候选完成不代表正式发布、自然采用、收益或科学父关闭。

## 输入与边界

来源 external:sts2fun；采集/下载2026-10-21；https://sts2.fun/static/sts2_public.db.zst；数据库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。manifest SHA `d179ceb0c475e2d8a3372c7709672c6c99238e7f288a9c77666a4953eea69d2d`。20个精确输入逐项字节/SHA通过，详binding-audit.json。

learn.json本批external_source与冻结绑定核同，HEAD未移动。081200合同不在dispatch Git树中，按绑定project_root路径只读并核85474字节及SHA，未把缺副本当缺证。未读取原始数据库/逐玩家记录、未下载、未调用其他模型或游戏。旧STATE的停用/无live描述已被同文件末尾及最近decision-log后续状态覆盖；本批仍只按冻结任务写scratch。

#27/#42：只做card_reward文字候选、外部证据分账、无虚构run/floor、保留反例与分母；不迁移旧自身条目。#28：本数据无原战斗状态、候选动作或两臂结果，不造rk/出牌规则。冻结081200的三条候选与更早BLADE_DANCE原件完整保存在prior-candidates-preserved.json；本25只命中DEADLY_POISON，同ID保原strategy/trigger/confidence/evidence，另加审计附件。其他24仅在已提供冻结范围内未见同场景；发布时仍核最新正式库，不声称全库最新去重完成。

## 统计口径

- 外部自选上传、观察性；玩家/技术/SL/路线/备选牌/决策时状态未调整，不能推因果收益或必拿顺序。
- 每格distinct_uploaded_runs仅格内去重；同局可跨拿/不拿及多个前缀格，玩家独立数未知，不求和。
- 前缀只含此前奖励拿牌；漏初始、删改、事件/商店及升级，同节点选择不互作前缀，不是完整牌组。
- 每格至少10上传局是数据量过滤；缺失低支持格未知，不填0；多房间节点未归因，覆盖不全。
- Boss仅后续同幕或更晚幕的到达机会；不是通过率、指定Boss、双Boss顺序或战前准备度。
- 版本逐版分账；探索多个重叠格有多重比较，不据符号数投票、外推或升级可信度。

每格同时列：拿/不拿的去重上传局胜/败/n、重复机会胜/非胜/n、后续Boss到达/机会n。5个cohort分别为v0.107=2932、v0.108=683、v0.109=583、v0.110=411、v0.111=1739上传局；这些只是全cohort，不充当每牌分母。

95% Wilson区间仅为每格去重上传局的名义二项描述区间；未调整同玩家多局相关、上传选择和多重比较，不是总体/因果区间。
拿与不拿组可含同一上传局，交集及玩家聚类未知；不能按两独立样本给差值区间。
同局重复机会，缺逐局/玩家聚类信息；不套独立二项区间。

主格按priority指定幕（all则各幕）中两臂最小上传局n最大选取，等分按前缀张数/幕/字典序，未以效应最大选主格。反例格先在相同指定幕范围内找符号反向，再取支持较大者；没有反向则报下一格。反例筛选是探索，所有格原行/指针/分母保留，符号数不构成独立检验。

## 25张逐卡处置

表中胜为去重上传局胜/n；Boss为后续到达/重复机会n。完整胜/败、名义区间、所有版本/幕/前缀及缺失原因见evidence/<CARD>.json。

|序|卡 / 去向|主格：拿 / 不拿|对照或反例：拿 / 不拿|处置|
|---|---|---|---|---|
|1|ACCURACY / `silent-brain-accuracy-external-prefix-context`|幕2/奖励前缀含BACKFLIP：拿31/61胜，Boss到达57/65机会；不拿27/75胜，Boss到达65/79机会|幕2/奖励前缀含LEADING_STRIKE：拿37/80胜，Boss到达81/86机会；不拿21/44胜，Boss到达47/51机会|新增候选|
|2|POISONED_STAB / `silent-brain-poisoned-stab-external-prefix-context`|幕1/奖励前缀0张：拿8/49胜，Boss到达41/49机会；不拿33/111胜，Boss到达98/112机会|幕1/奖励前缀4张：拿5/16胜，Boss到达16/16机会；不拿52/177胜，Boss到达172/185机会|新增候选|
|3|INFINITE_BLADES / `silent-brain-infinite-blades-external-prefix-context`|幕1/奖励前缀3张：拿13/43胜，Boss到达41/43机会；不拿14/56胜，Boss到达49/56机会|幕1/奖励前缀4张：拿10/36胜，Boss到达34/36机会；不拿10/30胜，Boss到达27/30机会|新增候选|
|4|BUBBLE_BUBBLE / `silent-brain-bubble-bubble-external-prefix-context`|幕2/奖励前缀含BACKFLIP：拿10/25胜，Boss到达21/25机会；不拿43/82胜，Boss到达82/90机会|幕2/奖励前缀含DEADLY_POISON：拿9/20胜，Boss到达17/20机会；不拿11/30胜，Boss到达26/30机会|新增候选|
|5|MALAISE / `silent-brain-malaise-external-prefix-context`|幕1/奖励前缀7张：拿8/22胜，Boss到达18/22机会；不拿11/32胜，Boss到达25/32机会|幕1/奖励前缀含LEADING_STRIKE：拿4/22胜，Boss到达20/22机会；不拿18/36胜，Boss到达32/36机会|新增候选|
|6|PHANTOM_BLADES / `silent-brain-phantom-blades-external-prefix-context`|幕1/奖励前缀含DAGGER_SPRAY：拿12/34胜，Boss到达35/38机会；不拿10/32胜，Boss到达33/34机会|幕1/奖励前缀6张：拿8/29胜，Boss到达29/29机会；不拿7/23胜，Boss到达24/25机会|新增候选|
|7|MIRAGE / `silent-brain-mirage-external-prefix-context`|幕2/奖励前缀含SNAKEBITE：拿4/22胜，Boss到达15/22机会；不拿17/58胜，Boss到达55/63机会|幕2/奖励前缀含DEADLY_POISON：拿7/18胜，Boss到达11/18机会；不拿11/32胜，Boss到达27/34机会|新增候选|
|8|BLADE_OF_INK / `silent-brain-blade-of-ink-external-prefix-context`|幕2/奖励前缀含FOOTWORK：拿24/39胜，Boss到达36/39机会；不拿21/35胜，Boss到达33/35机会|幕1/奖励前缀含LEADING_STRIKE：拿12/34胜，Boss到达30/35机会；不拿14/29胜，Boss到达27/29机会|新增候选|
|9|SKEWER / `silent-brain-skewer-external-prefix-context`|幕1/奖励前缀0张：拿3/10胜，Boss到达9/10机会；不拿5/29胜，Boss到达25/29机会|幕1/奖励前缀1张：拿3/10胜，Boss到达9/10机会；不拿17/57胜，Boss到达50/58机会|新增候选|
|10|BLUR / `silent-brain-blur-external-prefix-context`|幕2/奖励前缀含LEADING_STRIKE：拿25/54胜，Boss到达51/57机会；不拿23/53胜，Boss到达52/57机会|幕2/奖励前缀含SNAKEBITE：拿15/39胜，Boss到达38/42机会；不拿17/41胜，Boss到达42/47机会|新增候选|
|11|BOUNCING_FLASK / `silent-brain-bouncing-flask-external-prefix-context`|幕1/奖励前缀0张：拿9/27胜，Boss到达24/27机会；不拿9/32胜，Boss到达25/32机会|幕1/奖励前缀含LEADING_STRIKE：拿9/27胜，Boss到达27/27机会；不拿25/62胜，Boss到达62/65机会|新增候选|
|12|KNIFE_TRAP / `silent-brain-knife-trap-external-prefix-context`|幕2/奖励前缀含BACKFLIP：拿19/33胜，Boss到达33/33机会；不拿16/32胜，Boss到达27/32机会|幕1/奖励前缀含LEADING_STRIKE：拿14/36胜，Boss到达30/36机会；不拿8/20胜，Boss到达20/21机会|新增候选|
|13|HAZE / `silent-brain-haze-external-prefix-context`|幕1/奖励前缀1张：拿4/19胜，Boss到达14/19机会；不拿14/54胜，Boss到达43/54机会|幕1/奖励前缀含SNAKEBITE：拿7/19胜，Boss到达19/19机会；不拿15/48胜，Boss到达48/50机会|新增候选|
|14|LEADING_STRIKE / `silent-brain-leading-strike-external-prefix-context`|幕1/奖励前缀1张：拿55/123胜，Boss到达115/123机会；不拿29/92胜，Boss到达82/96机会|幕1/奖励前缀4张：拿18/64胜，Boss到达62/64机会；不拿33/101胜，Boss到达106/111机会|新增候选|
|15|NOXIOUS_FUMES / `silent-brain-noxious-fumes-external-prefix-context`|幕2/奖励前缀含SNAKEBITE：拿23/62胜，Boss到达56/65机会；不拿29/75胜，Boss到达76/87机会|幕2/奖励前缀含BACKFLIP：拿21/41胜，Boss到达40/45机会；不拿47/106胜，Boss到达104/120机会|新增候选|
|16|WELL_LAID_PLANS / `silent-brain-well-laid-plans-external-prefix-context`|幕1/奖励前缀含BLADE_DANCE：拿20/35胜，Boss到达32/35机会；不拿5/17胜，Boss到达11/17机会|幕1/奖励前缀含SNAKEBITE：拿11/28胜，Boss到达23/28机会；不拿6/14胜，Boss到达12/14机会|新增候选|
|17|DEADLY_POISON / `silent-brain-act1-deadly-poison-prefix-context`|幕1/奖励前缀0张：拿20/77胜，Boss到达62/77机会；不拿47/123胜，Boss到达108/124机会|幕1/奖励前缀含SNAKEBITE：拿13/35胜，Boss到达34/35机会；不拿33/117胜，Boss到达140/146机会|复用并保原证据|
|18|ACCELERANT / `silent-brain-accelerant-external-prefix-context`|幕2/奖励前缀含SNAKEBITE：拿17/40胜，Boss到达39/42机会；不拿34/84胜，Boss到达83/91机会|幕2/奖励前缀含BACKFLIP：拿15/33胜，Boss到达29/33机会；不拿47/101胜，Boss到达110/120机会|新增候选|
|19|BURST / `silent-brain-burst-external-prefix-context`|幕1/奖励前缀含SNAKEBITE：拿7/17胜，Boss到达12/17机会；不拿17/39胜，Boss到达34/39机会|幕1/奖励前缀含PIERCING_WAIL：拿7/15胜，Boss到达13/15机会；不拿15/41胜，Boss到达33/41机会|新增候选|
|20|SUCKER_PUNCH / `silent-brain-sucker-punch-external-prefix-context`|幕1/奖励前缀0张：拿5/25胜，Boss到达22/25机会；不拿48/140胜，Boss到达120/141机会|幕1/奖励前缀4张：拿5/14胜，Boss到达13/14机会；不拿43/161胜，Boss到达153/167机会|新增候选|
|21|ABRASIVE / `silent-brain-abrasive-external-prefix-context`|幕1/奖励前缀含LEADING_STRIKE：拿9/26胜，Boss到达26/27机会；不拿11/23胜，Boss到达20/23机会|幕1/奖励前缀含PIERCING_WAIL：拿13/28胜，Boss到达26/28机会；不拿9/21胜，Boss到达20/22机会|新增候选|
|22|SHADOWMELD / `silent-brain-shadowmeld-external-prefix-context`|幕1/奖励前缀含BACKFLIP：拿4/14胜，Boss到达14/14机会；不拿24/48胜，Boss到达40/49机会|幕1/奖励前缀含SNAKEBITE：拿5/12胜，Boss到达12/12机会；不拿15/44胜，Boss到达38/46机会|新增候选|
|23|OUTBREAK / `silent-brain-outbreak-external-prefix-context`|幕1/奖励前缀含SNAKEBITE：拿8/31胜，Boss到达29/31机会；不拿7/22胜，Boss到达20/22机会|幕1/奖励前缀7张：拿8/17胜，Boss到达16/17机会；不拿12/29胜，Boss到达26/29机会|新增候选|
|24|BACKFLIP / `silent-brain-backflip-external-prefix-context`|幕2/奖励前缀含LEADING_STRIKE：拿56/126胜，Boss到达135/144机会；不拿58/138胜，Boss到达156/177机会|幕2/奖励前缀含INFINITE_BLADES：拿18/48胜，Boss到达46/54机会；不拿24/62胜，Boss到达71/82机会|新增候选|
|25|DAGGER_SPRAY / `silent-brain-dagger-spray-external-prefix-context`|幕1/奖励前缀0张：拿20/83胜，Boss到达74/83机会；不拿21/83胜，Boss到达68/84机会|幕1/奖励前缀1张：拿17/60胜，Boss到达55/60机会；不拿37/133胜，Boss到达119/139机会|新增候选|

## 逐版覆盖（格不相加成独立局）

每格写成配对前缀格数/单侧待证格数；全量数值见对应审计文件，未把旧版与v0.111合并。

|卡|v0.107|v0.108|v0.109|v0.110|v0.111|
|---|---|---|---|---|---|
|ACCURACY|150/82|32/68|15/71|1/44|144/54|
|POISONED_STAB|32/225|3/195|2/193|0/157|11/229|
|INFINITE_BLADES|113/118|14/100|3/98|0/82|126/77|
|BUBBLE_BUBBLE|96/122|6/88|2/63|0/28|52/146|
|MALAISE|67/61|3/17|2/10|0/2|41/57|
|PHANTOM_BLADES|120/110|25/88|6/98|1/56|147/54|
|MIRAGE|36/187|0/85|12/54|0/40|35/154|
|BLADE_OF_INK|84/37|4/11|2/9|0/2|50/41|
|SKEWER|4/231|0/126|0/116|0/75|2/207|
|BLUR|167/33|16/39|19/26|2/10|123/49|
|BOUNCING_FLASK|68/150|2/94|2/85|0/38|22/166|
|KNIFE_TRAP|64/57|3/22|1/14|0/1|50/34|
|HAZE|82/137|1/90|1/82|0/43|13/189|
|LEADING_STRIKE|170/80|46/142|36/135|10/155|151/85|
|NOXIOUS_FUMES|156/68|26/59|8/73|0/43|122/80|
|WELL_LAID_PLANS|182/44|36/33|1/12|0/2|32/50|
|DEADLY_POISON|89/162|12/183|5/180|4/142|53/183|
|ACCELERANT|51/86|0/24|13/93|3/55|79/127|
|BURST|61/60|0/16|0/12|0/6|23/71|
|SUCKER_PUNCH|78/174|7/182|2/189|0/161|25/222|
|ABRASIVE|83/32|2/20|4/12|0/2|50/39|
|SHADOWMELD|43/99|0/29|0/16|0/0|6/98|
|OUTBREAK|55/181|1/108|3/128|0/0|32/65|
|BACKFLIP|223/19|107/39|109/56|59/40|204/17|
|DAGGER_SPRAY|56/199|13/184|7/182|3/164|34/210|

## 缺口与交付状态

- 所有25张均有可比较格，但单侧格逐项保留waiting原因；某格/幕完全不在表中不能按0局0收益解读。旧#24自身频率仅选题，runs=[]，不计mixed支持，不提高可信度。
- #50双Boss准备度waiting：缺指定双Boss身份及顺序、实际战前牌组/HP/药水、两战资源续接和结果。本批有的只是后续same_or_later_act到达机会，不推出Boss胜率或安全线；没有额外encounter-rk授权输入。
- 候选全文与证据超过4096字节运行封包预算（精确下界见runtime-budget.json，尚未计派生summary）。因此保存完整候选而不截断反例/分母；另有25份精简封包草稿已静态检查，正式发布仍须实际消费者校验，不把文件存在当消费者可读或自然使用。所有natural_query_count=null。
- 无源码或正式知识变更，无commit/main/live合入，无发布号、无正式账本/请求/ACK变更。tsc/vitest/cases=null；本批仅做固定聚合的结构、算术、SHA及候选覆盖核验。

## 产物

- candidates.json及candidates/<CARD>.json：25条完整候选（含1旧ID保原文复用）。
- evidence/<CARD>.json：五版本全部相关原聚合行、精确JSON指针、胜败/机会/Boss分母、名义区间、配对与逐项缺证。
- dispositions.json、source-ledger.json：25张卡逐项去向及scratch来源账本，不修改正式学习账本。
- binding-audit.json、runtime-budget.json、prior-candidates-preserved.json：精确输入核验、预算阻塞与旧候选保全。
- result.json：与最终回复相同的机器结果；analyze.py可只用绑定聚合重建。

## 交回原发布链的下一步

原owner依据本批证据选择有界场景封包，沿既有发布锁/正式学习账本核最新库去重与冲突；保留所有反例和各自分母，再做正式消费者读回及后续自然查询/采用观察。#27/#28/#42/#50与学习科学父均未关闭；本报告不能替代这些回执。

## 精简封包草稿（仍未发布）

compact-candidates.json及compact-candidates/<CARD>.json保存25份封包草稿。按冻结契约构造的摘要/notice一并测量为3672–3805字节，每份预留256字节后仍≤4096；compact-budget.json逐项记录。这里是静态契约测量，不是生产loader、真实消费者或自然查询回执。

每个场景使用一个明确的拿减不拿“机会胜率差”统计，分母是该场景两臂机会数之和，criteria保留两臂最终胜机会/机会数；该分母绝不是独立局数。策略正文保留两臂去重上传局胜/n和Boss到达/机会n，主格与反例均在。独立玩家、跨臂局交集、因果差值区间仍未知。完整逐臂统计、原行指针、输入SHA及旧候选原文继续保留在full candidates和evidence附件，不被精简稿覆盖。

第一次精简尝试仍超预算，原测量保留于compact-budget-first-attempt.json；本次只缩短重复字段并把两个逐臂统计汇为同场景明确口径的机会差，未修改观测数据或删除反例。运行复现顺序：analyze.py → prepare_compact.py → verify.py。

## 最终固定数据核验

verification.json记录通过：20个冻结输入、25张卡、20163条原聚合行逐指针对照、4654个配对子组、10855个单侧缺证子组（格数不是独立样本数）。24新增/1复用、完整与精简JSON Schema、原候选字面保全、静态预算均通过。10,855个单侧格逐项skip subgroup并保缺证理由；0整卡waiting，不抹去未覆盖幕/低支持/玩家与真实牌组缺口。

实际HEAD仍为dispatch_base，git status与git diff --binary均空。此处只做数据/格式核验，没有跑tsc/vitest、生产消费者或自然查询；tests各值保持null。
