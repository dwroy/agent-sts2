# sts2.fun 外部统计字段与边界

任务：[#24](https://github.com/dwroy/agent-sts2/issues/24)。本目录外部游戏统计统一标 `source: external:sts2fun`，并非本系统实盘验证；自身历史日志对照另列来源和冻结前缀，不混合分母。只做离线研究，没有生产消费者、知识写入或 live 发布。

## 来源

- 下载入口：<https://sts2.fun/static/sts2_public.db.zst>，取得日期 2026-10-21。
- 获取时压缩包 759,783,329 字节，SHA256 `0f3e1660cdd41665c5e29695232137252187713a5fde87fb888ab3e228c69ac7`；来自 #24 获取回执，未重新下载。服务器 Last-Modified 为 2026-10-05（获取者记录，不作为实际游戏日期）。
- 解压库大小与本次实算 SHA、源码 SHA、目录文件 SHA 分别见 `provenance.json`、`manifest.json`。
- [来源 FAQ](https://sts2.fun/faq) 公开数据库下载，并说明自愿上传、无法查出只传胜局、跨设备可能拆分账号。2026-10-21 查阅时未发现明确的数据集再分发许可证；仅提交有署名的聚合结果，不再分发原始库。公开下载入口不等于已经核实再分发许可。
- FAQ 对“匿名化”的描述不作为本地库安全保证。SQLite authorizer 拒绝所有非 `runs` 表的数据读取；查询不用 `players`，不连接玩家表，不输出外部局 ID、整数玩家 ID、对局种子、平台 ID、姓名、外链或凭据。聚类表的 `seed` 只是本地算法的固定初始化种子。

## 查询和字段

连接使用 `file:…?mode=ro`，另设 `PRAGMA query_only=ON`、16 MiB SQLite cache、关闭 mmap。单 Python 进程、stdlib，无安装依赖；调用必须 `nice -n 19`。按行读库，只保留分析投影，原始 JSON 不落副本。

```sql
SELECT player_id, patch_major, win, raw_json
FROM runs
WHERE character='SILENT' AND ascension=10 AND n_players=1
  AND is_valid=1 AND was_abandoned=0 AND has_modifiers=0
  AND patch_major IN ('v0.107','v0.108','v0.109','v0.110','v0.111')
ORDER BY id;
```

| 字段 / JSON 路径 | 用法与限制 |
|---|---|
| `character`, `ascension`, `n_players` | 只纳入 Silent A10 单人局 |
| `is_valid`, `was_abandoned`, `has_modifiers` | 站点有效标记、未弃局、无额外 modifiers；不等于已排除所有作弊或 SL |
| `patch_major`, `raw_json.build_id` | 五个版本分账，主样本 v0.111；完整 build 分布另列，不能跨版本直接套牌值 |
| `player_id` | 只用整数、只在内存中分层和 bootstrap；不输出逐玩家结果。账号并不保证等于独立自然人 |
| `win` | 整局最终胜负；不是本幕通过率，也不是某次拿牌的因果收益 |
| `players[0].deck[].id` | 结束时牌组（包含败局死亡时牌组），升级合并为基础卡 ID；张数保留重复牌，聚类用二元存在特征 |
| `players[0].deck[].floor_added_to_deck` | 解析时保留；不据此手写流派或牌值规则 |
| `players[0].relics[].id` | 最终遗物 ID，仅建立映射，不解释游戏效果 |
| `map_point_history[act][point]` | 外层数组确定幕；跨幕累加访问点序号为楼层代理。统计按幕分组，不用固定 17 层切幕 |
| `point.rooms[].room_type` | 只把单 room、类型为 monster/elite/boss 的 card choices 作为候选战斗奖励 |
| `point.player_stats[0].card_choices[].card.id`, `was_picked` | 仅保留 3 或 4 张、无重复 ID、最多一张被选的奖励点；6/7/9/10 张等多组扁平记录不猜边界。商店、事件和休息点全部排除，跳过率单位是保留的奖励点 |
| `point.rooms[].model_id` | 原样保留遭遇 ID，不猜 Boss/敌人名称的语义映射 |
| `point.player_stats[0].damage_taken` | 来源记录的总受伤量，不能解释成战斗前后 HP 净差；治疗、药水、牌组不同。只纳入单 room 可归属的战斗 |
| `point.rooms[].turns_taken` | 回合数必须大于 0；连战多 room 记录不把一个点的伤害重复分配给各场，排除并计数 |
| `point.player_stats[0].current_hp` | 只用于标记记录末尾死亡；不推断未观测到的后续回合 |

## ID 映射

`id_mapping.csv` 列出五版本的最终牌组、保留的战斗奖励和最终遗物中出现的所有 ID：去掉 `CARD.` / `RELIC.` 后，与本系统 `data/game-data.json` 的同类 `id` 精确匹配。未匹配项 `local_id` 留空，`mapped=false`，同时列入 `summary.json`。映射次数为这些输入范围内的出现次数，不是独立局数。

本系统缓存通过原 mod 接口获取，本任务不读游戏二进制，不修改卡牌模型。不把名称相同或 ID 相同当作跨版本机制完全一致。遗物的映射不等于已实现其模拟效果；遭遇保留外部 `ENCOUNTER.*` ID，不能强行对到本系统怪物 ID。

## 输出约定

- 比例均为 0–1；差值为比例差，乘 100 得百分点。CSV 内列表/对象为 JSON 单元格，空标量表示无分母，JSON `null` 表示无法估计。
- `card_choices.csv`：每版本、每卡、all/各幕，提供/拿取/未拿分母、胜局数、拿取率、胜率及区间、玩家/幕调整与高频玩家敏感性。
- `skip_rates.csv`：每版本、all/各幕的保留奖励点跳过率及区间。
- `deck_sizes.csv`：每版本、结束牌组张数每五张分箱的胜率；另列已到第三幕子样本，不能把死亡造成的薄牌组误判为薄牌组策略效果。
- `encounters.csv`：每版本、各幕 elite/boss 遭遇的受伤与回合分布（均值、SD、p10/p25/中位数/p75/p90/p95），含死亡，人数/场次分账。第一幕 Boss、各精英和第三幕 Boss 均可直接筛选。
- `clusters.csv`, `cluster_pairs.csv`：仅主版本、全体/到第三幕两个范围、k=3/4/5、三个初始化的玩家隔离评估。卡片标签从共现数据产生，编号不跨实验对齐。
- `cooccurrence.csv`：仅主版本、共现至少 20 局的卡对，输出支持数、lift、Jaccard；高频超过 90% 的卡不列入。关联不是协同收益。
- `brain_comparison.csv`：本系统已结束 Silent A10 局、成功 Codex `reward/card`，与主版本人类同卡同幕拿取率相减；每局/幕/层首个成功题，重复访问/SL 不累加；不等于逐题决策一致率。
- `card_choices_mapped_only.csv`, `skip_rates_mapped_only.csv`：仅 v0.111，排除最终牌组、保留奖励或最终遗物存在未映射 ID 的局，重复计算的敏感性结果。未映射可以来自版本更名或 mod，不能据此断言作弊；映射完整也不保证纯净。
- `summary.json`：版本分母、完整 build、解析排除数、逐版本未映射 ID 的局数、整体胜率玩家簇区间和自身日志冻结前缀。

## 区间与分层

每个版本分别按整数玩家整簇重抽样 1,000 次（有放回，固定种子 240111），簇内全部局、奖励点共同保留。百分位 95% 区间用于拿取率、拿/不拿胜率、两组胜率差、跳过率及牌组张数胜率。原始 Wilson 区间只描述二项分母，不适合作为重复观测独立性的证明。零分母给空值；可用 bootstrap 次数保留，小玩家数/极端比例时区间仍可能退化。

按玩家与幕做重叠样本调整：同一玩家同一幕中，两组都观察到该牌时，以 `n_pick*n_no/(n_pick+n_no)` 为权重平均组内胜率差；再按玩家整簇 bootstrap。`matched_players/strata/offers` 给出可比覆盖。这个统计消除一部分玩家水平与幕混杂，但牌组、当前 HP、遗物、被提供的其他牌、同一局重复提供、路线和拿牌时机仍可能混杂。玩家只挑某类局上传的问题也未消除。

另列同版本至少 10 局玩家的拿取率与原始胜率差。门槛是事先设定的敏感性检查，不是“高手”定义。版本不池化，角色不池化，外部数据不计为本系统验证。

聚类在随机固定的一半玩家中发现，另一半玩家中评价；不使用胜负选择词表/质心。训练词表只保留出现至少 max(10 局, 2%) 且不超过 95% 的卡，二元 TF-IDF 后做球面 k-means。k=3/4/5、种子 24/240/2400 事先固定；报告主口径为 k=4/seed=24，其余保留用于敏感性检查，不按最高胜率择模型。每组 distinctive cards 为评估组内出现至少 max(5 局, 10%)、相对评估总体 lift 最大的 12 张。它们是描述标签，不是预先定义的流派。

流派胜率百分位区间沿用主样本 98 个玩家的整簇抽样权重，只在评估局上重算比率（训练玩家在评价分母中贡献零），条件于固定玩家划分和已经学出的训练质心。两两差异使用玩家簇 influence 的标准误和 Bonferroni 同时 95% 正态区间（每个 scope/k/seed 内所有卡组对）；小样本下正态近似不稳，跨 18 次模型的搜索没有统一校正。两组胜率能区分也不证明改变构筑会改变胜率；区间没有包含重新训练聚类的不确定性。全体最终牌组尤其有结果信息泄漏与存活偏差，第三幕范围也未固定最终取牌时点。

## 复现

在仓库根目录执行（不下载、不安装依赖、不启动游戏）：

```bash
nice -n 19 python3 -B eval/sts2fun_stats.py \
  --db /home/dw/Projects/agent-sts2/data/external/sts2fun/sts2_public.db \
  --source-root /home/dw/Projects/agent-sts2 \
  --output data/external/sts2fun-replay \
  --snapshot-date 2026-10-21 \
  --own-manifest paper/materials/2026-10-21-sts2fun-stats/summary.json
```

`--own-manifest` 校验既有日志字节前缀的 SHA，追加的游戏日志不进入重放；前缀变更或截短直接失败。首次研究可省略该参数，在启动时冻结两个日志的大小。`own_manifest.parse_audit` 保留损坏 JSON、非对象行和截断末行的排除数，不输出行内容。只消费完整 JSON 行；完成日志中的 Silent A10 局与 Codex 成功题按题记录筛选，不能把这个混合历史版本窗口解释成当前生产策略。

`manifest.json` 覆盖程序生成时目录里的 CSV/JSON（自身除外），不是原始数据副本。`provenance.json` 给出解压库、本地游戏数据目录缓存、脚本和冻结日志前缀的 SHA；复现前需核对这些输入。测试使用合成固定数据，命令与结果另见 `verification.json`。
