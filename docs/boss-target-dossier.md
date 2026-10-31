# 构筑题的 Boss 目标档案（#87）

授权：[方案批准及四点补充](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6542249263)。实现是 V5 的事实供给、答案和观察合同：仍由大脑做构筑选择，不增加出牌、战斗规划、打分或排序规则。实际源码采用/发布号、10局行为核收与30局效果分开登记。

## 题面和答案

Silent A10 非战斗构筑题（选/跳牌、商店、休息、删牌/升级选择、事件、bundle/capstone、构筑/路线计划）有 `facts.boss_dossier` 和 `facts.boss_target_context`。战斗内选择及其他角色/进阶不接入。

档案含二/三幕观察到的 Boss、三幕已观察有序路径、已揭晓身份和两战预算状态。来源可用时每个 Boss 至少保留实测初相HP/部位及一条已记录招式；余量按固定展示层级补自有聚合、外部受伤尾部、成长/减益及已发布策略目录。`boss_dossier` 含字段名和 JSON 转义的完整 UTF-8 封装≤1500B；整字段省略，不截半个数值或句子，完整信息仍可由原知识工具查询。预算仅控制展示。

M 为 A10 记录中的基础攻击、首相HP和首见能力，数值带 n；首见不证明天生能力/完整开场规则，首相HP不是多阶段总HP。只显示本进阶已观察值，不把缺记录的其他进阶估值当事实。O 是同角色聚合，含重试且不能当首试胜率。E 是 external:sts2fun 同版上传观察；gross_damage 不是净失血、安全线或因果效应。来源全SHA/路径、源版本和各独立分母记在 `brain.jsonl.boss_dossier`，题面显示短引用。缺失/坏源对应 unknown。

K 只显示本局已绑定 K1 的 Boss 策略目录数；完整ID在审计的 `strategy_references`，可按Boss ID查原工具。档案不另展开策略正文：`strategy_bodies=0`，不复制 B−/战斗单窗建议，不绕过原触发、普通策略位置或3次曝光门。能力需求无可直接投影的已发布结构时保持unknown，大脑可依据机制给本局假设，写入答案，而非由代码生成知识。

答案新增必填对象：

```json
{"boss_target":{"boss_ids":["TEST_SUBJECT"],"gap":"本局暂定缺口及未知","reason":"本步对缺口的作用与取舍"}}
```

`boss_ids` 只取本题规范ID，最多3个、去重；`gap`/`reason` 非空，分别≤80/120 Unicode字符。本步只保血/过渡可以给空ID并解释。格式与ID校验失败走原重问/失败处理，代码不代填目标或改选择。字段在普通/stable/Codex strict schema、DeepSeek生产入口及原答案/动作日志保持。

首次建立或目标揭晓变化时，`run_plan.endgame` 必须显式复核 `win_condition/gaps/resources`，可原文沿用；其余字段增量更新，实际改线仍需 `change_reason`，不重算未变路线。服务端观察到的身份保存为 `RunPlan.bossContext`，经原计划日志恢复；跨局/未来楼层元数据不沿用。旧日志不补填新字段。

F49不会因进入第三幕被提前确认；过期的 `run.boss_id` 不能冒下一场。未知后场保留候选与unknown，有已核现场身份才收敛。血药预算以题内实际资源为起点，F48实际余量承接F49；未有可信分战投影时不补消耗数值，也不把两Boss的外部p90相加。

构筑题移除 `BOSS_MARGIN_NOTE` 和 `act_boss_sim.boss_margin_objective`，其余模拟事实保留。S计算、现有数值/校准/信任门与战斗规划入口保持。

## #83 数据接口

不读研究草稿文件。来源owner将核过的结构作为 `boss_profile` 附在**现有** `characters/silent/strategy-entries.json` 对应条目，经原候选、审核来源及正常K1发布后，档案才从绑定版本读取。没有新库、schema迁移、写权限、自动批准或备用Git策略入口。格式见 `agent/src/knowledge/boss-profile.ts`：

```json
{
  "schema":"boss-profile-v1", "boss":"KAISER_CRAB", "character":"silent", "ascension":10,
  "game_version":"unknown", "cutoff":"2026-10-31T00:00:00+08:00",
  "own":{"first":null,"won":null,"died":null,"predicted_stop":null,"unknown":null,"retries":null},
  "external":[], "evidence_refs":["原来源窗口/清单及SHA引用"], "limitations":["独立分母、窗口和适用限制"]
}
```

`boss` 可用规范ID，或现有实测部位对应的完整遭遇ID（例如CRUSHER+ROCKET）。不能按名字猜映射。每个外部单元另给 `source: external:名称`、`game_version`、`unit: uploaded_attempts`、相同counts对象及 `dataset_sha256`。不合并外部/自有、不同版或不同来源分母。`first` 是该来源首试总数；实际胜、实际死、预测截止、未知四栏全部已知时和须等于first，部分未知时已知之和也不得超总数；retries独立。null保留未知，不能补0。必须保来源和限制。B−条目的附加profile不出正文；同Boss多个有效profile不自动选一条或求和，保审计并回到原聚合。

