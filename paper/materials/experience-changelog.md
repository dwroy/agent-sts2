# 经验库变更记录（src/knowledge/experience.json）

经验库把 `notes/lessons.md` 的复盘沉淀成 DeepSeek 做决策时能用的知识。每次重建或修订都在这里追加一节。

## 2026-09-28 首次构建（version 2026-09-28.1，分支 step1-bugfix）

### 来源和方法
- 来源是 `notes/lessons.md` 截至 2026-09-28 的全部内容：约 1860 行、约 200 个对局小节，从 A0 一直到 A8（A8 有 120 局）。
- 先把全文分成 9 段，逐段完整阅读，抽出候选经验，共 1181 条，每条带 scope、证据局、立场（支持/反对）和「是否已由代码处理」。
- 然后人工合并成 209 条：194 条 active，15 条 retired。
- 合并的原则：
  - 同一件事只留一条，以多局重复出现的为准。
  - 单局的事实，比如「某局 xx 血进场、打了多少回合」，并入对应的汇总条目，作为它的证据。
  - 丢掉纯代码 bug，比如求解器、HP 护栏、解析、超时。
  - 丢掉战斗里的出牌细节，比如第几回合先打哪张牌。
  - 但如果一条 bug 记录里带着真实的游戏数据，比如「时钟对 Vantom 高估约 35%」，就把这个数据保留下来写进经验。
- 另外有 21 条抽出来后又删掉了，原因是太偏战斗执行或价值太低。它们是：
  - 卡牌：壁垒、至亮之焰、剑柄打击、主宰、战斗专注、炸弹
  - 遗物：熔岩石、佩尔之角、战锤、低语耳环
  - 事件：垃圾堆、深渊浴场、茂密的植被
  - 敌人：幽灵船
  - 药水：流动铜液、敏捷、再生、技能
  - 药水使用方式：「0 能量不喝抽牌药」
  - 打法细节：神官光束时序、雕像头两回合

### 字段怎么算
- **evidence**：合并进来的所有候选的证据局，4 位简写都展开成了 12 位 run id。**n_support** 是这些局的个数。
- **contradicting / n_contradict**：结论和这条经验相反的局。
- **confidence**（置信度）：
  - high：n ≥ 5 且反例 ≤ n/3；或者 n ≥ 4、原文就写成规则、而且没有反例
  - med：n ≥ 2
  - low：其余
  - 两条手动指定：佩尔之眼 med（这是代码层面的事实），羊毛剪 low。
- **asc**：从证据局里最低的进阶到 20。
- **last_seen**：证据局和反例局中最新的日期，日期取自 notes 里 `run-MMDD-...` 的文件名。
- **name**：卡牌、遗物、药水、事件类 scope 附上中文名。奖励里的药水、宝箱里的遗物，界面上只显示名字，要靠它匹配。

### 条数
| scope 类型 | active |
| --- | --- |
| boss | 37（12 个 boss 各 2–4 条） |
| elite | 12 |
| hallway | 18 |
| act | 5 |
| general | 47（deck 9、route 9、shop 6、event 5、plan 4、neow 4、rest 4、potion 3、elite 3） |
| card | 25 |
| relic | 21 |
| potion | 20 |
| event | 9 |

置信度分布：high 124，med 60，low 10。

### 退役的 15 条
退役的条目留在文件里供查历史，但不会下发给 DeepSeek。

- old-insatiable-sandpit2（沙坑 ≤2 再逃）：被后来的对局推翻。沙坑数就是剩余回合数，每张逃离都要打。
- old-kin-followers-first（同族先杀信徒）：被推翻。神官一死战斗就结束；先杀信徒的 5 局都输了。
- old-lag-wake-stunned（族母醒来那回合眩晕）：被推翻。自然醒的那回合它就攻击。
- old-ts-block-phase2（实验体二阶段尽量全挡）：被推翻。
- old-ts-phase3-multihit（三阶段靠多段小伤害）：被推翻。实际是隔一回合无实体一次。
- old-fight-me-trap（与我一战！是陷阱）：被推翻。它其实是力量引擎。
- old-howl-refire（彼岸咆哮每回合回火）：被推翻。每进一次消耗堆只回火一次。
- old-beckon-any-exhaust（任何消耗牌都能清呼唤）：被推翻。
- old-fysh-thin-deck（为异鱼把牌组删薄）：被推翻。
- old-kd-curse-choice（知识恶魔的诅咒顺序）：代码已经接管这个选择。
- old-hallway-costs（二幕走廊 0.14–0.18 最大生命、一幕精英 35%）：被 A8 实测推翻。
- old-early-elite-70（一幕早期精英 >70% 血即可打）：只在 A0 成立。
- old-a8-hp-table（A8 各 boss 血量表）：被 monster DB 的 boss_db 和 map_threats 取代。
- old-hunter-tender（猎人杀手的 TENDER 没建模）：已在 892278c 修好。
- old-shears-always（羊毛剪删两张打击总是好）：在 A2+ 被推翻。

### 和手写知识冲突、待改
按 A8 冻结规则，这次没有改这些文本，只列出来：

- `run-journal.ts` 的 BOSS_NOTES：
  - THE_INSATIABLE 还写着「沙坑 ≤2 时先打狂乱逃离」，和 insatiable-escape 冲突。
  - THE_KIN 还写着「长战先杀信徒」，和 kin-priest-focus 冲突。
- `ironclad-guide.md`：
  - 陷阱表把「与我一战！」列为 F。
  - 实验体三阶段写的是「靠多段小伤害」。
  - 同族一节写的是「先杀信徒」。
- `ds-handbook.md`：「蜂群术士的攻击药 T1 就喝」没有写「留给 boss 的除外」这个例外。

经验库的 slice 已经给出了新结论，但 system prompt 里的旧文本还在。建议 A8 实验结束后统一修正。

### 结果统计层（src/knowledge/outcome-stats.json）
由 `tools/build-outcome-stats.py` 生成，刷新命令是 `npm run knowledge:stats`，只用 A8 的 120 局已结束对局，约 8 秒跑完。

| 类别 | 条目 | 行数 | 其中 n≥5 |
| --- | --- | --- | --- |
| 卡牌（按拿到的幕） | 126 张 | 390 | 206 |
| 遗物 | 156 件 | 228 | 40 |
| 事件选项 | 58 个事件 | 211 | 96 |
| 休息（按 HP 档） | — | 8 | 6 |

- 卡牌行分两组：拿了的局，和给了没拿的局。
- 所有事件选择和休息选择都和状态对上了，没有未匹配的。
- 基线：均终层 26.5；一幕 boss 通过率 68%（n=120），二幕 17%（n=82），三幕 0%（n=14）。

### 下发方式
- 每个 DeepSeek 问题的 `memory.knowledge` 只放相关的一小片，规则如下：
  - 当前提供的卡牌、遗物、药水、事件对应的条目，加上本幕 boss 的条目，一律保留，上限 40 条。
  - 然后补本幕精英和危险走廊的条目。路线、休息、run plan 类问题里它们的优先级更高。
  - 再补这个界面的 general 话题和本幕的 act 条目。
  - 总数约 25 条，同一优先级内按置信度、n 排序。
- 另外附上当前选项的结果统计行，最多 12 行，外加一行基线。
- 实测大小（每种界面各 40 个 A8 状态，取中位数）：

| 界面 | 大小 |
| --- | --- |
| 奖励 | 约 3.0k 字 |
| 商店 | 约 3.7k 字 |
| 火堆 | 约 2.1k 字 |
| 事件 | 约 3.1k 字 |
| 地图 | 约 3.3k 字 |
| 选牌 | 约 3.6k 字 |

所有界面的最大值都不超过 4.4k 字。

### 以后怎么更新
1. 每局复盘写进 lessons.md 之后，把新结论并进已有条目：追加 evidence，更新 n_support 和 last_seen。结论和已有条目相反时，给那一条加 contradicting；反例多过支持时把它退役。
2. 代码或机制修好之后，把相关条目标成 retired，并写明 retired_reason。
3. 跑 `npm run knowledge:stats` 刷新统计，再在本文件追加一节。

## 2026-09-28 第一次增量：5 局 A8 窗口局（version 2026-09-28.2，分支 step1-bugfix，eead3e3）

### 来源
- `notes/lessons.md` 的 5 节复盘：4LC3YKCZV218（F31 感染棱柱）、LMTA6JC86RCC（F17 同族）、63CP940HCKAL（F25 残杀千足虫）、JUXB9P5BGATV（F33 无厌沙虫，差 15）、69HWH6MD1S34（F33 无厌沙虫，33/80 进场）。5 局全输。
- 日志核对（`jev-sts2/logs`，只读）：从 states.jsonl 取 A8 129 局每层的牌组/血量/金币，decisions.jsonl 取商店进出；`monster-db.json` 取 A8 遭遇战数字；`outcome-stats.json` 取遗物行。
- 结果：新增 3 条，更新 20 条，退役 2 条；active 193 → 194，总数 209 → 212。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 沙虫死于 0/少量 AOE、永久力量 | A8 沙虫 20 局（8 胜 12 负）：赛前永久力量张数 1.5 vs 1.5，0 张 1 胜 2 负；AOE 2.6 vs 2.7；打击 2.8 vs 3.0 | 张数不区分胜负。区分的是进场血量：赢局平均 88%、输局 71%；≥75% 进场 7/10 胜，<75% 1/10 胜 |
| 二幕 boss 整体（53 局：蟹 20、沙虫 20、知识恶魔 13） | 进场 ≥75% 过 44%（n=32），<75% 5%（1/21），<50% 0/7；升级 ≥3 张 36% vs 12%；进场 ≥75% 且 ≥3 升级 52%（n=23），≥75% 且 <3 升级 22%（n=9） | 血量和升级都要，两者不冲突 |
| 4 打击 4 防御、只删 1 次 | 二幕 boss 前基础牌 ≥8 张过 20%（n=20），≤6 张 37%（n=19）；一幕 5 打击 64% vs 4 打击 82% | 支持 deck-remove |
| 为省钱跳过商店、带钱死 | A8 283 次商店里 17 次带 ≥100 金空手离开；二幕的 10 次中 7 局死在二幕，死时 117–277 金 | 支持并收紧 shop-spend-gold |
| DeepSeek 不执行自己的格挡目标 | 69HW run plan 从 F16 到 F31 都写「补格挡」，实际没补，33 血进 boss | 写进 deck-block-floor |
| 二幕强制精英千足虫 | A8 18 场胜率 67%，赢局失血中位 41、p75 53；63CP 单杀一节被接回，JUXB 三节同杀只掉 32 | 更新 decimillipede、route-forced-elite-prep |
| 切片写着 0% 仍拿佩尔之牙 | A8 拿佩尔之牙 3 局（4LC3、S6AG、T4PY），二幕 boss 0/3 | 新增 relic-paels-tooth |
| 经验库会不会把 DeepSeek 推向保血、轻伤害 | 见下面「冲突和解决」 | 退役 deck-gap-damage，新增 deck-gap-by-hp |

### 冲突和解决
- **deck-gap-damage 和 deck-block-floor 在这批局里方向相反。**
  - 63CP：60/80 进千足虫，每回合只打约 15，死于输出。支持「补伤害」。
  - 69HW：已有 5 张非基础格挡，deck-gap-damage 说格挡牌大幅降分，DeepSeek 于是连拿攻击，33/80 进沙虫，死于血量。支持「补格挡」。
  - 解决：改看死因。预计下一场必打战的进场血量 ≥ 这场战斗的 DB 失血 p75 时补伤害；低于 DB 赢局失血中位时先补格挡和回血。
- **回血和锻造。** rest-smith-threshold（多锻造）和 route-entry-hp、rest-before-forced（boss 前回血）没有真冲突，适用范围按离 boss 远近分开。上表的 2×2 数据说明两样都要，已把数字写进两条经验。
- **结论：经验库本身没有把 DeepSeek 推向「保血不打伤害」。** 这批局里「保血压过伤害」的实际来源是代码里的 HP guard，见下面的代码问题 1。

### 新增（3）
- **insatiable-clock**（boss:THE_INSATIABLE，n=20，高）：
  - 沙虫要 ≥45–49/回合。JUXB 实打 46.6/回合，差 15 死；69HW 只有 14.6/回合。
  - 永久力量和 AOE 的张数赢局输局一样，真正要的是满血进场、≥3 张升级、T1–T2 喝药爆发。
  - 证据：沿用退役的 insatiable-dps 的 18 局，加 JUXB、69HW。
- **deck-gap-by-hp**（general:deck，n=12，高）：按死因决定补伤害还是补格挡（见上）。证据：deck-gap-damage 的 10 局，加 63CP、69HW。
- **relic-paels-tooth**（relic:PAELS_TOOTH 佩尔之牙，n=3，中）：
  - 只能放打击和防御进去；牌是每场随机还 1 张。
  - 4LC3 把恶魔形态放进去，5 场之后才回来。
  - 证据：4LC3、S6AG9SH1ZP1K、T4PYMNJJFSU6。

### 更新（20）
- **insatiable-entry**，n 6→20：改成 20 局进场血量表（≥75% 胜 7/10，<75% 胜 1/10，≤45% 0 胜）。新增的证据是 ≥75% 进场的 7 个赢局、<75% 进场的 9 个输局。
- **route-entry-hp**，n 39→41：加入二幕 53 局的进场血量表。证据 +JUXB、69HW。
- **rest-smith-threshold**，n 28→30：加入「进场血量 × 升级数」的 2×2 表。证据 +JUXB（6 次休息 5 次回血）、69HW。
- **deck-block-floor**，n 11→12：run plan 定了格挡目标就要执行。证据 +69HW。
- **deck-remove**，n 8→11：加入基础牌张数的数据。证据 +LMTA（0 次删牌）、63CP、JUXB（都是 4 打击 4 防御）。
- **card-thunderclap**，n 3→4：它也是千足虫三节同杀的主力。证据 +63CP（选了怨恨，没选闪电霹雳）。
- **shop-spend-gold**，n 12→18：改成「别为后面的商店存钱」。证据 +63CP、2Q370C5EW0EU、ZWX5F97BUFVB、G8F1QPPZCM4T、CRY9LDHSKVFB、9V09G0TKK5EQ。
- **event-gold**，n 6→7：「下一个火堆会回满」只在回血会被上限截掉时才成立。证据 +JUXB（F31 −6 血换 52 金，之后 0 商店）。
- **route-forced-elite-prep**，n 6→7：某一步所有路都是精英时，它就是必经精英。证据 +63CP。
- **decimillipede**，n 20→22：写入 A8 胜率和失血，以及单杀一节 2 回合后接回。证据 +63CP、JUXB。
- **byrdonis**，n 2→4：写入 A8 失血中位 −32、p75 −41，路线按 −40~−45 定价。证据 +LMTA（−44）、69HW（−40）。
- **kin-scaling**，n 15→16：缺口 ≥14 时先删打击；2 费慢能力牌（惊逃）排在单体攻击后面。证据 +LMTA。
- **kin-priest-focus**，n 10→11：证据 +LMTA。
- **potion-save-for-boss**：反例 0→1（4LC3）。补一条例外：走廊会把血打到 <40%、而且后面还有必经精英时，留给 boss 的药就在走廊喝。
- **只加证据的 7 条：**
  - prism +4LC3
  - obscura +4LC3（−53）、JUXB（−16）
  - hunter-killer +4LC3、69HW
  - spiny-toad +69HW（−35）
  - myte +4LC3（−28）
  - act2-opening +4LC3、JUXB、69HW

### 退役（2）
- **insatiable-dps**：其中「二幕必须拿到永久力量」被 A8 20 局推翻，理由见上表。伤害时钟部分移到 insatiable-clock。
- **deck-gap-damage**：「已有 ≥2 张非防御格挡后格挡牌大幅降分」在低血时被 69HW 推翻，由 deck-gap-by-hp 取代。

### 代码问题（不给 DS）
下面这些问题出在代码判定的战斗步骤、题面或统计上，不写成给 DeepSeek 的经验。

1. **HP guard 在必输的回合把伤害线换成格挡线。**
   - 位置：`src/screens/combat-plan.ts:1512-1514`，`hpGuardReplacement` 在 `:170`；豁免条件 `winsRace`（`:1216-1226`）和 `guardKeepsSetup`（`:1228-1235`）都要求 hpAfter ≥ nextIncoming+5，残血回合永远满足不了。
   - 已出现 4 次：LMTA、63CP、JUXB、69HW。JUXB 一局就少打约 64 伤害，最后只差 15。
   - 待改：所有线胜率 ≤5%，或者替换线的 rollout 总掉血不比原线少时，不降级；有沙坑时按「boss 剩余血 ÷ 沙坑剩余回合」算赛跑门槛。
2. **rollout 没模拟接续 REATTACH。** `src/strategy/rollout.ts:652` 打死就判 alive=false，单杀千足虫一节被当成稳赢（63CP）。
3. **rollout 的 turnsToWin 把死亡样本也平均进去了。** 位置 `rollout.ts:860`，`rollout-live.ts:323` 把它印成「expected turns to win」（69HW）。JUXB 复盘里「~7.1 回合打完很准」那句要按这个口径重看。
4. **求解器没算感染棱柱 TAINTED 在一条线内的叠层**，Jev 连打技能牌（4LC3）。
5. **路线题面的精英代价用的是一幕精英的通用中位数**，没按具体精英的 DB p75（LMTA：多尼斯异鸟题面写 ~22，实际 −44）。
6. **题面缺的事实：**
   - 佩尔之牙每场还 1 张、随机（4LC3）
   - 本幕剩余商店数（JUXB F31）
   - 每条路都有的必经精英的 id（63CP）
   - 手里有不能打出的牌时的灰水线（63CP）
   - 火堆回血后的血量没算皇家枕头（63CP F24）
7. **Jev 在战斗里的药水时机**：JUXB 的明耀酊剂到 T2 才喝；69HW 的流动铜液留到必死回合才喝。
8. **DeepSeek 输出格式失败 2 次**：63CP F8 返回非 JSON；F23 回的是选项名，不是 key。
9. **统计口径**：`ops/report.py:105-106` 只加总 Jev 的 usage，runs.jsonl 的 token 数没算 DeepSeek（69HW 复盘）。

## 2026-09-29 第二次增量：11 局 A8（version 2026-09-29.1，分支 exp-update，bafc77f）

### 来源
- `notes/lessons.md` 的 11 节复盘，全输：
  - V2 尾：EZ2LP1P5VRPT（F48 女王）、FA82FQHSJG2F（F27 胧光怪）
  - V3-pre：Z6AMPPWHQ5CV（F33 知识恶魔）、VQKX9AD1YHKS（F48 实验体三阶段）
  - V3：VNWR16YEJASM、981WMX8MQ7DK（F33 沙虫）、0B5YKJFM0E8B、RWWGRRYKD6LT（F33 帝王蟹）、WXMBVL6ZJ000（F17 异鱼）、WCC7RMRLWLZK（F17 瀑布巨兽）
  - 另有 YKFWDENYQ6H8（F15 珊瑚群）
- `paper/materials/v3-vs-v2-2026-09-29.md`；`monster-db.json`；日志（只读）：从 states.jsonl 取 A8 全部 208 场 boss 战的进场 HP/药水，以及 51 场帝王蟹、14 场女王、25 场 A8 瀑布巨兽、52 场 A8 地道虫的逐回合数据；decisions.jsonl 取二幕商店。
- 复盘里用到的更早未并入的局（N7SAK31B9ZZZ、FSPKJAYY3ET6、LXB3B2WT9E0W、SFCEH58GXVT9、V1MF91VL7A2G）只作为相应主题的证据加入，没有逐节并入。7NMP–V1MF 这段（10 局）和 GG0Y0TJ2JXAR 仍未逐节处理。
- 结果：新增 1 条，更新 38 条，退役 1 条；active 194 → 194，总数 212 → 213。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 给 boss 留的药在走廊喝掉（V3 每局走廊 6.7 瓶，进 boss 0.2 瓶，V2 1.8） | A8 全部 208 场 boss 战（所有版本），≥75% 进场：0 瓶 7/18 赢（一幕 7/12、二幕 0/6），≥1 瓶 99/135（一幕 82/100、二幕 17/35）；<75% 进场：0 瓶 1/6，≥1 瓶 12/39。带着的药 97%（169/174）在 boss 战里喝掉 | 方向一致、差距大，但是观察数据：0 瓶的 18 场里 8 场来自 V3/V3-pre，这些局牌组也偏弱，n 小。写进 potion-empty-slots、potion-save-for-boss；V3 里 DeepSeek 点名留 boss 的药在走廊多数只省 0–3 血 |
| 帝王蟹两局 V3 死在 F33，没有集中打一只钳子 | 51 场螃蟹战（各进阶）：先打死火箭的 12 场赢 9 场（A8 3/4），两只一直都活着的 39 场赢 8 场（A8 2/19）；没有一场是先打死碾碎爪。NX48 火箭死时碾碎爪还剩 107，99 格挡只挡一回合，仍赢。0B5Y/RWWG 两只血量差始终 ≤32 | 「两只必须同回合死」被推翻：新增 crab-kill-order（先打火箭），退役 crab-rage-aoe |
| 瀑布巨兽自爆：击杀时喷发层数要小于 HP+格挡 | A8 25 场：T10 前打死 13/14 赢，T13–T15 5/7，T17 以后 0/2，没打死 0/2；层数 = 3×回合+9；击杀后那一回合唯一的来袭就是自爆 | 更新 giant-explode（加上战斗里的做法：格挡和格挡药留到击杀后那一回合），giant-gun、giant-deck 加证据 |
| 地道虫走廊 | A8 52 场全胜；≤6 回合打完的 44 场中位 −13，≥7 回合的 8 场中位 −37.5；RWWG 钻地后 4 回合只挡不打，−60 | 更新 tunneler：原来的「二幕按 −25~−45 估」改成中位 −14、p75 −25、p90 −35；钻地期间每回合都要打它 |
| 女王 + 聚合体击杀顺序（EZ2L 把伤害打进女王） | 14 场女王战：4 场胜局（A2–A7）都在 T4–T8 先打死聚合体；A8 5 场全输，聚合体都活过 T5 | queen-plan 成立，加证据并写成战斗里可用的顺序 |
| 二幕无商店、几百金没花（0B5Y 366，VQKX 三幕 303） | A8 带 ≥300 金进二幕 boss 3/8，其余 15/55；二幕 0 商店 2/8，≥1 商店 16/55 | 金币本身不分胜负，代价在 run plan 要的删牌、药水没买到。route-shops 改成「run plan 缺药或缺删牌且 ≥150 金时，boss 前要经过商店」 |

### 新增（1）
- **crab-kill-order**（boss:KAISER_CRAB 帝王蟹，n=11，反例 3，高）：
  - 单体伤害集中打火箭（T4/T9 激光 47–49），群伤照打两只。
  - 打死火箭后的下一回合碾碎爪有 99 格挡：这回合出格挡/能力牌，别把攻击打进格挡。
  - 证据：9 场火箭先死的胜局（D4JG、2WUM、JR66、BDAK、M75J、V1YT、VE97、NX48、EZ2L），加 0B5Y、RWWG（轮流打死）。反例：火箭先死但输了的 7Q5G、GGF8、TEK4。

### 更新（38）
- **Jev 能看到的敌人条目，按击杀顺序和药水时机改写：**
  - giant-explode，n 10→13：击杀回合表；击杀后那一回合全力格挡。证据 +N7SA、WCC7、7048。
  - giant-gun，n 8→10：boss 前的精英、走廊别喝格挡/敏捷药。证据 +N7SA、WCC7。
  - giant-deck，n 11→13：时钟估值约 0.85；缺口 ≥12 时钱和锻造只给当场能出伤害的牌。证据 +N7SA、WCC7。
  - tunneler，n 13→14：A8 数字和打法见上表。证据 +RWWG。
  - queen-plan，n 8→12：先杀聚合体、女王只吃群伤；聚合体死后女王的亲自攻击胜局都扛住了。证据 +BDAK、H5MZ、YN4E、EZ2L。
  - insatiable-escape，n 12→13，反例 2→3：先看哪条死线先到。HP 先到头时多打逃离没有价值（VNWR 打了 6 张，死时沙坑还剩 3）。证据 +981W，反例 +VNWR。
  - kd-dps，n 23→24：所有线都判输时按本回合伤害选线（Z6AM 少打 45）。证据 +Z6AM。
  - ts-phase3，n 2→3：三阶段每两回合一次无实体，按每个开放回合约 100 备爆发；rollout 的「赢 88%」不可信。证据 +VQKX。
  - ts-phases，n 9→10：一阶段别用恶魔之焰清手牌。证据 +FSPK。
  - obscura，n 12→13：打寄生惧魔只抵掉当回合攻击。证据 +FA82。
  - skulking-colony，n 11→12：常是一幕末的强制精英，前面连战时前一个火堆回血。证据 +YKFW。
  - terror-eel，n 16→17：boss 前火堆前的唯一精英按 p90（约 −48）估。证据 +WCC7。
  - crab-dps，n 26→30：满血也输；时钟对普通牌组按约 0.7 折算。证据 +0B5Y、RWWG、SFCE、V1MF。
  - crab-potions，n 12→14：A8 ≥75% 进场 0 瓶 0/4，带药 5/14。证据 +0B5Y、RWWG。
  - 走廊条目加「boss 药别在这里喝」（Jev 在这些战斗里能看到）：
    - spiny-toad +RWWG（力量+再生只省约 2 血）
    - bowlbugs +0B5Y
    - sculptor +VQKX
    - entomancer +981W（rollout 预测 −65，实际 −19）
- **沙虫：**
  - insatiable-entry，n 20→23：A8 23 局 ≥75% 进场 7/15、<75% 1/8；LXB3、VNWR、981W 满血也输。进场血是前提，不是充分条件。
  - insatiable-clock，n 20→22：时钟对沙虫高估约 85%（VNWR 估 32 实打 17，981W 估 43 实打 23）。
  - relic-toasty-mittens，n 18→20：沙虫战里手套消耗了最大的攻击牌。证据 +VNWR、981W。
- **药水：**
  - potion-save-for-boss，n 33→44：加入 V3 数字和上面的 boss 进场表；例外条款加 FA82。
  - potion-empty-slots，n 9→19：改成 208 场 boss 战的数据。证据 +10 局 0 瓶进场输的局。
  - potion-strength，n 6→11：五局都把力量药水喝在走廊，每次多打 2–6 或省 ≤3 血。
  - 只加证据：potion-power（+981W、RWWG、FA82）、potion-shackling（+VQKX，带了 17 层没喝）、potion-forge（+VQKX）。
- **路线、商店、牌组：**
  - route-shops，n 13→15：见上表。证据 +0B5Y、VQKX。
  - deck-remove，n 11→13：删牌就在当前商店做，别「留给下个商店」。证据 +EZ2L（F36 282 金没删，5 打击到三幕 boss）、N7SA。
  - deck-clock，n 15→23：写入各 boss 的实测折算（帝王蟹 0.66–0.73、沙虫 0.53–0.54、巨兽 0.83–0.87、异鱼约 0.8）、硫磺被漏算（EZ2L 实打约为估值 2 倍）、进场血按 85% 假设（Z6AM）。
  - event-hp-maxhp，n 8→10：可重复付血的选项代价递增、结果随机。证据 +RWWG（5 次 −25）、981W。
  - 只加证据：shop-spend-gold（+EZ2L、N7SA）、route-no-chains（+FA82、YKFW）、rest-before-forced（+YKFW）、elite-threshold（+WCC7）、chomper（+FA82）、fysh-damage 和 fysh-beckon（+WXMB）。

### 退役（1）
- **crab-rage-aoe**：「两只钳子必须同回合一起死」被 51 场数据推翻（见上表）。反例 +8 局火箭先死的胜局（BDAK 已在原证据里，未重复计）。击杀顺序改由 crab-kill-order 给出。

### 和手写知识冲突、待改
- `src/strategy/boss-clock.ts:56` 帝王蟹 note「kill both in one turn…a claw killed alone enrages the other」，和 `src/project/run-journal.ts:175` BOSS_NOTES「要同回合一起打死（血量保持接近）」都和 crab-kill-order 冲突。
- `src/strategy/turn-solver.ts:1693-1700` 在女王活着时给聚合体伤害打 MINION_CHIP 折扣，`boss-clock.ts:62` 只按女王算，和 queen-plan 冲突（EZ2L 复盘）。

### 代码问题（不给 DS）
1. **帝王蟹、同族的经验到不了 Jev。** `src/screens/combat-plan.ts` 的 `fightLessons` 只按 scope id 等于或前缀匹配敌人 id。boss:KAISER_CRAB 对不上 CRUSHER/ROCKET，boss:THE_KIN 对不上 KIN_PRIEST/KIN_FOLLOWER。crab-kill-order 目前只有 DeepSeek 看得到。需要一张 boss → 部件 id 的表。
2. **留给 boss 的药没有 reserved 标记**（0B5Y、RWWG、WXMB、WCC7、981W、FSPK）。general 话题的经验不进 Jev 的题面，只靠文字劝不住。按复盘的规则：run plan / 买药理由点名的药，boss 前的走廊里只在「不喝会死或省 ≥10 血」时列为选项，随机药水 MC 同样处理。
3. **rollout 与模型缺口：**
   - 钻地后的常驻格挡没保留（`rollout.ts:912`、`:960`；RWWG）。
   - 幻象复活没模拟（`rollout.ts:724-742`；FA82）。
   - 天罚无实体没模拟（`rollout.ts:816-826`；VQKX）。
   - 狱火没有带进后续回合（`rollout.ts:561-566`；0B5Y）。
   - 实验体阶段 HP 和恶魔之焰消耗的牌（`rollout.ts:658-660`、`:635-637`；FSPK）。
   - 巨兽 race 模式整回合关掉 HP 护栏（`combat-plan.ts:481-491`；WCC7）。
4. **boss 时钟：**
   - 沙虫、帝王蟹的 mechanicFactor 都是 1（`boss-clock.ts:287-320`；VNWR、981W、RWWG）。
   - 硫磺没算进遗物力量（`boss-clock.ts:212`；EZ2L）。
   - expectedEntryHp 默认回到 85%（`boss-clock.ts:397-401`；Z6AM）。
5. **HP 护栏看不到沙坑**，把狂乱逃离当 0 伤害（`combat-plan.ts:358-364`、`:1382-1391`；981W）。
6. **烘焙手套按卡值消耗攻击牌**（`selection.ts:470-477`；VNWR、981W）。
7. **没建模的药水：** 镣铐、熔炉的祝福（VQKX）；痊愈药水在 98a16de 未建模（YKFW，HEAD 已修）。
8. **新战斗第一帧沿用上一场的计数**，F14 T1 空过一回合（`screens/index.ts:166-175`；YKFW）。
9. **DeepSeek 答案解析失败时整题交给低上下文的 Jev**（`loop.ts:719-726`；WXMB 的火堆回血变成锻造）。F30 run plan 返回两个 JSON 对象即报错（`deepseek.ts:291-294`；0B5Y）。
10. **进程重启丢路线计划和 RunJournal**（`loop.ts:271-273`；FA82）；Jev 503/529/520 直接致命退出（FA82、VNWR）。
11. **事件附魔题面没有规则文字**（FSPK「迅速2」）。

### 切片大小
经验条目变长后，用同一批 120 个 A8 状态（每种界面 20 个）复测，中位数和最大值如下：

| 界面 | 旧中位 | 新中位 | 新最大 |
| --- | --- | --- | --- |
| 战斗 | 2.5k | 3.1k | 4.5k |
| 奖励 | 2.9k | 3.5k | 4.5k |
| 地图 | 3.5k | 3.8k | 4.4k |
| 事件 | 3.4k | 4.0k | 4.7k |
| 火堆 | 2.3k | 2.4k | 4.0k |
| 商店 | 4.0k | 4.7k | 5.0k |

商店最大值略超上次的 4.4k。

## 2026-09-29 第三次增量：3 局 A8 + 13 局 A9（version 2026-09-29.2，分支 exp-update，50b02a8）

### 来源
- `notes/lessons.md` 的 16 节复盘，全输：
  - A8：Y3XT9EBS7U8B（F48 永世沙漏）、6189FSNEN1MZ（F17 瀑布巨兽）、VG7HWJRX44RQ（F17 灵魂异鱼）
  - A9：7B0D6XKP0BAZ、VSRG9P80R1ZB（F33 帝王蟹）、LY0N909D4A0V（F33 知识恶魔）、HEACJRY5LEVD、1VX145UJM8RZ（F17 瀑布巨兽）、BXAZV0R9ZHWK（F17 乐加维林族母）、WFDBEQ0GD60Z（F15 多尼斯异鸟）、XLJQ6FPQAU7N（F7 骇鳗）、TYZH5GB5N2UL（F30 感染棱柱）、SK1USHSB1U7U（F45 机甲骑士）、8V0HD9Y207WY（F25 外骨骼虫走廊）、QUG1DSDARAXU（F23 胧光怪）、ETYCESZQ6BWZ（F24 熟睡甲虫走廊）
- 日志（只读）：从 states.jsonl 把 A8 150 局、A9 15 局的战斗抽成逐回合的表（A8 218 场 boss、116 场一幕精英、926 场一幕走廊、503 场二幕走廊；A9 18 场 boss、10 场一幕精英、132 场走廊），decisions.jsonl 取 717 次休息选择；`monster-db.json` 取 A8/A9 招式伤害，`room-costs.json`、`outcome-stats.json` 取房间和遗物行。
- 口径：「战内掉血」= 第一帧 HP − 最后一帧 HP（燃烧之血之前），死亡单独计；A9 汇总里含还没复盘的 KY3YZ0DMRY0G、9Q7VBZ7TP29K 两局，它们只进数字，不作为证据局。
- 复盘里引用到的更早局只作为相应主题的证据：RBJ402TKQZ6F（与我一战！）、Y0CWCD0C03FL（巨兽、熔炉的祝福）。烫嘴可可、炸弹两条新条目的证据取自更早的复盘（JGJS、GMT2、VHLZ、YVWA、NEVM、WM2X、SCBC、NMLV、R2H1；1ZQJ、12ZG、NHL7）。上次之后写入的 RBJ4、2CCM6XK4PB37、Y0CW 三节这次没有逐节并入。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 f4dc1bc），再改。
- 结果：新增 4 条，更新 57 条，退役 2 条；active 194 → 196，总数 213 → 217。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| A9 比 A8 痛多少（复盘印象：VSRG 两场二幕走廊各约 30，投影 12） | A9 血量同 A8，招式伤害高约 10–20%（激光 48→54、机甲骑士冲锋 25→30、墨影幻灵肢解 26→30、族母挥砍 19→21）。战内掉血：一幕走廊 A8 中位 9/p75 14（n=926）、A9 9/15（n=88）；二幕走廊 A8 17/25（n=503，死 24）、A9 9/24（n=44，死 3，都是 ≤21% 进场）；一幕精英 A8 25/36（n=116，死 7）、A9 36/42（n=10，死 2，都 <60% 进场） | 走廊不用放大，一幕精英约 1.4 倍。「A9 二幕走廊约 30/场」只是 VSRG 的两场，没写进经验。新增 a9-damage，更新 act1-costs、elite-threshold 和各精英条目 |
| 瀑布巨兽自爆 | 31 场（A8 27、A9 4）：喷发层数 A8 = 3T+9，A9 = 3T+14（4 场全是）。有击杀的 28 场里，击杀后那回合所需格挡（层数 − HP）≤13 的 17 场赢 16，≥20 的 11 场赢 3，没有 14–19 的。A8 击杀回合 ≤T10 13/15，T13–T15 5/7，≥T16 0/3，没打死 0/2；A9 只赢 1（T12） | 更新 giant-explode、giant-gun |
| 巨兽「输局 0.3 张升级、赢局 2.2 张」（giant-deck；1VX1 F7 在 56% 血时引用它去锻造） | A8 27 场进场升级数：赢局平均 1.2（n=18），输局 2.3（n=9）。原数来自 A0 三局（1ZQJ、G7EJ、WQTR）。含力量牌：赢局 10/18，输局 4/9 | 这句被推翻，giant-deck 改成「比的是伤害和击杀回合」。ds-handbook.md 还写着旧数（见下） |
| 留给 boss 的药在走廊喝掉 | 按复盘逐瓶数：16 局里 12 局，约 28 瓶，按 rollout 每瓶多只省 0–5 血。A9 15 局：每局走廊/事件战 4.6 瓶、精英 0.3、boss 1.1，二幕 boss 进场平均 0.8 瓶。A8 218 场 boss：≥75% 进场 0 瓶 8/21、带药 103/149，异鱼 0 瓶 1/4、带药 13/13；A9 ≥75% 进场 0 瓶 1/2、带药 7/12。A8 带进 boss 的药 87%（294/338）在 boss 里喝掉 | 方向同上次。更新 potion-save-for-boss、potion-empty-slots，以及 Jev 在战斗里能看到的走廊条目：偷窃草蜢 A9 5 场里 3 场、猎人杀手 3 场全都喝了 boss 药 |
| 一幕火堆全回血、0 锻造（VG7H、BXAZ、QUG1、8V0H） | A8 一幕 <70% 血的 252 次休息 221 次回血。A8 141 局：一幕 0 次锻造的过一幕 boss 36/54（67%），≥1 次 67/87（77%）。按进场升级张数分，一幕 boss 0/1/2/3+ 张是 69%/70%/79%/74% | 回血多是因为到火堆时血已经低，根子在前面的掉血。rest-smith-threshold 只加一句观察数据，不写「一幕必须锻造」 |
| 一幕打几只精英（XLJQ、1VX1 引用 elite-need-one 选了精英路线） | A8 150 局：一幕 0 只精英的 50 局过二幕 boss 2 局（4%），1 只的 84 局 15 局（18%），2 只的 16 局 3 局；一幕 boss 68%/70%/63%。A9：0 只 5 局、1 只 10 局，过二幕 boss 0、1 | A8 上成立，保留。补上「按到达血量算」和 A9 精英更贵。XLJQ 计划 76% 到达、实到 59%，死在骇鳗 |
| 墨影幻灵「低血进场或 boss 药喝光的局都输」（vantom-entry） | A8 25 场赢 21：≥75% 进场 17/19，<75% 4/6；0 瓶进场 3/3（都 ≥75%）。A9 QUG1 68% 进场赢，剩 1 血 | 原句不成立，改写 |
| 打击+防御张数（deck-remove） | A8 65 场二幕 boss：≥8 张 7/27（26%），7 张 6/17，≤6 张 7/21（33%）；上次是 20% vs 37%（n=20/19） | 差距缩小，方向一致。更新数字，证据加上这批不删牌的局 |
| A9 boss 每回合掉血 | 知识恶魔 A8 中位 5.5（n=19），A9 LY0N 9.6、SK1U 6.7；帝王蟹 A8 9.7（n=23），A9 13.8、13.0；族母 5.1 对 6.6；巨兽 4.3 对 4.8；异鱼 4.9 对 4.0 | 写进 kd-dps、crab-entry、a9-damage |
| 烫嘴可可（VSRG 的题面显示「41点能量」，DeepSeek 当成 +1） | 复盘里 9 局都是每场第 1 回合 +4 能量（NMLV 帝王蟹 T1 123、R2H1 T1 48、盛碗虫走廊 T1 26–38）；A8 拿到它的 6 局二幕 boss 1/6（基线 19%） | 新增 relic-very-hot-cocoa。neow-growth、neow-act2 原来的「只管首回合」「帮不了走廊」让它看起来比实际差，改了措辞 |

### 经验库自己带偏的地方
- **giant-deck 的升级数字**：1VX1 F7 的锻造理由原文就是「巨兽赢局平均 2.2 次升级」，但这是 A0 数据，A8 不成立。已改。
- **elite-need-one**：XLJQ 以「knowledge: don't go 0 elites」否掉 0 精英路线，1VX1 也以「skipping all elites kills output-short runs」选了带精英的路线。A8 数据支持这条，问题在前提。已补上：要按走廊 p75 算到达血量，而且 A9 精英更贵。
- **neow-growth / neow-act2**：把烫嘴可可写成「只管首回合的能量」「帮不了走廊」。再加上题面显示错了，VSRG 选了要扣钱的黄金印。已改。

### 新增（4）
- **a9-damage**（general:plan，asc 9–20，n=13，高）：
  - A9 和 A8 血量相同，伤害高约 10–20%，巨兽喷发同一回合多 5 层。
  - 一幕精英战内中位 36、p75 42（A8 25/36），走廊和 A8 差不多。
  - boss 每回合掉血：知识恶魔 6.7–9.6（A8 5.5），帝王蟹 13–14（A8 9.7）。
  - 精英、boss 的进场血线和输出需求按这些放大，走廊代价不用。
  - 证据：13 局 A9 复盘局。只在 A9+ 的 run plan 类问题里出现。
- **relic-very-hot-cocoa**（relic:VERY_HOT_COCOA 烫嘴可可，n=10，高）：
  - 每场第 1 回合 +4 能量。题面曾显示成「41点能量」。
  - 手里没有吃费的牌时会浪费（YVWA、VHLZ）。
  - 不回血、不成长，排在成长件后面。
  - 证据：JGJS、GMT2、VHLZ、YVWA、NEVM、WM2X、SCBC、NMLV、R2H1、VSRG。
- **relic-lords-parasol**（relic:LORDS_PARASOL 领主阳伞，n=1，低）：商店整店的牌都进牌组。Y3XT 三幕两家店各进 7 张，32→50，永世沙漏战 30.9/回合（要 67）。A8 拿到的 2 局都没过三幕 boss。
- **card-the-bomb**（card:THE_BOMB 炸弹，n=4，中）：4 局有它，关键战斗 0 次打出（1ZQJ、12ZG、NHL7、VSRG；VSRG 花了 82 金）。里面有代码原因（求解器筛线、走廊打折），代码修好后要复查。

### 更新（57）
- **瀑布巨兽：**
  - giant-explode，n 13→18：A8/A9 两个喷发式、所需格挡表、击杀回合表；A8 约 25/回合，A9 约 29/回合。证据 +6189、1VX1、HEAC、8V0H、Y0CW。
  - giant-gun，n 10→12：水枪 A9 23/28/33。证据 +HEAC（速度药水在走廊喝掉，T15 水枪打在 7 血上）、8V0H（留给自爆的固化药水 T2 就喝了）。
  - giant-deck，n 13→17：删掉升级数字，改成伤害和击杀回合；时钟折算 0.84–0.9（6189、HEAC、1VX1 实测）；缺口 ≥7 时先删打击。证据 +6189、HEAC、1VX1、Y0CW。
- **帝王蟹：**
  - crab-entry，n 27→29：A9 激光 54，每回合掉 13–14，两局 78–81% 进场都没活过 T6。
  - crab-dps，n 30→32：A9 7B0D 21/回合（时钟估值的 0.49）、VSRG 32/回合。
  - crab-potions，n 14→16：7B0D、VSRG 点名给螃蟹的 3、4 瓶药全在二幕走廊喝掉。
  - crab-kill-order，n 11→12：53 场里两只一直活着的 41 场赢 8（A9 0/2）；7B0D 每回合换目标。
  - Jev 在螃蟹战仍看到这 4 条，测试钉住。
- **知识恶魔：**
  - kd-dps，n 24→27：A8 按进场血 ≥75% 7/10、<75% 0/9；A9 按约 60/回合准备（LY0N 51/回合仍死）。证据 +LY0N、SK1U、Y3XT。
  - kd-free-turns，n 11→12：LY0N 带着点名 T1 喝的能力药水进场，没喝。
- **异鱼：**
  - fysh-damage，n 11→15：时钟折算 0.55–0.8（VG7H 0.56）；A8 ≥75% 进场带药 13/13、0 瓶 1/4；A9 4 场全胜。证据 +VG7H、LY0N、VSRG、SK1U。
  - fysh-beckon，n 7→8：VG7H 燃烧契约三次在手没用来消耗呼唤，17 回合打出 18 张呼唤。
- **其他 boss：**
  - vantom-entry，n 15→16：按数据改写（见上表）。
  - lag-entry，n 13→14：+BXAZ（65% 进场死）。
  - kin-scaling，n 16→19：A9 3 局全胜，出场 1–27 血。
  - aeon-clock，n 11→12：+Y3XT（80/80 进场，30.9/回合）。
- **精英：**
  - terror-eel，n 17→20：恐惧后撞击 ×1.5（A9 36）；晕眩回合打完或两回合后备 ≥35 格挡；A9 4 场死 1。
  - byrdonis，n 4→7，中→高：A9 QUG1 −48、WFDB 死。
  - skulking-colony，n 12→14：A8 中位 −24/p75 −36；A9 BXAZ −61。
  - gardener，n 14→16：A9 −40、−23。
  - prism，n 17→18：TYZH 的技能格挡牌组；佩尔之角的放松也是技能。
  - mecha-knight，n 12→13：A9 重劈 45/50/55，SK1U 27.6/回合死，约需 50/回合。
- **走廊（Jev 在这些战斗里能看到）：**
  - beetle，n 26→29：A8 27 场死 3、赢局中位 −29、p75 −38；A9 两场各 −36，ETYC 13/80 进场死。
  - bowlbugs，n 22→24：原来的「按 −25~−55 估」改成实测（A8 各组中位 −11~−19、p75 −17~−29）；+7B0D 喝掉点名的力量药水，只省 3 血。
  - hunter-killer，n 27→30；hopper，n 14→17：A9 在这两种战斗里喝掉 boss 药 6 次。
  - spiny-toad，n 14→17：A9 VSRG、SK1U 又在这里喝掉 boss 药。
  - louse，n 11→13：A8 中位 −16.5、p75 −23；A9 −35、−23。
  - obscura，n 13→15：寄生惧魔这回合要攻击、一两张牌能打死时先打死它（SK1U T8 −32 对 −9）；+QUG1 17/80 进场死。
  - ovicopter，n 6→7：T1 下蛋看着 0 来袭，按精英定价；+QUG1 −43。
  - frog-knight，n 6→7：+SK1U −55。
  - axebot，n 6→7：+Y3XT −44。
- **幕：**
  - act1-costs，n 9→14：改成 A8/A9 战内实测。
  - act2-opening，n 21→25：A8 这几场走廊中位 −19%、p75 −29%，85 局到第一个二幕火堆时中位 39%；A9 单场中位 −9%，但同样连打。原来的「中位 31%、p75 42%」按本次口径没复现出来。
  - act3-hallways，n 11→13：+Y3XT、SK1U。
- **药水：**
  - potion-save-for-boss，n 44→57：16 局里 12 局、约 28 瓶的数字，A9 每局走廊 4.6 瓶、boss 1.1 瓶。A8 boss 表挪到 potion-empty-slots，不重复。
  - potion-empty-slots，n 19→21：218 场的新表，加异鱼、A9。
  - potion-forge，n 8→12：删掉「代码不认它是 reserve」（cff6645 起已模拟）；手牌满时喝（QUG1 T5 打 85），BXAZ、Y0CW 拖到手里没牌。
  - potion-blood，n 4→7，中→高：回血会溢出时别喝（ETYC、SK1U、1VX1）。
  - potion-heart-of-iron，n 6→8：族母睡眠回合别喝（BXAZ）。
  - potion-stable-serum，n 6→7：+SK1U。
  - potion-no-hoarding，n 25→26：+LY0N。
- **路线、精英、休息、事件、商店、牌组：**
  - elite-threshold，n 21→26：到达血量按走廊 p75 扣；A9 一幕精英 p75 −42，≥78% 进场 8/8 活、<60% 2/2 死。证据 +BXAZ、QUG1、XLJQ、WFDB、6189。
  - elite-need-one，n 8→9：A8 150 局的表，加前提（+XLJQ）。
  - route-entry-hp，n 41→42：A8 表按 65 场二幕 boss 重算（≥75% 19/43，<75% 1/22，<50% 0/6；一幕 91/118 对 12/23），加 A9（≥75% 8/14，<75% 2/4）。
  - route-forced-elite-prep，n 7→9：+TYZH（所有路都要过棱柱，run plan 还写 skip），+WFDB（精英前走廊按中位投影，实际 −44）。
  - rest-smith-threshold，n 30→34：加一幕锻造的观察数据。
  - event-hp-maxhp，n 10→12：+QUG1（26/80 花 8 血换药）、VG7H（事件战 −48）。
  - event-curses，n 7→8：+8V0H（28/80 拿笨拙）。
  - shop-potions-first，n 19→20：+LY0N（药栏空一格买弹珠袋）。
  - deck-remove，n 13→17：新表，加「code 把删牌排第一时先删」（SK1U 三次、Y3XT、6189、HEAC）。
  - deck-clock，n 23→31：加帝王蟹 0.49、异鱼 0.56、巨兽 0.84–0.9；低估一侧加 SK1U 自伤引擎（26→约 60）、Y3XT 地狱狂徒 1.8、LY0N 1.5。
  - deck-bloat，n 4→5，中→高：+Y3XT 领主阳伞。
- **卡牌、遗物、先古：**
  - card-fight-me，n 5→7：一幕也有用（6189、RBJ4），code 卡值偏低。
  - card-rupture，n 11→13：+7B0D（只有 2 张突破，死牌）、SK1U（≥3 个来源，引擎）。
  - relic-seal-of-gold，n 3→4：+VSRG（二幕扣 90 金，T5 归零）。
  - neow-growth、neow-act2：只改烫嘴可可的措辞，n 不变。

### 退役（2）
- **potion-burst-tag**：burst/big_hit 标签只在 fight plan 里。V3 起 FIGHT_PLAN=off（`logs/fight-plans.jsonl` 最后写入是 09-28 14:31），这 16 局一份 fight plan 都没有，这条只是在 run plan 切片里占位。重新打开 fight plan 时恢复。
- **potion-plan-phrasing**：它说的「代码把 run plan 的药水句读成 now/hold」（`intent.ts` 的 potionStance）已经不在代码里（`src` 里搜不到）。

### 和手写知识、代码冲突，待改
- 巨兽喷发式写死 A8：
  - `src/strategy/boss-clock.ts:503-508` eruptionTurns 按「12 + 3(T−1)」算，不分进阶；A9 是 17 + 3(T−1)。
  - `:84` 的 mechanic 文字「eruption 12+3 a turn」也是 A8 的数。
  - 和 giant-explode 冲突（1VX1：时钟写「eruption kill by T10」，按 A9 应是 T9）。
- `src/knowledge/ds-handbook.md:67`：「输的 3 局平均升级 0.3 张，赢局 2.2 张〔1ZQJ, G7EJ, WQTR〕」，和改过的 giant-deck 冲突。
- `src/knowledge/ironclad-guide.md`：
  - `:55`：「第 2 回合 15 层」只对 A8；「宁可多格挡慢慢打，也不要换血抢伤害」和 giant-explode 的击杀回合表相反（T16 以后 0/3，没打死 0/2）。
  - `:117`、`:119`：还写着 240 血、第 2 回合 15。
- `src/project/run-journal.ts`：
  - `:173` WATERFALL_GIANT 的 BOSS_NOTE 写着「240 血…第 2 回合 15…压力枪 20→25→30」（A8 是 250 血，A9 是 20 层、23/28/33）。
  - `:178` TEST_SUBJECT 还是「三阶段无实体，靠多段」（上次已记，仍未改）。
- `src/util/json.ts:89-97` iconsToText：「4[能量图标]」会显示成「41点能量」（VSRG）。relic-very-hot-cocoa 写明了是 +4，但这个题面 bug 本身还在。
- 这次没改、但已过时的两条：
  - potion-code-discard、potion-fysh-oil 都说「要在 run plan 点名保留」。
  - 现在的代码里，选路前丢药只按药水等级（`src/screens/map.ts:246-268`），喝药保护只认 fight plan（`src/screens/combat-plan.ts:1371-1377`），run plan 点名本身没有作用。
  - 要不要保护 run plan 点名的药是 Dai 待定的事，定了之后一起改。
- 手册里引用的 n 已过时（测试只查 id 存在）：ds-handbook.md、ironclad-guide.md 引用的 elite-threshold n=20、potion-save-for-boss n=33，现在是 26、57。

### 代码问题（不给 DS）
**已在 v3 f4dc1bc 修好**（09:18 合并）：
- journal replay 在 run_unknown 菜单行停下，重启后丢 run plan（VG7H）。
- 手套消耗打分：巨像按减半伤害算（LY0N）。
- 饱和 rollout 不再乱标 best（HEAC、8V0H、1VX1、TYZH）。
- 覆甲按预测来袭计价（BXAZ）。
- 熔炉的祝福、士兵炖汤已模拟（BXAZ、QUG1、8V0H）；明耀酊剂在 d3d5c8b 已模拟（Y3XT）。
- 死掉的幻象在 rollout 里复活（QUG1）。
- boss 时钟按当前进阶的血量和伤害算（LY0N：12 回合 → 10，实际 8）。
- reasked 标记（BXAZ）。

**已交修复，f4dc1bc 里还没有**（10:10）：
- 骇鳗的活力、假人的时限不在 MODELLED_ENEMY_POWERS，求解器按 0.8 打折（XLJQ、SK1U）。
- rollout 不应用敌方招式给我方的减益（恐惧的 99 易伤，XLJQ）。
- 巨兽喷发式写死 A8（1VX1）。
- eruptionRace 用当前 HP 比（1VX1 T5 护栏两次换线）。
- iconsToText 的「41点能量」（VSRG）。
- rollout 里覆甲不衰减；enemy_threat_next 漏掉会复活的幻象。

**交 Dai（策略，没改）**：
- 喝药线和同一条不喝药的线 rollout 同分时，标喝药线为 best，留药在本场不值分（TYZH F25、1VX1 F11）。
- FIGHT_PLAN=off 时，run plan 点名留给 boss 的药在走廊没有任何保护（HEAC、7B0D、QUG1、SK1U、1VX1、VSRG）。
- HP 护栏：
  - 只比当回合掉血，换掉了 rollout 更好的线（WFDB F15 T2、XLJQ T2、LY0N F17 T2、1VX1 T5 两次）。
  - guardKeepsPick 的 focus 保护挡住了走廊护栏（SK1U F25：−32 对 −9）。
- route-follow 只在比投影低 30 个点时重问，没有绝对血线（ETYC 16% 走进战斗；WFDB、XLJQ 强制精英前的最后一个岔路）。
- 路线投影：
  - 按「每个火堆都回血」算（ETYC）。
  - 房间成本在 A9 不足 5 场时退回 A8 不放大（BXAZ 按 22/31 选精英）。一幕精英现在 A9 已有 n=9。
- 其他：
  - 随机药水 MC 的 beats 只比 score（6189 赌徒特酿多 0.1 伤害也算赢）。
  - solver 看不到燃烧契约消耗呼唤的长期价值（VG7H）。
  - 敌人不攻击时仍列防御药（SK1U 假人战喝掉敏捷）。
  - 懒惰排序不看地狱狂徒（Y3XT）。

### 切片大小
这次换了一批样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个，从 states.jsonl 固定种子抽取。同一批状态分别用改前（bafc77f）和改后（50b02a8）的 experience.json 跑 `tools/knowledge-slice.ts`，数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.2k / 4.5k | 3.1k / 4.7k | 3.3k / 4.5k | 3.5k / 4.9k |
| 奖励 | 3.7k / 4.7k | 4.0k / 5.3k | 3.1k / 4.8k | 3.5k / 5.3k |
| 地图 | 3.8k / 4.3k | 4.3k / 4.8k | 3.8k / 4.3k | 4.3k / 5.0k |
| 事件 | 3.5k / 4.6k | 3.9k / 5.1k | 3.3k / 4.8k | 3.6k / 5.4k |
| 火堆 | 2.7k / 4.0k | 3.0k / 4.5k | 2.8k / 4.1k | 3.2k / 4.7k |
| 商店 | 4.8k / 5.0k | 4.9k / 5.3k | 4.8k / 5.1k | 5.0k / 5.3k |

- 初稿中位涨了 0.8–1.5k（地图 5.3k，最大 6.2k）。之后把各条新增的证据压成一句，并去掉和 a9-damage 重复的 A9 细节。
- 最终中位涨 0.1–0.5k，最大 5.4k（A9 事件），高于上次的 5.0k。
- Jev 每场战斗看到的敌人条目仍是 ≤4 条：这次没有新增 boss、精英、走廊条目，帝王蟹的 4 条都在。
- 条目数：active 196（测试上限 200）；置信度 高 127、中 58、低 11。

## 2026-09-29 第四次增量：14 局 A9（version 2026-09-29.3，分支 exp-update，d986a74）

### 来源
- `notes/lessons.md` 末尾的 14 节 A9 复盘，全输：KY3YZ0DMRY0G（F33 无厌沙虫）、9Q7VBZ7TP29K（F17 瀑布巨兽）、XMK1JFZ0VD2Q（F33 无厌沙虫）、PHMVUY73R0D7（F24 棘刺蟾蜍走廊）、YQL8D59999AX（F31 蜂群术士）、W2TBR2YUMQ5Y（F17 同族）、U6RUE7LBUFJF（F33 帝王蟹）、VBHZ77A3N496（F30 直飞产卵虫走廊）、ZY3992X5VEVS（F23 胧光怪走廊）、0H1X9QMAAQ8V（F17 墨影幻灵）、X7LUMGJK9NRM（F7 花园幽灵鳗）、XTB46ZGMYR6E（F17 灵魂异鱼）、2XWM27TZ7T12（F45 三骑士）、7XK6DUJYMYY3（F48 实验体）。KY3Y、9Q7V 上次只进数字，这次作为证据局。
- 日志（只读，流式读取）：
  - states.jsonl 一遍抽出 A7–A9 的全部战斗（2818 场，其中 A9 359 场），每场带房间类型、进场/结束 HP、逐回合我方和每个敌人的 HP、药栏、牌组、遗物；再一遍抽出每层第一帧（HP、金币、药栏、遗物），用来算二、三幕第一个火堆的到达血量和死时金币。
  - decisions.jsonl 查了 2XWM 三幕每场第 1 回合的出手、茶会事件的选项原文；runs.jsonl 定输赢和进阶。
  - `tools/boss-fights-extract.py` + `tools/boss-clock-calibrate.ts --rows`：按现行时钟（09-29 重拟合）重算沙虫、巨兽、异鱼、帝王蟹、墨影幻灵、知识恶魔 A8/A9 的实打/估值。
  - `monster-db.json`（招式伤害、各遭遇死亡局）、`room-costs.json`（路线投影用的房间成本）、`outcome-stats.json`（A8 遗物行）。
- 口径同上次：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计。A9 汇总是 31 局已结束的 A9（含还没复盘的 9GRPS5DC8KHN、N01X6BBAYMHT、83FLGYXZG9QH、7MDJ256RY2UU，它们只进数字）；进行中的 5NFGDU7BQPD3 不算。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 2e92460），再改。
- 结果：新增 2 条，更新 56 条，退役 0 条；active 196 → 198，总数 217 → 219。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 胧光怪：经验 obscura「寄生惧魔这回合要攻击、一两张牌能打死时先打死它」对 jev-hints obscura-summoner「打胧光怪」（ZY39 打死寄生惧魔 6 次，胧光怪 4 回合 0 伤害） | A7–A9 46 场逐回合。寄生惧魔在场的 165 个回合：打死它的 108 回合，敌方回合平均掉 3.8；没打死的 57 回合掉 9.0，差约 5 血。打死它同时也打胧光怪的回合，胧光怪平均吃 20.5，和没打死它的回合（18.3）差不多；只打它的 33 回合胧光怪 0 伤害。按场：A8–A9 41 场里，胧光怪有 ≥2 回合 0 伤害的 11 场赢 7，赢局中位 9 回合、掉 40（p75 53）；其余 30 场赢 27，4 回合、掉 14（p75 25）；两组进场中位 68%/70%。只看 ≥50% 进场：7 场赢 6、中位掉 53，对 24 场全胜、掉 13。进场 <50% 赢 4/10，≥50% 赢 30/31（旧的「≤38% 必死」不成立：JUXB 25%、RWWG 23% 都赢了）。寄生惧魔每回合都攻击，所以旧句等于「每回合打它」 | 旧经验反了，改写：每回合都要有伤害进胧光怪，寄生惧魔只用多余伤害打，或不打死它这回合要多掉 ≥15 时才打（SK1U T8 −9 对 −32 仍成立）。jev-hints 应改的文字见下 |
| 时钟倍数（insatiable-clock「高估 85%，缺口 ×1.8 读」，deck-clock、giant-deck、crab-dps 的 0.5–0.9） | 现行时钟下，A8 输局实打/估值中位：沙虫 0.95（15 场，0.45–1.68）、帝王蟹 0.83（18 场）、巨兽 0.70（9 场）、异鱼 0.59（5 场）、墨影幻灵 0.56（4 场）、知识恶魔 0.94（12 场）；赢局多 ≥0.8。沙虫 8 场赢局都 ≥0.97；进场时 15 场输局全被报缺口，8 场赢局也有 7 场报缺口。A9：KY3Y 0.66、XMK1 1.30、XTB4 0.37、U6RU 1.45 | 旧倍数是改版前时钟的数，改成现行时钟的数。沙虫不再「×1.8」（这和 `boss-clock.ts` 的拟合一致） |
| A9 二幕走廊代价和投影（PHMV 投影 F24 71% 实到 11%，YQL8、VBHZ） | A9 二幕走廊战内：83 场死 7，赢局中位 −11、p75 −23、p90 −36（A8 440 场死 24，17/25/33）。18 局进二幕，5 局没走到第一个二幕火堆就死（都在第 3–5 场），走到的 13 局到达中位 45%（p25 28%），之前中位打 4 场；A8 103 局 18 局死在前面，到达中位 39%。room-costs A9 二幕走廊净掉血 n=78 中位 6、p75 17。盛碗虫：A9 两只组 9 场都 ≤19，三只组 9 场有 3 场 −46~−49 | 单场不贵，贵在连打：投影按中位逐格连加，连打要按 p75 算。更新 act2-opening、a9-damage、bowlbugs 等 |
| A9 三幕走廊和精英 | 三幕走廊 A9 11 场 0 死，中位 −21、p75 −30（A8 55 场 16/30）；3 局到三幕第一个火堆前打 4–6 场，到达中位 49%（2XWM 投影每场 15%，开局三场 −18/−26/−12）。三幕精英 2 场 2 死（SK1U 机甲骑士 80%、2XWM 三骑士 56%），二幕精英 4 场死 2 | 更新 act3-hallways、owl、a9-damage。三骑士只有 3 场（A8 2 胜），没单立条目 |
| A9 boss 按 boss（37 场） | 一幕 18/27：墨影幻灵 6/7（0H1X 82% 输）、灵魂异鱼 5/6（XTB4 83% 输）、同族 3/5（W2TB 75%、83FL 96% 输）、瀑布巨兽 2/6、族母 1/2、仪式兽 1/1。二幕 3/9：无厌沙虫 2/4（2XWM、7XK6 满血赢；KY3Y 70%、XMK1 100% 输）、帝王蟹 0/3（78–94% 进场都 T5–T6 死）、知识恶魔 1/2。三幕实验体 0/1。≥75% 进场 18/32（二幕 3/8），<75% 3/5。每回合掉血中位 A9 对 A8：帝王蟹 13.8/9.7、同族 9.7/7.3、沙虫 9.5/7.7、墨影幻灵 7.6/5.3、实验体 17/10.1 | 写进各 boss 条目、route-entry-hp、a9-damage。A9 进场血量只是必要条件 |
| 瀑布巨兽 A9 | 6 场赢 2：YQL8 T7 击杀（喷发 35 对 52 血）、8V0H T12；1VX1 T11、9Q7V T14（56 对 29 血 + 21 格挡，差 6）、7MDJ T19 击杀后都被自爆打死，HEAC 没打死。有击杀的 A8/A9 31 场：所需格挡 ≤13 的 18 场赢 17，≥20 的 13 场赢 3 | 更新 giant-explode、giant-deck |
| A9 一幕精英（30 场） | ≥78% 进场 21/21 活（中位 −34），60–78% 7 场死 2（X7LU 68%、N01X 71%），活下来的中位 −46；<60% 2/2 死；战内 p75 −44.5。异鸟 6 场赢 5（中位 −46），骇鳗 5/6（中位 −35），园丁 4/5，异蛙 4/4（−12~−61），雕像 6/6 | 更新 elite-threshold、各精英条目。W2TB、0H1X、XTB4 都在路线投影当作回血的火堆上锻造，更新 rest-before-forced |
| 低语耳环（2XWM；U6W7 A2） | 2XWM 三幕 7 场的第 1 回合一共只打出 1 张牌，第一次出手时 0–1 能量，5 场第 1 回合只剩喝药/结束回合（喝 5 瓶），拿到后 11 层死；U6W7 拿到后 8 层死。MD3F 拿的是赐福鹿角，不是耳环 | 新增 relic-whispering-earring（n=2，中）。`boss-clock.ts` 把它当普通 +1 能量 |
| 王室猛毒（7XK6） | 是遗物，每场开局 −4（7XK6 A9 实测）。A7–A9 有它的 3 局都来自圆桌茶会「喝杯好茶」（回满 + 它）：P2E4 +58、RTF3 +16、7XK6 +18，之后各打 2 场，共 −8；3 局都没通关。DeepSeek 把它当成「回合末在手 −2」的诅咒牌 | 新增 relic-royal-poison（n=3，中） |
| 营养汤（U6RU、VBHZ） | 只附魔基础打击（U6RU 5 张，不是 DeepSeek 以为的 11 张）。A7–A9 拿它的 9 局过二幕 boss 4 局（A8 3/6，A9 0/2），高于 A8 基线 19% | 更新 relic-nutritious-soup：只附魔基础打击；code 的删牌说明仍算永恒打击 |
| 净化对呼唤（XTB4 放掉 89 金的净化） | A7–A9 异鱼战 32 场：牌组有能挑牌消耗的牌（燃烧契约、净化、恶魔之焰、添柴、坚毅+）的 13 场赢 10，没有的 19 场赢 16；VG7H、VL2D 带燃烧契约仍输。净化只在 FA82 一场带进异鱼（赢，17 回合）。输局 6 场都 ≤14.6/回合、≤2 张升级 | 有牌不等于赢，要真用在呼唤上。card-purity 改成「一幕 boss 是异鱼时见到就买」，不写「优先于药水」（没有数据支持） |
| 烫嘴可可（7XK6；PHMV、XMK1 因「41点能量」没选） | 7XK6 沙虫 T1 打 98、实验体 T1 打穿一阶段 102。二幕先古 A7–A9 过二幕 boss：手套 8/20、营养汤 4/9、黄金印 2/6、可可 2/11 | 更新 relic-very-hot-cocoa、neow-growth（观察数据，方向和「成长件优先」一致） |
| 留给 boss 的药（只改数字） | 这 14 局里 13 局有，约 24 瓶；两批合计 30 局 25 局、约 52 瓶。A9 31 局每局走廊/事件战喝 4.9 瓶、精英 0.8、boss 1.3，二幕 boss 进场平均 1.2 瓶（n=9）；A9 ≥75% 进场 boss 0 瓶 2/5、带药 16/27 | 按 Dai 的要求，只更新计数和已有句子里的数字，没有新增喝药规则 |

### 经验库自己带偏的地方
- **obscura**：上次由 SK1U 一回合得出的「寄生惧魔这回合要攻击就先打死它」，和 Jev 的提示正相反。复盘说这条只进 DeepSeek，实际 `fightLessons`（`src/screens/combat-plan.ts:271-293`，挂在题面 `:1805-1809`）在胧光怪战里会把它给 Jev（本地用 HEAD 代码验证过）。ZY39 连续三回合只打寄生惧魔。已改。
- **fysh-damage 的药水统计**：「A8 带药 13/13」是观察数据。XTB4 以它为理由选药瓶皮套、商店买能力药水不买净化；X7LU 也以「异鱼败因就是 0 瓶药」选药瓶皮套。句子没删（Dai 在定喝药的事），在 card-purity 里写明异鱼前见到净化就买。
- **insatiable-clock 的「×1.8」**：这是改版前时钟的数。现行时钟下 A8 沙虫输局中位 0.95，照这个倍数读会把缺口放大近一倍。已改。

### 新增（2）
- **relic-whispering-earring**（relic:WHISPERING_EARRING 低语耳环，n=2，中）：瓦库接管每场第 1 回合，2XWM 三幕 7 个第 1 回合只打出 1 张牌、喝掉 5 瓶；有它的 2 局都在 8–11 层内死。后面还有强制精英/boss 时不选；时钟把它当普通 +1 能量。
- **relic-royal-poison**（relic:ROYAL_POISON 王室猛毒，n=3，中）：遗物，每场 −4，不是诅咒牌；茶会回满换它，剩余战斗 ×4 小于回血量时划算。

### 更新（56）
- **boss：**
  - 胧光怪以外的 boss 条目都加了 A9 数字：giant-explode 18→20、giant-deck 17→19、kin-scaling 19→20、vantom-entry 16→17、vantom-dismember 10→11（A9 肢解 30/32；0H1X 19 张只有 1 张非基础格挡）、fysh-damage 15→17、fysh-beckon 8→9、insatiable-entry 23→27、insatiable-clock 22→24、insatiable-escape 13→15（KY3Y 沙坑先到、XMK1 HP 先到）、crab-entry 29→30、crab-dps 32→33（A9 只活 4–5 回合，要约 90/回合）、crab-potions 16→17（U6RU 3 瓶，只改数字）、crab-kill-order 12→13（54 场，两只一直活着 42 场赢 8，A9 0/3）、ts-phases 10→11（A9 多次爪击每段 11）、lag-entry 14→15。
  - 时钟倍数统一改成现行时钟：insatiable-clock、deck-clock（31→36）、giant-deck、crab-dps、fysh-damage。
- **精英：** terror-eel 20→21、byrdonis 7→9（A9 按 −45~−50 定价）、gardener 16→17、phrog 4→5（中→高）、prism 18→20。
- **走廊：** obscura 15→18（改写）、beetle 29→30、bowlbugs 24→25（A9 三只组按 −45 预留）、hunter-killer 30→31、spiny-toad 17→18（A8/A9 五次死局都 ≤38% 进场）、louse 13→14、ovicopter 7→9（≤32 血进场三局都死）、hopper 17→18、owl 4→6（A9 啄击 24、判决 38）。
- **幕：** act1-costs 14→15、act2-opening 25→28、act3-hallways 13→15、a9-damage 13→27（31 局重算）。
- **药水（只改计数/数字）：** potion-save-for-boss 57→70、potion-empty-slots（A9 数字）、potion-blood 7→9（9Q7V、XMK1 在 boss 里回血溢出，补进已有例句）、potion-fairy 3→4（只加证据）。
- **路线、精英、休息、事件、牌组：** route-entry-hp 42→44、route-no-chains 16→18、route-forced-elite-prep 9→11（VBHZ 精英后紧跟的走廊；YQL8 精灵不算血）、route-shops 15→18（A9 31 局有 7 局带 ≥150 金死）、rest-before-forced 15→18、elite-threshold 26→28、elite-need-one 9→10（A9 0/1/2 只精英：5/22/4 局，过二幕 boss 0/2/1）、elite-no-double 6→7、event-hp-maxhp 12→13、event-stone 2→3（活力 8 是每段 +8）、deck-remove 17→20。
- **卡牌、遗物、先古：** card-purity 2→3、relic-nutritious-soup 2→4、relic-very-hot-cocoa 10→13、relic-seal-of-gold 4→5（中→高，XMK1 二幕约 87 金）、relic-toasty-mittens 20→21（PHMV 二幕 22 回合烧 22 张）、neow-growth（加二幕先古的过关数，n 不变）。

### 退役（0）
没有被推翻到要退役的条目。obscura 的旧结论是就地改写，旧说法记在上表。

### 和手写知识、代码冲突，待改
- `src/knowledge/jev-hints.json:114-118` obscura-summoner：「Damage into it is wasted: attack The Obscura.」方向和改后的 obscura 一致，但说得太绝对（SK1U T8 那种回合打它是对的）。建议改成：「Parafright (21 HP) comes back at full HP the turn after it dies; only The Obscura's death ends the fight. Put damage into The Obscura every turn; hit Parafright only with damage left over, or when leaving it alive costs 15+ more HP this turn. A turn spent only on Parafright saves about 5 HP and adds a turn (A8–A9: fights with 2+ such turns won 7/11 and cost 40 HP, the rest won 27/30 and cost 14).」
- `src/knowledge/ironclad-guide.md:72`：「能在约 3 回合内打死胧光怪就集中打它」。「3 回合」这个条件数据里没有：≤1 回合 0 伤害的 30 场中位打了 4 回合，赢 27。
- rollout 在胧光怪战里把「打死寄生惧魔」的线标成 best（ZY39 T4、T5）：后续回合按 best_order「胧光怪 > 寄生惧魔」模拟，可每回合实际又选打寄生惧魔（`src/strategy/rollout-live.ts:398` pickRolloutBest、`:566` kill order 说明）。
- 低语耳环：
  - `src/strategy/boss-clock.ts:234-237` ENERGY_RELICS 把它当每回合 +1 能量，没扣瓦库的第 1 回合。
  - `src/knowledge/ds-handbook.md:33` 只说不要和自伤牌同带；2XWM 没带祭品/放血也一样丢了第 1 回合。
- `src/strategy/boss-clock.ts:511-512` SOUL_FYSH mechanicFactor 固定 0.82，不看战斗长度和能清呼唤的牌：A8 输局只打出折后估值的 0.53–0.77，XTB4 21 回合 0.37。
- `src/strategy/boss-clock.ts:130-141` bossLossPerTurn 用池化的未格挡比例：XMK1（26 张 7 张格挡）被算成 8.4/回合、能撑 10 回合，实际约 16/回合、第 6 回合死；U6RU 螃蟹算 7 回合，实际 4。和 deck-clock、insatiable-entry 冲突。
- 路线投影：`src/strategy/route-projection.ts:15-16`、`:79-82`、`:127-128` 每个火堆按回血 30% 算，房间中位数逐格连加；`src/screens/map.ts:400`、`:645` 落差不到 30 个点不重问。和 act2-opening、rest-before-forced、elite-threshold 冲突（PHMV、YQL8、VBHZ、W2TB、0H1X、XTB4、X7LU）。
- `src/screens/shop.ts:165-166` 删牌分数和说明把永恒打击算进基础牌（U6RU、VBHZ 营养汤），和 relic-nutritious-soup 冲突。
- `src/screens/event.ts:195-197` 事件选项只给附魔名补说明，遗物名（王室猛毒）不补（7XK6）。
- `src/project/run-journal.ts:180` SOUL_FYSH 的 BOSS_NOTE「用消耗牌清掉」：按 fysh-beckon，只有「从手牌消耗别的牌」的牌能清，自消耗牌不行。
- 手册里引用的 n 已过时（测试只查 id 存在）：
  - `ironclad-guide.md:36`：rest-before-forced n=14→18，rest-smith-threshold n=28→34。
  - `ironclad-guide.md:39`：potion-save-for-boss n=33→70。
  - `ds-handbook.md:38`：elite-threshold n=20→28。
  - `ds-handbook.md:40`：rest-smith-threshold n=28→34，rest-before-forced n=14→18。
- 上次列的几条（巨兽喷发式、ds-handbook 的巨兽升级数、run-journal 的巨兽/实验体笔记）这次没有复查。

### 代码问题（不给 DS）
按复盘里写的状态，不重新核实：
- **已修：**
  - iconsToText「41点能量」（a84702a）。
  - eruptionRace 用当前 HP、A8 喷发式（a84702a，9Q7V）。
  - 呼唤、无实体、沙虫当回合力量进 rollout（1ff3aa8）。
  - enemy_threat_next 按面板力量（1ff3aa8）。
- **已批、待合并：** 同分喝药线标「tied」（14:00 Dai，batch B）。KY3Y、YQL8、XTB4、XMK1 都出现同分喝药线被标 best。
- **新发现：**
  - 饱和时按敌人总血量挑 best：算进随从（W2TB 同族），也不算分段 boss 后面的阶段（7XK6 实验体）。
  - pendingDrinks：Jev 线被抽牌打断后照样代喝回血药（XMK1）。
  - Jev 的线打完后，code 重新规划，补打 Jev 否掉的那条更长的线；求解器不读连环拳（9Q7V）。
  - 巨兽自爆回合 rollout 认不出残骸（YQL8）。
  - 燃烧契约的 least-loss 消耗掉 1 费的狂乱逃离（KY3Y）。
  - 商店题不给卡牌费用和类型（U6RU）。
  - askJson/choose 解析失败丢推理和 usage（VBHZ、0H1X）。
  - 附魔正则认不出「附魔一张攻击牌：活力8」（PHMV）。
  - 送货员补货让一次性商店计划整单重问（7XK6）。
  - 选择悖论被当成「以后才揭晓」多问一次（7XK6）。
  - rollout 超预算整体退成 1 回合，并写「所有线掉光」（X7LU）。
  - report.py 在 CARD_SELECTION 行处把一场战斗切成几段（2XWM、PHMV）。
- **已知、未修：**
  - 瓶中精灵、蜥蜴尾巴的复活被当成死亡（YQL8，一致性复查第 2 条）。
  - guardKeepsPick 的 focus 保护（YQL8，同 SK1U）。
  - run plan 点名的药在 FIGHT_PLAN=off 时没有保护（Dai 待定）。
- **测试：** `tests/oneshot-act-start.test.ts:115` 在 v3 2e92460 上就失败（用 v3 原样的 experience.json 同样失败；把 room-costs.json 换回 2e92460^ 就通过），和这次改动无关，没有动。这次 vitest 940/941 通过，tsc 通过。

### 切片大小
用新抽的一批样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个，从 states.jsonl 用固定种子 20260929 抽取，不含进行中的局。同一批状态分别用改前（v3 2e92460）和改后（d986a74）的 experience.json 跑 `tools/knowledge-slice.ts`，数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.1k / 4.8k | 3.3k / 5.0k | 3.3k / 5.0k | 3.6k / 5.3k |
| 奖励 | 4.0k / 5.3k | 4.2k / 5.5k | 3.9k / 5.5k | 4.1k / 5.8k |
| 地图 | 4.3k / 4.7k | 4.7k / 5.3k | 4.3k / 5.0k | 4.8k / 5.4k |
| 事件 | 3.9k / 5.1k | 4.0k / 5.5k | 4.5k / 5.5k | 4.6k / 5.9k |
| 火堆 | 3.0k / 4.7k | 3.2k / 4.9k | 3.2k / 4.7k | 3.3k / 5.0k |
| 商店 | 4.9k / 5.3k | 5.1k / 5.5k | 4.8k / 5.4k | 5.0k / 5.5k |

- 初稿中位涨了 0.2–1.0k，最大到 6.5k（A9 事件）。
  - 主要来自一幕精英、二幕走廊条目和 rest-before-forced：它们几乎出现在每个一、二幕切片里。
  - 之后把这些条目新增的 A9 细节压成一句，逐回合、逐局的数字留在本节。
- 最终中位涨 0.1–0.5k，最大 5.9k。最大的是 XMK1 F18 二幕先古事件：25 条经验加 13 行统计，改前在这批样本里是 5.5k。
- 条目数：active 198（测试上限 200）；置信度 高 129、中 58、低 11。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：这次没有新增 boss、精英、走廊条目，帝王蟹的 4 条都在（测试钉住）。胧光怪战里 Jev 看到的就是改写后的 obscura。

## 2026-09-29 第五次增量：11 局 A9（version 2026-09-29.4，分支 exp-update，a2edb85）

### 来源
- `notes/lessons.md` 末尾的 11 节 A9 复盘，全输：9GRPS5DC8KHN（F29 猎人杀手走廊）、N01X6BBAYMHT（F9 鬼祟珊瑚群）、83FLGYXZG9QH（F17 同族）、7MDJ256RY2UU（F17 瀑布巨兽自爆）、5NFGDU7BQPD3（F17 瀑布巨兽自爆）、0NZBAVFAT3JG（F25 残杀千足虫）、2ZCKFSKXTL4E（F17 瀑布巨兽自爆）、7KDMKN16GD6B（F27 蜂群术士）、3SBPKG9603WD（F17 墨影幻灵）、KYC0RYEN0NVW（F28 残杀千足虫）、2MK4V7V3Q5BM（F8 方柱构装体走廊）。9GRP、N01X、83FL、7MDJ 上次只进数字，这次作为证据局。复盘末尾的两条勘误（2ZCK「还差 7」、3SBP 异鸟中位 46、招式名；7MDJ 逐回合数、5NFG「唯一达到估值」作废）按勘误后的数用。
- 日志（只读，流式读取）：
  - states.jsonl 从 A9 第一局（7B0D，字节偏移约 3.388e9）起 seek，一遍抽出 A9 全部战斗和每层第一帧/最后一帧（HP、金币、药栏、牌组升级数、遗物、屏幕序列）。战斗切分和房间类型照 `tools/build-monster-db.py`（战后第一个 MAP 帧的当前节点；死亡战按 game-data 的怪物类型）。用同样口径重算上次的 31 局，二幕走廊 83 场死 7、中位 11/p75 23/p90 36，一幕精英 30 场、赢局 34.5/44.5，二幕开局 18/5/13/45%，都和上一节一致。
  - `tools/boss-fights-extract.py --asc 9`（在 A9 那段的副本上跑）+ `tools/boss-clock-calibrate.ts --rows`：按现行时钟（v3 cf87de6）重算 A9 一幕 boss 35 场的实打/估值。
  - runs.jsonl 定输赢和进阶；`monster-db.json`（v3 038a66e 刷新，已含这 40 局）只用来对数，和抽取结果一致（珊瑚群 A9 5 场死 1、赢局中位 43.5；缩小甲虫 + 毛绒伏地虫 A9 7 场中位 30/p75 38 等）。
- 口径同上次：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房（问号房的战斗不算）。A9 汇总是截至 17:39 runs.jsonl 里 40 局已结束的 A9（含还没复盘的 AD5P89DBLM22 F22 甲虫组、CJ88575SQS6H F23 猎人杀手，只进数字）；之后开跑的 KTRT1M2SVVL3 不算。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 cf87de6），再改。
- 结果：新增 1 条，更新 43 条，退役 0 条；active 198 → 199，总数 219 → 220。
- 药水的处理（按 Dai 的要求）：potion:* 和 general:potion 条目只改句内数字，不加证据局（n 不变）；其他条目里原有的喝药/留药分句一字不改，新加的证据只写非药水的部分。没有新增或加强任何「什么时候喝/别喝」的说法。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 瀑布巨兽 A9（8 场） | 赢 2（YQL8 T7、8V0H T12 击杀）。5NFG、2ZCK 满血进场，击杀前每回合 29.4、28，T9、T10 击杀，击杀时 14、20 血对喷发 41、44：5NFG 击杀前 8 回合掉 66（整副牌只有 4 张防御，T10 手里 0 格挡），2ZCK T5 水枪 23、T6 加压 14 两回合 0 格挡掉 37。7MDJ 101/101 进场、19 张 0 升级 0 删牌，T1–T10 每回合 18.2，T19 才击杀（26 血 + 12 格挡对 71）。A8/A9 有击杀的 33 场：所需格挡 ≤13 的 18 场赢 17，≥20 的 15 场赢 3（新增两场都 ≥20：27、24）。现行时钟下 A9 输局实打/估值 0.43–0.91（中位 0.73），赢局 0.87、0.55 | A9 光打得快不够，击杀回合的 HP 同样决定输赢。更新 giant-explode、giant-deck |
| A9 一幕 boss（35 场） | 过关 23/35：异鱼 8/9、墨影幻灵 7/9、族母 2/3、同族 3/5、仪式兽 1/1、巨兽 2/8。现行时钟实打/估值：赢局中位 0.98（23 场），输局 0.61（12 场）；进场时 12 场输局有 9 场被报缺口，23 场赢局有 10 场被报「够」。墨影幻灵输的 0H1X、3SBP 都 ≥82% 进场（3SBP 0.53：19 张只有 2 张多段，T1–T5 只打进 9，滑溜清掉后 23.6/回合），<75% 的 QUG1、CJ88 都赢。同族 83FL 96% 进场、0 张永久力量，打进神官 18.9/回合（前 6 回合 22），估值 0.75。族母 0NZB 90% 进场 1.46。异鱼新增 3 场都 ≥93% 进场、20–28/回合赢 | 更新各 boss 条目。墨影幻灵在 A9 不看进场血量，看多段和格挡 |
| 进场血量（A9 45 场 boss） | ≥75% 进场 22/39（二幕 3/8），<75% 4/6（赢的 4 场都在一幕：QUG1、CJ88 墨影幻灵，VSRG 异鱼，VBHZ 族母）。一幕 boss 赢局平均进场 90%、输局 88%；二幕 97% 对 87%（n=3/6）。≥94% 进场输的：XMK1、U6RU、83FL，另有 7MDJ、5NFG、2ZCK 三局满血输给巨兽 | route-entry-hp 的「A9 血量只是必要条件」改成「不是充分条件」：<75% 4/6 撑不起「必要」 |
| 永久力量（A9 一幕 boss 35 场） | 牌组里 0 张燃烧/恶魔形态/撕裂/烙印/与我一战！ 6/15 赢，1 张 14/17，≥2 张 3/3。新批的输局 83FL、7MDJ、3SBP、5NFG 都是 0 张，2ZCK 1 张（撕裂） | 写进 act1-strength（观察数据） |
| A9 二幕精英（8 场死 5）和三幕精英（2 场死 2） | 千足虫 0/2：0NZB 69/80 进场、24 张 2 升级，4 回合 10/24/21/9（需 36.5）；KYC0 56/80（F24 强制棱柱 54→2 后两次回血）、有闪电霹雳、飞剑回旋镖、突破，T1 喝无色药水拿到滚石，3 回合 27/回合（需 48.7）。蜂群术士 0/2：7KDM 63/80，6 张多段/AOE，7 回合塞 19 张晕眩，打到它剩 15。棱柱 4 场赢 3，KYC0 68% 必经进场 −52 剩 2 | 更新 decimillipede、entomancer、prism；entomancer-cost 只加数字 |
| A9 一幕精英（37 场） | 赢局中位 −33、p75 −38、p90 −51（上次 30 场 34.5/44.5，新增 7 场掉 12–35）。≥78% 进场 27/27 活（中位 −30），60–78% 8 场死 2（X7LU 68%、N01X 71%），<60% 2/2 死。骇鳗 8 场赢 7（中位 −34），异鸟 7 场赢 6（赢局中位 −42，83FL 92% −46），园丁 6 场赢 5，珊瑚群 5 场死 1（N01X 71%、0 升级；赢局 33/35/52/61），异蛙 5/5 | 更新 elite-threshold、act1-costs、各精英条目。p75 下降使「≥2× p75」的读数从超过满血变成约 95% |
| 一幕精英数（A9 40 局） | 按一幕精英数，过一幕 boss/过二幕 boss：0 只 8 局 4/0，1 只 27 局 16/2，2 只 5 局 3/1。2ZCK 0 精英、3 件遗物进巨兽，时钟整幕差 11–24/回合 | 更新 elite-need-one、elite-no-double 的数字 |
| 二幕开局和走廊（A9） | 23 局进二幕，8 局死在第一个二幕火堆之前（都在第 3–5 场），走到的 15 局中位 45%（p25 25%），之前中位打 3 场。二幕走廊 97 场死 9，赢局中位 −12、p75 −22、p90 −35。KYC0 的二幕图从起点出发 120 条路，每条都有 ≥2 只精英（2 只 56、3 只 52、4 只 12）；0NZB 选的路第一只精英前 0 个火堆，act plan 却写「skip act-2 elites」。猎人杀手 9 场死 2（9GRP 49/93、CJ88 11/80）；甲虫组 5 场死 2（ETYC 13/80、AD5P 29/87）；啃咬机 3 场都活、掉 16–30 | 更新 act2-opening、a9-damage、route-forced-elite-prep、hunter-killer、beetle、chomper、bowlbugs |
| 一幕走廊（A9 194 场） | 中位 −8、p75 −13，死 1（2MK4 11/80 进构装体）。贵的两组：缩小甲虫 + 毛绒伏地虫 7 场中位 −30、p75 −38（A8 12 场 15/20），藤蔓蹒跚者 6 场中位 −16.5、p75 −21。N01X 路线按每场约 −2 投影，F8 火堆到场 41%（投影 68%）；2MK4 第一个火堆（F9）前 6 场走廊，F6 −25、F7 −24，F7 到场 44%（投影 70%）、F8 14% 进场死 | 更新 act1-costs、route-no-chains。两组贵的走廊已在 monster DB 的「危险走廊」行里，没有单立条目 |
| 一幕锻造（A9 35 局到一幕 boss） | 一幕 0 次锻造 6/8 过一幕 boss，≥1 次 17/27；进一幕 boss 时 0–1 张升级 9/16、2 张 5/8、≥3 张 9/11。0NZB 整局 0 锻造（F11 73% 时 code rank 1 是锻造，DeepSeek 回血），进二幕时时钟差 16/回合 | A8 的「0 次 67%、≥1 次 77%」在 A9 方向相反，写进 rest-smith-threshold（观察数据，n 小） |
| 火堆与投影（7KDM、5NFG） | 7KDM F24 63/80 锻造踩踏，3 层后必经精英；act plan 投影按 F24 回血算精英到场 80，实到 63，蜂群术士剩 15 时死。5NFG F16 60/80 回血到 80，缩放仪（boss 开场回血）满血进场时白给，F15 商店时 DeepSeek 自己算过「60→80 封顶」 | 更新 rest-before-forced、relic-pantograph |
| 羽翼之靴（9GRP） | 涅奥选它（「3 次越线躲 A9 强制精英」），整局只用 1 次；F28 22/93 回血到 49 后按原路进猎人杀手死，下一行有越线可到的 (11,2) 火堆，死时还剩 2 次 | relic-winged-boots 加反方向的证据（花不出去）|
| 蜂群术士与多段、无惧疼痛（7KDM） | 飞剑回旋镖 ×2、双重打击、匕首雨、踩踏+、突破，每段一张晕眩：T1 回旋镖 3 张、T2 6 张、T3 5 张，到 T8 共 19 张。无惧疼痛在场时回合末消耗的虚无牌（晕眩、笨拙、进阶之灾）给了 9、12、12 格挡，求解器和 rollout 都没算 | 更新 entomancer、card-sword-boomerang、card-feel-no-pain |
| 滚石（83FL、KYC0） | KYC0 千足虫 T1 打出，第 2、3 回合开头对三节合计打 15、30（81 伤害里 45）。83FL 同族 T1 手里有滚石、灯笼给的第 4 点能量正好打得出，没打：rollout 不模拟它，四条线饱和，按「T5 神官剩血」排，滚石线垫底；按牌面信徒 T6 开头累计 75 就死，神官到 T7 多吃约 105，实际神官剩 67 时我方死 | 新增 card-rolling-boulder（n=2，中） |
| 删牌与格挡（7MDJ、5NFG、KYC0） | 7MDJ F8 188 金、code 删牌排第 1 没删，5 张打击进巨兽；5NFG 两次商店删牌排第 2 没买，run plan 三次写补格挡（F11「add ~4 block cards」），F11 放掉邪眼，进巨兽只有 4 张防御；KYC0 三次商店 0 删牌 | 更新 deck-remove、deck-block-floor、giant-deck |
| 留给 boss 的药（只改数字） | 这 11 局里 10 局有，约 18 瓶（0NZB 2、2ZCK 1、7KDM 2、3SBP 1、9GRP 2、83FL 2、7MDJ 2、5NFG 3、KYC0 2、2MK4 1）；三批合计 41 局 35 局、约 70 瓶。按 rollout 多数省 0–5 血，这批最多一瓶约 13（7KDM F21 能量药水）。A9 40 局每局走廊/事件战喝 4.6 瓶、精英 0.7、boss 1.3，二幕 boss 进场平均 1.2 瓶（n=9，没变）；A9 ≥75% 进场 boss 0 瓶 2/5、带药 20/34 | 只改 potion-save-for-boss、potion-empty-slots 句内数字；n 不变。7KDM 带着为帝王蟹买的能力药水死在蜂群术士（5 次作为选项、Jev 没选），2ZCK 走廊喝掉的鲜血药水回 16、自爆差 11，这些只记在这里 |

### 经验库自己带偏的地方
- **elite-need-one / elite-threshold 两头拉**：N01X F1 DeepSeek 选 rank 7/8 的两精英路线，理由「0-elite act-1 is the known loss pattern」，F9 71% 进精英死；2ZCK 以「A9 elite at 70% arrival unsafe」选 0 精英，3 件遗物进巨兽；2MK4 为避开「A9 death zone」的精英到场血量，选了第一个火堆前 6 场走廊的路。两条条目各自成立，合起来只比了精英到场血量，没比精英前的走廊链。这次在 act1-costs、route-no-chains 补了 2MK4、N01X 的投影偏差，没改两条精英条目的结论。
- **route-entry-hp**：「A9 血量只是必要条件」来自上次 <75% 3/5；这次 4/6，都在一幕。改成「不是充分条件」。
- **vantom-entry**：3SBP DeepSeek F16 引用「墨影幻灵 ≥75% 进场 17/19 胜」（A8 数），87% 进场输。A9 两场输局都 ≥82% 进场，已写进条目。
- **giant-explode**：「A9 约 29/回合」是上次按击杀回合反推的输出目标；5NFG 打出 29.4 仍死。已补上击杀回合 HP 的两个反例。
- **7KDM F8**：DeepSeek 在「这个还是那个？」想了 240.7 s，推理里两条经验互相拉（event-curses「不拿诅咒换随机遗物」对「没有商店时不拿血换金币」）。两条都没改，只记在这里。

### 新增（1）
- **card-rolling-boulder**（card:ROLLING_BOULDER 滚石，n=2，中）：多体战里的持续群伤，KYC0 3 回合打 45；83FL T1 有能量没打（rollout 不模拟），按牌面信徒 T6 开头就死。

### 更新（43）
- **boss：**
  - giant-explode 20→22（5NFG、2ZCK；有击杀的 33 场、≥20 格挡 15 场赢 3；A9 8 场赢 2）、giant-deck 19→22（7MDJ、5NFG、2ZCK；A9 输局 6 场 0.43–0.91）。
  - vantom-multihit 8→9、vantom-entry 17→18（3SBP；A9 9 场赢 7）。
  - fysh-beckon 9→10（7KDM；A7–A9 有能清呼唤的牌 15 场赢 12、没有 20 场赢 17）、fysh-damage 17（只改数字：A9 9 场赢 8）。
  - lag-entry 15→16（0NZB）、kin-scaling 20→21（83FL）、beast-clock 8→9（9GRP）。
- **精英：** decimillipede 22→24、entomancer 17→18、entomancer-cost 14（只改数字）、prism 20→21、terror-eel 21→23、gardener 17→18、skulking-colony 14→17、byrdonis 9→11、phrog 5（只改数字）。
- **走廊：** hunter-killer 31→32、chomper 9→10、bowlbugs 25→26、beetle 30（只改数字：AD5P）。
- **幕：** act1-costs 15→17、act1-strength 8→12、act2-opening 28→30、a9-damage 27→38（40 局重算）。
- **路线、精英、休息：** route-entry-hp 44→48、route-no-chains 18→19、route-forced-elite-prep 11→14、elite-threshold 28→29、elite-need-one 10→11、elite-no-double 7（只改数字）、rest-before-forced 18→19、rest-smith-threshold 34→35。
- **牌组、卡牌、遗物：** deck-clock 36→38、deck-remove 20→23、deck-block-floor 12→13、card-feel-no-pain 5→6、card-sword-boomerang 6→7、relic-winged-boots 3→4、relic-pantograph 2→3。
- **药水（只改数字，n 不变）：** potion-save-for-boss 70、potion-empty-slots 21。

### 退役（0）
没有被推翻到要退役的条目。route-entry-hp 的 A9 句子是就地改写。

### 和手写知识、代码冲突，待改（没有改动）
- 瀑布巨兽「要早杀」：`src/knowledge/ironclad-guide.md:55`（「要赢靠早杀……慢打是输法」）、`:120`、`src/knowledge/ds-handbook.md:71`、`src/project/run-journal.ts:181`（BOSS_NOTES「要早杀……要抢伤害」）都只引 A8 的「T10 前击杀 13/15 赢」。A9 T10 前击杀 1/3（YQL8 赢，5NFG T9、2ZCK T10 输），输的两局都是击杀回合 HP 不够。`src/knowledge/jev-hints.json:110` giant-eruption「Kill it by turn 10, with HP plus block above the stacks」两半都写了，和数据一致。
- `src/knowledge/ds-handbook.md:75` 感染棱柱「多次掉 22~40 血」：A9 赢的 3 场掉 42、56、52（KYC0 必经进场剩 2 血），另一场死。
- `src/knowledge/jev-hints.json:140` hp-trade-boss「Prefer lower hp_lost unless the line kills soon」：3SBP 墨影幻灵 T1 按它选了 0 掉血、只打 2 段的线（rollout best 是 −8、4 段的线，滑溜多留 2 层）；同批 2ZCK 巨兽 T5 没按它（选了 −23 的伤害线）也输了。滑溜回合是它的反例，其余回合没有反例。
- `src/knowledge/ds-handbook.md:40`「蜂群术士已经 3 次致死」：monster DB A7–A9 已 9 次（A7 3、A8 4、A9 2）。
- `src/knowledge/ironclad-guide.md:52`「同族神官：……长战先杀信徒（先杀左边）」和 `:98`「先杀信徒能减少受到的伤害」：和 kin-priest-focus（已退役的 old-kin-followers-first）相反，是旧矛盾，不是这批数据带出来的；83FL 全压神官、信徒没掉血，输在输出（22/回合，需 33）。
- `src/knowledge/ds-handbook.md:37`「进 boss 血量：赢局平均 88%，输局 81%」：A9 一幕 boss 赢局 90%、输局 88%，差距几乎没有（不算矛盾，数字过时）。
- 代码（cf87de6 上核对过存在）：
  - `src/screens/rest.ts:42` beforeBoss 只看「boss 在 2 层内」或下一格强制，3 层外的必经精英不算（7KDM F24），和 rest-before-forced 冲突。
  - `src` 里没有 PANTOGRAPH（只在 knowledge JSON），火堆分不看 boss 开场回血（5NFG），和 relic-pantograph、rest-by-boss-loss 冲突。
  - `src` 里没有 WINGED_BOOTS，路线候选不含越线节点（9GRP），和 relic-winged-boots 冲突。
  - ROLLING_BOULDER 只在 `src/strategy/card-model.ts`（lasting value），rollout 不模拟（83FL），和 card-rolling-boulder 冲突。
  - `src/strategy` 里没有虚无（ethereal）牌回合末消耗这一步，无惧疼痛少算格挡（7KDM），和 card-feel-no-pain 的新句子对应。

### 代码问题（不给 DS）
按复盘里写的状态，不重新核实（修复进度以 `notes/fix-queue.md` 为准）：
- 0NZB：mod 从不给 `cards_exhausted_this_turn`，消耗后重问的回合 exhaustedThisTurn 恒为 false；佩尔的士兵的格挡翻倍没建模，线的掉血两头算错。
- 2ZCK：巨兽竞速的 rollout best 由地平线外胜率决定，题面只给 5 回合内的数；选项没有「击杀回合 HP − 喷发」一列。
- 7KDM：rollout 的 dazedPerHit 没把两条线分开；lookahead「下一个节点强制」按类型去重（`src/project/run-journal.ts` 同类型出口被写成强制）。
- 3SBP：thrashAbsorb 把吸收的伤害加到当回合，造成假斩杀；withPotionLines 补进 0 效果的喝药线（肌肉药水在所有攻击之后）。
- 9GRP：run plan 回声 `{"choice","reason"}` 被当成空计划覆盖有效计划（deepseek.ts pickJsonObject、loop.ts ensureRunPlan）；大～抱抱的煤灰、抱抱先生、招架盾不进 rollout。
- N01X：原始力量不建模，least-loss 把它排最后，漏掉斩杀；rollout 8 样本里 1 个死亡就改变 best。
- 83FL：run plan 的 boss_prep 到不了 Jev。
- 7MDJ：斗篷扣不建模（每回合多报 2–4 掉血）。
- 5NFG：巨兽战 rollout 饱和后只按剩血挑 best。
- KYC0：千足虫三节同名，选线文字、focus、kill order 分不清；boss 满血回合 HP 护栏两次换掉 rollout best；药栏满时事件给的药被直接丢掉（`src/screens/reward.ts`）。
- 2MK4：选牌界面（头槌）清掉 combatPlan memo，回来后重规划、多掉 5。

### 测试
- exp-update（a2edb85）：`tsc --noEmit -p tsconfig.json` 退出 0；vitest 58 个文件 1050/1050 通过，退出 0。`tsc -p tsconfig.test.json` 在 cf87de6 上本来就报测试文件的类型错误（journal-replay、potion-mc、route-projection、screens、turn-solver），和这次只改 JSON 无关，没有动。
- 合入 v3（在 `ops/v3-merge.lock` 锁里）：等 v3 的知识构建脚本跑完，先提交 v3 里刷新的知识数据 2092e43「Refresh knowledge data」（boss-damage、card-upgrades、monster-db、move-model、outcome-stats、room-costs），再 `git merge --no-edit exp-update` 得到 3e41460；v3 上 `tsc --noEmit -p tsconfig.json` 退出 0，vitest 1050/1050 通过，退出 0。对局在 v3 里照常跑，没有停。

### 切片大小
新抽一批样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个，从 states.jsonl 用固定种子 20260929 抽取（只取已结束的局）。和上次不是同一批，所以「改前」重新测。同一批状态分别用改前（cf87de6）和改后（a2edb85）的 experience.json 跑 `tools/knowledge-slice.ts`，数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.1k / 5.0k | 3.3k / 5.4k | 3.4k / 5.3k | 3.6k / 5.7k |
| 奖励 | 3.7k / 5.7k | 3.9k / 6.1k | 3.7k / 5.4k | 4.1k / 5.8k |
| 地图 | 4.9k / 5.4k | 5.4k / 6.0k | 5.0k / 5.4k | 5.4k / 6.0k |
| 事件 | 4.1k / 5.5k | 4.2k / 5.8k | 4.0k / 5.2k | 4.3k / 5.5k |
| 火堆 | 2.9k / 4.9k | 3.2k / 5.3k | 2.9k / 4.9k | 3.2k / 5.3k |
| 商店 | 5.0k / 5.6k | 5.1k / 5.7k | 5.2k / 5.5k | 5.3k / 5.7k |

- 初稿中位涨 0.2–0.9k，最大 6.4k（A8 地图）。主要来自 act1-costs、rest-smith-threshold、route-forced-elite-prep、act1-strength、rest-before-forced：它们几乎出现在每个一幕切片里。之后把逐局细节压成一句，逐回合、逐局的数字留在本节。
- 最终中位涨 0.1–0.5k，最大 6.1k：R2H1 A8 F19 二幕卡牌奖励（25 条经验 + 4 行统计，改前 5.7k）。
- 条目数：active 199（测试上限 200，下次新增前要先退役或合并）；置信度 高 129、中 59、低 11。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：新增的是卡牌条目，没有新增 boss、精英、走廊条目。

## 2026-09-29 第六次增量：5 局 A9（version 2026-09-29.5，分支 exp-update，3ddb1c9）

### 来源
- `notes/lessons.md` 末尾的 5 节 A9 复盘，全输：AD5P89DBLM22（F22 熟睡甲虫组）、CJ88575SQS6H（F23 猎人杀手）、KTRT1M2SVVL3（F23 熟睡甲虫组）、ZGZ0EQDDNJPT（F17 同族）、QBCV838592ZQ（F17 乐加维林族母）。AD5P、CJ88 上次只进数字，这次作为证据局。
- 日志（只读）：
  - 沿用上次的抽取脚本，从 states.jsonl 字节偏移 3.38e9 起流式读一遍，抽出 A9 全部战斗和每层第一帧/最后一帧。同样口径重算上次的 40 局，一幕走廊 194 场死 1、中位 8/p75 13，一幕精英 37 场死 4、33/38/51，二幕走廊 97 场死 9、12/22/35，二幕开局 23/8/15/45%，一幕精英数 8/27/5，都和上一节一致。
  - `tools/boss-fights-extract.py --asc 9`（在 A9 那段的副本上跑）+ `tools/boss-clock-calibrate.ts --rows`：按现行时钟（v3 c605500）重算 A9 一幕 boss 41 场。
  - runs.jsonl 定输赢；`monster-db.json`（v3 ba9ccc6，已含这 46 局）取 boss 每回合掉血，和抽取结果对数。
- 口径同上次：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房，问号另算。A9 汇总是截至 19:05 runs.jsonl 里 46 局已结束的 A9：含还没复盘的 Y36HXZ80A8LL（F25 残杀千足虫）、WQ67U1UY1D8V（F17 族母）、8KD7ENEY773Y（F30 残杀千足虫），这 3 局只进数字；之后结束的 RHNEWJVRW132 不算。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 c605500），再改。
- 结果：新增 0 条，更新 43 条，退役 1 条；active 199 → 198，总数 220 不变。
  - 更新里 26 条加了证据局，15 条只改数字，2 条只改已被代码修掉的说法。
- 药水的处理（照上次）：
  - potion:* 和 general:potion 条目只改句内数字，不加证据局（n 不变）。potion-code-discard 虽然是 general:plan，也按药水类处理，没动。
  - 其他条目里原有的喝药/留药分句一字不改，新加的证据只写非药水的部分。
  - 没有新增或加强任何「什么时候喝/别喝」的说法。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 二幕开局和走廊链（AD5P、CJ88、KTRT） | A9 26 局进二幕，9 局死在第一个二幕火堆之前（都在第 3–5 场），走到的 17 局中位 44%（p25 22%）。三局都走 0 精英路线：AD5P F19 52/87 改线进 F20–F24 五连怪，每场按 −6 投影，F22 投影 46%、实到 33%；CJ88 act-plan 选 code rank 4 的 p4（火堆前 5 怪 2 问号），F23 投影 64%、实到 14%；KTRT p4 两个问号按 0 算，F23 投影 82%、实到 62%。二幕走廊 105 场死 10，赢局中位 −12、p75 −22、p90 −36。二幕问号 70 个（不含死在里面的）有 12 个开出战斗，赢局中位 −21.5、p75 −27，比二幕走廊贵；其余中位 0 | 更新 act2-opening、route-no-chains |
| 二幕选线：精英还是走廊（A9 26 局） | 二幕 0 精英的 17 局：9 局死在走廊、5 局死在 boss、3 局过二幕 boss。打了 ≥1 只二幕精英的 9 局：7 局死在精英（千足虫 4、蜂群术士 2、棱柱 1），1 局死在走廊，1 局死在 boss，0 局过二幕 boss。AD5P、CJ88 的 act run plan 都写 elites avoid；KTRT 选 p4 的理由是「p4 skips A9 act-2 elites」 | 写进 act2-opening（观察数据）。两边都在死，精英条目没改 |
| 熟睡甲虫 + 两只盛碗虫（A9 6 场） | 赢的 3 场 65–90% 进场、各 −35~−36。死的 3 场：ETYC 16%、AD5P 33%、KTRT 62%。KTRT 7 回合打掉 84/179（12/回合），丝碗虫 0 伤害，甲虫剩 54。战斗里代码按精英打（`combat-plan.ts:690` HALLWAY_ELITES），路线投影按普通走廊中位算 | beetle：「≥60% 进场能赢」改成 A8 的数，A9 写明 62% 也死 |
| 其他二幕走廊 | 猎人杀手 10 场死 2，赢局中位 −18、p75 −29.5（CJ88 11/80 进场）。偷窃草蜢 15 场（含问号）中位 −12、p75 −19（AD5P −29、KTRT −19）。虱虫之祖 7 场全胜，中位 −20（AD5P −26）。直飞产卵虫 7 场死 1，赢局中位 −22（CJ88 32/80 进场打到 5）。三只盛碗虫组 10 场有 4 场 −46~−49，都是 70–73% 进场；≥79% 进场的 5 场都 ≤21（Y36H 只进数字） | 更新 hunter-killer、hopper、louse、ovicopter、bowlbugs。ovicopter 的「≤32 血进场三局都死」改成 4 局死 3 |
| A9 一幕精英（43 场） | 赢局中位 −32、p75 −38、p90 −50。≥78% 进场 33/33 活（中位 −30），60–78% 8 场死 2，<60% 2/2 死，分组结论和上次相同。新增 6 场都 ≥86% 进场：异蛙 KTRT −33、ZGZ0 −50（牌组 0 张 AOE，9 回合）；珊瑚群 QBCV −32；Y36H 园丁 −23、骇鳗 −11；8KD7 骇鳗 −28（后 3 场只进数字） | 更新 elite-threshold、act1-costs、phrog、skulking-colony、terror-eel、gardener |
| 二、三幕精英 | 12 场死 9。千足虫 A9 4 场 4 死，新增的两场 Y36H 69%、8KD7 92% 进场（只进数字），3、4 回合死，三节合计还剩 104、90 | decimillipede、a9-damage 只改数字 |
| 同族（ZGZ0；A9 6 场） | 赢 3。ZGZ0 72/80 进场，17 张 2 升级，0 张永久力量。6 回合打出 256：进神官 152（25.3/回合），进信徒 104（T1 34、T2 24、T4 24、T5 22），神官剩 47。时钟「需 43、估 27」，实打/估值 0.94。83FL 正相反：全压神官、信徒 0 伤害，22/回合。monster DB 的 A9 同族每回合掉血 10.7（A8 7.3） | kin-scaling、kin-priest-focus 加 ZGZ0；a9-damage 改数字 |
| 族母（QBCV；A9 5 场） | 赢 2（VBHZ 74%、0NZB 90%），输 3（BXAZ 65%、QBCV 100%、WQ67 100%，WQ67 只进数字）。输的 3 场 T1–T2 都是 0 伤害，牌组没有力量牌：QBCV 唯一的能力牌是岩石铠甲，WQ67 15 张 2 升级。醒后 QBCV 18.9/回合，WQ67 约 12。0NZB T1 打掉 60（26%）把它打醒，8 回合 29/回合赢。QBCV 的时钟从 F6 起报「需 21、估 21–22」，现行时钟实打/估值 0.75；WQ67 0.56 | lag-race 加 QBCV；lag-sleep 加 QBCV，0NZB 记为反例；lag-entry 改数字 |
| 一幕 boss 进场血量、永久力量、锻造（A9 41 场） | 过关 26/41，赢局平均进场 90%、输局也是 90%。全部 A9 boss 51 场：≥75% 进场 25/45，≥90% 进场 29 场赢 18。永久力量（燃烧/恶魔形态/撕裂/烙印/与我一战！）：0 张 7/19，1 张 15/18，≥2 张 4/4；新输的 ZGZ0、QBCV、WQ67 都是 0 张。一幕锻造 0 次 6/8、≥1 次 20/33；进 boss 时 0–1 张升级 11/18、2 张 5/10、≥3 张 10/13 | act1-strength、route-entry-hp、rest-smith-threshold 改数字；act1-strength、route-entry-hp 加 ZGZ0、QBCV |
| 时钟（现行 c605500，A9 一幕 boss 41 场） | 实打/估值：赢局中位 1.02（26 场），输局 0.63（15 场，0.37–0.94）。进场时 15 场输局有 11 场被报缺口，26 场赢局有 12 场被报「够」。新批：ZGZ0 0.94（报缺口）、QBCV 0.75（报「够」）、WQ67 0.56（报缺口）；赢的 KTRT、CJ88 1.13，AD5P 0.92，8KD7 1.20，Y36H 0.78 | deck-clock 加 QBCV |
| 删牌、格挡、商店 | AD5P：一幕只进 F4 一个商店（120 金，只买与我一战！，不删），死时 24 张里 5 打击 4 防御、2 张非基础格挡，身上 284 金；四份 run plan 的 block_target 都是 5，格挡牌 5 次出现拿 2 次。QBCV：F6 124 金买旋风斩、不删，20 张里 5 打击（1 张升级）4 防御，死时 132 金。CJ88：act-plan 放掉带 F21 商店的 p1，走的 p4 在火堆前没有商店（F21 问号是假商人，code 直接离开），死时 241 金 | 更新 deck-remove、deck-block-floor、route-shops |
| 事件掉血换金币（AD5P、ZGZ0） | AD5P F6「这个」−6 血 +63 金；ZGZ0 F13「这个」−6 +50 金，推理写「6 HP recovers via Burning Blood/F16 rest」。两局一幕后面都没有商店，死时 284、177 金。ZGZ0 F13、F15 共付 11 血，F16 回血 48→72 没被上限截（不付是 59→80 封顶），boss 72/80 进场 | 更新 event-gold、event-hp-maxhp、relic-burning-blood |
| 烘焙手套（KTRT；8KD7 只进数字） | 两局都是二幕先古拿的，都没到二幕 boss；A7–A9 拿它的 22 局过二幕 boss 8 局。KTRT 手牌每回合 4 张：F19、F22 两场 23.3、28/回合，F23 甲虫组 T1–T7 每回合 12/8/13/14/2/11/24 | relic-toasty-mittens 加 KTRT；neow-growth 改数字 |
| 佩尔之牙（CJ88） | 放 3 打击 2 防御，到 F23 还回 3 张（打击+×2、防御+），死局 T2 手里 0 格挡 | relic-paels-tooth 加 CJ88（二幕 boss 0/4） |
| 留给 boss 的药（只改数字） | 这 5 局里 3 局把买来或 run plan 点名给 boss 的药在 boss 前喝掉，约 5 瓶：AD5P 1（F17 点名给帝王蟹的能力药水，F21 走廊喝）；CJ88 3（F6 为 boss 买的异鱼之油、爆炸安瓿，F7 小啃兽 T1 喝；F9 点名给分尸的固化药水，F12 精英喝）；KTRT 1（F8「keep both boss potions」的异鱼之油，F12 满血走廊喝）。按 MC/rollout 最多省约 10（AD5P F21 T4）。四批合计 46 局 38 局、约 75 瓶。A9 46 局每局走廊/事件战喝 4.6 瓶、精英 0.7、boss 1.3（没变），二幕 boss 进场平均 1.2 瓶（n=9，没变）；A9 ≥75% 进场 boss 0 瓶 2/6、带药 23/39 | 只改 potion-save-for-boss、potion-empty-slots 的句内数字，n 不变。以下只记在这里：AD5P 的能力药水 boss 7 问都有、一次没喝；ZGZ0 小邮箱前丢掉异鱼之油；QBCV 以 0.00 置信喝稳定血清 |

- 永久力量这一行的口径：本次脚本的牌组取 boss 战第一帧。用它重算上次的 35 场，是 0 张 7/16、1 张 13/16、≥2 张 3/3，和上一节（6/15、14/17、3/3）差一场赢局的归类。条目里用的是本次口径的 41 场数字。

### 经验库自己带偏、或写了没被执行的地方
- **route-no-chains 读到了仍放行，另一头是避精英：**
  - CJ88 的推理原文引了这条，然后按「问号可能是事件」把连打算成 2、2、1。
  - AD5P 的推理里有「avoid consecutive hallways at low HP」，仍选了五连怪。
  - 同一时刻把它们推向 0 精英路线的有：act run plan 的 elites avoid、a9-damage 的「二、三幕精英 10 场死 7」、decimillipede/entomancer 的 A9 死局。
  - 两边都有死局（上表第 2 行），这次没改精英条目，只在 route-no-chains、act2-opening 补了问号的数。
- **lag-race「别对它买 AOE」：** QBCV F6 的推理里有这句，仍花 73 金买旋风斩（「the run-plan second AOE with Strength scaling」）。
- **deck-clock「时钟说已达标时按仍缺 ~30% 处理」：** QBCV F6、F16 的推理都抄了这句，仍以「Deck has 1 block card and no damage gap」拿挑衅、锻造岩石铠甲。
- **event-hp-maxhp / relic-burning-blood：** ZGZ0 F13 仍以燃烧之血为理由付血。
- **lag-sleep：** 原文「除非能斩杀别在沉睡时打醒它」比 `ironclad-guide.md:53`（一次能打掉 25% 以上可以打醒）更严。A9 的数据站在指南这边（0NZB），已在 lag-sleep 记一个反例，结论没改。
- **beetle「≥60% 进场能赢」、ovicopter「≤32 血进场三局都死」：** 分别被 KTRT（62% 进场死）、CJ88（32 进场活下来，剩 5）打破，已就地改写。

### 新增（0）
没有新增条目。考虑过：
- 地狱狂徒：CJ88 拿到后 4 场 0 次打出。但 a4f3795 已让 rollout 模拟它，只记在代码问题里。
- 小邮箱：只在火堆选「休息」时给药。和药水有关，没加。

### 更新（43）
- **加证据（26）：**
  - boss：vantom-entry 18→20（CJ88、KTRT）、kin-scaling 21→22（ZGZ0）、kin-priest-focus 11→12（ZGZ0）、lag-race 14→15（QBCV）、lag-sleep 7→8（QBCV；反例 0→1：0NZB）。
  - 精英：phrog 5→8（CJ88、KTRT、ZGZ0）、skulking-colony 17→19（AD5P、QBCV）。
  - 走廊：beetle 30→32（AD5P、KTRT）、hunter-killer 32→33（CJ88）、hopper 18→20（AD5P、KTRT）、louse 14→15（AD5P）、ovicopter 9→10（CJ88）。
  - 幕、计划：act1-strength 12→14（ZGZ0、QBCV）、act2-opening 30→33（AD5P、CJ88、KTRT）、a9-damage 38→43（5 局；46 局重算）。
  - 路线：route-no-chains 19→21（AD5P、CJ88；KTRT 的链中间有 F21 商店，不算）、route-entry-hp 48→50（ZGZ0、QBCV）、route-shops 18→20（AD5P、CJ88）。
  - 牌组：deck-clock 38→39（QBCV）、deck-block-floor 13→14（AD5P）、deck-remove 23→25（AD5P、QBCV）。
  - 遗物、事件：relic-toasty-mittens 21→22（KTRT）、relic-paels-tooth 3→4（CJ88）、relic-burning-blood 11→12（ZGZ0）、event-hp-maxhp 13→14（ZGZ0）、event-gold 7→9（AD5P、ZGZ0）。
- **只改数字（15）：**
  - bowlbugs 26、terror-eel 23、gardener 18、decimillipede 24、lag-entry 16、fysh-damage 17、giant-explode 22。其中 Y36H T9 击杀赢，有击杀的 34 场、≤13 的 19 场赢 18，A9 9 场赢 3。
  - act1-costs 17、elite-threshold 29、elite-need-one 11、elite-no-double 7、rest-smith-threshold 35、neow-growth 7。
  - 药水：potion-save-for-boss 70、potion-empty-slots 21。
- **只改已被代码修掉的说法（2）：**
  - relic-nutritious-soup：删掉「code 的删牌说明仍把永恒打击算进去」。1250bef 起删牌说明只算能删的牌。
  - card-rolling-boulder：「rollout 不模拟它」改成「当时 rollout 不模拟它」。rollout.ts 现在有滚石效果。

### 退役（1）
- **relic-paels-eye（佩尔之眼，n=1）**：「我们的代码不会触发，选了等于空」已过时。6eff601（09-26）起，所有线都判死时，本场第一次会空过一回合，拿佩尔之眼的额外回合（`src/screens/combat-plan.ts:1647`）。按「代码修好就退役」处理。
- 没有合并条目。active 198，离测试上限 200 还有 2 条余量。

### 和手写知识、代码冲突，待改（没有改动）
巨兽早杀、感染棱柱、蜂群术士、同族信徒这几处修 bug 的 agent 在改，不列。
- `src/knowledge/ds-handbook.md:38`「进 boss 血量：赢局平均 88%，输局 81%；灵魂异鱼赢局 93%、输局 78%」。A9 一幕 boss 41 场赢局、输局平均都是 90%：QBCV、WQ67 满血输，ZGZ0 90% 输。
- `src/knowledge/ironclad-guide.md:35`「低血时绕开精英走问号/商店」。A9 二幕问号 70 个里 12 个开出战斗，赢局中位 −21.5、p75 −27，高于二幕走廊的 −12/−22；KTRT F22 问号是草蜢，−19。
- 族母的沉睡回合：
  - `src/knowledge/jev-hints.json:18-28`（matriarch-asleep、matriarch-sleep-turns）和 `src/project/run-journal.ts:179`（BOSS_NOTES LAGAVULIN）只讲「沉睡时打能力/留格挡，别打醒」，没覆盖手里没有能力牌的情况。
  - A9 输的 3 场都这样空过两回合；0NZB T1 打掉 60 打醒它，赢了。
  - `ironclad-guide.md:53` 的「一次能打掉 25% 以上可以打醒」和数据一致。
- experience 的 potion-swift「代码按 0 价值算」已过时：`src/knowledge/potion-values.ts:47` 是 SWIFT_POTION { Cards: 3 }，`src/strategy/card-model.ts:730` 是 draw 3。药水条目这次只改数字，没动，待 Dai 定。
- `src/strategy/boss-clock.ts:195` giantKillRecord（batch-f 测试钉住）的「A9 T10 前击杀只赢 1/3」：Y36H（只进数字）T9 击杀赢了，现在是 2/4。属于巨兽早杀那一处，只报数字。
- 代码：
  - `src/strategy/route-projection.ts:158` 问号按 room-costs 的 A9 二幕问号中位 0 计价（KTRT 投影 82%、实到 62%），和 act2-opening、route-no-chains 冲突。
  - `src/screens/combat-plan.ts:690` HALLWAY_ELITES：战斗里把熟睡甲虫当精英，路线投影和 route review 仍按普通走廊中位算（KTRT），和 beetle 冲突。
  - `src/screens/map.ts:340-343` potionComing 只看前方有没有火堆：小邮箱选锻造时不给药（ZGZ0），和 potion-code-discard、potion-fysh-oil 对应（药水条目没动）。

### 代码问题（不给 DS）
按复盘里写的状态，不重新核实（修复进度以 `notes/fix-queue.md` 为准）：
- AD5P：
  - 随机能力药水的 MC 只比当回合（`src/strategy/potion-mc.ts:2-3`、`:48-56`），boss 7 问都没喝点名的 T1 能力药水。
  - 熔炉的祝福在 Jev 线中间喝下后整条线重规划（D 批「未修」那条）。
- AD5P、CJ88、KTRT：route review 只凭 hp_at_boss 判「safe」；问号按 0 血投影。
- CJ88：
  - 假商人：code 按 `src/screens/shop.ts:33-34` 直接离开。
  - 饱和盘按敌方剩血挑 best、不比死亡数（`src/strategy/rollout-live.ts:445` pickRolloutBest，fix-queue 已有）。
  - 同文字、不同结果的选项（fix-queue KYC0 条，E 批 2de27ae）。
  - 地狱狂徒当时 rollout 不模拟（a4f3795 已修）。
- KTRT：
  - F23 T3 当回合 0 掉血、打死石碗虫的线被 rollout/history 判得更差，原因未定位。
  - 手套消耗规则把未打出的能力牌固定 5 分（`src/screens/selection.ts:688-689`），丢了双重打击、留下撕裂。
  - F6 事件给 2 瓶、腰带只空 1 格，丢了一瓶（`src/screens/event.ts:338` 只在药栏全满时处理）。
  - 力量药水喝在最后一次攻击之后，找不到「不喝的孪生线」（`rollout-live.ts:406` noEffectTwin）。
- ZGZ0：
  - 小邮箱：F10 地图上为「下一个是火堆」丢掉异鱼之油，F11 选锻造，这格空到 F12（`map.ts:340-343`）。
  - boss 5 问里 3 问的 rollout 回退成 1-turn。
  - 饱和盘首领规则把 8/8 死的线标 best（fix-queue）。
- QBCV：
  - Jev 对「喝药/不喝」给 0.50/0.50 时，以 0.00 置信执行了喝药。
  - boss 9 问里 7 问饱和，rollout 数字分不出线。
  - 沉睡回合手里没有能力牌时 code 直接结束回合（`src/strategy/turn-solver.ts:942` wake、`:2105` sleepCost）。

### 测试
- exp-update（3ddb1c9）：`tsc --noEmit -p tsconfig.json` 退出 0；vitest 60 个文件 1102/1102 通过，退出 0。
- 合入 v3（在 `ops/v3-merge.lock` 锁里）：
  - 合入前：v3 c605500 上 vitest 1102/1102。
  - 等 v3 的知识构建脚本跑完，先提交 v3 里刷新的知识数据 9e3dacc「Refresh knowledge data」（boss-damage、card-upgrades、monster-db、move-model、outcome-stats、room-costs）。
  - 再 `git merge --no-edit exp-update`，得到 4452401。
  - 合入后：v3 上 `tsc --noEmit -p tsconfig.json` 退出 0；vitest 60 个文件 1102/1102 通过，退出 0（v3 现在是 4452401）。
  - 对局在 v3 里照常跑，没有停。

### 切片大小
- 样本：新抽一批，A8、A9 各 20 个状态 × 6 种界面，共 240 个。从 states.jsonl 用固定种子 20260929 抽取，只取 19:05 前已结束的局。
  - A8 没有新局，抽到的和上次是同一批。
  - A9 加了新局，是新的一批。
- 同一批状态分别用改前（c605500）和改后（3ddb1c9）的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.3k / 5.4k | 3.4k / 5.6k | 3.5k / 5.7k | 3.6k / 5.9k |
| 奖励 | 3.9k / 6.1k | 4.2k / 6.4k | 4.1k / 5.8k | 4.2k / 6.1k |
| 地图 | 5.4k / 6.0k | 5.6k / 6.3k | 5.2k / 6.0k | 5.4k / 6.3k |
| 事件 | 4.2k / 5.8k | 4.3k / 6.2k | 4.2k / 5.5k | 4.3k / 5.8k |
| 火堆 | 3.2k / 5.3k | 3.3k / 5.5k | 3.2k / 5.3k | 3.3k / 5.5k |
| 商店 | 5.1k / 5.7k | 5.3k / 5.9k | 5.3k / 5.7k | 5.5k / 6.0k |

- 初稿：中位涨 0.1–0.6k，最大 6.6k。
  - 主要来自 deck-block-floor、deck-clock、deck-remove：几乎每个奖励、商店切片都有它们。
  - 其次是 route-no-chains、act2-opening、phrog、skulking-colony。
  - 之后把逐局细节压成一句，逐回合、逐局的数字留在本节。
- 最终：每种界面的中位涨 0.03–0.24k，单个切片最多涨 0.37k，最大 6.4k（R2H1 A8 F19 二幕卡牌奖励，25 条经验 + 4 行统计，改前 6.1k）。
- 条目数：active 198（测试上限 200）；置信度 高 129、中 58、低 11。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：没有新增敌人条目，族母 3 条、同族 2 条。

## 2026-09-29 第七次增量：5 局 A9（version 2026-09-29.6，分支 exp-update，586e3e5 + 4fe51fb）

### 来源
- `notes/lessons.md` 末尾的 5 节 A9 复盘，全输：Y36HXZ80A8LL（F25 残杀千足虫）、WQ67U1UY1D8V（F17 乐加维林族母）、8KD7ENEY773Y（F30 残杀千足虫）、RHNEWJVRW132（F17 瀑布巨兽）、ARKG3JFT26HC（F17 灵魂异鱼）。
  - Y36H、WQ67、8KD7 上次只进数字，这次作为证据局。
  - 5 节后面的「勘误（20:17）」按勘误用。勘误改的都是用时、Jev 置信、rollout 排序这类细节，没有进条目。
- 日志（只读）：
  - 沿用上次的抽取脚本：从 states.jsonl 字节偏移 3.38e9 起流式读一遍，抽出 A9 全部战斗和每层第一帧/最后一帧。
    - 用同样口径重算截至 19:05 的 46 局，和上一节一致：一幕走廊 223 场死 1、7/13；一幕精英 43 场 32/38；二幕走廊 105 场死 10、12/22/36；每局走廊/事件战喝药 4.6、精英 0.7、boss 1.3；≥75% 进场 0 瓶 2/6、带药 23/39。
  - `tools/boss-fights-extract.py --asc 9`（在 A9 那段的副本上跑）+ `tools/boss-clock-calibrate.ts --rows`：按现行时钟（v3 4452401，时钟代码同 c605500）重算 A9 一幕 boss 45 场。
    - 用同样口径重算上次的 41 场，和上一节一致：赢局中位 1.02、输局 0.63。
  - A7–A9 灵魂异鱼 37 场：`boss-fights-extract.py SOUL_FYSH --asc 7/8/9`，牌组取 boss 战第一帧。
  - runs.jsonl 定输赢。`monster-db.json`（v3 工作区已刷新、含这 50 局）只用来对数，和抽取结果一致：千足虫 A9 4 场 4 死；园丁 9 场赢 8、赢局中位 22.5；珊瑚群 7 场、赢局中位 39；异鱼 11 场死 2；巨兽 10 场赢 3；异鸟 8 场、赢局中位 38。
  - DeepSeek 推理、run plan 的原文按 run id 从 decisions / deepseek-reasoning / run-plans 抽出核对，条目和本节引的原话都找到了出处。
- 口径同上次：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房，问号另算。
  - A9 汇总是截至 19:57 runs.jsonl 里 50 局已结束的 A9。
  - 其中还没复盘的 7YT0NJC2LEYQ（F17 仪式兽）、9CDEMGKTJ77N（F17 仪式兽）只进数字。
  - 抽取时还在跑的 VTREB5A9XWS7 不算（20:25 结束），boss 抽取里它的那场仪式兽已剔除。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 4452401），再改。
- 结果：新增 1 条，更新 30 条，退役 0 条；active 198 → 199，总数 220 → 221。
  - 更新里 23 条加了证据局，7 条只改数字。
  - 4fe51fb 是合入后补的一处：8KD7 F13 也过了滑脚木桥，补进 event-slippery-bridge。
- 药水的处理（照上次）：
  - potion:* 和 general:potion 条目只改句内数字，不加证据局（n 不变）。
  - 其他条目里原有的喝药/留药分句一字不改，新加的证据只写非药水的部分。
  - 没有新增或加强任何「什么时候喝/别喝」的说法。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 残杀千足虫（Y36H、8KD7；A9 4 场 4 死） | Y36H 59/85（69%）进场，26 张 2 升级，3 回合 31/15/0（15/回合），三节剩 31/41/32；进场前 F22 走廊 −49，F24 回血到 59。8KD7 74/80（92%），26 张 1 升级，AOE 只有 F19 狱火、F25 踩踏，手套让每回合手牌 4 张，4 回合 60（15/回合），三节剩 15/33/42。8KD7 F18 act-plan 的题面带着 decimillipede（「可选的只在 ≥90% 时打」），推理写了「0/3 deaths」「needs ≥3 AOE」，所有路线都必经一只精英；Y36H 是「All routes have an elite except p7」。A9 二、三幕精英 12 场死 9（没变） | decimillipede、route-forced-elite-prep 加证据 |
| 二幕开局（Y36H、8KD7） | Y36H 投影 F23 65%、实到 22%（F22 盛碗虫 −49）；F25 精英投影 100%（按 F24 回血算），实到 69%。8KD7 F22 投影 68%、实到 50%：F21 问号开出 4 只外骨骼虫，73→34（A9 外骨骼虫其余 12 场赢局都 ≤16）；F24 投影 68%、实到 44%。这批没有新的二幕局，二幕汇总数没变 | act2-opening 加证据 |
| 盛碗虫（Y36H F22） | 62/85（73%）进场，石/卵/蜜三只。石虫头槌 A9 每回合 16，4 回合一次没挡满（逐回合掉 19/11/3/16），−49（燃烧之血后 19）。T1 rollout best 是先打卵的 plan1（−19）；两张防御 + 血墙的 plan2 是 −8。三只组 A9 10 场 4 场 −46~−49（没变） | bowlbugs：头槌补上 A9 16，加 Y36H |
| 佩尔之泪（Y36H） | F18 act-plan 以「repeatable +2 energy closes the 19/turn boss gap」选它（code value 0），放掉佩尔的增生组织（克隆附魔）和佩尔的士兵。二幕 4 场 15 个回合，第 2 回合起开局都是 3 能量，一次没触发。src 里 PAELS_TEARS 只在 `src/project/run-brief.ts:113`（给 Jev 的文字），turn-solver.ts、rollout.ts 0 处。outcome-stats（A8）：二幕拿它的 n=12，过二幕 boss 8%（基线 19%） | 新增 relic-paels-tears |
| 乐加维林族母（WQ67；A9 5 场赢 2） | 80/80 进场，15 张 2 升级，0 张能力牌。T1–T2 沉睡 0 伤害；13 回合打掉 132，醒后 T4–T13 10.8/回合，族母剩 101。时钟进场「需 21、估 18」，实打/估值 0.56。F8 以「2nd elite at 61% entry is death zone」改线成 0 精英，一幕 6 场走廊、6 次卡牌奖励都拿 code rank 1，没见到能力牌 | lag-race、lag-sleep、elite-need-one 加 WQ67 |
| 灵魂异鱼（ARKG；A7–A9 37 场） | ARKG 75/80（94%）进场，19 张 1 升级，0 张永久力量。15 回合打掉 159/221（10.6/回合）；T9、T10、T12、T13、T15 五个回合 0 伤害；T12 手牌呼唤×4 + 头槌，40→7。燃烧契约是 F14 按「run-plan Beckon-clearing exhaust」买的，5 个回合开局在手。时钟进场「需 18、估 17」，实打/估值 0.62。A7–A9 37 场：输的 7 场都 ≤14.6/回合、≤2 张升级；赢的 30 场都 ≥13/回合；有燃烧契约/坚毅+/净化的 15 场赢 11，没有的 22 场赢 19。A9 11 场赢 9 | fysh-damage、fysh-beckon 加 ARKG |
| 瀑布巨兽（Y36H 赢、RHNE 输；A9 10 场赢 3） | Y36H 75/85 进场，9 回合打完 250（27.8/回合），T9 击杀时 36 血对 41 层；T10 三张防御挡 15，剩 10，燃烧之血后 16；实打/估值 0.78。RHNE 49/86（57%）进场，19 张 2 升级，10 回合按回合开局算打掉 166（16.6/回合），没打死，巨兽剩 84；时钟进场「需 45、估 29」，实打/估值 0.62。A8/A9 有击杀的 34 场没变 | giant-explode 加 Y36H、RHNE；giant-deck 改数字 |
| A9 一幕精英（47 场） | 赢局中位 −32、p75 −39、p90 −50。≥78% 进场 36/36 活（中位 −31），60–78% 9 场死 2，<60% 2/2 死。新增 4 场：园丁 RHNE 90% 进场 0 掉血（T1 打出 75）、ARKG 84% −40（0 升级、7 回合）；珊瑚群 RHNE 79% −43（F14，boss 前 3 层，本幕第二只）；异鸟 7YT0 65% −13（只进数字）。园丁 9 场赢 8、赢局中位 −22.5、p75 −27；珊瑚群 7 场死 1、赢局中位 −39、p75 −50；异鸟 8 场赢 7、中位 −38；骇鳗 10 场赢 9、中位 −31（Y36H 100% −11、8KD7 92% −28 上次已计入） | elite-threshold、gardener、skulking-colony、terror-eel 加证据；byrdonis、act1-costs 改数字 |
| 一幕精英数（A9 50 局） | 过一幕 boss / 过二幕 boss：0 只 10 局 4/0（新：9CDE），1 只 33 局 18/2（新：ARKG、7YT0），2 只 7 局 4/1（新：RHNE）。RHNE F1 route-plan 走两只精英（「elites at step 7/13 both entered ~80/75 HP after rests」）；F12 route review 仍 keep（「79% entry elite, rest follows; extra relic/card fuels T10 damage race over HP」），F14 −43，F15 事件 −7，boss 57%。WQ67 方向相反，0 精英满血进族母输 | elite-no-double 加 RHNE，elite-need-one 加 WQ67 |
| boss 进场血量、永久力量、锻造（A9 一幕 boss 45 场） | 过关 26/45，赢局平均进场 90%，输局 87%。全部 A9 boss 55 场：≥75% 进场 25/47；<75% 4/8（新增的 RHNE 57%、9CDE 66% 都输）；≥90% 进场 30 场赢 18（新增的 ARKG 94% 输）。永久力量：0 张 7/21，1 张 15/20，≥2 张 4/4；WQ67、ARKG、7YT0 0 张，RHNE（与我一战！+）、9CDE（燃烧+）各 1 张。一幕锻造 0 次 6/8、≥1 次 20/37；进 boss 时 0–1 张升级 11/19、2 张 5/11、≥3 张 10/15 | route-entry-hp、act1-strength 加证据；rest-smith-threshold 改数字 |
| 时钟（现行，A9 一幕 boss 45 场） | 实打/估值：赢局中位 1.02（26 场），输局 0.62（19 场，0.37–0.94）。进场时 19 场输局有 15 场被报缺口，26 场赢局有 12 场被报「够」。新批：WQ67 0.56（报缺 3）、ARKG 0.62（缺 1）、RHNE 0.62（缺 16）、7YT0 0.69（缺 4）、9CDE 0.44（缺 12）；赢的 Y36H 0.78、8KD7 1.20 进场都报「够」 | deck-clock 加 WQ67、ARKG |
| 仪式兽（7YT0、9CDE，只进数字） | A9 3 场赢 1。7YT0 79/91（87%）进场，16 张 3 升级，0 张永久力量，14 回合 15.1/回合（0.69）。9CDE 53/80（66%），18 张 3 升级，有燃烧+，6 回合 11/回合（0.44） | beast-clock 改数字 |
| 删牌（RHNE、8KD7） | RHNE F6 商店 130 金买御血术 77 + 血墙 48，没删（「Strikes can still be removed at act-2 shops」）；一幕之后再没有商店，F15 事件删 1 张打击，进 boss 时 4 打击 4 防御。8KD7 F5「AOE and removal wait for the later shop」；F15、F22、F27 三个商店买药和燃烧，4 个商店 0 次删牌（F6、F13 两个事件各删一张）；死时 26 张里 4 打击 4 防御。WQ67 F3、Y36H F4、ARKG F14 都在商店删了打击 | deck-remove 加 RHNE、8KD7 |
| 事件掉血换金币（WQ67） | F12 潜水 76→69、+115 金（84→199），推理「115 gold buys act-2 shop help」，题面里带着 event-gold。之后是 F13 火堆、F14 走廊、F15 问号、F16 火堆，没有商店，死时 159 金 | event-gold 加 WQ67 |
| 滑脚木桥（RHNE、ARKG、8KD7） | RHNE F15：31/86 点名飞剑回旋镖 −3，28/86 点名痛击+ −4，24/86 点名打击时跨越删掉；F16 +25 到 49（不付是 56，65%）。ARKG F15：63/80 点名坚毅 −3、头槌 −4、无惧疼痛 −5，点名打击时跨越，63→51；F16 +24 到 75（不付是 80 封顶）。8KD7 F13：52/80 点名上勾拳 −3、双重打击 −4，点名挑衅时跨越，52→45；F16 51→75（不付是 80 封顶）。三局都照条目「点名的不是打击/防御、HP >30% 时重抽」做 | event-slippery-bridge 加三局，补上代价递增和回血上限的数 |
| 烘焙手套（8KD7） | 二幕先古拿的（「our only real permanent Strength engine」）。F30 进场 26 张 1 升级，每回合手牌 4 张，千足虫 4 回合 15/回合。A7–A9 拿它的 22 局过二幕 boss 8 局（没变，8KD7 上次已计入） | relic-toasty-mittens 加 8KD7 |
| 留给 boss 的药（只改数字） | 这 5 局 3 局、约 4 瓶：Y36H 1（F12 商店「Strength potion … is the top boss-race purchase」，F14 问号幽灵船 80/80 T1 喝）；8KD7 2（F22 为帝王蟹买的马萨雷斯的赠礼 F25 虱虫之祖喝，F27「Block potion first (T4/T9 laser)」F28 猎人杀手喝）；ARKG 1（F11「save the Blood Potion as insurance」，F12 双尾鼠 T1 喝，原话是「留作保险」，算不算点名给 boss 有歧义）。五批合计 51 局 41 局、约 79 瓶。A9 50 局每局走廊/事件战喝 4.3 瓶、精英 0.7、boss 1.3；二幕 boss 进场平均 1.2 瓶（n=9，没变）。A9 ≥75% 进场的 boss：0 瓶 2/7（新增 7YT0），带药 23/40（新增 ARKG）。反例 RHNE：run plan「hold Swift+Glowwater for the kill turn」，走廊/精英 4 问 rollout best 是先喝药，都没喝，两瓶带进 boss 仍输 | 只改 potion-save-for-boss、potion-empty-slots 的句内数字，n 不变 |

- 异鱼这一行的口径：牌组取 boss 战第一帧，「这类牌」= 燃烧契约、坚毅+、净化、恶魔之焰。
  - 用它重算到上一版为止的 34 场：有这类牌 14 场赢 11，没有 20 场赢 17，赢局 28 场。
  - 上一版写的是 15/12、20/17、赢局 26 场，差在口径和场次。条目改用本次 37 场的数。

### 经验库自己带偏、或写了没被执行的地方
- **decimillipede 读到了，做不到：** 8KD7 二幕开局的题面带着这条，推理引了「0/3」「要 ≥3 张 AOE」，所有路线都必经一只精英。
  - 之后只拿到狱火、踩踏两张 AOE，92% 进场仍 4 回合死。
  - 条目里的 ≥90% 是必要条件，不是充分条件。A9 4 场的进场 69–92% 已写在条目里。
- **elite-no-double 在题面里，第二只精英仍被保留：** RHNE F12 卡牌题面里有这条，route review 仍 keep（理由是「extra relic/card fuels T10 damage race」）。
  - F14 珊瑚群 −43，boss 57% 进场。
  - 同一时刻把它往精英推的，是 act1-strength、elite-need-one 的「补输出」。
- **elite-threshold 和 elite-need-one 两头拉（上一节已记）：** WQ67 F8 以「2nd elite at 61% entry is death zone」绕开两只精英，满血进族母，牌组 0 能力牌输了。
  - RHNE 方向相反。两条的结论都没改，只各加一个证据局。
- **event-gold 在题面里仍付血：** WQ67 F12 事件题面带这条（「本幕剩余路线到不了商店时，金币边际价值低」），仍以「115 gold buys act-2 shop help」付 7 血，死在一幕 boss。
- **bowlbugs 的「挡满晕一回合」没用上：** Y36H F22 4 回合一次没挡满石虫。
  - T1 的 rollout best 是先打卵，当时 rollout 里失衡的晕眩是随机的。
  - G 批 ff5fa50 已改成挡满必晕，这场是修前证据。
- **fysh-beckon：** ARKG F14 照条目买了燃烧契约，仍有 5 个 0 伤回合。条目原本就有「光带着不够」，这次只更新了数。
- **deck-clock「时钟说已达标时按仍缺 ~30% 处理」：** ARKG 进场报「需 18、估 17」，WQ67 整幕报缺 2–5。实打/估值 0.62、0.56，实际缺 40% 左右。
- **event-slippery-bridge：** 三局都照条目重抽，分别付了 7、12、7 血。条目没写每次 +1 的递增和火堆回血的上限截断，已补上这几个数，没改规则。

### 新增（1）
- **relic-paels-tears**（relic:PAELS_TEARS 佩尔之泪，n=1，中）：
  - 内容：出牌求解器和 rollout 都不会为它留能量，Y36H 二幕 15 个回合一次没触发；A8 二幕拿它的 12 局过二幕 boss 8%。
  - 置信度照佩尔之眼的先例手动定为中：这是代码层面的事实，src 里只有 run-brief.ts:113 的文字，turn-solver.ts、rollout.ts 0 处。
  - 代码支持后按「代码修好就退役」处理。fix-queue 已有这一条。
- 考虑过、没加的：
  - 液态记忆在 Jev 线中间喝下后选牌没续上（8KD7）：代码问题。
  - HP 护栏换线（RHNE、WQ67）：代码问题，for-dai 已列。
  - 外骨骼虫×4：只有 8KD7 一场贵，放进 act2-opening 的数。
  - 铅制镇纸：Y36H、RHNE、ARKG 三局涅奥都选了它，都死在一、二幕，但 n 和对照都说明不了什么。

### 更新（30）
- **加证据（23）：**
  - boss：lag-race 15→16（WQ67）、lag-sleep 8→9（WQ67，文字里原本就有它）、fysh-damage 17→18（ARKG）、fysh-beckon 10→11（ARKG）、giant-explode 22→24（Y36H、RHNE）。
  - 精英：decimillipede 24→26（Y36H、8KD7）、gardener 18→20（ARKG、RHNE）、skulking-colony 19→20（RHNE）、terror-eel 23→25（Y36H、8KD7；文字没变）。
  - 走廊：bowlbugs 26→27（Y36H）。
  - 幕、计划：act1-strength 14→16（WQ67、ARKG）、act2-opening 33→35（Y36H、8KD7）、a9-damage 43→48（5 局；50 局重算）。
  - 路线、精英：route-entry-hp 50→52（RHNE、ARKG）、route-forced-elite-prep 14→16（Y36H、8KD7）、elite-threshold 29→30（RHNE）、elite-need-one 11→12（WQ67）、elite-no-double 7→8（RHNE）。
  - 牌组：deck-clock 39→41（WQ67、ARKG）、deck-remove 25→27（RHNE、8KD7）。
  - 遗物、事件：relic-toasty-mittens 22→23（8KD7）、event-gold 9→10（WQ67）、event-slippery-bridge 4→7（RHNE、ARKG、8KD7）。
  - route-forced-elite-prep、bowlbugs 原有的留药分句没动，新证据只写备牌、挡满这两部分。
- **只改数字（7）：**
  - giant-deck 22（A9 输局 7 场，RHNE 0.62）、beast-clock 9（7YT0、9CDE 只进数字）、byrdonis 11（7YT0 只进数字）。
  - act1-costs 17（走廊 A9 8/13、244 场；精英 32/39、47 场）、rest-smith-threshold 35（≥1 次锻造 20/37）。
  - 药水：potion-save-for-boss 70、potion-empty-slots 21。

### 退役（0）
- 没有被推翻的条目，没有合并。active 199，离测试上限 200 还剩 1 条。
- 对照 v3 这时已合入的 G 批（d32b992）核对了代码修好的地方：
  - 2ca832e（消亡粉末不再误标无效果）：potion-powdered-demise 没写代码行为，不用改。
  - 66f98b5（缩放仪进时钟和路线投影）：relic-pantograph、rest-by-boss-loss 讲的是 DeepSeek 的火堆选择，仍成立。
  - ff5fa50（失衡挡满必晕）：bowlbugs 没写 rollout 行为。
  - ca11ab3、ed9f105、fed438e：没有对应条目。
  - 0c71951（小邮箱的药交给决策者）让 potion-code-discard 部分过时，见下一节。

### 和手写知识、代码冲突，待改（没有改动）
ds-handbook:38 进场均值、boss-clock 的巨兽击杀回合战绩由修 bug 的 agent 处理（G 批 22109ed），不列。
- 巨兽「所需格挡 ≤13」的战绩：
  - 这几处还是「有击杀的 33 场，≤13 的 18 场赢 17」：`src/knowledge/ironclad-guide.md:55`、`:120`，`src/knowledge/ds-handbook.md:71`，`src/project/run-journal.ts:181`（BOSS_NOTES）；`src/strategy/boss-clock.ts:85` 的 mechanic 文案同样是 17/18。
  - 加上 Y36H（T9 击杀，36 血对 41 层，需 5）是 34 场、19 场赢 18，giant-explode 已是这个数。
  - 22109ed 只改了击杀回合的战绩，这个数没改。
- `src/knowledge/ironclad-guide.md:35`「低血时绕开精英走问号/商店」，仍没改。
  - 新数据：8KD7 F21 91% 进问号，开出外骨骼虫×4，−39。
  - A9 二幕问号 70 个里 12 个开出战斗，赢局中位 −21.5（没变）。
- 族母的沉睡回合：`src/knowledge/jev-hints.json:18`、`:24`（matriarch-asleep、matriarch-sleep-turns）和 `src/project/run-journal.ts:179` 仍只讲「沉睡时打能力/留格挡」。
  - WQ67 是第 3 局：手里没有能力牌，沉睡两回合 0 伤害，满血进场输。A9 族母输的 3 局都这样。
  - `ironclad-guide.md:53` 的「一次能打掉 25% 以上可以打醒」和数据一致。
- 异鱼的清呼唤牌：`ironclad-guide.md:54` 和 `run-journal.ts:180` 把未升级的「坚毅」列为清呼唤的牌。
  - 经验 card-true-grit 写的是未升级版随机消耗。
  - ARKG 带两张未升级坚毅加燃烧契约，仍有 5 个 0 伤回合。影响小，只列出。
- 经验库和代码（药水条目没动，待 Dai）：
  - potion-code-discard「药栏满且前方有小信箱、白兽雕像时，代码会在选路前丢最弱的药」：0c71951 起小邮箱的药交给决策者，`src/screens/map.ts:342` 只剩白兽雕像。
  - potion-fysh-oil「代码可能把它当格挡药在满栏时丢掉」：可能也受 fa98169、0c71951 影响，没核实。
  - potion-swift「代码按 0 价值算」仍过时（`src/knowledge/potion-values.ts:47`，上一节已列）。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 `notes/fix-queue.md` 为准（行号按 v3 4452401）：
- Y36H：
  - 佩尔之泪不进求解器和 rollout（fix-queue 未修）。
  - F22 rollout 把先打卵标 best：当时失衡晕眩是随机的，ff5fa50 已修。
  - F23 假商人：code 直接离开（CJ88 同类）。
  - F25 三节同名：2de27ae 修前。
- WQ67：
  - boss 饱和盘 best 违背「先比死亡数」7 问：b2080fb 修前。
  - HP 护栏在 boss T9 把 34 伤害的线换成 24（for-dai 已列）。
- 8KD7：
  - 液态记忆在 Jev 的线中间喝下后选牌没续上（`src/screens/combat-plan.ts:1537`、`src/screens/selection.ts:40-53`，fix-queue 未修）。
  - F30 饱和盘 best：b2080fb 修前。
  - 手套消耗给能力牌固定 5 分：Dai 的估值问题。
- RHNE：
  - HP 护栏两次换掉 Jev 的伤害线（`combat-plan.ts:429` hpGuardReplacement）：F14 T2 换掉 rollout best，boss T2 把与我一战！+ 换成血墙。for-dai 已列。
  - boss 饱和盘可比的 6 问里 5 问违背新排序：b2080fb 修前。
- ARKG：
  - 消亡粉末 34 问里 30 问被标 potion_no_effect（0dafcda 引入，G 批 2ca832e 已修）。
  - T12、T14 的理由里有「calc mismatch: solver says ending now kills, mod says safe」，原因未定位，fix-queue 里没见到。

### 测试
- exp-update：
  - 586e3e5：`tsc --noEmit -p tsconfig.json` 退出 0；vitest 60 个文件 1102/1102 通过，退出 0。
  - 4fe51fb（补 8KD7 木桥）：同样 tsc 0、vitest 1102/1102。
- 合入 v3（在 `ops/v3-merge.lock` 锁里，两次）：
  - v3 这时已是 d32b992：G 批 6dbb11b、知识数据 221cff6，再加 d32b992。
  - 知识构建没在跑，工作区也没有未提交的知识数据，两次都跳过「Refresh knowledge data」。
  - 第一次 `git merge --no-edit exp-update` 得到 784f571：tsc 退出 0；vitest 61 个文件 1124/1124 通过（G 批新增了 batch-g 等测试），退出 0。
  - 第二次（4fe51fb）得到 2f72f9a：tsc 退出 0，vitest 1124/1124，退出 0。
  - 对局在 v3 里照常跑，没有停。

### 切片大小
- 样本：新抽一批，A8、A9 各 20 个状态 × 6 种界面，共 240 个。从 states.jsonl 用固定种子 20260929 抽取，只取 19:57 前已结束的局。
  - A8 没有新局，抽到的和上次是同一批。
  - A9 加了新局，是新的一批。
- 同一批状态分别用改前（4452401）和改后的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.4k / 5.6k | 3.5k / 5.7k | 3.7k / 5.9k | 3.8k / 6.0k |
| 奖励 | 4.2k / 6.4k | 4.3k / 6.6k | 4.2k / 6.1k | 4.4k / 6.3k |
| 地图 | 5.6k / 6.3k | 5.8k / 6.4k | 5.6k / 6.3k | 5.9k / 6.4k |
| 事件 | 4.3k / 6.2k | 4.4k / 6.3k | 4.3k / 5.8k | 4.4k / 6.0k |
| 火堆 | 3.3k / 5.5k | 3.3k / 5.7k | 3.3k / 5.5k | 3.4k / 5.7k |
| 商店 | 5.3k / 5.9k | 5.3k / 6.0k | 5.5k / 6.0k | 5.6k / 6.0k |

- 初稿：中位涨 0.1–0.5k，最大 6.7k。
  - 主要来自 gardener、skulking-colony、deck-remove、decimillipede、terror-eel、act1-strength：几乎每个一幕切片都有园丁、珊瑚群、骇鳗、异鸟和一幕条目。
  - 之后把逐局细节压成一句，逐回合、逐局的数字留在本节。
- 最终：每种界面的中位涨 0.04–0.27k，单个切片最多涨 0.30k，最大 6.6k（R2H1 A8 F19 二幕卡牌奖励，25 条经验 + 4 行统计，改前 6.4k）。
- 条目数：active 199（测试上限 200，下次新增前要先退役或合并）；置信度 高 129、中 59、低 11。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：新增的是遗物条目，没有新增敌人条目。

## 2026-09-29 第八次增量：7 局 A9（version 2026-09-29.7，分支 exp-update，a02ad58）

### 来源
- `notes/lessons.md` 末尾的 7 节 A9 复盘，全输：7YT0NJC2LEYQ（F17 仪式兽）、9CDEMGKTJ77N（F17 仪式兽）、VTREB5A9XWS7（F33 无厌沙虫）、V6TW9MJ385P2（F33 帝王蟹）、DHGT6Z3Q7VAP（F33 帝王蟹）、JJ65CGH92D9A（F17 灵魂异鱼）、ULQPBK1211FG（F8 骇鳗）。
  - 7YT0、9CDE 上次只进数字，这次作为证据局。
  - 两段勘误（21:31 针对 7YT0/9CDE，22:08 针对 DHGT/JJ65/ULQP）按勘误用。进了本节或条目的是：7YT0 T13 手里有两张防御（上勾拳是按虚弱算的）、预备打击共出现 4 次；9CDE 护栏没保住燃烧+ 是因为 T3 是 big-hit 回合；JJ65 的 [card:TRUE_GRIT] 条目只在 F8 的输入里；ULQP 走廊投影是 −8 血，拿到 5 瓶药（走廊喝 4、精英 1）；DHGT 巨兽战 T1–T5 没掉血。
- 日志（只读）：
  - 沿用上次的抽取脚本：从 states.jsonl 字节偏移 3.38e9 起流式读一遍，抽出 A9 全部战斗和每层第一帧/最后一帧。
    - 用同样口径重算截至 19:57 的 50 局，和上一节一致：一幕走廊 244 场死 1、8/13；一幕精英 47 场 32/39；二幕走廊 105 场死 10、12/22/36；二幕 0 精英 17 局 9/5/3；一幕精英数 10/33/7 局；永久力量 7/21、15/20、4/4；锻造 6/8、20/37；走廊虱虫之祖 7 场、产卵虫 7 场、啃咬机 3 场、草蜢 15 场。
  - `tools/boss-fights-extract.py --asc 9`（在 A9 那段的副本上跑）+ `tools/boss-clock-calibrate.ts --rows`：按现行时钟（v3 3899c2a）重算 A9 一幕 boss 49 场、二幕 boss 10 场（帝王蟹 5、沙虫 5）。
    - 用同样口径重算上次的 45 场，和上一节一致：赢局中位 1.02、输局 0.62（0.37–0.94）。G 批 66f98b5（缩放仪进时钟）没改变这 45 场的数。
  - A7–A9 灵魂异鱼 38 场：A7、A8 沿用上次的抽取，A9 用本次的 boss 抽取，牌组取 boss 战第一帧。
  - runs.jsonl 定输赢。`monster-db.json`（v3 3899c2a，e437fac 刷新，含这 55 局）取 A9 boss 每回合掉血中位，和抽取结果对数。
  - DeepSeek 推理按每局第一条到最后一条决策的时间窗从 deepseek-reasoning.jsonl 抽出（这个文件没有 run id）；run plan、决策按 run id 从 run-plans / decisions 抽出。条目和本节引的原话都找到了出处。
- 口径同上次：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房，问号另算。
  - A9 汇总是截至 21:28 runs.jsonl 里 55 局已结束的 A9。
  - 21:55 结束的 RRMYC7MCSYX8 是 A8、还没复盘，不算；A8 的数都没动。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 3899c2a），再改。
- 结果：新增 0 条，更新 38 条，退役 1 条；active 199 → 198，总数 221 不变。
  - 更新里 26 条加了证据局，9 条只改数字，3 条（药水）只改描述代码行为的句子。
- 药水的处理（照上次）：
  - potion:* 和 general:potion 条目只改句内数字，不加证据局（n 不变）。
  - potion-code-discard、potion-swift、potion-fysh-oil 里描述代码行为的句子改成现在的事实，建议分句和 n 都没动。
  - 其他条目里原有的喝药/留药分句一字不改，新加的证据只写非药水的部分。crab-potions 没动（V6TW 为帝王蟹留的药也在二幕走廊喝了，只记在本节）。
  - 没有新增或加强任何「什么时候喝/别喝」的说法。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 仪式兽（A9 5 场赢 3） | 7YT0 79/91（87%）进场，16 张 3 升级、0 张永久力量，14 回合打掉 211（15.1/回合，实打/估值 0.69）；T5 打到 160 眩晕，之后 3 个昏眩回合（T7/T10/T13）共打 13、掉 34。9CDE 53/80（66%），18 张 3 升级、有燃烧+（T3 被 HP 护栏换掉，T5 才打出），6 回合 66（11/回合，0.44）。VTRE 80/80、带燃烧，8 回合打完（32.8/回合，1.49），剩 28；V6TW 68/80、撕裂配狱火/放血/御血术/突破/血墙，7 回合（37.4/回合，1.70），剩 27。A9 眩晕线是 160（monster DB 的 PLOW_POWER：A0–A8 150，A9 160） | beast-clock 加 7YT0、9CDE、VTRE、V6TW；beast-ringing-block 加 7YT0 |
| 岩石铠甲（7YT0） | F12 以「4 plated armor means 4 block/turn … boss fight 12 turns = 48 block」拿它，同一段推理写着「gap 0, but knowledge says calibrate up ~30%」。boss 里覆甲 4/3/2/1，共 10 | d7dab83 起卡面在「获得N层覆甲」后写明衰减和总量，代码已修，不加条目 |
| 灵魂异鱼（JJ65；A7–A9 38 场） | JJ65 80/80、18 张 2 升级（都是磨刀石随机升的打击），整幕 0 次锻造（F12 58/80「no power card worth smithing」回血，F16 回血）。12 回合，现行时钟算 14.7/回合（含节日拉炮开场的 9；复盘按 212 算 13.9），实打/估值 0.73。T7、T8 各 4 张呼唤在手，两回合 0 伤，61→12。未升级坚毅只在 T5 打出一次，手里没有呼唤，随机消耗了打击。进场时钟「需 18、估 20，缺 0」。A7–A9 38 场：输的 8 场都 ≤14.7/回合、≤2 张升级，赢的 30 场都 ≥13/回合；有燃烧契约/坚毅+/净化/恶魔之焰的 15 场赢 11，没有的 23 场赢 19。A9 12 场赢 9 | fysh-damage、fysh-beckon、card-true-grit 加 JJ65；card-true-grit 前半句改写 |
| 瀑布巨兽（DHGT） | 86/86 进场，9 回合打完 250（27.8/回合，0.96），T9 击杀时 61 血对 41 层，自爆后剩 33。A8/A9 有击杀的 35 场，所需格挡 ≤13 的 20 场赢 19；A9 11 场赢 4 | giant-explode 加 DHGT |
| 无厌沙虫（VTRE；A9 5 场赢 2） | 80/80 进场，27 张 1 张升级，7 回合打掉 181（25.9/回合，需 48.7，实打/估值 0.92），狂乱逃离 3 次，T7 在 23 血时吃 34 死，沙虫剩 160。二幕三个火堆（F25、F28、F32）都回血，推理写「Sandworm entry HP is the top win predictor」；整局只在 F11 锻造过一次。时钟 F24「57/27，缺 30」、F28「43/27」。monster DB A9 沙虫每回合掉血中位 11.0（上一版 9.5） | insatiable-entry、insatiable-clock 加 VTRE |
| 帝王蟹（V6TW、DHGT；A9 5 场 0 胜） | V6TW 44/80（55%），31 张 2 升级，4 回合打掉 58/428（14.5/回合，需 107，0.50），碾碎爪 −40、火箭 −18，三份二幕 run plan 都写先打火箭。DHGT 90/95（95%），25 张 7 升级，T1 靠可可 +4 能量、准备背包、手里剑和爆炸安瓿打出 132，T2–T7 21/回合；7 回合 258（36.9/回合，需 61.1，1.08），碾碎爪 −118、火箭 −140，rollout 的 best_order 是「碾碎爪 > 火箭」。A9 5 场：78–95% 进场的 4 场 T5–T7 死，V6TW T4 死；monster DB A9 每回合掉血中位 13.0（上一版 13.8）。螃蟹战计数 56 场，两只一直都活着的 44 场赢 8（A9 0/5） | crab-entry、crab-dps、crab-kill-order 加 V6TW、DHGT；relic-very-hot-cocoa 加 DHGT |
| 二幕选线（A9 29 局进二幕） | 新增 3 局都走二幕 0 精英。VTRE act-plan：「Route p5 skips deadly A9 act-2 elites, reaching boss ~88% HP」；DHGT：「p5 avoids A9 act-2 elites (7/10 deaths; we have 0 AOE) yet reaches boss 86/86」；V6TW：「route p2 has no elites, 3 rests, ~80/80 boss entry — Kaiser Crab needs ≥75%, p1 elite leaves none at p75」。三局进 boss 100%/95%/55%，都死在 boss，每回合输出是需要的 53%/60%/14%。二幕 0 精英 20 局：9 局死在走廊、8 局死在 boss、3 局过二幕 boss；打了精英的 9 局：7 局死在精英、1 局死在走廊、1 局死在 boss、0 局过 | act2-opening 写进观察数据，精英条目没改 |
| 二幕开局（V6TW、VTRE、DHGT） | V6TW 投影 F23 57%、实到 32%，F24 火堆投影 48%、实到 15%（F22 啃咬机 −30、F23 胧光怪 −18），二幕 6 场走廊共掉 134（燃烧之血前）。VTRE F20 地道虫 55→14（−41，钻地后手里没有格挡），F21 投影 68%、实到 25%，F23 20/80 进熟睡甲虫组，瓶中精灵、蜥蜴尾巴各复活一次才打完。DHGT 二幕 5 场走廊只掉 23。A9 29 局有 9 局死在第一个二幕火堆前，走到的 20 局中位 42%（p25 22%），新 3 局到达时 88%/15%/40%。二幕走廊 120 场死 10，赢局中位 −12、p75 −22、p90 −35。走廊新数：虱虫之祖 9 场全胜、中位 −20、p75 −26；产卵虫 9 场死 1、赢局中位 −19；啃咬机 4 场、16–30；草蜢 16 场（含问号）中位 −13.5、p75 −19.5 | act2-opening 加 V6TW、VTRE；beetle 加 VTRE；louse、ovicopter、chomper、hopper 改数字 |
| A9 一幕精英（51 场） | 赢局中位 −31.5、p75 −39.5、p90 −51。≥78% 进场 39/40 活（新：ULQP 82% 死），60–78% 9 场死 2，<60% 2/2 死。骇鳗 13 场死 2（XLJQ 59%、ULQP 82%），赢局中位 −31、p75 −36：ULQP 15 张 0 升级，9 回合打掉 137（15.2/回合），骇鳗剩 13 时死；DHGT 98% 进场、14 张 0 升级，8 回合（18.8/回合）掉 53；JJ65 100% 进场 −22。旧日雕像 A9 7 场全胜、都 ≥85% 进场、中位 −23（V6TW 90% −26） | terror-eel 加 DHGT、JJ65、ULQP；elite-threshold 加 ULQP；effigy-cost 加 V6TW |
| 一幕路线投影（ULQP、7YT0） | ULQP F1 route-plan 选 3 精英路线（code rank 1），F5 起 F8 精英躲不开；走廊按每场 −2 投影，F7 火堆投影 70%、实到 52.5%。7YT0 F9 火堆投影 73.6%、实到 49.5% | act1-costs 加 7YT0、ULQP |
| 一幕精英数（A9 55 局） | 过一幕 boss / 过二幕 boss：0 只 11 局 5/0（新：VTRE 过一幕、死在二幕 boss），1 只 37 局 20/2（新：V6TW、DHGT 过一幕，JJ65、ULQP 没过），2 只 7 局 4/1。9CDE F7、F9 两次改线避开精英（「Avoid elite at 58/80; boss arrives ~80/80」），F12 事件自付 9 血、F14/F15 两场走廊 −31，实到 53/80 | elite-need-one 加 9CDE、VTRE |
| boss 进场血量、永久力量、锻造（A9 一幕 boss 49 场） | 过关 29/49，赢局平均进场 90%、输局 87%。全部 A9 boss 62 场：≥75% 进场 28/53（二幕 3/10），<75% 4/9（新输：9CDE 66%、V6TW 55%）；≥90% 进场 35 场赢 20（新输：JJ65、VTRE 满血，DHGT 95%）。永久力量：0 张 8/23（DHGT 赢，7YT0、JJ65 输），1 张 17/22（VTRE、V6TW 赢），≥2 张 4/4。一幕锻造 0 次 7/10、≥1 次 22/39；进 boss 时 0–1 张升级 12/20、2 张 7/14、≥3 张 10/15。A9 二幕 boss：进场 ≥75% 且 ≥3 张升级 3/9（新输 DHGT），其余 0/3（新输 VTRE、V6TW） | route-entry-hp 加 9CDE、V6TW、VTRE、DHGT、JJ65；act1-strength 加 7YT0、JJ65、VTRE、V6TW；rest-smith-threshold 改数字 |
| 时钟（现行，A9 一幕 boss 49 场） | 实打/估值：赢局中位 1.06（29 场），输局 0.63（20 场，0.37–0.94）。进场时 20 场输局有 15 场被报缺口，29 场赢局有 13 场被报「够」。新批：7YT0 0.69（F11「需 22、估 23，缺 0」）、9CDE 0.44（报缺 12）、JJ65 0.73（「需 18、估 20，缺 0」）；赢的 VTRE 1.49、V6TW 1.70、DHGT 0.96。二幕：VTRE 0.92、V6TW 0.50、DHGT 1.08 | deck-clock 加 7YT0、JJ65 |
| 删牌（V6TW） | 五份 run plan 的 remove 都是打击/防御。F3（110 金）「strike removal can wait for the next shop」；F11（101 金）买力量药水和血墙；F21（123 金）「no later shops exist」买燃烧和血墙。删牌都是 100 金、都付得起，0 次删；31 张里 5 打击 4 防御进帝王蟹 | deck-remove 加 V6TW |
| 事件（9CDE、7YT0） | 9CDE F12 低语空谷 60→51，变牌打击→放血，推理「9 HP recovers at the pre-boss rest」；F16 火堆 29→53 回了 24，没被上限截（不付是 38→62）。7YT0 F13 滑脚木桥 75/91 点名岩石铠甲时重抽（−3，推理「lesson says pay 3 HP to reroll when the named card is key」），第二次点名打击时跨越 | event-hp-maxhp 加 9CDE；event-slippery-bridge 加 7YT0 |
| 二幕先古遗物 | VTRE 营养汤、DHGT 烫嘴可可、V6TW 佩尔之血，三局都没过二幕 boss。A7–A9：营养汤 4/10、可可 2/12（A9 1/2）。DHGT 用可可 T1 打出 132，之后 21/回合 | relic-nutritious-soup、neow-growth 改数字；relic-very-hot-cocoa 加 DHGT |
| 留给 boss 的药（只改数字） | 这 7 局 6 局、约 12 瓶：7YT0 2（F1、F8 run plan 给昏眩回合留的格挡药：固化 F3 问号战喝，敏捷 F15 精英喝）；9CDE 2（F6 为 boss T1 买的能力药水、F9「keep both potions for the boss」的敏捷，都在 F14 走廊喝）；VTRE 4（F6 为昏眩回合买的格挡药 F9 走廊喝；F24 易伤、F27 痊愈、F29 虚弱，在 F27、F31 走廊喝）；V6TW 2（F11「saves it for the Beast」的力量药水 F13 走廊喝，F22「keep both potions for the crab」时的力量药水 F23 走廊喝）；JJ65 1（两份 run plan 都写留 1 瓶，5 瓶全在 boss 前喝）；ULQP 1（F5「for the Soul Fysh boss」的发光水 F6 走廊喝）。DHGT 带 2 瓶进 boss、T1 都喝了。六批合计 58 局 47 局、约 91 瓶。A9 55 局每局走廊/事件战喝 4.3 瓶、精英 0.7、boss 1.3；二幕 boss 进场平均 1.3 瓶（n=12）。A9 ≥75% 进场的 boss：0 瓶 2/8（新增 JJ65），带药 26/45 | 只改 potion-save-for-boss、potion-empty-slots 的句内数字，n 不变 |

- 异鱼这一行的口径同上一节：牌组取 boss 战第一帧，「这类牌」= 燃烧契约、坚毅+、净化、恶魔之焰；每回合伤害取 boss 抽取的 realised（boss 掉的血 ÷ 回合，含节日拉炮这类遗物伤害）。

### 经验库自己带偏、或写了没被执行的地方
- **elite-threshold 的「≥78% 进场 36/36 活」被读成安全线：** ULQP F1 route-plan 的推理引了「A9 arrival ≥78% HP safe」、elite-need-one 的 A9 表（「don't go 0 elites」），也引了 elite-no-double（「max 1 optional elite … 3 elites seems too many」），最后仍选了 3 精英的路线。
  - F8 骇鳗 82% 进场、0 升级、15/回合，死。
  - 条目里「0 升级、伤害 < 精英血÷5 时不打」这句 ULQP 正好命中，推理没引用。
  - 数字改成 39/40，并写明 ULQP。
- **二幕精英的死亡统计把三局都推向 0 精英路线：** VTRE、DHGT、V6TW 的 act-plan 都以 A9 二幕精英的死亡数选 0 精英路线（a9-damage「二、三幕精英 12 场死 9」，DHGT 引的是「7/10 deaths」）。
  - 三局进 boss 100%/95%/55%，输出只有需要的 53%/60%/14%。
  - 同时 route-entry-hp、insatiable-entry、crab-entry 的「进场血量」让 VTRE 二幕三个火堆都回血，1 张升级进沙虫。
  - 两边都在死（上表），精英条目的结论没改，只在 act2-opening 补了 0 精英局死在 boss 的数。
- **card-true-grit 前半句「坚毅（尤其坚毅+）能消耗呼唤」：** JJ65 F8 推理写「坚毅补第2张格挡并消耗异鱼的呼唤（高置信经验）」，放掉预备打击拿了未升级坚毅；按勘误，F8 的输入里有这条，F14 用的是旧 boss 要点。
  - 条目后半句本来写了未升级是随机消耗，但前半句的括号让人读成未升级也能清。
  - 改成「坚毅+ 能选一张手牌消耗…未升级版随机消耗一张、不能指定呼唤」，加 JJ65。boss 要点和指南 a85c413 已只点名坚毅+。
- **deck-clock「时钟说已达标时按仍缺 ~30% 处理」照抄了、没执行（第 3 批）：** 7YT0 F12 推理「gap 0, but knowledge says calibrate up ~30%」之后拿了岩石铠甲；JJ65 F9 run plan 原文「时钟报缺口0仍按缺~30%处理」，F12 火堆仍以「no power card worth smithing」回血，整幕 0 次锻造。实打/估值 0.69、0.73。
- **beast-clock「一幕至少要一张永久力量牌」：** 7YT0 F12 推理引了这句，但整幕 8 次卡牌奖励和 F5 商店都没有永久力量牌；预备打击出现 4 次都放掉（「temp Strength doesn't persist」）。9CDE F6 以这句买了燃烧。
- **event-hp-maxhp：** 9CDE 事件付血的理由是「boss 前火堆会回」，条目只写了燃烧之血，已补一句（event-gold 里原本有「下一个火堆会回满只在回血会被上限截掉时成立」）。
- **event-slippery-bridge：** 7YT0 照条目付 3 血重抽一次。

### 新增（0）
没有新增条目。考虑过：
- 岩石铠甲/覆甲按总量算（7YT0）：d7dab83 起卡面在「获得N层覆甲」后写明衰减和总量，代码已修。
- 手里剑、舵盘、稳定血清不在求解器/rollout（DHGT）：代码问题。
- 流动铜液、红头骨、自成型黏土（VTRE、V6TW）：1966f0a、246d2be 已建模，没有对应条目。
- 发光水把牌抽空后 rollout 不可用（ULQP）：代码问题。
- 二幕 0 精英路线：两边都在死，写进 act2-opening 的观察数据，不单列。

### 更新（38）
- **加证据（26）：**
  - boss：beast-clock 9→13（7YT0、9CDE、VTRE、V6TW）、beast-ringing-block 2→3（7YT0）、fysh-beckon 11→12（JJ65）、fysh-damage 18→19（JJ65）、giant-explode 24→25（DHGT）、insatiable-entry 27→28（VTRE）、insatiable-clock 24→25（VTRE）、crab-entry 30→32、crab-dps 33→35、crab-kill-order 13→15（都是 V6TW、DHGT）。
  - 精英：terror-eel 25→28（DHGT、JJ65、ULQP）、effigy-cost 14→15（V6TW）、elite-threshold 30→31（ULQP）、elite-need-one 12→14（9CDE、VTRE）。
  - 走廊：beetle 32→33（VTRE）。
  - 幕、计划：act1-costs 17→19（7YT0、ULQP）、act1-strength 16→20（7YT0、JJ65、VTRE、V6TW）、act2-opening 35→37（V6TW、VTRE）、a9-damage 48→55（7 局；55 局重算）。
  - 路线、牌组：route-entry-hp 52→57（9CDE、V6TW、VTRE、DHGT、JJ65）、deck-clock 41→43（7YT0、JJ65）、deck-remove 27→28（V6TW）。
  - 事件、卡牌、遗物：event-hp-maxhp 14→15（9CDE）、event-slippery-bridge 7→8（7YT0）、card-true-grit 5→6（JJ65，前半句改写）、relic-very-hot-cocoa 13→14（DHGT）。
  - beast-ringing-block、fysh-damage、insatiable-entry、insatiable-clock、beetle 原有的药水分句没动，新证据只写昏眩回合、锻造、输出、复活这些部分。
  - beast-ringing-block n=3 仍是中；其余置信度没变。
- **只改数字（9）：**
  - 走廊：louse 15、ovicopter 10、chomper 10、hopper 20。
  - rest-smith-threshold 35（一幕 0 次锻造 7/10、≥1 次 22/39）、relic-nutritious-soup 4、neow-growth 7。
  - 药水：potion-save-for-boss 70、potion-empty-slots 21。
- **只改描述代码行为的句子（3，药水，n 和建议不变）：**
  - potion-code-discard 3：小信箱 0c71951、白兽雕像 cc0d26d 起代码不再在选路前丢药，改为给「先丢药再…」的选项由决策方选；删掉「腰带全是 reserve 时也丢 reserve」。
  - potion-swift 6：「代码按 0 价值算」改成「以前按 0 价值，现在按抽 3 算，求解器会排先喝它的线」（`src/knowledge/potion-values.ts:48` SWIFT_POTION { Cards: 3 }，`src/strategy/card-model.ts:745` draw 3）。
  - potion-fysh-oil 3：核实过，现在代码自己丢药的只有进商店时丢污浊药水（`src/screens/shop.ts:43-58`，`src/config.ts:142` shopDiscardPotions = FOUL_POTION）；小信箱、白兽雕像、事件给药都由决策方选丢哪瓶。改成「代码现在不会自己丢它」，保留「要在 run plan 点名保留」。

### 退役（1）
- **relic-paels-tears（佩尔之泪，n=1）**：8c5a83c 起出牌求解器和 rollout 都按「带着没花完的能量结束回合，下回合 +2 能量」出线和推演（`src/screens/combat-plan.ts:1438`、`src/strategy/turn-solver.ts:2376`）。
  - 条目核心「代码不会为它留能量」已过时，按新增时写明的「代码修好就退役」处理。
  - A8 二幕 12 局过二幕 boss 8% 的观察数据 n 太小，不单独留。
- 没有合并条目。active 198，离测试上限 200 还有 2 条余量。
- 对照 v3 3899c2a 已合入的 H、I 批核对了代码修好的地方：
  - 1966f0a（流动铜液）、246d2be（红头骨、自成型黏土）、d7dab83/cff33ba（覆甲卡面）：没有对应条目。
  - a85c413（异鱼 boss 要点只点名坚毅+）：card-true-grit 前半句同步改写。
  - de0e3e5、9729bdb/529cbc2、1fdbb97、14520e0/4cb8b8b、7819a1a/fe82439、e504cdf、3901494：条目没写这些代码行为。

### 和手写知识、代码冲突，待改（没有改动）
- 仪式兽的眩晕线：`src/knowledge/ironclad-guide.md:51`「约 150 HP 进入二阶段」、`:91`「血量第一次降到 150 以下时被击晕」、`:93`「前期全力把它打到 150 以下」。
  - monster DB 的 PLOW_POWER：A0–A8 是 150（38 场），A9 是 160（5 场）；7YT0 复盘也是 ≤160。
  - `src/project/run-journal.ts:177` 的 BOSS_NOTES 用 {POWER:…} 从 DB 填，没有这个问题。
- 帝王蟹击杀顺序的战绩还是旧数：`src/knowledge/ironclad-guide.md:57`「51 场螃蟹战里先打死火箭的 12 场赢 9 场，两只一直都活着的 39 场只赢 8 场」，`src/project/run-journal.ts:183`（BOSS_NOTES KAISER_CRAB）「51 场螃蟹战：火箭先死 9/12 赢，两只一直活着 8/39」。
  - 经验 crab-kill-order 上一版已是 54/42，本批加 V6TW、DHGT 后是 56 场、两只都活着的 44 场赢 8。
- `src/knowledge/ds-handbook.md:56`「火箭蓄力之后是 49 激光」：A9 是 54。`:67`「帝皇蟹（5 局死在它手上…）」：monster DB 里 A8 24 场赢 5，A9 5 场 0 胜。
- `src/knowledge/ironclad-guide.md:35`「低血时绕开精英走问号/商店」仍没改（上几节已列）。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 `notes/fix-queue.md` 为准（行号按复盘时的版本）：
- 7YT0、9CDE、VTRE、V6TW、JJ65：推演的 value 只算本场（`src/strategy/rollout-live.ts:369-371`），留给 boss 的药不计价；fight plan 默认关（`src/config.ts:336-340`），run plan 的「留药」传不到出牌问题。属于 Dai 待定的药水设计，没进 fix-queue。
- 7YT0：覆甲卡面没有衰减说明（d7dab83、cff33ba 已修）。
- 9CDE：boss T3 HP 护栏在 big-hit 回合把 rollout best 的燃烧+ 线换成纯格挡（`src/screens/combat-plan.ts:418-423`、`:1518`、`:1791-1797`），燃烧+ 晚 2 回合。for-dai 类问题。
- VTRE：流动铜液不建模（1966f0a 已修）；红头骨不进求解器（246d2be 已修）；商店 one-shot 把清单写进 choice 被判无效（1fdbb97 已修）。
- V6TW：流动铜液、自成型黏土（1966f0a、246d2be 已修）。
- DHGT：
  - 手里剑、舵盘不进求解器/rollout，稳定血清不建模（fix-queue 未修）。
  - 饱和盘先比死亡数、再比本回合掉血（b2080fb 的设计），T5 带燃烧+ 的 4 条线都因多掉 4–17 血排后面。Dai 的设计问题。
  - F9、F23 回答没有 route 字段（「the answer has no route」，fix-queue 未修）。
- JJ65：boss 要点把未升级坚毅算成清呼唤牌（a85c413 已修）；T8、T11 的「calc mismatch」（14520e0 已修）。
- ULQP：发光水把牌抽空后 rollout 判「no draw/discard piles」不可用（`src/strategy/rollout-live.ts:587`，fix-queue 未修）。

### 测试
- exp-update（a02ad58）：`tsc --noEmit -p tsconfig.json` 退出 0；vitest 第一次 1 个用例超时（tests/batch-i.test.ts 的 Red Skull/Clay 实盘局面，5000 ms，机器负载高），重跑 63 个文件 1156/1156 通过，退出 0。
- 合入 v3（在 `ops/v3-merge.lock` 锁里）：
  - 合入前：v3 3899c2a（I 批合入时）vitest 63 个文件 1156/1156。
  - 知识构建没在跑，工作区也没有未提交的知识数据，跳过「Refresh knowledge data」。
  - `git merge --no-edit exp-update` 是快进（3899c2a 就是 exp-update 这次的起点），v3 现在是 a02ad58。
  - 合入后：tsc 退出 0；vitest 63 个文件 1156/1156 通过，退出 0。
  - 没有停对局。

### 切片大小
- 样本：新抽一批，A8、A9 各 20 个状态 × 6 种界面，共 240 个。从 states.jsonl 用固定种子 20260929 抽取，只取 21:28 前已结束的局。
  - A8 没有新局（RRMY 21:55 结束，不在内），抽到的和上次是同一批。
  - A9 加了新局，是新的一批。
- 同一批状态分别用改前（3899c2a）和改后（a02ad58）的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 3.5k / 5.7k | 3.6k / 5.9k | 3.7k / 6.0k | 3.8k / 6.2k |
| 奖励 | 4.3k / 6.6k | 4.4k / 6.7k | 4.4k / 6.3k | 4.5k / 6.4k |
| 地图 | 5.8k / 6.4k | 5.9k / 6.6k | 5.9k / 6.4k | 6.0k / 6.6k |
| 事件 | 4.4k / 6.3k | 4.5k / 6.5k | 4.8k / 6.1k | 4.9k / 6.3k |
| 火堆 | 3.3k / 5.7k | 3.4k / 5.8k | 3.4k / 5.7k | 3.5k / 5.8k |
| 商店 | 5.3k / 6.0k | 5.3k / 6.1k | 5.6k / 6.0k | 5.6k / 6.1k |

- 初稿：中位涨 0.15–0.34k，单个切片最多涨 0.50k，最大 6.9k。
  - 主要来自 terror-eel、effigy-cost（一幕切片几乎都带）、act2-opening、act1-costs、deck-clock、deck-remove。
  - 之后把逐局细节压成一句，逐局、逐回合的数字留在本节。
- 最终：每种界面的中位涨 0.02–0.15k，单个切片最多涨 0.38k（地图），最大 6.7k（R2H1 A8 F19 二幕卡牌奖励，25 条经验 + 4 行统计，改前 6.6k）。
- 条目数：active 198（测试上限 200）；置信度 高 129、中 58、低 11。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：没有新增敌人条目。


## 知识库核对（2026-09-29 夜；exp-update 3ad8b75，合入 v3 1895a6c）

Dai 的规则（2026-09-29）：攻略 ironclad-guide.md、DeepSeek 手册 ds-handbook.md、Jev 提示 jev-hints.json、card-value.ts 的 TIER 表和角色分类、boss 笔记（run-journal.ts BOSS_NOTES、boss-clock.ts 的 note/mechanic）和经验库一样都是知识库，只分新旧：和复盘/日志数据冲突的改成数据版本（写明进阶和 n），数据说明无效的删掉，没有数据覆盖的先保留。

### 做法：计数从数据算，不再手写
照 22109ed、7819a1a、fe82439 的做法，写占位符，由代码从数据填。攻略和手册在 DeepSeek 建系统提示时填一次（fillGuideFacts），Jev 提示在 hintText 里填，boss 笔记在 bossNote 里填。
- tools/build-boss-damage.py 新增三项：
  - 每个 boss 按进阶的 by_asc：场数、赢、赢局/输局平均进场 HP%；
  - KAISER_CRAB.first_death：哪只钳子先死（另一只还活着时），或者都没有先死；
  - LAGAVULIN_MATRIARCH.sleep：醒的回合、醒时已掉的血量比例、牌组里的持续力量牌（与 card-value damageRole 的 scaling 集合一致）。
- tools/build-room-costs.py 新增 UnknownFight：开出战斗的问号，从 decisions.jsonl 的 COMBAT 决策判断。Monster、Elite、UnknownFight 另外带 fight_median/fight_p75：战内掉血，从第一条到最后一条战斗决策的 HP 差；死在这一层的按进场 HP 全掉算。原有字段不变。
- 新占位符：
  - 中文（攻略、手册、boss 笔记）：{CRAB_KILL_ORDER}、{LAG_SLEEP}、{BEAST_STUN}（monster DB 的 PLOW_POWER）、{LASER_T4}（激光基础伤害加蓄力给的力量）、{ACT1_ENTRY_HP}、{UNKNOWN_FIGHTS}、{BOSS_RECORD:ID}、{CARD_OUTCOME:ID}（outcome-stats）、{@N:KIND:ID:…}（进阶 N 的 DB 数字）；
  - 英文（Jev 提示）：{CRAB_KILLS_EN}、{LAG_NO_STRENGTH_EN}。
- 合入时 v3 的「Refresh knowledge data」(9f69cac) 和 exp-update 都改了 boss-damage.json、room-costs.json。冲突的只有这两个生成文件，在锁里用合入后的新 builder 从日志重建后提交。

### 攻略 ironclad-guide.md（行号按 exp-update 3ad8b75）
- :51、:91、:93 仪式兽击晕线
  - 旧：写死「约 150」「150 以下」。
  - 新：{BEAST_STUN}，填出来是「A0–A8 150、A9 160」。数据：monster DB PLOW_POWER，A8 22 场、A9 5 场。
  - :93「前期全力把它打到 150 以下」改成：为提前一回合击晕多掉的血别超过约 10（经验 beast-ringing-block）。
- :57 帝皇蟹击杀顺序
  - 旧：「51 场…先打死火箭的 12 场赢 9，两只一直都活着的 39 场只赢 8」。
  - 新：{CRAB_KILL_ORDER}。现在填出来是：57 场里火箭先死 12 场赢 9，碾碎爪先死 7 场赢 3，都没有先死（同回合一起死或我方先死）38 场赢 5。A8：火箭先死 3/4，其余 2/20；A9：其余 0/5。
  - 旧文把碾碎爪先死的 7 场也算成「两只一直都活着」，这个说法不对。
- :35 路线
  - 旧：「低血时绕开精英走问号/商店」。
  - 新：问号平均比确定的走廊便宜，但不是安全格；低血时每个问号都按「可能是一场走廊」算，不开战斗的只有商店和休息点。商店部分保留。
  - 数据 {UNKNOWN_FIGHTS}（room-costs，战内掉血 中位/p75）：

    | 进阶·幕 | 问号数 | 开出战斗 | 这些战斗 | 走廊 |
    | --- | --- | --- | --- | --- |
    | A8 一幕 | 562 | 122（22%） | 12/17 | 9/14 |
    | A8 二幕 | 298 | 71（24%） | 18/24.5 | 17/26 |
    | A9 一幕 | 190 | 41（22%） | 8/14 | 8/13 |
    | A9 二幕 | 81 | 13（16%） | 19/27 | 13/23.2 |

  - 例子：8KD7 A9 F21 91% 进问号，开出 4 只外骨骼虫，−39。
- :53 族母：补上牌组没有持续力量牌的情况，{LAG_SLEEP}。
  - 有持续力量牌：A8 11/12 赢，A9 1/1。
  - 没有：A8 7/13，A9 1/4。输的 BXAZ、QBCV、WQ67 都是等它自然醒，前两回合没有伤害进它。
  - T1–T2 一次打掉 ≥25% 打醒的 2 场都赢：EZ2L A8 52%，0NZB A9 26%。
  - 小伤害打醒的 10 场赢 5，都在 A0–A2。
  - 原来「25% 以上才打醒」的规则保留，补一句「被打醒的那回合它眩晕」。
- :55、:120 瀑布巨兽
  - 旧：「要赢靠早杀…慢打是输法」「要在 T10 前后打死」。
  - 新：输赢看击杀那回合的 HP 扛不扛得住自爆（{GIANT_BLOCK_RECORD}）。击杀越早层数越低，但早杀本身不保证赢。按预计击杀回合算层数，留住「层数 − 下回合格挡」的 HP，不为提前一回合击杀把 HP 换到这条线以下；也别拖，每晚一回合多 3 层，虹吸还会回血。
  - 数据：
    - 所需格挡（层数 − HP）：A8/A9 有击杀的 35 场，≤13 的 20 场赢 19，14–19 的 1 场赢 0，≥20 的 14 场赢 3；
    - A9 11 场赢 4，T10 前击杀赢 3/5，输的 5NFG、2ZCK 击杀时只剩 14、20 血，对 41、44 层。
  - 三处的 {GIANT_KILLS_A8}/{GIANT_KILLS_A9}/{GIANT_BLOCK_RECORD} 保留，每个都还是出现 3 次。
- :21、:23 挑衅从「好牌(A)」移到「看体系(B/C)」，写明 {CARD_OUTCOME:TAUNT}：
  - A8 一幕：拿了 51 局过本幕 boss 65%，给了没拿 35 局 77%；
  - 二幕：27 局 22%，19 局 32%。
  - 经验 card-taunt 同向。
- :69 凋萎：「坚毅/燃烧契约可以消耗凋萎」→「坚毅+/燃烧契约」，注明未升级的坚毅是随机消耗（经验 card-true-grit、aeon-wither）。
- :46、:54 的坚毅说法（a85c413 改过）和 card-true-grit 一致，没动。

### 手册 ds-handbook.md
- :3 版本号改成 2026-09-29，注明做过知识库核对。
- :5「孤注一掷与污浊药水永不使用」→「孤注一掷永不打出」。
  - 代码事实：污浊药水 09-28 起不再禁用（combat-plan.ts 注释，Dai 2026-09-28），自伤 12 算进 hp_lost，喝不喝由 Jev 选。
- :33「污浊药水…代码不会喝，只能卖钱」改成上面的代码事实，另加「默认配置下进商店前代码会把它丢掉」（config shopDiscardPotions）。建议的方向（3 瓶不如 1 瓶随机药）没变。
- :38 一幕 boss 进场血量：旧的「A8 90%/83%（141 场），A9 90%/88%（44 场）；灵魂异鱼…」→ {ACT1_ENTRY_HP}。
  - 现在是：A8 91%/83%（144 场），A9 90%/87%（49 场）；异鱼 A8 90%/82%（21 场），A9 92%/92%（12 场）。
- :54「为了伤害多掉血是最常见的错误」后面加例外：墨影幻灵滑溜还在时，多打几段的线值得多掉几血。
  - 依据 3SBP A9 T1：Jev 选了不掉血、只打 2 段的线，rollout 最优线是打 4 段、−8；T1–T5 只打进 9，墨影幻灵剩 56 时我方死。
  - 另见经验 vantom-multihit（n=9）。
- :56 下回合大招
  - 激光：「49」→ {LASER_T4}，即 A8 33、背后 49，A9 38、背后 57。激光基础 A8 31、A9 35，蓄力给火箭 +2/+3 力量（DB，A8 30 场、A9 5 场）。
  - 知识淹没：「30」→ DB 的 A8 8×3、A9 9×3，每段再加力量。
  - 机甲骑士：「T4 打 30~40」→ 重劈基础 A8 35、A9 40，再加力量（经验 mecha-knight：A8 40/45/50，A9 45/50/55）。
- :66–:68 boss 战绩改成 {BOSS_RECORD:…}：
  - 知识恶魔：旧「6 局死在它手上」，现在 A8 20 场赢 8、A9 2 场赢 1；
  - 帝皇蟹：旧「5 局死在它手上」，现在 A8 24 场赢 5、A9 5 场赢 0；
  - 实验体：旧「2 胜 2 负」，现在 A8 3 场赢 0、A9 1 场赢 0。
  - 低进阶的赢局 run id 保留；帝皇蟹条加一句「单体伤害先打火箭」。
- :71 巨兽：与攻略同样的改写。

### Jev 提示 jev-hints.json
- matriarch-asleep
  - 旧：While the Matriarch sleeps, HP damage wakes it and costs its free turns. Play powers and set-up cards instead of chipping it.
  - 新：HP damage wakes the sleeping Matriarch, costing free turns: play powers and set-up cards, not chip damage; a 25%+ HP burst is fine.
  - 证据加 0NZB、EZ2L（2 场 ≥25% 爆发都赢）。
- matriarch-sleep-turns
  - 旧：Sleep turns are free turns: spend all energy on powers or lasting block…
  - 新：Sleep turns pay off only with powers or lasting block to play ({LAG_NO_STRENGTH_EN}). On Asleep 1, attacking costs nothing extra.
  - {LAG_NO_STRENGTH_EN} 填出来是「decks without a lasting-Strength card won A8 7/13, A9 1/4」。证据加 BXAZ、QBCV、WQ67。
- crab-rocket-first：「runs won 9/12 vs 8/39 keeping both alive」→ {CRAB_KILLS_EN}，填出来是「Rocket died first 9/12 won, otherwise 8/45」。
- crab-charge：激光后面加「plus Strength」。依据 DB：CHARGE_UP 给 +2（A8）/+3（A9）力量。
- hp-trade-boss
  - 旧：Extra HP traded for damage decided many lost boss fights. Burning Blood heals only after combat. Prefer lower hp_lost unless the line kills soon.
  - 新：Burning Blood heals only after combat: prefer lower hp_lost unless the line kills soon. Exception: against Vantom's Slippery, prefer the line with more hits.
  - 依据：3SBP T1，证据加 3SBPKG9603WD。
  - 第一句（原因论断）是为了 25 词上限删的，不是数据否定了它；同样的内容手册 :54 还在。
- 保留：giant-eruption「Kill it by turn 10, with HP plus block above the stacks」两半都有，测试要求保留。

### boss 笔记（run-journal.ts BOSS_NOTES；boss-clock.ts BOSSES）
- run-journal.ts:179 族母：补上「被打醒的那回合眩晕」「别用小伤害打醒」「没有持续力量牌时沉睡回合几乎白过，一次能打掉 25% 以上就打醒」，数字用 {LAG_SLEEP}。
- run-journal.ts:181 巨兽
  - 旧：「要早杀…拖得越久越难，要抢伤害」。
  - 新：输赢看击杀那回合的 HP 加下回合格挡够不够层数；击杀越早层数越低，但击杀时 HP 不够照样输；按预计击杀回合的层数留 HP。
- run-journal.ts:183 帝皇蟹：「51 场…8/39」→ {CRAB_KILLS}（中文全文）。
- boss-clock.ts
  - KAISER_CRAB 的 note：「51 logged crab fights … 8/39」→ {CRAB_KILLS}（英文）。
  - WATERFALL_GIANT 的 mechanic：「kill it early (…)」→「HP at the kill plus that turn's block must cover the stacks (…); an earlier kill has fewer stacks but is lost too without the HP (…)」。

### 卡牌估值 card-value.ts
- 口径：outcome-stats.json（A8 151 局）。比较的是拿了的局和「给了没拿」的局过本幕 boss 的比例。只改每组比较两边 n≥15 且各幕方向一致的牌。

| 牌 | 旧 | 新 | 依据（拿了 vs 给了没拿，过本幕 boss） |
| --- | --- | --- | --- |
| TAUNT 挑衅 | 62 | 50 | A8 一幕 0.65（n=51）vs 0.77（n=35），平均终层 26.0 vs 30.0；二幕 0.22（27）vs 0.32（19）；经验 card-taunt |
| MOLTEN_FIST 熔融之拳 | 54 | 44 | A8 一幕 0.60（47）vs 0.74（42）；二幕 0.13（23）vs 0.25（24）；A9 一幕 0.41（17）vs 0.64（14） |
| TWIN_STRIKE 双重打击 | 58 | 64 | A8 一幕 0.71（55）vs 0.62（26）；二幕 0.35（31）vs 0.19（16）；终层两幕都 +1.8 |

- 角色分类：Aeonglass 的「exhausts Withers」+8 不再给 TRUE_GRIT。未升级的坚毅随机消耗，选不中凋萎（card-true-grit、aeon-wither）。灵魂异鱼那边的 BECKON_CLEARERS 早就是这样。
- 拿不准，没改（A9 口径用 `build-outcome-stats.py --ascension 9` 另算，55 局）：
  - SWORD_BOOMERANG 46：一幕 A8 0.80（40）vs 0.63（41），A9 0.57（23）vs 0.50（10）；二幕 A8 0.12（8）vs 0.29（34）。各幕方向不一致。
  - EXPECT_A_FIGHT 56：A8 一幕 0.71（17）vs 0.82（22）。其余比较 n 都小，只有一组。
  - BLUDGEON 60：A8 一幕 0.58（19）vs 0.73（22），终层 22.7 vs 30.7。其余比较 n 都小。
  - HEADBUTT 62：A8 一幕 0.68（62）vs 0.74（27）；A9 一幕 0.33（18）vs 0.78（9），没拿的一边 n 小。
  - 方向不一致：SETUP_STRIKE、TRUE_GRIT、BLOOD_WALL、INFERNO。
  - THUNDERCLAP 40：数据也偏负，和现有低分一致，不用改。
  - SWORD_BOOMERANG 在 AOE 集合里，打螃蟹加 +12「群伤」；经验 card-sword-boomerang 说它对螃蟹不算真群伤（随机目标）。这是角色分类问题，没改。

### 经验库 experience.json → 2026-09-29.8（只改文字，n 和证据不动；active 条目数不变）
- 和数据冲突，改成数据版本：
  - crab-kill-order：
    - 旧「56 场…两只一直都活着的 44 场只赢 8 场（A8 2/19）」→ 57 场：其余 45 场赢 8，其中碾碎爪先死 7 场赢 3、都没有先死 38 场赢 5；A8 其余 2/20。
    - 激光旧「A8 47–49、A9 54」→ A8 33、背后 49，A9 38、背后 57。
  - crab-entry：激光同上（旧「A8 41–49、A9 54」）。
  - a9-damage：旧「激光 48→54」→ T4 激光正面 33→38、背后 49→57。
  - giant-explode：旧「≥20 的 15 场赢 3」→ 14–19 的 1 场赢 0，≥20 的 14 场赢 3。
  - lag-sleep：
    - 旧「开场沉睡是免费回合：除非能斩杀别在沉睡时打醒它」
    - 新：只对有能力/力量牌可打的牌组是免费回合；别用小伤害打醒（10 场赢 5）；一次 ≥25% 可以打醒（2/2）；没有持续力量牌 A8 7/13、A9 1/4。
  - route-no-chains：旧「二幕问号约 1/6 开出战斗（赢局中位 −21.5）」→ A9 二幕 81 个里 13 个（16%），战内 19/27，走廊 13/23。
  - card-sword-boomerang：「对帝王蟹不算 AOE（会单杀残血钳子触发蟹之怒）」的理由来自已退役的 crab-rage-aoe，改成「随机目标，不能把伤害集中到火箭上，也可能先打死碾碎爪」。
- 代码事实：
  - deck-clock：旧「时钟默认火堆能回到 85% 进场」→ 现在按当前 HP 加一次休息的回血算，仍是上限（expectedEntryHp）。
  - ts-phase3：旧「rollout 让无实体一直持续或一直不来」→ 951e815 起 rollout 和时钟按天罚隔回合建模，88% 那个数来自旧 rollout。
  - card-fight-me：旧「code 给它的卡值偏低」→ 已按数据从 25 提到 74。
- 其余带「代码会/不会」的条目核对过，和现在的代码一致，没动：
  - card-armaments（升级效果仍未建模）
  - potion-swift
  - potion-fysh-oil
  - potion-code-discard
  - relic-whispering-earring（时钟仍把耳环当普通 +1 能量）
  - relic-toasty-mittens
  - card-purity（仍没有分级数据）
  - card-rolling-boulder（写的是「当时」）
  - beetle（代码按精英打）
- 改过的 10 条经验合计多 456 字，最多的是 lag-sleep +124。

### 删掉的
- 「慢打是输法」「要赢靠早杀」「要早杀」：A9 T10 前击杀只赢 3/5，输局都是击杀时 HP 不够。改成看击杀时 HP 的说法。
- 「低血走问号」作为安全选项：问号开战率 16–24%，开出来的战斗和走廊一样重。
- 手册「污浊药水永不使用」「代码不会喝」：代码 09-28 起已不禁用。
- card-sword-boomerang 里基于已退役 crab-rage-aoe 的「蟹之怒」理由。
- hp-trade-boss 的原因句：为词数删，不是数据否定。

### 没有数据覆盖，保留
- 攻略 §2 流派、§3 其余评级（包括头槌的 A）、§4 选牌原则、§8 进阶说明、§9 低进阶招式记录（已注明以 boss_db 为准）。
- 巨斧机器人、女王、永世沙漏、造门者的打法。
- 手册：「进二阶段 HP 最好 ≥60」（实验体 A8/A9 只有 4 场）、进阶 2 一节（历史统计）、一幕构筑统计（41 局，和 act1-strength 同向）。
- 胧光怪、骇鳗、蜂群术士（A7–A9 9 次致死，核对 runs.jsonl 一致）等条目：和经验库一致。

### 需要 Dai 定
1. 代码硬规则「不打醒熟睡敌人」（combat-plan.ts hardRuleLines）：只要有不打醒的线，就删掉所有打醒的线（赢下战斗的线除外）。
   - 数据：一次打掉 ≥25% 打醒的 2 场都赢（EZ2L、0NZB）。A9 没有力量牌、等它自然醒的 3 场全输。
   - 知识文字现在允许 ≥25% 的爆发打醒，但硬规则会挡住这类线。要不要给硬规则加 25% 例外？n=2。
2. 墨影幻灵滑溜回合：hp-trade-boss 的例外只有 3SBP 一场作依据（方向和 vantom-multihit n=9 一致）。3SBP 复盘提议在选项里加「本回合命中段数」一列，没做。
3. 路线投影里问号仍按 room-costs 的 Unknown 算（中位 0），开战风险没有单列。要不要按「x% 概率一场走廊」给 p75？这是策略改动。
4. 上面「拿不准」的 4 张牌，以及飞剑回旋镖算不算螃蟹的群伤。
5. 药水类条目方向没动。

### 测试
- exp-update：
  - 改前 a02ad58：63 个文件 1156 个用例（上次记录）。
  - 改后 3ad8b75：tsc 退出 0；vitest 66 个文件 1169 个用例。第一次 batch-i 的 Red Skull/Clay 实盘局面超时（5000 ms，负载高），重跑全过，退出 0。
  - 新测试：tests/knowledge-check-facts、-guides、-cards。
  - 改了读旧文字的断言：batch-g 进场血量、boss-clock 巨兽 mechanic、card-value 双重打击分。
- 合入 v3（在 `ops/v3-merge.lock` 锁里，脚本 scratchpad/kb/merge-v3-kb.sh）：
  - 合入前：v3 a02ad58 加上未提交的刷新数据，vitest 63 个文件 1156 个用例。全量跑有 2 个是负载问题：batch-i 超时、rollout-live 的喝药选项用例，单独重跑都通过。
  - 知识构建没在跑。未提交的刷新数据先提交为 9f69cac「Refresh knowledge data」。
  - `git merge --no-edit exp-update` 只在 boss-damage.json、room-costs.json 两个生成文件上冲突，在锁里用合入后的 builder 从日志重建：532 场 boss 战，358 局。
  - 合并提交 1895a6c。
  - 合入后：tsc 退出 0；vitest 66 个文件 1169 个用例全过，退出 0。
  - 没有停对局，没碰 ops/STOP。


## 2026-09-30 第九次增量：A8 窗口第 1–11 局，同步知识库核对（version 2026-09-30.1，分支 exp-update，cf73b66；合入 v3 见文末）

### 来源
- `notes/lessons.md` 末尾 11 节 A8 复盘（Dai 09-29 21:26 起的 A8 对比窗口第 1–11 局），全输：
  - RRMYC7MCSYX8（F33 帝王蟹）、5LRZ7HJ7YGSY（F48 女王）、5PHF3ML3XMJN（F17 瀑布巨兽）、UNRLW0W3XWLD（F33 无厌沙虫）、YVYZ6QHA85FN（F48 永世沙漏）、Q8XR6EXAF6QV（F48 女王）、3RMEW7ZXS8TF（F33 帝王蟹）、NH8A3VBDRDZW（F33 无厌沙虫）、2WRUNPS2ZSM4（F17 瀑布巨兽）、79YRPJ8TCCZ5（F33 知识恶魔）、86C3PHPYHX7L（F33 知识恶魔）。
  - 03:33 的勘误按勘误用（Q8XR 女王战 focus 5/8 问、YVYZ 饱和从 T2 开始、86C3 T7 第一问没跟 best、2WRU 的 guide 填数时间）；这几处都没进条目。
  - 第 12 局 MZFVC3RB3JD8（19:17Z 结束）还没复盘，不算；手写数字的截止点是 86C3（18:47:45Z），A8 161 局。
- 日志（只读）：
  - 从 states.jsonl 字节偏移 1.79e9 起流式读一遍，抽出 161 局 A8 的每场战斗（2091 场：走廊 1425、问号战 215、精英 210、boss 241）和每层第一帧/最后一帧（4460 层）。脚本沿用第八次增量的 A9 抽取，只换进阶和截止。
  - 用同样口径在「去掉这 11 局」的 150 局上重算，和条目里原有的 A8 数一致：boss 218 场 ≥75% 进场 0 瓶 8/21、带药 103/149；二幕 boss 65 局 19/43、1/22；沙虫 7/15、1/8；知识恶魔 7/10、0/9；螃蟹 0 瓶 0/4、带药 5/14；异鱼 0 瓶 1/4；族母 ≥85% 12/16；甲虫 27 场死 3、−28.5/−38.2；多尼斯异鸟 15 场 32/40.5；一幕精英 116 场死 7、25/36；一幕 0/1 只精英 50/84 局过二幕 boss 2/15；二幕开头 103 局 18 死、中位 38.8%；打击+防御 ≥8 张 7/27、≤6 张 7/21。
  - 两处原数和重算不同，改成重算值并写明 n：rest-smith-threshold 的 A8 二幕 boss 分组（原 n=23/9，重算 33/10，比例一样；原数是第二次增量时的局数）、route-shops 的 A8 金币/商店分组（原 63 场，重算 65 场）。
  - `tools/boss-fights-extract.py --asc 8`（在只含 A8 boss 帧的副本上跑，按 86C3 截止过滤）+ `tools/boss-clock-calibrate.ts --rows`：按现行时钟（c52587c）重算 A8 241 场 boss 战的实打/估值。原数（螃蟹输局 18 场 0.83、沙虫 15 场 0.95、异鱼 0.53–0.77、墨影幻灵 0.56）在去掉新局后原样复现；巨兽原写 0.70/0.98，现行时钟下旧 27 场是 0.68/0.97。
  - 女王、沙虫另 grep 全部进阶的战斗帧（`"enemy_id":"QUEEN"`、`"THE_INSATIABLE"`），算聚合体什么时候死、T1–T2 伤害打给谁、沙虫输局死在哪条线；结果和新 builder 的输出一致（见「知识库其他部分」）。
  - `tools/build-outcome-stats.py` 用截到 86C3 的 runs.jsonl 重建（A8 161 局、A9 55 局），给卡牌 TIER 用。
  - monster DB 的 boss 每回合掉血用 v3 工作区刷新后的版本（含 MZFV）；这些数现在由占位符 {BOSS_LOSS:ID:ASC} 从数据填。
  - DeepSeek 推理、run plan、决策原文按复盘节里引用的位置核对；条目和本节引的原话都有出处。
- 口径同前：「战内掉血」= 第一帧 HP − 最后一帧 HP，死亡单独计；走廊只算 Monster 房，问号另算。
- 先在 exp-update 上 `git merge --no-edit v3`（快进到 c52587c）再改；合入前又合了一次 v3（950cbf5，M 批），见文末。
- 结果：新增 0 条，更新 76 条（58 条加证据，18 条只改数字/文字/代码事实），退役 0；active 198，总数 221 不变；置信度 高 131、中 56、低 11（soul-nexus、punch-construct 到 n=5 升为高）。

### 做法变化：经验库的数字也从数据填
- 经验库条目的文字现在和攻略一样过 fillGuideFacts（`src/knowledge/experience.ts` lessonText，DeepSeek 的知识切片和 Jev 的战斗经验都用它）。
  - 起因：`experience.json:389` giant-explode 写着「A8 27 场：T10 前击杀 13/15」，同一个 DeepSeek 输入里攻略填出来是「29 场…14/17」（2WRU 复盘、fix-queue 已列）。
  - 改成占位符的：giant-explode（{GIANT_BLOCK_RECORD}、{GIANT_KILLS_A8}、{GIANT_KILLS_A9}）、crab-kill-order（{CRAB_KILL_ORDER}）、crab-entry/crab-kill-order/a9-damage 的激光（{LASER_T4}）、lag-sleep（{LAG_SLEEP}）、queen-plan（{QUEEN_AMALGAM}）、insatiable-escape（{SANDPIT_DEATHS}）、route-no-chains（{UNKNOWN_FIGHTS:9:2}）、各 boss 的战绩（{BOSS_RECORD:VANTOM/CEREMONIAL_BEAST/THE_KIN/LAGAVULIN_MATRIARCH/SOUL_FYSH/THE_INSATIABLE/KAISER_CRAB/AEONGLASS}）、boss 每回合掉血（{BOSS_LOSS:KAISER_CRAB:9} 等，a9-damage、crab-entry、insatiable-clock、kd-dps）。
  - 进阶分组的胜率（≥75% 进场几胜几负）、精英/走廊的中位 p75 等口径和生成数据不同（生成数据把死亡算作全掉），仍手写，按本次重算更新。
- 新占位符（`src/strategy/boss-clock.ts` GUIDE_FACTS / fillGuideFacts）：
  - {QUEEN_AMALGAM}（中文）/{QUEEN_AMALGAM_EN}：queenAmalgamRecord，数据来自 boss-damage.json QUEEN.amalgam。
  - {SANDPIT_DEATHS}/{SANDPIT_DEATHS_EN}：sandpitDeathRecord，数据来自 THE_INSATIABLE.deaths。
  - {UNKNOWN_FIGHTS:ASC:ACT}：unknownFightsText 的一格。
  - {BOSS_LOSS:ID:ASC}：monster DB bosses.*.hp_loss_per_turn 在该进阶的中位（没有该进阶的记录填「?」）。
- `tools/build-boss-damage.py` 新增两项：
  - QUEEN.amalgam：每场女王战聚合体在女王还活着时死于第几回合（没死为 null），以及第 3 回合第一帧时两者各掉了多少血（T1–T2 的伤害打给了谁）。
  - THE_INSATIABLE.deaths：每场输掉的沙虫战最后一帧的死线：沙坑还剩 ≥2 → hp；沙坑 1 且 HP + 格挡 ≥ 显示的攻击 → sandpit；沙坑 1 且攻击也够杀 → both。
  - boss-damage.json 用新 builder 从日志重建。
- 填出来的数（截至本节写作，含 MZFV）：
  - 女王 17 场：赢的 5 场都先打死聚合体（T3–T8；A8 RBJ4 T3）；输的 12 场 7 场没打死、5 场 T5–T9 才打死；T1–T2 伤害多进女王的 6 场赢 1、多进聚合体的 11 场赢 4。A8 8 场赢 1。
  - 沙虫输局 27 场：死在 HP 上（沙坑 ≥2）14、被沙坑吞掉 9、同一回合 4；A8 17 场 10/4/3，A9 3 场 2/0/1。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| 帝王蟹（RRMY、3RME 输，YVYZ 赢） | RRMY 63/83（76%）、29 张 1 升级，7 回合 25.9/回合（需 61.1），碾碎爪 −80、火箭 −101；3RME 73/80（91%）、25 张 4 升级，7 回合 22.1/回合，碾碎爪 −69、火箭 −86，T1 岿然不动用在 8–16 的来袭上，T4 激光 −27。两局 Jev 提示都挂着「先打火箭」，rollout best_order 多数是「碾碎爪 > 火箭」，两只平摊、一只都没死。YVYZ 91/91、29 张 5 升级，燃烧+、狱火+（每回合 9 群伤）、彼岸咆哮，8 回合 53.3/回合，T8 两爪同回合死。现行时钟：RRMY 0.68、3RME 0.76、YVYZ 1.41；A8 输局 20 场中位 0.80（0.43–1.32）。A8 螃蟹 26 场赢 6：≥75% 进场 0 瓶 0/5、带药 6/16 | crab-entry、crab-dps 加 RRMY、3RME、YVYZ；crab-kill-order 加 RRMY、3RME，YVYZ 进反例（没有哪只先死的赢局）；crab-potions 只改数字 |
| 女王（5LRZ、Q8XR） | 5LRZ 57/92（62%），T1 58 伤全进女王，聚合体到死 111；26.3/回合（只打女王也要 69.8）。Q8XR 80/80、2 瓶药，T1 100 伤里 87 进女王，聚合体 T6 才死，之后 T7 −24、T8 −16；46.5/回合（需 63）。DeepSeek 三份 run plan 都写「T1–T2 爆发聚合体」，Jev 提示里没有女王条目，T1 rollout 饱和按本回合掉血排出打女王的线。全部进阶 17 场见上（赢的都先打死聚合体；T1–T2 多进女王 1/6） | queen-plan 改用 {QUEEN_AMALGAM}，删掉「A8 5 场全输」（RBJ4 A8 赢过）；queen-hp、queen-prep 加两局；新 Jev 提示 queen-amalgam-first |
| 女王时钟 | 两局 DeepSeek 抄的时钟：5LRZ「need 120, est 25」、Q8XR「need 80, est 30」；实打 26.3、46.5（全场两只合计）。queen-hp 原写「实际输出只有估算的 0.7–0.75」来自旧时钟 | queen-hp 改成现行时钟下估值不再偏高、输在需要的量 |
| 无厌沙虫（UNRL、NH8A） | UNRL 79/80（99%）、29 张 2 升级，9 回合 33.4/回合（需 36.6），逃离 5 张，沙虫剩 28，死于 HP（最后一帧沙坑 2）；NH8A 58/86（67%），T3 42 血、HP 是先到的线，Jev 照 sandpit-no-race 选 22 伤的逃离线（rollout best 41 伤），死时沙坑 2。A8 25 场 ≥75% 7/16、<75% 1/9；现行时钟 UNRL 1.16、NH8A 0.46，A8 输局 17 场中位 0.95。输局死线见上：A8 17 场里 10 场死在 HP 上 | insatiable-entry、insatiable-clock 加两局；insatiable-escape 加 NH8A、{SANDPIT_DEATHS}；Jev 提示两条改写 |
| 知识恶魔（79YR、86C3 输，5LRZ、Q8XR 赢） | 79YR 55/80（69%）、撕裂+ 在场，6 回合 34.5/回合（需 66.5），T3 心灵腐化下 4 张手牌 0 格挡吃 24，T5 17 血时代码选瓦解（撕裂时成本 −1 绕过了 HP 闸，M 批 556a99c 已修），T6 死。86C3 80/88（91%）、24 张 0 张力量牌、10 张格挡 + 壁垒，17 回合实打 13.6/回合（现行时钟 0.44）。5LRZ 95%、Q8XR 89% 都 T9 赢（44.3/回合）。A8 ≥75% 进场 9/13、<75% 0/10；带永久力量牌 ≥75% 进场 9/12，0 张 0/1 | kd-dps 改数字、加两局；kd-block、kd-single-target 加证据 |
| 瀑布巨兽（5PHF、2WRU 输，UNRL 赢） | 5PHF 满血、23 张 0 升级，T10 以 25 血对 39 层击杀，下回合手里 0 张格挡（所需格挡 14，落在 14–19 那格）；T5 压力炮 −21 手里没格挡。2WRU 满血、23 张 2 升级、0 锻造（F16 带皇家枕头回血溢出 25），19.7/回合，T15 以 12 血对 54 层击杀；T10 −17、T11 −13。UNRL T9 41 血对 36 层击杀，活。A8 30 场赢局升级 1.2、输局 2.1；现行时钟输局 11 场 0.68、赢局 19 场 0.99 | giant-explode 换占位符、加两局；giant-gun 加两局（只写格挡那半句）；giant-deck 改数字、加 2WRU |
| 永世沙漏（YVYZ） | 46/85（54%）、38 张 7 升级，7 回合 22.7/回合（需 76.3），复制药水复制了耸肩无视，T4 手握重锤 0 伤；三幕开头 5 连战，F35 起 7 场走廊 −161；三幕加 9 张牌 29→38。A8 4 场 0 胜 | aeon-clock 下限改 22.7、加 YVYZ；aeon-wither、deck-bloat、act3-hallways 加 YVYZ |
| 仪式兽（3RME、79YR、NH8A、86C3 都赢） | 3RME 燃烧+ 32.8/回合、79YR 撕裂+ 37.4、NH8A 势不可当 29.1，7–9 回合打完；86C3 0 张永久力量/成长牌，15 回合 17.5/回合，5 血险胜（现行时钟 0.92）。A8 26 场：有永久力量/成长牌 15/15，没有 8/11；A9 有 3/4，没有 0/1 | beast-clock「一幕至少要一张永久力量牌」改成数据（分水岭，A8 没有的也赢 8/11），加四局 |
| 异鱼（RRMY、YVYZ 赢，都 0 瓶） | RRMY 71/80、燃烧契约，7 回合 31.6/回合；YVYZ 79/91、没有能消耗呼唤的牌，13 回合 17.0/回合。A8 ≥75% 进场带药 13/13、0 瓶 3/6（原 1/4）；A7–A9 有这类牌 16 场赢 12、没有 24 场赢 20 | fysh-damage、fysh-beckon、potion-empty-slots 只改数字 |
| 族母（5LRZ 98/98 赢）、同族（Q8XR 满血 T5 赢） | 族母 A8 ≥85% 进场 13/17；Q8XR 同族击杀顺序「神官 > 信徒」，燃烧 + 与我一战！+，5 回合 | lag-entry、kin-priest-focus、kin-scaling 加证据 |
| 一幕精英（A8） | 骇鳗 27 场死 1、赢局 30/39.5（5PHF 必经时 61% 进场剩 2 血）；珊瑚群 20 场死 1、23/35.5；幽灵鳗 22 场死 1、13/25；异蛙 20 场全胜、16.5/26；异鸟 19 场全胜、33/38.5；雕像 27 场死 4、30/36.5（赢局中位约 37% 最大生命，最多 61%） | 条目里写的「异蛙掉约 45–50%」「雕像掉 40–70%」「幽灵鳗实测掉 30–55」和 A8 数据冲突，改成数据；各条加本批证据 |
| 二、三幕精英（A8） | 蜂群术士 26 场死 4、37/49（UNRL −49、86C3 −51 拖 12 回合、3RME −33）；千足虫 21 场赢 15、43/53（Q8XR −51、86C3 满血 −60）；感染棱柱 17 场死 4、29/38（5LRZ −38、YVYZ −14）；机甲骑士 5LRZ 98% −66（T7 重劈力量 11 −44）；灵魂枢纽 Q8XR 满血 −60 | entomancer、entomancer-cost、decimillipede、prism、mecha-knight、soul-nexus 改数字加证据 |
| 走廊（A8） | 甲虫组 29 场死 3、28/37（RRMY 58% −29）；三只盛碗虫 NH8A 84% −41；猎人杀手 35 场死 3、p75 29（79YR −32）；棘刺蟾蜍 36 场死 4、19/25.5（RRMY 问号里 −32）；地道虫 56 场全胜（≤6 回合 48 场中位 13，≥7 回合 8 场 37.5）；异螨 39 场死 2、14/24（3RME −28）；啃咬机 36 场死 1、18/27；产卵虫 32 场死 2、21/29（5LRZ −33）；草蜢 54 场全胜、18/26（79YR −34）；虱虫之祖 30 场死 2、14.5/23；青蛙骑士 YVYZ −46；拳击构装体 YVYZ −28、Q8XR 问号 −32 | 各条改数字，逐局细节只留在本表 |
| 一幕精英数（A8 161 局） | 过一幕/二幕 boss：0 只 50 局 34/2，1 只 89 局 63/15，2 只 20 局 13/5，3 只 2 局 2/1（Q8XR、3RME 一幕打 3 只都过一幕 boss，精英之间都有火堆）。A9：0 只 11 局 5/0，1 只 37 局 20/2，2 只 7 局 4/1 | elite-need-one 改数字；elite-no-double 的「一幕最多主动打 1 只精英」和数据冲突，改成数据（多打一只没有变差，出事的是三层内连打两只） |
| 二幕开局与 0 精英路线（A8） | 112 局进二幕，18 局死在第一个火堆前，走到的 94 局中位 41%（p25 27%）。二幕 0 精英 56 局过二幕 boss 11（21 局死在走廊），1 只 49 局过 10（12 局死在精英），2 只 7 局过 2。本批 RRMY、NH8A、79YR 走 0 精英：路线投影进 boss 81–100%，实到 76%、67%、69%，都输在 boss；NH8A F24 为绕开精英改走 5 场走廊（最后 3 场连打）共 −88，投影约 −50 | act2-opening 改数字、加三局；route-no-chains 加 NH8A、YVYZ |
| 二幕 boss 进场（A8 74 场） | ≥75% 22/50（44%），<75% 1/24（4%）；一幕 ≥75% 100/129（78%）、<75% 12/23（52%）。本批 ≥75% 进二幕 boss 7 场赢 3（5LRZ、Q8XR、YVYZ），RRMY 76%、3RME 91%、UNRL 99%、86C3 91% 输在输出 | route-entry-hp 改数字、加 79YR、NH8A |
| 锻造（A8） | 二幕 boss 按「≥75% 进场」×「≥3 张升级」：51%（19/37）、23%（3/13）、7%（1/15）、0%（0/9）；一幕 0 次锻造 37/57 过一幕 boss，≥1 次 75/95。2WRU 三个火堆全回血、0 锻造 | rest-smith-threshold 改数字、加 2WRU |
| 删牌 | UNRL F14 代码删牌顺序「打击 120、防御 110、受伤 100」，DeepSeek 推理认定删受伤更好、最后照顺序删了打击，受伤到死都在（11 次进开局手牌）；3RME F5 同样「孢子心灵 100」排在基础牌后；86C3 带打击木偶（打击 9 伤）仍删两张打击、留下 4 防御。A8 二幕 boss 74 场：打击+防御 ≥8 张 8/29、≤6 张 8/25 | deck-remove 加 UNRL、86C3，改数字；攻略删牌句补诅咒、打击木偶 |
| 一幕 boss 构筑统计 | A8 一幕 boss 152 场：牌组张数 20.3/20.5、非基础格挡 2.6/3.0、AOE 张数 1.8/1.9（≥2 张 AOE 的比例赢局 55%、输局 68%）都不分胜负；永久力量/成长牌赢局 62%、输局 32%（0 张 43/70 过、≥1 张 69/82），恶魔形态 6:0，升级 1.7/1.4，进场 91%/84%。deck-strength-aoe 和手册写的「赢局 81% 有 AOE、输局 47%」来自 41 局低进阶 | deck-strength-aoe 改成 A8 数据；手册同改 |
| 时钟（现行，A8 241 场） | 输局实打/估值中位：墨影幻灵 0.56、异鱼 0.59、巨兽 0.68、帝王蟹 0.80、知识恶魔 0.94、沙虫 0.95、族母 0.83；赢局仪式兽 1.46、知识恶魔 1.51、帝王蟹 1.35。本批偏低的 86C3 知识恶魔 0.44（0 力量牌）、NH8A 沙虫 0.46；偏高的 3RME/79YR/NH8A 仪式兽 1.53–1.70 | deck-clock 改数字、加 86C3、NH8A |
| 先古遗物 | 营养汤：5LRZ 过二幕 boss、UNRL 没过（A8 4/8，A7–A9 5/12）；烘焙手套：NH8A 没过（A7–A9 8/23） | relic-nutritious-soup、relic-toasty-mittens、neow-growth 只改数字 |
| 事件、遗物 | Q8XR F38 滑脚木桥满血连续重抽三次（−3、−4、−5），点名打击后跨越；86C3 真理石板读一次（−3 上限换防御+）后停；3RME F32 22/80 回血到 46，缩放仪开场 +25 后 73/80 | event-slippery-bridge、event-tablet-of-truth、relic-pantograph 加证据 |
| 留给 boss 的药（只改数字） | 11 局都有：RRMY 2（F22 为螃蟹买的虚弱 + 爆炸安瓿，F23 走廊 T1 喝）、5LRZ 3（F20 为恶魔买的能力药水 F22 喝；F43/F44「boss-grade」的鲜血 + 异鱼之油 F45 精英喝）、5PHF 1、UNRL 3、YVYZ 2、Q8XR 3、3RME 2、NH8A 2、2WRU 2、79YR 1、86C3 1，约 22 瓶。七批合计 69 局 58 局、约 113 瓶。A8 窗口 11 局每局走廊/问号战喝 6.6 瓶、精英 1.8、boss 1.6，二幕 boss 进场平均 0.7 瓶（n=9；A8 全部 74 场 1.36）；A8 ≥75% 进场的 boss 0 瓶 12/29、带药 111/160 | 只改 potion-save-for-boss、potion-empty-slots、crab-potions、fysh-damage 的数字，n 不变 |
| 药水的代码事实 | 2f6ae4c（L 批）起白兽雕像题另有「先在地图上喝掉某瓶能随时喝的药再走」，题面写明果汁由代码在下一战第一帧喝（5LRZ 当时只有两项，丢了果汁） | potion-code-discard 只改描述代码行为的句子，n、建议分句不变 |

### 经验库自己带偏、或写了没被执行的地方
- **沙虫：NH8A 照 Jev 提示 sandpit-no-race 打逃离，HP 才是先到的线。** 提示原文「The Insatiable has too much HP to race… Play Frantic Escape before extra damage」在沙虫 10 问都挂着；run plan F25/F27 写的是「沙坑是先到的死线时」再打，Jev 没有这层条件。A8 输局 17 场里 10 场死在 HP 上，只有 4 场被沙坑吞掉。提示改成两条都按死线比较（见下）。
- **女王：Jev 没有女王提示，T1 爆发打进女王。** 经验 queen-plan、boss 要点都说先杀聚合体，DeepSeek run plan 也写「T1–T2 burst the Amalgam」，但这些只到 DeepSeek；Jev 的女王战每问只有 hp-trade-boss、vulnerable-trade、potion-big-turn。
- **螃蟹：知识和 rollout 两套击杀顺序。** RRMY、3RME 的 Jev 提示和 run plan 都写先打火箭，rollout 的击杀顺序比较多数选「碾碎爪 > 火箭」，结果两只平摊。只核对了知识文字的数（现在是占位符）；推演排序不在本次范围。
- **知识恶魔：攻略写「只有已打出撕裂时才选瓦解」，代码照这句给撕裂时的瓦解成本 −1，绕过了 HP 闸。** 79YR T5 17 血选了瓦解，T6 死。M 批 556a99c 已修代码；攻略两处补了「剩余 HP 扛得住」。
- **kd-dps「A8 ≥75% 进场 7/10，<75% 0/9」让 86C3 把血拉满、79YR 两个火堆都回血。** 86C3 91% 进场仍只有 13.6/回合（0 张力量牌），79YR 69% 进场。条目下半句「二幕构筑必须有永久力量」86C3 没做到（整局选项里没有燃烧/恶魔形态/撕裂，F17 拿壁垒不拿地狱狂徒）。
- **删牌：代码顺序（run plan 目标 +40）让基础牌排在可删的诅咒前。** UNRL、3RME 都照顺序删了打击；86C3 推理里写了「打击木偶让打击 9 伤，也许先删防御」，仍删打击。条目和攻略补了诅咒、打击木偶；排序本身是估值问题（fix-queue 标给 Dai）。
- **deck-clock「时钟说已达标时按仍缺 ~30% 处理」：** 本批反例是时钟偏低的一侧（3RME/79YR/NH8A 仪式兽实打是估值的 1.5–1.7 倍，Q8XR 同族/恶魔 1.08/1.30），条目已有「低估」一段，没改。
- **5LRZ F42 以「58 血打精英会死」改线，F44 满血又改回精英**（boss 前 3 层 98% 进机甲骑士，−66）：elite-threshold 已写「boss 前 ≤5 层的精英即使满血也可能掉 70+」，加 5LRZ。

### 新增（0）
没有新增条目。考虑过：
- 音乐盒不在求解器里（YVYZ）：M 批 617e504 已建模。
- 知识恶魔撕裂时的瓦解（79YR）：M 批 556a99c 已修，攻略文字同步。
- 二幕 0 精英路线：两边都在死，A8 数写进 act2-opening。
- 女王 T1 目标：并进 queen-plan（改用 {QUEEN_AMALGAM}），另给 Jev 加提示。

### 更新（76）
- **加证据（58）：**
  - boss：beast-clock 13→17（3RME、79YR、86C3、NH8A）、kin-priest-focus 12→13（Q8XR）、kin-scaling 22→23（Q8XR）、lag-entry 16→17（5LRZ）、giant-explode 25→27（2WRU、5PHF）、giant-gun 12→14（2WRU、5PHF；只写压力炮回合没格挡那半句）、giant-deck 22→23（2WRU）、insatiable-escape 15→16（NH8A）、insatiable-entry 28→30（NH8A、UNRL）、insatiable-clock 25→27（NH8A、UNRL）、crab-entry 32→35、crab-dps 35→38（都是 3RME、RRMY、YVYZ）、crab-kill-order 15→17（3RME、RRMY；YVYZ 进反例，反例 3→4）、kd-dps 27→29（79YR、86C3）、kd-single-target 7→8（86C3）、kd-block 6→8（79YR、86C3）、queen-hp 8→10、queen-prep 8→10（都是 5LRZ、Q8XR）、queen-plan 12→15（5LRZ、Q8XR、RBJ4）、aeon-clock 12→13、aeon-wither 8→9（都是 YVYZ）。
  - 精英：effigy-cost 15→17（3RME、Q8XR）、entomancer 18→19（86C3）、entomancer-cost 14→17（3RME、86C3、UNRL）、decimillipede 26→28（86C3、Q8XR）、prism 21→23（5LRZ、YVYZ）、terror-eel 28→29（5PHF）、gardener 20→22（UNRL、YVYZ）、skulking-colony 20→23（2WRU、5LRZ、UNRL）、phrog 8→11（3RME、NH8A、Q8XR）、byrdonis 11→15（3RME、79YR、86C3、Q8XR）、mecha-knight 13→14（5LRZ）、soul-nexus 4→5（Q8XR）。
  - 走廊：beetle 33→34（RRMY）、bowlbugs 27→28（NH8A）、hunter-killer 33→34（79YR）、spiny-toad 18→19（RRMY）、myte 7→8（3RME）、ovicopter 10→11（5LRZ）、hopper 20→21（79YR）、frog-knight 7→8（YVYZ）、punch-construct 3→5（Q8XR、YVYZ）。
  - 幕、路线、牌组、火堆：act1-costs 19→20（5PHF）、act2-opening 37→40（79YR、NH8A、RRMY）、act3-hallways 15→16（YVYZ）、deck-clock 43→45（86C3、NH8A）、deck-block-floor 14→15（5PHF）、deck-bloat 5→6（YVYZ）、deck-remove 28→30（86C3、UNRL）、route-no-chains 21→23（NH8A、YVYZ）、route-entry-hp 57→59（79YR、NH8A）、route-forced-elite-prep 16→17（5PHF）、elite-threshold 31→32（5LRZ）、elite-no-double 8→12（3RME、5LRZ、Q8XR、YVYZ；条目改写后的证据）、rest-smith-threshold 35→36（2WRU）。
  - 遗物、事件：relic-pantograph 3→4（3RME）、event-slippery-bridge 8→9（Q8XR）、event-tablet-of-truth 2→3（86C3）。
  - 原有的喝药/留药分句一字未改；新证据只写非药水的部分。
- **只改数字/文字（18）：** vantom-entry、lag-sleep、fysh-beckon、fysh-damage、louse、tunneler、chomper、deck-strength-aoe、relic-toasty-mittens、relic-nutritious-soup、neow-growth、route-shops、elite-need-one、a9-damage；药水 crab-potions、potion-save-for-boss、potion-empty-slots（句内数字），potion-code-discard（代码事实）。
- **和数据冲突、改成数据版本的说法：**
  - phrog「A8 实测掉约 45–50%」→ A8 20 场全胜、中位 −16.5、p75 −26。
  - effigy-cost「A8 实测掉 40–70% 最大生命（路线事实写的 37% 严重低估）」→ A8 27 场死 4、赢局中位 −30（约 37%）、p75 −36.5；「严重低估」一并删掉。
  - gardener「实测掉 30–55」→ A8 22 场死 1、赢局中位 −13、p75 −25。
  - deck-strength-aoe「差在 AOE（81% vs 47%）」→ A8 152 场 AOE 张数 1.8/1.9，不分胜负。
  - elite-no-double「一幕最多主动打 1 只精英」→ 打 2–3 只的 A8 22 局 15/6、A9 7 局 4/1，不比 1 只差；保留「三层内连打两只」和三幕那句。
  - beast-clock「一幕至少要一张永久力量牌」→ 分水岭的数据（有 15/15，没有 8/11）。
  - queen-hp「实际输出只有估算的 0.7–0.75，选牌时把缺口放大」→ 现行时钟估值不再偏高。
  - queen-plan「A8 5 场全输」→ {QUEEN_AMALGAM}（A8 RBJ4 赢过）。
  - act1-costs「一幕最多主动打 1 只精英」→ 指向 elite-need-one、elite-no-double。
- 切片压缩：逐局细节（进场百分比、个别回合）只留在上表；条目里只写 A8 的计数和最关键的一两局。

### 退役（0）
没有退役、合并。active 198，离测试上限 200 还有 2 条。

### 知识库其他部分（Dai 2026-09-29 的规则；行号按 exp-update cf73b66）
- 攻略 `src/knowledge/ironclad-guide.md`：
  - :9 删牌：「删牌优先打击，其次防御」后补「能删的诅咒（受伤、孢子心灵）排在打击前（UNRL）；带打击木偶时打击不一定是最差的牌（86C3）」。n=2（加 3RME 孢子心灵同类）。
  - :56 沙虫：旧「沙坑 ≤2 时先打逃离再输出」（和经验 insatiable-escape n=15「沙坑 ≤2 再逃是错的」冲突）→ 先比沙坑和 HP 两条死线；沙坑先到时每张逃离立刻打、不等 ≤2；HP 先到时逃离不加回合，打格挡/伤害（{SANDPIT_DEATHS}；NH8A）。
  - :58、:114 知识恶魔：「只有已打出撕裂时才选瓦解」→ 加「而且剩余 HP 扛得住瓦解叠加」（79YR，n=1；代码 M 批已按这个修）。
  - :60、:131、:132 女王：旧「前两回合…之后攻击全给聚合体」「证据：4 场女王胜局都在 T4–T8 先打死聚合体；A8 5 场输局聚合体都活过 T5」→ 单体伤害从第 1 回合起就给聚合体、{QUEEN_AMALGAM}，并写明 5LRZ、Q8XR T1 打进女王都输。n=17 场。
  - :73 花园幽灵鳗：旧「每回合首次受伤得格挡，先小打再重击」和手册（21TK）相反 → 最高伤害的牌先打、集中一只。n=1（沿用手册）。
  - :72 胧光怪：「其余 30 场赢 27」→「31 场赢 28」（Q8XR 每回合都有伤害进胧光怪，−3）。
- 手册 `src/knowledge/ds-handbook.md`：
  - :3 版本 2026-09-30。
  - :16 「一幕 boss 统计：有永久力量的赢局 50%、输局 27%」→ A8 152 场 62%/32%（0 张 43/70、≥1 张 69/82）。
  - :17 「AOE 至少 2 张…一幕赢局 81% 有 AOE，输局只有 47%」→ AOE 用于多体战；A8 一幕 boss 赢局/输局 AOE 张数 1.8/1.9，旧统计不成立。n=152 场。
  - :71 巨兽升级「A8 赢局 1.2、输局 2.3」→ 30 场 1.2/2.1。
  - :75 感染棱柱补 A8 17 场死 4、29/38。
  - :81 沙虫补「HP 也是一条死线…（{SANDPIT_DEATHS}）」。
- Jev 提示 `src/knowledge/jev-hints.json`：
  - sandpit-zero：旧「…play a 1-cost Escape unless the boss dies first」→「Play Escape when the Sandpit would end me before my HP does.」
  - sandpit-no-race 删掉（「Play Frantic Escape before extra damage」和数据冲突），换成 sandpit-hp-first：「When my HP runs out before the Sandpit, Escapes only waste energy: block or deal damage instead ({SANDPIT_DEATHS_EN}).」证据 NH8A、VNWR、XMK1、UNRL；数据 27 场输局 14 场死在 HP 上。
  - 新增 queen-amalgam-first（聚合体活着时）：「Queen fight: single-target damage goes into the Torch Head Amalgam, turns 1-2 included; the Queen only takes AoE ({QUEEN_AMALGAM_EN}).」证据 BDAK、H5MZ、YN4E、RBJ4（赢，先杀聚合体）、5LRZ、Q8XR（T1 打女王，输）；n=17 场（赢的 5 场都先打死聚合体；T1–T2 多进女王 1/6、多进聚合体 4/11）。
  - 提示共 27 条（上限 30）。
- boss 笔记：
  - `src/project/run-journal.ts:182` THE_INSATIABLE：旧「打不死它就尽早打狂乱逃离」→ 先比两条死线（{SANDPIT_DEATHS}）。
  - `src/project/run-journal.ts:185` QUEEN：旧「4 场胜局都在 T4–T8…A8 5 场输局…」→ 单体伤害从第 1 回合起给聚合体（{QUEEN_AMALGAM}）。
  - `src/strategy/boss-clock.ts:71` THE_INSATIABLE note 补「逃离只在沙坑先到时有用（{SANDPIT_DEATHS_EN}）」；`:77` QUEEN note 同上（{QUEEN_AMALGAM_EN}）。
  - 帝王蟹、族母、巨兽的笔记已是占位符，数字随数据走，没动。
- 卡牌估值 `src/strategy/card-value.ts`（outcome-stats A8 161 局；拿了 vs 给了没拿，过本幕 boss）：
  - 规则：两边 n≥15、差距 ≥1.5 个标准误、平均终层同向、没有 n≥15 的反向比较。
  - | 牌 | 旧 | 新 | 依据 |
    | --- | --- | --- | --- |
    | ANGER 愤怒 | 50 | 58 | 一幕 0.88（16）vs 0.67（57），z=2.05，终层 34.5 vs 26.4 |
    | FEEL_NO_PAIN 无惧疼痛 | 54 | 46 | 一幕 0.65（17）vs 0.87（15），z=−1.52，终层 28.0 vs 31.0；二幕 0.08（12）vs 0.43（7）同向；≥3 张消耗牌时 +10 不变 |
    | SWORD_BOOMERANG 飞剑回旋镖 | 46 | 54 | 一幕 0.80（45）vs 0.63（43），z=1.79，终层 30.9 vs 25.5；二幕 0.12（8）vs 0.31（39）拿了的一边 n<15 |
  - 没改：THUNDERCLAP 40（一幕 z=−1.64 但已在跳过线下；二幕 0.31（13）vs 0.14（36）反向）；已在上次按同一批数据改过的 TAUNT、MOLTEN_FIST、TWIN_STRIKE、FIGHT_ME；方向不一致的 SETUP_STRIKE、TRUE_GRIT、BLOOD_WALL；差距不到 1.5 个标准误的 RUPTURE（z=0.99，终层反向）、EVIL_EYE（0.79）、EXPECT_A_FIGHT（−0.89）、BLUDGEON（−0.90）、HOWL_FROM_BEYOND（−0.77）、HEADBUTT（A8 −0.59；A9 18 vs 9 z=−2.54，一边 n<15）。
  - SWORD_BOOMERANG 算不算螃蟹的群伤（AOE 集合 +12）仍是分类问题，没动。
- 删掉的：
  - 攻略「沙坑 ≤2 时先打逃离再输出」、Jev 提示「Play Frantic Escape before extra damage」、boss 笔记「打不死它就尽早打狂乱逃离」（A8 输局 17 场 10 场死在 HP 上）。
  - 攻略、boss 笔记、经验里的「4 场女王胜局…A8 5 场输局」（RBJ4 A8 赢；现为数据填）。
  - 攻略「先小打再重击」（和手册、21TK 相反）。
  - 手册「一幕赢局 81% 有 AOE」「永久力量 50%/27%」（41 局低进阶的统计，A8 152 场不成立/已变）。
  - 经验里「异蛙 45–50%」「雕像 40–70%、路线事实 37% 严重低估」「幽灵鳗 30–55」「一幕最多主动打 1 只精英」「女王实际输出只有估算的 0.7–0.75」。
- 没有数据覆盖，保留：
  - 攻略 §2–§4、§8、§9 低进阶招式记录；巨斧机器人、造门者；实验体（A8 3 场）。
  - 仪式兽、墨影幻灵、同族、族母、异鱼的打法段落（本批数据和它们一致）。
  - 手册其余构筑、商店、事件、药水、战斗取舍条目；知识恶魔诅咒顺序（代码处理）。
  - 帝王蟹击杀顺序：知识文字现在全是占位符，数字对；rollout 的排序和提示不一致（RRMY、3RME）不在本次范围。

### 需要 Dai 定
1. elite-no-double 改成了数据版本（A8 打 2–3 只的 22 局过二幕 boss 6/22，1 只 15/89）。这是观察数据：牌组强才敢多打。要不要在路线评分里反映（现在 route 事实按精英成本扣分）？
2. 删牌估值：run plan 目标 +40 让打击/防御排在能删的诅咒前（UNRL、3RME），带打击木偶时打击仍排第一（86C3）。fix-queue 标的是估值问题。
3. 螃蟹击杀顺序：数据（火箭先死 12 场赢 9，其余 47 场赢 9）支持先打火箭，rollout 的击杀顺序比较在饱和/降级时多给「碾碎爪 > 火箭」，两局都平摊输。推演排序是否改。
4. rollout 饱和时「先比死亡数、再比本回合少掉血」挑 0 伤的格挡线：UNRL 沙虫 T2/T7、2WRU 巨兽 T2/T5（满血时就饱和）、86C3 恶魔 T7/T11/T13/T15、3RME 螃蟹 T1 岿然不动。b2080fb 的设计。
5. HP 护栏和低信心「占优」换线换成 rollout 总账更差的线：5LRZ（+3.6、+4.5、+0.3）、86C3（+12.3、+3.0）、NH8A（+4.5）。
6. 卡牌：飞剑回旋镖是否算螃蟹群伤；HEADBUTT（A9 一幕 0.33 vs 0.78，没拿的一边 n=9）等拿不准的牌。
7. 药水：本批 11 局都把点名给 boss 的药在前面喝掉，K 批后进 boss 的药更少（二幕 boss 进场 0.7 瓶，n=9）。条目只改了数，方向没动。

### 给 Dai 的策略证据（只列证据，不是规则）
- 二幕 boss：A8 本批 9 场，≥75% 进场 7 场赢 3，输的 4 场都是输出不够（RRMY 25.9、3RME 22.1、UNRL 33.4 差 28 血、86C3 13.6）；三局走二幕 0 精英路线（RRMY、NH8A、79YR），进 boss 67–76%，全输。A8 二幕 0 精英/1 只精英过二幕 boss 11/56、10/49。
- 永久力量：A8 一幕 boss 152 场，0 张 43/70 过、≥1 张 69/82；仪式兽有 15/15、没有 8/11；知识恶魔 ≥75% 进场有 9/12、没有 0/1。AOE 张数不分胜负（1.8/1.9）。
- 女王：赢的 5 场都先打死聚合体；A8 两场 T1 把爆发打进女王（58、87）都输。
- 沙虫：输局死在 HP 上的比被沙坑吞掉的多（A8 10 对 4，另 3 场同时）。
- 巨兽：A8 30 场，T10 前击杀 14/17；输的三场 T10 前击杀都是击杀时 HP 不够（6189 26/36、5PHF 25/39、7048 9/39）；2WRU 19.7/回合拖到 T15。
- 一幕精英成本（A8）：异蛙 16.5/26、幽灵鳗 13/25、珊瑚群 23/35.5、骇鳗 30/39.5、雕像 30/36.5、异鸟 33/38.5（中位/p75，赢局）。
- 一幕多打精英：A8 打 2–3 只的 22 局过一幕 boss 15、二幕 6；Q8XR、3RME 打 3 只（之间都有火堆）。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 `notes/fix-queue.md` 为准：
- M 批（v3 950cbf5）已修：知识恶魔撕裂时瓦解绕过 HP 闸（556a99c，79YR）、音乐盒建模（617e504，YVYZ）、「ending now kills」写成 Burn（91bce31，3RME/NH8A/YVYZ）、治疗写成「hp --5」（5e19d7a）、「mod 判死 solver 判活」说明（8f31fa8，86C3）、商店回答两段 JSON（f26ae1a，79YR）、run plan 空回答（fa46f6c，79YR）、删牌界面 +40 拆开（16559ba）、guide 填数按天冻结（8546fde，缓存）。
- L 批已修：白兽雕像「先喝再走」（2f6ae4c，5LRZ）、丢药题占位符（2adcb92）、单选多键（7eb1de7，RRMY）、沙坑致死说明（353e31b，UNRL）。
- 没修（设计问题，给 Dai）：删牌 +40 的排序（UNRL、3RME、86C3）；rollout 饱和排序（UNRL、2WRU、86C3、3RME）；HP 护栏/低信心占优换线（5LRZ、86C3、NH8A）；螃蟹击杀顺序比较在饱和时的取舍（RRMY、3RME）。
- fix-queue 里「experience.json:389 巨兽旧数字」本次已处理（giant-explode 改成占位符）。

### 测试
- exp-update 改前（c52587c）：69 个文件 1221 个用例全过。
- exp-update 改后（cf73b66）：tsc 退出 0；vitest 74 个文件 1234 个用例全过，退出 0。
  - 新测试：tests/knowledge-check-a8w-builder、-facts、-guides、-cards、-experience。
  - 改了读旧文字的断言：knowledge-text 的巨兽升级数（「A8 赢局平均 1.2 张升级、输局 2.3 张」→「A8 30 场…输局 2.1 张」）。
- 合入前又 `git merge --no-edit v3`（950cbf5，M 批）：只在 boss-damage.json 上冲突，用新 builder 从日志重建（554 场 boss 战）后提交 8b24187；tsc 退出 0，vitest 75 个文件 1261 个用例全过。

### 切片大小
- 样本：新抽一批，A8、A9 各 20 个状态 × 6 种界面，共 240 个。固定种子 20260930，只取 86C3（18:47:45Z）前已结束的局，A8 含本批 11 局。
- 同一批状态分别用改前（c52587c）和改后（cf73b66）跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 4.00k / 5.97k | 4.28k / 6.42k | 3.97k / 6.30k | 4.20k / 6.76k |
| 奖励 | 4.58k / 6.45k | 4.83k / 6.91k | 4.51k / 6.49k | 4.75k / 6.95k |
| 地图 | 6.02k / 6.72k | 6.43k / 7.17k | 5.90k / 6.72k | 6.27k / 7.17k |
| 事件 | 5.81k / 6.79k | 6.24k / 7.16k | 4.71k / 6.51k | 4.87k / 6.92k |
| 火堆 | 3.96k / 5.89k | 4.19k / 6.29k | 3.57k / 5.93k | 3.77k / 6.34k |
| 商店 | 5.50k / 6.22k | 5.78k / 6.62k | 5.66k / 6.07k | 5.97k / 6.48k |

- 初稿：中位涨 0.6–1.1k，单个切片最多涨 1.3k。主要来自一幕精英、二幕走廊条目加的 A8 计数（每个一幕切片带 6 只精英）、general:deck/route/elite 的改写，和占位符展开（巨兽的击杀记录约 +130）。
- 压缩后：每种界面中位涨 0.20–0.42k，单个切片最多涨 0.54k，最大 7.2k（63CP A8 F22 地图，25 条经验，改前 6.7k）。比前几次（中位 +0.02–0.15k）多：这次改的是 A8 的数（11 局 + 重算）和数据填的记录，逐局细节已压到上表。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：没有新增敌人条目；条目文字现在也会填数。

### 合入 v3（在 `ops/v3-merge.lock` 锁里，脚本 scratchpad/exp9/merge-v3-exp9.sh）
- 开工时 exp-update 快进到 c52587c；做完时 v3 已到 950cbf5（M 批 + abb7389「Refresh knowledge data」）。先在 exp-update 上 `git merge --no-edit v3`：只在 boss-damage.json 上冲突，取 v3 一侧后用新 builder 从日志重建（12 个 boss、554 场）并提交 8b24187；exp-update 上 tsc 退出 0，vitest 75 个文件 1261 个用例全过。
- 锁里：知识构建没在跑；v3 工作区没有未提交的知识数据，跳过「Refresh knowledge data」。
- 合入前：v3 950cbf5 vitest 70 个文件 1248 个用例全过。
- `git merge --no-edit exp-update` 是快进，v3 现在是 8b24187。
- 合入后：tsc 退出 0；vitest 75 个文件 1261 个用例全过，退出 0。
- 在 v3 上核对了填好的文字：女王 boss 笔记和 queen-amalgam-first 填出「17 场…赢的 5 场都先打死聚合体（T3–T8）…T1–T2 多进女王 1/6」，沙虫笔记和 sandpit-hp-first 填出「27 场输局：HP 14、沙坑 9、同时 4」。
- 攻略/手册的模板变了（新 hash），M 批 8546fde 的按天冻结会在下一次启动时重新填一次。
- 没有停对局，没碰 ops/STOP。


## 2026-10-03 第十次增量：28 局 A8/A9（13 局 A8 + 15 局 A9；version 2026-10-03.1，分支 v4-exp，f8d38bc）

### 来源
- `notes/lessons.md` 3192–3664 行的 28 节复盘（Dai 10-03 学习者任务；V4.3 13 局 A8、V4.4 15 局 A9），节内的「更正」按更正用：
  - A8：GBBBMVCPA7R1（F46 灵魂枢纽）、KMB1MYF427N8（F39 猫头鹰法官）、JJ75S331VUKX（通关，沙漏）、5DFXQLAMFUB2（通关，实验体）、JW925EDF9ZTQ（通关，实验体）、VNKN9952ZNA0（F33 帝王蟹）、GWGTNXPWS7PE（F44 失落之物/遗忘之物）、XSPHCB4GUSEU（F48 女王）、7PWU4CD3QCP3（F48 女王）、R6E82S94VB0A（F43 构装体）、3DGZWZ09GKQ4（通关，沙漏）、TMNFVW6DRQ20（F48 沙漏）、LTKW24N3R9PG（F44 组装师）。
  - A9（全输）：63WBEEF2JVM5、R764HJWMJQ3V（F33 知识恶魔）、1YXMHF6FSPK4、610BBERH4SPP、UK7R9A0NMCXL（F33 帝王蟹）、R1QJUBVBSSB2（F33 沙虫）、X7BX5DYHFZ3N、SMNJTGSHFMME（F48 沙漏）、JSA5K8YZ9RXV（F48 女王）、XPDAUKKM1UT6（F39 问号法官）、EQL95K9F3LKQ（F45 史莱姆狂战士）、9V7K1P899R5N（F45 灵魂枢纽）、8RB3JKMNZZP1（F46 巨斧机器人）、B3PJGKHAQGK6（F17 仪式兽）、XC4TNGZU4KT9（F11 走廊）。
  - 用到的更正：JJ75 不跟 rollout 的题数、沙漏 T5 意图 28→10 是上勾拳 + 黑暗镣铐两张牌；R6E8「死时剩两只方柱构装体」、拳击构装体给的是脆弱；XPDA 牌组打击 ×5；UK7R 火箭 39 只出现一次、血墙实得 12 格挡；XC4T 缩小只在甲虫活着时挂着。
- 日志（只读）：这次全部从日志库查（`tools/logdb/query.py --no-sync`，库是 06:40 同步的，含到 8RB3 的全部帧；没有在本任务里同步，`.cache` 是共用目录）。fights / floors / turns / sl_attempts / map_choices 视图的口径见 docs/logdb.md。
  - **截止点**：8RB3JKMNZZP1 结束（2026-10-02T21:59:04Z）。之后结束的 Z4UK、PW7Y（A9）还没复盘，不算。A8 截至 LTKW（10-02 10:44Z）共 232 局，A9 70 局。
  - **只进数字的局**：86C3 之后、GBBB 之前结束的 58 局 A8（MZFV、S1MU、5HHL、9MYJ…V1Y4 共 34 局，8TF4…8D8D 共 24 局）进汇总数字，不作证据。A9 新增的 15 局就是本批 15 局。
  - **先复算上一节**（截止改回 86C3 = 09-29T18:47:45Z，A8 161 局，含 20 局 arm 局）：A8 boss 241 场、≥75% 进场 0 瓶 12/29、带药 111/160；二幕 boss 74 场 ≥75% 22/50、<75% 1/24；一幕 100/129、12/23——全部一致。A9 二幕开头 29 局 9 局死在第一个火堆前、走到的 20 局中位 42%（p25 22%）一致；A9 每局走廊 4.25、精英 0.73、boss 1.33 瓶、二幕 boss 进场 1.33 瓶（n=12）一致。
  - **对不上的两处**：(1) A8 二幕开头局数一致（112/18/94），到达血量中位 39.4%（上一节 41%）、p25 25.7%（27%）：本节取进火堆前最后一个地图帧，上一节的取帧没留下脚本，原因没查清，本节统一用新口径。(2) A8 走廊/问号战 1419/221 场（上一节 1425/215）：日志库的房间类型按本层地图帧判，monster-db 用战后下一个地图帧，docs/logdb.md §4 记过这 6 场的差别；场次、胜负、掉血不受影响。
  - monster-db 用 `tools/build-monster-db.py --out` 重建到临时目录（`learner/runs/20261003-074050-experience-update/monster-db-20261003.json`，fights 6519，A8 3376、A9 879；含截止后 Z4UK、PW7Y 两局 A9），只用来比 A8/A9 招式；`tools/build-boss-damage.py --out` 同样重建到临时目录核对螃蟹击杀顺序。仓库里的 monster-db.json、boss-damage.json、outcome-stats.json 没动（还是 09-30 的数据，占位符填出来的数会在下次知识数据刷新后更新）。
  - `tools/build-outcome-stats.py --ascension 8/9 --out`（临时目录）给卡牌 TIER 用。
  - DeepSeek 推理和 run plan 原文按复盘节里引用的位置核对；本节引的原话都来自复盘节。
- 口径同前：「战内掉血」= 第一帧 HP − 最后一帧 HP（fights.hp_loss），死亡单独计；走廊只算 Monster 房，问号另算；血量分档按进房前最后一个地图帧的 HP / 最大生命。
- 开工时 `git merge --no-edit v4`：已是最新（150e306）。
- 结果：新增 5 条，更新 70 条（61 条加证据，9 条只改数字/文字），退役 5 条（都是合并）；active 198 → 198，总数 221 → 226；置信度 高 141、中 51、低 6。
- 药水（照上一节）：potion-save-for-boss、potion-empty-slots、crab-potions、fysh-damage 里的药水分句只改句内数字，n 不变；其他条目原有的喝药/留药分句一字未改，新证据只写非药水部分；没有新增或加强任何「什么时候喝/别喝」的说法。本批 28 局有 20 局把买来或点名给 boss 的药（约 36 瓶）在 boss 前喝掉，只记数。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| **路线与血量：下一场战斗按进房血量分档**（A8+A9，fights 口径，n/死） | 一幕走廊：≥60% 1440/0，40–60% 138/0，<40% 37/3。二幕走廊：≥60% 789/2（0.3%），40–60% 126/10（8%），25–40% 37/7（19%），<25% 29/12（41%）。三幕走廊：≥60% 234/4（2%），40–60% 28/5（18%），<40% 10/3。精英：一幕 ≥60% 303/6（2%），<60% 17/6；二幕 ≥60% A8 105/9（9%）、A9 11/5（45%），二、三幕 <60% 17/14；三幕 ≥60% 29/4。问号开出的战斗：二幕 <25% 9/6，其余档和走廊同价。赢局掉血中位按档几乎不变（二幕走廊 13–16），差的是死亡 | 新增 route-hp-bands |
| 路线：<60% 时同一步「能进火堆/商店/宝箱」也「能进战斗」（地图帧 map_avail × 下一层节点，3 层内死亡） | 选火堆/商店/宝箱 254 次死 22（9%）：A8 一幕 85/5、二幕 84/8、三幕 24/2，A9 32/1、25/5、4/1；选战斗 24 次死 8（33%），二、三幕 12 次死 7。观察数据：选战斗的多是别的路更差 | route-low-hp 改写数据句 |
| 路线：<60% 时问号对走廊（同一步两者都能选） | 二幕问号 47 次 3 层内死 14（A8 42/12、A9 5/2），走廊 22 次死 8（A8 17/4、A9 5/4）；一幕问号 54/4、走廊 21/2 | 「低血时问号比走廊便宜」和数据不符，route-low-hp 改成「不比走廊安全」 |
| 休息：回血后下一场（火堆按进房血量分档） | <40% 回血一次平均到 66%：下一场是 boss 时一幕 26 场死 13、二幕 44 场死 40（A8 38/35、A9 6/5）、三幕 13/13；不是 boss 时一幕 69/1、二幕 95/13、三幕 23/5。40–60% 回到约 83%：boss 一幕 75/20、二幕 33/18、三幕 12/11。≥60% 回到约 98%：boss 一幕 121/26、二幕 65/24、三幕 15/8 | 新增 rest-preboss-low |
| 路线复核与改线（复盘） | XC4T F1 计划不随血量重看，F8 36/80 选普通战（另一格问号）；XPDA F36「22 血撑不到 F43 火堆」照原路；GBBB 路线复核 25 次全 keep；EQL9 F44 改线只换了 r12；LTKW F39 改线拿掉了精英后的火堆；8RB3 F45 47/101 选走廊不选精英（三条命 270 血） | 新增 route-replan-on-drop；route-whole-path、route-no-chains、route-forced-elite-prep 加证据 |
| 一幕精英数 | A8 0/1/≥2 只：53 局过一/二幕 boss 37/4，113 局 85/24，66 局 56/35；A9 14 局 8/1，45 局 26/4，11 局 8/5 | elite-need-one、elite-no-double 改数字（观察数据：牌组强才多打） |
| 二幕精英数（过了一幕 boss 的局） | A8 0 只 79 局过二幕 boss 25（24 局死在走廊、30 局死在 boss），1 只 85 局 31（14 局死在精英），2 只 14 局 7；A9 0 只 30 局 9（9 局走廊、12 局 boss），1 只 11 局 1（6 局精英） | act2-opening 改数字 |
| 二幕开头 | A8 178 局 22 局死在第一个火堆前，走到的 156 局中位 55%（p25 34%）；A9 42/9，33 局中位 45%（p25 30%） | act2-opening 改数字 |
| 一幕精英进场 | A9 67 场：≥78% 51/1 死，60–78% 14/2，<60% 2/2；A8 253 场：179/2、59/1、15/4 | elite-threshold 改数字 |
| 房间掉血（赢局中位/p75，死亡） | A8 一幕走廊 8/13（1262/1）、精英 22/32（253/7）；二幕走廊 13/21（795/21）、精英 32/49（114/16）；三幕走廊 14/24（235/10）、精英 38.5/57（32/6）。A9 一幕走廊 8/13（353/2）、精英 30.5/39.5（67/5）；二幕走廊 13/22、p90 30（186/10）、精英 54/61（13/7）；三幕走廊 15/27（37/2）、精英 3/3 死 | act1-costs、act3-hallways、a9-damage 改数字 |
| **A9：boss 招式和增益**（重建的 monster-db，base_per_hit 中位） | 44 个招式 A9/A8 中位 ×1.125（1.00–1.33）：仪式兽 17→19、18→20、15→17；碾碎爪 6→7、12→14；火箭激光 31→35；知识恶魔 8→9、11→13、17→18；沙虫 28→31、8→9；巨兽 20→23、自爆 36→42.5；墨影幻灵 26→30。增益多一层：仪式兽碾压 +3→+4 力量、碾碎爪适应 +2→+3、火箭蓄力 2→3、信徒/神官 2→3、知识恶魔沉思 2→3、沙虫垂涎 2→3，巨兽蒸汽开局 15→20；墨影幻灵蓄力 +2、族母虹吸、沙坑 4 不变 | a9-damage 改写 |
| **A9：死亡分布** | 70 局：一幕 28（boss 21、精英 5、走廊 2），二幕 32（boss 15、走廊 10、精英 7），三幕 10（boss 4、精英 3、走廊 2、问号 1）。V4.4 的 15 局：二幕 boss 6、三幕 7、一幕 2。boss 过关一幕 42/63、二幕 10/25、三幕 0/4 | a9-damage |
| **SL 重打的对照**（sl_attempts，截止前，attempt ≥2 的 14 场） | 赢 4 场：VNKN A8 千足虫（第 3 次；赢的那次改了 T2 打哪一节，三节都压低再在 T4–T5 清光，来自 rollout 2–4 样本换了最优线）、XPDA A9 帝王蟹（第 4 次；T2 末 0.51/0.49 的题翻面后 T3 整手打火箭，火箭 T4 死）、9V7K A9 帝王蟹（第 2 次；T1 改打燃烧 + 双重打击 + 杀灭，打法和喝药回合都变了）、JSA5 A9 知识恶魔（第 3 次；SL_RETRY_EXPLORE 在 T7 强制换线，换上的是 B2 认为更差的线，之后 T8 抽到战斗专注+ 赢——有运气成分）。输 10 场：XSPH 女王 6 次、63WB 知识恶魔 6 次出牌逐张相同；R1QJ 沙虫、SMNJ 沙漏、UK7R 帝王蟹、B3PJ 仪式兽的换线点多在「每条线都 100% 死」的回合；1YXM、X7BX、9V7K 灵魂枢纽、7PWU 女王输在构筑/进场血量。另有两场读档被弃牌屏判失败后从 T1 重打：JW92 实验体（T3 Jev 采样不同，赢）、VNKN 帝王蟹（完全复刻，死） | crab-kill-order（XPDA）、decimillipede（VNKN）、kd-dps（JSA5，写明运气）、route-entry-hp（「重打补不了血量」）|
| 帝王蟹击杀顺序（重建的 boss-damage first_death，A8+A9，去掉截止后的 Z4UK） | 火箭先死 15 场赢 11，碾碎爪先死 6 场赢 5（都是 A8），两只都活到最后 35 场赢 3（都是同回合双杀）。A9 两场赢局（XPDA、9V7K）都记为火箭先死 | crab-kill-order 改成「先集中打死一只，火箭优先」；Jev 提示没改（见下） |
| 帝王蟹 | A8 46 场赢 17（≥75% 17/38，<75% 0/8），A9 10 场赢 2（≥75% 2/7）；本批 KMB1 76% 进场 71/回合赢（T6 开局 1 血），5DFX 61、TMNF 43（10 回合）赢；VNKN 93% 进场 30.6/回合、UK7R 84% 20、1YXM 72% 18.7、610B 43% 46 输 | crab-entry、crab-dps 加证据 |
| 知识恶魔 | A8 46 场 ≥75% 27/35、<75% 0/11；A9 5 场 2 赢。63WB 60% 进场约 42/回合（要 57）、R764 90% 进场 10 回合 42.6/回合、恶魔剩 3 | kd-dps 改数字、加证据 |
| 女王 | A8/A9 23 场：T1–T2 平均每回合打 64，T3–T8 41（T4 我方虚弱 98 层、力量 5.3）；A8 22 场赢 3，赢局平均 98% 进场、30 张，输局 83%、38.5 张（7PWU 复盘里的统计）；≥75% 3/15，<75% 0/7 | queen-hp、queen-prep 加证据 |
| 永世沙漏 | A8 13 场赢 6（≥75% 6/10）；JJ75 66.9/回合 8 回合、3DGZ 53.5/回合 10 回合赢；TMNF 57% 进场 33/回合输；A9 X7BX 满血 7 回合 435、SMNJ 46/回合输 | aeon-clock 改写（旧的「需约 72–75/回合在 T9 前」改成赢局的实打数）；aeon-wither 加凋萎 9/12 |
| 实验体 | 5DFX 恶魔形态 T6 力量 23、一回合 307 赢；JW92 T5 力量 15 赢（同一场第一次 11、将死）；A8 10 场赢 4 | ts-strength 删掉「力量 ≤16 的都输」 |
| 沙虫 | A8 42 场 ≥75% 18/32、<75% 1/10；A9 10 场 ≥75% 5/7、<75% 1/3（8RB3 约 60% 进场赢，进反例）；R1QJ 53% 进场 19–24/回合 | insatiable-entry 加证据和 1 个反例 |
| 一幕 boss 和力量来源（力量来源 = 燃烧、撕裂、恶魔形态、与我一战！、烙印、主宰、疯狂科学 + 烘焙手套） | 全部进场：A8 有 102/116、没有 76/107；A9 27/33、15/30。≥75% 进场：A8 92/103、69/92；A9 25/28、12/26。仪式兽 A8 有 14/14、没有 15/18，A9 5/7、0/1；族母 A8 22/23、9/15，A9 3/3、4/7 | deck-strength-aoe、act1-strength、beast-clock、lag-race 改数字；B3PJ 进 act1-strength、beast-clock 反例 |
| 族母进场 | A8 ≥85% 23/27、60–85% 7/9、<60% 1/2；A9 5/7、2/3 | lag-entry 改数字、加 10 局证据 |
| 其余 boss | 墨影幻灵 A8 ≥75% 28/30、<75% 6/8，A9 8/10；同族 A8 34/24、A9 8/5；异鱼 A8 38/33、A9 15/12，≥75% 带药 24/24、0 瓶 6/9；巨兽 TMNF 满血 T9 击杀活 | vantom-entry、fysh-damage 改数字；kin-scaling、giant-explode 只加证据 |
| 精英 | 灵魂枢纽 A8 9 场死 4、赢局 −46/−60，A9 1/1 死；残杀千足虫 A8 37/7、−39.5/−53.5，A9 6/4；蜂群术士 A8 46/5、−33/−49，A9 3/2；机甲骑士 A8 12/1、−52/−63；胧光怪 A8 60/5、−12/−24，A9 15/2 | soul-nexus 改写；decimillipede、entomancer-cost、mecha-knight、obscura 改数字加证据 |
| 走廊 | 猫头鹰法官 A8 15/2（死的进场 45%、38/49 血）、−27/−43，A9 3/1；巨斧机器人 A8 15/2、−27/−42，A9 3/1，A9 最大血量 81–82；史莱姆狂战士 A8 17/1、−16/−21，A9 5/1；构装体 A8 20/1、−23/−32.5，A9 3/0；雕刻师 A8 46/2、−12.5/−21.5，A9 8/0；青蛙骑士 A8 14/2；甲虫组 A8 44/4、−23/−34.5，A9 10/3 | owl、axebot、berserker、punch-construct 改写；sculptor、frog-knight、beetle 改数字 |
| 二幕 boss 按进场和升级 | A8 134 场：≥75% 且 ≥3 张升级 56/87，≥75% 且 <3 张 6/18，<75% 且 ≥3 张 1/16，两样都没有 0/13；A9 8/16、1/2、1/4、0/3 | rest-smith-threshold 改数字 |
| boss 进场血量 | A8 一幕 ≥75% 161/195、<75% 17/28；二幕 62/105、1/29；三幕 13/33、0/12。A9 ≥75% 46/75（二幕 9/18），<75% 6/17（二幕 1/7），≥90% 33/50 | route-entry-hp 改数字 |
| 先古/遗物 | 营养汤 A7–A9 16 局过二幕 boss 9；黄金印 8 局 4；可可 13 局 3；王室猛毒 5 局共扣约 36；蜥蜴尾巴回 50%（74→37）、瓶中精灵 30%（84→25）；缩放仪 61→80、52→77 | relic-* 改数字、加证据 |
| 留给 boss 的药（只改数字） | 八批 97 局 78 局、约 149 瓶在 boss 前喝掉（本批 20 局约 36 瓶）。A9 70 局每局走廊/问号 4.6 瓶、精英 0.8，二幕 boss 进场 1.5 瓶（n=25）；A8 V4 的 33 局走廊 5.3、精英 2.9，二幕 boss 进场 1.6（n=30）。boss 战的用量含 SL 重打（每次读档重喝），不计。A8 402 场 boss ≥75% 进场 0 瓶 34/54、带药 202/279（二幕 5/16、57/89），异鱼 0 瓶 6/9、带药 24/24；A9 3/9、43/66；螃蟹 A8 0 瓶 1/7、带药 16/31 | 只改 potion-save-for-boss、potion-empty-slots、crab-potions、fysh-damage 的数字，n 不变 |

### 经验库自己带偏、或写了没被执行的地方
- **kd-dps「A8 ≥75% 进场 9/13，<75% 0/10」被引用、执行了回血，但没管输出：** JJ75 F32「Knowledge Demon needs ≥75% entry (A8 <75% entry 0/10)」回血后赢；63WB F29「知识恶魔≥75% 进场 9/13，<75% 0/10」，但二幕走廊连掉，F32 只能 27→52，60% 进场 6 次重打都死。数字改成 27/35、0/11。
- **crab-kill-order 进了 Jev 题面，Jev 没把它当结论：** XPDA 题面有知识条「火箭先死 15/21 赢」、previous_attempts 和 known_draws，Jev 在 T2 末的翻面题上只给 0.51/0.49；前 3 次两只平摊死，第 4 次碰巧翻面才赢。610B T1 先打碾碎爪，rollout best_order 也是「碾碎爪 > 火箭」（饱和，34 血进场必死）。
- **crab-entry 的门槛写了，二幕路线没做到：** 610B 复盘「知识里帝王蟹的进场门槛是「≥75 血/≥90%」，34 血差太多」；F32 大脑「10 血进场两回合即死；回血到 34 多撑一回合」。
- **rest-smith-threshold「回血会被上限截掉一半以上时锻造」算错了溢出：** EQL9 F43 59/80「现在回血会被上限浪费 18 点」锻造恶魔形态+，按 30% 回血只溢出约 3（复盘更正：A9 火堆回复量日志里没有，是推算）；之后两场 28/80 死。
- **route-forced-elite-prep 的进场线写进 run plan 但没做到：** 9V7K F39 run plan「F45精英前≥55血」，实到 46；GBBB F45 hp_drop run plan 自己写着「Survive the forced elite at 21 HP」。
- **beast-clock 的「实需约 26/回合」被复盘点名只在满血时成立：** B3PJ 36/80 进场、两张狱火每回合自扣 2，最多撑 5–6 回合，要约 45/回合；条目已补 B3PJ 作反例。
- **aeon-wither 被大脑看到、没钱执行：** TMNF F39「34-card deck already bloated…Aeonglass punishes many small cards」，没有删牌钱，36 张进沙漏。
- **deck-remove：** XC4T F3 路线计划写「F3 删打击」，商店里以「删牌模拟只 +1.3」改成买狱火 + 被遗忘的仪式（条目写「run plan 写了删打击就在当前商店先删」）。
- **deck-clock：** JJ75 F34「时钟36对67」、F41「Gap ~30/turn」，实打 66.9/回合——时钟低估了滚石和回合内的力量成长（条目「低估」一段已有，加 JJ75）。
- 药水：本批 20 局把点名给 boss 的药在路上喝掉（GBBB、JJ75、3DGZ、XSPH、JSA5、8RB3 等），potion-save-for-boss 写了没被执行；按规则只改数字。

### 机制推理
| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |
| --- | --- | --- | --- | --- |
| 力量成长要打够回合 | 力量加在每段攻击上；恶魔形态从下回合起每回合 +3（T 回合累计 3(T−1)），手套每回合 +1 但先消耗一张手牌，撕裂每次自伤 +1，燃烧只是开局 +2。成长牌第 1–3 回合在打能力/少一张牌，要到第 5–6 回合才超过一次性力量。二、三幕 boss 有效血 428–690、要打 7–10 回合，成长才回本；A9 帝王蟹只活 4–5 个敌方回合，等不到 | 二、三幕 boss（不含实验体）197 场：恶魔形态 30 场 T4/T7 力量 6.6/13.2、每回合伤害 T1–3 40.5 → T4–6 53、赢 16；手套 28 场 6.1/10、32.7 → 44.3、赢 11；撕裂 40 场 3.5/7.6、38 → 48.8、赢 14；只有燃烧 55 场 3.8/5.5、42 → 36.3、赢 22；都没有 44 场 1.8/2.5、44.8 → 39.6、赢 19。支持局 5DFX、JJ75、3DGZ（A8）、1YXM、63WB（A9），反例 0 | 5DFXQLAMFUB2 A8 实验体 T1 出恶魔形态，T6 力量 23、一回合打掉 307；1YXMHF6FSPK4 A9 帝王蟹恶魔形态 + 手套力量 20–24，6 回合只打 112 | deck-growth-turns（新）、card-demon-form、card-rupture、card-inflame、relic-toasty-mittens |
| 多段 × 力量（观察，不是因果） | 每段都加力量，所以多段牌的力量收益 = 力量 × 段数；但二、三幕 boss T4 平均力量只有 4–7，一张双重打击多出 4–8，占一回合 40–50 伤害的一成左右；力量 ≥10（恶魔形态约 T7）后才明显 | 有力量来源的二、三幕 boss 181 场：多段牌 ≤1/2/≥3 张赢 25/54、25/54、27/73，T4–6 每回合伤害 46.7/41.6/43；一幕 ≥75% 进场 0 力量来源时 ≥3 张多段 11/14、≤1 张 53/82（n 小） | 5DFXQLAMFUB2 T6 力量 23 时双重打击 ×2 + 愤怒一回合 307 | deck-growth-turns（搭配）、攻略 §4（改成数据版本） |
| 一幕 boss 的力量来源（观察） | 一幕 boss 有效血 183–324、要打 6–9 回合；有一张力量来源，第 4 回合起每张攻击多 2–3 | ≥75% 进场：A8 有 92/103、没有 69/92；A9 25/28、12/26。反例 B3PJ（A9 有双撕裂 + 燃烧，45% 进场输） | B3PJGKHAQGK6 A9 仪式兽：有力量来源但两张狱火每回合自扣 2，36/80 撑不到成长 | deck-strength-aoe、act1-strength、beast-clock、lag-race |
| 回合开始的自伤 | 狱火、绯红披风在我方回合开始、出牌之前扣 1 血（两张狱火 −2），血墙 −2、放血 −3、祭品 −6 在出牌时扣；所以真实血量 = 当前血 − 回合开始自伤，血量 ≤ 自伤时还没出牌就死；撕裂把每次自伤变成 +1 力量，长战是引擎 | 支持 8 局：610B、9V7K、JSA5、B3PJ、R764、XC4T（A9）、TMNF（A8）、63WB（A9，撕裂引擎 T5 一回合 170）；反例 0 | 610BBERH4SPP A9 帝王蟹 T3 打完 1 血 + 12 格挡挡住攻击，T4 开局狱火扣掉最后 1 血；JSA5K8YZ9RXV A9 女王 T6 2 血打出血墙当场死 | deck-self-damage（新）、card-inferno、card-crimson-mantle |
| 与我一战！给敌人力量 | 自己 +3 力量、敌人 +1：敌人每段攻击 +1，多段敌人按段数放大。长 boss 战我方力量收益大于敌方；残血走廊里敌人多出的那几点正好致死 | 支持 3 局：KMB1（A8）、XC4T、8RB3（A9）。整体上 outcome-stats A8 一幕拿了 36 局过 boss 0.92、给了没拿 28 局 0.61——长战是正收益，不和「不是陷阱」冲突 | KMB1MYF427N8 A8 猫头鹰法官打了 3 张与我一战！，啄击 24→30，T4 判决 35 时 19 血 + 6 格挡死 | card-fight-me |
| 女王的 99 层虚弱 | T2「你是我的」给我方 99 层虚弱/脆弱/易伤（每回合 −1，等于整场）：攻击 ×0.75、格挡 ×0.75；聚合体活着时女王每回合 +20 格挡。所以 T1–T2 是仅有的满额输出回合 | A8/A9 女王 23 场：T1–T2 平均每回合打 64，T3–T8 41（T4 虚弱 98 层、力量 5.3）；支持 XSPH、7PWU（A8）、JSA5（A9） | XSPHCB4GUSEU A8 60/107 进场，每回合 54/49/40/35，女王只掉 45 | queen-hp、queen-prep |
| 脆弱、缩小（只记事实） | 脆弱让卡牌格挡 ×0.75（血墙 16→12）；缩小甲虫活着时我方攻击 ⌊×0.7⌋，本回合新加的力量也乘 0.7 | JSA5、UK7R（血墙 12）；XC4T（缩小：预备打击 + 与我一战！算成斩杀、实际差 2 血，多掉约 15）| XC4TNGZU4KT9 A9 F9 T3 题面「hp_lost 9」，实际 33→9 | 没进条目（战斗内数值，缩小已在 v4 16ffb26/35a7915 修好；只记在本节） |
| 仪式兽的昏眩 | 第一次跌破击晕线后我方挂昏眩，那回合只能打 1 张牌：能挡的最多是单卡最大格挡，所以昏眩前要留住「当前血 + 单卡最大格挡 > 下次来袭」 | 支持 4 局（7YT0 等 3 局 + B3PJ A9），反例 0 | B3PJGKHAQGK6 A9 T6 昏眩时 5 血、最大单卡格挡耸肩无视 8，对践踏 17 | beast-ringing-block |
| 沙漏的凋萎 | 凋萎按出牌数塞进牌组，回合末在手每张凋萎+2 掉 9、凋萎+3 掉 12，mod 的致死标记不算它；小牌越多塞得越多 | 支持 TMNF、3DGZ（A8）、SMNJ、X7BX（A9），反例 0 | TMNFVW6DRQ20 A8 T8 15 血 + 28 格挡对 38 来袭 + 手里一张凋萎+2 死 | aeon-wither |
| 知识恶魔的诅咒 | 懒惰 = 每回合最多打 3 张（0 费牌也算）；心灵腐化每回合少抽 1；瓦解是回合末伤害、能被格挡；沉思回 30 | 支持 63WB、R764（A9） | 63WBEEF2JVM5 T6 打满 3 张后手里 0 费的祭品打不出；R764 T9 8 血 + 4 格挡瓦解只掉 3 | kd-single-target |
| 巨斧机器人的库存 | STOCK N = 还剩 N 条命：打到 0 立刻满血复活、最大血量涨、力量不清零，复活那个敌方回合是启动（A9 15 格挡 +3 力量、不攻击）；真实血量约 270（A9） | 支持 EQL9、8RB3（A9）、LTKW（A8）；monster-db A8 15 场死 2、A9 3 场死 1 | 8RB3JKMNZZP1 A9 T3 打死它换来不挨打的启动回合，T4 新命 93 血 + 15 格挡、来袭 22 死 | axebot、攻略巨斧机器人一条 |
| 残杀千足虫的接回 | 打死的一节过一回合以 25 血接回，所以要三节一起压低、在相邻回合清光 | VNKN A8 同样抽牌重打 3 次（只有压低三节的那次赢）；A9 1YXM、UK7R 赢 | VNKN9952ZNA0 第 3 次 T3 三节压到 42/6/7，T4–T5 两回合清光，1 血赢 | decimillipede |
| 帝王蟹的蟹之怒 | 先死一只时另一只 +99 格挡 +6 力量，但格挡只挡一回合；两只平摊时两份攻击一直都在 | 先死一只 21 场赢 16（火箭 15/11、碾碎爪 6/5），平摊 35 场赢 3；XPDA A9 同样抽牌 4 次，只有集火火箭的那次赢 | XPDAUKKM1UT6 A9 第 4 次 T3 整手打火箭 142→46，T4 收掉，T5 碾碎爪 99 格挡只吃 13，T7 赢 | crab-kill-order |
| 滚石 | 我方回合开始对全体 5，之后每回合 +5（升级后 10/15/20…），多体战是持续群伤，时钟没算它 | 支持 JJ75（A8）+ 原有 KYC0、83FL（A9） | JJ75S331VUKX A8 沙漏 T6–T7 两回合打 359 | card-rolling-boulder |
| 复活/开场回血/开场扣血的遗物 | 蜥蜴尾巴敌方回合触发回到最大生命 50%，瓶中精灵（药水，只记事实）30%；缩放仪 boss 开场 +25；王室猛毒每场 −4 | LTKW（74→37；61→80、52→77）、63WB（84→25）；王室猛毒 TMNF、GWGT（A8）| LTKW24N3R9PG A8 F37 尾巴用掉后 F43 64→6，F44 12/94 进走廊死 | relic-lizard-tail、relic-pantograph、relic-royal-poison |
| 最大生命遗物（观察） | 布质果实 +31 上限、血量同加 31，百分比血线被拉低，绝对血量才是活下来的量 | KMB1（49/114 = 43%，但比原上限的 61% 还多） | KMB1MYF427N8 A8 F39 49/114 进猫头鹰法官死 | 没进条目（单局） |

- 只说得清相关性的写成了「观察」：多段 × 力量、一幕力量来源、最大生命遗物、二幕精英数、路线选择。
- 没有任何喝药规则；药水只作为事实出现（瓶中精灵 30%）。

### 新增（5）
- **route-hp-bands**（general:route，n=9，高）：下一场战斗死亡率按进房血量分档的表（上表第一行）。证据 XC4T、GWGT、KMB1、LTKW、EQL9、8RB3、XPDA、GBBB、9V7K。
- **rest-preboss-low**（general:rest，n=7，高）：boss 前最后一个火堆从 <40% 只回到约 66%，二幕 boss 44 场死 40。证据 610B、R1QJ、63WB、B3PJ、TMNF、XSPH、JSA5。
- **route-replan-on-drop**（general:route，n=5，高）：血量骤降后按当前血量重选路线。证据 XC4T、XPDA、GBBB、EQL9、LTKW。
- **deck-growth-turns**（general:deck，n=5，高）：机制条目，见上。
- **deck-self-damage**（general:deck，n=8，高）：机制条目，见上。
- 考虑过没加：神化（3DGZ、XPDA、GBBB，n=3，牌只由珠宝盒给，切片按「当前提供的牌」匹配，放进 neow-growth 一句）；脆弱/缩小的数值（战斗内，缩小代码已修）；SL 单独一条（DS 不决定重打，写进各 boss 条目和 route-entry-hp）。

### 更新（70）
- **加证据（61）：**
  - boss：crab-entry 35→44、crab-dps 38→45、crab-kill-order 17→24（反例仍 4）、kd-dps 29→38、kd-single-target 8→10、queen-hp 10→13、queen-prep 10→13、aeon-clock 13→18、aeon-wither 9→13、ts-strength 9→11、insatiable-entry 30→37（反例 0→1：8RB3）、insatiable-clock 27→28、beast-clock 17（反例 0→1：B3PJ）、beast-ringing-block 3→4、lag-entry 17→27、fysh-damage 19→23、vantom-entry 20→22、kin-scaling 23→27、giant-explode 27→28。
  - 精英：soul-nexus 5→8、decimillipede 28→31、entomancer-cost 17→21、mecha-knight 14→16、obscura 18→20、elite-no-double 12→16。
  - 走廊：beetle 34→37、owl 6→9、axebot 7→10、berserker 3→7（中→高）、punch-construct 5→8、sculptor 6→9、frog-knight 8→10。
  - 幕、计划、牌组：act1-costs 20→22、act1-strength 20（反例 0→1：B3PJ）、act2-opening 40→43、act3-hallways 16→24、a9-damage 55→70、deck-clock 45→46、deck-bloat 6→9、deck-block-floor 15→16。
  - 卡牌、遗物：card-demon-form 14→16、card-rupture 13→15、card-inferno 8→11、card-crimson-mantle 7→8、card-fight-me 7→10、card-rolling-boulder 2→3（asc 9→8）、relic-toasty-mittens 23→27、relic-lizard-tail 3→5（中→高）、relic-pantograph 4→5（中→高）、relic-royal-poison 3→5（中→高）、relic-nutritious-soup 4→8（中→高）、relic-seal-of-gold 5→7、relic-very-hot-cocoa 14→15、neow-growth 7→8。
  - 路线、火堆：route-entry-hp 59→66、route-no-chains 23→28、route-low-hp 13→15、route-whole-path 17→19、route-forced-elite-prep 17→19、rest-before-forced 19→20、rest-smith-threshold 36→37。
  - 原有的喝药/留药分句一字未改（beast-ringing-block、insatiable-entry、route-forced-elite-prep、axebot、berserker、sculptor、mecha-knight、entomancer-cost、fysh-damage 的药水分句都保留原文）。
- **只改数字/文字（9）：** crab-potions、potion-save-for-boss、potion-empty-slots（药水，只改句内数字）；lag-race、elite-threshold、elite-need-one、deck-strength-aoe、card-inflame（数字）；relic-scroll-boxes（并入破灭、杂耍一句）。
- **和数据冲突、改成数据版本的说法：**
  - route-low-hp「低血时问号比确定的走廊便宜」→ 二幕 <60% 问号 47 次 3 层内死 14、走廊 22 次死 8，不比走廊安全。
  - ts-strength「力量 ≤16 的都输」→ JW92 T5 力量 15 赢。
  - aeon-clock「需约 72–75/回合在 T9 前打完」→ 赢局 JJ75 66.9/回合 8 回合、3DGZ 53.5/回合 10 回合。
  - card-demon-form「最强胜负手（一幕 boss 赢局 6:0）」→ 一幕 10 战全胜，但二、三幕 boss 有它 28 场赢 15、没有 131 场赢 69。
  - crab-kill-order「单体伤害集中打火箭」→ 先集中打死一只（碾碎爪先死 6 场也赢 5），火箭优先。
  - owl「231 血」→ A8/A9 247 血；axebot「三条命约 249 血」→ A9 约 270。
  - beast-clock 的力量牌口径改成本节统一的力量来源清单，数字重算（A8 有 14/14、没有 15/18）。
- 切片压缩：逐局细节（每回合伤害、进场百分比）只留在上表；条目里只写计数和一两个案例。

### 退役（5）
都是合并，证据并进汇总条目（这几局原本就在汇总条目的证据里，n 没变）：
- relic-fresnel-lens、relic-leafy-poultice → event-hp-maxhp（那条已写「树叶药膏 −12、菲涅耳透镜 −13 都导致 boss 差几血」）。
- card-havoc、card-juggling → relic-scroll-boxes（卷轴箱给的就是这两张；攻略 §3 陷阱表也已列，system prompt 常驻）。
- relic-potion-belt → shop-no-junk（那条已写「药栏未满时的药水腰带」是坏买；手册商店节同）。
- active 198（测试上限 200）。没有因代码修好而退役的条目：本批的代码修复（蜥蜴尾巴已用标记、SL 判官、缩小、least-loss 自扣血、B3 打完 boss 不再模拟）都没有对应条目。

### 和手写知识、代码冲突（本次改了；行号按 v4-exp f8d38bc）
- 攻略 `src/knowledge/ironclad-guide.md`：
  - :31「力量伤害看段数：多段攻击 > 单次大伤害」→ 力量每段都吃，但二、三幕 boss T4 力量 4–7、多段张数胜负一样（181 场），力量 ≥10 的长战多段才明显。
  - :21、:23 头槌从「好牌(A)」移到「看体系(B/C)」，附 {CARD_OUTCOME:HEADBUTT}：A8 一幕拿了 83 局过 boss 0.71、给了没拿 47 局 0.85，二幕 35/27 局 0.23/0.48，A9 一幕 18/17 局 0.33/0.76，三处同向。
  - :59 巨斧机器人「（2幕）」→ 三幕走廊/问号（A8 15 场、A9 3 场都在三幕）；补 A9 实测复活 82→93→97、81→96→106，启动 15 格挡。
- 手册 `src/knowledge/ds-handbook.md`：
  - :3 版本 2026-10-03。
  - :16「恶魔形态 6 赢 0 输」→ 一幕 boss 10 战全胜，二、三幕 boss 有它 28 场赢 15、没有 131 场赢 69（成长要第 5–6 回合回本）。
- 卡牌估值 `src/strategy/card-value.ts`（outcome-stats A8 232 局，规则同 09-30：两边 n≥15、差距 ≥1.5 个标准误、平均终层同向、没有 n≥15 的反向比较；**最近两次核对已改过的牌这次不再动**）：
  | 牌 | 旧 | 新 | 依据 |
  | --- | --- | --- | --- |
  | POMMEL_STRIKE 剑柄打击 | 76 | 68 | 一幕 0.74（117）vs 1.00（18），z=−2.46，终层 31.2 vs 37.8；二幕 62 vs 14 同向 |
  | STOMP 踩踏 | 72 | 64 | 二幕 0.30（27）vs 0.73（15），z=−2.68，终层 34.2 vs 41.7；一幕 49 vs 15 持平 |
  | HEMOKINESIS 御血术 | 64 | 72 | 一幕 0.88（32）vs 0.67（18），z=1.80，终层 34.9 vs 28.4；二幕另一边 n=6 |
  | HEADBUTT 头槌 | 62 | 54 | 一幕 0.71（83）vs 0.85（47），z=−1.80；二幕 0.23（35）vs 0.48（27），z=−2.06；A9 一幕 0.33（18）vs 0.76（17） |
  - SPITE 怨恨也满足规则（一幕 0.95（19）vs 0.71（28），z=2.05）但**没改**：in-combat 消耗打分读这张表，60 会让烘焙手套先消耗重锤而不是怨恨（tests/screens.test.ts XWPV F48 T4 的固定数据用例失败），留给 Dai。
  - 没改：ANGER（z=3.26）、FEEL_NO_PAIN（二幕 z=−2.49）、FIGHT_ME（z=2.99）、MOLTEN_FIST（z=−2.33）、SWORD_BOOMERANG（z=3.20）、TAUNT（z=−2.42）——最近两次核对已按同方向改过一档，差距还在；要不要再走一档给 Dai 定。有反向比较的 BLOOD_WALL、BURNING_PACT、SETUP_STRIKE、THUNDERCLAP 不动。
- 没改、和数据不冲突：
  - Jev 提示 crab-rocket-first「Focus the Rocket first」：数据也支持先打死碾碎爪（6 场赢 5），但「先火箭」本身不和数据冲突（15 场赢 11）；{CRAB_KILLS_EN} 的「otherwise」把碾碎爪先死的赢局和平摊混在一起，见「需要 Dai 定」。
  - boss 笔记（run-journal.ts BOSS_NOTES、boss-clock.ts BOSSES）都是占位符，A9 数值随 monster-db 填；本次没有冲突。
  - 攻略「低血时绕开精英」「问号…低血时每个问号都按一场走廊算」和新数据一致。
- 没有数据覆盖，保留：攻略 §2–§4 其余卡牌分级、§8–§9 低进阶招式记录；手册其余条目。
- 知识数据文件（monster-db.json、boss-damage.json、outcome-stats.json）这个分支还是 09-30 的；条目和攻略里的占位符（{BOSS_RECORD}、{CRAB_KILL_ORDER}、{CARD_OUTCOME} 等）要等下次知识数据刷新才会填出本节的数。
- **需要 Dai 定：**
  1. 卡牌 TIER：SPITE 满足规则但会改变烘焙手套的消耗顺序（测试用例），要不要改；ANGER、FIGHT_ME、SWORD_BOOMERANG（上调）和 FEEL_NO_PAIN、MOLTEN_FIST、TAUNT（下调）差距在新数据里仍 ≥2 个标准误，要不要再走一档。
  2. 帝王蟹 Jev 提示「Focus the Rocket first」和 {CRAB_KILLS_EN}：要不要改成「先集中打死一只（火箭优先）」，并把碾碎爪先死单列。
  3. 路线：route-hp-bands / rest-preboss-low 的数据说明二、三幕 <60% 时下一场就有 8–41% 的死亡率、<40% 进 boss 前火堆基本救不回；代码的路线复核（map.ts routePlanDecision）只在节点不可达时重规划，血量骤降不触发（XC4T 复盘的建议）。
  4. 这个分支的知识数据文件要刷新（见上一条）。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 fix-queue-v4 为准：
- 已修（复盘时已在 v4-live）：赌博筹码弃牌屏让 SL 读档判失败（JW92、VNKN，14ad753）；SL 判官无惧疼痛按全部手牌算（7PWU，e7c1718）；果汁时 B3 报错（GWGT，e7c1718）；SL 判官不算手牌凋萎（TMNF，386efb5）；蜥蜴尾巴已用没识别（LTKW，8c93fa4）；已知抽牌被十字弓的牌搞乱（X7BX，3c95965）；判官没算下回合开局自伤（610B，1b4453f）；换线选点（R1QJ、SMNJ，914515c）；least-loss 打出先自杀的线（JSA5，566ae3e）；缩小重复/漏算（XC4T，v4 16ffb26/35a7915）；previous_attempts 敌人名不分节（VNKN，72a4333）。
- 复盘时未修（不阻塞）：判官把「先自扣血再抽牌」的祭品当成可能救命（R764，SL_JUDGE_ANY_DRAW 79ef4eb 后的版本另核）；换线被抽牌后的重规划冲掉、「第 1 次不算数」（UK7R、9V7K、B3PJ）；探寻打击后已知抽牌整个丢掉（R1QJ）；势不可当单敌也按随机判（X7BX）；懒惰被估成 0 代价（63WB）；路线不随血量复核（XC4T）；滚石层数让回合开头重问（JJ75）；残血走廊 rollout 样本被砍后仍按 1/6 对 3/6 选线（XC4T）。
- 设计问题（Dai）：战斗里的药水代价只看持有价值表，不知道大脑把哪瓶留给哪场（GBBB、JJ75、3DGZ、XSPH 等 20 局）。

### 测试
- v4-exp f8d38bc：`npx tsc -p tsconfig.json --noEmit` 退出 0。
- vitest：
  - 第一次（默认 worker）4 个文件 5 个用例失败：4 个是高负载超时（load ~11），1 个是 tests/screens.test.ts「Toasty Mittens keeps…」的断言——SPITE 52→60 让手套改为消耗重锤；撤回 SPITE 后这 4 个文件单独重跑 217/217 通过。
  - 第二次完整跑（默认 worker）11 个文件 13 个用例失败，都是超时；单独重跑这 11 个文件，再单独重跑剩下 2 个超时的文件，全部通过。
  - 按 CPU 规定限 `--maxWorkers=4` 完整跑：133 个文件 2049/2049 通过，退出 0。条目文字压缩后又完整跑一次（`--maxWorkers=4`）：133 个文件 2049/2049，退出 0。
- 没有改测试。

### 切片大小
- 样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个；从日志库 frames（非 observed 帧、截止前已结束的局）按界面取 offset，固定种子 20260929 抽样，再按字节偏移从 states.jsonl 读原始行（脚本 `learner/runs/20261003-074050-experience-update/sample_states.py`）。
- 同一批状态分别用改前（150e306）和改后（f8d38bc）的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 4.28k / 6.42k | 4.33k / 6.54k | 4.43k / 6.88k | 4.65k / 7.13k |
| 奖励 | 5.03k / 6.91k | 5.73k / 7.28k | 4.86k / 6.91k | 5.57k / 7.28k |
| 地图 | 6.32k / 7.17k | 6.67k / 7.48k | 6.27k / 7.17k | 6.57k / 7.48k |
| 事件 | 4.60k / 7.08k | 4.67k / 7.22k | 4.61k / 6.59k | 4.70k / 6.71k |
| 火堆 | 5.67k / 6.29k | 6.01k / 6.64k | 3.78k / 6.29k | 4.09k / 6.63k |
| 商店 | 5.77k / 6.72k | 5.96k / 6.64k | 5.70k / 6.39k | 6.09k / 6.59k |

- 初稿：每种界面中位涨 0.1–1.9k，单个切片最多涨 3.0k（新条目和三幕条目带了逐局细节）。压缩两轮后：同一状态改后减改前的中位，A8 战斗 +0.07k、奖励 +0.66k、地图 +0.31k、事件 +0.08k、火堆 +0.33k、商店 +0.29k；A9 +0.19k、+0.66k、+0.30k、+0.10k、+0.29k、+0.47k。单个切片最多涨 0.92k（9V7K A9 F42 奖励），最大 7.48k（地图，改前 7.17k）。
- 奖励界面涨得最多：两条新的 general:deck 机制条目（deck-growth-turns、deck-self-damage，共约 450 字）在每个选牌切片里；地图涨的是 route-hp-bands、route-replan-on-drop 和改写的 route-low-hp。
- 条目数：active 198（上限 200）；置信度 高 141、中 51、低 6。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：没有新增敌人条目。

## 2026-10-03 第十一次增量：25 局 A8（另 5 局 A0 无复盘；version 2026-10-03.2，分支 v4-exp-10030952，07b5a57）

### 来源
- 本批 30 个 run id：
  - 5 局 A0（377J、3MDJ、JRN3、JRSF、NSWF，09-24）：lessons.md 第 62–76 行写明「学习闭环开始前的对局，不单独复盘」，只有标题，不进条目、不进数字（汇总只算 A8+）。
  - 25 局 A8，按复盘节用（09-30 05:21 的 MZFV/S1MU/5HHL 勘误按勘误用）：
    - 09-28（基线 910671b / 新版 f4660df–58b36b6，lessons 1860–1912 行）：7NMP7ZZ0ME28（F17 同族）、J300CA69899X（F27 蜂群术士）、YCWNUMAEW849（F17 族母）、RA3QYBLN7RJF（F33 知识恶魔）、2WNTQHYY4GAD（F13 问号地精佣兵）、QZQU8860HG2F（F37 猫头鹰法官）、JM7B0D40WCRQ（F33 知识恶魔）。
    - 09-30（c52587c / V4 de62ab5 / V4.1 3f885c7，lessons 2511–2704 行）：S1MURCR8DGPT（通关）、5HHLMV2DZ5AZ（通关）、HFNEL0CRKF96（F17 巨兽）、0QSB9YV3UFCL（F33 帝王蟹）、Y648C8QL2MRX（F27 蜂群术士）、41VAUAM2EFY7（F43 灵魂枢纽）、WLM6YKJ0ASNE（F33 帝王蟹）、A8ENYFR4ZWKG（通关）、RUDHQ1KJ49P8（通关）、RLCNBC0L2QUC（F24 异螨）、MCK9SMSK40ZY（F33 沙虫）、06S86JU88EG5（F33 沙虫沙坑）、5SSRC26ZFKWC（F17 巨兽）、W80JV2YVC8UZ（F48 女王）、CDR0Q6929CKR（F33 沙虫沙坑）、FYQUP0GVWNUU（F33 帝王蟹）、F4K88F267RCX（F48 女王）、0U96U4D9Z3PP（F48 女王）。
  - 开工时这 30 局都不是任何条目的证据。
- 日志（只读）：日志库 `tools/logdb/query.py --no-sync`（库已同步到 10-03T01:07Z；本任务没有同步），脚本和查询结果在 `learner/runs/20261003-095235-experience-update/`（q.sh、q-*-cte.sql、q-*.txt）。
  - **截止点不变**：仍是上一节的 8RB3JKMNZZP1 结束（2026-10-02T21:59:05Z），A8 232 局、A9 70 局。本批 25 局都在它之前结束，上一节已经把它们「只进数字」，所以本批只加证据、不改汇总数。8RB3 之后结束的 Z4UK、PW7Y、A4PW 等不在本批名单，不算。
  - **先复算上一节**（同一截止点、同一口径）：A8/A9 各幕各房间场次和死亡数（A8 一幕走廊 1262/1、精英 253/7，二幕 795/21、114/16，三幕 235/10、32/6；A9 353/2、67/5、186/10、13/7、37/2、3/3）、boss 进场分组（A8 一幕 ≥75% 161/195、<75% 17/28，二幕 62/105、1/29，三幕 13/33、0/12；A9 ≥75% 46/75、<75% 6/17）、route-hp-bands 的各档（二幕走廊 789/2、126/10、37/7、29/12 等）——全部一致，没有对不上的。
  - 切片样本用同一脚本、同一种子重抽，和上一节的样本文件逐字节相同。
  - monster-db.json、boss-damage.json、outcome-stats.json 没动（截止点和数据都和上一节相同）。
- 口径同前：「战内掉血」= 第一帧 HP − 最后一帧 HP（fights.hp_loss），死亡单独计；走廊只算 Monster 房，问号另算。新增的「火堆之间的路段」：按 floors 表，从火堆或先古（每幕开头）起到下一个火堆前，数有战斗的层（不含 boss），起点血量 = 起点那层的出场 HP / 最大生命；路段里死亡（不含 boss）算死。
- 开工时 `git merge --no-edit v4`：已是最新（e0fa69b）。
- 结果：新增 1 条，更新 70 条（69 条加证据或反例，1 条只改数字），退役 0；active 198 → 199（上限 200），总数 226 → 227；置信度 高 142、中 51、低 6。
- 药水（照上一节）：只改 potion-save-for-boss 的句内数字（「八批 97 局 78 局、约 149 瓶」→「九批 122 局 89 局、约 169 瓶」：本批 11 局把买来或点名给 boss 的药在路上喝掉，约 20 瓶——0QSB 4、S1MU 3、5HHL 3、41VA 2、JM7B 2、Y648、WLM6、A8EN、RLCN、5SSR、0U96 各 1），n 不变；其他条目原有的喝药/留药分句一字未改，新证据只写非药水部分；没有新增或加强任何「什么时候喝/别喝」的说法。
- 第 4.1 节三项：
  - 路线与血量：新做「火堆之间连打几场」的分段统计（见下表），其余血量分档复算一致、数字不变。
  - SL 重打：本批局都早于 SL（sl_attempts 最早 2026-10-01T23:58Z），截止点不变，SL 对照还是上一节那 14 场（4 场赢），没有新结论。
  - A9：本批没有 A9 局；A9 的条目和数字沿用上一节。本批证据都是 A8，没有条目的进阶下限要改（只有 a9-damage 从 9 起，本批没动它）。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| **路线：火堆之间连打几场**（A8+A9，路段起点 ≥60%，不含到 boss 的那段；q-seg*.txt） | 二幕：1 场 131 段死 9、2 场 112/8、3 场 125/12、≥4 场 103/21——1–3 场合计 368/29（8%），≥4 场 20%。二幕开头（先古到第一个火堆）起点血量中位都约 88%：2 场 27/0、3 场 93/10、4 场 79/16、5 场 21/5；A8 ≤3 场 98 局死 7、≥4 场 80 局死 15，A9 22/3、20/6。三幕：1–3 场 116 段死 20（17%），≥4 场 24/1，不随场数涨。<60% 起的二幕路段 40 段死 11 | route-no-chains 改成数据版本（旧「连续 ≥3 场不走」→ 二幕 ≥4 场）；手册 :39 同改。观察数据：选长路段的局可能本来就没得选 |
| 本批的路线案例 | RLCN 二幕开头 5 场走廊（F19–F25），F21 投影已报「p75 耗尽」仍保持，F23 产卵虫 64→1、F24 死；0QSB F19 改线去掉 F28 火堆，二幕开头 6 场，F22 −53 后投影连报「boss 到达 0」保持 5 次，31/80 进帝王蟹；J300 F24 56/80 在「普通→宝箱→精英」和「普通→宝箱→普通」只差 2 分时选了前者，39/80 进必经蜂群术士死；QZQU 三幕第一个火堆前 4 场（所有路都 4–6 场），死在第 3 场；A8EN F11 45/80、0 瓶药改线跳过精英，通关 | route-replan-on-drop、route-no-chains、route-whole-path、route-forced-elite-prep、act2-opening、act3-hallways 加证据 |
| **女王：聚合体死后的斩首**（fight_frames 每回合第一帧，A8+A9 23 场；q-queen.txt） | 聚合体死了的 14 场赢 3（5HHL、8D8D、RBJ4），没死的 9 场全输。聚合体死后下一个敌方回合都是将头砍下：A8 不带硫磺都显示 35，A9 JSA5 60，带硫磺的 5GKA T3 45、W80 T6 80；之后处决 25、激怒、再砍头。11 场聚合体死了的输局里 6 场死在这第一下（0U96、4JGP、V3UP、VE97、W80、JSA5，那回合开局 2–18 血）；扛过的 7PWU、8L29、KXG7、Q8XR 那回合 31–43 血 | queen-plan 加机制句；攻略 :133、boss 笔记两处同加 |
| 女王本批 | W80 84/88 进场，5 回合伤害全进聚合体（T5 死），35/回合，T6 17 血对 80；F4K8 67/78，前三回合 106 伤进女王（饱和排序按总敌血），死于光束；0U96 85/85，聚合体 T5 死，46.7/回合，T6 12 血 + 13 格挡对 35；5HHL 75/80 赢，聚合体 T8 死，57.3/回合 | queen-plan、queen-hp、queen-prep 加证据 |
| **硫磺**（boss 战第一帧遗物，q-relics.txt） | 带它的 boss 战 10 场（5 局）：一幕 2/2；二幕 3/3（FSPK、A8EN 知识恶魔 5、8 回合，5GKA 沙虫 5 回合）；三幕 1/5（A8EN 实验体赢；FSPK 实验体、女王 5GKA/EZ2L/W80 输，女王整体 A8 3/22） | 新增 relic-brimstone（女王 0/3 写成观察） |
| 势不可当（同上） | 二、三幕 boss ≥75% 进场：带它 A8 6/12，不带 69/126；带它又有回合开始格挡（绯红披风、钗、山铜等）5 场赢 2 | 不立条：数据不分胜负，5HHL 只是单局；绯红披风「不吃脆弱」的事实进 card-crimson-mantle |
| 知识恶魔回合数 | A8 46 场：赢 27 场中位 9 回合（4–12），输 19 场中位 11（3–17）；≤4 回合 2 场赢 1（RUDH）。本批 RA3Q 58/89、0 力量来源 20.7/回合死；JM7B 80/80、只有与我一战！，32/回合死；QZQU、S1MU、5HHL、A8EN、RUDH、W80、F4K8、0U96 赢 | kd-dps 加证据和 JM7B 一句；kd-free-turns 加 T4 打完的机制句；Jev 提示 kd-long-fight「10-15 turns」→「A8 wins took 4-12 turns (median 9)」 |
| 沙虫（本批） | MCK9 87% 进场（缩放仪），0 力量来源，22.1/回合，T7 差 1 血死；06S8 满血进场、35.7/回合，42 血时被沙坑吞；CDR0 81%、32.6/回合，14 血 + 5 格挡时被沙坑吞（饱和时连续两回合 0 出牌伤害）；41VA 95%、恶魔形态+，48.7/回合赢 | insatiable-escape（两局 HP 富余被沙坑吞）、insatiable-entry、insatiable-clock 加证据；数字是占位符/截止点数据，不变 |
| **缩放仪的火堆**（boss 前最后一个火堆，第一帧遗物，q-pantograph.txt） | A8 带缩放仪：锻造 7 次赢 6（唯一输的 MCK9 52/89 锻造 → 77 进沙虫，差 1 血），回血 14 次赢 6（进火堆中位 40%，回血后 + 25 进场中位 98%）；不带：锻造 78 次赢 61、回血 303 次赢 181。MCK9 若回血：52 + 27 = 79，+25 封顶 89，比锻造多 12 | relic-pantograph 改成「回血实得 = min(回血量, 上限 − HP − 25)，≥10 回血」；rest-by-boss-loss 的「持有缩放仪更该锻造」删掉、指向 relic-pantograph，MCK9 进反例 |
| 帝王蟹（本批） | 0QSB 39% 进场（喝药到 63），22.75/回合，两只平摊（火箭 −75 后转打碾碎爪 −107）；WLM6 87%、47.1/回合（需 53.5），T7 9 血时打死火箭，碾碎爪当回合 +99 格挡，T8 死；FYQU 91%、50/回合（需 61.1），火箭挨 167、碾碎爪 117，T7 打死火箭后 1 血 + 21 格挡，下回合狱火开局扣 1 死 | crab-entry、crab-dps、crab-kill-order 加证据和一句；数字是截止点数据，不变 |
| 巨兽（本批） | HFNE 72/80、19 张 0 力量来源，4 个火堆全锻造，毛伤 15.5/回合（时钟报「缺 0」），T20 击杀 69 层，9 血 + 18 格挡死；5SSR 72/80，T10 在 19 血时击杀，39 对 19 + 13 格挡；两局都符合「A8 击杀回合 T 的自爆 = 12 + 3(T−1)」（T20 69、T10 39）；F4K8 70/80 7 回合赢 | giant-explode、giant-deck 加证据 |
| 一幕 boss 和升级（boss 战第一帧牌组带 + 的张数，q-act1-up.txt） | A8 一幕 boss：0 张升级 32/44、1–2 张 92/113、≥3 张 54/66；≥75% 进场 29/35、81/100、51/60。A9 5/7、22/36、15/20 | 不分胜负：7NMP、YCWN（都 0 升级）只作为「缺力量来源」进 act1-strength、lag-race、kin-scaling，不进「升级」类说法 |
| **蜂群术士 × 多段**（fight_actions，一场里打出的多段/群伤牌张数，q-entomancer.txt） | A8 46 场：打出 ≥4 张的 7 场死 1、赢局中位 −48；<4 张的 39 场死 4、−27。打出与我一战！的 A8+A9 5 场死 2。Y648 93/94 进场，T1 与我一战！+（rollout best 是势不可当+），术士力量 0→3，蜜蜂 7 段 T7 42 打穿 37 + 5，它剩 16 | entomancer 加数据和 Y648；card-fight-me 加「蜜蜂 7 段」 |
| 大～抱抱（二幕先古） | 带它的二幕 boss 只有 2 场：RA3Q 知识恶魔输（18 张、17 回合，T10/T12/T17 手里 2/3/3 张煤灰）、QZQU 赢 | 不立条，RA3Q 一句进 neow-act2 |
| 精英、走廊（本批） | 骇鳗 RA3Q −38、WLM6 −49；多尼斯异鸟 J300 −44、Y648 −31；鬼祟珊瑚群 YCWN 87% −41、2WNT 38→3（硬壳每回合 20 封顶，第二张打击 0 伤）、RLCN −27；感染棱柱 WLM6 −33、RUDH −24、0U96 −30；花园幽灵鳗 W80 81→32（0 瓶）；灵魂枢纽 41VA 95% 死；蜂群术士 06S8 −33、CDR0 56→19、41VA −39；产卵虫 RLCN 64→1；甲虫组 0QSB 65→12；猫头鹰法官 QZQU 38/80 死、A8EN −26；雕刻师 QZQU −39；构装体 41VA 39→6；蟾蜍 CDR0 −41；双异螨 RLCN 7/88 死 | 各条加证据；skulking-colony、ovicopter、soul-nexus 各加一句；数字是截止点数据，不变 |
| 时钟（本批） | S1MU 撕裂+狱火：恶魔估 20 实打 51，沙漏估 21 实打 76.4；5HHL 势不可当不在时钟里（恶魔估 23 实打 41.7，女王 31 对 57.3）；HFNE 巨兽估 23、实际毛伤 15.5；QZQU 墨影幻灵估得乐观、知识恶魔估得悲观 | deck-clock 加证据和 S1MU、HFNE 一句 |
| 精英数 | 一幕 0 精英：A8EN、5HHL 整局 0 精英通关（一幕已有硫磺、势不可当）；7NMP、JM7B、RA3Q（二幕）0 精英都输在输出 | elite-need-one 加 3 局证据、2 局反例（n 17、反例 2，仍高） |

### 经验库自己带偏、或写了没被执行的地方
- **rest-by-boss-loss「持有缩放仪（boss 开场 +25）…时更该锻造」把 MCK9 带到差 1 血：** 7 个火堆全锻造。F13「88% HP + Pantograph + a rest at F15 make healing wasteful」、F16「Pantograph already heals 25 at boss start」，F32 52/89 自己算出「Pantograph caps heal to +12 HP (77 vs 89 entry, both ≥80%)」仍锻造欺凌，沙虫 T7 猛咬 30 对 21 血 + 8 格挡。条目改成按回血实得算（见上），MCK9 进反例。
- **insatiable-entry 的「<75% 1/9」让 06S8 回满，死线却是沙坑：** F32 回血理由「insatiable-entry: <75% only 1/9 wins」，80/80 进场，T7 结束 42 血时被沙坑吞；复盘：「对这只 boss，40 血以上的回血是白给，锻造加伤害才有用」。条目里「先比两条死线」已有，加 06S8、CDR0 两局；没有改「进场血量是前提」那句（A8 ≥75% 18/32、<75% 1/10 仍成立）。
- **JM7B 照经验买了与我一战！，同一题面的「懒惰后…多张小牌价值低」没执行：** F21 按「与我一战！是力量引擎，不是陷阱」买（code rank 14/15），题面同时有「懒惰后每回合最多 3 张、衰朽后只剩 2 能量：0 费过牌/多张小牌价值低，偏向单张高伤和力量」，之后照样加了巨像、狱火、两张残酷、熔融之拳、血墙（23 → 31 张）。路线推理又引「路线投影严重乐观」「二幕 boss 进场 <60% 的全死」，整局 0 精英、80/80 进场，输在输出。
- **Y648：Jev 题面里的蜂群术士条目没被执行。** 题面有「[elite:ENTOMANCER | n=18] …多段攻击/AOE 是负收益（7KDM … 它剩 15 血时死）」和提示「kill it fast with few big single hits」，T1 Jev 0.45 选与我一战！+（rollout best 是势不可当+），T7 死、它剩 16，几乎重演 7KDM。
- **帝王蟹、女王的击杀顺序只在知识里，进不了出牌排序：** 0QSB 时钟题面带 crab-kill-order「60 场：火箭先死 9/12 胜…」、F21 商店计划写「Ultimate Strike focuses Rocket」，fight_plan 关着，战斗里没有集火目标；FYQU 单体伤害 T1/T3/T4 打在碾碎爪上（都是 rollout best）；F4K8 前三回合 106 伤进女王（饱和时按敌人总血排序）。代码问题，见下。
- **QZQU 照「连续 ≥3 场战斗不走」比场数，所有路都是 4–6 场：** DeepSeek F34 自己算出「5 fights before first rest → ~50-110 HP loss! That's clearly deadly」，选了第一个休息前最少的 4 场，死在第 3 场。条目改成数据版本后，三幕的说法是「每段 15–19%、不随场数涨」，要靠进场血量和药。
- 照着执行、结果对的：A8EN F8「Brimstone supplies the permanent Strength the run plan and beast-clock demand (0-Strength decks die with 73 HP left)」买硫磺通关；S1MU 引 deck-clock「低估：…撕裂/狱火…1.5–2.3 倍」给撕裂+狱火的时钟打折。
- 药水（只记事实）：WLM6 F30 的 Jev 题面写着 crab-potions「为螃蟹留药…二幕精英和走廊里一律不喝这些药」，火焰药水照样在走廊喝掉；本批 11 局约 20 瓶点名给 boss 的药在路上喝掉，按规则只改数字。

### 机制推理
| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |
| --- | --- | --- | --- | --- |
| 硫磺：双方都涨力量 | 我方每回合开局 +2、所有敌人 +1。力量加在每一段攻击上：单体长 boss 战我方涨得是对方的两倍，打 8 回合就是 +16 对 +8；但敌方多段攻击按段数吃它的力量，女王的将头砍下 5 段，带硫磺显示 45–80（不带 35） | 支持 5 局 A8（A8EN、W80、EZ2L、FSPK、5GKA），反例 0；二幕 boss 3/3，三幕 1/5（女王 0/3，n 小，写成观察） | A8ENYFR4ZWKG：F8 花 212 金买，仪式兽 T2–T4 力量 4/6/8，实验体 T8 力量 27 一回合 291；W80JV2YVC8UZ 女王 T6 砍头 80 打在 17 血 + 9 格挡上 | relic-brimstone（新） |
| 女王：聚合体死后的斩首 | 聚合体活着时女王只叠 20 格挡、不攻击；聚合体一死，女王当回合激怒，下一个敌方回合必是将头砍下（5 段，吃 99 层易伤和女王的力量），之后处决、激怒循环。所以打死聚合体那一回合同时是「下一回合 35+ 来袭」的倒计时，HP + 格挡要提前留够 | 23 场（A8 22、A9 1）：聚合体死了 14 场赢 3；11 场输局 6 场死在第一下（0U96、4JGP、V3UP、VE97、W80、JSA5），反例 0（扛过的都 ≥31 血） | 0U96U4D9Z3PP A8 聚合体 T5 死，T6 12 血 + 13 格挡对 35 死，女王剩 350 | queen-plan；攻略 :133、boss 笔记 |
| 撕裂 × 回合开始失血 | 撕裂每次失血 +1（+ 是 +2）力量；狱火、绯红披风在我方回合开始、出牌前扣 1 血，所以每回合不打牌也稳定涨；再配放血/血墙/祭品，每张多涨一次。反面：开局这 1 血也能把 1 血的自己扣死 | 支持 3 局 A8（S1MU、A8EN 引擎；FYQU 自伤致死），加上一节 8 局；反例 0 | S1MURCR8DGPT 知识恶魔力量 0→22（T3–T7 每回合 +2），沙漏 T6 一回合 349；FYQUP0GVWNUU 帝王蟹 T7 结束 1 血 + 21 格挡，下回合开局狱火扣 1 死 | card-rupture、deck-self-damage、card-inferno |
| 蜂群术士克多段 | 人体蜂房：每次被攻击命中往抽牌堆塞一张晕眩，多段牌一张塞多张；与我一战！给它 +1 力量，蜜蜂 7 段就是每轮 +7。它 T1/T4/T7 放蜜蜂，等于「T7 前打掉 165」的硬时钟，晕眩占手牌让后面打不出伤害 | A8 46 场：一场打出 ≥4 张多段/群伤牌的 7 场赢局中位 −48，其余 39 场 −27；打出与我一战！的 A8+A9 5 场死 2。本批支持 Y648（A8），反例 0 | Y648C8QL2MRX 93/94 进场，T1 与我一战！+，晕眩 T5 占手牌 4/6，T7 蜜蜂 42 打穿 37 + 5，术士剩 16 | entomancer、card-fight-me、card-sword-boomerang |
| 力量 × 多段（正面，观察） | 每段都加力量，所以力量高时多段收益按段数放大；上一节的数据显示二、三幕 boss 多段张数不分胜负（T4 平均力量只有 4–7），本批的胜局是力量早到 8+ 的情形 | 支持 RUDH（A8）；上一节 181 场不分胜负，所以只算观察 | RUDHQ1KJ49P8 与我一战！+ + 燃烧+，T2 起力量 8，知识恶魔 4 回合 101/107/143/48；实验体 T8 一回合 303 | card-fight-me、card-sword-boomerang（只加证据） |
| 知识恶魔的诅咒节奏（观察） | 诅咒在 T1/T5/T9、沉思在 T4 结算（回 30）：每个诅咒都砍输出（懒惰 3 张、心灵腐化少抽 1、衰朽少 1 能量），所以前置伤害比 T5 以后才起来的成长更值钱；T4 内打完只吃一个诅咒、不吃回血 | A8 46 场赢局中位 9 回合，≤4 回合只有 RUDH 一场赢（n=1，观察） | RUDHQ1KJ49P8 T1 复制药水（只记事实）+ 薪火之源、与我一战！，4 回合 99.8/回合，只吃到心灵腐化 | kd-free-turns |
| 缩放仪的回血实得 | boss 开场 +25 但封顶在上限，所以 boss 前火堆回血的真实价值 = min(回血量, 上限 − HP − 25)；HP + 25 离上限还差 ≥10 时回血仍多给进场血量 | A8 带缩放仪 boss 前锻造 7 次赢 6、回血 14 次赢 6；MCK9 反例（锻造少 12 血进场，差 1 血） | MCK9SMSK40ZY F32 52/89 锻造 → 77 进沙虫，T7 猛咬 30 对 21 血 + 8 格挡 | relic-pantograph、rest-by-boss-loss（反例） |
| 沙坑是独立的死线 | 沙坑从 T2 的 4 起每个敌方回合 −1，归零即死，与 HP 无关；可用回合 = 沙坑 + 打出的逃离，A8 一般 7 回合 → 341/7 ≈ 48.7/回合。HP 富余时回血不增加回合，缺的是伤害 | 支持 06S8、CDR0（A8，42 血、14 + 5 格挡被吞），加上一节 16 局；反例 3 不变（HP 先到的局） | 06S86JU88EG5 满血进场 35.7/回合，T7 后 42 血被吞，沙虫剩 91 | insatiable-escape |
| 硬壳每回合 20 封顶 | 鬼祟珊瑚群 HARDENED_SHELL：每回合最多掉 20，超出的伤害白打；所以每回合打够 20 就转格挡 | 支持 2WNT（A8），加上一节 23 局的「要磨 4–5 回合」 | 2WNTQHYY4GAD F8 T5 两张打击第二张 0 伤，手里的格挡没打，38→3 | skulking-colony |
| 回合开始格挡不吃脆弱（观察） | 脆弱只乘卡牌格挡（×0.75）；绯红披风、钗这类能力/遗物在回合开始给的格挡不受影响，女王 99 层脆弱下照样满额；配势不可当时每次得格挡还打一下 | 支持 5HHL（A8）；势不可当整体不分胜负（二、三幕 ≥75% 带它 6/12、不带 69/126），所以只记格挡这条事实 | 5HHLMV2DZ5AZ 女王战每回合开局 14 格挡，11 回合只掉 44 | card-crimson-mantle |
| 实验体的阶段溢出 | 一个阶段打空，boss 当场换成下一阶段满血，同一回合剩下的牌接着打新阶段，所以一回合能连穿两个阶段 | 支持 A8EN、RUDH（A8），反例 0 | A8ENYFR4ZWKG T3 一阶段剩 3 时打穿，接着打进二阶段（212→199）；T8 291 打穿第三阶段 | ts-phases、ts-strength |
| 带刺手甲：能力牌 +1 费 | 每回合 +1 能量，但能力牌全部 +1 费；以能力牌为引擎的牌组等于引擎晚一回合 | 支持 41VA（A8），加上一节 2 局 | 41VAUAM2EFY7 恶魔形态+ 4 费，灵魂枢纽 T4 才打出，T5 死 | relic-spiked-gauntlets、soul-nexus |
| 巨兽自爆（本批复核） | A8 击杀回合 T 的自爆 = 12 + 3(T−1)，击杀后那回合唯一的来袭就是它，HP + 格挡要 ≥ 层数 | 支持 HFNE、5SSR（A8），反例 0 | HFNEL0CRKF96 T20 击杀、69 层对 9 血 + 18 格挡 | giant-explode |
| 蟹之怒（本批复核） | 先死一只时另一只当回合 +99 格挡、力量 2→8，格挡只挡一回合；打死火箭那回合要留出下一回合 | 支持 WLM6、FYQU（A8），反例 0 | WLM6YKJ0ASNE T7 打死火箭时只剩 9 血，下一张打击打进 99 格挡，T8 死 | crab-kill-order |

- 只说得清相关性的写成了「观察」：硫磺在女王战 0/3、力量 × 多段、知识恶魔 T4 打完、势不可当、一幕升级张数、火堆间场数（选长路段的局可能本来没得选）。
- 没有任何喝药规则；药水只作为事实出现（RUDH T1 复制药水）。

### 新增（1）
- **relic-brimstone**（relic:BRIMSTONE 硫磺，n=5，高，asc 8–20）：机制条目，见上。证据 A8EN、W80、EZ2L、FSPK、5GKA（后三局复盘里都有硫磺，之前没有条目）。
- 考虑过没加：势不可当（数据不分胜负）；大～抱抱（2 场）；REFLECTIONS「打碎」（RUDH 33→67 张通关，单局）；滑脚木桥以外的事件；SL 单独一条（本批没有 SL 数据）。

### 更新（70）
- **加证据（69，括号里是本批加的局）：**
  - boss：kin-scaling 27→30（7NMP、Y648、41VA）、lag-race 16→18（YCWN、MCK9）、lag-entry 27→32（RA3Q、WLM6、W80、CDR0、YCWN）、beast-clock 17→19（A8EN、0U96）、vantom-entry 22→26（RUDH、QZQU、JM7B、06S8）、fysh-damage 23→26（S1MU、5HHL、RLCN）、giant-explode 28→31（HFNE、5SSR、F4K8）、giant-deck 23→25（HFNE、5SSR）、kd-dps 38→48（RA3Q、JM7B、QZQU、S1MU、5HHL、A8EN、RUDH、W80、F4K8、0U96）、kd-single-target 10→12（JM7B、5HHL）、kd-free-turns 12→13（RUDH）、insatiable-escape 16→18（06S8、CDR0；反例仍 3）、insatiable-entry 37→41（41VA、MCK9、06S8、CDR0）、insatiable-clock 28→31（MCK9、06S8、CDR0）、crab-entry 44→47、crab-dps 45→48、crab-kill-order 24→27（都是 0QSB、WLM6、FYQU；kill-order 反例仍 4）、queen-plan 15→19（5HHL、W80、F4K8、0U96）、queen-hp 13→17（同）、queen-prep 13→16（5HHL、W80、0U96）、ts-strength 11→13、ts-phases 11→13（都是 A8EN、RUDH）、aeon-clock 18→19（S1MU）。
  - 精英：entomancer 19→20（Y648）、entomancer-cost 21→25（J300、06S8、CDR0、41VA）、byrdonis 15→17（J300、Y648）、terror-eel 29→31（RA3Q、WLM6）、skulking-colony 23→26（YCWN、2WNT、RLCN）、gardener 22→23（W80）、prism 23→26（WLM6、RUDH、0U96）、soul-nexus 8→9（41VA）、elite-need-one 14→17（7NMP、RA3Q、JM7B；反例 0→2：A8EN、5HHL）。
  - 走廊：beetle 37→38（0QSB）、spiny-toad 19→20（CDR0）、myte 8→9（RLCN）、ovicopter 11→12（RLCN）、owl 9→11（QZQU、A8EN）、sculptor 9→10（QZQU）、punch-construct 8→9（41VA）。
  - 幕、路线、火堆：act2-opening 43→45（RLCN、0QSB）、act3-hallways 24→27（QZQU、41VA、A8EN）、route-no-chains 28→31（QZQU、RLCN、0QSB）、route-whole-path 19→21（J300、2WNT）、route-forced-elite-prep 19→20（J300）、route-replan-on-drop 5→8（0QSB、RLCN、A8EN）、rest-preboss-low 7→8（0QSB）、rest-smith-threshold 37→42（7NMP、YCWN、RA3Q、S1MU、RUDH）、rest-by-boss-loss（n 6 不变；反例 0→1：MCK9）。
  - 牌组、卡牌：deck-clock 46→50（QZQU、S1MU、5HHL、HFNE）、deck-gap-by-hp 12→13（J300）、deck-growth-turns 5→9（S1MU、A8EN、5HHL、41VA）、deck-self-damage 8→11（S1MU、A8EN、FYQU）、card-rupture 15→17（S1MU、A8EN）、card-inferno 11→14（S1MU、A8EN、FYQU）、card-demon-form 16→19（5HHL、41VA、W80）、card-fight-me 10→13（Y648、RUDH、5HHL）、card-sword-boomerang 7→9（Y648、RUDH）、card-crimson-mantle 8→9（5HHL）、card-dark-embrace 3→4（7NMP）、card-pyre 3→4（RUDH）、card-greed 2→4（YCWN、2WNT）。
  - 遗物、事件、先古：relic-pantograph 5→6（MCK9）、relic-spiked-gauntlets 2→3（41VA）、relic-royal-poison 5→6（0U96）、event-curses 8→10（7NMP、RA3Q）、event-gold 10→12（YCWN、2WNT）、event-hp-maxhp 15→16（Y648）、event-slippery-bridge 9→10（RUDH）、neow-act2 6→7（RA3Q）。
  - 原有的喝药/留药分句一字未改（fysh-damage、giant-gun 没动、kd-free-turns、crab 各条的药水分句都保留原文）。
- **只改数字（1）：** potion-save-for-boss（见「来源」）。
- **改了文字的（26 条，其余只加证据）：** kin-scaling、giant-explode、kd-dps、kd-free-turns、insatiable-escape、crab-dps、crab-kill-order、queen-plan、ts-strength、ts-phases、entomancer、skulking-colony、soul-nexus、elite-need-one、ovicopter、route-no-chains、route-replan-on-drop、rest-by-boss-loss、deck-clock、deck-self-damage、card-rupture、card-fight-me、card-crimson-mantle、relic-pantograph、event-hp-maxhp、neow-act2（各加一句案例或机制，见上两表）。
- **和数据冲突、改成数据版本的说法：**
  - route-no-chains「不要选连续 ≥3 场战斗、中间无火堆/商店的路（二幕、三幕开局尤其）」→ 二幕火堆间 1–3 场 8%、≥4 场 20%；三幕不随场数涨。
  - rest-by-boss-loss「持有缩放仪（boss 开场 +25）…时更该锻造」→ 按 relic-pantograph 的回血实得算（MCK9 反例）。
  - relic-pantograph「HP+25 已接近满血就锻造」→ 回血实得 = min(回血量, 上限 − HP − 25)，≥10 回血。
- 切片压缩：初稿后把 route-no-chains、route-replan-on-drop、queen-plan、relic-pantograph、elite-need-one 的旧案例压短（地图界面单个切片最多 +0.57k → +0.49k）；逐局细节只留在上表。

### 退役（0）
没有退役、合并。active 198 → 199（上限 200，只剩 1 条空位）。本批的代码修复（见下）没有对应的经验条目；下次再新增前要先合并：候选是 n=1 的低置信条目（fysh-thin、relic-distinguished-cape、event-unrest-site、relic-lords-parasol、relic-scroll-boxes），或把 card-dark-embrace 并进 card-feel-no-pain 一类的「消耗触发牌要 ≥3 个消耗来源」。

### 和手写知识、代码冲突（本次改了；行号按 v4-exp-10030952 07b5a57）
- 攻略 `src/knowledge/ironclad-guide.md`：
  - :133 女王打法新增一条：聚合体死后的下一个敌方回合必是斩首（A8 35、A9 60，带硫磺 45–80），打死聚合体那回合 HP + 格挡要 ≥ 它；截至 10-02 聚合体死了的 14 场赢 3，11 场输局 6 场死在这第一下。原来 :129 的招式循环没有写「下一回合」这一层。n=23 场。
- 手册 `src/knowledge/ds-handbook.md`：
  - :39「连续 ≥3 场战斗、中间没有休息点或商店的路线不走，二幕、三幕开局尤其要避开」→ 二幕火堆间 ≥4 场不走（1–3 场 368 段死 29、≥4 场 103 段死 21；二幕开头 ≤3 场 A8 98 局死 7、≥4 场 80 局死 15），三幕每段 15–19% 不随场数变。证据加 RLCN、0QSB。
  - 版本行没动（还是 2026-10-03）。
- Jev 提示 `src/knowledge/jev-hints.json`：
  - :68 kd-long-fight「The fight lasts 10-15 turns」→「A8 wins took 4-12 turns (median 9)」（A8 知识恶魔 27 场赢局）。25 个词，测试里的「gains N Strength each cycle」不变。
  - 没有新增提示（27/30）。女王斩首这条只进了 boss 笔记（Jev 的时钟笔记会带上），见「需要 Dai 定」。
- boss 笔记：
  - `src/project/run-journal.ts:190` QUEEN（DeepSeek）末尾加：聚合体一死，下一个敌方回合就是将头砍下（A8 35），打死它那回合留住 HP + 格挡（11 场输局 6 场死在第一下）。
  - `src/strategy/boss-clock.ts:79` QUEEN note（Jev 时钟笔记）同加英文一句。两处原句和测试检查的片段都没改。
- 卡牌估值 `src/strategy/card-value.ts`：没改。截止点和 outcome-stats 都和上一节相同，上一节已按 A8 232 局核对过（规则同 09-30，最近两次改过的牌不再动），没有新数据。
- 没改、和数据不冲突：
  - 攻略 :55、:117–121 和手册 :71 的巨兽自爆公式（12 + 3(T−1)），HFNE、5SSR 两局都对得上。
  - 手册 :73、Jev 提示 entomancer-fast「用单张高伤害速杀」：和本批的多段数据一致。
  - 攻略 :14 格挡流里的势不可当：数据不分胜负，也不和它冲突，保留。
  - 攻略、手册里没有硫磺、缩放仪的文字，经验库条目就是唯一来源。
  - BOSS_NOTES 其余 boss、Jev 其余提示：本批没有冲突。
- 没有数据覆盖，保留：攻略 §2–§4 其余卡牌分级、§8–§9 低进阶招式记录；手册其余条目。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 `notes/fix-queue.md` / fix-queue-v4 为准：
- 复盘时已知/已修：二幕路线投影全 0（35cde00 修）；族母睡眠回合只给「结束回合」（phase2 turn-solver 修，YCWN）；时钟不拆实验体阶段等 09-28 基线问题（phase2）。
- 复盘时未修（不阻塞，按复盘原文）：
  - rollout 饱和时先比本回合掉血、最后才比敌人剩血（CDR0 连续两回合 0 出牌伤害；MCK9、WLM6、0QSB 同类），1 个样本也判饱和、回血药抵掉掉血（W80，`rollout-live.ts:458/479/488-494`）。
  - 饱和排序按所有敌人剩血总和，「先杀聚合体/火箭」在排序里没有权重（F4K8、FYQU，`rollout-live.ts:500-502`）；V4 配置 fight_plan 关着时战斗里没有集火目标（0QSB，`combat-plan.ts:1710`）。
  - 锻造/删牌界面只列牌组前 25 张，点名的牌找不到时静默重问（0U96，`selection.ts:351`）。
  - DeepSeek 合法 JSON 后多了文字就判非 JSON（RUDH，`deepseek.ts:580-584`）；失败的调用 latency/usage 记 0（41VA，`router.ts:446-447`）；act-plan 300 s 超时回退到 Jev（41VA）；一局里系统提示换了 2–3 份、run-config 只记开局那份（WLM6，`knowledge.ts:113-130`）。
  - 时钟：撕裂+ 按 +1 算、狱火开局失血不算自伤（S1MU，`boss-clock.ts:828-855`）；势不可当不在时钟里（5HHL）；巨兽 HP 显示 270（含虹吸回血）而 A8 实测 250（HFNE，`boss-clock.ts:200`）。
  - 2WNT：DeepSeek 推理写「heal」、答案是锻造，空 reason 不重问；code lethal 不读 HARDENED_SHELL 上限。
  - 09-28 基线的 HP 护栏 boss 竞速换线、0 能量喝抽牌药、calc mismatch（7NMP、J300、RA3Q）——phase2 起的版本另有处理，复盘里写的是「应该能覆盖」。
- 设计问题（Dai）：能力药水按持有价值算、rollout 使用价值近 0，三局带着它死（W80、CDR0、F4K8）——只记代码事实，不写喝药规则。

### 测试
- v4-exp-10030952 07b5a57：`npx tsc -p tsconfig.json --noEmit` 退出 0。
- vitest（按 CPU 规定 `--maxWorkers=4`，`nice -n 19`）：初稿后完整跑一次 133 个文件 2049/2049 通过，退出 0；压缩条目文字后再完整跑一次，133 个文件 2049/2049 通过，退出 0。没有超时，没有重跑。
- 没有改测试。

### 切片大小
- 样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个；同一脚本（`sample_states.py`）、固定种子 20260929、同一截止点，抽出来和上一节的样本文件逐字节相同。
- 同一批状态分别用改前（e0fa69b）和改后（07b5a57）的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 4.33k / 6.54k | 4.43k / 6.76k | 4.65k / 7.13k | 4.72k / 7.34k |
| 奖励 | 5.73k / 7.28k | 5.91k / 7.55k | 5.57k / 7.28k | 5.69k / 7.55k |
| 地图 | 6.67k / 7.48k | 6.91k / 7.75k | 6.57k / 7.48k | 6.81k / 7.75k |
| 事件 | 4.67k / 7.22k | 4.80k / 7.52k | 4.70k / 6.71k | 4.83k / 6.95k |
| 火堆 | 6.01k / 6.64k | 6.29k / 6.89k | 4.09k / 6.63k | 4.16k / 6.89k |
| 商店 | 5.96k / 6.64k | 6.15k / 6.94k | 6.09k / 6.59k | 6.29k / 6.76k |

- 同一状态改后减改前的中位：A8 战斗 +0.10k、奖励 +0.18k、地图 +0.24k、事件 +0.13k、火堆 +0.22k、商店 +0.17k；A9 +0.09k、+0.13k、+0.26k、+0.13k、+0.07k、+0.15k。单个切片最多涨 0.49k（A8 RVR6 F27、A9 VTRE F17 地图），最大 7.75k（地图，改前 7.48k）。初稿是地图中位 +0.34k、最多 +0.57k，压缩后如上。
- 地图涨得最多：route-no-chains（分段数据）、route-replan-on-drop、elite-need-one 的反例句都在地图切片里；奖励/商店涨的是 deck-clock、deck-self-damage、card-* 的案例句。切片只显示 n，证据 id 不进切片，只加证据的条目大小不变。
- 条目数：active 199（上限 200）；置信度 高 142、中 51、低 6。
- Jev 每场战斗看到的敌人条目仍 ≤4 条：没有新增敌人条目（新增的是遗物条目）。

### 需要 Dai 定
1. 女王斩首：boss 笔记和攻略写了「打死聚合体那回合留住 HP + 格挡 ≥ 斩首」，但 rollout 饱和时按总敌血/本回合掉血排序、不看下一回合的斩首；要不要加 Jev 提示（27/30），或在 rollout 里给「打死聚合体」的那条线扣下一回合 35 的代价。
2. 连战门槛：手册和 route-no-chains 从「≥3 场」改成数据的「二幕 ≥4 场」；路线评分（map.ts）里的连战扣分要不要跟着改。
3. 缩放仪：「回血实得 = min(回血量, 上限 − HP − 25)」要不要做成火堆题面的代码事实（MCK9 差 1 血）。
4. 条目上限：active 199/200，下一次新增前要先合并（候选见「退役」）。
5. 上一节留下的卡牌 TIER（SPITE 等）、帝王蟹 Jev 提示、知识数据文件刷新，本次没有新数据，仍待定。

### 开发会话审核（2026-10-03 10:29）
- 数据抽查：女王将头砍下按日志库 fight_frames 复核（A8 不带硫磺 35；A9 只有 JSA5 一场 60），与本节一致；没有新增或加强药水规则（只改 potion-save-for-boss 句内数字）。
- 改了一处：boss 笔记（run-journal.ts、boss-clock.ts）里写死的「A8 35」改成占位符 {DMG:QUEEN:OFF_WITH_YOUR_HEAD_MOVE}，A9 题面按怪物库外推显示（≈8×5）；攻略里的「A9 60」注明是 1 场（JSA5）、含女王力量（80e0aa9）。
- tsc 0；vitest 2049 用例全过（第一次有 1 个计时类用例在负载下失败，单独重跑通过）。
- 合入：v4 ccfd4c7，v4-live d0ef3a0，下一局生效。

## 2026-10-03 第十二次增量：37 局 A8/A9（32 局 A8 + 5 局 A9；version 2026-10-03.3，分支 v4-exp-10031032，55b6164）

### 来源
- `notes/lessons.md` 两段复盘，节内「更正」按更正用（V1Y4 T2 能量 3、ALBM「前四回合」约 56、R6V3 巨兽 T5 击杀、NBCD 死时 5 血 + 13 格挡、8L29 留药 9 瓶到 4 瓶、GTU2 缚魂药水来源、1HF7 超时次数、8D8D KXG7 每回合 8.7、A4PW 更正 PW7Y 行号）：
  - A8（2705–3190 行，V4.1/V4.2，09-30 至 10-02）：FZLZ9M4QJWBH（F33 知识恶魔）、Z3DFG85QDRCD（F48 实验体）、QWXKQVYQGGCJ（F30 走廊外骨骼虫）、KKTVEN5LQ1PA（通关，沙漏）、HME0FA7VA0J6（F33 帝王蟹）、DT1H1URTUAD8（F42 三骑士）、V3UPVVLVMEJZ（F48 女王）、V1Y4D9Y9GMVK（F24 虱虫之祖）、8TF4SPG3M5RP（F24 千足虫）、G3MU2NADPEDU（F33 知识恶魔）、9FVEQKJ0Y1YQ（F33 沙虫）、R31C86606UDG、5CWLPJLYJKRL、GSG0Q5KP9AAU、GTU27C946ERT（F33 帝王蟹）、ZRYR5WLG6E9K（F39 问号巨斧机器人）、GSFSFQ3JWGEL（F48 沙漏）、NBCDUAYLWKVK、KSPL33MEKV68（F17 巨兽自爆）、ALBM9RUA77WR（F33 知识恶魔）、R6V3T4KSDABE、4JGPCH3WX6JV、KXG79NARS0LT、8L29N792FA45（F48 女王）、W5PTC48C3B1H、RPC6X61N9FQ0（F33 沙虫）、THR72EKB3PQ0（F38 巨斧机器人）、JR6EX14Y331R、1HF7GR4PZAPC（F48 实验体）、NWVLG96EE54U（通关，沙漏）、8YR0D8NMJ1XS（F23 甲虫组）、8D8DZ9K680C2（通关，女王）。
  - A9（3666–3751 行，V4.4，10-02 夜至 10-03）：Z4UK0CA16THF（F33 帝王蟹，SL 6 次）、PW7Y9EWUW8SB（F48 实验体，SL 6 次；F33 知识恶魔 SL 第 2 次赢）、A4PWRULKG2JT（F46 问号电球头）、HYQW47E7CBSC（F38 青蛙骑士）、9175DLPM2EFR（F39 咬人卷轴；F33 沙虫 SL 第 6 次赢）。
  - 开工时 37 局都不是任何条目的证据。32 局 A8 在第十次增量时已「只进数字」，本节加证据；5 局 A9 是新数据。
- 日志（只读）：日志库 `tools/logdb/query.py --no-sync`（库已同步到 9175 结束 10-03T01:55:39Z；本任务没有同步）。脚本和结果在 `learner/runs/20261003-102958-experience-update/`（q.sh、q-*.txt、q-*-cte.sql、boss_moves.py、apply_edits.py、compress.py）。
  - **截止点**：改到 9175DLPM2EFR 结束（2026-10-03T01:55:40Z）。8RB3 之后结束的 5 局都在本批，没有「只进数字」的局；A8 仍 232 局，A9 70 → 75 局。
  - **先复算上一节**（截止点改回 8RB3）：route-hp-bands 各档（二幕走廊 789/2、126/10、37/7、29/12，三幕 234/4、28/5，一幕精英 ≥60% 303/6 等）、boss 进场分组（A8 一幕 161/195、17/28，二幕 62/105、1/29，三幕 13/33、0/12；A9 ≥75% 46/75、<75% 6/17、≥90% 33/50）、A9 各幕房间掉血（353/2、67/5、186/10、13/7、37/2、3/3）、A9 死亡分布和 boss 过关（42/63、10/25、0/4）、二幕开头（A8 178/22、156 局中位 54.7%；A9 42/9、33 局 45%）、一/二幕精英数、火堆间路段（二幕 131/9、112/8、125/12、103/21）、火堆后下一场、一幕力量来源（A8 102/116、76/107；A9 27/33、15/30）、A9 喝药数（4.6、0.8、1.48 n=25；0 瓶 3/9、带药 43/66）、SL 多次重打 14 场赢 4——全部一致。
  - **对不上的一处**：上一节 route-low-hp 写「二幕 <60% 问号 47 次 3 层内死 14（A8 42/12、A9 5/2）」，同一查询的 A9 二幕问号是 1+4+1 = 6 次（`jev-sts2-v4-exp/learner/runs/20261003-074050-experience-update/q-route-choice.txt` 的三行），合计 48 次死 14——上一节加总时少算了一行。本节新口径数字是 50/14，条目已改。
  - monster-db 用 `tools/build-monster-db.py --out` 重建到临时目录（`monster-db-20261003b.json`），只用来比 A8/A9 招式；仓库里的 monster-db.json、boss-damage.json、outcome-stats.json 没动。
- 口径同前：「战内掉血」= 第一帧 HP − 最后一帧 HP（fights.hp_loss），死亡单独计；走廊只算 Monster 房，问号另算（unknown_room）；血量分档按本层 floors 的进房 HP / 最大生命；火堆/商店后的「下一场」= 同局下一个有战斗的层；SL 的多次尝试在 fights 里算一场。
- 开工时 `git merge --no-edit v4`：已是最新（ccfd4c7）。
- 结果：新增 2 条，更新 78 条（73 条加证据或反例，5 条只改数字/合并文字），退役 4 条（都是合并）；active 199 → 197，总数 227 → 229；置信度 高 144、中 51、低 2。
- 药水（照上一节）：potion-save-for-boss、potion-empty-slots 只改句内数字，n 不变（「九批 122 局 89 局、约 169 瓶」→「十批 159 局 110 局、约 210 瓶」：本批 21 局约 41 瓶点名给 boss 的药在路上喝掉——R6V3 6、8D8D 4、GSG0 3、Z4UK 3，THR7、JR6E、8L29、NWVL、GTU2、1HF7、PW7Y、9175 各 2，Z3DF、R31C、NBCD、ALBM、RPC6、4JGP、KXG7、8YR0、A4PW 各 1；A9 每局走廊/事件战 4.6 瓶、精英 0.9、二幕 boss 进场 1.4 瓶 n=30；A9 ≥75% 进场 0 瓶 4/11、带药 49/72）。其他条目原有的喝药/留药分句一字未改，新证据只写非药水部分；没有新增或加强任何「什么时候喝/别喝」的说法。
- 第 4.1 节三项：路线与血量（分档表加问号房和赢局掉血、火堆/商店后的下一场、低血时选安全节点、火堆间路段，见下表）；SL 重打对照（18 场）；A9（75 局的死亡分布、招式复核、各条目的 A9 数字）。

### 对照数据检查的主题
| 主题 | 数据 | 结论 |
| --- | --- | --- |
| **路线与血量：下一场按进房血量分档**（A8+A9 截至 10-03，n/死，赢局掉血中位；q-bands-full.txt） | 二幕走廊 ≥60% 810/2（中位 13）、40–60% 126/10（16）、25–40% 38/7（15）、<25% 30/12（6.5）；三幕走廊 ≥60% 245/4（14）、40–60% 30/6、25–40% 7/1、<25% 5/3；一幕走廊 <25% 14/2，其余 1632 场 1 死。问号开出的战斗：二幕 ≥60% 82/0、40–60% 20/0、25–40% 8/1、<25% 9/6；三幕 ≥60% 39/1、40–60% 9/1、<25% 3/2。精英：一幕 ≥60% 308/6、<60% 17/6；二幕 ≥60% 119/14（中位 33、p75 51），三幕 30/4（41.5/58）；二、三幕 <60% 17/14 | route-hp-bands 改数字；「问号同价」改成「<25% 一样险」（25–60% 的问号战斗 28 场死 1，比走廊轻，但问号还可能开出别的，见下一行）。观察数据：赢局掉血各档相近，差在死亡 |
| 火堆/商店后的下一场（进房血量分档，q-rest-shop.txt） | 火堆回血：<40% 起平均回到 0.55–0.71；之后下一场是 boss：二幕 A8 38/35、A9 8/6，一幕 27/13，三幕 13/13；40–60% 起二幕 boss 34/18，≥60% 起 67/24。商店（不回血）：A8 二幕 <40% 离店后下一场 25 场死 13；在商店回了血的（李家华夫饼等）A8 二幕 <40% 4 场 0 死（n 小） | rest-preboss-low 改数字；shop-low-hp 加李家华夫饼的例外（ALBM、8L29） |
| 低血时同一步能选火堆/商店/宝箱也能选战斗（<60%，3 层内死亡；q-route-choice.txt） | 选安全节点 258 次死 22（A9 一幕 33/1、二幕 28/5、三幕 5/1），选战斗 24 次死 8；问号对走廊：一幕 54/4 对 21/2，二幕 50/14 对 23/9（A9 8/2 对 6/5），三幕 16/4 对 9/2 | route-low-hp 改数字（含上面「对不上」的一处）。观察数据：选战斗的多是别的路更差 |
| **路线改线的对照**（复盘） | 往安全方向改的：A8EN（上一节）、V1Y4 一幕打到 5 血后绕开第二精英（过一幕 boss）；往险处改的：9175 A9 F37 61% 把「商店 → 走廊」改成两场走廊（投影 F40 到达 42/80，实到 16/80 进第三场死）、QWXK 回血时把「精英 → 火堆」改成「火堆 → 走廊 → 精英」（投影 84%，实到 70%，精英后只剩一条走廊，10 血死）；改不了的：A4PW、HYQW 三幕第 2 层后每层只有一个节点，复核时已无可选 | route-replan-on-drop 加两例反向改线；route-whole-path 加 QWXK、KXG7、A4PW、HYQW（只加证据）。是观察，不是因果 |
| 火堆之间连打几场（A8+A9 截至 10-03，起点 ≥60%，q-seg.txt） | 二幕 1–3 场 381 段死 29（8%），≥4 场 105/21（20%）；三幕 1 场 36/6、2 场 34/5、3 场 49/11、≥4 场 27/2（7–22%，不随场数涨）；二幕开头 A8 ≤3 场 98/7、≥4 场 80/15 不变 | route-no-chains 改数字，加 8YR0（二幕开头 5 场，第一层起每条路都是普通战）、ALBM |
| 二幕开头、精英数（q-act2-open.txt、q-elite-counts.txt） | A9 二幕开头 47 局 9 局死在第一个火堆前，38 局中位 46%（p25 31%）；A9 二幕 0 精英 32 局过二幕 boss 11（9 局死在走廊、12 局死在 boss），1 精英 14 局过 3（6 局死在精英）；A9 一幕 0/1/2 只精英 14 局 8/1、50 局 31/8、11 局 8/5 | act2-opening、elite-need-one 改数字；elite-need-one 加 HME0、G3MU（二幕 0 精英、满血进 boss 输在输出） |
| boss 进场血量（q-boss-entry.txt） | A8 不变；A9 103 场 ≥75% 53/83（二幕 12/21），<75% 8/20（二幕 2/9），≥90% 58 场赢 40 | route-entry-hp 改数字 |
| **SL 重打的对照**（sl_attempts，attempt ≥2 的 18 场，q-sl.txt） | 赢 6 场：VNKN、XPDA、9V7K 帝王蟹、JSA5（上一节已列）；PW7Y A9 知识恶魔第 2 次（没换线，Jev 看了 previous_attempts 把 T2 改了；T5 手牌和第 1 次不同、来源没记录，T5→T6 恶魔 298→179 对 298→220，少挨一轮——有运气成分）；9175 A9 沙虫第 6 次（SL_RETRY_EXPLORE 把 T2 换成先打战斗专注，提前抽到第二张狱火+，之后每次失血两轮群伤，341→56 到 T4，T5 斩杀；第 3 次换线因单线重规划 differs=false 白费）。输 12 场：本批 Z4UK A9 帝王蟹 6 次都在 T4 激光死（T4 开局 21/19/17/9/19/18 血 + 9–12 格挡，第 6 次换 T1 喝药顺序等于重放第 1 次）、PW7Y 实验体 6 次（第 3、4 次和第 2 次逐字相同，第 2–5 次越早进三阶段死得越早）。按进场血量：≥99% 8 场赢 5，62–84% 3 场赢 0，≤61% 7 场赢 1（只有 9175） | route-entry-hp 改写重打句；kd-dps（PW7Y，写明运气）、insatiable-clock（9175：赢的那次改的是起手顺序）、crab-entry（Z4UK）、ts-phases（PW7Y）各加一句。区分：9175 是换线改了起手顺序（因果较明确），PW7Y 是抽牌不同（运气） |
| **A9：招式和增益**（重建的 monster-db，base_per_hit 中位） | 44 招 A9/A8 中位 ×1.125（1.00–1.33），和上一节一致（多了 A4PW、HYQW、9175 三局）；巨兽自爆 A9 中位 41（上一节 42.5）、激光 35、沙虫猛咬 31、实验体大扑击 45（A8 也 45，n=1）、多次爪击每段 11 | a9-damage 招式句不变 |
| **A9：死亡分布和房间掉血**（q-a9-deaths.txt、q-room-agg.txt） | 75 局：一幕 28（boss 21、精英 5、走廊 2），二幕 33（boss 16、走廊 10、精英 7），三幕 14（boss 5、走廊 4、精英 3、问号 2）；boss 过关一幕 47/68、二幕 14/30、三幕 0/5。一幕走廊 8/13（384 场死 2）、精英 30/40（72/5）；二幕走廊 13/21.5、p90 30（209/10）、精英 16/7；三幕走廊 14/26.5（52/4）、精英 4/3、问号 17/2。本批 5 局：二幕 boss 1、三幕 boss 1、三幕走廊/问号 3（A4PW 13/72、HYQW 49/101、9175 16/80 进场） | a9-damage、act1-costs 改数字；一幕 boss 5/5 赢 |
| A9 遭遇（q-a9-enc.txt） | 蜂群术士 5/2（Z4UK 满血 −77）、甲虫组 12/3（−28/−36）、猎人杀手 14/2（p75 −29.5）、狂战士 7/1、雕刻师 12/0（−15.5/−26.75）、棱柱 5/1、青蛙骑士 4/1、法官 4/1、机甲骑士 2/1（A4PW −58） | 各条 A9 数字改成截至 10-03 |
| 一幕 boss 力量来源（q-act1-str.txt） | A9 有力量来源 38 场赢 32（≥75% 29/32），没有 30/15（本批 5 局都有、都赢）；A8 不变 | act1-strength 改数字 |
| **女王：挨打 vs 输出**（turns 视图，A8/A9 23 场；q-act3-boss-turns.txt） | 赢的 3 场（RBJ4、5HHL、8D8D）每个敌方回合掉 5.8（来袭 27.7 的 21%）、打 61.9/回合；输的 20 场掉 11.2（29.1 的 38%）、打 40。力量峰值：输局 W80 30、JSA5 24、V3UP 19、8L29 17；赢局 31/15/12。敏捷：赢局 2/3、输局 8/20。SL 重打的 XSPH、7PWU 两场各回合按 run+层合并，有少量混算 | 新增 deck-passive-engine（观察）；queen-hp/plan/prep 加证据；攻略 :135 改成数据版本 |
| 永世沙漏（同上，15 场） | 赢 6 场 6–10 回合、59.1/回合、每回合掉 7.6；输 9 场 7–11 回合、33.7/回合、掉 7.9 | aeon-clock 加这句；攻略 :71、BOSS_NOTES 去掉「没有一局活过 T8」 |
| 实验体（q-act3-powers.txt） | A8 10 场赢 4（6–10 回合，力量峰值 17–27），输 6 场（1HF7 22、VQKX 21、Z3DF 12、FSPK 15、D3X1 3、JR6E 3）；A9 0/2 | ts-phases（JR6E 复盘的「A8 2/7」漏了 10-02 的 5DFX、JW92，用数据 4/10）、ts-strength（力量必要不充分） |
| **帝王蟹激光朝向**（fight_frames，ROCKET LASER_MOVE 意图） | A8 显示 33 的 116 帧 35 局、49 的 87 帧 36 局（×1.5），A9 38–39 / 57–58；GSG0、GTU2 打出指向火箭的最后一张后 49→33 | crab-kill-order 加机制句（攻略 :57 和 boss 笔记早已写「背后 ×1.5」，没改） |
| 帝王蟹（本批） | 赢：KKTV 满血 71.3、NWVL 满血 9 回合、8L29、KXG7、4JGP、GSFS、R6V3（A8）；输：HME0 满血 41.7（二幕 0 精英）、5CWL 90% 43.9（火箭 160、碾碎爪 191 平摊）、GTU2 满血 46.7、R31C 64% 3 回合、GSG0 40%；Z4UK A9 61% | crab-entry、crab-dps、crab-kill-order 加证据 |
| 知识恶魔（本批） | FZLZ 77% 32.5/回合（3 能量 + 懒惰）、G3MU 满血 21.6、ALBM 65% 约 30（T7 0 格挡吃 33）都输；8D8D、JR6E、V3UP 赢；PW7Y A9 满血重打第 2 次赢 | kd-dps、kd-single-target、kd-block 加证据 |
| 沙虫（本批） | 9FVE 67% 33.5/回合（与我一战！让猛咬 28+3=31 正好致死）、W5PT 满血 29（要 43）、RPC6 84% 37 都输；DT1H、ZRYR 赢；A9 A4PW、HYQW 满血赢，9175 54% 重打第 6 次赢 | insatiable-entry（9175 进反例）、insatiable-clock、insatiable-escape（逃离越打越贵，W5PT 1 局）、card-fight-me |
| 巨兽（本批） | NBCD T13 击杀、自爆 48 对 5 + 13；KSPL T10、39 对 31 + 5；都是 0 张力量牌、23.3/25 每回合；GTU2、NWVL、R6V3、8D8D、9175 赢。自爆 = 3×T+9 两局都对得上 | giant-explode、giant-deck、act1-strength |
| 三幕精英、走廊（本批） | 三骑士 A8 11 场死 1、−30.5/−37.5（DT1H 77/95 死，8D8D −44、Z3DF −33），A9 1/1 死；机甲骑士 R6V3 −54、KXG7 −58、A4PW A9 −58；巨斧机器人 A8 三条命 85→89→104、82→95→97，死的两场 52/87、46/86；猫头鹰法官 −30~−43；咬人卷轴 A8/A9 65 场死 1、最大生命中位 −2、最多 −10（JR6E 两场 −18）；组装师 A8 18 场死 1（JR6E 57→1） | 新增 knights；mecha-knight、axebot、owl、frog-knight、berserker、sculptor、act3-hallways 加证据和数字 |
| 二幕精英、走廊（本批） | 千足虫 8TF4 60/83 死，GSG0 −64、R31C −62、FZLZ −62；蜂群术士 QWXK −60、KKTV −69；甲虫组 8YR0 41% 死；虱虫之祖 V1Y4 48% 死（它剩 5 血）；外骨骼虫×4 QWXK 11% 死 | decimillipede、entomancer-cost、beetle、louse 加证据 |
| 火堆选择（本批） | boss/必经战前锻造后死：Z3DF 66/80（回血 +14 能活过 T8）、DT1H 77/95、Z4UK A9 69/80；6 个火堆 0–1 次锻造：G3MU、9FVE、THR7（一幕掉血逼的） | rest-before-forced、rest-smith-threshold 加证据；手册 :42 改成数据版本 |

### 经验库自己带偏、或写了没被执行的地方
- **route-hp-bands 被引用、执行了（正面）：** HYQW（10-03.1 库，F12 起）F25 休息「25–40% band ~19% death」、F16「36% HP cannot survive」（rest-preboss-low），F25/F29/F32 三次回血，100/101 进沙虫第一次就赢。
- **同一条在三幕没被执行：** 9175 全程用 10-03.1 库，route-hp-bands 被引 6 次，但 F37 复核（49/80）把商店改成两场走廊时 0 条引用，route_reason「11金商店无用，改走战斗多得卡牌与金币」；条目写的是「三幕走廊 40–60% 进场 18% 死，<40% 10 场死 3」。F32（19/80，二幕 boss 前最后一个火堆）推理只引 insatiable-entry，rest-preboss-low 没引。
- **route-forced-elite-prep「精英前的走廊按 p75 预留」没执行：** QWXK F25 回血时改线，理由「先火堆再精英，进精英约 84%」，没算中间那场走廊（实到 64/91）。
- **crab-entry 的门槛 DeepSeek 自己引了，前面的火堆没配合：** Z4UK F32「进场≤61%无人生还」只能回到 49；血在 F29 锻造（69/80，「F32 再回血」）之后的两场走廊丢掉。rest-before-forced 写的是「boss/必经精英前」，这类「boss 前还有两场走廊、69/80」没覆盖到，本节加了 Z4UK 一例。
- **kd-dps 被引用并执行（正面）：** PW7Y F32「<75% 进场 A8 0/10 胜」回满进知识恶魔，重打第 2 次赢。
- **elite-need-one / rest-smith-threshold 写了没做到：** G3MU F23「Boss needs 46 dmg/turn, deck gives 24」，二幕仍选「左路避精英、多问号多休息」、6 个火堆 5 次回血；9FVE F17 run plan「smith to ≥3 upgrades」，6 次全回血、0 升级。复盘写明根子在一幕掉血。
- **rest-before-forced 被自己的血线替换：** Z3DF F47「83% 已达标自定 ≥60 进场线」锻造；DT1H F40「回血会被上限浪费」锻造（30% 回 +28、只溢出 10）。条目原有「HP<85% 回血」，DeepSeek 用了自己定的数。
- **镜子「打碎」第二次出现，库里没有这条：** V3UP F46（34→69 张），复盘「同一个错误第二次出现，说明经验库里的上一条没管用」——上一节考虑过 REFLECTIONS（RUDH 通关，单局）但没加条目。本节并进 deck-bloat（5GKA、V3UP 输，RUDH 通关作反例，写成观察）。
- **route-shops、shop-spend-gold：** V3UP 三幕 0 商店带 281 金、KSPL 一幕 0 商店带 274 金进 boss；8YR0 茶师处「Keep all 202 gold for the F24 shop」，F23 死带 209 金。
- **deck-clock 偏悲观的一例：** 8D8D 女王时钟一直报缺 40–58/回合，赢在钗和被动伤害（时钟、rollout、整场模拟都不算钗）。
- 药水（只记事实）：本批 21 局约 41 瓶点名给 boss 的药在路上喝掉（见「来源」），按规则只改数字。HYQW、W5PT、KXG7（给女王的 3 瓶）是带到 boss 的反例。

### 机制推理
| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |
| --- | --- | --- | --- | --- |
| 帝王蟹被包围：背后 ×1.5 | 两只蟹一前一后，背对我的那只攻击 ×1.5；每打出一张指向某只的牌就转身面对它。所以激光回合（T4/T9）最后一张牌打谁，决定激光按 33 还是 49 结算，差 16 点正好是很多局的致死余量 | 帧数据：A8 33/49 两种意图各见于约 35 局，A9 38–39/57–58；复盘支持 GSG0、GTU2（A8）、Z4UK（A9），反例 0 | GSG0Q5KP9AAU A8 T4 激光开局显示 49，最后一张怨恨打火箭后变 33，19 血 + 6 格挡 + 覆甲 8 正好归零 | crab-kill-order（攻略、boss 笔记、Jev 提示 crab-charge 已有，没改） |
| 女王：虚弱/脆弱不打折的被动件 | 99 层虚弱/脆弱让攻击牌（连力量）和卡牌格挡都 ×0.75，所以力量越高损失越多；荆棘、火焰屏障、狱火、水银沙漏、消亡粉末的伤害和钗、绯红披风的回合开始格挡不吃这两个减益，斩首 5 段每段都触发荆棘/火焰屏障。女王有效血约 630，输出被压到 40–57/回合时只能靠拖到 10 回合，这时决定胜负的是每个敌方回合掉多少 | 23 场：赢 3 场每敌方回合掉 5.8（21%），输 20 场 11.2（38%）；力量 17–30 的输局 4 场；支持 8D8D、5HHL（A8），对照 NWVL（沙漏，挨打相同、差在伤害），反例 0；赢局只有 3 场，写成观察 | 8D8DZ9K680C2 A8 女王 11 回合赢：钗每回合 7 格挡、敏捷 2，10 个敌方回合意图 264 只掉 59，被动伤害 165（26%），手套力量 1→15 | deck-passive-engine（新）、queen-prep、攻略 :135 |
| 女王：聚合体的死活决定女王格挡 | 聚合体活着时女王每回合「为我燃烧」+20 格挡、聚合体 +1 力量，打女王的单体伤害基本白打；聚合体一死女王不再加格挡，但下一回合斩首。所以早杀聚合体 = 女王格挡早消失 + 斩首早来，两头都是倒计时 | 支持 KXG7、8L29、V3UP、4JGP、8D8D（A8），反例 0；聚合体死亡回合和胜负没有单调关系（赢局 T6–T8，输局 T2–T7），写成观察 | KXG79NARS0LT A8 聚合体 T3 死，女王 T3–T7 掉 215（约 48/回合）；8L29N792FA45 聚合体停在 6 血两回合，女王 T2–T6 只掉 23 | queen-plan |
| 实验体：复生清空、二阶段计时、三阶段开场无实体 | 每阶段打空后复生回合不攻击，下一阶段满血、身上的力量/虚弱/易伤全清（一阶段挂的减益带不进去）；二阶段多段爪每回合 +1 段（A8 30/40/50/60），所以 212 血要 3–4 回合打完；三阶段开场就有无实体 1，从二阶段打死到能打三阶段白送一回合，进三阶段的血要扛 30 + 45 | A8 10 场赢 4（6–10 回合，力量 17–27），输 6；A9 0/2。支持 JR6E、Z3DF、1HF7（A8）、PW7Y（A9），反例 0 | 1HF7GR4PZAPC A8 94/103 进场，二阶段 4 回合掉 54，38 血进三阶段，T6 无实体每击 1，T7 大扑击 45 死 | ts-phases、ts-phase3、ts-strength；攻略 :62 |
| 永世沙漏：比的是伤害 | 三回合一轮里有一回合不攻击、退潮回合给自己 33 格挡，它的来袭约 19–21/回合，赢输掉血一样；人工制品 3 吃掉前三个减益。所以胜负只看能否在凋萎和力量叠起来前打完 535 | 15 场：赢 59.1/回合、输 33.7，每回合掉 7.6 对 7.9；支持 KKTV、NWVL、GSFS（A8），反例 0 | KKTVEN5LQ1PA A8 满血，T3 起连续三回合 122/121/103，6 回合打完 | aeon-clock、aeon-artifact；攻略 :71、BOSS_NOTES |
| 烘焙手套：每回合 +1 力量、−1 张手牌 | 力量每回合 +1，打到第 7 回合才 +7；代价是每回合开局消耗一张手牌，所以前几回合输出更低，但消耗堆涨得快（契约终结要 ≥3）。长战（女王、知识恶魔）回本，短战/残血走廊是负担 | 支持 RPC6（沙虫 T7 力量 13 时只剩 19 血）、8YR0（T4 消耗头槌）、8D8D（女王 11 回合 1→15、T10 契约终结 36），A8，反例 0；上一节 28 场 boss 赢 11 | 8D8DZ9K680C2 女王战手套 + 燃烧+ 力量 T3 7 → T11 15 | relic-toasty-mittens、card-pacts-end |
| 敌人力量加在每一下 | 与我一战！给敌人 +1 力量；沙虫猛咬 = 28 + 力量，所以那 1 点直接加在下一次咬上 | 支持 9FVE（A8），连同上一节 KMB1、XC4T、8RB3、Y648；反例 0 | 9FVEQKJ0Y1YQ A8 沙虫 T6 打出与我一战！，T7 猛咬 31 对 28 血 + 3 格挡 | card-fight-me |
| 两张狱火叠加 | 狱火是「每次失去生命对全体」，两张就是每次失血两轮；配血墙/放血/突破的自伤，抽到第二张的早晚决定伤害曲线 | 支持 9175（A9），反例 0 | 9175DLPM2EFR A9 沙虫第 6 次 T2 先打战斗专注抽到第二张狱火+，T2–T4 打 60/86/121 | card-inferno、insatiable-clock |
| 懒惰的出牌上限 | 懒惰 = 每回合最多 3 张，所以多出来的能量（薪火之源）和 0 费小牌都没用 | 支持 ALBM、FZLZ（A8），反例 0 | ALBM9RUA77WR A8 T7 薪火之源后 4–5 能量，T6/T8/T9 出满 3 张剩 1 | kd-single-target |
| 巨兽自爆（复核） | A8 击杀回合 T 的自爆 = 3T + 9 | 支持 NBCD、KSPL（A8，48、39），反例 0 | NBCDUAYLWKVK T13 击杀，T14 自爆 48 对 5 + 13 | giant-explode |
| 巨斧机器人三条命 | 每条命满血复活、上限变高，复活回合启动不攻击；A8 实测三条命 274–278，所以 ~55% 进场按一场精英算 | 支持 ZRYR、THR7（A8，都死）、8L29（A8 87→37 赢），反例 0 | THR72EKB3PQ0 A8 46/86 进场，前两条命 T1–T4 打掉 177，第三条命 97 满血复活时只剩 30 血 | axebot、攻略 :59 |
| 咬人卷轴扣最大生命 | CHOMP/CHEW 的伤害同时扣最大生命，之后回血按低上限截；单场掉血不多（中位 9），代价落在 boss 战的上限上 | 65 场：最大生命中位 −2、最多 −10；支持 JR6E（−18）、R6V3、THR7、V3UP（A8），反例 0 | JR6EX14Y331R A8 两场咬人卷轴 80→62 上限，25/62 进实验体 | act3-hallways（没单立条目：它不是 map 威胁列表里的遭遇，单立只在战斗里显示） |
| 重打只换得了出牌，换不了血量 | SL 读档回到同一场、同样抽牌，能改的只有出牌顺序和目标；进场血量决定能挨几次大招，换线救不回 | 18 场：≥99% 进场 8 场赢 5，62–84% 3 场 0，≤61% 7 场 1（9175）；支持 Z4UK、PW7Y（A9）等，反例 9175 一场 | Z4UK0CA16THF A9 49/80 进帝王蟹，6 次重打都在 T4 激光死（T4 开局 9–21 血） | route-entry-hp |
| 敏捷（观察） | 敏捷只加在卡牌格挡上，每张 +N，再被脆弱 ×0.75 | 女王赢局 2/3 有敏捷、输局 8/20；n 小 | 8D8D T2 敏捷 +2 后整场 | 没单写（并进 deck-passive-engine 的观察） |
| 狂乱逃离越打越贵（观察） | 每张多一回合，但费用会涨 | 只有 W5PT（A8）一局 | W5PTC48C3B1H T7 第二张、T8 那张都花 2 能量 | insatiable-escape（写明 1 局） |
| 女王魂缚锁链（只记事实） | 每回合先抽到的 3 张带魂缚，打出一张其余锁住 | 4JGP 三回合各剩 2 能量、KXG7 2、8L29 1 | 4JGPCH3WX6JV T2、T3、T5 各剩 2 能量结束回合 | 没进条目（攻略 :60、:126 已有） |

- 只说得清相关性的写成了「观察」：被动件在女王战（赢局 3 场）、敏捷、聚合体死亡回合、狂乱逃离费用、问号对走廊、改线对照、二幕精英数。
- 没有任何喝药规则；药水只作为事实出现（消亡粉末算进「被动伤害」那一列的机制说明，不写什么时候喝）。

### 新增（2）
- **knights**（elite:FLAIL_KNIGHT 三骑士，n=3，中，asc 8–20）：三幕精英，魔法骑士每 3 回合炸弹 36，单回合合计可到 66；A8 11 场死 1、−30.5/−37.5，A9 1/1 死，按 −40 预留、约 42/回合。证据 DT1H、8D8D、Z3DF。
- **deck-passive-engine**（general:deck，n=3，中，asc 8–20）：机制条目，见上。证据 8D8D、5HHL、NWVL。
- 考虑过没加：咬人卷轴单立（不在威胁列表里，放进 act3-hallways）；李家华夫饼单立（2 局，放进 shop-low-hp）；组装师（A8 18 场死 1，JR6E 一例放 act3 记录）；外骨骼虫×4（A8 39 场死 1）；钗单立（只 8D8D 一局赢，放进 deck-passive-engine）。

### 更新（78）
- **加证据（73，括号里是本批加的局）：**
  - boss：vantom-multihit 9→10（KKTV）、vantom-entry 26→29（9FVE、ZRYR、8L29）、lag-entry 32→38（HME0、5CWL、W5PT、RPC6、PW7Y、HYQW）、giant-explode 31→38、giant-deck 25→27（NBCD、KSPL）、insatiable-escape 18→19（W5PT）、insatiable-entry 41→48（反例 1→2：9175）、insatiable-clock 31→35、crab-entry 47→51、crab-dps 48→52、crab-kill-order 27→33（反例仍 4）、kd-dps 48→55、kd-single-target 12→14、kd-block 8→10、queen-hp 17→23、queen-plan 19→24、queen-prep 16→20、ts-phases 13→17、ts-strength 13→14、ts-phase3 3→4、aeon-clock 19→22、aeon-artifact 6→7。
  - 精英：entomancer-cost 25→31、decimillipede 31→36、prism 26→28、terror-eel 31→34、gardener 23→25、skulking-colony 26→29、mecha-knight 16→21。
  - 走廊：beetle 38→39、hunter-killer 34→35、louse 15→17、owl 11→16、axebot 10→13、frog-knight 10→13、berserker 7→9、sculptor 10→11。
  - 幕、牌组、卡牌、遗物：act1-strength 20→22、act2-opening 45→48、act3-hallways 27→34、deck-clock 50→51、deck-block-floor 16→19、deck-bloat 9→12（反例 0→1：RUDH）、deck-growth-turns 9→12、card-fight-me 13→15、card-rupture 17→20、card-pacts-end 3→4、card-inferno 14→15、relic-toasty-mittens 27→30、relic-blood-soaked-rose 2→3、relic-looming-fruit 4→5（中→高）、relic-ember-tea 4→5（中→高）、relic-nutritious-soup 8→13、relic-petrified-toad 2→3、relic-royal-poison 6→7。
  - 路线、火堆、商店、事件、A9：route-entry-hp 66→71、route-no-chains 31→33、route-low-hp 15→17、route-hp-bands 9→16、route-replan-on-drop 8→11、route-whole-path 21→25、route-forced-elite-prep 20→24、route-shops 20→23、elite-need-one 17→19、rest-before-forced 20→23、rest-smith-threshold 42→45、rest-preboss-low 8→11、shop-spend-gold 20→21、shop-no-junk 9→10、shop-low-hp 8→10、event-slippery-bridge 10→13、event-spirit-grafter 3→4、a9-damage 70→75（只加 A9 局）。
  - 原有的喝药/留药分句一字未改（entomancer-cost、route-forced-elite-prep、insatiable-clock、crab-* 等的药水分句都保留原文）。
- **只改数字/合并文字（5）：** act1-costs（数字）、potion-save-for-boss、potion-empty-slots（药水，只改句内数字）、fysh-beckon、event-curses（并入退役条目的一句，证据原本就在）。
- **和数据冲突、改成数据版本的说法：**
  - route-low-hp「二幕 47 次死 14」→ 50 次死 14（含上一节少算的一行）。
  - route-hp-bands「问号开出的战斗同价」→「<25% 一样险」（二幕 25–60% 问号战斗 28 场死 1，比走廊轻）。
  - ts-phases 加「A8 4/10」（JR6E 复盘写的 2/7 漏了 5DFX、JW92）。
  - route-entry-hp「≤60% 进场的重打都一样输」→ ≤61% 7 场赢 1（9175）。
  - aeon-clock 原「赢的 JJ75、3DGZ 8–10 回合」扩成 A8 赢局 6–10 回合，加「赢输掉血相同，差在伤害」。
- 切片压缩：初稿后第二遍（compress.py）把 deck-clock、rest-before-forced、deck-block-floor、decimillipede、rest-smith-threshold 的旧案例并成一句（意思不变，删的是逐局数字，比如 deck-clock 删了 Z6AM「报 46 实需 61」、JUXB「差 15」），并把本批几条只加证据的条目的案例句去掉；逐局细节只留在上表。

### 退役（4）
都是合并，为给新增腾位置（上一节「退役」里列的候选）：
- fysh-thin（n=1，低）→ fysh-beckon（加「≤16 张或打击 ≤3 张时不再为它删打击」，证据 F6NT 原本就在）。
- event-unrest-site（n=1，低）→ event-curses（睡眠不佳就是那条说的保留诅咒，证据 SCBC 原本就在）。
- relic-distinguished-cape（n=1，低）→ deck-bloat（加「卓越斗篷同理」）。
- relic-lords-parasol（n=1，低）→ deck-bloat（原文已写领主阳伞 Y3XT 32→50）。
- 代价：这 3 个遗物/事件被提供时不再按 id 命中专属条目，只在对应的 general 话题里出现。active 197（上限 200）。本批的代码修复（执迷锁牌、钢笔尖翻倍、魂缚误判、HP 护栏换掉能力牌等）没有对应条目，没有因代码修好而退役的条目。

### 和手写知识、代码冲突（本次改了；行号按 v4-exp-10031032 55b6164）
- 攻略 `src/knowledge/ironclad-guide.md`：
  - :135 女王「需要力量成长（燃烧、恶魔形态）和 AOE，纯前期爆发打不动」→ 数据版本：虚弱连力量一起打折，力量 17–30 的输局 4 场；23 场赢局每个敌方回合掉 5.8、输局 11.2，被动伤害和回合开始格挡不打折，要力量成长 + 能撑到 10 回合的防守（8D8D）。
  - :71 永世沙漏「约第 8 回合前打完（没有一局活过 T8）」→ A8 赢局 6–10 回合（NWVL、3DGZ 10 回合），输局 7–11 回合，赢输每回合掉约 7.7、差在伤害 59 对 34（15 场）。
  - :59 巨斧机器人补 A8 实测 85→89→104、82→95→97（三条命约 275）。
  - :62 实验体复生清空加上「虚弱」（JR6E）。
- 手册 `src/knowledge/ds-handbook.md`：
  - :42「休息回血会被血量上限截掉一部分时（帝王枕头等），更应该锻造」→「回血一半以上会被上限截掉时才锻造，下一场是 boss/必经精英时按 rest-before-forced 的血线回血」（Z3DF、DT1H、Z4UK）。第一稿写了「HP<85%」，tests/knowledge-text.test.ts 不许手册写 HP% 阈值，改成引用条目。版本行没动。
- boss 笔记 `src/project/run-journal.ts:192` AEONGLASS「约第 8 回合前打完」→「A8 赢局 6–10 回合打完，赢输每回合掉血相近，差在伤害」。boss-clock.ts 的 AEONGLASS 英文笔记没有回合数，没改。
- 没改、和数据不冲突：
  - 攻略 :57、boss 笔记 KAISER_CRAB、Jev 提示 crab-charge 都已写「背后 ×1.5」，和帧数据一致。
  - 攻略 :56「狂乱逃离…越打越贵」和 W5PT 一致；:60、:126 魂缚锁链和 4JGP 一致；:70 人工制品和 GSFS 一致。
  - 手册 :68 实验体「进二阶段 HP 最好 ≥60」、Jev 提示 test-subject-phases「Enter phase 2 with 60+ HP」：1HF7 93 血进二阶段仍输，不冲突（必要不充分）。
  - 卡牌估值 card-value.ts：A8 截止点没变（232 局），outcome-stats 没刷新，没有新数据，不动。
  - Jev 提示：没有新增（27/30）；女王被动件没有写成提示，见「需要 Dai 定」。
- 没有数据覆盖，保留：攻略其余卡牌分级、低进阶招式记录；手册其余条目。

### 代码问题（不给 DS）
按复盘写的状态，修复进度以 fix-queue-v4 为准：
- 复盘时未修（不阻塞，按复盘原文）：
  - 饱和盘面按本回合掉血挑线（rollout-live.ts:488-494）：FZLZ T7/T10 少打 26、HME0 恶魔形态+ 没打、KKTV 沙漏 T2 打 1。
  - 锻造/删牌界面只列前 25 张，点名的牌找不到时静默重问（Z3DF，selection.ts:351）。
  - 随机药水 MC 超时吃光 rollout 预算（DT1H，potion-mc.ts:219、rollout-live.ts:640）。
  - HP 护栏把药水持有价值当掉血、精英里否决异鱼之油（G3MU，combat-plan.ts:478-480）；boss 战护栏推翻 rollout best（W5PT，:514-521）；bigHit 绕开 guardKeepsSetup 换掉恶魔形态+（GTU2，:2047-2054、:1783）。
  - 与我一战！给敌人的力量不在「支配」比较里（9FVE，turn-solver.ts:2748）；能力药水在 boss 里按本回合估值恒为 0（9FVE，potion-mc.ts:49-57）。
  - 钢笔尖蓄满时手里每张攻击都算双倍（GSG0，card-model.ts:182-190）；魂缚锁住的牌被当成能量不够（4JGP，card-model.ts:595）；执迷在手时其余牌被当整回合不可打（HYQW，card-model.ts:685）；0 能量时能力药水给的牌打不出（A4PW，待核实）。
  - B3 打完 boss 仍模拟刚打死的 boss（5CWL 起多局，build-sim-facts.ts:387）；小样本差值被引用；低可信 boss 满时模拟只为写日志。
  - 钗等遗物在 rollout/整场模拟/boss 时钟里都没有（8D8D，rollout-live.ts:319-373）。
  - SL：「第 1 次不算已试」（Z4UK，explore.ts，cab3c3f 修）；单线重规划时换线失效、differs=false（PW7Y、9175，combat-plan.ts:3039-3051）。
- 设计问题（Dai）：战斗里的药水代价看不到大脑「留给 boss」的意图（本批 21 局）——只记代码事实，不写喝药规则。

### 测试
- v4-exp-10031032 55b6164：`npx tsc -p tsconfig.json --noEmit` 退出 0。
- vitest（`nice -n 19`，`--maxWorkers=4`）：
  - 第一次 135 个文件 1 个用例失败：tests/knowledge-text.test.ts 不许手册写「HP<85%」这类阈值（手册 :42 初稿），改成引用 rest-before-forced 后单独重跑该文件 9/9 通过。
  - 第二次（改了 ts-phases 的 A8 战绩后）2 个文件各 1 个用例超时（fix-queue-v4-shrink、rollout，负载约 20），单独重跑这 2 个文件 98/98 通过。
  - 最后一次完整跑：135 个文件 2069/2069 通过，退出 0。
- 没有改测试。

### 切片大小
- 样本：A8、A9 各 20 个状态 × 6 种界面，共 240 个；同一脚本（`sample_states.py`）、固定种子 20260929、**截止点仍取 8RB3**（为了和前两节同一批状态比较），抽出来和上一节的样本文件逐字节相同。
- 同一批状态分别用改前（ccfd4c7）和改后（55b6164）的 experience.json 跑 `tools/knowledge-slice.ts`。数字是中位 / 最大（字）：

| 界面 | A8 改前 | A8 改后 | A9 改前 | A9 改后 |
| --- | --- | --- | --- | --- |
| 战斗 | 4.43k / 6.76k | 4.49k / 6.97k | 4.72k / 7.34k | 4.83k / 7.58k |
| 奖励 | 5.91k / 7.55k | 6.12k / 7.58k | 5.69k / 7.55k | 5.80k / 7.58k |
| 地图 | 6.91k / 7.75k | 7.15k / 8.02k | 6.81k / 7.75k | 7.15k / 8.02k |
| 事件 | 4.80k / 7.52k | 4.91k / 7.76k | 4.83k / 6.95k | 4.89k / 7.19k |
| 火堆 | 6.29k / 6.89k | 6.50k / 7.13k | 4.16k / 6.89k | 4.16k / 7.12k |
| 商店 | 6.15k / 6.94k | 6.25k / 7.09k | 6.29k / 6.76k | 6.35k / 7.00k |

- 同一状态改后减改前的中位：A8 战斗 +0.06k、奖励 +0.12k、地图 +0.28k、事件 +0.03k、火堆 +0.20k、商店 +0.13k；A9 +0.09k、+0.12k、+0.28k、+0.03k、+0.02k、+0.12k。单个切片最多涨 0.63k（A8 Z3DF F39 地图），最大 8.02k（地图，改前 7.75k）。初稿是奖励中位 +1.04k、地图 +0.86k、最大 8.65k（新条目 deck-passive-engine 427 字进每个选牌切片），压缩两轮后如上。
- 地图涨得最多：route-hp-bands、route-no-chains、route-replan-on-drop、rest-before-forced、elite-need-one 的数字和反向改线句都在地图切片里；退役 4 条低置信条目后，空出的名额被更长的条目补上，也贡献了一部分。
- 条目数：active 197（上限 200）；置信度 高 144、中 51、低 2。
- Jev 每场战斗看到的敌人条目：三骑士战多 1 条（knights），其余遭遇不变，仍 ≤4 条。

### 需要 Dai 定
1. 女王被动件：deck-passive-engine 和攻略 :135 写了「被动伤害/回合开始格挡不打折」，但钗、水银沙漏等在 rollout、整场模拟、boss 时钟里都没建模（8D8D）；要不要建模，或给 Jev 加一条女王提示（27/30）。
2. 路线复核往险处改线（9175 F37、QWXK F25）：复核答案里没有按当前血量对照 route-hp-bands 的约束；要不要在路线复核题面里给「改线后下一个火堆前的场数和投影血量」。
3. 条目上限：active 197/200，下一次新增前还要合并（候选：n=2 的中置信卡牌/事件条目，如 card-gambit、card-armaments、event-symbiote、event-legends）。
4. 上一节留下的卡牌 TIER（SPITE 等）、帝王蟹 Jev 提示、知识数据文件刷新：截止点 A8 没变，本次没有新数据，仍待定。

### 开发会话审核（2026-10-03 11:21）
- 抽查：新增 knights、deck-passive-engine 都带数据和 run id；退役 4 条都是合并腾位（fysh-thin → fysh-beckon，distinguished-cape、lords-parasol → deck-bloat，unrest-site → event-curses），证据随条目并入。药水条目只改句内数字和非药水证据，没有新增或加强「什么时候喝/别喝」。
- 手册火堆一句（回血被上限截掉一半以上才锻造；boss/必经精英前按 rest-before-forced 回血）引的是条目，没有写 HP% 阈值（测试不允许）。
- tsc 0；vitest 2086 用例：负载约 25 时 5 个用例超时（batch-b、shrink、rollout-live、target-options），这 4 个文件单独重跑 94/94 通过。
- 合入：v4 d981568，v4-live 04e1708，V4.5 批次中途从下一局生效（eval 版本 V4.5.exp3）。
