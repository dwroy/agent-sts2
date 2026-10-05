# 静默猎手爬阶记录

## A0 → A1（2026-10-05 04:26 CST）

A0 窗口为 2026-10-04 21:41:44 至 2026-10-05 03:47:45（CST）。统计只含 `runs.jsonl` 中已结束的 SILENT A0 局。`run-config.jsonl` 确认 E6AVMMVCSRPC 于 2026-10-05 03:50:28 以解析值 `target_ascension=1` 开局；配置由 climb 自动升阶。

KAY522KT5NXR 在第48层通关：最终 boss 第1次尝试触发必死读档，成功重载1次，第2次尝试获胜。用时 55分45秒（首条决策 `2026-10-04T18:52:00.231Z` 至结束 `2026-10-04T19:47:45.135Z`，论文表保留为55.7分钟）；配置记录至结束另为56分48秒。

| 指标 | 第一次尝试 | 最终（含 SL） |
| --- | ---: | ---: |
| 局数 | 7 | 7 |
| 胜 / 负 | 0 / 7 | 1 / 6 |
| 胜率 | 0% | 14.3% |
| 平均终层 | 30.29 | 37.71 |

第一次尝试口径与 docs/eval.md 一致：取该局第一次 `attempt=1 / predicted_death` 的层数；没有这条记录时使用最终结果。七局共成功读档 25 次，胜局属于 SL 后胜。

| 局号 | 第一次尝试终层 | 最终终层 | 成功读档 | 最终结果 | 最终死亡战斗 |
| --- | ---: | ---: | ---: | --- | --- |
| C48LLXBGKXQ9 | 17 | 33 | 6 | 负 | 无厌沙虫 |
| Y6GM2CHWJBEY | 17 | 17 | 5 | 负 | 同族信徒 / 同族神官 |
| LRN0HPZ0FZS1 | 17 | 48 | 1 | 负 | 永世沙漏 |
| T082DRCUHRRD | 48 | 48 | 5 | 负 | 实验体 #C48 |
| 1HC609GTLGN3 | 17 | 22 | 5 | 负 | 寄生惧魔 / 胧光怪 |
| R0HEV5E3QT6G | 48 | 48 | 2 | 负 | 实验体 #C50 |
| KAY522KT5NXR | 48 | 48 | 1 | SL 后胜 | — |

六场最终失败中，三幕 boss 占3场（实验体2、永世沙漏1）；其余为同族、二幕沙虫、胧光怪 / 寄生惧魔各1场。六局的末态证据与死因分析保留在 [学习者复盘](lessons.md)：均记录了末回合未能存活的数值证据，R0HEV5E3QT6G 包含悔恨持牌失血；永世沙漏死亡帧没有分开标记攻击与状态伤害的致死先后。这里只转录日志和学习者结论，不自行添加游戏机制或打法。

### 学习者产出与实际上线

截至本轮核对，六场失败均已有学习者复盘；首胜 KAY522KT5NXR 的正式复盘尚未有标题。`python3 learner/ledger.py find --character silent --asc 0` 列出40条发现（silent-0001—silent-0040）；条目原文、局号与后续去向见 [学习账本](../paper/materials/learning/ledger.jsonl)。

- 首局提出的沙坑斩杀续步、刀刃陷阱即时重放、角色隔离分别对应 silent-0001、silent-0002、silent-0003；后三批复盘还登记了毒模型 silent-0008、余像 silent-0022、线内新增敏捷 silent-0026、活体召唤 silent-0029、悔恨计数 silent-0032、暗影步 silent-0033，以及生成数据拼接 SL 尝试的 silent-0040。
- 机制及搭配发现的可追溯条目包括 silent-0004—silent-0007、silent-0010—silent-0018、silent-0023—silent-0028、silent-0030—silent-0031、silent-0034—silent-0039；路线、休息、构筑观察见 silent-0019—silent-0021，战斗执行观察见 silent-0009。这里仅列主题与 id，不新增规则。
- A0 期间确认合入的经验版本为 2026-10-04.1（12条）、2026-10-05.1（18条）、2026-10-05.2（29条），来源依次为 C48LLXBGKXQ9、Y6GM2CHWJBEY、T082DRCUHRRD / 1HC609GTLGN3。上线记录在 decision-log 的00:16、01:51、03:47行；前两个版本对应 S1.exp1、S1.exp2.fix1，第三版已包含于 main 7be569b1 / live 的提交历史。
- S1.fix2（8118cd46，记录于03:18）实际已在 live 历史，包含 silent-0001 / silent-0002 / silent-0003 的修复，以及派发、沙箱自测和合入闭环工具。首胜运行代码 `5de5d518+dirty` 包含前两版经验对应提交，却不包含 S1.fix2 或03:47的经验版；其已提交经验为2026-10-05.1、18条。A1 的 E6AVMMVCSRPC 运行代码 `7be569b1+dirty` 才包含这些后来合入的改动，不能将它们归为 A0 首胜采用的代码。
- 新经验2026-10-05.3的提交 b887d58c 属于首胜之后；本轮核对时该提交尚不是 live 的祖先，live 已提交经验仍为2026-10-05.2、29条。工作树中出现的新文件内容不作为实际合入凭据。

`python3 learner/ledger.py find --character silent --status shipped` 返回 `(0 item(s))`。账本和下面的 CSV 中 shipped=0 是尚未补登记的状态，不能解释为没有实际合入；实际上线依据上述提交祖先关系及 decision-log。此轮只处理胜利与升阶事件，保留账本现状，待批次完成确认事件登记。

### 学习曲线的 A0 原行

