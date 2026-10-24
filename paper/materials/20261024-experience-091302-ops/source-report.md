# 2026-10-24 静默猎手 第二百零五次增量：10 局 A10（version 2026-10-24.3草稿，分支 exp，未提交）

### 来源

- 批次2c0cf792-6128-4fec-b4a2-9c70e9f935f1，独立完成、不派下级、不联网、不运行play。开工工作区干净，git merge main无冲突，基线cca325612dcc816d4871cb45c6cb96e91a62032a。只改本树silent/experience.json，未修改打法源码或其他角色知识。
- 十局均由runs.jsonl显式SILENT、A10、ended非空核实，均最终失败，跳过0；完整局号/结束时刻在runs-verified.json，逐局复盘原件在lessons-*.txt，勘误保留。统计截至DGLWTQGRAT1T于2026-10-17T23:07:08.362Z结束；物理日志另冻结切点，不将后续局加入本批统计。
- 改前本树2026-10-24.2，SHA 6034dc5b70ab3d9227a8351cf80df3aee359dbd3990b0923ebc4db43f5fe424b；其源2c4c541fb已在main。live开工仍2026-10-24.1，SHA 161164c9ed4ccb4a4b3a4875ff6e4ceb2fc570c6fc64637b58817733d8f927c2。两份原件/条目清单已留存；所有live ID和证据均保留，未用旧库覆盖并行更新。本批仅.3草稿，不冒称旧.2或当前live发布为本批发布。
- 全历史补充请求state=done且dispatch_runs不同，不承接、不重跑原专题。experience-integration.json保存请求SHA、12项账本→经验→提案→source_commit=null→actual_live=null、旧新diff及失败/渲染出处。根公共回填请求不存在，不关闭其他学习父。
- 旧路线分母291局先复算，207个进阶/幕/房型/血档组与上一节全部一致；十局与旧库重叠2PQ/J2两局，仅净增8局，合并299局（A10 251→259）。4153→4237战斗房、279→287实际死亡；本批111房、10死。房首HP−最终退出HP为净损，含恢复/上限等，不冒称敌总伤；SL合一房且不叠加恢复。Monster/Unknown分账，391处房型由原地图动作/状态补定、未解0；参见states-audit、room-type-correction、route-statistics和node-next-summary。节点可指同一后继战，不相加为独立样本，路线收益为观察。
- 机械提证实际完成。V6-build冻结64753212字节、689行，全批no_match，输出空文件SHA e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855；11条run-config皆V5/shadow，没有本批V6 entries/jev_answer/fallback/unknown可归属，不把缺流/无匹配填成已采用或收益0。Jev 1330请求、1244有answers、86有error，错误与成功答案分列；decision显式run/fingerprint或精确decision_id关联，不以正文/时间/question_id近似归局。各流source_size/source_sha、offset/bytes/SHA和身份出处在v6-evidence/evidence-manifest.json；decisions全流未知身份1934、无匹配decision_id1779仍保留，不强归本批。
- 完整逐字核读题面/答案为d428196（559能力药）、d428650（U6千足虫T6）、d430498（DGL逃脱升级）；原字节独立seek/SHA复核于jev-raw-*.json，chosen/result/gate_reject/selection_dispatch与后继在question-execution-windows、mechanism-pairs、resource-mechanism-raw和turn-panels。d427760只核相关字段/SL差分，未称整题读完；其他1326条未逐题通读，原因是本批定向补证，未用其证明采用或收益。逐条覆盖及错误在jev-coverage.json，不把最后五条当完整覆盖。

### 对照数据检查的主题

| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 路线低血 | A10二幕Monster <25%旧36房/32局19死，新38房/34局21死（55.26%），存活净损中位6 | 新两场均死亡，观察不证明替路因果 |
| 营火 | 41次选择，33HEAL/8SMITH、真实回血792；9W F16请求超时仍34→55 | 初次completed过滤漏21；原40/32/771留存并用独立勘误提案更正 |
| SL | 本批10重打房48试1房胜；累计279/1220/94→286/1256/94 | 唯一胜为2PQ双蟹第四试，多处改线，且该房已在旧分母；不归单变招 |
| 敏捷 | U6 T5三敏两牌8+9=17；T6 8+17=25对26损1 | 已建与实际牌挡分开，不保证每轮有挡 |
| 力量与吸取 | NRZ双击随3→6力从5×2→8×2；KCA负4敏两牌1+4=5 | 多击逐段，减益后实际防御重算 |
| 触媒 | DGL末三轮7+6、5+4、3+2毒共27，直伤8、139→104 | 多结次数不等毒层倍增，滑溜限伤另核 |
| 暂死/重接 | U6实重接2×25，150+50−164=36仍存活 | 暂死不预支永久安全，不定杀序 |
| 固化 | KCA六次5/6/6/10/6/3→15/18/18/30/18/9，六试全败 | 当前挡三倍，不清负敏或给后轮三倍 |
| 爆发/绷带 | 2PQ T2耸肩重放0→22，准备两弃再22→28 | 重放牌效与实弃3/牌分源 |
| 余像/药序 | 559先建后两攻击多2挡，SL后建只10非12；同伤65、四败 | 药水不触发出牌挡，早喝整胜未知 |
| 加湿器 | U6四次26/29/32/34共121、上限各+5；锻造不回 | 基础回血/上限/事件/跨幕分账 |
| 升级逃脱 | DGL原题预计15挡损4，实际攻击抽牌不加挡、实损9；敌扣23同 | 旧0296升级覆盖证据沿原提案，不能说多5血便过后战 |

### 经验库自己带偏或写了没被执行的地方

559原答p0（.61），SL先三攻击再喝能力药/建余像，真实后继只余喝毒，原题已有前三试12/12/10挡。完整题面存在不等采用，生成药牌未出不当伤害。U6原题已带步法、重接和触媒经验；T6实25挡/损1与当轮预测相符，6/6抽样死和持有触媒均不证明必败或已建。DGL原题引用触媒、群蛇与蟾蜍经验，Jev .96选plan1，升级逃脱却被模型多计5挡；这是模型/升级条件覆盖，未找到足以认定经验文字把玩家带偏的新因果证据。0N原防守线被SL换，抽弃后又重算，原14伤损9替线与最终12伤损6也不是同一完整线。所有相关回执state_effect_verified=false/whole_plan_executed=null保留；无本批DeepSeek实际原话，兼容字段/职责名不冒认引擎。

### 机制推理