`OK[...]`/`EK[...]` 表示这些计数来自K1 profile，区别于原O/E文件聚合；完整原对象与源文档SHA在审计。这里只是已发布事实接口，不自动吸收机制推断、打法或能力需求。部署前后源owner/ops仍核真实K1成员及原工具读回，固定隔离发布测试不代生产发布或自然采用。

## 数据绑定、兼容与回退

每个运行身份/绑定版本只加载一次事实并缓存小投影；不逐题扫日志/联网/模拟。M/O经现有 `readCompatibleKnowledgeText` 消费门读取，保原D1路由，便于#86沿同入口切换；不自建新的统计库或写者。K1用只读reader的精确release成员，无current/Git策略兜底。外部两份原数据按已有审阅SHA核字节后才使用。缺源不要求等待#83完整校准。

本次新增消费者和类型依赖进入 `ops/fixed-producer-dependencies.json` 的实际闭包。v6-history及Silent校准的方法身份变化；其它11个方法保持。工程声明不是生产方法准入票，实际组合仍交原owner按真实终态、双根与CAS办理，不能沿旧票据放行。

回退由原发布链回退本单匹配源码/schema/声明；保留新日志和K1历史，不回写旧记录、重做校准或覆盖生产知识。源码准备在局中做完，实际切换由ops在自然局间执行。

## 固定回放与自然核收

`agent/tools/boss-target-replay.ts` 使用真实 `withRunPlanTask`、事实/答案构造器、`userMessage`、`codexKindSchema/codexSchema`，输出每题完整before/after系统、用户消息、schema和工具目录，以及各字节/SHA。输入必须冻结原题、源窗口及原短system SHA/字符数；输入的原始上下文重建范围和未重放原生传输的限制显式记录。零模型/游戏调用。例：

```bash
node --import tsx tools/boss-target-replay.ts --input frozen.json --knowledge /bound/knowledge --out new-output-directory
```

自然发出前，Codex和dsh在原知识曝光预留之后记录实际阶段的system/user/schema字节；工具目录另列，避免重复相加。`brain.jsonl.boss_dossier.prompts` 区分query/answer/reask及重试，不保存额外题面副本。`cache_setup_ms`是该缓存初次构造成本，不能当每题重复成本；`projection_ms`是本次投影成本。自然模型阶段时延与固定投影耗时分开。

原ops冻结新发布首10自然Silent A10局和R461–R463对照的实际局号/原件/发布身份；旧run-config源码捕获失败时不能由`code=current`猜版本。使用只读入口：

```bash
node --import tsx tools/boss-target-report.ts --brain after.jsonl --run RUN_A --run RUN_B \
  --baseline before.jsonl --baseline-run BASE_A --run-config frozen-run-config.jsonl
```

请求/回复/接受、具体Boss/已揭晓/候选、空ID有解释、缺失/非法/失败回复记录与重问分别统计。Boss查询按本题ID及原件别名匹配实际native调用，失败分列；静态档案展示和泛称查询不冒主动Boss查询或采用。按引擎/模型/effort（优先原生回执）/请求服务档/题型/查询/重问分层；缺历史原生字节记unknown。分层p50/p95延迟**涨幅严格>10%或绝对>2000ms，任一触发告警**，不调整阈值。前后自然窗仅观察对比。

`boss_query_scope`另报已映射/未知题数及complete/partial/unknown。旧题没有`boss_target_context`或审计别名时，Boss查询匹配覆盖不足，匹配计数0不能当作没有查Boss；对照的原始调用须另按冻结来源核读。新发布10局的必带context及别名提供该口径，不能回写旧日志补出原曝光。

effort来源按实际字段标注，回执缺effort时的引擎/请求回退不冒原生证明；来源也进入分层键，同值但不同来源不混为一组。缺匹配对照组时告警结果为unknown，不能改阈值或补档位制造对照。

每30个结束局另沿完整战斗/SL原件核首试；可给上述CLI追加 `--runs frozen-runs.jsonl --attempts frozen-attempts.jsonl`。只认 `attempt=1, fight_kind=boss` 的原结果；更早首试预测/实际死亡之后的路径不当原首试，重试胜利不补首试。F33/F48/F49分别给通过数/窗口局数、到场且首试结果已知分母、实际死/预测截止/unknown/未到场；F49另给F48首试已过且实际到场者的条件比例。缺覆盖/冲突/未结束保留未知，不能从终局楼层反推首试胜利。零样本或未满窗口不构成验收，科学父项不随工程交付关闭。