来自每日快照 `paper/data/learning-curve-silent.csv`，生成于2026-10-05 04:07:01 CST；原行如下：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,0,7,1,0,1,37.71,30.29,C48LLXBGKXQ9,KAY522KT5NXR,2026-10-04T13:41:44+00:00,2026-10-04T19:47:45+00:00,40,0,0,,11,0
```

### 完整 eval 命令未完成

按要求实际运行：

```bash
export PATH="$HOME/.local/node/bin:$PATH"
nice -n 19 data/logdb-venv/bin/python eval/metrics.py --character silent --group-by ascension --ascension 0 --md --per-run > /tmp/sts2-a0-climb-metrics.md
```

退出码1，报错摘要：`RuntimeError: eval/strength-sources.ts failed`；`Error: listen EPERM: operation not permitted /tmp/tsx-1000/69.pipe`。没有生成完整 eval 指标表；以上核心统计从 runs / SL / run-config 原日志及04:07论文表交叉核对，未伪造力量来源或校准输入。完整命令与补跑请求已写收件箱并同步 notes/for-dai.md。原命令被拒绝后未改代码或尝试扩大沙箱权限。

### A0 完整评估补充（2026-10-05 04:45 CST）

观察者已在沙箱外完成 A0 完整评估，exit 0；原始结果见 [a0-metrics.md](../paper/materials/silent/a0-metrics.md)，来源提交 `8dc33dfe`。04:26 提交的 A0 评估补跑请求已完成；上节保留当时沙箱内失败的记录。以下原样收录汇总和逐局表，七局样本的置信区间按原输出保留，boss 时钟校准的缺失值也按原输出保留。

`eval-metrics` 白名单动作已记入 `notes/fix-queue-v4.md`，待学习者实现并上线后供后续升级小结使用。

| 指标 | A0 |
|---|---|
| 局数 | 7 * |
| 终层 | 37.7（中位 48.0；CI 25.1–50.4；n=7） * |
| 过一幕 boss | 86%（6/7；CI 49–97%） * |
| 过二幕 boss | 57%（4/7；CI 25–84%） * |
| 胜局 | 14%（1/7；CI 3–51%） * |
| 非 boss 战喝药 / 10 层 | 3.40（中位 2.71；CI 1.74–5.06；n=7） * |
| 进一幕 boss 带药（瓶） | 1.00（中位 1.00；CI 0.08–1.92；n=7） * |
| 进二幕 boss 带药（瓶） | 1.80（中位 2.00；CI 0.76–2.84；n=5） * |
| 进三幕 boss 带药（瓶） | 1.50（中位 0.50；CI 0.00–5.29；n=4） * |
| 死时手里的药（瓶，输的局） | 0.00（中位 0.00；CI 0.00–0.00；n=6） * |
| 一幕 boss 有力量来源 | 14%（1/7；CI 3–51%） *；牌 1 / 遗物 1 / 开场有力量 1 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.14（中位 0.00；CI 0.00–0.49；n=7） *；占一幕精英战 1/9 |
| 二幕第一个休息点前死亡（占进二幕的局） | 17%（1/6；CI 3–56%） * |
| 大脑调用 / 局 | 38.9（中位 47.0；CI 25.6–52.1；n=7） * |
| 输入 token / 局（千） | 1793（中位 2118；CI 1063–2523；n=7） * |
| 缓存命中 token / 局（千） | 389（中位 376；CI 144–634；n=7） * |
| 输出 token / 局（千） | 38.0（中位 45.3；CI 24.8–51.1；n=7） * |
| 缓存命中率 | 22% |
| 大脑耗时 / 局（分钟） | 19.8（中位 23.7；CI 13.2–26.5；n=7） * |
| 每次调用平均耗时（秒） | 30.6 |
|   codex：调用 / 局 | 38.9（中位 47.0；CI 25.6–52.1；n=7） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 1793 / 389 / 38.0（n=7） |
|   codex：耗时 / 局（分钟） | 19.8（中位 23.7；CI 13.2–26.5；n=7） * |
| SL：有 SL 记录的局 | 7/7 |
| SL：重打次数 / 局 | 3.57（中位 5.00；CI 1.58–5.56；n=7） * |
| 第一次尝试：终层 | 30.3（中位 17.0；CI 15.0–45.6；n=7） * |
| 第一次尝试：过一幕 boss | 43%（3/7；CI 16–75%） * |
| 第一次尝试：过二幕 boss | 43%（3/7；CI 16–75%） * |
| 第一次尝试：胜局 | 0%（0/7；CI 0–35%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 88%（398/451 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 +0.0，中位 \|误差\| 6.1（n=58） |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

| run | 版本 | code | A | 开始（UTC+8） | 终层 | 过幕 | 非boss喝药/10层 | boss 带药 | boss 层 | 一幕boss力量（牌/遗物/开场） | 一幕精英<78% | 二幕首个休息点 | 大脑调用 | token 入/中/出（千） | 耗时（分） | 配置 | SL 重打 / 第一次尝试终层 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C48LLXBGKXQ9 | S1.climb | bf3ebb7c | 0 | 10-04 21:42 | 33 | 过一幕 | 2.4 | 1/2 | F17/F33 | 否（- / - / 无） | 0/1 | F25 | 32 | 1236/223/32 | 17.0 | codex:gpt-6.1-sol · 知识前缀 full | 6 / F17 |
| Y6GM2CHWJBEY | S1.climb | 9692ea6d+dirty | 0 | 10-04 22:38 | 17 | 一幕 | 7.1 | 3 | F17 | 否（- / - / 无） | 0/2 | — | 20 | 776/99/16 | 8.6 | codex:gpt-6.1-sol · 知识前缀 full | 5 / F17 |
| LRN0HPZ0FZS1 | S1.climb | 8d79fd5b+dirty | 0 | 10-04 23:18 | 48 | 过二幕 | 2.1 | 1/1/0 | F17/F33/F48 | 否（- / - / 无） | 1/1 | F25 | 50 | 2118/574/49 | 26.2 | codex:gpt-6.1-sol · 知识前缀 full | 1 / F17 |
| T082DRCUHRRD | S1.climb | 8d79fd5b+dirty | 0 | 10-05 00:12 | 48 | 过二幕 | 2.7 | 0/3/0 | F17/F33/F48 | 否（- / - / 无） | 0/2 | F24 | 47 | 2159/376/45 | 24.5 | codex:gpt-6.1-sol · 知识前缀 full | 5 / F48 |
| 1HC609GTLGN3 | S1.exp1 | 4915e3b3+dirty | 0 | 10-05 01:18 | 22 | 过一幕 | 4.1 | 0 | F17 | 否（- / - / 无） | 0/1 | 无，之前死 | 21 | 992/77/24 | 12.3 | codex:gpt-6.1-sol · 知识前缀 full | 5 / F17 |
| R0HEV5E3QT6G | S1.exp2.fix1 | 5de5d518 | 0 | 10-05 01:52 | 48 | 过二幕 | 1.9 | 1/2/1 | F17/F33/F48 | 是（PROWESS / VAJRA / 有） | 0/2 | F24 | 47 | 2414/703/47 | 23.7 | codex:gpt-6.1-sol · 知识前缀 full | 2 / F48 |
| KAY522KT5NXR | S1.exp2.fix1 | 5de5d518+dirty | 0 | 10-05 02:52 | 48 | 胜 | 3.5 | 1/1/5 | F17/F33/F48 | 否（- / - / 无） | 0/0 | F25 | 55 | 2856/669/53 | 26.4 | codex:gpt-6.1-sol · 知识前缀 full | 1 / F48 |

## A1 → A2（2026-10-05 06:18 CST）

A1窗口为2026-10-05 03:50:28至06:02:02（CST），只统计`logs/runs.jsonl`中已结束的三局SILENT A1。`logs/run-config.jsonl`确认CSBR5CRDWQNB于06:05:11.916以解析值`target_ascension=2`开局，代码`c4c7ad97+dirty`、开局经验2026-10-05.6；climb自动升阶。

K3676LU8B0UH在第48层通关，结束于`2026-10-04T22:02:02.516Z`（06:02:02 CST）。一幕族母、二幕知识恶魔均第一次尝试胜；三幕永世沙漏第一次尝试于05:57:37.990被判必死，成功读档一次（8466毫秒、恢复T1），第二次尝试于06:01:52.752获胜，属于SL后胜。首条决策`2026-10-04T21:09:30.697Z`至结束为3151.819秒，即52分32秒（论文表52.5分钟）；配置记录05:08:43.598至结束另为53分19秒。用时口径沿用A0。

| 指标 | 第一次尝试 | 最终（含SL） |
| --- | ---: | ---: |
| 局数 | 3 | 3 |
| 胜 / 负 | 0 / 3 | 1 / 2 |
| 胜率 | 0% | 33.3% |
| 平均终层 | 32.67 | 32.67 |

第一次尝试沿用`eval/metrics.py:first_attempt`：该局首次`predicted_death`作为首次尝试结束层，没有该记录时用最终结果。三局共成功读档11次（5+5+1），唯一胜局是SL后胜；三局样本不足，不能据此估计稳定胜率。

| 局号 | 第一次尝试终层 | 最终终层 | 成功读档 | 最终结果 | 最终死亡战斗 | 首决策至结束（分） |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| E6AVMMVCSRPC | 17 | 17 | 5 | 负 | 乐加维林族母 | 23.4 |
| XYYQYBRM2A01 | 33 | 33 | 5 | 负 | 无厌沙虫 | 47.4 |
| K3676LU8B0UH | 48 | 48 | 1 | SL后胜 | — | 52.5 |

两场最终死亡均在boss战：一幕族母、二幕沙虫各一次。[学习者复盘](lessons.md)记录E6第六次T12的11血、1挡及回合末4挡不足以覆盖18攻击，敌结算后仍92血；XYY第六次T10的2血、0挡对18攻击死亡，敌结算后仍63血。这是日志末态与学习者分析的转录，不补打法或机制。首胜的正式复盘待调度器后续批次完成。

### 本级学习产出与上线

本轮`python3 learner/ledger.py find --character silent --asc 1 --json`返回3项：silent-0048（E6水盆观察，shipped/S1.exp6）、silent-0052（XYY晚写复盘误计上线后重犯，observed）、silent-0055（XYY开信刀观察，shipped/S1.exp7）。账本按最早证据进阶归属，A1复盘中回溯到A0的发现仍属于A0。A1期间新增登记15项silent-0041—silent-0055，账本从40项到55项；不能把这15项都算成A1首次发现。

A1已完成正式复盘2/3（E6、XYY）；本级期间还完成A0首胜KAY的复盘。新增登记分为KAY的silent-0041—0047、E6的silent-0048、经验第五次增量补登记的silent-0049/0050、XYY的silent-0051—0055。各条的局号、先前是否见过及结论原文保留在[学习账本](../paper/materials/learning/ledger.jsonl)，运维不增补经验。

| 实际合入时间（CST） | 版本 / 提交 | 学习者产出及生效证据 |
| --- | --- | --- |
| 04:16:22 | 经验2026-10-05.3 / bb19732f（来源b887d58c） | 本角色经验29→32条；XYY开局配置记录.3，运行代码包含该提交。 |
| 04:52:53 | S1.exp5 / b3b446b9，经验.4 | KAY及更早静默证据复算，新增5、更新8，32→37条；K367开局配置记录.4。 |
| 05:07:04 | S1.fix3 / ccf1fcde | 学习者七项修复：毒、余像、线内敏捷、活体召唤、悔恨计数、暗影步、跨读档阶段序列；对应silent-0008/0022/0026/0029/0032/0033/0041。K367启动代码已包含这些修复。 |
| 05:42:30 | S1.exp6 / c5b9123b，发布69630ae6 | E6及历史七局复算，经验.5新增3、更新7，37→40条；来源cf3de824，由运维兜底合入。 |
| 05:52:56 | S1.fix4 / 41de5662，发布5f74cd50 | TypeScript排除学习者归档源码、统计缓存随文件刷新重载；本批没有对应账本项，不新造id。 |
| 06:02:27（首胜结束后） | S1.exp7 / 2398da63，发布c4c7ad97 | XYY及历史八局复算，经验.6新增3、更新9，40→43条；来源4f429c0c，运维兜底合入，A2开局记录.6。 |

06:21补充更正04:26节关于经验.3尚未合入live的记录：本轮Git祖先核对确认b887d58c已通过bb19732f于04:16:22合入，XYY开局配置也记录.3；原历史保留，本节以提交和运行配置为准。

时间来自Git合入提交，晚于合入的完成事件与台账登记时间另保留在decision-log。E6开局代码7be569b1、经验.2；XYY开局bb19732f、经验.3；首胜K367开局ccf1fcde、经验.4。各次知识题面还会按文件变化刷新前缀，具体题目使用的内容以`logs/brain.jsonl`的`knowledge.prefix_sha`为准，开局记录不能代表全部题目。进一步核对首胜的48条大脑调用，31条使用前缀`fe9608439639`（05:09:30—05:38:30），17条使用`3e32a9faebee`（05:41:31—05:55:25），确有局中前缀变化；本轮未将前缀hash反推为某个经验文件版本。S1.exp7的正式合入在首胜结束约25秒后，A2开局记录确认采用.6；合入时间不能代替局中题面留痕，本报告不作修复或经验导致胜利的归因。

`python3 learner/ledger.py find --character silent --status shipped --json`本轮返回35项，按当前最后登记版本列示如下；同一项的早期上线历史仍在账本history中。

- S1.exp5（10项）：silent-0005、silent-0027、silent-0028、silent-0034、silent-0035、silent-0039、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.fix3（7项）：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.exp6（6项）：silent-0011、silent-0030、silent-0045、silent-0048、silent-0049、silent-0050。
- S1.exp7（12项）：silent-0006、silent-0007、silent-0017、silent-0018、silent-0019、silent-0020、silent-0021、silent-0036、silent-0046、silent-0053、silent-0054、silent-0055。

### 学习曲线的A1原行

`paper_dataset.py --no-raw`本轮快照cut为`2026-10-04T22:16:40.189Z`（06:16:40 CST）；取`paper/data/learning-curve-silent.csv`的A1行，原列顺序如下：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,1,3,1,0,1,32.67,32.67,E6AVMMVCSRPC,K3676LU8B0UH,2026-10-04T19:50:28+00:00,2026-10-04T22:02:02+00:00,3,0,10,silent-0005 silent-0027 silent-0028 silent-0034 silent-0035 silent-0039 silent-0042 silent-0043 silent-0044 silent-0047,3,1
```