| 机制/条目 | 推理与搭配 | 证据（支持/反例、进阶） | 典型案例 |
| --- | --- | --- | --- |
| 灵动步法 → silent-footwork-block | 步法普通/升级建2/3敏，只加后继牌挡，不补旧挡。机制：基础加敏后核脆弱/倍率/禁挡，换战重建。搭配：合法挡牌与启动血价同核。决定胜负的战斗：167支持/0反例，单因未控。 | 167/0，asc=[0, 20]，新证A10 | U6JELGQTBMHN千足虫T5建3敏当步仍0挡，防御8与斗篷9合17；T6防御8与扫腿17合25，对26仍损1。旧KAY522KT5NXR三牌3敏合27挡后胜；不能预支未抽到的挡牌。 |
| silent-strength-weak-observation → silent-strength-weak-observation | 力量逐攻击段计入，弱/易伤/取整读现场，毒另源。机制：临减到期恢复，不冻结成长；制品逐次拦减益。搭配：多段威胁、实挡与可活毒窗同核。决定胜负的战斗：280主题局，子公式非每局全验、单因未控。 | 280/0，asc=[0, 20]，新证A10 | NRZAYVRMM7M0同族末T3/6同一双击随力量3→6，从5×2变8×2、多6威胁；KCA04Q3SEYTF两次吸取后负4敏令后空翻1与生存者4只合5挡，仍死。旧XRCP2TKYKQBA神官三击随3/6力变18/27。 |
| 触媒 → silent-accelerant-triggers | 触媒增加毒结次数，不倍增毒层。机制：普通/升级建1/2，k层至多k+1结，每结减1；余血/限伤/换相另核。搭配：实补毒与可活结算窗，不预支持有组件。决定胜负的战斗：95主题局，单因未控。 | 95/0，asc=[0, 20]，新证A10 | DGLWTQGRAT1T虱虫末试三轮7+6、5+4、3+2共27毒，另直伤8，139→104仍死；墨影滑溜时两次毒各仅扣1。旧KF9HMZKTFC3V沙漏47毒三结138胜。 |
| 余像 → silent-afterimage-per-card-block | 余像建立后每层每次实出牌补1挡，首次自身不触发自己。机制：重放/牌挡/敏捷分源，药水不算出牌。搭配：启动费及合法后继同核，生成未施放不预支。决定胜负的战斗：50支持/0反例，单因未控。 | 50/0，asc=[0, 20]，新证A10 | 559UJVNHZ5NM啃咬机首两试先建余像再打中和/打击多2挡；末两试SL后移药与能力，只余喝毒、10挡而非12，同扣65且四试均败。旧K643VJCTQT0J建后0挡、后三牌补3。 |
| silent-lagavulin-siphon-poison-sl → silent-lagavulin-siphon-poison-sl | 族母吸取压低直伤与牌挡，已建毒独立推进。机制：已见玩家力敏各−2、敌力+2，负力量不减技能毒。搭配：实毒/实挡、临时药与后轮吸取合核。决定胜负的战斗：28支持/0反例，单因未控。 | 28/0，asc=[0, 20]，新证A10 | J2VR2DFJG8K4 T7/11两吸后负4力，T12串刺两段直伤14、毒25→34后清余21而胜35血；KCA04Q3SEYTF同两吸后末T13两牌只5挡、敌20攻，六试全败。未取得的能力不补算成长。 |
| silent-decimillipede-reattach-poison → silent-decimillipede-reattach-poison | 千足虫需伤只加实际重接，接续图标不当已回血。机制：复活HP/毒/力量按新帧核，暂死仅取消当轮攻击。搭配：逐段进度、实毒/实挡合核，不定固定杀序。决定胜负的战斗：19支持/0反例，单因未控。 | 19/0，asc=[0, 20]，新证A10 | U6JELGQTBMHN中/前段T4/5暂死，T6/7各重接25并清旧毒/力，150+50−164仍余36，末6血0挡对18死。旧E6DSUVTNVBMH五次重接125、实扣275胜损41；暂死不证永久减员。 |
| 爆发 → silent-burst-next-skills-replay | 爆发本轮让普通下一张、升级下两张技能各额外打一次。机制：技能只付一次费，重放牌效/弃牌/余像分别兑现，未用不跨轮。搭配：重放后抽弃与合法后继重核，消耗牌不凭同ID认无限回流。决定胜负的战斗：20支持/0反例，单因未控。 | 20/0，asc=[0, 20]，新证A10 | 2PQK67ULZY90组装师末T2爆发重放耸肩无视+，挡0→22；准备弃两牌由绷带另补6到28，非爆发固定多6。旧L704TLETMZBM升级爆发实重放两技能，抽牌受手位限、末仍败。 |
| 结实绷带 → silent-tough-bandages-discard-block | 结实绷带按玩家回合实弃每牌补3挡，不按持有预支。机制：敏捷/牌挡/余像分源，不外推回合末弃牌。搭配：抽弃与合法后继同核，被弃关键牌作用另账。决定胜负的战斗：6支持/0反例，单因未控。 | 6/0，asc=[0, 20]，新证A10 | 2PQK67ULZY90组装师末T2准备实弃两防御使22→28，T3无同样弃牌不能预支6；第三试T3虽弃两牌补6、共23挡仍4血对44死。旧K643VJCTQT0J弃五牌6→21，弃猎杀者所得3挡与少15伤另账。 |
| 石炉加湿器 → silent-stone-humidifier-rest-growth | 加湿器实际HEAL增5最大HP并补5当前血，锻造不触发。机制：基础回复+5按新上限截断，事件/其他上限另账。搭配：到火与已回血分开，最大血不等进战血。决定胜负的战斗：12支持/0反例，路线单因未控。 | 12/0，asc=[0, 20]，新证A10 | U6JELGQTBMHN四HEAL实回26/29/32/34共121、上限各+5；F25锻造不回，F27实48/97→82/102后千足虫仍败，未到两火不预支。旧XRCP2TKYKQBA四HEAL110、六试同族败。 |
| 固化药水 → silent-fortifier-existing-block-triple | 固化按饮用时已有挡变三倍，不预支后轮。机制：B→3B、当步加2B，敏捷先在牌挡形成时计入。搭配：当前实挡、攻击与药机会成本同核，不设必喝/留药阈值。决定胜负的战斗：21支持/0反例，药时整胜未控。 | 21/0，asc=[0, 20]，新证A10 | KCA04Q3SEYTF族母六试实5/6/6/10/6/3→15/18/18/30/18/9，末试负2敏防御3后饮只增6，12攻击仍损3，后轮负敏未清；六试均败。旧562GNK4ESMPE实9→27。 |

