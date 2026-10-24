# 用药与连续硬仗资源：自有补证独立单元

批次 `20261024-144312-strategy-proposal`；dispatch_base `23d8749bc3998e8bb50b67305ccadae5d6027f8a`。绑定plan、冻结清单/规格SHA及HEAD核同；只写本批scratch，旧processed/failed/rc0不改。

本批交付5个去重情境：新增4、更新旧ID1、复用0，达到scratch数量目标5～10。候选不是正式发布；正式发布0、生产读回0、自然采用0、收益unknown，科学父不关闭。仅策略文字，不改药水执行策略/数值/源码，无代码提案或共享账本登记。

## 证据边界

冻结506局，其中A10为466，其余进阶只作覆盖登记，不进入本批5条结论；Z2/KF9和BP9及后续未纳入。用内存DuckDB/threads=2、显式11分片名单且先过滤allowed506及各流off+len切点，未sync/init共享库。11片大小/SHA与transport核同；实际mode0644及部分链接数变为1如coverage所记，只读访问且未修改。自有游戏版本unknown。

原索引覆盖321328状态/305743决策/2826 SL/570 run-config/7653计划/506终局。复用logdb views和evidence_identity.run_identity，以精确off/len有界seek；原17GB流没有全扫或复制。每条取证保留source_size/offset/bytes/SHA和显式身份，不用时间接近补局号。自有source=own，外部只作终局方向背景；runs=[]仅派发身份，真实支持局另列own_support_runs。

模型实际读了所选6个药水/弃药动作的资源与牌面投影、4个未用药机会的原状态资源段及其后继索引、3个Boss桥接的全部4节点资源索引、16个外部终局cell与原5个候选。程序核所有11片，扫描全部冻结索引，定点读取四药与弃药相关前后状态、192个桥接帧及1756个满栏商店状态；未通读506局原文或114代表四section，不称完整流派剧本。详情coverage及raw-read-registry。

机会是记录动作或去重店/桥接，独立局另列；同局动作、SL重试不相加成独立局。各候选完整统计同时列sl_reloads=0/positive、原no_retry_evidence与run级confirmed_reload/predicted_death分层。无重试证据不等于证明无SL；分层仅事后统计，不作在线触发。

## 五个情境与处置

### silent-brain-potion-buff-before-relevant-cards（new）

先比较药后牌：445/470动作观察到相关手牌数值变化（238/246独立局有此现象）；抽核Damage 6→8、Block 5→7。

适用范围：备战规划；实际持有可用力量/敏捷药、已决定本战使用且后续有相应可兑现牌；非自动出牌规则。

做法：仅Silent A10、来源游戏版本unknown。备战时：若本战已决定使用力量/敏捷药，且后续确有相应攻击/格挡牌可兑现，优先比较“药→相关牌”的顺序并读回变化后的牌面。470次已执行、同回合出牌数未变的用药（246局）中，445次（238局）相应手牌Damage/Block数值改变；也有25次未见相关变化。样例DAGGER_SPRAY展示6→8、防御5→7，均为实际后继牌面；不是通关收益，也不表示必须用药。没相应牌、无法出牌或准备留药时仍比较其他选择，不把固定增幅套到所有状态。

反向结果/限制：手牌数值变化是直接观察；最优时序/跨回合持续时间/减少伤害幅度未做反事实检验。；25次未见相应手牌数值变化；零能量手牌仍可能不可打，增益不等于当前兑现。；力量与敏捷合为一个出牌时序情境，不按药名拆条。

真实候选：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/buff-order-strategy.json`。来源=own；formal_publication=pending；consumer_readback=pending。

### silent-brain-potion-uncovered-end-turn（new）

结束回合前比较可兑现防护：227/227用药动作观察格挡+12，138独立局；168个可用未用的end_turn动作/69局另账。

适用范围：备战提醒在战内ready、格挡药可用、显示攻击>当前格挡时复核；显示攻击缺口为威胁代理，非真实最终掉血。

做法：仅Silent A10、来源游戏版本unknown。备战计划保留一个结束回合前检查：实际格挡不足以覆盖当前显示攻击、格挡药can_use且行动ready时，把现在喝与保留逐项比较；不要只以能量耗尽结束评估。227次缺口场景用药（138局）的同回合、出牌数未变后继均观察到格挡+12。另有168次可用格挡药却结束回合（69局），并非都致死；抽核78→76与40→38后药仍在。显示攻击只是威胁代理，其他伤害/防护与留药价值仍须核当前状态；不规定缺口必喝或安全HP。

反向结果/限制：使用组与未用组不是同状态两臂，不能相减成救血或致死率。；未用样例仅掉2HP；留药可以合理，禁止一律视为漏喝。

真实候选：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/block-before-end-strategy.json`。来源=own；formal_publication=pending；consumer_readback=pending。