CSV的`items_found=3`按最早证据进阶归属；`items_shipped=10`按登记后下一场已结束局的进阶归属，并非本级期间所有上线数。另有25项暂在空进阶行，等待下一场已结束局用于归属。`repeats_after_ship=1`仍受silent-0052所记录的按入账时间判断缺陷影响，不据此推断本级上线后重犯。原CSV保留，运维不改统计口径或账本历史。

### 完整eval待沙箱外补跑

本轮实际执行以下命令（PATH已加`~/.local/node/bin`）：

```bash
nice -n 19 data/logdb-venv/bin/python eval/metrics.py --character silent --group-by ascension --ascension 1 --md --per-run > /tmp/sts2-a1-climb-metrics.md 2> /tmp/sts2-a1-climb-metrics.err
```

退出码1：`RuntimeError: eval/strength-sources.ts failed`，tsx CLI监听`/tmp/tsx-1000/68.pipe`被沙箱拒绝（`listen EPERM: operation not permitted`）。当前白名单没有eval-metrics动作，broker与检查脚本只读待办继续保留；本轮不绕过沙箱，完整评估表、力量来源和校准指标均待外部结果。以上核心统计已由runs、SL、run-config、论文表和只读日志库交叉核对；失败命令及A1补跑请求追加到收件箱与notes/for-dai.md。

