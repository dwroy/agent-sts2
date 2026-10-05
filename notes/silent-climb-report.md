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

## A4升级小结（2026-10-05 11:47 CST；A5升级事件11:43送达）

统计静默猎手run-config解析target_ascension=4的四局，窗口为2026-10-05 08:44:02.649—11:36:00.474 CST。A5首局ZE8F192FKX24于11:39:22.274解析target_ascension=5，代码452f7bc+dirty、经验2026-10-05.12；配置保持climb，由胜局自动升阶。

| 口径 | 胜 | 负 | 平均终层 |
|---|---:|---:|---:|
| 第一次尝试（每局首线，判死读档按失败计） | 1 | 3 | 40.50 |
| 最终结果（每局一次） | 1 | 3 | 40.50 |
| 有SL重打的两局最终结果 | 0 | 2 | 38.50 |
| SL后各次重打（8次，含判死截停） | 0 | 8 | 40.88 |

| 局号 | 最终结果及终层 | 成功读档重打 | 日志记录的终局战斗 | 起始经验 |
|---|---|---:|---|---|
| 1NZ8FE5F34R9 | 负，F29 | 3 | 残杀千足虫 | .8 |
| F9PP859XZ3RJ | 负，F37 | 0 | 虔诚雕刻师 | .9 |
| 9YBKCNBFP0X5 | 负，F48 | 5 | 女王／火炬头聚合体 | .9 |
| 1LMBFGSMCWKU | 胜，F48 | 0 | — | .12 |

8次重打由sl-attempts的predicted_death及reload.ok=true核对：1NZ的前三次失败后读档，9Y的前五次失败后读档。SL后的8次尝试中6次判死截停、2次实际死亡，没有SL后胜局。四局均有SL跟踪记录，记录存在不等于读档。三场终局失败各一种，按death_fight只能列上述战斗，不能据此提出未经学习者证据支持的机制或打法死因。

胜局1LMBFGSMCWKU为第一次尝试胜，F17/F33/F48均attempt=1、result=won，无predicted_death或重打。首条决策10:57:55.584至11:36:00.474用时38分4.890秒；配置10:57:29.409至结束38分31.065秒。下一局A5已确认开打。

### 完整评估

`bash ops/codex-ops-do.sh eval-metrics silent 4`沙箱外exit0，实际执行eval/metrics.py --character silent --ascension 4 --group-by ascension --md，原始快照[a4-metrics-20261005-114327.ng67TM.md](../paper/materials/silent/a4-metrics-20261005-114327.ng67TM.md)。以下原样收录，保留小样本区间和缺失值：

| 指标 | A4 |
|---|---|
| 局数 | 4 * |
| 终层 | 40.5（中位 42.5；CI 25.8–55.2；n=4） * |
| 过一幕 boss | 100%（4/4；CI 51–100%） * |
| 过二幕 boss | 75%（3/4；CI 30–95%） * |
| 胜局 | 25%（1/4；CI 5–70%） * |
| 非 boss 战喝药 / 10 层 | 2.13（中位 2.18；CI 0.63–3.63；n=4） * |
| 进一幕 boss 带药（瓶） | 1.50（中位 2.00；CI 0.00–3.09；n=4） * |
| 进二幕 boss 带药（瓶） | 1.00（中位 1.00；CI 0.00–3.48；n=3） * |
| 进三幕 boss 带药（瓶） | 2.00（中位 2.00；CI 2.00–2.00；n=2） * |
| 死时手里的药（瓶，输的局） | 0.00（中位 0.00；CI 0.00–0.00；n=3） * |
| 一幕 boss 有力量来源 | 0%（0/4；CI 0–49%） *；牌 0 / 遗物 0 / 开场有力量 0 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.25（中位 0.00；CI 0.00–1.05；n=4） *；占一幕精英战 1/5 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/4；CI 0–49%） * |
| 大脑调用 / 局 | 39.5（中位 41.0；CI 26.4–52.6；n=4） * |
| 输入 token / 局（千） | 2936（中位 3086；CI 1760–4113；n=4） * |
| 缓存命中 token / 局（千） | 200（中位 191；CI 0–484；n=4） * |
| 输出 token / 局（千） | 11.4（中位 11.9；CI 9.0–13.9；n=4） * |
| 缓存命中率 | 7% |
| 大脑耗时 / 局（分钟） | 11.2（中位 11.8；CI 8.2–14.2；n=4） * |
| 每次调用平均耗时（秒） | 17.0 |
|   codex：调用 / 局 | 39.5（中位 41.0；CI 26.4–52.6；n=4） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 2936 / 200 / 11.4（n=4） |
|   codex：耗时 / 局（分钟） | 11.2（中位 11.8；CI 8.2–14.2；n=4） * |
| SL：有 SL 记录的局 | 4/4 |
| SL：重打次数 / 局 | 2.00（中位 1.50；CI 0.00–5.90；n=4） * |
| 第一次尝试：终层 | 40.5（中位 42.5；CI 25.8–55.2；n=4） * |
| 第一次尝试：过一幕 boss | 100%（4/4；CI 51–100%） * |
| 第一次尝试：过二幕 boss | 75%（3/4；CI 30–95%） * |
| 第一次尝试：胜局 | 25%（1/4；CI 5–70%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 94%（263/279 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 -0.5，中位 \|误差\| 9.2（n=30） |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

校准掉血±2内263/279回合（94%），路线投影绝对误差中位9.2（n=30）；boss时钟无有效校准值，保持“—”。四局样本不足，不用多次上线和单场胜利推断某项改动的效果。

### 学习者产出和实际上线

在A4窗口内，学习者新增15项账本silent-0074—0088，来自10GPK5XGHCK3、1NZ8FE5F34R9、F9PP859XZ3RJ、9YBKCNBFP0X5复盘及相应任务；胜局1LMBFGSMCWKU的正式复盘尚未在本轮收到。按11:45:05账本查询快照的first_run/asc字段，15项中A4归属7项、A3归属3项、A0归属5项，登记发生在A4期间不等于首次在A4遇到。原始查询及分组归档[a4-learning-snapshot-20261005-114505.json](../paper/materials/silent/a4-learning-snapshot-20261005-114505.json)；本轮不提交其他任务正在写的账本。

`python3 learner/ledger.py find --character silent --asc 4 --json`快照引用：silent-0078（预判模型，S1.fix11/shipped）、0079（SL换线血价，曾S1.exp11/shipped，当前新批proposed）、0080（预判机制，S1.exp11/shipped）、0082（涂毒模型，proposed）、0085（苦无机制，S1.exp12/shipped）、0086（毒雾与头骨后续推演缺口，observed）、0087（该组合实测机制，当前proposed）。0081计算下注最早来源T082DRCUHRRD/A0；0083/0084和当前字段中0088也不归A4。后续学习者回溯和字段更正保留在账本，不手改旧条目或论文行。

| 版本 | eval登记提交的时间（CST）及提交 | 来源及范围 |
|---|---|---|
| S1.exp10 | 08:56:10，002d835f | 经验.9，ZZMYZ5UBCG72 A2及此前静默证据；在A4窗口正式上线 |
| S1.fix9 | 09:03:09，3fc7a22b | 暴露模型silent-0066及跨SL统计silent-0040；来源ZZMY/Y6GM、T082/C48 |
| S1.fix10 | 09:24:19，f3eacafe | 融入暗影silent-0075/0077、腐蚀波silent-0074/0076；10G A3及1HC A0证据，版本登记09:28 |
| S1.exp11 | 10:20:14，1b4c4c64 | 经验.9直接到.11，包含.10；1NZ A4及历史静默局；正式发布536e37d9于10:20:15 |
| S1.fix11 | 10:30:41，20c01c06 | 预判模型silent-0078/0080及五项学习流程工具；正式登记发布cf11fab8于10:34:30 |
| S1.exp12 | 10:50:04，5f76a9dd | 经验.12，F9 A4及历史静默局；正式发布2a946ca5于10:50:05 |

以上是已保留在live的正式版本历史。计算下注3cd9fc6c、涂毒e3e7068b及动作说明ed86d537在后续批次合后测试失败并回退，尚未在本轮收到新上线完成事件；0081/0082保持proposed，不记S1.fix12。胜局开局实际代码86b24a1f+dirty是在撤回模型曾临时合入的时间点启动，不能仅用A5开局记录的452f7bc7或正式版本表代表其全部内存代码；A5起始才明确为回退后的452f7bc+dirty。代码下一进程生效，知识前缀可重读，逐次实际输入以brain日志为准，不把临时合入或胜利当作机制修复已正式上线。

