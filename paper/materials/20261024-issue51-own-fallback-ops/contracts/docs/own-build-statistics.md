# #54 自有四表、外部并列与决策字段补包

按 #51 评论 [6378443035](https://github.com/dwroy/agent-sts2/issues/51#issuecomment-6378443035) 和 [6378493412](https://github.com/dwroy/agent-sts2/issues/51#issuecomment-6378493412) 追加。外部仍为学习主证据，自有只作独立对照；不改复盘模板、派发计划、消费游标、live 或大脑。本轮没有模型/对局/full。

## 外部 `.run` 字段先核

在原取得库上用新授权字段作独立白名单投影；不下载、不读取玩家标识、seed、原库局号或原文对象。不覆盖原 `builds-v1`、160代表轨迹或旧085327批冻结范围。新结果位于 `knowledge/external/sts2fun/decision-fields-v1/`：statistics.json、safe-projection.sql、manifest.json；五版本、八个build仍分别列计数，合计6348上传记录/207997记录节点。

| 类别 | 实际记录 | 缺口与学习口径 |
| --- | --- | --- |
| 开局祝福 | ancient_choice：13583节点、40749选项；保留TextKey、title的定位键/表、was_chosen | 原统计含各幕古代人；第一幕只作开局祝福代理，未核每局首节点与完整初始快照；不从名称解释机制。 |
| 商店 | bought_colorless 3175次、bought_relics 8242次、bought_potions 3869次 | bought_cards在全部207997节点缺失。普通牌在商店节点的cards_gained仅作取得代理；没有逐物价格、购买前金币和完整货架拒选。 |
| 删牌 | cards_removed：10957节点、12824牌次 | 不能把每次移除都称付费删牌。房间类型只作来源代理。 |
| 事件选项 | event_choices：40959节点、46159条title定位键/表 | title是对象，不是纯文本；不导出variables或推断其含义，未记录完整未选项/动机，不能据标题补机制。 |
| 药水获得/使用 | potion_choices 97542选项（带was_picked），potion_used 42521次、potion_discarded 7097次；另列终局保存字段计数 | 只有节点级使用/丢弃，不含回合时机、用药前HP和双Boss场间真实持药。终局药水字段不代入场快照，也不能将无使用记录直接称“有机会却没用”。 |
| 休息/锻造 | rest_site_choices：37295节点、38454选择；upgraded_cards 31941牌次 | 节点末HP不是选择前HP，前节点末HP只作代理；升级ID与选择并存不保证逐动作一一对应。 |

`field_availability`逐build列字段缺失/null、空数组、非空、错误类型、非法条目与非单人节点排除；**字段缺失不证明没有动作**，不能直接作拒选对照。条目聚合独立列条目次数、上传行数、整局赢家条目次数与赢家上传数。整局胜率关联不代单战结果或因果提升。decision_unit_readiness明确前3类能学的节点级事实与不能学的时机/阈值，缺真实时机可由自有数据补充，但不冒外部证据。

```bash
nice -n 19 python3 -B eval/sts2fun_decision_fields.py \
  --db data/external/sts2fun/sts2_public.db \
  --identity-receipt paper/materials/20261024-issue51-p0-0802-ops/deck-export-receipt.json \
  --provenance knowledge/external/sts2fun/silent-a10.json \
  --cache data/external/issue54-decision-cache-v3 \
  --output knowledge/external/sts2fun/decision-fields-v1
```

有原身份回执时沿用取得时完整DB SHA，当前大小/mtime精确核同，不声称重算13GB全SHA。缓存绑定查询/程序/原库身份/自身SHA。追加 `--check` 只经缓存逐字节重算，不再扫描原库。

## 自有四表与全局对照

`knowledge/characters/silent/build-statistics-v1/`含：archetypes.json、combinations.json、timeline.json、matchups.json，comparison.json四类并列，run-index.json全部506个合格局索引，以及games/下114份代表整局。原外部四表与代表局字节不变。冻结源508个终局；排除手动/交接Z2KBGZQMSRV5及手动窗重叠整局，另排除KF9HMZKTFC3V终局摘要有胜但末态帧缺失后，自有506个合格Silent局（A10为466，全部17胜），每进阶、重试/预判必死证据分层，46个流派/分层单元、1842组合、46时间线单元、204个Boss目标/真实敌人单元。没有把其他角色算入Silent验证。