### A1首胜复盘补齐（2026-10-05 06:34 CST）

批次20261005-061301完成K3676LU8B0UH正式复盘及数字、时间勘误，A1正式复盘从2/3补齐为3/3。事件列出的12个账本条目全部覆盖本局；`ledger.py check`为60项、0个问题。学习者新增silent-0056—0060，并更新silent-0005/0011/0024/0025/0046/0051/0053；先前的「首胜复盘待完成」保留为当时快照。

`ledger.py find --character silent --asc 1`现为8项：silent-0048、silent-0052、silent-0055、silent-0056、silent-0057、silent-0058、silent-0059、silent-0060。新五项分别记录撕咬共享增伤的模型缺口、未施放群蛇形态的观察、撕咬共享成长的机制证据、毒斩杀时仍发生的回合末损失、遗忘之魂的消耗触发；结论均为学习者从本局证据登记，运维不补规则。它们在首胜结束后登记，不反写进前文A1期间15项新增的时间统计。

本轮仅将silent-0056的模型提案及F48第二次T9证据加入修复队列；silent-0051为已有萎靡模型缺口，追加本局七次零X及F33 T4证据，没有重复开项。机制及打法交学习者，其他观察保留在复盘和账本；首战T11实际死亡结算、实际执行最优线比例等缺失项沿学习者回报保持「未记录」。完整eval仍等待上轮已发出的沙箱外补跑请求，不因复盘完成另跑或替代完整指标。

