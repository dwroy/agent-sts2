# #26 外部统计查询工具

基线 `04340d95fcad838801d11750e1982c960f8b0d16`。实现只读、确定性的外部统计 ToolDef，数据来自 #24 已提交的聚合表；没有访问外部原库、重新下载或增加策略结论。外部样本只标 `external:sts2fun`，不计入本系统自有分母或实盘验证。

## 工具与注册

`agent/src/brain/tools/external-stats-tools.ts` 导出 `externalStatsTools(): ToolDef[]`。由 #33 加入 agent 模式的知识工具集合；本任务不改 registry、引擎、路由、题面或前缀。

| 名称 | 参数与返回 |
| --- | --- |
| `external_stats_card` | 必填 `id`（精确卡 ID，可带 `CARD.`）；可选 `act=1/2/3`。提供/拿取次数、拿取率及玩家簇区间、拿/不拿整局胜率及区间、原始胜率差及区间、玩家×幕重叠权重调整差及区间、重叠玩家/strata/机会覆盖。 |
| `external_stats_skip` | 可选 `act`；保留奖励点数、跳过数/率和玩家簇区间。 |
| `external_stats_deck_size` | 可选 `scope=all/reached_act3`，省略列两范围；结束张数分箱、局/玩家/胜局、胜率及区间。 |
| `external_stats_encounter` | 必填 `id`（精确遭遇 ID，可带 `ENCOUNTER.`）；可选 `act`。外部总受伤、回合、死亡分布，场次/独立局/玩家与逐指标分母/缺失量，仅 v0.111。 |
| `external_stats_clusters` | `scope` 默认 reached_act3，`k=3/4/5` 默认 4，`seed=24/240/2400` 默认 24；数据簇、标签、评估局/玩家/胜率及区间，仅 v0.111。 |
| `external_stats_cooccurrence` | `scope` 默认 reached_act3；可选 `card`、`with_card`（需同时给 card），查全局、单卡或精确卡对；共现局数、范围总局数、各卡局数、lift/Jaccard，仅 v0.111。 |

所有工具可选 `version`（v0.107–v0.111，默认 v0.111）、`limit`（1–10，默认 4）、`offset`（0–10000，默认 0）。不指定幕时，卡/跳过列 all 和各幕，遭遇按已有幕返回。卡 ID 不猜中文映射；遭遇 ID 不猜怪物/本系统映射。

ToolContext 仍用既有合同：`knowledgeDir` 定位聚合，`ascension` 加当前 `knowledgeCharacter()` 检查范围；非 Silent 或非 A10 返回无数据，不跨角色/进阶套用。挂载者须沿原工具约定设置本局角色。JSON 文本经既有 ToolResult 返回，成功包含 `status=ok`、来源/版本/下载日、原库 SHA、聚合输入 SHA、紧凑数据 SHA、整版本局/玩家/build 样本、局限和完整统计行。

`total_rows/returned_rows/next_offset` 支持分页。每次返回上限 **16000 UTF-8 字节**（含来源和局限），仅删除完整末行并给下一 offset，不截断数值、区间或来源；输入最多 2048 字节。空结果、缺文件、文件损坏、SHA 不符、输入错误和不支持版本均返回 `isError=true`、明确“无数据”及原因，保留来源和局限，不回退到网络、原库或自有统计。无数据不作零值解释。