按要求执行`python3 learner/ledger.py find --character silent --status shipped --json`。11:43初次查询为71项，11:45:05全量折叠快照为63项；新经验批次追加proposed导致最后状态变化，历史shipped仍保留，两次数值均不是累计已上线经验数。下面引用11:45:05最后状态分组（63项），与上述正式上线历史分别报告：

- S1.exp10：silent-0013、silent-0018、silent-0039、silent-0067、silent-0068、silent-0069、silent-0070、silent-0071、silent-0072、silent-0073。
- S1.exp11：silent-0007、silent-0027、silent-0028、silent-0037、silent-0046、silent-0048、silent-0063、silent-0064、silent-0076、silent-0077、silent-0080。
- S1.exp12：silent-0010、silent-0030、silent-0083、silent-0084、silent-0085。
- S1.exp5：silent-0034、silent-0035、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.exp6：silent-0045、silent-0049。
- S1.exp7：silent-0036、silent-0054、silent-0055。
- S1.exp8：silent-0024、silent-0025、silent-0050、silent-0058、silent-0059、silent-0060。
- S1.exp9：silent-0017、silent-0057、silent-0062、silent-0065。
- S1.fix10：silent-0074、silent-0075。
- S1.fix11：silent-0078。
- S1.fix3：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.fix5：silent-0051、silent-0052。
- S1.fix6：silent-0056。
- S1.fix7：silent-0061。
- S1.fix9：silent-0040、silent-0066。

### 学习曲线A4原行

本轮`nice -n 19 python3 ops/paper_dataset.py --no-raw`exit0，日志切点2026-10-05T03:43:52.938Z；五项一致性检查通过、决策计数差异空、key scan CLEAN。学习曲线是生成工具读取日志/账本时的原始结果，其账本读取时间可晚于日志切点及上述查询快照。本轮不手改原行：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,4,4,1,1,0,40.5,40.5,1NZ8FE5F34R9,1LMBFGSMCWKU,2026-10-05T00:44:02+00:00,2026-10-05T03:36:00+00:00,7,0,41,silent-0007 silent-0010 silent-0013 silent-0017 silent-0018 silent-0024 silent-0025 silent-0027 silent-0028 silent-0030 silent-0037 silent-0039 silent-0040 silent-0046 silent-0048 silent-0050 silent-0057 silent-0058 silent-0059 silent-0060 silent-0061 silent-0062 silent-0063 silent-0064 silent-0065 silent-0066 silent-0067 silent-0068 silent-0069 silent-0070 silent-0071 silent-0072 silent-0073 silent-0074 silent-0075 silent-0076 silent-0077 silent-0080 silent-0083 silent-0084 silent-0085,3,0
```

items_found按first_run进阶归属，items_shipped按登记之后下一场已结束局归属，重复按账本证据及上线历史统计；与本级期间新增15项、上述六个正式版本是不同口径。

## A5 → A6（2026-10-05 12:47 CST；ZE8F192FKX24）

A5仅1局，ZE8F192FKX24最终胜利，平均终层48；第一次尝试0胜1负（终层48），SL后最终1胜0负。第48层永世沙漏首次尝试在12:18:44.972记录predicted_death并成功读档一次，第二次尝试12:22:45.888记录won、剩3血，12:22:55.359整局结束。第一次尝试的“负”按既有SL统计协议计预判必死，不伪称现场实际死亡；无最终死亡局。首试主要终止原因仅引用判官原日志：34 incoming + held 凋萎+3: 12 damage，对38 HP + 8 block；不据此推导新的机制或打法。A5阶段另有F17瀑布巨兽、F33知识恶魔、F45灵魂枢纽首次尝试获胜；SL重打尝试共1次，1胜0负，终层48。

用时以首决策11:39:56.342至12:22:55.359计为42分59.017秒；以run-config 11:39:22.274起计为43分33.085秒，包含读档。下一目标A6由climb自行解析：实际首个A6配置FH2HB2X17F2H于12:25:50.167，事件指定UACFSW4VDDLD于12:34:37.801同为A6；升级窗口以第一局A5配置至第一局A6配置界定，不因提醒到达较晚扩展。这里只核对A6开局配置，后续局的复盘/升级按各自事件处理。

### 完整评估

`bash ops/codex-ops-do.sh eval-metrics silent 5` exit0，沙箱外运行完整`eval/metrics.py --character silent --group-by ascension --md`；原件[a5-metrics-20261005-124326.eyHju3.md](../paper/materials/silent/a5-metrics-20261005-124326.eyHju3.md)。原始表如下：

| 指标 | A5 |
|---|---|
| 局数 | 1 * |
| 终层 | 48.0（中位 48.0；n=1） * |
| 过一幕 boss | 100%（1/1；CI 21–100%） * |
| 过二幕 boss | 100%（1/1；CI 21–100%） * |
| 胜局 | 100%（1/1；CI 21–100%） * |
| 非 boss 战喝药 / 10 层 | 1.67（中位 1.67；n=1） * |
| 进一幕 boss 带药（瓶） | 2.00（中位 2.00；n=1） * |
| 进二幕 boss 带药（瓶） | 2.00（中位 2.00；n=1） * |
| 进三幕 boss 带药（瓶） | 2.00（中位 2.00；n=1） * |
| 死时手里的药（瓶，输的局） | — |
| 一幕 boss 有力量来源 | 0%（0/1；CI 0–79%） *；牌 0 / 遗物 0 / 开场有力量 0 |
| 一幕精英进场血量 < 78% 次数 / 局 | 1.00（中位 1.00；n=1） *；占一幕精英战 1/2 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/1；CI 0–79%） * |
| 大脑调用 / 局 | 46.0（中位 46.0；n=1） * |
| 输入 token / 局（千） | 3706（中位 3706；n=1） * |
| 缓存命中 token / 局（千） | 0（中位 0；n=1） * |
| 输出 token / 局（千） | 13.0（中位 13.0；n=1） * |
| 缓存命中率 | 0% |
| 大脑耗时 / 局（分钟） | 12.4（中位 12.4；n=1） * |
| 每次调用平均耗时（秒） | 16.2 |
|   codex：调用 / 局 | 46.0（中位 46.0；n=1） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 3706 / 0 / 13.0（n=1） |
|   codex：耗时 / 局（分钟） | 12.4（中位 12.4；n=1） * |
| SL：有 SL 记录的局 | 1/1 |
| SL：重打次数 / 局 | 1.00（中位 1.00；n=1） * |
| 第一次尝试：终层 | 48.0（中位 48.0；n=1） * |
| 第一次尝试：过一幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：过二幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：胜局 | 0%（0/1；CI 0–79%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 86%（70/81 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 -1.5，中位 \|误差\| 2.5（n=8） * |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

校准掉血±2内70/81回合（86%），路线投影绝对误差中位2.5（n=8），boss时钟无有效值；单局样本不足，不据单场胜利或这一级的多次上线判断某项改动效果。

### 这一阶段的学习者产出与上线

学习查询快照时间2026-10-05 12:44:05 CST，原件[a5-learning-snapshot-20261005-124405.json](../paper/materials/silent/a5-learning-snapshot-20261005-124405.json)。执行`python3 learner/ledger.py find --character silent --asc 5 --json`结果为空：尚无首次归属A5的条目，ZE8F192FKX24本局正式复盘完成事件尚未收到。A5窗口内学习者为此前A4胜局1LMBFGSMCWKU复盘新增4项：silent-0089（脆弱下新增敏捷格挡模型缺口）、0090（女王两种获胜顺序、无同盘面对照）、0091（本局脆弱与速度药水增量及时序）、0092（投斧首牌重放与多击/补牌组合，内部没有中间帧）。这些是学习者原观察，first_run/asc均属A4，不能记成A5新发现。0089的修复源码71af9706于12:23:37完成，正式S1.fix14发布12:29:34，晚于首局A6开打，因此不计为A5期间正式上线，也不归为A5胜因。

| A5期间正式版本 | 实际登记发布时间（CST）/发布提交 | 来源及台账条目 |
|---|---|---|
| S1.fix12 | 11:44:53 / 991591d3 | 计算下注0081（T082 A0、F9 A4）、涂毒0082/0084（F9 A4）；另修药水测试隔离及动作说明，保留旧失败/回退 |
| S1.fix13 | 11:56:44 / 00e809f4 | 毒雾与头骨后续触发0086/0087；9YBKCNBFP0X5 A4 |
| S1.exp13 | 11:56:45 / 72a6784f | 经验.13，9Y A4及历史静默证据，新增3/更新8/退役0、active70；相关0005/0006/0011/0053/0023/0019/0020/0021/0087/0088/0079 |

胜局开局代码为452f7bc7+dirty、经验.12，代码改动下一对局进程生效，知识前缀可在局内重读；上述版本在A5期间正式上线不等于本胜局已经使用其全部代码。实际输入须按每次brain日志核对，不对改动贡献作归因。后续事件才确认的上线和shipped状态在下面按查询时点列出，与窗口内实际发布时间分开。

按要求执行`python3 learner/ledger.py find --character silent --status shipped --json`，当前最后状态为shipped的66项按版本分组如下；并行新经验批次可再追加proposed，当前数量不等于历史累计已上线数量，历史记录全部保留：

- S1.exp10：silent-0018、silent-0039、silent-0067、silent-0069、silent-0070、silent-0071、silent-0073。
- S1.exp11：silent-0027、silent-0028、silent-0037、silent-0046、silent-0048、silent-0063、silent-0064、silent-0076、silent-0077、silent-0080。
- S1.exp12：silent-0030、silent-0083、silent-0084、silent-0085。
- S1.exp13：silent-0023、silent-0053、silent-0079、silent-0087、silent-0088。
- S1.exp5：silent-0034、silent-0035、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.exp6：silent-0045、silent-0049。
- S1.exp7：silent-0036、silent-0054、silent-0055。
- S1.exp8：silent-0024、silent-0025、silent-0050、silent-0058、silent-0059、silent-0060。
- S1.exp9：silent-0057、silent-0062、silent-0065。
- S1.fix10：silent-0074、silent-0075。
- S1.fix11：silent-0078。
- S1.fix12：silent-0081、silent-0082。
- S1.fix13：silent-0086。
- S1.fix14：silent-0089。
- S1.fix3：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.fix5：silent-0051、silent-0052。
- S1.fix6：silent-0056。
- S1.fix7：silent-0061。
- S1.fix9：silent-0040、silent-0066。

### 学习曲线A5原行

沿用上一轮`python3 ops/paper_dataset.py --no-raw`生成的完整论文表，日志切点2026-10-05T04:37:46.337Z，已覆盖本级唯一结束局，五项一致性检查通过、决策计数差异空、key scan CLEAN；本轮只增加报告及查询快照，没有重新生成或手改论文表。A5原行如下：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,5,1,1,0,1,48,48,ZE8F192FKX24,ZE8F192FKX24,2026-10-05T03:39:22+00:00,2026-10-05T04:22:55+00:00,0,0,1,silent-0078,0,0
```