本批论文数据刷新后的A1原行（cut：2026-10-05 06:32:31 CST），截至06:37核对：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,1,3,1,0,1,32.67,32.67,E6AVMMVCSRPC,K3676LU8B0UH,2026-10-04T19:50:28+00:00,2026-10-04T22:02:02+00:00,8,0,10,silent-0005 silent-0027 silent-0028 silent-0034 silent-0035 silent-0039 silent-0042 silent-0043 silent-0044 silent-0047,4,1
```

胜负与平均层数保持三局统计；新复盘使items_found由3变8，repeat由3变4。repeats_after_ship仍为1，沿用silent-0052的统计缺陷提示，不据此推断学习效果。

### A1完整评估补充（2026-10-05 06:44 CST）

观察者已在沙箱外完成A1完整评估，exit 0；已提交的原始结果为[a1-metrics.md](../paper/materials/silent/a1-metrics.md)，来源提交`0cbc1770b9ba926915d456d7203e793f37d63476`。06:21的A1评估补跑请求已完成，前文沙箱内失败及等待外部结果的记录保留为历史。

以下原样收录完整汇总及三局明细。局数、最终SL后1胜/首次尝试0胜、平均终层32.7与原小结一致；样本不足的区间和boss时钟校准缺失值保留原输出。eval-metrics白名单动作仍待Dai决定由谁添加，不因本次人工补跑完成而关闭该待办。

| 指标 | A1 |
|---|---|
| 局数 | 3 * |
| 终层 | 32.7（中位 33.0；CI 0.0–71.2；n=3） * |
| 过一幕 boss | 67%（2/3；CI 21–94%） * |
| 过二幕 boss | 33%（1/3；CI 6–79%） * |
| 胜局 | 33%（1/3；CI 6–79%） * |
| 非 boss 战喝药 / 10 层 | 2.50（中位 1.88；CI 0.00–6.01；n=3） * |
| 进一幕 boss 带药（瓶） | 0.67（中位 1.00；CI 0.00–2.10；n=3） * |
| 进二幕 boss 带药（瓶） | 0.00（中位 0.00；CI 0.00–0.00；n=2） * |
| 进三幕 boss 带药（瓶） | 1.00（中位 1.00；n=1） * |
| 死时手里的药（瓶，输的局） | 0.00（中位 0.00；CI 0.00–0.00；n=2） * |
| 一幕 boss 有力量来源 | 33%（1/3；CI 6–79%） *；牌 0 / 遗物 1 / 开场有力量 1 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.67（中位 1.00；CI 0.00–2.10；n=3） *；占一幕精英战 2/7 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/2；CI 0–66%） * |
| 大脑调用 / 局 | 33.0（中位 33.0；CI 0.0–70.3；n=3） * |
| 输入 token / 局（千） | 2027（中位 1994；CI 0–4521；n=3） * |
| 缓存命中 token / 局（千） | 335（中位 258；CI 0–778；n=3） * |
| 输出 token / 局（千） | 27.4（中位 29.4；CI 0.0–60.4；n=3） * |
| 缓存命中率 | 17% |
| 大脑耗时 / 局（分钟） | 13.6（中位 14.6；CI 0.0–29.3；n=3） * |
| 每次调用平均耗时（秒） | 24.7 |
|   codex：调用 / 局 | 33.0（中位 33.0；CI 0.0–70.3；n=3） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 2027 / 335 / 27.4（n=3） |
|   codex：耗时 / 局（分钟） | 13.6（中位 14.6；CI 0.0–29.3；n=3） * |
| SL：有 SL 记录的局 | 3/3 |
| SL：重打次数 / 局 | 3.67（中位 5.00；CI 0.00–9.40；n=3） * |
| 第一次尝试：终层 | 32.7（中位 33.0；CI 0.0–71.2；n=3） * |
| 第一次尝试：过一幕 boss | 67%（2/3；CI 21–94%） * |
| 第一次尝试：过二幕 boss | 33%（1/3；CI 6–79%） * |
| 第一次尝试：胜局 | 0%（0/3；CI 0–56%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 92%（141/154 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 -1.2，中位 \|误差\| 2.5（n=12） |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

| run | 版本 | code | A | 开始（UTC+8） | 终层 | 过幕 | 非boss喝药/10层 | boss 带药 | boss 层 | 一幕boss力量（牌/遗物/开场） | 一幕精英<78% | 二幕首个休息点 | 大脑调用 | token 入/中/出（千） | 耗时（分） | 配置 | SL 重打 / 第一次尝试终层 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E6AVMMVCSRPC | S1.fix2 | 7be569b1+dirty | 1 | 10-05 03:51 | 17 | 一幕 | 4.1 | 0 | F17 | 是（- / VAJRA / 有） | 1/2 | — | 18 | 1039/208/13 | 6.8 | codex:gpt-6.1-sol · 知识前缀 full | 5 / F17 |
| XYYQYBRM2A01 | S1.fix2 | bb19732f+dirty | 1 | 10-05 04:18 | 33 | 过一幕 | 1.5 | 1/0 | F17/F33 | 否（- / - / 无） | 0/2 | F24 | 33 | 1994/258/29 | 14.6 | codex:gpt-6.1-sol · 知识前缀 full | 5 / F33 |
| K3676LU8B0UH | S1.fix3 | ccf1fcde+dirty | 1 | 10-05 05:09 | 48 | 胜 | 1.9 | 1/0/1 | F17/F33/F48 | 否（- / - / 无） | 1/3 | F24 | 48 | 3046/539/40 | 19.3 | codex:gpt-6.1-sol · 知识前缀 full | 1 / F48 |

## A2 → A3（2026-10-05 07:49 CST）

A2窗口为2026-10-05 06:05:11至07:39:21（CST），只含`logs/runs.jsonl`中已结束的两局SILENT A2。`logs/run-config.jsonl`确认10GPK5XGHCK3于07:42:02.095以解析值`target_ascension=3`、模式climb开局，启动代码`9e0fda2e+dirty`，开局经验2026-10-05.7。

ZZMYZ5UBCG72第48层通关，结束于`2026-10-04T23:39:21.975Z`（07:39:21 CST）。一幕乐加维林族母、二幕无厌沙虫、三幕火炬头聚合体/女王的SL记录均为`attempt=1 / won`，本局没有`predicted_death`或成功读档，属于整局第一次尝试胜。首条决策`2026-10-04T22:49:07.149Z`至结束为3014.826秒，四舍五入50分15秒（论文表50.2分钟）；配置记录06:48:25.400至结束另为50分57秒。沿用A0/A1的首决策用时口径。

| 指标 | 第一次尝试 | 最终（含SL） |
| --- | ---: | ---: |
| 局数 | 2 | 2 |
| 胜 / 负 | 1 / 1 | 1 / 1 |
| 胜率 | 50% | 50% |
| 平均终层 | 40.50 | 40.50 |

第一次尝试沿用`eval/metrics.py:first_attempt`：取首次`predicted_death`所在层，没有该记录时使用最终结果。两局共成功读档5次，均来自失败的CSBR；SL后新增胜局0。两局样本不足，以上是本级已结束局的描述。

| 局号 | 首次尝试终层 | 最终终层 | 成功读档 | 最终结果 | 最终死亡战斗 | 首决策至结束（分） |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| CSBR5CRDWQNB | 33 | 33 | 5 | 负 | 火箭 / 碾碎爪 | 39.4 |
| ZZMYZ5UBCG72 | 48 | 48 | 0 | 首次尝试胜 | — | 50.2 |

唯一最终死亡在二幕boss火箭/碾碎爪。学习者的CSBR复盘记录：六次均未杀死任一目标，前五次T4判死后读档，第六次T4以10血+7格挡承受火箭24攻击死亡；两敌结算后仍分别165/199、92/209血。学习者还记录F28晚精英损44、F29走廊损13，最后火堆后含小血瓶以38血入boss，路线累计损血没有被最后一次回血补回。这里只转录[学习者复盘](lessons.md)及末态事实，不添加路线禁令、血线或新的机制结论。

### 本级学习产出与实际上线

本轮账本检查65条、0问题。`python3 learner/ledger.py find --character silent --asc 2 --json`返回5项，最早证据都在CSBR：silent-0061（风的女儿逐攻击格挡模型缺口，observed，已按07:30队列转录）；silent-0062（SL换线的朝向、血量、伤害比较）、silent-0063（攻击触发格挡及相关实测）、silent-0064（千足虫复活与毒层时点）、silent-0065（朝向变化实测及未观察范围），后四项当前为proposed。原文、证据与去向见[学习账本](../paper/materials/learning/ledger.jsonl)，运维没有补写知识。

A2期间新登记10项silent-0056—0065；其中0056—0060是A1首胜K367的回补，0061—0065才按最早证据归A2。正式A2复盘目前1/2（CSBR已完成，ZZMY首胜待后续调度器批次），不提前填学习者结论。

| 实际合入时间（CST） | 版本 / 提交 | 来源与生效记录 |
| --- | --- | --- |
| 06:32:44代码合入；06:36:49发布 | S1.fix5 / b129cd20，发布b9c46d66 | 学习者萎靡实际X模型silent-0051/0053，证据KAY F9/F12、XYY F30/F33；统计重犯按首次开局时间silent-0052，证据XYY。首胜启动b9c46d66包含本批；失败CSBR启动c4c7ad97。 |
| 06:51:56代码合入；06:55:29发布 | S1.fix6 / 63c50e94，发布9e0fda2e | 学习者撕咬共享成长silent-0056/0058，证据K367 F48第2次T1/T9/T12；首胜启动b9c46d66不含本批，下一局A3的9e0fda2e包含。 |

以上两批固定沙箱自测已通过，07:17完成事件核实沙箱外完整tsc+vitest exit0（201文件、2709通过、2跳过）。这里只引用既有结果，未重跑测试或额外审核。

经验2026-10-05.7来源0d469a22，依据K367及历史静默九局产出、+4/~13/-0，43→47条。06:52轮机械同步main、live合并尚未提交，HEAD仍9e0fda2e、MERGE_HEAD仍0d469a22；本轮不处理该待提交交接，也没有补登记S1.exp8或把17项待提案改shipped。不过A3的实际开局配置已记录.7，且dirty_files含experience.json，表明未提交的学习者经验文件已被运行读取；正式合入凭据与运行时读取事实分别保留。live新一轮自动刷新数据也已发生，后续兜底须重新核对当前工作树，不能盲用旧干净状态。

两局A2开局经验均为.6，但题面按文件变动刷新。ZZMY的48条大脑请求中，15条使用前缀`5a7110096b52`（06:49:07—06:58:43），33条使用`374c9b29b0c3`（06:59:04—07:37:12），确有局中知识前缀变化。此处不将hash反推成具体经验版本，也不把任何修复或经验变化归为首胜原因；具体题目以`logs/brain.jsonl`留痕为准。

`python3 learner/ledger.py find --character silent --status shipped --json`本轮返回25项，当前最后状态按版本分组如下。部分先前shipped条目被后续经验任务追加proposed，旧上线历史仍保留，因此25是当前最后状态计数，不是累计上线发现数；待提交的经验批次沿既有交接处理。

- S1.fix3（7项）：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.exp7（4项）：silent-0018、silent-0036、silent-0054、silent-0055。
- S1.exp5（8项）：silent-0027、silent-0028、silent-0034、silent-0035、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.exp6（3项）：silent-0045、silent-0048、silent-0049。
- S1.fix5（2项）：silent-0051、silent-0052。
- S1.fix6（1项）：silent-0056。

### 学习曲线的A2原行

本轮`nice -n 19 python3 ops/paper_dataset.py --no-raw`退出0，原始日志截点2026-10-05 07:44:32 CST。五项一致性检查通过、decision-count不一致为空、key scan CLEAN。按生成工具原列顺序附`paper/data/learning-curve-silent.csv`的A2行：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,2,2,1,1,0,40.5,40.5,CSBR5CRDWQNB,ZZMYZ5UBCG72,2026-10-04T22:05:11+00:00,2026-10-04T23:39:21+00:00,5,0,14,silent-0008 silent-0018 silent-0022 silent-0026 silent-0029 silent-0032 silent-0033 silent-0036 silent-0041 silent-0045 silent-0048 silent-0049 silent-0054 silent-0055,1,1
```

