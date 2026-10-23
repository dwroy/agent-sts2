[ops] 已接首局10题停点，补齐首批 **7个自然完整局、156道脑题** 的读回；另将在途第8局6题分列。R417已发布，不重发代码、不重跑full、不追加模型或验收局。

本轮原始字节快照于10-23 09:22:28冻结，覆盖06:16:30—09:22:15；保留上次06:24的10题和#26后续119题原件，119条原行SHA全部核同。本次是更晚窗口，不将两个时点分母混用。

|观测|7个已结束局|含在途6题的全窗口|
|---|---:|---:|
|匹配brain/codex终结记录、accepted|156/156|162/162|
|有工具调用的题|29（18.59%）|30（18.52%）|
|实际工具调用总数|47|48|
|每题平均调用|0.301|0.296|
|题目耗时均值|13.204s|13.260s|
|题目耗时P95|26.280s|25.974s|
|工具执行耗时均值（含零调用题）|2.186ms|2.111ms|
|最终阶段兜底 / 前缀超预算漏书|0 / 0|0 / 0|

七局终局索引的原脑题计数逐局与156行相等；索引字段沿用历史名称`deepseek_calls`，本轮实际引擎由brain/codex记录核为Codex，不能按旧字段名称作dsh。已结束局与在途局分别计数；不把未落盘的在途请求当成功，不将游戏胜负或战斗侧兜底混入本项完成率。

工具与来源：162/162题都提供完整14项知识工具，全部48次实际返回UTF-8字节数重新计算相符、来源审计齐备；`kb_open_book=29`、`kb_experience=13`、`kb_monster=3`、`kb_potion=1`、`kb_old_knowledge=2`。来源为自有库/外部Spire Codex机械资料，工具执行合计342ms。单题最多4次，最大题耗时38.2s；没有工具错误。耗尽cap8、总时限或最终兜底均未自然触发，仍仅有原固定测试，不冒自然验收已覆盖。42题有thinking但无原生工具调用、伪工具JSON文本0题，分开计数；按需不查本身不等于故障。工具执行耗时与全题耗时分别报告，没有A/B，不能声称因果增加耗时或收益。

原生强度：162次调用均记录session/gpt-6.1-sol/high/answered；内嵌native_receipt仅8条，其余154条null原样保留。上次独立归档10份turn_context保留；本轮又保全当前线程的6份，实际均gpt-6.1-sol/high/read-only，当前原生gkb名单14项。7个已结束线程原文件已正常退场，未伪造恢复或把请求配置推成162条原生证明。dsh/Nova/max仍仅沿原发布离线14项证据，本轮无自然dsh题，不强制切换制造验收。

16条run-config仍为原`git status failed: spawnSync git ENOBUFS`，提交/dirty字段null保留；列为非阻塞溯源缺口交原修复队列。另独立核实际live `70eb1287042d80bf6f253b4dce66ac888a5f4868`、统一V6-R417及58叶逐字等于行为`c60de438`、真实绑定verify通过，未反填历史config。所有按局配置仍cap8、Codex300s/最终120s、dsh900s/最终300s。

#26统计工具实际调用仍0，不与机械开卷命中混算；工具已挂载及最小可选拿牌提示/候选ID的补交归#26，主管已排在#46之后。本轮不强制调用/代查/排序/抬预算，不提前发布补交。Codex首批自然读回资料已补齐，交主管按原标准验收；dsh自然未观察、未触发分支、#26自然统计采用及科学父各保留边界，不以本报告关闭。

原件：`paper/materials/20261023-issue33-natural-followup-ops/` 下 `receipt.json`、`natural-report.json`、`completed-runs-report.json`、`continuation-audit.json`、`natural-tool-audit.json`、`native-receipt-audit.json`、`actual-source-verification.json`、`byte-refs.json`、`acceptance-matrix.json`。脑题/调用/配置的本轮完整原字节另存gzip并记录SHA，原日志、前置失败和最初full6205/2均保留。
