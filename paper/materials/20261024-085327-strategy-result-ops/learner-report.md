# 各幕Boss冻结聚合核查

三个单元均 waiting：完成安全聚合核查和缺证定位，未生成可发布的knowledge/strategy/rk条目。formal_publication=pending，consumer_readback=pending。缺关键战前快照、独立组分母和结果语义时，不以描述表冒充策略候选。

- batch: `20261024-085327-strategy-proposal`；plan: `issue51-act-boss-002`；request: `github-issue-51-external-boss-learning-20261023`。
- HEAD/base: `61596985b57d0457e8e646ca54e81915db712518`，核对时点：2026-10-24T09:00:43.942175+08:00。
- manifest SHA256: `4c6c4f540291d314f160ce3e12042c87d99cd96202258639e5a9f0cddcbf4adb`。
- work_spec SHA256: `f37c3ca35910fd44ea7a2907fad48b4dce24e0368912a55805ee6a761ee4b32d`。
- learn.json本批external_source/binding、工作树、unit_ids、dispatch_runs、实际HEAD均匹配；15份绑定清单/规格/契约/查询/回执/聚合逐一核字节与SHA，见 identity-check.json。
- 仅读冻结的安全聚合和契约；正式知识只核既有ID与触发范围以去重。不读原DB、逐玩家数据、原游戏日志、游戏二进制，不联网、不下载、不调用模型、不运行play/模拟或实验。
- 本报告及账本只写本批scratch；runs=[]、fixes=[]、merged=null。没有修改请求、登记、正式知识、源码、main/live或父要求。

## 来源与五版本分账

来源 `external:sts2fun`，URL https://sts2.fun/static/sts2_public.db.zst，采集日2026-10-21；查询版本ops-safe-boss-aggregate-v1。原始DB SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`，压缩SHA `0f3e1660cdd41665c5e29695232137252187713a5fde87fb888ab3e228c69ac7`。原始摘要沿采集回执，本批未重新打开或重哈希13GB DB。

筛选：Silent A10、单人、valid、未弃局、无modifier；没有据此保证来源无任何模组。许可未在冻结输入明确，保留unknown。玩家数与独立性未知。

| cohort | 上传局n | build组成 | 解析排除 | 节点数 | 精确floor/节点deck/节点potion存在 | 聚合SHA256 |
|---|---:|---|---:|---:|---|---|
| v0.107 | 2932 | {"v0.107.0": 1058, "v0.107.1": 1874} | 0 | 93056 | 0 / 0 / 0 | `3f79b3879117a0dbe206d6009648b49cd77200a3c51d1a43b1b03ddcc91b30ef` |
| v0.108 | 683 | {"v0.108.0": 683} | 0 | 22078 | 0 / 0 / 0 | `ac1b69775eb58de59468fb146b24cded7a33091ec463632b433178f156fb78f8` |
| v0.109 | 583 | {"v0.109.0": 451, "v0.109.1": 132} | 0 | 19715 | 0 / 0 / 0 | `a643ca8e82b18b793e330aaf46c41de7a426c80f17900b031335b84ad75fe8f0` |
| v0.110 | 411 | {"v0.110.1": 399, "v0.110.0": 12} | 0 | 13561 | 0 / 0 / 0 | `82c3e7a9816838a0fac912dcef567d8448ed173c1195057bb2384e9269b94e02` |
| v0.111 | 1739 | {"v0.111.0": 1739} | 0 | 59587 | 0 / 0 / 0 | `389faf1587e460f1f8e196ea5876c60685020ab63d88c35174e0cf4718bace9b` |

2932/683/583/411/1739，共6348仅为输入覆盖数。版本不混算；v0.107、v0.109、v0.110内部小版本未按Boss分层，不称各小版本结论。group.n为原导出组记录数，不擅称独立局或玩家；同局可跨幕/跨Boss出现，第三幕尤其不能把两Boss访问数当独立局。没有自有验证、收益、置信区间或因果排名。

## 结果证据与快照边界

