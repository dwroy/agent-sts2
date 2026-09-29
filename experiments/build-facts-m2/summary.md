# V4 M2 构筑事实回放：旧题面 vs 新题面（DeepSeek，KNOWLEDGE_PREFIX=full）

由 compare.py 从 old/、new/ 的 results.jsonl 生成（原始文件不提交）。只描述，不评判。

| 组 | n | 合法（首答） | 合法（含补问） | 出错 | 中位耗时 s | 平均输入 token | 平均输出 token |
|---|---|---|---|---|---|---|---|
| old | 20 | 20/20 | 20/20 | 0 | 13.1 | 126951 | 4038 |
| new | 20 | 18/20 | 18/20 | 1 | 10.2 | 121294 | 5064 |

构筑决定一致：11/18（两边答案都合法的题；商店按所买物品的集合比，选项带牌的连牌一起比）。
同一题里附带的路线（保留/换路）答得不同：0 题（无）；路线块是 v4-brain 的，未改。

按题型：event/plan 3/4；rest/plan 3/4；reward/card 3/4；selection/enchant 1/1；selection/remove 1/1；selection/upgrade 0/1；shop/plan 0/3

## 不一致的题

| id | 题型 | 旧题面的选择 | 旧理由 | 新题面的选择 | 新理由 |
|---|---|---|---|---|---|
| q010 | reward/card | card0 (劫掠) | Deck has zero draw; Pillage adds 6 damage plus cycling to find Feed/Bash+/AoE each fight, and 19 cards need consistency more than a one-shot +2 energy. | card1 (愤怒) | 0-cost 6 dmg every turn helps close the 27/turn Kaiser Crab gap; no Strength offered and block already covered. |
| q035 | event/plan | o1:c14 (上勾拳+ / 进入你的洞 / enchant 上勾拳+) | Free enchant beats adding a 凡庸 curse (extra play-cap with boss's Sloth); Uppercut+ is our top card under a 3-play limit. | o1:c11 (飞剑回旋镖 / 进入你的洞 / enchant 飞剑回旋镖) | 拒绝诅咒：凡庸会限制每回合出牌张数、拖垮薪火之源回合，且150金删不掉它。免费附魔飞剑回旋镖三段命中，任何增益收益最大，还吃手套力量成长。 |
| q044 | rest/plan | o1:c11 (地狱之刃 / 锻造 / upgrade 地狱之刃) | Two rests remain before the boss, so 26 HP heal is largely wasted; 0-cost 地狱之刃 gives free attacks all run and helps strip Slippery 9. | o0 (休息) | 66% HP, boss 6 floors off; two rests remain and the shop comes first, so heal now and smith at F13 with full shop information. |
| q050 | shop/plan | 耸肩无视 | Only affordable positive pick: Shrug It Off (8 block + draw) cycles toward Fight Me+/Setup Strike+ for the Sandpit race and boss survival. Removal (120g) and Flame Barrier combo (67g) exceed 55g. | 飞剑回旋镖 | Insatiable is a damage race: gap 12/turn and Sandpit kills ~T7; a second Sword Boomerang scales with Fight Me+ strength and lasts all run. Block target already met; with 55g nothing else better is affordable. |
| q052 | shop/plan | 鲜血药水, remove:c0 | Empty potion slots at boss is a known warning: Blood potion (~17 HP) is the top potion value. Removal of a Strike is code rank #1, huge long-term, and this is Act 1's last shop. Total 148 ≤ 165. | 火焰药水, remove:c0 | Buy a potion first: potion slots empty and boss is 5 floors away; Fire Potion is 20 burst, usable even on a Ringing turn. Then delete a Strike, the deck's worst card, in this last act-1 shop. |
| q054 | shop/plan | remove:c0 | Remove a Strike: code's #1 value and run plan says delete Strikes; this is the act's only shop (next removal 150+). Remaining fights can drop potions; potion+card combo costs 102 and skips thinning. | 力量药水, 血墙 | 力量药水留给异鱼：本牌组没有任何力量来源，多段攻击吃满收益，且带药打异鱼 13/13 赢。血墙补第 1 张非基础格挡（16 格挡/2 费），A8 一幕拿了 76% 过 boss；金币不够同时删牌，打击留给二幕商店再删。 |
| q058 | shop/plan | remove:c0, 上勾拳, 放血 | Cut a Strike (first removal 100) plus Uppercut (78: 13 dmg, weak, vulnerable — best vs VanTom) and cheap Bloodletting (38: 0-cost energy). Total 216 ≤ 242 gold; both boss potions stay. | 不合法：["remove:STRIKE_IRONCLAD", "buy_card2", "buy_card1"] | step "remove:STRIKE_IRONCLAD" is not a valid step (valid: buy_relic0, buy_relic1, buy_relic2, buy_card0, buy_card1, buy_card2, buy_card3, buy_card4, buy_card5,  |
| q071 | selection/upgrade | card9 (痛击) | Bash+ = 10 dmg + 3 Vulnerable, our only reliable debuff; boosts the forced elite now and Vantom later (Slippery strips aside, vulnerable multiplies all multi-hit turns). | card14 (燃烧) | Upgrade 燃烧: permanent +1 Strength (2→3) scales every fight, matches run plan's first-smith priority; other options give only +1-2 per card. |
| q077 | selection/add | card7 (突破) | 突破: 1费9伤AOE，code_value 最高(76)、补AOE缺口，第二张再拿飞剑回旋镖。 | - | DeepSeek chose unknown option "card1,card0" |

## 全部 20 题

| id | 题型 | 层 | 旧 | 新 | 一致 |
|---|---|---|---|---|---|
| q010 | reward/card | 19 | card0 (劫掠) | card1 (愤怒) | 否 |
| q011 | reward/card | 23 | card0 (飞剑回旋镖+) | card0 (飞剑回旋镖+) | 是 |
| q017 | reward/card | 2 | card2 (邪眼) | card2 (邪眼) | 是 |
| q018 | reward/card | 20 | card1 (拆卸) | card1 (拆卸) | 是 |
| q029 | event/plan | 12 | o0 (交换金币) | o0 (交换金币) | 是 |
| q030 | event/plan | 3 | o0:c9 (痛击 / 吃下 / upgrade 痛击) | o0:c9 (痛击 / 吃下 / upgrade 痛击) | 是 |
| q031 | event/plan | 14 | o0 (装瓶) | o0 (装瓶) | 是 |
| q035 | event/plan | 20 | o1:c14 (上勾拳+ / 进入你的洞 / enchant 上勾拳+) | o1:c11 (飞剑回旋镖 / 进入你的洞 / enchant 飞剑回旋镖) | 否 |
| q042 | rest/plan | 11 | o0 (休息) | o0 (休息) | 是 |
| q044 | rest/plan | 11 | o1:c11 (地狱之刃 / 锻造 / upgrade 地狱之刃) | o0 (休息) | 否 |
| q045 | rest/plan | 16 | o0 (休息) | o0 (休息) | 是 |
| q049 | rest/plan | 16 | o1:c8 (痛击 / 锻造 / upgrade 痛击) | o1:c8 (痛击 / 锻造 / upgrade 痛击) | 是 |
| q050 | shop/plan | 31 | 耸肩无视 | 飞剑回旋镖 | 否 |
| q052 | shop/plan | 12 | 鲜血药水, remove:c0 | 火焰药水, remove:c0 | 否 |
| q054 | shop/plan | 4 | remove:c0 | 力量药水, 血墙 | 否 |
| q058 | shop/plan | 8 | remove:c0, 上勾拳, 放血 | 不合法：["remove:STRIKE_IRONCLAD", "buy_card2", "buy_card1"] | 否 |
| q071 | selection/upgrade | 7 | card9 (痛击) | card14 (燃烧) | 否 |
| q073 | selection/remove | 15 | card0 (打击) | card0 (打击) | 是 |
| q077 | selection/add | 11 | card7 (突破) | - | 否 |
| q079 | selection/enchant | 22 | card7 (双重打击) | card7 (双重打击) | 是 |