items_found按first_run进阶归属；items_shipped按登记后首个已结束局的起始时间归属，A5行仅silent-0078（S1.fix11），不是“A5期间正式上线版本数”。A5期间登记的其他条目适用后续局，待正式复盘及账本后续追加再更新统计。

## A6 → A7（2026-10-05 20:56 CST；2SU6XN2AEJRD）

A6共11局，首次尝试1胜10负，最终1胜10负，SL后整局胜利0；平均终层36.27，第一次尝试平均终层34.00。首次尝试的10负包含6局预判必死后读档终止首试、4局直接死亡，不能把10负全部称为首战实际死亡。27次成功读档，重打尝试共3胜24负，其中19次判死截停、5次实际死亡；三次重打战斗获胜没有增加整局胜利。10/11局有SL管理日志不等于10局都读档，实际读档6局。

首胜2SU6XN2AEJRD于2026-10-05T20:15:46.209+08:00结束，F48永世沙漏第一次尝试（attempt=1）T10胜、记录结束血量24；F17墨影幻灵、F23虱虫之祖、F33无厌沙虫也均attempt=1/won，四项管理战斗reload均为空，因此归为第一次尝试胜，成功读档0次。用时47分35.205秒（首决策2026-10-05T19:28:11.004+08:00至结束）；配置开始2026-10-05T19:27:39.344+08:00起计48分06.865秒。下一局SADL3CGYTGSR于2026-10-05T20:18:53.710+08:00开打，run-config解析target_ascension=7，经验2026-10-05.20、代码2c81eb7+dirty；climb自动升阶。

本级窗口按首个A6配置FH2HB2X17F2H的12:25:50.167至首个A7配置20:18:53.710 CST界定，胜局20:15:46.209先结束。胜局启动代码2ec81b9+dirty、经验.19；期间知识前缀可重读，代码下一进程生效。经验.20最终合入20:16:12，在首胜结束后、A7启动前；eval登记20:19:30、运维shipped登记20:29，已属A7开始之后。A7开局实际读取.20与上述时间一致，不能把.20或晚于开局的其他版本作为A6胜因。

### 逐局与终局死因

下表的终局战斗只抄runs.jsonl的death_fight，描述的是记录中的敌人组合，不据此推断新的机制根因。构装体组合及实验体各2局，其余6组各1局；10局最终死亡中4局在boss层（F33一局、F48三局）。

| 局号 | 最终层 / 结果 | 首次尝试终层 | 成功读档 | 终局战斗（原日志） |
|---|---|---|---|---|
| FH2HB2X17F2H | F6 / 负 | F6 | 0 | 利齿之眼、雾菇 |
| UACFSW4VDDLD | F48 / 负 | F33 | 8 | 实验体 #C55 |
| VN7RQJMJEFMX | F42 / 负 | F42 | 0 | 幽灵骑士、连枷骑士、魔法骑士 |
| 75X1BARMNZ03 | F20 / 负 | F20 | 3 | 偷窃草蜢 |
| ARKQLHG6RS4W | F33 / 负 | F33 | 5 | 火箭、碾碎爪 |
| 6EV5V6PJJS9D | F39 / 负 | F39 | 0 | 拳击构装体、方柱构装体 |
| 8CFMW9SAGFWQ | F24 / 负 | F24 | 0 | 寄生惧魔、胧光怪 |
| 2L1BNN9ZJEFU | F48 / 负 | F48 | 5 | 实验体 #C56 |
| 53FLQ68CETW0 | F48 / 负 | F48 | 5 | 永世沙漏 |
| ENKYQMS9W4ZD | F43 / 负 | F33 | 1 | 拳击构装体、方柱构装体 |
| 2SU6XN2AEJRD | F48 / 胜 | F48 | 0 | 通关 |

### 完整评估

`bash ops/codex-ops-do.sh eval-metrics silent 6` exit0，沙箱外执行`eval/metrics.py --character silent --ascension 6 --group-by ascension --md`。原件[a6-metrics-20261005-204700.2edtV5.md](../paper/materials/silent/a6-metrics-20261005-204700.2edtV5.md)，以下原样收录：