`passed_by_later_record`只保留继续访问标签；`terminal_hp_zero`只保留末尾HP0标签（所有对应组HP均值核为0）；`terminal_run_win`只保留终局整局win标签。冻结SQL选出win与节点，但没有提供派生outcome标签算法/交叉表，不能认证严格单战胜败语义。未见terminal_run_loss组不是零失败概率。

所有组damage_attribution=single_room；本批没有多房间总损可供拆分。记录总受伤不是HP净损；上一节点末HP不是战前HP。terminal-only牌组与药水只用于对应终局组，继续访问组的terminal可用数为0；第一、二幕没有胜战对应的牌组可比较。第三幕虽有胜利终局牌组，死亡组混合不同访问位置且先后场未知，因此也不能反推同位置战前构筑。卡牌ID不提供机制，攻防/能力核心、流派和成型时间均unknown。

表中 C=继续访问标签，Z=末尾HP0标签，W=终局整局win标签。n仅组记录数。`未见`表示没有该键而非真实0样本；不报告C/(C+Z)或W/(W+Z)为单战胜率。每行仅同版本/幕/完整Boss ID的证据目录，所有字段有效n、缺失、分位数及序号分布见对应unit审计JSON。

| unit | 处置 | 具体缺证 |
|---|---|---|
| external-act1-boss | waiting | 第一幕继续访问组没有对应Boss胜战牌组/药水快照；本幕终局牌组只覆盖HP0组。缺战前状态、独立组分母及标签语义，不能解释Boss胜败构筑差异或生成策略。 |
| external-act2-boss | waiting | 第二幕胜战仅继续访问标签，terminal牌组仅HP0组；访问序号33/35未证为floor。缺战前牌组/药水、独立分母和回合机制，不能据总受伤或终局牌组生成准备度/核心牌/出牌规则。 |
| external-act3-boss | waiting | 第三幕按同一Boss的死亡组混有访问序号48/49/50/51，未按先后场及配对路径拆分；有终局胜败牌组但非入场快照。缺阶段对应、独立分母及战前资源，不能识别双Boss准备度或同场景构筑差异。 |

## external-act1-boss：act_index=0