全历史定位在冻结17026867203字节中覆盖508个已结束Silent局/322708状态及3235条相关复盘原文行；33个旧典型帧重新seek核SHA，保存在historical-raw-readback.json。索引的“有能力”不是效果验证或获胜分母，未把508局都加成支持；原主题n和反例保留，未逐子公式穷尽重演全部旧战。部分旧案例只核能力/末态，限制保留，不冒称单因决定胜负。新证进阶A10，机制沿原范围、策略[8,20]，无新相反公式；失败不自动算机制反例。J5/559/U6/DGL勘误均保留，不沿旧错误时点造因果。

### 新增

0。

### 更新

12条均补独立证据，纯数字0；文字同时去重复/压短。开工58942>55000，先核21条n=1/low的具体scope/条件，没有可安全等价合并项；不为预算强合或提升置信。相关12条压缩后总长减少260，原lesson、证据与反例留before/changes，不删历史数字。条目明细如下。

| 条目 | 支持旧→新 | 字符旧→新 | 账本 |
| --- | --- | --- | --- |
| silent-footwork-block | 163→167 | 214→184 | silent-0005 |
| silent-strength-weak-observation | 274→280 | 227→211 | silent-0006 |
| silent-accelerant-triggers | 94→95 | 211→185 | silent-0027 |
| silent-afterimage-per-card-block | 49→50 | 226→189 | silent-0023 |
| silent-lagavulin-siphon-poison-sl | 26→28 | 215→196 | silent-0030 |
| silent-decimillipede-reattach-poison | 18→19 | 241→203 | silent-0064 |
| silent-burst-next-skills-replay | 19→20 | 268→206 | silent-0194 |
| silent-tough-bandages-discard-block | 5→6 | 203→202 | silent-0194 |
| silent-stone-humidifier-rest-growth | 11→12 | 237→212 | silent-0204 |
| silent-fortifier-existing-block-triple | 20→21 | 192→203 | silent-0225 |
| silent-route-hp-observation | 291→299 | 194→196 | silent-0019 |
| silent-rest-buffer-observation | 291→299 | 215→196 | silent-0020 |

active244→244，总字符58942→58682；high162/med54/low28不变。A8适用211条/48689字，A9 212条/48973字，A10 242条/57921字；60000预算未改。last_seen按局报文件日期，2PQ/J2为10-17，其余相关新证为10-18；SL多次不加独立局。

### 退役

0；没有静默丢弃反例、没有合并删条。

### 和手写知识及代码冲突

其他19个角色知识文件保存SHA及相关字段，核open-book/reflex/build-core/template/strategy等相关条件。构筑方向/持有签名不等能力已建；外部FOOTWORK观察保持独立来源和分母，不把拿牌频率当因果。没有本批足以改写手写知识的直接冲突，修改无，不重建生成表。相关旧纯bug0365目标截断、0461斗篷生成/抽牌、0496涅奥取回、0296升级逃脱、0504活力串刺和0511增伤药窗口沿原复盘/提案保留，不作为新游戏经验或冒称已修。