| 指标 | A6 |
|---|---|
| 局数 | 11 |
| 终层 | 36.3（中位 42.0；CI 26.8–45.7；n=11） |
| 过一幕 boss | 91%（10/11；CI 62–98%） |
| 过二幕 boss | 64%（7/11；CI 35–85%） |
| 胜局 | 9%（1/11；CI 2–38%） |
| 非 boss 战喝药 / 10 层 | 2.09（中位 2.31；CI 1.48–2.70；n=11） |
| 进一幕 boss 带药（瓶） | 1.20（中位 1.00；CI 0.64–1.76；n=10） |
| 进二幕 boss 带药（瓶） | 1.00（中位 1.00；CI 0.37–1.63；n=8） * |
| 进三幕 boss 带药（瓶） | 1.00（中位 1.00；CI 0.00–2.30；n=4） * |
| 死时手里的药（瓶，输的局） | 0.00（中位 0.00；CI 0.00–0.00；n=10） |
| 一幕 boss 有力量来源 | 20%（2/10；CI 6–51%）；牌 1 / 遗物 1 / 开场有力量 1 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.45（中位 0.00；CI 0.10–0.81；n=11）；占一幕精英战 5/12 |
| 二幕第一个休息点前死亡（占进二幕的局） | 20%（2/10；CI 6–51%） |
| 大脑调用 / 局 | 37.6（中位 40.0；CI 27.7–47.6；n=11） |
| 输入 token / 局（千） | 3492（中位 3552；CI 2495–4490；n=11） |
| 缓存命中 token / 局（千） | 230（中位 170；CI 93–368；n=11） |
| 输出 token / 局（千） | 17.6（中位 12.4；CI 6.4–28.8；n=11） |
| 缓存命中率 | 7% |
| 大脑耗时 / 局（分钟） | 11.4（中位 12.6；CI 8.6–14.3；n=11） |
| 每次调用平均耗时（秒） | 18.2 |
|   codex：调用 / 局 | 37.0（中位 40.0；CI 27.1–46.9；n=11） |
|   codex：输入 / 命中 / 输出（千 token / 局） | 3438 / 209 / 10.5（n=11） |
|   codex：耗时 / 局（分钟） | 10.8（中位 11.4；CI 8.1–13.5；n=11） |
|   deepseek：调用 / 局 | 0.6（中位 0.0；CI 0.0–1.7；n=11） |
|   deepseek：输入 / 命中 / 输出（千 token / 局） | 299 / 120 / 39.1（n=2） |
|   deepseek：耗时 / 局（分钟） | 0.6（中位 0.0；CI 0.0–1.6；n=11） |
| SL：有 SL 记录的局 | 10/11 |
| SL：重打次数 / 局 | 2.45（中位 1.00；CI 0.52–4.39；n=11） |
| 第一次尝试：终层 | 34.0（中位 33.0；CI 25.1–42.9；n=11） |
| 第一次尝试：过一幕 boss | 91%（10/11；CI 62–98%） |
| 第一次尝试：过二幕 boss | 45%（5/11；CI 21–72%） |
| 第一次尝试：胜局 | 9%（1/11；CI 2–38%） |
| 校准：推演本回合掉血 ±2 内（回合） | 92%（611/663 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 +0.0，中位 \|误差\| 5.0（n=90） |
| 校准：boss 时钟 实打/估值 中位 | — |

掉血推演±2内611/663回合（92%），路线投影绝对误差中位5.0（n=90），boss时钟无有效校准值，保留“—”。星号指标的样本不足10，置信区间及缺失值原样保留；总样本11局、胜率CI 2%—38%，没有受控对照，不能分离升级难度、局内运气与多次更新的贡献。

### 学习者产出与上线

查询快照2026-10-05T20:52:15+08:00，执行`python3 learner/ledger.py find --character silent --asc 6 --json`及`--status shipped --json`，归档[a6-learning-snapshot-20261005-2046.json](../paper/materials/silent/a6-learning-snapshot-20261005-2046.json)。按首次登记时间，本级窗口新增26项silent-0093—0118；按first_run/asc字段，其中16项首次归属A6、A0五项、A2两项、A3一项、A5两项。登记时段与最早证据的进阶分开计算。A6十个败局已有正式复盘；首胜2SU6XN2AEJRD的复盘正由调度器20:43批次处理，完成事件尚未收到，不提前计入产出。

| 本级首次归属A6的账本id | 学习者记录的范围 | 查询时最后状态 / 版本 |
|---|---|---|
| silent-0096（FH2HB2X17F2H） | 羊毛剪删牌后的实际防御与未兑现协同观察 | shipped / S1.exp15 |
| silent-0097（FH2HB2X17F2H） | 疑虑持牌后的实际虚弱与攻击变化 | shipped / S1.exp15 |
| silent-0099（UACFSW4VDDLD） | 幻影之刃首刀增伤模型缺口 | shipped / S1.fix17 |
| silent-0100（UACFSW4VDDLD） | 阶段结束窗口已可见但当轮没有兑现 | shipped / S1.exp15 |
| silent-0102（UACFSW4VDDLD） | 知识恶魔回血与重打输出/损血观察 | shipped / S1.exp15 |
| silent-0103（VN7RQJMJEFMX） | 定制疯狂科学与本回合出牌触发 | shipped / S1.exp16 |
| silent-0104（75X1BARMNZ03） | 隐秘匕首与螺线飞镖触发条件辨认 | shipped / S1.exp16 |
| silent-0105（75X1BARMNZ03） | 螺线飞镖的实际敏捷与时限 | shipped / S1.exp16 |
| silent-0109（6EV5V6PJJS9D） | 面包首轮/后轮能量时序 | shipped / S1.exp17 |
| silent-0110（8CFMW9SAGFWQ） | 华丽收场空堆条件与未兑现协同 | shipped / S1.exp18 |
| silent-0112（2L1BNN9ZJEFU） | 融入暗影+升级分支模型缺口 | shipped / S1.fix19 |
| silent-0113（VN7RQJMJEFMX） | 预判+临时敏捷升级分支模型缺口 | shipped / S1.fix19 |
| silent-0114（53FLQ68CETW0） | 普通爆发增益漏技能重复的模型缺口 | shipped / S1.fix20 |
| silent-0116（53FLQ68CETW0） | 亮片华彩奖励与实际小刀/余像次数 | shipped / S1.exp20 |
| silent-0117（ENKYQMS9W4ZD） | 沙坑临界弃牌删光逃离的观察 | observed / 未上线 |
| silent-0118（ENKYQMS9W4ZD） | 爆发+与复制药水已执行的三次药瓶组合 | observed / 未上线 |

上表只概述学习者已经登记的发现。0110字段仍归A6但prior=yes、已有A2证据；0115在本级登记，最早实效已回溯KAY522KT5NXR/A0，因此不列为A6首次。0098时钟事实提案归A2；0108音叉模型归A0；这些仍是在本级产出的修复或提案。0099/0112/0113/0114的代码修复与对应机制经验分别登记；0117/0118仍observed，后续经验批次在跑，不记已上线。升级爆发范围缺口仍交学习者独立处理，经验.20上线不冒记该模型已修。

本级窗口内实际代码/经验合入16个eval版本，15个在窗口内完成eval登记；.20合入在窗口内而登记在窗口外，单独保留两种时点。下面的范围直接来自版本source和学习者记录，不增加游戏知识：

| 版本 | 实际合入 / eval登记（CST） | 证据和范围 |
|---|---|---|
| S1.fix14（24ce2a6f） | 12:26:13 / 12:29:34 | 0089/0091；1LMB A4，脆弱下方案内新增敏捷格挡模型 |
| S1.exp14（103fd5ff） | 12:33:20 / 12:44:12 | 1LMB A4及旧静默证据；经验.14，新增1/更新12 |
| S1.fix15（2d898397） | 12:56:05 / 12:59:42 | 既有接口证据JJ75 A8；事件完成/稳定后仍等状态变化，通用传输修复 |
| S1.strategy1（76c82f8d） | 13:40:26 / 13:40:27 | 0098/0003；ZZMY A2、9Y/1LMB A4、CSBR A2，当前进阶boss事实参考 |
| S1.fix16（ee63d4bb） | 13:55:13 / 13:58:48 | 既有接口证据7PWU A8；关闭覆盖层后同事实/问题复用未执行答案 |
| S1.strategy2（2b70928a） | 14:13:59 / 14:18:06 | 0100；UAC A6 F48，阶段结束窗口及即时损血参考 |
| S1.exp15（b3078331） | 14:28:23 / 14:33:11 | ZE8 A5、FH2/UAC A6；经验.15，新增6/更新18 |
| S1.fix17（6aa5eb0b） | 14:57:31 / 15:01:33 | 0099/0101；UAC A6，幻影之刃首刀模型 |
| S1.exp16（d668d788） | 15:40:40 / 15:40:40 | VN7/75X A6；经验.16，新增4/更新11 |
| S1.fix18（68a415a9） | 16:46:43 / 16:50:18 | 0108/0072；6EV A6、T082 A0，音叉技能计数格挡模型 |
| S1.exp17（5f17e4b3） | 16:50:18 / 17:02:51 | ARK/6EV A6；经验.17，新增2/更新17 |
| S1.exp18（ee1f4fd1） | 17:26:13 / 17:31:36 | 8CF A6、旧ZZMY A2；经验.18，新增1/更新6 |
| S1.fix19（850ac015） | 18:37:19 / 18:40:53 | 0112/0113、0077/0080；2L/VN7/75X A6，两项升级模型及xhigh测试契约 |
| S1.exp19（f90ad2f1） | 19:04:38 / 19:08:08 | 2L A6及旧证据；经验.19，新增0/补证更新14 |
| S1.fix20（2ec81b9f） | 19:26:25 / 19:29:43 | 0114/0115；53FL A6，普通爆发本回合下一技能重复模型 |
| S1.exp20（2c81eb76） | 20:16:12 / 20:19:30（A7后） | 53FL A6及旧26局；经验.20，新增2/补证更新12；合入在首胜后，登记在A7后 |