| cohort | 完整Boss ID | C n | Z n | W n |
|---|---|---:|---:|---:|
| v0.107 | `ENCOUNTER.CEREMONIAL_BEAST_BOSS` | 317 | 69 | 未见 |
| v0.107 | `ENCOUNTER.LAGAVULIN_MATRIARCH_BOSS` | 319 | 74 | 未见 |
| v0.107 | `ENCOUNTER.SOUL_FYSH_BOSS` | 316 | 56 | 未见 |
| v0.107 | `ENCOUNTER.THE_KIN_BOSS` | 333 | 76 | 未见 |
| v0.107 | `ENCOUNTER.VANTOM_BOSS` | 336 | 65 | 未见 |
| v0.107 | `ENCOUNTER.WATERFALL_GIANT_BOSS` | 319 | 82 | 未见 |
| v0.108 | `ENCOUNTER.CEREMONIAL_BEAST_BOSS` | 61 | 8 | 未见 |
| v0.108 | `ENCOUNTER.LAGAVULIN_MATRIARCH_BOSS` | 69 | 19 | 未见 |
| v0.108 | `ENCOUNTER.SOUL_FYSH_BOSS` | 82 | 14 | 未见 |
| v0.108 | `ENCOUNTER.THE_KIN_BOSS` | 83 | 11 | 未见 |
| v0.108 | `ENCOUNTER.VANTOM_BOSS` | 93 | 14 | 未见 |
| v0.108 | `ENCOUNTER.WATERFALL_GIANT_BOSS` | 64 | 25 | 未见 |
| v0.109 | `ENCOUNTER.ACTSFROMTHEPAST-GUARDIAN_BOSS` | 1 | 未见 | 未见 |
| v0.109 | `ENCOUNTER.ACTSFROMTHEPAST-HEXAGHOST_BOSS` | 1 | 未见 | 未见 |
| v0.109 | `ENCOUNTER.CEREMONIAL_BEAST_BOSS` | 74 | 12 | 未见 |
| v0.109 | `ENCOUNTER.LAGAVULIN_MATRIARCH_BOSS` | 62 | 20 | 未见 |
| v0.109 | `ENCOUNTER.SOUL_FYSH_BOSS` | 72 | 16 | 未见 |
| v0.109 | `ENCOUNTER.THE_KIN_BOSS` | 70 | 11 | 未见 |
| v0.109 | `ENCOUNTER.VANTOM_BOSS` | 62 | 9 | 未见 |
| v0.109 | `ENCOUNTER.WATERFALL_GIANT_BOSS` | 68 | 18 | 未见 |
| v0.110 | `ENCOUNTER.CEREMONIAL_BEAST_BOSS` | 45 | 10 | 未见 |
| v0.110 | `ENCOUNTER.LAGAVULIN_MATRIARCH_BOSS` | 50 | 11 | 未见 |
| v0.110 | `ENCOUNTER.SOUL_FYSH_BOSS` | 52 | 6 | 未见 |
| v0.110 | `ENCOUNTER.THE_KIN_BOSS` | 52 | 9 | 未见 |
| v0.110 | `ENCOUNTER.VANTOM_BOSS` | 43 | 8 | 未见 |
| v0.110 | `ENCOUNTER.WATERFALL_GIANT_BOSS` | 51 | 6 | 未见 |
| v0.111 | `ENCOUNTER.CEREMONIAL_BEAST_BOSS` | 218 | 33 | 未见 |
| v0.111 | `ENCOUNTER.LAGAVULIN_MATRIARCH_BOSS` | 216 | 41 | 未见 |
| v0.111 | `ENCOUNTER.SOUL_FYSH_BOSS` | 212 | 39 | 未见 |
| v0.111 | `ENCOUNTER.THE_KIN_BOSS` | 210 | 33 | 未见 |
| v0.111 | `ENCOUNTER.VANTOM_BOSS` | 208 | 29 | 未见 |
| v0.111 | `ENCOUNTER.WATERFALL_GIANT_BOSS` | 193 | 49 | 未见 |

版本内访问序号（记录计数，非floor/独立局）：

- v0.107：{"17": 2362}。
- v0.108：{"17": 543}。
- v0.109：{"17": 496}。
- v0.110：{"17": 343}。
- v0.111：{"17": 1481}。

## external-act2-boss：act_index=1

| cohort | 完整Boss ID | C n | Z n | W n |
|---|---|---:|---:|---:|
| v0.107 | `ENCOUNTER.KAISER_CRAB_BOSS` | 401 | 80 | 未见 |
| v0.107 | `ENCOUNTER.KNOWLEDGE_DEMON_BOSS` | 393 | 107 | 未见 |
| v0.107 | `ENCOUNTER.THE_INSATIABLE_BOSS` | 446 | 81 | 未见 |
| v0.108 | `ENCOUNTER.KAISER_CRAB_BOSS` | 100 | 18 | 未见 |
| v0.108 | `ENCOUNTER.KNOWLEDGE_DEMON_BOSS` | 86 | 20 | 未见 |
| v0.108 | `ENCOUNTER.THE_INSATIABLE_BOSS` | 121 | 17 | 未见 |
| v0.109 | `ENCOUNTER.ACTSFROMTHEPAST-CHAMP_BOSS` | 1 | 未见 | 未见 |
| v0.109 | `ENCOUNTER.ACTSFROMTHEPAST-COLLECTOR_BOSS` | 1 | 未见 | 未见 |
| v0.109 | `ENCOUNTER.KAISER_CRAB_BOSS` | 96 | 23 | 未见 |
| v0.109 | `ENCOUNTER.KNOWLEDGE_DEMON_BOSS` | 85 | 11 | 未见 |
| v0.109 | `ENCOUNTER.THE_INSATIABLE_BOSS` | 99 | 15 | 未见 |
| v0.110 | `ENCOUNTER.KAISER_CRAB_BOSS` | 58 | 16 | 未见 |
| v0.110 | `ENCOUNTER.KNOWLEDGE_DEMON_BOSS` | 63 | 13 | 未见 |
| v0.110 | `ENCOUNTER.THE_INSATIABLE_BOSS` | 60 | 11 | 未见 |
| v0.111 | `ENCOUNTER.KAISER_CRAB_BOSS` | 280 | 60 | 未见 |
| v0.111 | `ENCOUNTER.KNOWLEDGE_DEMON_BOSS` | 290 | 70 | 未见 |
| v0.111 | `ENCOUNTER.THE_INSATIABLE_BOSS` | 303 | 35 | 未见 |

