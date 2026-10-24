# #54 外部构筑统计与 #51 学习入口

只处理已经下载的 sts2.fun 公共库，产出描述统计和有界代表轨迹；不下载、不读玩家标识、不进 live、不改大脑或派发计划。游戏解释、流派命名、构筑剧本与正式策略仍由 #51 学习者完成。

## 复跑

在包含现有数据库、目录缓存与原导出身份回执的主运行根执行；开发树可把输入改为该主根的绝对路径。仅使用 Python 标准库，单进程 nice19：

```bash
nice -n 19 python3 -B eval/sts2fun_build_stats.py \
  --db data/external/sts2fun/sts2_public.db \
  --catalog data/game-data.json \
  --provenance knowledge/external/sts2fun/silent-a10.json \
  --identity-receipt paper/materials/20261024-issue51-p0-0802-ops/deck-export-receipt.json \
  --cache data/external/issue54-safe-cache \
  --output knowledge/external/sts2fun/builds-v1
```

原库仅一次白名单投影，之后使用忽略目录里的脱敏 gzip 缓存。SQLite 只读，禁止玩家表与 player_id、seed、run_hash、时间等非白名单列；SQL 逐字段重建牌/遗物/节点 JSON，不把 raw_json 或 player_stats 整对象交给 Python。SQLite 内部 JSON 解析不可避免访问源文档字节，但标识字段的值从不被选择、返回或序列化。缓存绑定源库身份、SQL/投影代码SHA与缓存SHA，失配要求另建独立缓存；不自动覆写历史缓存。

有原身份回执时沿用取得时完整数据库SHA，并核当前库大小/mtime与原回执完全相同，明确不声称重新完整哈希13GB；没有回执时计算源库完整SHA。两种口径都在导出/计算后复核文件大小/mtime。数据集来源JSON中的DB SHA必须相同。公开结果记录完整筛选、数据/目录缓存/程序/SQL SHA、下载日与精确版本/build分母。

在相同命令末尾加 `--check`，通过缓存重算并逐字节核所有输出，不写输出；不再导出原库。`--clusters 6..10` 默认8，`--min-support` 默认10。参数必须随结果冻结，不能按胜率或显著性挑参数。

独立核对：

```bash
nice -n 19 python3 -B eval/verify_sts2fun_build_stats.py \
  --cache data/external/issue54-safe-cache \
  --output knowledge/external/sts2fun/builds-v1 \
  --db data/external/sts2fun/sts2_public.db \
  --require-examples --receipt data/external/issue54-sample-verification.json
```

核所有产物SHA与40个流派/版本单元、固定随机24个组合的匹配分母/存在计数、12个Boss单元、8个时间线单元及全部代表轨迹的终局牌组/节点/HP/选项；另取原库每版本前2条、共10条同口径白名单投影，直接对照冻结缓存。不会选玩家标识，不作玩家调整。`--require-examples` 要求每簇10～20局且胜负各半；小合成测试可以省略该约束，短缺不伪造补齐。

## 产物与方法

所有数据在 `knowledge/external/sts2fun/builds-v1/`，均标 `external:sts2fun`、Silent A10、observational，并保留限制。v0.107～v0.111结果分列，不把6348个上传记录当独立玩家；玩家数/同玩家相关性未知。