本级经验.14—.20各批的条目增量合计新增16、更新90（含同一条目的反复补证，不是90条独立新增）；从A6开局经验.13的active70累积到.20的active86，.14上线时为71。经验.19曾被旧high断言挡住两次，修复契约后重派；经验.20首次候选因SL洗牌事实校正主动回退后再合，失败、回退和更正历史均保留。以上代码和经验已按各自完成事件核实，完整沙箱外补测已按独立learner-checks完成，不把新成本采样批次计为本级已上线。学习者17:26恢复xhigh、运维17:27调整xhigh是Roy的运行设置决定；大脑仍high，不混称学习出来的打法。

当前最后状态shipped共106项，按最新版本分组如下；它不是本级新增或本级上线数量，后续学习任务追加proposed会改变最后状态，历史上线记录保持。完整查询字段见快照：

- S1.exp10：silent-0018、silent-0069、silent-0070、silent-0071、silent-0073。
- S1.exp11：silent-0037、silent-0048、silent-0076。
- S1.exp12：silent-0083、silent-0084、silent-0085。
- S1.exp13：silent-0079、silent-0087、silent-0088。
- S1.exp14：silent-0068、silent-0090、silent-0091。
- S1.exp15：silent-0059、silent-0063、silent-0067、silent-0093、silent-0094、silent-0095、silent-0096、silent-0097、silent-0100、silent-0101、silent-0102。
- S1.exp16：silent-0053、silent-0064、silent-0103、silent-0104、silent-0105、silent-0106、silent-0107。
- S1.exp17：silent-0007、silent-0010、silent-0013、silent-0027、silent-0030、silent-0031、silent-0062、silent-0065、silent-0072、silent-0092、silent-0109。
- S1.exp18：silent-0039、silent-0110、silent-0111。
- S1.exp19：silent-0028、silent-0045、silent-0046、silent-0054、silent-0057、silent-0077、silent-0080。
- S1.exp20：silent-0005、silent-0006、silent-0011、silent-0017、silent-0019、silent-0020、silent-0021、silent-0023、silent-0024、silent-0025、silent-0036、silent-0049、silent-0115、silent-0116。
- S1.exp5：silent-0034、silent-0035、silent-0042、silent-0043、silent-0044、silent-0047。
- S1.exp7：silent-0055。
- S1.exp8：silent-0050、silent-0058、silent-0060。
- S1.fix10：silent-0074、silent-0075。
- S1.fix11：silent-0078。
- S1.fix12：silent-0081、silent-0082。
- S1.fix13：silent-0086。
- S1.fix14：silent-0089。
- S1.fix17：silent-0099。
- S1.fix18：silent-0108。
- S1.fix19：silent-0112、silent-0113。
- S1.fix20：silent-0114。
- S1.fix3：silent-0008、silent-0022、silent-0026、silent-0029、silent-0032、silent-0033、silent-0041。
- S1.fix5：silent-0051、silent-0052。
- S1.fix6：silent-0056。
- S1.fix7：silent-0061。
- S1.fix9：silent-0040、silent-0066。
- S1.strategy1：silent-0098。

### 学习曲线A6原行

沿用`python3 ops/paper_dataset.py --no-raw`上一轮已生成并提交的论文表19e7ab79，日志切点2026-10-05T12:30:28.065Z，已覆盖本级11个结束局；此前五项一致性检查通过、决策计数差异空、key scan CLEAN。此轮只追加升级报告及查询快照，避免并发重跑或手改生成表。原行如下：

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,6,11,1,1,0,36.27,34,FH2HB2X17F2H,2SU6XN2AEJRD,2026-10-05T04:25:50+00:00,2026-10-05T12:15:46+00:00,16,1,54,silent-0007 silent-0010 silent-0013 silent-0027 silent-0028 silent-0030 silent-0031 silent-0039 silent-0045 silent-0046 silent-0053 silent-0054 silent-0057 silent-0059 silent-0062 silent-0063 silent-0064 silent-0065 silent-0067 silent-0068 silent-0072 silent-0077 silent-0079 silent-0080 silent-0081 silent-0082 silent-0086 silent-0087 silent-0088 silent-0089 silent-0090 silent-0091 silent-0092 silent-0093 silent-0094 silent-0095 silent-0096 silent-0097 silent-0098 silent-0099 silent-0100 silent-0101 silent-0102 silent-0103 silent-0104 silent-0105 silent-0106 silent-0107 silent-0108 silent-0109 silent-0110 silent-0111 silent-0112 silent-0113,1,0
```

items_found=16按最早证据进阶归属，items_shipped=54按登记后下一场已结束局的起始归属；它们分别不同于本级时段新增26项、窗口内15次正式登记、查询时106项最后状态shipped。0114虽在本级发布，运维登记晚于首胜启动，生成曲线可以归后续进阶；.20在首胜结束后生效，其shipped适用A7。不得用不同统计口径之间的差额推定学习失败，也不把当前缺复盘的首胜先补进账本。

### A6首胜复盘完成后的补充（2026-10-05 21:09）

21:01事件确认批次20261005-204301的2SU6XN2AEJRD复盘完成、exit0；学习者新增silent-0119（腰带扣空药栏敏捷与格挡组合）和silent-0120（领主阳伞两次商店自动取得及未执行报价），首次证据均为A6首胜，登记于20:59:31、晚于A7开局。因此生成曲线按首次证据归属的items_found由16变18，先前升级窗口0093—0118共26项及20:52:15查询快照保持原统计时点，不追溯加入事后条目。两项仍为observed，没有登记上线；旧十项support补证，不记repeat，不把本局当S1.exp20上线后效果。

学习者原文及20:58:56勘误均保留：沙虫末轮敌40血/37毒，纯伤缺口3、实际打击6覆盖；SPEEDSTER/ULTIMATE_STRIKE中文名更正为速行者/究极打击，ID及实际取得不变。新的纯bug无；预测差额完整来源及源码归因等维持未记录。完整归档见paper/materials/silent/20261005-2101-postmortem-batch.md，台账检查120项0问题。

本轮`python3 ops/paper_dataset.py --no-raw`日志切点2026-10-05T13:06:01.066Z，五项一致性检查通过、决策计数差异空、key scan CLEAN。生成学习曲线A6新原行如下，保留上一轮原行及其时点说明；items_shipped=51沿生成器按登记后下一场已结束局起始归属的口径，不等同于窗口内上线次数或当前最后状态数量。

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,6,11,1,1,0,36.27,34,FH2HB2X17F2H,2SU6XN2AEJRD,2026-10-05T04:25:50+00:00,2026-10-05T12:15:46+00:00,18,1,51,silent-0010 silent-0013 silent-0027 silent-0028 silent-0030 silent-0031 silent-0039 silent-0045 silent-0046 silent-0053 silent-0054 silent-0059 silent-0062 silent-0063 silent-0064 silent-0065 silent-0067 silent-0068 silent-0072 silent-0077 silent-0079 silent-0080 silent-0081 silent-0082 silent-0086 silent-0087 silent-0088 silent-0089 silent-0090 silent-0091 silent-0093 silent-0094 silent-0095 silent-0096 silent-0097 silent-0098 silent-0099 silent-0100 silent-0101 silent-0102 silent-0103 silent-0104 silent-0105 silent-0106 silent-0107 silent-0108 silent-0109 silent-0110 silent-0111 silent-0112 silent-0113,1,0
```

## A7 → A8（2026-10-06 02:25 运维记录）

统计窗口以实际run-config为准：2026-10-05 20:18:53 CST（SADL3CGYTGSR/A7开局）至2026-10-06 02:00:49 CST（LLYSRQQ35AVW/A8开局，右端不含）。各局target_ascension均为7，下一局解析值为8、模式climb；不改配置。

4Y94N8RDPGPM 于2026-10-06 01:57:26.505 CST通关A7/F48。三个boss的SL记录均为attempt=1、result=won、reload=null，没有predicted_death或读档：第一次尝试赢。693个决策，首末决策2026-10-06 01:19:50.420—01:57:26.505 CST，跨度2256.085秒（37分36秒）；若从run-config写入计到结束则2285.330秒（38分05秒），两种起点分开记录。下一局LLYSRQQ35AVW已经在2026-10-06 02:00:49.391 CST开始A8。

### 胜负、层数及主要死亡战斗

