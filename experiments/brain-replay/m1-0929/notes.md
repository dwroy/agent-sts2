# M1 验收回放：全量知识 + JSON（2026-09-29）

汇总表 summary.md 由 tools/brain-replay.ts 生成，逐题对照 compare.md 由 compare.py 生成；原始行（results.jsonl、
brain-*.jsonl、deepseek-reasoning-*.jsonl）不提交。

## 设置

- 题目：jev-sts2-dsh 数据集里 30 道 A9 的真实问题（questions.txt），每类都有：reward/card 4、rest/plan 4、selection/* 4
  （upgrade、remove、add、enchant）、event/choose+plan 4、event/act-plan 4、map/route-plan 3、shop/plan 4、run-plan 3。
  只取 A9 的题：前缀按进阶渲染，一组内只用一份前缀，缓存才可比。同类连续，三组顺序相同；第一对 q013、q039（最大的题面）
  先单独跑，确认总输入没有超上限。30 题的用户消息都能由 src/brain/message.ts 逐字节重建。
- A：DeepSeek deepseek-flash，KNOWLEDGE_PREFIX=off，即 v3 问法（今天的攻略 + 手册拼在系统提示里，memory 带经验切片）。
- B：DeepSeek deepseek-flash，KNOWLEDGE_PREFIX=full：系统提示 = v3 规则 + 「和数据冲突时以数据为准」说明 + A9 全量前缀，
  不再单独拼攻略和手册，memory 的 knowledge 段去掉经验条目、保留选项结果统计行，其余 memory 段不动。
- C：Claude claude-opus-5-5（`--model opus` 解析成完整 id；CLI 回报的 modelUsage 也是 claude-opus-5-5），订阅登录态，
  同一份 full 系统提示，不带工具（BRAIN_CLAUDE_TOOLS=off），同类问题共用 --json-schema，固定空工作目录，未传 --effort（CLI 默认）。
- DeepSeek 的思考强度和线上一样（DEEPSEEK_REASONING_EFFORT=max，reward/card、rest、selection 等按默认档位 high）；
  路由器不补问（v3 自己的一致性补问保留，算作「补问」）。A、B 同时跑（同一时段的 DeepSeek 负载）。
- 前缀：本工作树 src/knowledge（提交 c63a296），复盘文件 notes/lessons.md 的快照（sha256 前 12 位 562c85f7559e），
  前缀 sha b468835446bb、170,145 字，B/C 系统提示 172,025 字。

## 上限预检

- B：q013 输入 126,252 token，q039 131,241 token；整组最大 131,260。deepseek-flash 没有报超长，不需要改成只放本幕怪物/遭遇。
- C：q013 177,541 token，q039 185,553 token（Claude 的分词对中文更碎，同一份提示多约 40%；Opus 5.5 上下文 1M）。

## 汇总

| 组 | 首答合法 | 补问后合法 | 错误 | p50 s | p95 s | 平均输入 token | 缓存命中 | 缓存写入 | 输出 token | 其中推理 | 成本 $ | $/题 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A DeepSeek v3 问法 | 30/30 | 30/30 | 0 | 24.6 | 147.8 | 23,543 | 402,432（57%） | - | 226,485 | 224,087 | 0.365 | 0.012 |
| B DeepSeek 全量知识 | 30/30 | 30/30 | 0 | 12.6 | 100.5 | 126,982 | 3,375,104（89%；预热后 95%） | - | 157,548 | 155,087 | 0.340 | 0.011 |
| C Opus 5.5 全量知识 | 30/30 | 30/30 | 0 | 9.5 | 14.8 | 178,789 | 4,500,901（84%） | 862,713 | 18,387 | 9,214 | 8.170 | 0.272 |

- 成本口径：DeepSeek 按 deepseek-flash 价格（命中 $0.006/M、未命中 $0.3/M、输出 $1.2/M）；Claude 是 CLI 报的
  total_cost_usd，订阅下的 API 等价价格，不实扣。
- B 的输入是 A 的 5.4 倍，但成本反而略低：前缀预热后 95% 命中（$0.006/M），而输出（主要是推理）少了 30%。
  A 的成本 74% 是输出；B 是 56%。B 第一题冷启动 126k 未命中（$0.04），第二题紧接着问也只命中 256 token
  （DeepSeek 的前缀缓存要几秒才建好），之后稳定命中约 120k。
- 各类题的中位耗时（秒，A/B/C）：reward/card 4.2/6.0/10.2，selection 3.9/3.4/9.5，rest/plan 14.8/10.7/9.2，
  run-plan 13.6/9.4/12.3，event/choose+plan 35.2/20.1/7.7，event/act-plan 57.1/51.7/10.7，map/route-plan 57.3/31.2/9.4，
  shop/plan 72.8/49.1/8.7。B 在长题上比 A 快，是因为推理 token 少（中位输出 act-plan 11.1k→9.9k、route 11.3k→6.3k、
  shop 14.3k→9.6k），不是前缀本身变快。C 每题 6–17 秒，推理 token 很少（中位约 300）：CLI 默认思考强度下 Opus 想得很短。
- C 的成本结构：3 次冷写（每种 schema 的第一题 q013、q050、q090，各约 17–18.5 万 token，按 1 小时缓存的 2 倍价写入，
  各约 $1.4，共 $4.32，占 53%）；其余 27 题每题读缓存约 16.7 万、再写约 1.2 万（题面），平均 $0.14/题。

## 一致率

| 对照 | 一致 |
|---|---|
| A ~ B | 24/30（80%） |
| A ~ C | 23/30（77%） |
| B ~ C | 21/30（70%） |
| A ~ 日志原选择 | 24/30（80%） |
| B ~ 日志原选择 | 26/30（87%） |
| C ~ 日志原选择 | 22/30（73%） |

口径：pick 比较 choice 和 route（和 choice 相同的 route 不算），商店比较 leave 之前买的东西（不计顺序），run plan 比较
elites|rest；和日志比时 pick 只比 choice。参照：dsh 实验里同一个 DeepSeek 换三种答题方式，pick 两两一致 77–84%；
同一问法重抽一遍，16 道难题里 11 道答案相同。所以 A~B 的 80% 和 DeepSeek 自身的抽样波动是同一个量级，30 题分不出
「全量知识改变了答案」和「重抽一次就会变」。

## 答案差异（逐题见 compare.md，这里只描述，不打分）

B 和 A 不一致 6 题：q021、q077、q035、q065、q069、q053。C 和 A 不一致 7 题：q021、q044、q072、q073、q035、q037、q053。
三组都选同一个、但和日志不同的有 q040（三组都走 p2，日志 p1）和 q037（三组都没选日志里的低语耳环）。

- **q021 reward/card（AD5P F15）**：A 跳过（「伤害缺口 0，愤怒会复制稀释牌组，缺的是格挡」）；B、C 和日志一样拿愤怒，
  B 引用切片里的结果统计（拿了 n=11 过本幕 boss 91%，给了没拿 65%）。这局 F22 死时手牌是 3 张打击 + 与我一战！+ 愤怒、
  0 格挡（复盘），A 的理由指向的正是缺格挡；但 A、B 看到的是同一份统计，差别在怎么权衡，不在知识多少。
- **q077 selection/add（7KDM F11，2 选 1 轮的第一张）**：A、C、日志选突破（群伤，A 引用经验「一幕群伤 ≥2 的局 81% 对 47%」）；
  B 选飞剑回旋镖，理由是结果统计「拿了过一幕 boss 80% 对 62%」而突破的统计持平。两个依据都在 A 的切片里，B 更看重了卡牌统计。
- **q035 event/plan（KTRT F20，凡庸诅咒换删 2 张 vs 未知附魔）**：B 和日志一样删 2 张打击拿诅咒（「烘焙手套能把诅咒变成力量」）；
  A、C 选附魔（「凡庸的 3 张上限毁掉多次出牌」）。B 的推理里引用了前缀怪物块里知识恶魔的诅咒分布（WASTE_AWAY n=8、SLOTH、
  MIND_ROT，A8 非 A9），这是 A 的题面里没有的；这是 30 题里少数几处明确用到前缀独有数据的地方。
- **q065、q069 map/route-plan（TYZH、KTRT 一幕开局）**：日志两题都选 p1（q065 是 3 只精英）。q065：A、C 选 p2（2 精英 + 商店），
  B 选 p3（2 精英、4 个休息点）；三组都避开了 3 精英，A、B 的推理都引用经验「一幕最多主动打 1 只精英」（C 只给理由、不回推理，
  理由里没提经验）。q069：B 和日志选 p1（2 只精英，中间有休息点，B 认为不算「三层内连打两只」），A、C 选 p3（1 只精英，
  A 的推理引用同一条经验）。B 在这两题的推理里引用了前缀里较新的经验数字（≥78% 进场 36/36 活下来；q069 的题面切片里是
  旧版本的 27/27）：前缀带来的是更新后的数，看不出结论因此不同。
- **q053 shop/plan（7MDJ F8，HP 30%）**：日志买鲜血药水、御血术，换格挡药水；C 买鲜血药水 + 御血术（和日志最接近）；
  A 买粉末药 + 删打击；B 删打击 + 御血术，不买药（「下一个节点是休息点」）。经验 shop-potions-first「HP<50% 时第一瓶药排在删牌之前」
  在切片里，A、C 照做，B 以休息点在前为由没照做。这局最后死在巨兽自爆，复盘写的是 F8 买的两瓶药在 F12 走廊喝掉了。
- **C 独有的偏离**：q072 升级狱火而不是痛击（日志、A、B 和攻略的优先级都是痛击）；q073 删防御而不是打击（C 的理由是遗物
  打击木偶让打击变强；A、B、日志和经验都是先删打击；这局 8V0H 死在二幕走廊 8/80 进场）；q044 锻造打击而不是地狱之刃
  （理由是微型加农炮加成升级过的攻击）。C 的理由常引用题面里的遗物效果，结论偏离攻略/经验的默认顺序。
- **q037 event/act-plan（2XWM F34）**：日志选了低语耳环，这局 F45 正是死于耳环让瓦库接管第一回合；三组都没选耳环，都引用了
  由这局写出来的经验。这说明回放有**事后信息**：经验库和复盘都晚于这些题（A 的切片是回放重建时渲染的，同样含事后经验），
  和日志的一致率不能当作「谁更对」。

总结：

1. 全量知识下，B、C 的理由和推理确实引用经验和数据（结果统计、精英经验、怪物招式分布），但这 30 题里大部分被引用的经验
   已经在 v3 的逐题切片里（切片选得准），前缀独有的内容只在少数题（q035 的怪物数据、q065/q069 的新版数字）里出现，
   没有看到哪一题的结论明显是因为前缀多给的知识而改变。
2. A 和 B 的差异量级和 DeepSeek 自身重抽的波动相当；要判断全量知识的效果，需要同组重复抽样或对局指标，30 题做不到。
3. C（Opus，CLI 默认思考强度）和两组 DeepSeek 的一致率更低，偏离多出现在「按题面遗物改顺序」的地方（q044、q072、q073）。

## 调用次数和成本

- Claude：30 次真机调用（预检 2 + 正式 28），0 补问、0 失败，总 $8.17（API 等价）；上限 40 次，没有用到补问预算。
- DeepSeek：A 30 次 $0.365，B 30 次 $0.340，共 60 次 $0.705；没有失败、没有 v3 一致性补问。

## 接入方式和去重（提交 c63a296）

- `KNOWLEDGE_PREFIX=off|full`（默认 off：请求和 v3 逐字节相同，测试 tests/brain-knowledge.test.ts、brain-deepseek.test.ts）。
  full 时 src/brain/knowledge.ts 的 KnowledgePrompt 按本局进阶（取自 loop 每个状态设的 ToolContext）渲染一次前缀，
  知识文件或复盘文件的 mtime/大小变了、或进阶变了才重渲染；deepseek 和 claude 两个引擎用同一份 system。
  知识加载失败：这一题照 v3 的提示和 memory 发，loop 记一条 note（同一原因只记一次），brain.jsonl 的 knowledge 字段写原因。
- 已去掉的重复：系统提示里单独拼的攻略和手册（前缀旧知识块里整份都有）；memory.knowledge 里的经验条目（前缀有本进阶全部经验）。
- 保留：memory.knowledge 里的选项结果统计行（卡牌/遗物/事件选项/休息点，前缀里只有休息点那部分，见下）；act、history、
  this_floor、route、lookahead 等其他段。
- 列出但未删（待 Dai 定）：
  1. memory.act（monster-db.ts actThreats/bossDossier）：本幕精英和危险小怪的血量、胜率、招式循环、boss 档案，
     和前缀的怪物块、遭遇战绩、精英/boss 战绩表是同一份怪物数据库的另一种写法（本幕子集）。q039 这一段 2,398 字。
  2. memory.lookahead 的 boss 要点（BOSS_NOTES）：和前缀经验库的 boss 条目、攻略里的 boss 段落内容重叠（手写摘要）。
  3. memory.knowledge 里 rest 题的「休息点 选项 在 HP 段」行：和前缀统计表的休息点表同源（outcome-stats.json rest）。
  4. 系统提示规则里描述 memory.knowledge 的那句（「lessons … and outcome statistics」）在 full 下已不准确；没改 SYSTEM 原文，
     在全量说明里补了一句「memory.knowledge 只带选项结果统计行」。
- `{GIANT_BLOCK_RECORD}`：前缀旧知识块里攻略、手册原样带着这个占位符（knowledge/render/old-knowledge.ts 没填），
  KnowledgePrompt 按 v3 的做法（fillGuideFacts）填上；gkb-dump 和 kb_* 工具输出里仍是占位符，应由 v4-gkb 在渲染器里填。