`items_found`按最早证据局进阶归属，`items_shipped`按登记后下一场已结束局进阶归属，并不等于本级期间所有合入数；原始历史及提案状态不由运维改写。只按生成工具口径报告，保留小样本限制。

### 完整eval待沙箱外补跑

本轮按要求实际运行以下命令（PATH已加`~/.local/node/bin`）：

```bash
nice -n 19 data/logdb-venv/bin/python eval/metrics.py --character silent --group-by ascension --ascension 2 --md --per-run > /tmp/sts2-a2-climb-metrics.md 2> /tmp/sts2-a2-climb-metrics.err
```

退出1，`RuntimeError: eval/strength-sources.ts failed`，根因`Error: listen EPERM: operation not permitted /tmp/tsx-1000/69.pipe`。完整eval没有生成；上面的核心统计由runs、SL、run-config及首条决策核对，不伪造力量来源或校准输入。请沙箱外有权限的执行方补跑同一命令，结果归档`paper/materials/silent/a2-metrics.md`；完整命令及请求已追加收件箱和notes/for-dai.md。eval-metrics白名单动作仍沿已有待办，运维不扩大沙箱出口。

## A3升级小结（2026-10-05 09:49 CST；A4升级事件09:35送达）

本级只有静默猎手10GPK5XGHCK3一局：run-config于2026-10-05 07:42:02.095 CST解析target_ascension=3，08:41:20.783结束，F48通关。下一进阶的首局1NZ8FE5F34R9于08:44:02.649 CST解析A4；这次事件延迟送达，小结仅统计SILENT/A3。