版本内访问序号（记录计数，非floor/独立局）：

- v0.107：{"33": 1492, "35": 16}。
- v0.108：{"33": 357, "35": 5}。
- v0.109：{"33": 328, "35": 3}。
- v0.110：{"33": 216, "35": 5}。
- v0.111：{"33": 1030, "35": 8}。

## external-act3-boss：act_index=2

| cohort | 完整Boss ID | C n | Z n | W n |
|---|---|---:|---:|---:|
| v0.107 | `ENCOUNTER.AEONGLASS_BOSS` | 298 | 187 | 237 |
| v0.107 | `ENCOUNTER.QUEEN_BOSS` | 321 | 73 | 264 |
| v0.107 | `ENCOUNTER.TEST_SUBJECT_BOSS` | 317 | 129 | 232 |
| v0.108 | `ENCOUNTER.AEONGLASS_BOSS` | 68 | 38 | 62 |
| v0.108 | `ENCOUNTER.QUEEN_BOSS` | 99 | 19 | 74 |
| v0.108 | `ENCOUNTER.TEST_SUBJECT_BOSS` | 83 | 24 | 66 |
| v0.109 | `ENCOUNTER.ACTSFROMTHEPAST-TIME_EATER_BOSS` | 未见 | 1 | 未见 |
| v0.109 | `ENCOUNTER.AEONGLASS_BOSS` | 70 | 34 | 51 |
| v0.109 | `ENCOUNTER.QUEEN_BOSS` | 70 | 27 | 68 |
| v0.109 | `ENCOUNTER.TEST_SUBJECT_BOSS` | 81 | 29 | 50 |
| v0.110 | `ENCOUNTER.AEONGLASS_BOSS` | 44 | 23 | 28 |
| v0.110 | `ENCOUNTER.QUEEN_BOSS` | 54 | 10 | 35 |
| v0.110 | `ENCOUNTER.TEST_SUBJECT_BOSS` | 44 | 27 | 45 |
| v0.111 | `ENCOUNTER.AEONGLASS_BOSS` | 216 | 102 | 154 |
| v0.111 | `ENCOUNTER.QUEEN_BOSS` | 233 | 96 | 149 |
| v0.111 | `ENCOUNTER.TEST_SUBJECT_BOSS` | 221 | 91 | 189 |

版本内访问序号（记录计数，非floor/独立局）：

- v0.107：{"48": 1112, "49": 927, "50": 10, "51": 9}。
- v0.108：{"48": 279, "49": 246, "50": 4, "51": 4}。
- v0.109：{"48": 258, "49": 219, "50": 2, "51": 2}。
- v0.110：{"48": 166, "49": 141, "50": 2, "51": 1}。
- v0.111：{"48": 776, "49": 665, "50": 5, "51": 5}。

## 有范围的观察、反例与限制