注册协调：[已向 #33 提交接口](https://github.com/dwroy/agent-sts2/issues/33#issuecomment-6325811962)，另已提醒 [MCP 子进程显式保留本局角色身份](https://github.com/dwroy/agent-sts2/issues/33#issuecomment-6326133784)（进程内 setKnowledgeCharacter 不会自行传到子进程）。本任务只提供模块，实际挂载、自然对局工具调用日志与首局读回仍由 #33、集成员和 ops 完成。

[#33 已确认合同](https://github.com/dwroy/agent-sts2/issues/33#issuecomment-6326522042)：查询实际在对局控制器进程内执行，共用 knowledgeCharacter()/ctx.ascension，不另起加载知识的子进程；将按本任务精确提交接入六工具并做联合固定查询、角色隔离和挂载验证，不另造统计格式。其方案因此没有上述跨子进程角色传递问题；确认接入方案不等于已经挂载或自然采用。

## 数据与复现

`knowledge/external/sts2fun/silent-a10.json` 独立于 `knowledge/characters/` 的自有统计，列式紧凑编码，1775714 字节。SHA256：`88eef1cd8b875ab27d47c3abc39335f271705672b53bd71a0f4b30286168ac07`。运行时核对固定 SHA，拒绝替换或损坏后的统计。

`agent/tools/build-external-stats.py` 只读取上述基线 Git blob，使用标准库，不需依赖或稀疏展开历史材料：

```sh
nice -n 19 python3 agent/tools/build-external-stats.py --check
```

生成器只投影以下聚合字段，不拟合、不重新算统计：

- `2026-10-21-sts2fun-stats/` 的 `card_choices.csv`、`skip_rates.csv`、`deck_sizes.csv`、`clusters.csv`、`cooccurrence.csv`；`provenance.json/summary.json` 只取外部来源和外部版本样本，不复制自有日志清单或自有统计。
- `2026-10-21-sts2fun-combat-diagnostic/combat_distribution.csv` 只选 `source=external, scope=encounter`，显式白名单投影总受伤/回合/死亡列，排除所有 own 行及 HP 净差/首次失败等自有指标。
- 数据文件记录所有输入 blob SHA。外部原库 SHA 继承 #24 获取回执（未重下载或重哈希）；下载日 2026-10-21，源地址 `https://sts2.fun/static/sts2_public.db.zst`。FAQ 未核实明确再分发许可，保留聚合署名、不发布原库或玩家/逐局标识的限制。

## 口径与局限

返回逐项保留 #24 限制：自选上传、非因果、玩家重复、死亡截断、存活偏差、版本不池化及与自有口径不同。卡的 offered 是机会数，不是独立局数；卡/跳过的逐行独立局数以及跳过的逐行玩家数原表未提供，明确未知。调整表只有胜率差，**没有分别调整后的两组胜率**，不补造数据。遭遇返回 gross_damage（总受伤），不混成 HP 净损失。

流派和共现的所有返回（包括错误）固定附带 **“现有样本无法区分流派优劣、不作方向依据”**。保留第三幕主模型六对及敏感性 57 对无法分辨、最终牌组含未来信息等限制。lift 只描述“常一起出现”，不解释为拿牌增益或协同收益。

## 验证与交付状态

新增 `agent/tests/external-stats-tools.test.ts`，34 项固定测试覆盖六工具的校验、来源/样本/区间、返回字节上限、完整分页、缺失/损坏/被替换数据、未知 ID、角色/进阶/版本边界、流派必带无法区分和外部分账。

读回核对：SNAKEBITE all 提供 2188、拿取 533（533/2188），重叠 56 玩家/1806 机会；第一幕跳过 1456/13307；DECIMILLIPEDE_ELITE 外部 762 场/758 局/82 玩家、死亡 52、总受伤中位 16、回合中位 4。默认第三幕 k=4/seed=24 簇 0 为 60 局/36 胜/23 玩家；BULLET_TIME/NIGHTMARE 共现 28/1739，lift 3.2602611315701373。均保持原聚合精度。

类型检查和固定输入逐字节重建已通过。首次完整 648 文件运行：646 文件通过、2 文件失败（6122 项通过、2 失败、2 原有跳过）。一项是稀疏树未展开 #29 的既有 `results.jsonl`，另一项是既有 V6 实时限额夹具样本数不足（8/2/2/8，断言要求全部 8）。前者已通过原 materialize 工具从同一基线恢复；后者源码、夹具、预算与断言均未修改，原样单独重跑即完成全部 8 样本。两文件共 5 项重跑通过，首次失败原件保留。

最终完整复核用临时测试配置顺序执行：常规文件单线程，路径文件及上述 V6 时限夹具单独 fork；不删减测试文件、不改生产或既有测试及其时限。结果 **648 文件全部通过，6124 项通过、2 项原有跳过，退出 0**，用时 1467.96 秒。最终 `npx tsc -p tsconfig.json --noEmit`、逐字节重建、源码/数据/原始测试输出 gitleaks 均通过。命令、完整结果和 SHA 回执见 `verification/` 和 `verification.json`；原始测试输出以 gzip 无损保存并校验解压读回。

当前仅开发分支交 review，未合 main/live，未产生行为发布号或自然采用/收益结论。不改 live/STOP、不运行 play、不关其他会话。依 #26/#33 及 Roy 通知，由集成员联合检查，ops 在自然局边界上线，首局实际读回后主管验收；不做上线前后检查点指标对比。