公共新增0、候选3（敌力量/吸取、千足虫重接、固化已有挡），保留来源角色、原条目、证据原件SHA、条件和缺证原因于shared-experience-review.json。scope=general不证通用；本批未把静默统计或主题局数搬公共。候选不是正式发布/消费者读回，不关闭共享父要求。

### 代码问题（不给 DS）

没有源码实现。CLI提案silent-proposal-d8b438b597e9fb6c关联12经验/11旧账本；营火初错数留原件，另CLI勘误silent-proposal-ff01313ae5fb351a。domains=combat/potion/sl/terminal；不填implemented。check-experience missing=[]退出0，ledger check退出0。只补证和提案链接，未提交故不做提交后proposed更新，不填accepted/shipped或他角色确认。

### 测试

JSON、diff --check、gitleaks、check-experience和ledger check均0。最终独立tsc退出0。固定bash tools/test-sandbox.sh初次tsc0，Vitest配置缓存写只读node_modules报EROFS、退出1；保持固定排除名单，用--configLoader runner重试，当前终态退出码None（None表示仍在途、session35693），已见ops-mod-state/strategy-external等失败，日志切点5513字节/SHA 8d78d0bf80fe195d9571576243789cc4e25654f5386bc1c22918ca564dd33ee2。独立spawnSync bash退出0仍带EPERM，原诊断保留，不把沙箱限制当经验逻辑失败，也不把在途当通过。

最初定向误带CHARACTER=silent，使默认Ironclad夹具的两断言失败（2文件/18例/exit1），原件tests-knowledge.log保留；按固定入口习惯unset CHARACTER后2文件18例全过，另jev-experience 1文件16例全过，共3文件34例、退出0。运行知识渲染/切片始终CHARACTER=silent。定向通过不替固定门；因此本批未提交、未合live、未编号/通知上线，等待原调度器沙箱外完整检查及实际精确集成，不另起模型或对局。失败/在途原件不删、不改成成功。

### 切片大小

固定种子20260929，从全部已结束Silent局的最高两个已观察进阶A9/A10，各界面20状态，共240配对；原knowledge-slice.ts，CHARACTER=silent，内存仅换before/after经验，统计/公共文件同一。原先仅路线分母抽样的初稿manifest/slices保留，最终改为全角色历史母体。全量抽样首次遇不合法JSON行失败，重跑保留1条坏行offset/bytes/SHA于sample-gaps.json；角色无法核定的坏行不作有效样本、不填0。原失败sample-initial-failure.json保留。

| 进阶/界面 | 改前中位/最大 | 改后中位/最大 |
| --- | --- | --- |
| A9 CARD_SELECTION | 4129.0/4843 | 4091.0/4768 |
| A9 EVENT | 2467.5/3279 | 2429.5/3279 |
| A9 MAP | 2861.0/2961 | 2844.0/2906 |
| A9 REST | 2636.0/2983 | 2617.0/2964 |
| A9 REWARD | 3289.0/4061 | 3279.5/4061 |
| A9 SHOP | 5225.0/5754 | 5196.5/5754 |
| A10 CARD_SELECTION | 6278.0/8045 | 6259.0/8045 |
| A10 EVENT | 2599.0/4650 | 2599.0/4650 |
| A10 MAP | 4152.0/4884 | 4097.0/4867 |
| A10 REST | 2761.5/4850 | 2742.5/4831 |
| A10 REWARD | 5258.5/6946 | 5239.5/6946 |
| A10 SHOP | 7472.5/8765 | 7472.5/8765 |

总体中位3978.0→3947.0（-31.0），最大8765→8765。silent/A10/act1渲染190364字、SHA 03ca257acc7169c68577d4ba80c2c87492d24de8a9f7eb6fe6a85fac7c532f36，12条新文实际包含true。只证明离线消费者可读，不证明生产工具模式发送全前缀、下一局自然查询/采用或收益；未运行play/在线大脑题。