### silent-brain-potion-zero-energy-continuation（new）

零能量时比较药后续牌：146/146动作观察0→2并解锁手牌，109独立局；142次下一记录选择出牌（135完成/7排队未稳定），4次先选其他动作。

适用范围：备战条件分支；实际能量0、药can_use、当前手牌受not_enough_energy限制且有可兑现用途；非保证收益。

做法：仅Silent A10、来源游戏版本unknown。备战时为能量耗尽留一个条件分支：若实际能量为0、能量药可用，且手里存在仅因能量不足而不可打、喝后仍有目标与用途的牌，比较补能续牌与留药；不因0能量直接认定无动作。146次此类用药（109局）后能量0→2，并有手牌从not_enough_energy变为playable；142次下一记录选择出牌（135次完成、7次排队未稳定）。另有159次零能量持可用药后结束回合（60局），抽核可保血不掉，不能自动判错。新增能量不证明整战划算；仍核自伤、额外费用、行动闸与本战用途。

反向结果/限制：146是已选药的条件样本，不是所有可补能机会数；未用159动作单列不合成独立分母。；NB8KCF6HRGVF未用后下一回合HP未降，反对零能量必喝。；样例药后还出现额外力量状态，说明附带效应和遗物混杂须核，未把它归因为能量药固有效果。

真实候选：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/energy-continuation-strategy.json`。来源=own；formal_publication=pending；consumer_readback=pending。

### silent-brain-potion-full-shop-replacement（new）

满栏有可买替代药时比较腾栏方式：26/306店机会观察到弃后换购（8.50%），191独立局；27组换购动作/25局均核ID及金币变化。

适用范围：只在商店已打开、药栏满、有真实库存且价格≤当前金币时；每局/层一店为机会单位，不能据频率规定买哪瓶。

做法：仅Silent A10、来源游戏版本unknown。商店满栏且货架有当前金币买得起的替代药时，按当前每瓶用途比较保留、可用药先饮、弃药换购；先确认目标库存/价格，再决定腾栏，别把弃药记作喝药。306个已记录机会（191局）中26店发生弃后换购、280店未观察到这种替换；同店可多次，实际27组动作/25局均核新药入栏且金币按价减少。25226ZFLNR1J曾弃掉can_use的AnyTime果汁后买药，但用它与弃它的反事实未知；有害或未知效果不能因可用就喝。满栏时enough_gold曾为false，需同时看实金币、价格与栏位，不只读一个标志。

反向结果/限制：保留组280店不等于错误/拒买原因已知；机会集合仅已记录状态，非全部商店。；同店两个换购只算一店；原有药更好还是新药更好、先饮是否安全均未知。；不是因果收益或固定购买优先级。

真实候选：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/full-shop-slot-strategy.json`。来源=own；formal_publication=pending；consumer_readback=pending。

### silent-brain-potion-reserve-terminal-proxy-context（update）

场间按实资源重评：48独立局中HP变化0为43次、+25为5次；同非空ID仅7次，新增ID7次；不估最优留药数。

适用范围：第三幕备战/真实场间检查；实际遭遇以敌人数组为准，HP和药栏以当次状态为准；首记录HP与同ID沿用均为代理。

做法：仅Silent A10：第三幕连续Boss备战与场间，以本次实际敌人、当前HP和药栏重评本战可兑现用途及保留理由，不按旧目标名或上一场资源推定下一场。自有版本unknown的48局/48桥接中，地图到下一战首记录HP有43次不变、5次+25；药栏34次空→空、7次同非空ID（沿用代理）、7次出现新ID。新增不全是前战留药，首记录也非原子入场；不据此定留几瓶/安全HP。保留旧外部v0.111.0终局代理非胜447/1247、胜166/492，差+2.11百分点；与自有场间证据端点不同、版本可比性未知，不算留药收益。