- 用外部冻结8簇质心和IDF回分全部506个合格局；不混合拟合、不手工定义流派。稀疏簇代表数量不足20时如实保留（8簇分别2/20/9/20/20/20/8/15），不伪造胜负各半。
- 自有最终牌组取最后已记录牌组；是否GAME_OVER快照另标。时间线用真实记录牌组，幕末仅在已见后幕时取该幕最后记录快照。核心仍是外部质心原ID，前三ID仅描述性bundle，防御仍是相同目录正block代理；未映射与缺帧未知。首次观察到核心不等于实际首次获得。
- 自有组合只在同进阶/SL分层/簇内用与外部相同近深度1:1配对和全族BH，固定最低支持2，配对少于10标low_n，不因小样本抬可信度。无配对组保留coverage，不补赢家或虚构组合。
- 主并列是自有A10 **no_retry_evidence 123局/4胜** 与外部v0.111 **492个赢家**。自有游戏版本未在这些日志库字段记录，明确unknown；absence of retry evidence不证明没SL。直接列同簇核心/组合出现率差百分点、第一幕已记录bundle比例差、幕末核心/正block代理副本均值差及各自原分母；不把外部ordinal与自有floor相减，不将其差异写成因果“晚几层/防御不足”。这是给学习者找偏离点的证据，解释与阈值仍由学习者给出。
- 重试或predicted_death组独立；first_attempt_end仅记录首次预判必死截止代理，不能用最终牌组倒充首次失败牌组。SL触及战斗的原logdb净损另保留为recorded_view，分析用单次净损置unknown；最终结果仍标原视图口径，不能当每次尝试独立战绩。
- Boss按真实敌人encounter和首战斗帧run.boss_id目标并列；未核目标与双Boss当前遭遇一一映射。外部只机械匹配目标原ID，明确不认证实际遭遇。自有首记录战斗HP不是保证动作前原子入场，外部前节点末HP继续标代理。
- 114份自有代表局优先A10，保留实际逐层/改牌快照、每场战斗HP/结果、每道已抽取构筑决策的题型/选项/选择/理由、整局计划、死因及关键已记录净失血战。题目/理由沿原logdb抽取器，可能已有截长；不是完整原生prompt。每条保留原日志off/len，完整是该投影的记录覆盖，不补不存在的题面或意图。

`eval/own-build-exclusions.json`固定ops 6378529758的整局排除及08:38:01—09:56:28（北京时间）手动窗口；另要求终局清单与最后已记录GAME_OVER快照胜负一致，cohort_audit列源508/合格506/排除2及原因；活动BP9C8K9NSRZ0不在冻结终局清单，不提前纳入。原日志/缓存不删，排除策略SHA单独冻结。

自有只读冻结manifest列出的既有Parquet分片，逐片导出前后核完整SHA/大小/mtime，不同步、不读全量17GB状态日志。首次使用已有DuckDB环境；不安装依赖：

```bash
nice -n 19 data/logdb-venv/bin/python -B eval/own_build_stats.py \
  --logdb data/logdb --cache data/external/issue54-own-cache-v2 \
  --external knowledge/external/sts2fun/builds-v1 \
  --external-cache data/external/issue54-safe-cache --catalog data/game-data.json \
  --output knowledge/characters/silent/build-statistics-v1
```

已冻结缓存后可用普通python3，追加 `--check` 逐字节核产物。外部缓存只读取原脱敏投影，不重新访问原库；对应原库SHA、模型SHA及manifest SHA独立固定。

## 有界读法与核验

所有页核manifest字节/SHA；默认32KiB，超限减少limit，单条不截断。自有按进阶/SL/簇读；game按snapshots/fights/questions/plans分页，保留完整单条、页偏移和总数。读完所有页才称读过整局。

```bash
nice -n 19 python3 -B eval/build_stats_view.py \
  --root knowledge/external/sts2fun/decision-fields-v1 \
  --kind availability --field potion_used --version v0.111
nice -n 19 python3 -B eval/build_stats_view.py \
  --root knowledge/characters/silent/build-statistics-v1 \
  --kind comparison --table timeline --cluster 3 --limit 1
nice -n 19 python3 -B eval/build_stats_view.py \
  --root knowledge/characters/silent/build-statistics-v1 \
  --kind run-index --cluster 3
# 用索引返回的真实run_id，逐section按next_offset读回：
nice -n 19 python3 -B eval/build_stats_view.py \
  --root knowledge/characters/silent/build-statistics-v1 \
  --kind game --run-id RUN_ID_FROM_INDEX --section questions --limit 1
```

独立核全部506个合格局回分与分母、114份代表局所有快照/战斗/构筑题/计划原投影逐条同值，另抽24自有组合、24项来源并列差值与8时间线；外部核104字段覆盖单元并抽24条目。命令：

```bash
nice -n 19 python3 -B eval/verify_own_build_stats.py \
  --own-cache data/external/issue54-own-cache-v2 \
  --own-root knowledge/characters/silent/build-statistics-v1 \
  --external knowledge/external/sts2fun/builds-v1 \
  --external-cache data/external/issue54-safe-cache \
  --decision-cache data/external/issue54-decision-cache-v3 \
  --decision-root knowledge/external/sts2fun/decision-fields-v1 \
  --receipt data/external/issue54-addendum-verification.json
```

这份追加仅交统计/字段可用性和有界学习输入。原ops另行冻结新输入后接原#51；不声称新单元启动、策略/rk发布、消费者读回或收益，不关闭科学父。原外部批与本次追加分别保留来源和身份。
