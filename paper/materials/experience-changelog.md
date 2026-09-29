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