反向结果/限制：48局均实际看到两个相邻第三幕Boss敌人数组，未按boss_id补映射。43局有重试/预判证据，5局no_retry_evidence；终局结果不当逐SL独立结果。；34次空栏、7次新增ID与7次同ID都保留；没有证明保留一瓶/两瓶优于现在使用。；外部与自有端点/版本不同，evidence_status=unassessed，不声称aligned或以外部否决自有。

真实候选：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/boss-resource-recheck-strategy.json`。来源=mixed；formal_publication=pending；consumer_readback=pending。

## 关键统计与限制

力量/敏捷不按牌名拆条：470次完成且同回合出牌数不变，445次对应Damage/Block变化，25次未见变化；独立局246，变化支持238。自有抽核只证明牌面/资源后继，不证明固定增幅的普适性或最优时序。格挡药227个缺口用药/138局后继+12，未用168动作/69局不同状态，禁止相减成救血收益。能量0时146动作/109局后继+2且解锁手牌；142次下一记录选择出牌，其中135完成、7排队未稳定，另4次先选其他动作。未用159动作/60局中有不掉HP反例，不能下必喝命令。

商店真实机会按本局/本层首次“满栏、货架已开、实际金币足额买至少一瓶有库存药”去重：306店/191局，26店有已核换购、280店未观察这种换购；27动作/25局均核药品ID与按价扣金。同店两次只计一店。原1756决策/290局只是粗代理，不当真正机会分母；先查价格/金币，不把满栏时false的enough_gold单字段当缺钱。AnyTime可用不等于喝了有益。

第三幕48桥接/48局均以第一帧敌人数组核真实有序遭遇，6种实际顺序各3～11局，不能用旧boss_id映射。每段读192原始帧中的4连续记录：末COMBAT、REWARD、MAP、下场COMBAT。地图→下一战首记录HP变化0为43、+25为5；药栏空→空34、同非空ID7、新增ID7。相同ID只作沿用代理，无物理UID；新增药不冒成“上一战留药”。首记录不是原子入场；未估固定恢复/留药收益/安全线。43局有重试或预判证据，5局no_retry_evidence。

## 外部、前序与消费者

外部source=external:sts2fun，2026-10-21取得，原库SHA=1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5，统计SHA=4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d。仍仅终局保存数组代理；自选上传、玩家数/SL未知、时机缺失，许可未明确且仅署名聚合。8个build分别统计，6组每侧上传≥100，其余保留小样本不作发布比较；没有机制未改对照，全部不跨版合并。v0.111.0非胜447/1247、胜166/492差+2.11pp；其他build可反向，见external-version-comparisons.json，不把未知改为未改。旧候选ID更新为mixed但evidence_status=unassessed：自有桥接与外部终局不是同端点。其他4条source=own，不套外部100阈值。

核冻结#27/#42 brain-strategies、学习协议及#55情境检索，沿稳定ID合并；保留前三单元原1/2/2共5候选的原SHA，休息/路线/冷启动4条不算本批产出。不重做旧Boss/刀009，不触#28开关/模型/MC/两臂。旧终局候选沿同ID更新只计update1。source-ledger与per-context-mapping分别列来源、候选、前序与局部waiting。

策略按fight_plan/act_plan或shop消费，正文动态条件不伪造trigger支持；当前trigger没有进阶/版本/药水/能量闸，正式发布owner需核题面实际事实与正文范围，不能称硬闸已实现。无knowledge/rk交付，不靠缺其他消费者拖掉真实策略候选；其消费者/固定回放缺口独立保留。形式解析不等于正式生产读回。

数量分账：new4/update1/reuse0/unique_contexts5。自有机制后继独立局≥100为3情境；商店机会191局而换购确认25局、Boss桥接48局，不以机会大样本冒确认样本。新外部比较候选0、旧外部比较保留1。没有因果/精确时机收益/持药价值/最优安全HP或瓶数；局部waiting留档，未少于3，under3_report_required=false。

## 核验与交接

无源码/正式库/共享状态改动，不commit/merge，不跑tsc/vitest/full，tests三项null。仅做输入/证据/JSON及策略格式核验，结果另存validation.json；交原ops审核候选发布、真实消费者读回与后续自然采用。未核本批原生turn_context、服务档、用量/耗时；不以启动参数冒实际采用。HEAD须继续等于dispatch_base，git diff --binary留scratch。

实际核验：5840条用药/弃药决策及其原状态逐项核显式身份与完整fingerprint，失配0；生产parseStrategyLibrary解析5条通过，正文607/585/652/670/627字节（以strategy-format-validation.json实测为准），单条完整分页包均<24KB。这只是离线格式/体积检查，未调用生产kb_strategies、未读正式库、未冒消费者读回。gitleaks扫描无发现；HEAD和tracked diff核零。

完整结构回报如下；result.json原字节嵌入，终答保持同一JSON。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-144312-strategy-proposal",
  "base": "23d8749bc3998e8bb50b67305ccadae5d6027f8a",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/report.md",
  "external_source": "issue51-decision-potion-own-20261024-002",
  "input_sha256": "1a1afc06d9bd6cd5cddeab155d952f4c4965eb89d8ded3e39e9de9b10ef8be8b",
  "own_support_runs": [
    "01H1533KSS5C",
    "02HB4L0C3C67",
    "08A0GEAL8KQ5",
    "0B2567HG3T4D",
    "0BHQCPAF33N6",
    "0C3AR6J0Z8LD",
    "0CLP16ZR4ZZC",
    "0DJ6GFZZ0TG9",
    "0DTPVHFXJ319",
    "0LH6KZ26VXJR",
    "0NMF36KX3F7Y",
    "0NZXA12NLDMH",
    "0PH64C4AWAX9",
    "0QDRNCRMC8BU",
    "0SXAXVPXV8EC",
    "0VBCQS9V0N87",
    "0YQJ9D1MC4NK",
    "1269Y20SKHUM",
    "13CBGUPK6122",
    "16UDD0430SXT",
    "173ARCPHRVSS",
    "1913SE84AXQF",
    "1GN7WFBWC2E3",
    "1M7Z1CTJ3M1J",
    "1RUG121U962B",
    "1ZZHM2MV19YB",
    "25226ZFLNR1J",
    "25MFNPAE37R2",
    "28T664BN1NCA",
    "2E4UQ1BZTQWB",
    "2GFAPDBDNSCR",
    "2K4H3JEJHRSB",
    "2LZHP9BYFTHE",
    "2PQK67ULZY90",
    "2XCG8LXUZLRE",
    "2Y27VAYZDA02",
    "30GVY0WH7BYP",
    "32VSST9UX7MN",
    "34PV33AA12QH",
    "34XTHUP4433X",
    "36GZSS70H7XK",
    "36VNKZKABGB4",
    "3DSZM9BL9B0B",
    "3DW2DM7EY22W",
    "3DY1QBM0CET0",
    "3MPFJ1WYP8JJ",
    "3UPY3BP2LVS7",
    "3YUVLHCYAQ8L",
    "456MRNGCPD8E",
    "47731LKMZRBJ",
    "49HL2N70CHMU",
    "4AA19CXDKQK6",
    "4ANT8D00TP72",
    "4H1T5UB23GEP",
    "4JS3T2UNKPVM",
    "4U3WNL3JRRCX",
    "4WTPX6M9G5G6",
    "4XLZURXMD872",
    "4Z2GCLA4DU52",
    "53NU9DWSTG9H",
    "54G5683J0E5S",
    "562GNK4ESMPE",
    "5BU7ZE1PWLSX",
    "5E5JFKE9BVSU",
    "5H83F3J0XSTE",
    "5PM6JAQG6FNQ",
    "5X2GHKJ89PN1",
    "5YKZ3TXFACN9",
    "5ZEPCTQKKXE4",
    "61E2QS63Y9WU",
    "6321RUR647FH",
    "64R0P0MTZWAX",
    "64VJC5XT2AT2",
    "66WD8GWWF39D",
    "675CHRV9HVQ3",
    "67AFTXLWVN4L",
    "6ANZJ6XRKV4P",
    "6ZGMGEQ5YDVK",
    "72RFEYV6WNPA",
    "75DAD6GBWEU1",
    "76VEDXJJ2PFL",
    "79421JK2WBA9",
    "7BNC8QX746YP",
    "7G7V6T3U7V27",
    "7S8HCC0M6G9W",
    "7T2QV2AT2D5C",
    "7TA6V93SQVFE",
    "7X0W3U8TVA2A",
    "7X58G3LSHZ3U",
    "7XS2Y920KA6E",
    "7ZUC4VPMDS41",
    "833ZM0MJGWHC",
    "862JGUUWUQZX",
    "8AGEGLG40SV3",
    "8FP19V1W4SRQ",
    "8HW407EAUYL7",
    "8JNHX23GX7ET",
    "8JRE1C4H4Z2W",
    "8R5CXD5C8PW8",
    "8S9RNHFU5XF1",
    "8XVMBYRD8R8D",
    "8ZCFND4T35H7",
    "9663Y88TYK73",
    "9DAS5L8YM1CN",
    "9GTFF6DC500L",
    "9GVYTHSXB4Z5",
    "9J6T70HSYPG7",
    "9KP5S3317EEL",
    "9R916WW0V65N",
    "9SRPBTZYN44H",
    "9TG1RP5LFAAK",
    "9W38TRGPJW9Q",
    "9Z9H2EXKLF3T",
    "A4BPX7CB04B3",
    "A5HKP18P4Q0T",
    "AD3QSC3P41JU",
    "AF76L5UTPP8U",
    "AR523ATD2G4W",
    "ATP5MCMJDMQY",
    "ATPX63FGDY6L",
    "AYTX5H4H69E3",
    "BDJTF3FDA8W5",
    "BGRC1SURKBJY",
    "BHSVN6X84UMN",
    "BJLTVSYXCSGS",
    "BKK8KAR3E83C",
    "BSXYMFKN0VJ5",
    "BTSRF7JL1W1Y",
    "BXU0CKWKH2RU",
    "C0JP9YMVNFQP",
    "C6Z8ATNBNHZ7",
    "C7LERZPCRFZ1",
    "CDXCWKNSBN8M",
    "CEN1Z8HEU7NM",
    "CESK0EFSJ2C4",
    "CKJK7QPW38UT",
    "CNKR125PFHJ5",
    "CS8BJ1J3LRCV",
    "CSBNU2H9LXKD",
    "CVJ4MLQF4CSY",
    "D2JR3FN0VYH5",
    "D4LJ9QMGFB8Q",
    "D9XJAX5KCSU2",
    "DC32RW0A80V1",
    "DDR9U5D07U49",
    "DFYBEW6NA6AJ",
    "DGBH7X5QS9KG",
    "DGLWTQGRAT1T",
    "DHYFWEN40SJ7",
    "DPRCRW7RE6EY",
    "DPYF2BAA3DKT",
    "DQSH393WPZW0",
    "DUB5VQQ6D6D1",
    "DUZUBAJ3A8GP",
    "DW8M3G2PV3N7",
    "DWW8GX3UQCQM",
    "DXF5L8WH8X12",
    "DYB7KFG723QM",
    "E420FDJNEDKR",
    "E5L15SK6ZHZB",
    "E6DSUVTNVBMH",
    "E6DYYXRX7GVE",
    "EBVT8UZM6P12",
    "EEVP0QTLMSX9",
    "EMRME965K74Q",
    "EQLB6SK9W9H7",
    "ET1QAZCV8GUP",
    "EWLY3PWDDXJK",
    "F1TP5W6GF56Q",
    "F6XY4QJMS5RC",
    "FD8NZAHU7SNY",
    "FETDVL1P59B9",
    "FG2Z2Q6GD1DC",
    "FGKZALWSTQQ1",
    "FU9SGZ3WF6QJ",
    "FZT053H9PSC5",
    "G2QCF2R3A57K",
    "G2XYF48GKAUW",
    "G33HU22H2543",
    "G4PQBCJQ7NP0",
    "G8NHLL09DLBX",
    "GD9QSQM0PH8T",
    "GLWXPCHNXS4P",
    "GV9MTBL2G6QJ",
    "GVCL0CRJ78AX",
    "GWE810ZD014M",
    "H1T1F8ML9FUE",
    "H5BVXA9SQWTY",
    "H9ERYJLBL4UC",
    "HD6BM39PYL21",
    "HEMND3SMQYB8",
    "HLAWCGM3KHVB",
    "HNX4A2WBC34W",
    "HSX4HYATB4E2",
    "HTXMNBS3PPF5",
    "HUM35281S668",
    "HUVEPWQAHWFU",
    "J2VR2DFJG8K4",
    "J5E7A3MS9NSH",
    "JBX9JLH46KVN",
    "JLN5SK17W4FQ",
    "JLZCE665J9LD",
    "JMH5C51RLN4E",
    "JPWMMV67SZCL",
    "JQPT83P8KDSZ",
    "JS5UV1DUB1K1",
    "JWJLSQXDKUA2",
    "JWK2C8LE4SFV",
    "K2JAGKVJAWZJ",
    "K643VJCTQT0J",
    "K94WZS8B2MQ6",
    "KCA04Q3SEYTF",
    "KDBWARERSGYW",
    "KFRDELW2TH2P",
    "KHECCYUJ7K48",
    "KQQELQSZ382Z",
    "KRLPMR0FWVZE",
    "KSX97DF5H3NY",
    "KUHYZBFFLALU",
    "KUZVERN40NGK",
    "KV0JHNJCKXLS",
    "KWNMCCCNH3P2",
    "KYJMB7ELM6FN",
    "L2TSFU62Z57Z",
    "L38NLY1XJ7VU",
    "L6745E2ND5CT",
    "L704TLETMZBM",
    "LKC9YXKZWTKR",
    "LS8035TB32P3",
    "LTQ083RTNZJQ",
    "LWQYSREHMMJ7",
    "LY83ZMTFVKJH",
    "LYBHQ1X230ZB",
    "M0GY0A4M2F7H",
    "MCT1GPTL8D35",
    "MEQ6ETDCEEE9",
    "MEXYTC0Z2MQQ",
    "MGA0CZDDKC0P",
    "MLSLQCNZ5291",
    "MPWMW6P91U0B",
    "MR7EBRYRJ5R6",
    "MRJ4E5HL3ZA9",
    "MTQ0EUBJ3R6T",
    "MWMR855QHTWR",
    "MWQ1RY3E14ZT",
    "N1ZEBMHZM4KC",
    "N3YHJMV1ATFR",
    "N8A2W8LH39N0",
    "N9GKED3PMEV3",
    "NB8KCF6HRGVF",
    "NBJBVSBNPYQB",
    "NEPESJXEV9V3",
    "NEWRFAYKTQHR",
    "NGP83Z1W5GYR",
    "NHA2KW0RB7VP",
    "NQKVQ9RD9T2N",
    "NTMAU4XZ2NN2",
    "NYQW6JAD30K4",
    "P2M3DFJ4DEZ3",
    "P33MKRP6S4Q4",
    "P5HT1272P5SB",
    "P74C04AEPL1F",
    "PBUBM0LRTEDD",
    "PCDMYK2AEB2D",
    "PD9AYQVMLQW6",
    "PF90JTU0UZ5M",
    "PJ2LL9KU7FHD",
    "PLMNP6XWPPC6",
    "PTGQF9BEQ6G1",
    "PU80F84P6HPN",
    "PUY011SBWSSU",
    "PYE4VXNSLGSS",
    "Q10YYQ5DUPJA",
    "Q389KW7SVWKH",
    "Q3R929GHT14R",
    "Q6M2Y34MWKRE",
    "Q7SFDZSJLULD",
    "Q9FM7A80E4BZ",
    "Q9KFP3J3JNU5",
    "QCYEXENCQU98",
    "QHK1XQ928TTM",
    "QNTW139MGECA",
    "QRZX1S9USYWP",
    "QU61RVKHPTZS",
    "QZZSGXFABBQQ",
    "R3AJCGQGGMR4",
    "R3MFUZ3732VF",
    "R6WDLYS19ZTY",
    "RBMEQGXPE9Z2",
    "RC61MFQM63Y6",
    "REEBQHPHSWGK",
    "RMNXHZKV716Y",
    "RQCHNN0W72KF",
    "S0JWSFR8JAKF",
    "S5GZG328S1LN",
    "S9UZAK0JP0C0",
    "SB5N8GT2Y3VW",
    "SDY5T9XCSQN2",
    "SPC7NVA5K4RL",
    "SV2GP9NX4HQD",
    "SVBEFF7YAZMA",
    "SVK97F9E4N56",
    "SWXESN56U1QJ",
    "SXBR2JL68B3W",
    "SY0WMJNNVRLM",
    "T0DGVABPV60U",
    "T12TSEMGUU7F",
    "T15WXHPTM0ET",
    "T4PL60Z0DZV3",
    "T749HZSY80X6",
    "TCDUBRWMEMNA",
    "TDLBRNA0R05B",
    "TFYU1MY8NEJ1",
    "TGTXN42TE0X4",
    "TKAN594T9SKS",
    "TKXQ6L4N9A6U",
    "TU3XB4CAEDAW",
    "TXZ6RVMQA09D",
    "U084Q0B4EJSX",
    "U1JMSKC80LQE",
    "U1QYLX1AE1WX",
    "U5W7NUE925NK",
    "U6JELGQTBMHN",
    "U8NZKEC218G7",
    "UAVY51TPQVZE",
    "UJ0K3G10609Y",
    "ULP4TN1GNHMK",
    "UMVLWER4CD98",
    "UPAB38G2PA02",
    "UV5YK5721RPB",
    "UW7X088RVVLR",
    "UWUFHGRAJJ6J",
    "UZ1T7AH49WMB",
    "V3PJA3FV92BG",
    "V4BTVFPS9XHV",
    "VAC6Z1PZ1QJG",
    "VGNDNGPFYRE3",
    "VLZ6CCT8AQ0A",
    "VNSXWCWXR3VW",
    "VPW8YH7A4QFM",
    "VVFH7BULZZR6",
    "VX6RJ608LR5F",
    "W1YY8PEWGUF9",
    "W546CNAWY3RG",
    "W7BHM8U02RKG",
    "W9610N90MMCT",
    "WA7FRJ7UABCV",
    "WCDTYJKUDS4T",
    "WG8GK5B9D7YH",
    "WJ0LTVSSDY61",
    "WN0HA1L6MJ99",
    "WQB3YYNTRB2L",
    "WQZVENQ7DTRP",
    "WYB0NCD6W83J",
    "X06YT1507E5M",
    "XL4ENZG3N7Y3",
    "XP2SL33HT0D9",
    "XTSV1U9JD34T",
    "XU3M3P5CU3X7",
    "XW8B5CHJ814J",
    "XY5U30QX5YYL",
    "Y0EMJR6MKWYW",
    "Y2K25VFDU95P",
    "Y3824FJLSUXY",
    "Y427BMQH8AU6",
    "Y5H4CFAQ2WTG",
    "Y82C2NV7WM2M",
    "Y8GDTNWG4R3X",
    "YBRA3EJ94GBR",
    "YF0LXT1QSTGG",
    "YLYLZWHA0GKU",
    "YR636ZUULAU1",
    "YSRVLSKVU8DL",
    "YUWMCVH6MFUH",
    "YXY2RL1E83HM",
    "YZQEEDWQ6AY6",
    "YZWV37N2MU6N",
    "Z91JN3S3PQX2",
    "ZE2DNC29WWHB",
    "ZF8PX27B46H5",
    "ZMAF9JQB4L4T",
    "ZTRGYYMLR8SC",
    "ZVYUL2YP3518"
  ],
  "own_support_index": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/source-ledger.json",
  "decision_output_counts": {
    "new": 4,
    "update": 1,
    "reuse": 0,
    "unique_contexts": 5,
    "target_min5": 5,
    "target_max10": 10,
    "under3_report_required": false,
    "target_met": true,
    "target_status": "met_for_scratch_context_count_only",
    "formal_publication": 0,
    "consumer_readback": 0,
    "natural_adoption": 0,
    "own_effect_contexts_with_100_independent_runs": 3,
    "own_shop_opportunity_runs": 191,
    "own_confirmed_shop_replacement_runs": 25,
    "own_boss_bridge_runs": 48,
    "external_new_comparison_groups_meeting100": 0,
    "predecessor_external_comparison_groups_retained": 1,
    "gaps": [
      "没有因果收益、最优药水持有价值、固定安全HP/留瓶数。",
      "knowledge/rk独立消费者及#28回放未完成；本批交策略候选。",
      "现策略trigger不能强制进阶/版本/药水/能量等细条件，正文严格限定，正式消费仍待原owner核。"
    ]
  },
  "external_results": [
    {
      "id": "decision-potion-own-fallback-002",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-potion-buff-before-relevant-cards",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/buff-order-strategy.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-potion-uncovered-end-turn",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/block-before-end-strategy.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-potion-zero-energy-continuation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/energy-continuation-strategy.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-potion-full-shop-replacement",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/full-shop-slot-strategy.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-potion-reserve-terminal-proxy-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/boss-resource-recheck-strategy.json"
        }
      ],
      "reason": "已落盘5个独立情境策略候选：新增4、沿旧ID更新1、复用0；自有506冻结局筛选，结论仅Silent A10/版本unknown。用药顺序、防护缺口、零能量续牌、满栏商店换购及真实相邻Boss资源分别核证，未造收益/安全阈值。正式发布、消费者读回、自然采用均0；局部缺证与科学父保持开放。"
    }
  ]
}
```