- v0.111 / act_index=0 / ENCOUNTER.CEREMONIAL_BEAST_BOSS：C组n=218，上节点HP均值43.5688、总受伤均值24.2385；Z组n=33，对应37.3333、37.9091。两组上节点HP的p10同为27，p90为59/46，明显重叠；既非入场安全线，也不能推出某种牌/休息的收益。Z组terminal牌组大小均值22.1818，C组无terminal快照；不能拿后续整局赢家牌组填C组。
- v0.111 / act_index=1 / ENCOUNTER.KNOWLEDGE_DEMON_BOSS：C组n=290，上节点HP均值53.6379、总受伤均值24.8828；Z组n=70，对应37.6857、39.3143。C组药水/牌组节点快照available=0，Z组terminal药水均值0.4仅终局余量，不是入场携药数或漏喝收益。
- v0.111 / act_index=2 / ENCOUNTER.TEST_SUBJECT_BOSS：C/Z/W分别221/91/189记录；总受伤均值23.1855/48/20.2222。Z访问序号48:40、49:51，W为49:187、51:2；直接比较Z和W无法保证同一场次/位置。terminal牌组大小均值Z=36.7802（available=91）、W=39.1693（available=189）只描述对应终局，不能推出大牌组或任何核心牌改善胜率。
- 对“继续访问组总是有更高上节点HP”的反例：v0.109 / act_index=0 / ENCOUNTER.THE_KIN_BOSS，C组n=70、均值40.8714，Z组n=11、41.4545；同版本ENCOUNTER.WATERFALL_GIANT_BOSS为C n=68、40.5441，Z n=18、41.3889；v0.110 / ENCOUNTER.CEREMONIAL_BEAST_BOSS为C n=45、42.7556，Z n=10、44.1。这些只是代理组均值的方向反例，不能反向声称高HP有害。
- v0.109存在五个ACTSFROMTHEPAST完整Boss ID，各对应组仅n=1；保留原身份，不猜中文名、不并入相似常规Boss、不外推其他版本。has_modifiers=0并未使这些身份消失；缺模组来源定义，不擅删样本或断言其机制。

## #27/#28/#42、首批重叠与#50第4条

已读并核SHA的冻结合同：brain-strategies.md/schema、learning-protocol.md、jev-encounter-reflex.md、learning-requests.md、learning-code-proposals.md。#27/#42要求真实外部来源、版本、统计量及独立分母/限制，纯外部可信度≤0.49；本批缺独立组分母与可操作策略，不造合法外形的占位库。#28缺回合/同实体条件、候选、机制、planner capture和配对结果，不能生成combat_line或声称回放改善。冻结查询引导描述较旧，当前文档已有后续关闭决定；这是接口时点差异，本批不改变消费者。

基线策略库的同场景条目已列在overlap-audit.json：同族、VANTOM、KAISER_CRAB、KNOWLEDGE_DEMON、TEST_SUBJECT。前三者为自有证据，后两者为旧外部观察。本批不覆盖其证据、数值或ID；未来若补足证据应沿原ID增加限定或证据，不能把本次核ID当作自有验证。本批未访问原本系统日志，冲突状态unassessed，未声称一致或反驳既有机制。85条reflex仅检查身份/条件范围，不把其游戏内容引入本批推理。