7局，第一次尝试按首次判死口径为1胜6负；6个败局使用SL，成功读档24次，重打后0胜6负。最终1胜6负，首次胜率和含SL最终胜率均1/7（14.3%）；最终平均层数40.57、首次尝试平均39.00。成功读档及同房多次尝试不算新的独立局，也不把predicted_death当作执行完成的实死。

| 局号 | 最终结果 / 层 | 首次判死层 | 成功读档 | 死亡战斗（runs.jsonl） |
| --- | --- | --- | --- | --- |
| SADL3CGYTGSR | 负 / F48 | 48 | 5 | 永世沙漏 |
| Z6CFLDR3N4SB | 负 / F48 | 48 | 1 | 永世沙漏 |
| 3KME36ADUE4U | 负 / F27 | 27 | 2 | 熟睡甲虫、盛碗虫（丝）、盛碗虫（石） |
| VLV17NUSFS61 | 负 / F48 | 37 | 6 | 女王、火炬头聚合体 |
| 9YT51CK8RC39 | 负 / F17 | 17 | 5 | 仪式兽 |
| 2PVLGRBGUX9S | 负 / F48 | 48 | 5 | 永世沙漏 |
| 4Y94N8RDPGPM | 胜 / F48 | 无 | 0 | 无 |

六个最终败局中：永世沙漏3局；女王/火炬头聚合体组合、熟睡甲虫/两种盛碗虫组合、仪式兽各1局。这是日志的死亡战斗分类，不据组合名推断内部击杀先后。学习者已核实2PVLGRBGUX9S末次T12为8血9挡面对三张各12伤凋萎，敌当轮无攻击，需损27但仅扣现存8；其抽序原句及追加勘误均保留：六次共同前缀15张，仅第2—6次前38张一致，不当作六个独立局或整场受控比较。其他打法归因沿已有复盘，不由运维添加。

### 完整评估原文

已运行白名单动作`bash ops/codex-ops-do.sh eval-metrics silent 7`，exit0；它在沙箱外运行`eval/metrics.py --character silent --ascension 7 --group-by ascension --md`。原始报告为[a7-metrics-20261006-021732.BqiotA.md](../paper/materials/silent/a7-metrics-20261006-021732.BqiotA.md)，SHA256见查询快照。表中区间、样本不足标记及缺失值原样保留：

| 指标 | A7 |
|---|---|
| 局数 | 7 * |
| 终层 | 40.6（中位 48.0；CI 28.5–52.6；n=7） * |
| 过一幕 boss | 86%（6/7；CI 49–97%） * |
| 过二幕 boss | 71%（5/7；CI 36–92%） * |
| 胜局 | 14%（1/7；CI 3–51%） * |
| 非 boss 战喝药 / 10 层 | 3.07（中位 2.92；CI 1.69–4.46；n=7） * |
| 进一幕 boss 带药（瓶） | 0.86（中位 1.00；CI 0.51–1.21；n=7） * |
| 进二幕 boss 带药（瓶） | 1.40（中位 1.00；CI 0.00–2.82；n=5） * |
| 进三幕 boss 带药（瓶） | 2.00（中位 2.00；CI 0.04–3.96；n=5） * |
| 死时手里的药（瓶，输的局） | 0.00（中位 0.00；CI 0.00–0.00；n=6） * |
| 一幕 boss 有力量来源 | 0%（0/7；CI 0–35%） *；牌 0 / 遗物 0 / 开场有力量 0 |
| 一幕精英进场血量 < 78% 次数 / 局 | 0.86（中位 1.00；CI 0.22–1.50；n=7） *；占一幕精英战 6/12 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/6；CI 0–39%） * |
| 大脑调用 / 局 | 40.0（中位 45.0；CI 27.2–52.8；n=7） * |
| 输入 token / 局（千） | 4340（中位 4911；CI 2974–5705；n=7） * |
| 缓存命中 token / 局（千） | 139（中位 107；CI 17–262；n=7） * |
| 输出 token / 局（千） | 10.9（中位 12.3；CI 7.4–14.5；n=7） * |
| 缓存命中率 | 3% |
| 大脑耗时 / 局（分钟） | 11.1（中位 12.2；CI 7.6–14.6；n=7） * |
| 每次调用平均耗时（秒） | 16.7 |
|   codex：调用 / 局 | 40.0（中位 45.0；CI 27.2–52.8；n=7） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 4340 / 139 / 10.9（n=7） |
|   codex：耗时 / 局（分钟） | 11.1（中位 12.2；CI 7.6–14.6；n=7） * |
| SL：有 SL 记录的局 | 7/7 |
| SL：重打次数 / 局 | 3.43（中位 5.00；CI 1.24–5.62；n=7） * |
| 第一次尝试：终层 | 39.0（中位 48.0；CI 27.3–50.7；n=7） * |
| 第一次尝试：过一幕 boss | 86%（6/7；CI 49–97%） * |
| 第一次尝试：过二幕 boss | 71%（5/7；CI 36–92%） * |
| 第一次尝试：胜局 | 14%（1/7；CI 3–51%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 93%（451/486 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 -0.8，中位 \|误差\| 4.0（n=40） |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

样本仅7局；掉血推演±2内451/486回合（93%），路线投影绝对误差中位4.0（n=40），boss时钟没有有效校准值。没有受控整场对照，也不能分离升级难度、局内随机性和多次经验/代码更新的贡献。

### 学习者产出与上线

账本查询分别执行`python3 learner/ledger.py find --character silent --asc 7 --json`和`--status shipped --json`，保存为[a7-learning-snapshot-20261006-0216.json](../paper/materials/silent/a7-learning-snapshot-20261006-0216.json)；文件写入时点及原查询数据均在快照内。查询时首次证据归属A7共11项，9项最后状态shipped、2项proposed；不是11项都在本级时段已经生效。六个败局已有正式复盘，首胜4Y94N8RDPGPM的学习者完成事件尚未收到，不提前计入。

| 账本 id | 学习者记录范围 | 最早证据局 | 查询时状态 / 版本 |
| --- | --- | --- | --- |
| silent-0121 | 铁棒与沙漏同一步触发时的持牌伤观察 | SADL3CGYTGSR | shipped / S1.exp23 |
| silent-0122 | 铁棒累计四张抽牌、跨回合计数的实证 | SADL3CGYTGSR | shipped / S1.exp23 |
| silent-0123 | 佩尔士兵与融入暗影组合格挡的实证 | SADL3CGYTGSR | shipped / S1.exp23 |
| silent-0124 | 营养汤与虚无基础牌的后段资源观察 | Z6CFLDR3N4SB | shipped / S1.exp25 |
| silent-0125 | HP护栏换线的即时血价、输出取舍 | Z6CFLDR3N4SB | shipped / S1.exp25 |
| silent-0126 | 幽灵种子未打出基础牌消耗的时点 | Z6CFLDR3N4SB | shipped / S1.exp25 |
| silent-0130 | 单行动题重复抵扣已有格挡的代码缺陷 | Z6CFLDR3N4SB | shipped / S1.fix23 |
| silent-0131 | 钻石头冠开场格挡保护窗口的实证 | VLV17NUSFS61 | shipped / S1.exp26 |
| silent-0135 | 长程并列组的即时损血参考提案 | 9YT51CK8RC39 | shipped / S1.strategy3 |
| silent-0136 | 本局专长版疯狂科学力量/敏捷的实证 | 2PVLGRBGUX9S | proposed / 未上线 |
| silent-0137 | 升级腐蚀波抽牌施毒的实证 | 2PVLGRBGUX9S | proposed / 未上线 |

按首次登记时间，本级窗口新增19项（silent-0119—0137）；按first_run/asc，其中11项归A7、3项归A6、4项归A0、1项归A4。这些是两种不同口径；旧局机制回溯不混称A7首次遇到。0135虽在本级形成提案，其S1.strategy3实际发布在A8开局之后（02:06发布、02:16由ops登记shipped），不算本级上线或A7首胜使用的版本。0136/0137的原postmortem与抽序勘误已在02:03事件处理，随后经验任务追加proposed，查询时尚无上线；不冒记模拟器实现。关联0079/0080的既有状态保留，重复错误也按原学习者标记。

本级窗口中经验.21—.27共7批，实际对应6个eval经验版本；源码修复3个eval版本，共9个窗口内版本。经验.24首次合后Inferno测试失败已回退，随后被.25继承并以S1.exp25实际生效，不存在独立S1.exp24；原失败、回退、锁占用及两批独立完整补测通过记录保留。S1.exp20是本级开局继承的版本，其eval登记晚于A7开局，不计为本级新合入。

