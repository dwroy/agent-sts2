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