首批 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-084301/learner/runs/20261024-084306-f04c0c24-c1ff-4b64-b72f-c9fc5263701e-strategy-proposal`：在2026-10-24T09:00:43.942175+08:00核查的调度状态为awaiting_review；本次未见report.md或候选文件（只见启动包装文件）。因此未虚构候选ID、未把队列状态当交付；待原首批产物实际可见后再核去重。

#50第4条沿冻结issue51-dual-boss-001.md复用原父和external-dual-boss-mapping / external-dual-boss-entry-resources / external-dual-boss-deck-and-output三单元。本批只用act-boss证据审计：v0.111第三幕C合670、Z合289、W合492是记录数，三Boss总1451不是独立局；访问序号48/49/50/51分别776/665/5/5，不能写成F48/F49映射或简单两场消耗相加。没有有序Boss配对、前场/间场资源，也没有逐位置结果交叉表，双Boss准备度保持waiting。未读取非本批绑定的dual-boss聚合。

## 精确接续请求

safe-export-requirements.json逐单元列完整需求。由原宿主若能取得实际记录，再在原请求下冻结新输入；本批没有执行这些导出，也不申请原DB、玩家ID或逐玩家明细。

- `result-semantics`：提供冻结、可审计的outcome计算规则和交叉计数：version/build_id、act_index、完整boss_id、outcome_label × has_later_record × terminal_point × end_hp_zero × run_win；明确null/矛盾记录及排除数。SQL本身未定义这些派生标签，不能仅用整局win代单战胜。
- `independent-denominators`：每个组输出boss_record_n、distinct_uploaded_runs、missing_n、duplicate_boss_visits_n、组间同局重叠计数；允许只给安全聚合计数，无需局号或玩家标识。独立玩家数与玩家簇不确定度仅在宿主可安全计算时聚合给出，否则明确unknown。
- `pre-boss-snapshot`：仅由数据实际记录的Boss战前快照输出版本/幕/完整boss_id/已核floor（或missing）/snapshot_timing/entry_hp/entry_max_hp、deck_present/potions_present及缺失数。牌组按card_id/upgrade/count聚合，药水按id/count聚合；按相同快照时点与结果分组。没有的列交不可用回执，不用previous_point_end_hp或terminal_deck补造。
- `cost-semantics`：单房间逐战聚合gross_damage、healing、entry/end_hp与可核净损；多房间保留房间顺序和无法拆分标志，不把节点总损分给个别Boss；输出各指标独立有效n/缺失数。
- `mechanisms`：在本任务允许证据范围内，补已记录且版本化的卡牌/能力机制（来源/SHA/有效版本）和攻防贡献安全聚合；只有card_id时保持unknown，不从名称或预训练推断流派、输出、防御或核心牌。
- `snapshot-validity`：terminal牌组/药水补原字段present/empty/missing计数及snapshot timing，不将SQL聚合空数组等同真实空牌组；分清死亡终局、胜利终局、幕后奖励后牌组。
- `privacy-and-license`：只交脱敏聚合、查询/导出版本及SHA和许可说明。禁止玩家标识、逐玩家/逐局明细、原DB或新下载。

第三幕另需version/build × act_index × 完整有序Boss路径 × boss_position/room_index × 结果来源的安全聚合；分别保留前场之前、两场之间、各场之后的资源与缺失计数。无法从原数据恢复的列给不可用回执，继续waiting。

## 交付、覆盖与通知

程序完整解析并校验五份安全聚合的全部140个组；模型核阅全部65个版本/幕/Boss单元的结果计数、五版本schema缺失、序号分布及相关资源/伤害分位数窗口。terminal卡牌计数程序逐值核0≤count≤group.n，保留原JSON pointer与不透明ID个数；没有逐牌机制分析，不把卡名当机制。所有输入均有实际SHA/字节核对；没有因读大文件整份输出而引入原数据。

每个waiting单元的destinations=[]，没有真实可发布候选、正式学习账本登记、release、消费者读回或自然采用。scratch来源账本不冒充正式学习账本。科学父、#28回放、#50准备度、自然消费与收益均保持开放。

需经原ops→watcher→Roy告知的限制原文：本批无法从终局牌组和上节点HP识别各幕Boss战前构筑或双Boss准备度；强行填写会使用未来信息，并把先后场和组记录数冒成同场景独立样本。请沿safe-export-requirements.json补安全聚合或明确源数据不可用；不要为了让本批processed而造阈值、核心牌或胜率。本报告只是持久交接，未声称通知已送达、未代填任何ACK。

本批无源码修改，不运行tsc/vitest，tests={tsc:null,vitest:null,cases:null}。仅做SHA/计数/缺失/单位/产物结构审计；不据启动参数报告原生档位或虚构使用量。HEAD必须保持base，最终检查见verification.json；git diff --binary留作baseline.diff。

产物：identity-check.json、source-ledger.json、三个external-act*-boss-audit.json、overlap-audit.json、safe-export-requirements.json、result.json、audit.py；artifact-manifest.json保存实际产物SHA。
