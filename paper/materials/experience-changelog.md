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