| 口径 | 胜 | 负 | 平均终层 |
|---|---:|---:|---:|
| 第一次尝试 | 1 | 0 | 48.00 |
| 最终结果 | 1 | 0 | 48.00 |
| SL重打后的结果（0次尝试） | 0 | 0 | — |

重打0次。SL日志四条为F17/F33/F39/F48的attempt=1、result=won；有SL跟踪记录与发生读档分别计数。没有终局败局，主要终局死因不适用。学习者复盘及经验回报保留F48 T12的0HP后瓶中精灵复活至16、T13胜利事实；首次尝试胜包含这次实际复活，不能写成终战从未归零。首决策至结束58分38.065秒，配置至结束59分18.688秒（沿08:57已核对记录）。

### 完整评估

`bash ops/codex-ops-do.sh eval-metrics silent 3`沙箱外exit0，原始快照[a3-metrics-20261005-093548.kaoyu5.md](../paper/materials/silent/a3-metrics-20261005-093548.kaoyu5.md)。新动作使用data/logdb-venv/bin/python完整运行eval/metrics.py，固定角色、进阶、按进阶分组及Markdown输出；保留力量来源与校准默认流程，没有删掉沙箱受限指标。以下原样收录：

| 指标 | A3 |
|---|---|
| 局数 | 1 * |
| 终层 | 48.0（中位 48.0；n=1） * |
| 过一幕 boss | 100%（1/1；CI 21–100%） * |
| 过二幕 boss | 100%（1/1；CI 21–100%） * |
| 胜局 | 100%（1/1；CI 21–100%） * |
| 非 boss 战喝药 / 10 层 | 3.96（中位 3.96；n=1） * |
| 进一幕 boss 带药（瓶） | 1.00（中位 1.00；n=1） * |
| 进二幕 boss 带药（瓶） | 3.00（中位 3.00；n=1） * |
| 进三幕 boss 带药（瓶） | 3.00（中位 3.00；n=1） * |
| 死时手里的药（瓶，输的局） | — |
| 一幕 boss 有力量来源 | 0%（0/1；CI 0–79%） *；牌 0 / 遗物 0 / 开场有力量 0 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.00（中位 0.00；n=1） *；占一幕精英战 0/3 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/1；CI 0–79%） * |
| 大脑调用 / 局 | 50.0（中位 50.0；n=1） * |
| 输入 token / 局（千） | 3332（中位 3332；n=1） * |
| 缓存命中 token / 局（千） | 510（中位 510；n=1） * |
| 输出 token / 局（千） | 46.7（中位 46.7；n=1） * |
| 缓存命中率 | 15% |
| 大脑耗时 / 局（分钟） | 21.0（中位 21.0；n=1） * |
| 每次调用平均耗时（秒） | 25.2 |
|   codex：调用 / 局 | 50.0（中位 50.0；n=1） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 3332 / 510 / 46.7（n=1） |
|   codex：耗时 / 局（分钟） | 21.0（中位 21.0；n=1） * |
| SL：有 SL 记录的局 | 1/1 |
| SL：重打次数 / 局 | 0.00（中位 0.00；n=1） * |
| 第一次尝试：终层 | 48.0（中位 48.0；n=1） * |
| 第一次尝试：过一幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：过二幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：胜局 | 100%（1/1；CI 21–100%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 87%（84/97 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 +1.0，中位 \|误差\| 2.0（n=10） |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