| 本级窗口上线 eval 版本 | eval 记录指向 | 来源和范围 |
| --- | --- | --- |
| S1.exp21 | 959f7f22 | 经验.21，ENKYQMS9W4ZD/A6及旧27局；新增0、补证更新11 |
| S1.fix21 | e7370f88 | 升级爆发计数模型；VN7RQJMJEFMX/A6/F27/T6，机制0115 |
| S1.exp22 | aea750c9 | 经验.22，2SU6XN2AEJRD/A6及旧28局；新增2、更新13 |
| S1.exp23 | 6c4a8558 | 经验.23，SADL3CGYTGSR/A7及旧29局；新增2、更新10 |
| S1.exp25 | 5bc320f7 | 经验.24与.25接力生效，Z6/3KME A7；分别新增2/1、更新10/7 |
| S1.fix22 | f4a6173a | 没有后继招式时伤害预测标未知；3KME A7及53FL A6，0127；0128机制不冒记完整实现 |
| S1.exp26 | c7ca5d01 | 经验.26，VLV17NUSFS61/A7及旧32局；新增2、更新13 |
| S1.exp27 | ce1864a0 | 经验.27，9YT51CK8RC39/A7及旧33局；新增2、更新8 |
| S1.fix23 | df557706 | 单行动题重复扣已有格挡；VLV A7/F48第6次T5、Z6 A7/F48首战T10，0130 |

经验7批合计新增11条、补证更新82次、退役0，active86→97；更新次数包含同一经验反复补证，不能当作82条独立新增。以上范围只转录学习者changelog、版本source与运维实际发布记录；0127缺数据未知修复、0130已有挡修复和机制观察/经验文本分别计算。额度采样、成本归集、TMPDIR与herdr测试修正是系统记录或测试工作，不混记学习出来的游戏策略。

首胜开局代码8b268858+dirty、经验2026-10-06.1；下一局A8开局代码bf63ab40、经验2026-10-06.2。代码上线按下一局生效，知识前缀会随刷新重渲染，单凭开局版本不能把整场通关归因于某项更新。初始测试失败、勘误、回退、busy及完整检查失败历史均保留。

### 学习曲线A7原行

沿用上一轮`paper_dataset.py --no-raw`生成的论文数据（切点2026-10-05T18:07:49.022Z，已包含本级7个结束局），及02:16上线登记后刷新并提交的学习曲线（03123b44）。本轮不重复整库刷新或手改曲线。完整论文生成当时五项一致性通过、决策计数差异为空、key scan CLEAN；当前账本检查为/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 139 item(s), 0 problem(s)。

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,7,7,1,1,0,40.57,39,SADL3CGYTGSR,4Y94N8RDPGPM,2026-10-05T12:18:53+00:00,2026-10-05T17:57:26+00:00,11,0,38,silent-0007 silent-0009 silent-0010 silent-0011 silent-0013 silent-0017 silent-0027 silent-0036 silent-0046 silent-0048 silent-0053 silent-0057 silent-0059 silent-0063 silent-0069 silent-0077 silent-0092 silent-0107 silent-0110 silent-0111 silent-0114 silent-0115 silent-0116 silent-0117 silent-0118 silent-0119 silent-0120 silent-0121 silent-0122 silent-0123 silent-0124 silent-0125 silent-0126 silent-0127 silent-0128 silent-0129 silent-0131 silent-0132,3,0
```

items_found=11按最早证据进阶；items_shipped=38按登记后下一场已结束局的起始归属；repeats=3、repeats_after_ship=0按生成器标记及登记时点。它们不同于本级时间窗新增19项、窗口内9个eval版本或查询时全静默113项最后状态shipped，不能由这些口径间的差额推定学习失败。首胜的后续复盘和上线留后续事件补充，不回改本查询点。

### A7首胜复盘补齐（2026-10-06 02:40 CST）

正式完成事件20261006-021302补齐4Y94N8RDPGPM，A7正式复盘由6/7补齐为7/7；旧02:16查询点保留。首胜仍是A7/F48首次尝试通关、9血、无读档。学习者新增silent-0140（夜魇启动与兑现观察）、silent-0141（复制到手/附魔现场），均observed、prior=unknown；已有0005/0007/0016/0020/0046/0069/0090七项support补证，repeat无。原文及focus/药水选牌措辞勘误完整保留在notes/lessons.md；没有新的纯bug或Roy待定，未把后续发现倒算为本级通关前已上线。详paper/materials/silent/20261006-0236-postmortem-and-exp28-check-failure.md，论文表刷新结果另记。

- 2026-10-06 02:46 首胜复盘后论文表刷新完成，切点2026-10-05T18:42:20.673Z、五项一致性通过、key scan CLEAN。下列为脚本本次生成的A7原行，后续发现按最早证据归属进阶计入；02:16历史查询点保持。

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,7,7,1,1,0,40.57,39,SADL3CGYTGSR,4Y94N8RDPGPM,2026-10-05T12:18:53+00:00,2026-10-05T17:57:26+00:00,13,0,38,silent-0007 silent-0009 silent-0010 silent-0011 silent-0013 silent-0017 silent-0027 silent-0036 silent-0046 silent-0048 silent-0053 silent-0057 silent-0059 silent-0063 silent-0069 silent-0077 silent-0092 silent-0107 silent-0110 silent-0111 silent-0114 silent-0115 silent-0116 silent-0117 silent-0118 silent-0119 silent-0120 silent-0121 silent-0122 silent-0123 silent-0124 silent-0125 silent-0126 silent-0127 silent-0128 silent-0129 silent-0131 silent-0132,3,0
```

## A8（2026-10-06 03:19 CST 小结；下一局已开 A9）

爬阶窗口从2026-10-06 02:00:49的A8开局至2026-10-06 02:45:41的A9开局；唯一A8局LLYSRQQ35AVW结束于2026-10-06 02:42:21。窗口含通关后至下局开始约3分20秒，学习登记与版本合入时点按此区间统计，游戏结果只计已结束A8局。实际配置target_ascension=8→9、模式climb；下一局HMVJKM56S4Q8。

### 结果与死亡记录

| 口径 | 局数 | 胜 / 负 | 平均终层 | 成功读档 |
| --- | --- | --- | --- | --- |
| 第一次尝试 | 1 | 1 / 0 | 48 | 0 |
| 最终结果 | 1 | 1 / 0 | 48 | 0 |
| 实际发生SL的局 | 0 | 无 | 无 | 0 |

LLYSRQQ35AVW为首次尝试通关女王/火炬头聚合体，T7剩60血。sl-attempts的F17/F33/F48三条均首次won，没有predicted_death或reload；评估“有SL记录的局1/1”仅表示存在跟踪记录，实际重打0次。没有败局、death_fight为空，主要死因不适用。首末决策跨度41分05秒，配置开局至结束约41分32秒（已在通关事件记录）。只有一局样本，无受控胜负对照，不能据此确定稳定胜率或某项更新的贡献。

### 完整评估

白名单动作`bash ops/codex-ops-do.sh eval-metrics silent 8`退出0；沙箱外执行`eval/metrics.py --character silent --ascension 8 --group-by ascension --md`。原报告[a8-metrics-20261006-031359.cxO8ie.md](../paper/materials/silent/a8-metrics-20261006-031359.cxO8ie.md)，SHA256见账本查询快照。区间、样本不足标记和缺失值原样保留：