| 文件 | 口径 |
| --- | --- |
| archetypes.json | v0.111已到第三幕的最终牌组作几何参照，二元TF-IDF、球面k-means、固定seed与最远点初始化，最多40轮；不使用胜负建词表/质心。所有版本全部终局牌组回分到同一8簇；给核心原ID/权重/出现率、样本/胜率、各幕Boss到达比例、相似度及间隔。早死短牌组不主导参照，早期牌组回分仍可能模糊；簇号是数据标签，不是预设玩法定义。 |
| combinations.json | 同版本/同簇赢家与末幕相同、最终记录节点差≤3的输家做确定性1:1无放回匹配；候选为按不读胜负的出现频率选取的前16牌+8遗物，两两/三三（含混合）全部列出。给双方出现数/分母、配对不一致数、出现率差百分点/比例、单侧精确配对二项p，以及全体簇/版本/候选族BH q；不只保留正结果。差值是出现率关联，不是拿牌带来的因果胜率提升。 |
| timeline.json | card_choices 的实选顺序联合 cards_gained、移除、变形和升级轨迹；同节点重叠来源以逐ID最大副本数去重。起始牌组由每版本最早 floor_added 的终局保留牌组众数推定，未写死初始牌或流派。与终局完整副本计数对照，记录精确一致、精确日期选择覆盖、精度/召回及缺口。核心组合用已通过q门的候选；没有时明确采用质心前三牌的描述性bundle，不声称发现显著组合。赢家组合成型幕/节点分布与未观察成型/还原排除数分账；第一、二幕末只用已观察到下一幕且终局还原一致的赢家。防御数限定为固定目录中正block字段牌的副本数（代理），未映射牌未知；不包括全部间接防御，目录历史版本对齐未验证。 |
| matchups.json | 簇×版本×实际Boss ID。单房间/回合正值且无矛盾时，以后继记录或终局win+正HP列通过代理；无后继/非win/非正HP列终止代理。非正HP却有后继或整局win、其余终止情况均unknown。逐build列标签×后继×终止×零HP×整局胜负交叉计数，上传行/重复访问/组间重叠分母；多房间不拆结果或成本。进Boss前HP严格是前一记录节点结束HP代理，绝不称真实入场HP。终局聚类包含生存/结局信息，表不证明因果“克制”。 |
| representative-timelines.json | 每簇10对（20局），优先v0.111、同版本同簇，按前5节点已记录拿牌/所得牌/遗物的Jaccard近邻贪心配对，胜负各半、内容摘要不重复；空画像的相似度未知。每局保留全部记录节点，压缩列数组含房间/HP/资源、所有已记录给牌选项及是否实选、所得/移除/变形/升级、遗物取得/移除。原记录没有的事件题面、药水操作、初始快照与玩家意图不补造；“完整”指节点覆盖，不指全部原始字段。例号为脱敏投影摘要，不是本系统局号或原库玩家/种子/运行标识。 |
| boss-semantics.json | #54语义补包：第三幕已记录Boss有序前缀/位置、各位置结果及前节点末/本节点末HP代理；记录序号不是floor。逐项列出真实入场/场间快照、牌组/药水、历史机制、独立玩家等不可用项。只复用原缓存，不扩原库字段。 |
| manifest.json / safe-projection.sql | 最终输出SHA清单与唯一白名单投影语句。 |

终局数量一致并不证明每个中间节点正确，推定起始牌组与未知改造/重复来源仍可能抵消；时间线是事后还原。终局牌组聚类、按终止深度匹配及上传选择也都有生存/选择偏差。p/q与Wilson仅为记录独立/配对可交换假设下的名义描述，缺玩家ID无法做玩家整簇校正；不据此自动赋高可信度或修改策略。

## 给学习层的有界读法

`eval/sts2fun_build_view.py` 先核选中文件的manifest SHA，再按簇/版本分页；默认32KiB，完整页超限就要求减少limit，不截断单局。代表轨迹的limit单位是胜负配对，一页包含两条完整记录时间线与列名：

```bash
nice -n 19 python3 -B eval/sts2fun_build_view.py \
  --root knowledge/external/sts2fun/builds-v1 --version v0.111 \
  --cluster 6 --kind representative-timelines --offset 0 --limit 1
```

先用 `--kind archetypes` 读核心原ID与分母，按返回的 next_offset 顺序读该簇10对代表局；组合表可 `--kind combinations --limit 20`，时间线汇总用 `--kind timeline`，Boss表用 `--kind matchups`。示例簇号只演示读取接口，语义命名、是否对应目标毒/刀刃方向由学习者依原ID和整局证据确认。读取是只读统计查询，不推进 #48/#51 的原生消费游标。

## 本批交付口径

固定筛选6348局，5版本分别2932/683/583/411/1739。8簇覆盖全部样本；40个流派/版本单元、29518个配对组合、40个时间线单元、482个Boss单元；160个代表轨迹（80胜/80负）。6291局终局还原通过投影有效ID的严格计数/缺口检查；其余显式排除时间线汇总，不补值。原投影计1个非法终局牌ID被排除，详见projection_audit；一致性不代表原文全字段完整。

本次952对深度匹配中，29518个候选无一通过全族BH q≤0.05；保留原p/q、原计数及探索性差异，不能把未校正相关性写成确认组合。原聚类可依据 core_cards 查找 #51 所需方向，流派命名与毒/刀刃等语义解释交学习者，不由脚本手工定义。

#51 原ops可以冻结这四表与对应代表轨迹作为学习输入。入口代码、统计数据、样本核对通过，不等于构筑剧本已产出、正式策略/rk已发布、消费者已读回或自然收益；科学父保持。无需变更现有 external_stats 查询文件、live 或大脑。

ops 新增语义核查按 `boss-semantics.json` 的8项 availability 回执保留不可用项；`--kind boss-semantics` 可分页读取。160轨迹是#54新授权输入，不冒充旧085327批aggregate-only已经读过的范围；旧批仍由原owner冻结后接续，waiting不伪造完成。