只有一局，区间沿评估工具保留。推演掉血±2内84/97回合，路线投影绝对误差中位2（n=10），boss时钟校准无有效值；缺失值保持“—”。

### 学习者在A3期间的产出与实际上线

按A3配置到结束的07:42:02—08:41:20时间窗，学习者登记8项新账本silent-0066—0073：0066/0073的最早证据属A0，0067—0072属A2；主要来自ZZMYZ5UBCG72复盘和相应经验任务，不能把登记发生在A3期间等同于第一次在A3遇到。以下按live发布提交的实际时间列出上线，保留来源和证据：

| 版本 | live发布 | 来源及范围 |
|---|---|---|
| S1.exp8 | 07:58:16，fe4b466f | 经验.7，源0d469a22，K3676LU8B0UH A1及历史静默局；A3开局已经实际读到未提交的.7，正式提交时间另记 |
| S1.exp9 | 08:01:37，62faa08a | 经验.8，源267128cd，CSBR5CRDWQNB A2及历史静默局；16项登记，保留当时提案/上线历史 |
| S1.fix7 | 08:16:47，1b294533 | 学习者源907a19f8，silent-0061，CSBR A2 F33第6次T2的风的女儿攻击补挡证据 |
| S1.high | 08:34:52，61397e29 | Dai的普通模式/high强度决定，登记源码0811875f；不是学习者学出的游戏规则 |
| S1.fix8 | 08:36:43，45965f49 | 学习者源098a5471，CSBR A2 F17奖励屏较低终帧统计子项；silent-0040原跨SL统计问题当时仍未修 |

A3起始代码9e0fda2e+dirty、经验.7、Codex xhigh/priority；A4升级首局起始代码45965f49+dirty、经验.8、Codex high且service_tier=null。代码上线按流程供下一局使用；知识前缀可重新读取，逐次实际前缀以brain日志为准。S1.exp10（经验.9）08:56正式发布晚于A3结束，本轮经验.10仍待live锁释放后合入。单局、多次上线和引擎配置差异均保留，不据此归因某个版本导致胜利。

本局自己的正式复盘在结束后产出，新增silent-0074/0075两个模型提案、0076/0077两个机制观察，并支持既有0005/0027/0028/0053；新增登记时间08:57:47，晚于本级结束。0075/0077首次来源为1HC609GTLGN3 A0。`ledger.py find --character silent --asc 3`在本轮快照返回0074/0076两项，均proposed；0076的更早T082DRCUHRRD A0 F12 T6只支持建层/时限，实际抽牌施毒证据仍来自10G A3。学习者已补support及note，first_run/asc结构字段更正接口待工具任务处理，生成表沿原字段报告。

按要求执行`ledger.py find --character silent --status shipped --json`，09:44快照最后状态为44项，引用条目如下。它是当前最后状态计数；后续proposed可以覆盖先前shipped状态，所有历史仍保留，不能当作累计上线发现数。

- S1.fix3（7项）：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.exp10（11项）：silent-0011、silent-0013、silent-0018、silent-0039、silent-0067、silent-0068、silent-0069、silent-0070、silent-0071、silent-0072、silent-0073。
- S1.exp9（4项）：silent-0017、silent-0057、silent-0062、silent-0065。
- S1.exp8（6项）：silent-0024、silent-0025、silent-0050、silent-0058、silent-0059、silent-0060。
- S1.exp5（6项）：silent-0034、silent-0035、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.exp7（3项）：silent-0036、silent-0054、silent-0055。
- S1.exp6（3项）：silent-0045、silent-0048、silent-0049。
- S1.fix5（2项）：silent-0051、silent-0052。
- S1.fix6（1项）：silent-0056。
- S1.fix7（1项）：silent-0061。

本轮经验2026-10-05.10固定源c2ece69c8c6d342ab7d55e10d8aca6af1ace25bc已在main 32756163a905574e0716767de0a59cb17be1655b归档，自测tsc0、152文件1906用例通过；新增2、更新15、退役0，active62、19242字符。live非阻塞取锁失败，兜底动作`bash ops/codex-ops-do.sh learner-merge exp-silent`exit128、完整输出“（超过 30 秒，已终止）”；尚未确认manual入队。17项保持proposed，未登记本批shipped或S1.exp11。固定源及后续合入/测试/版本/台账步骤见ops-handoff最新节，已请求锁释放后补manual事件。

### 学习曲线A3原行

本轮`nice -n 19 python3 ops/paper_dataset.py --no-raw`exit0，截点2026-10-05 09:44:47.160 CST；验证与key scan沿生成工具原输出。下面按paper/data/learning-curve-silent.csv原列顺序附A3行：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,3,1,1,1,0,48,48,10GPK5XGHCK3,10GPK5XGHCK3,2026-10-04T23:42:02+00:00,2026-10-05T00:41:20+00:00,2,0,3,silent-0051 silent-0052 silent-0056,0,0
```

items_found按first_run进阶归属，items_shipped按登记之后下一场已结束局归属；与本级期间新增8项、正式上线5个版本分别是不同口径。0076的来源结构字段待更正说明及后续复盘的登记时间保留，原始账本和生成行不手改。