| 指标 | A8 |
|---|---|
| 局数 | 1 * |
| 终层 | 48.0（中位 48.0；n=1） * |
| 过一幕 boss | 100%（1/1；CI 21–100%） * |
| 过二幕 boss | 100%（1/1；CI 21–100%） * |
| 胜局 | 100%（1/1；CI 21–100%） * |
| 非 boss 战喝药 / 10 层 | 2.08（中位 2.08；n=1） * |
| 进一幕 boss 带药（瓶） | 0.00（中位 0.00；n=1） * |
| 进二幕 boss 带药（瓶） | 1.00（中位 1.00；n=1） * |
| 进三幕 boss 带药（瓶） | 1.00（中位 1.00；n=1） * |
| 死时手里的药（瓶，输的局） | — |
| 一幕 boss 有力量来源 | 0%（0/1；CI 0–79%） *；牌 0 / 遗物 0 / 开场有力量 0 |
| 一幕精英进场血量 < 78% 次数 / 局 | 1.00（中位 1.00；n=1） *；占一幕精英战 1/3 |
| 二幕第一个休息点前死亡（占进二幕的局） | 0%（0/1；CI 0–79%） * |
| 大脑调用 / 局 | 54.0（中位 54.0；n=1） * |
| 输入 token / 局（千） | 5771（中位 5771；n=1） * |
| 缓存命中 token / 局（千） | 98（中位 98；n=1） * |
| 输出 token / 局（千） | 14.6（中位 14.6；n=1） * |
| 缓存命中率 | 2% |
| 大脑耗时 / 局（分钟） | 14.9（中位 14.9；n=1） * |
| 每次调用平均耗时（秒） | 16.5 |
|   codex：调用 / 局 | 54.0（中位 54.0；n=1） * |
|   codex：输入 / 命中 / 输出（千 token / 局） | 5771 / 98 / 14.6（n=1） |
|   codex：耗时 / 局（分钟） | 14.9（中位 14.9；n=1） * |
| SL：有 SL 记录的局 | 1/1 |
| SL：重打次数 / 局 | 0.00（中位 0.00；n=1） * |
| 第一次尝试：终层 | 48.0（中位 48.0；n=1） * |
| 第一次尝试：过一幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：过二幕 boss | 100%（1/1；CI 21–100%） * |
| 第一次尝试：胜局 | 100%（1/1；CI 21–100%） * |
| 校准：推演本回合掉血 ±2 内（回合） | 95%（56/59 回合） |
| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 -0.8，中位 \|误差\| 0.8（n=6） * |
| 校准：boss 时钟 实打/估值 中位 | — |

* 局数 < 10（或该指标的 n < 10）：样本不足，区间只作参考。

### 学习者产出与上线

本局正式复盘已在20261006-024301/03:03完成事件归档（1/1）。本局新登记silent-0144/0145/0146三项，既有0010/0023/0027/0037/0044/0053/0072/0138八项补证，无repeat。其中0144为升级萎靡模型覆盖证据，最早回溯KAY522KT5NXR/A0/F31/T1，按最早证据归A0；运维仅转录队列交学习者，不沿用旧未升级0051已修状态。归A8的两项为：

| 账本 id | 学习者原记录范围 | 最早证据局 / 进阶 | 查询状态 |
| --- | --- | --- | --- |
| silent-0145 | 微型帐篷购法及六个营火回血、升级的实际收益观察 | LLYSRQQ35AVW / A8 | observed；prior=unknown |
| silent-0146 | 微型帐篷允许同一营火回血、锻造两选项及两种顺序的实证 | LLYSRQQ35AVW / A8 | observed；prior=unknown |

两项首次登记于02:57:35，在A8通关及A9开局之后，查询时均未上线；不倒算为A8通关前已学会。账本查询`find --character silent --asc 8 --json`和`find --character silent --status shipped --json`的完整原结果、写入时点、配置及SL记录保存于[a8-learning-snapshot-20261006-0313.json](../paper/materials/silent/a8-learning-snapshot-20261006-0313.json)；全静默最后状态shipped为118项，不能当作A8新增或本级上线数量。

按首次登记时间，爬阶窗口新增6项：0138疯狂科学定制模板（最早R0HEV5E3QT6G/A0）、0139构筑模拟精确胜率并列（2L1BNN9ZJEFU/A6）、0140夜魇启动血价与复制兑现、0141夜魇复制到手/附魔现场（均4Y94N8RDPGPM/A7）、0142永恒羽毛到营火回血的观察（LRN0HPZ0FZS1/A0）、0143勒紧给防御额外挡的观察（4Y94N8RDPGPM/A7）。0142/0143登记于02:45:11的局间窗口；这6项最早证据均不归A8，不与首胜后0145/0146混计。

| 爬阶窗口实际合入版本 | 来源 / 范围 | 已测发布记录 |
| --- | --- | --- |
| S1.strategy3（eba51d36） | 0135；9YT51CK8RC39/A7/F17第3/6次T5，长程并列组的即时损血参考 | 02:06发布f75162d8；02:16 ops登记0135 shipped，完整补测已通过 |
| S1.exp28（363ff303） | 2PVLGRBGUX9S/A7及旧34本角色局，经验2026-10-06.3，新增0/更新14/退役0，active97 | 02:22发布98f88e06；02:34 ops登记17项经验shipped，覆盖经验文本；0136/0137不代表模拟器机制代码已实现 |
| S1.strategy4（a10be71d） | 0139；2L1BNN9ZJEFU/A6/F9及2PVLGRBGUX9S/A7/F16，精确原始/校准胜率同样本量并列事实 | 02:44发布291617bc，位于通关后局间；ops于02:57登记0139 shipped，已在爬阶窗口之外 |

窗口内有18条ops shipped登记（0135一条、经验.28十七条），主要为已有经验补证，不等于18条新增。查询快照的版本时间为git提交时间，已测发布时间以上表及decision-log为准。经验.29源码8f7d061a尚未成为main/live祖先，新增0142/0143只算学习者提案；原追加记录冲突及忙锁记录保留。

A8开局加载bf63ab40、经验2026-10-06.2，结束记录为bf63ab40+dirty；A9开局加载6566b7d3、经验2026-10-06.3。代码合入下一局生效，不能把本窗口后续代码合入说成A8首胜已使用；知识前缀随刷新渲染，单凭开局版本也不能作单项因果归因。经验.28完整补测1506>1500及策略4完整补测2993>1800的预算断言失败已交学习者核查，原失败、回退及派发占用历史保留，本次评估成功不覆盖代码完整测试失败。

### 学习曲线A8原行

直接附上一轮规定的`paper_dataset.py --no-raw`生成表（提交c1a75e2d，切点2026-10-05T19:08:35.717Z，五项一致性通过、决策计数差异为空、key scan CLEAN）。本轮无需重复整库刷新或手改曲线；当前账本检查：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 146 item(s), 0 problem(s)。

```csv
character,ascension,runs,wins,first_try_wins,sl_wins,mean_floor,mean_first_try_floor,first_run,last_run,started,ended,items_found,items_found_prior_yes,items_shipped,items_shipped_ids,repeats,repeats_after_ship
silent,8,1,1,1,0,48,48,LLYSRQQ35AVW,LLYSRQQ35AVW,2026-10-05T18:00:49+00:00,2026-10-05T18:42:21+00:00,2,0,5,silent-0016 silent-0054 silent-0080 silent-0130 silent-0134,0,0
```

items_found=2按最早证据进阶归属；items_shipped=5（0016/0054/0080/0130/0134）按生成器的登记后下一场已结束局起始归属；repeats及repeats_after_ship均0。它们与窗口新增6项、实际合入3版本、18条窗口登记或全静默118项查询状态口径不同；首胜后发现已明确时点，不改历史窗口记录。

### 首胜复盘后经验上线补记（2026-10-06 03:45）

03:35 experience-done已确认第30批LLYSRQQ35AVW经验.5源0dba4029实际合入live 3a2a2a48并发布25a520d9/唯一S1.exp30，携带此前待合的第29批.4源8f7d061a；main已同步735ac441。帐篷观察silent-0145/0146现已随该经验文字登记shipped，原first_run=LLYSRQQ35AVW、A8、prior=unknown及证据不变；0144升级萎靡模型缺口仍observed未修，0051旧模型已修状态保持。两批26/17项重叠10项，合计33个id本次登记上线，不能当作33个A8新增。

这次发布和本次登记均在A8首胜及A9开局之后，保持以上03:13爬阶窗口查询快照和学习曲线原行，不倒算为首胜前已学。源与合后沙箱均tsc0/184文件2054例，完整外部检查尚待调度器回报；原exp28/strategy4预算失败记录保持。完整来源与登记见[20261006-0335-experience30-release.md](../paper/materials/silent/20261006-0335-experience30-release.md)。

- 2026-10-06 04:05 首胜复盘后的机制覆盖补记：04:00 fix-done确认学习者升级萎靡模型源d48d1612已随S1.fix24实际合入9af37f37、发布473a62f4，main同步05445876；0144现按实际合入登记shipped/S1.fix24，first_run仍KAY522KT5NXR/A0、prior=no。0145/0146帐篷S1.exp30和0051原版S1.fix5保持。此模型修复在A8首胜及A9开局之后，原03:13观察快照、首胜因果限制和原CSV行保持；最终源/合后188文件2068例沙箱通过，完整外部本批检查等后续事件，详情[20261006-0400-fix24-release.md](../paper/materials/silent/20261006-0400-fix24-release.md)。
