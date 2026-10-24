## 流派剧本/rk去向表

| 本批局/单元 | 目标ID与本地候选 | 完整局/关键窗口 | 人类赢家可比偏离/限制 | 实际处置 |
|---|---|---|---|---|
| Q7SFDZSJLULD,EQLB6SK9W9H7 / 流派剧本 | silent-0352, silent-r2-card-noxious-fumes, silent-brain-crab-surviving-part-budget；`silent-pb-poison-realization-84a1cd43` | Q7 F1—17；EQL F1—33，构筑快照/死亡窗 | 未知：本批没有同流派、同版本/进阶的人类赢家可比组；具体子情境n=1，SL不增独立分母 | 复用既有ID的证据候选；正式修改待独立strategy-proposal |
| Q7SFDZSJLULD / 用药：rk+策略 | silent-0278, candidate:silent-rk-poison-potion-comparison；`silent-potion-poison-comparison-84a1cd43` | Q7 F17四试，T1/T10/T12 | 未知：本批没有同流派、同版本/进阶的人类赢家可比组；具体子情境n=1，SL不增独立分母 | 复用既有ID的证据候选；正式修改待独立strategy-proposal |
| Q7SFDZSJLULD,EQLB6SK9W9H7 / 休息/锻造与路线 | silent-0020, candidate:silent-strategy-rest-route-resource-chain；`silent-rest-route-resource-chain-84a1cd43` | Q7 F7/9/16；EQL F7/9/12/16/24/32，全部相邻胜战 | 未知：本批没有同流派、同版本/进阶的人类赢家可比组；具体子情境n=1，SL不增独立分母 | 复用既有ID的证据候选；正式修改待独立strategy-proposal |
| Q7SFDZSJLULD,EQLB6SK9W9H7 / 冷启动 | silent-0352, candidate:silent-strategy-coldstart-direction；`silent-coldstart-direction-84a1cd43` | 两局F1—6；前3战奖励与当时原计划 | 未知：本批没有同流派、同版本/进阶的人类赢家可比组；具体子情境n=1，SL不增独立分母 | 复用既有ID的证据候选；正式修改待独立strategy-proposal |
| EQLB6SK9W9H7 / 用药/商店：合法选择结构 | silent-0604, candidate:silent-strategy-shop-foul-choice；`silent-potion-shop-legal-choice-84a1cd43` | EQL F29—31；d513351/s532909→532910 | 未知：本批没有同流派、同版本/进阶的人类赢家可比组；具体子情境n=1，SL不增独立分母 | 新缺陷候选+独立strategy-proposal，formal_publication/consumer_readback均pending |

候选文件：`playbook-rk-candidates.json`；每项有来源角色/版本/进阶/局号/窗口、目标ID、observed偏离、限制、formal_publication=pending、consumer_readback=pending。完整局文件：`whole-run-summary.json`。上述均为本目录实际文件。

三输入仅有本批自有完整局；外部统计筛选和人类代表完整局未交付本批冻结件，不能称三输入剧本完成。“我们与人类赢家差在哪”未知。#54自有全库四表也未交付本批冻结件，整局JSON附本批两局的有限样本/代理四表；不能把该n=2与人类上传行或既有181局冻结分母相加。

旧244经验/#48不做全量改写；优先复用silent-0352、silent-0020、silent-0278、silent-brain-crab-surviving-part-budget与既有rk映射。保留旧ID、证据、反例、置信度及统计分母；rk毒雾v3是描述性信号，本批未重算或正式更新。候选/源码发布/消费者读回/自然收益分别验收，父要求仍开放。

记录时间：2026-10-24T10:50:06+08:00。来源批次：84a1cd43-6058-4bbc-a810-d63580820f7c。角色Silent，进阶A10。

## 排除规则、字段回执和版本

已核notes/roy-manual-play.json：排除交接整局Z2KBGZQMSRV5及手动窗口；两局都未命中排除ID、结束于该手动窗口之前，run-config均标自动开局。本任务不更改运行记录、STOP、游戏、在途任务或冻结输入。

先读README、最新STATE-2026-10-19、decision-log末尾、学习协议、账本README与代码提案协议。STATE的旧停机状态有后续decision-log恢复记录；本任务只沿现有离线授权，不自行操作运维。

runs.jsonl两局均为已结束SILENT，code=current；run-config精确源码戳均因git ENOBUFS缺失。准确局版本与release_id为未记录，不能以当前live倒填。当前只读源码参照02eb468f8728b47ccbc22f39f14e5b2db1580971；四个相关源文件SHA及窄diff见source-readback.json/source-reference.diff，不保存全仓副本。

已核#54实际交付receipt、manifest、boss-semantics的availability及safe-projection字段合同；只读元数据/投影，不读外部原库、代表轨迹或未授权自有局原始日志。具体六类字段：

| 字段 | 本批外部直接可用性 | 本批自有证据 |
|---|---|---|
| 开局祝福 | 未投影具体选项；遗物/牌取得节点仅代理 | 有直接states/decisions记录，逐项见整局摘要 |
| 商店购买 | bought_relics/gold_spent及牌增量可代理；购买卡牌/药水的直接选择记录不可用 | 有直接states/decisions记录，逐项见整局摘要 |
| 删牌 | cards_removed已投影，但具体选项/原由/价格与同一动作对应不可用；本批无冻结逐局读回 | 有直接states/decisions记录，逐项见整局摘要 |
| 事件选项 | 具体选项与理由未投影；取得/移除/变形仅结果代理 | 有直接states/decisions记录，逐项见整局摘要 |
| 药水获得/使用 | 获得、持有、丢弃、饮用及槽位均未投影，不可用 | 有直接states/decisions记录，逐项见整局摘要 |
| 休息/锻造 | upgraded_cards/healed已投影为结果代理；rest选项及入火资源无直接投影，不可用 | 有直接states/decisions记录，逐项见整局摘要 |

可投影的cards_removed/upgraded_cards/healed/gold_spent等不等于有直接选择、准确场景资源或原理由；无本批逐局冻结读回的代理不作人类支持。没有外部安全药量、金币阈值、入火HP或真Boss前快照。

## 本批自有四表（有限样本，与人类表并列保留缺口）

| 表 | Q7SFDZSJLULD（n=1） | EQLB6SK9W9H7（n=1） | 外部人类同表/可比组 |
|---|---|---|---|
| 流派 | F1遗物后偏P，毒方向过渡 | F1冲刺过渡，F3偏施毒触媒P | 本批未冻结/未知 |
| 组合 | F4头骨+施毒，F15蜃景，无触媒 | F3施毒+触媒，F6毒雾，F30才有蜃景签名；持续防御未完成 | 未知；不以终局聚类作能力 |
| 成型时间线 | 完整毒防从未齐备 | F30仅持牌签名齐备，F33首/末试T3尚未建立三能力 | 未知；不按终局倒填 |
| 克制/Boss | F17本体阶段首试判死，第四试死亡 | F17首试胜；F33首试判死，第四试死亡 | 未知；不能推普遍克制或因果 |

## 整局摘要与计划核对

### Q7SFDZSJLULD

F1祝福前uncommitted，选小型扭蛋后得到异蛇头骨才偏P；F4带毒刺击首次提供施毒，F5迷雾，F15蜃景，至死没有触媒。F6胜战47→11后撤双精英路线，只是资源路线转向。完整毒防/持续防御未观察齐备。

前三场当时的奖励分别为F2杂技（袖里乾坤/杂技/连续反弹/跳），F4带毒刺击（带毒刺击/预判/回响斩击/跳），F5迷雾（手上技法/无尽刀刃/迷雾/跳）。理由分别补跨流派过牌、头骨施毒协同、群体施毒/虚弱；都有尚待补防御的限制。F8跳终结技/背刺/匕首雨，F12买手上技法并删打击，F14买冲刺，F15拿蜃景。construction最后10项、omitted=0，不把短理由当已验证规则。

F16计划仍明确缺触媒、核心未成，终局目标F48→49没有兑现机会。F7休11→32、F9休12→33、F11事件33→26、F13生命26/70→32/76，F15胜后19、F16休至41；未锻造。F6的旧精英入口47/p75 37预测对应未执行旧线，不用于新线误差。

第一幕未过：F16/F17首入41/76、双毒；20张牌为STRIKE_SILENT×4、DEFEND_SILENT×5，NEUTRALIZE/SURVIVOR/ASCENDERS_BANE/ACROBATICS/SLICE/POISONED_STAB/HAZE/PRECISE_CUT/HAND_TRICK/DASH/MIRAGE各1，均未升级。终态0/76、空药、牌组不变；这是死亡终态，不是过幕状态。其余两幕及相邻末幕Boss未到达，快照未知。

F17四试：首/次试T10判死，第三试T12判死，末试T10死亡。末试15HP+13挡对28压力炮，敌本体终态113HP，非自爆死亡。首试T10毒4→11→18当步敌132不变；末试饮用时敌137，之后打击和毒结算仍未清本体。首试原始50样本0胜、文本校准49%及T15估计分别保留，实盘T10截断不代表精确时钟误差或绝对无胜线。

### EQLB6SK9W9H7

F1失物盒、额外奖励选冲刺作过渡；F2毒药仍偏向而不锁，F3触媒后偏P，F4蛇咬、F5涂毒、F6买毒雾。F17爆发、F22删受伤并买生产制造/偏折、F23计算下注、F25杀灭、F27/28后空翻/后空翻+、F30蜃景、F31逃脱计划。未转刀/弃牌主轴。F3有施毒/触媒、F6有续毒、F30才有旧毒防持牌签名；完整可持续攻防仍未成。F19咕嘟冒泡的状态删/加来源未知，不当真实主动删除重拿。

F11/F20/F21跳过奖励的原由是已有毒输出、不补主要防御/抽牌；各候选、价格、资源和原话在整局JSON。六次HEAL为F7 17→38、F9 38→59、F12 40→61、F16 43→64、F24 33→54、F32 12→33，零锻造。F19奖励35→55、F25事件54→70另记，未充战斗回血或休息。

第一幕首入64/70、空药、22张，F17首试8轮胜后30/70，奖励前空药；奖励爆发和肌肉药后实际幕末23张、30/70、槽0肌肉。23张牌为STRIKE_SILENT×5、DEFEND_SILENT×5，NEUTRALIZE/SURVIVOR/ASCENDERS_BANE/DASH/DEADLY_POISON/ACCELERANT/SNAKEBITE/ENVENOM/NOXIOUS_FUMES/BUBBLE_BUBBLE/PIERCING_WAIL/INJURY/BURST各1；毒雾有附魔，未升级不等无附魔。F18入口62/70与幕末30分列。

第二幕失败：F32/F33入33/70、槽0赌徒/槽1易伤，31张为上述23张删INJURY，加CLOAK_AND_DAGGER/PRODUCTION/DEFLECT/CALCULATED_GAMBLE/EXTERMINATE/BACKFLIP/BACKFLIP+/MIRAGE/ESCAPE_PLAN各1。F33终态0/70、空药、同牌组。第三幕与F48→49未到达，不能使用末态填其资源。

F17实际涂毒T1、触媒T2、毒雾T4建立；T7后本体退转自爆占位，T8 52HP+13挡对35自爆，奖励剩30，净失34。F33首/末试T1—T3没有建立上述三能力；首试T4 26HP+12挡对38而SL，末试同样血挡实际归零，终态碾碎爪118/火箭164仍活。第二试建立涂毒仍失败。本批未进入单侧退场阶段，不充残敌机制新验证。

F29弃毒取药的商店换金计划没有实际完成：F30饮一污浊自伤12，F31另一瓶被代码预丢且89金不变，之后买逃脱36/易伤49，余4。未执行兑换，金额和能否改变购物、Boss结果未知。F30T1一次护栏预测损12→0；T3仍饮同药，不将预测12当整场实省12。

末试T4 Jev选含触媒plan5，SL explore改另一线，计算下注后再规划；13挡/剩1预测与实际12挡/归零不是同线误差。单动作completed或pending不代表完整候选执行。

## 全部战斗资源表

净HP变化包含自伤/回血，不等于敌方总伤害。前三SL退出帧缺失保留末见值；恢复不是回血，不增独立局。首帧均T1。槽位缩写保留原ID。

### Q7SFDZSJLULD

| 序/层/遭遇 | HP入口→出口或末见/maxHP | 药槽入口→末态 | 结局/退出帧 |
|---|---|---|---|
| 1/F2 SLUDGE_SPINNER | 56→55/70 | []→[] | 奖励帧胜出；observed_exit |
| 2/F4 CORPSE_SLUG | 55→55/70 | [[0, 'DEXTERITY_POTION']]→[] | 奖励帧胜出；observed_exit |
| 3/F5 SEAPUNK | 55→47/70 | [[0, 'POISON_POTION']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 4/F6 CORPSE_SLUG | 47→11/70 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[[0, 'POISON_POTION'], [1, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 5/F8 TWO_TAILED_RAT | 32→12/70 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[[0, 'POISON_POTION'], [1, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 6/F15 CALCIFIED_CULTIST,DAMP_CULTIST | 32→19/76 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[[0, 'POISON_POTION'], [1, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 7/F17 WATERFALL_GIANT | 41→15/76 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[] | 首三试判死重载，末试死亡；restart_observed |
| 8/F17 WATERFALL_GIANT | 41→15/76 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[] | 首三试判死重载，末试死亡；restart_observed |
| 9/F17 WATERFALL_GIANT | 41→9/76 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[] | 首三试判死重载，末试死亡；restart_observed |
| 10/F17 WATERFALL_GIANT | 41→0/76 | [[0, 'POISON_POTION'], [1, 'POISON_POTION']]→[] | 首三试判死重载，末试死亡；observed_exit |

自然获得/购买3瓶；取得时点/槽位、饮用、丢弃动作及各次SL在whole-run-summary.json与Q7SFDZSJLULD-resources.json。药水自然获得与重载恢复分列。

### EQLB6SK9W9H7

| 序/层/遭遇 | HP入口→出口或末见/maxHP | 药槽入口→末态 | 结局/退出帧 |
|---|---|---|---|
| 1/F2 TOADPOLE | 56→49/70 | [[0, 'SWIFT_POTION']]→[] | 奖励帧胜出；observed_exit |
| 2/F3 SEAPUNK | 49→49/70 | [[0, 'SWIFT_POTION']]→[] | 奖励帧胜出；observed_exit |
| 3/F4 SLUDGE_SPINNER | 49→46/70 | []→[] | 奖励帧胜出；observed_exit |
| 4/F5 CORPSE_SLUG | 46→17/70 | []→[] | 奖励帧胜出；observed_exit |
| 5/F11 PHANTASMAL_GARDENER | 59→40/70 | [[0, 'WEAK_POTION']]→[] | 奖励帧胜出；observed_exit |
| 6/F13 PUNCH_CONSTRUCT | 61→59/70 | []→[] | 奖励帧胜出；observed_exit |
| 7/F14 TWO_TAILED_RAT | 59→43/70 | [[0, 'BLOCK_POTION']]→[] | 奖励帧胜出；observed_exit |
| 8/F17 WATERFALL_GIANT | 64→30/70 | []→[] | 奖励帧胜出；observed_exit |
| 9/F19 THIEVING_HOPPER | 62→35/70 | [[0, 'STRENGTH_POTION']]→[] | 奖励帧胜出；observed_exit |
| 10/F20 TUNNELER | 55→48/70 | [[0, 'POISON_POTION']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 11/F21 THE_OBSCURA,PARAFRIGHT | 48→35/70 | [[0, 'POISON_POTION'], [1, 'FYSH_OIL']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 12/F23 OVICOPTER,TOUGH_EGG | 35→33/70 | [[0, 'POISON_POTION'], [1, 'FIRE_POTION']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 13/F27 BOWLBUG_ROCK,BOWLBUG_SILK,BOWLBUG_NECTAR | 70→50/70 | [[0, 'POISON_POTION']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 14/F28 LOUSE_PROGENITOR | 50→36/70 | [[0, 'POISON_POTION']]→[[0, 'POISON_POTION']] | 奖励帧胜出；observed_exit |
| 15/F30 HUNTER_KILLER | 36→12/70 | [[0, 'FOUL_POTION'], [1, 'FOUL_POTION']]→[[1, 'FOUL_POTION']] | 奖励帧胜出；observed_exit |
| 16/F33 CRUSHER,ROCKET | 33→26/70 | [[0, 'GAMBLERS_BREW'], [1, 'VULNERABLE_POTION']]→[] | 前三试判死重载，末试死亡；restart_observed |
| 17/F33 CRUSHER,ROCKET | 33→23/70 | [[0, 'GAMBLERS_BREW'], [1, 'VULNERABLE_POTION']]→[] | 前三试判死重载，末试死亡；restart_observed |
| 18/F33 CRUSHER,ROCKET | 33→26/70 | [[0, 'GAMBLERS_BREW'], [1, 'VULNERABLE_POTION']]→[] | 前三试判死重载，末试死亡；restart_observed |
| 19/F33 CRUSHER,ROCKET | 33→0/70 | [[0, 'GAMBLERS_BREW'], [1, 'VULNERABLE_POTION']]→[] | 前三试判死重载，末试死亡；observed_exit |

自然获得/购买12瓶；取得时点/槽位、饮用、丢弃动作及各次SL在whole-run-summary.json与EQLB6SK9W9H7-resources.json。药水自然获得与重载恢复分列。

## 关键战斗逐回合窗口

下面为真实轮首和末就绪状态及后继的净HP变化；敌血池变化不是完整毛伤害，回血/新生体/退场/毒/荆棘来源不能混充卡牌伤害。每轮需要处理的当前活敌HP在“轮首敌HP”列；占位自爆体不用作需伤。精确毛伤害或同ID身体身份未核时保留未知，完整可见下降下界/缺口在resource_chain.enemy_hp_audit，不补0。

### Q7SFDZSJLULD F17 资源窗口7

| T | 玩家HP轮首→响应后 | 末就绪挡 | 轮首敌HP/当前需处理资源 | 末就绪敌HP |
|---|---|---|---|---|
| 1 | 41→41 | 0 | [('WATERFALL_GIANT', 250)] | [('WATERFALL_GIANT', 247)] |
| 2 | 41→41 | 13 | [('WATERFALL_GIANT', 242)] | [('WATERFALL_GIANT', 230)] |
| 3 | 41→40 | 10 | [('WATERFALL_GIANT', 226)] | [('WATERFALL_GIANT', 209)] |
| 4 | 40→40 | 0 | [('WATERFALL_GIANT', 202)] | [('WATERFALL_GIANT', 190)] |
| 5 | 40→35 | 18 | [('WATERFALL_GIANT', 199)] | [('WATERFALL_GIANT', 199)] |
| 6 | 35→29 | 4 | [('WATERFALL_GIANT', 194)] | [('WATERFALL_GIANT', 172)] |
| 7 | 29→23 | 10 | [('WATERFALL_GIANT', 168)] | [('WATERFALL_GIANT', 152)] |
| 8 | 23→15 | 0 | [('WATERFALL_GIANT', 145)] | [('WATERFALL_GIANT', 128)] |
| 9 | 15→15 | 0 | [('WATERFALL_GIANT', 122)] | [('WATERFALL_GIANT', 122)] |
| 10 | 15→未知/SL前截断 | 13 | [('WATERFALL_GIANT', 132)] | [('WATERFALL_GIANT', 132)] |

### Q7SFDZSJLULD F17 资源窗口10

| T | 玩家HP轮首→响应后 | 末就绪挡 | 轮首敌HP/当前需处理资源 | 末就绪敌HP |
|---|---|---|---|---|
| 1 | 41→41 | 0 | [('WATERFALL_GIANT', 250)] | [('WATERFALL_GIANT', 247)] |
| 2 | 41→41 | 13 | [('WATERFALL_GIANT', 242)] | [('WATERFALL_GIANT', 230)] |
| 3 | 41→40 | 10 | [('WATERFALL_GIANT', 226)] | [('WATERFALL_GIANT', 210)] |
| 4 | 40→40 | 0 | [('WATERFALL_GIANT', 203)] | [('WATERFALL_GIANT', 191)] |
| 5 | 40→35 | 18 | [('WATERFALL_GIANT', 200)] | [('WATERFALL_GIANT', 200)] |
| 6 | 35→29 | 4 | [('WATERFALL_GIANT', 195)] | [('WATERFALL_GIANT', 180)] |
| 7 | 29→23 | 10 | [('WATERFALL_GIANT', 176)] | [('WATERFALL_GIANT', 160)] |
| 8 | 23→15 | 0 | [('WATERFALL_GIANT', 153)] | [('WATERFALL_GIANT', 133)] |
| 9 | 15→15 | 0 | [('WATERFALL_GIANT', 127)] | [('WATERFALL_GIANT', 127)] |
| 10 | 15→0 | 13 | [('WATERFALL_GIANT', 137)] | [('WATERFALL_GIANT', 131)] |

### EQLB6SK9W9H7 F17 资源窗口8

| T | 玩家HP轮首→响应后 | 末就绪挡 | 轮首敌HP/当前需处理资源 | 末就绪敌HP |
|---|---|---|---|---|
| 1 | 64→64 | 0 | [('WATERFALL_GIANT', 250)] | [('WATERFALL_GIANT', 241)] |
| 2 | 64→56 | 8 | [('WATERFALL_GIANT', 234)] | [('WATERFALL_GIANT', 234)] |
| 3 | 56→56 | 15 | [('WATERFALL_GIANT', 205)] | [('WATERFALL_GIANT', 198)] |
| 4 | 56→56 | 0 | [('WATERFALL_GIANT', 171)] | [('WATERFALL_GIANT', 171)] |
| 5 | 56→56 | 18 | [('WATERFALL_GIANT', 149)] | [('WATERFALL_GIANT', 146)] |
| 6 | 56→52 | 10 | [('WATERFALL_GIANT', 107)] | [('WATERFALL_GIANT', 101)] |
| 7 | 52→52 | 0 | [('WATERFALL_GIANT', 60)] | [('WATERFALL_GIANT', 54)] |
| 8 | 52→30 | 13 | 自爆占位体；需伤不适用 | 自爆占位体；不计敌方回复 |

### EQLB6SK9W9H7 F33 资源窗口16

| T | 玩家HP轮首→响应后 | 末就绪挡 | 轮首敌HP/当前需处理资源 | 末就绪敌HP |
|---|---|---|---|---|
| 1 | 33→33 | 10 | [('CRUSHER', 219), ('ROCKET', 209)] | [('CRUSHER', 178), ('ROCKET', 209)] |
| 2 | 33→31 | 19 | [('CRUSHER', 168), ('ROCKET', 206)] | [('CRUSHER', 155), ('ROCKET', 203)] |
| 3 | 31→26 | 9 | [('CRUSHER', 146), ('ROCKET', 200)] | [('CRUSHER', 133), ('ROCKET', 200)] |
| 4 | 26→未知/SL前截断 | 12 | [('CRUSHER', 108), ('ROCKET', 200)] | [('CRUSHER', 108), ('ROCKET', 194)] |

### EQLB6SK9W9H7 F33 资源窗口19

| T | 玩家HP轮首→响应后 | 末就绪挡 | 轮首敌HP/当前需处理资源 | 末就绪敌HP |
|---|---|---|---|---|
| 1 | 33→33 | 10 | [('CRUSHER', 219), ('ROCKET', 209)] | [('CRUSHER', 178), ('ROCKET', 209)] |
| 2 | 33→31 | 19 | [('CRUSHER', 168), ('ROCKET', 206)] | [('CRUSHER', 155), ('ROCKET', 203)] |
| 3 | 31→26 | 9 | [('CRUSHER', 146), ('ROCKET', 200)] | [('CRUSHER', 133), ('ROCKET', 200)] |
| 4 | 26→0 | 12 | [('CRUSHER', 122), ('ROCKET', 186)] | [('CRUSHER', 122), ('ROCKET', 180)] |

## Jev/V6原始证据覆盖与统计

| 流 | 冻结bytes | SHA256 | 本批匹配 |
|---|---|---|---|
| v6-build | 64753212 | 1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3 | {'Q7SFDZSJLULD': 0, 'EQLB6SK9W9H7': 0} |
| jev-prompts | 3241467184 | 7138c0666b0abd24e15bb3d26391de3852c04428b43d8b1a296e928bd4ee6467 | {'Q7SFDZSJLULD': 160, 'EQLB6SK9W9H7': 134} |
| decisions | 4644901516 | d6b46b9b2a30f6a21390846d316bf0f040dcbc9ee0a08de892a324d9f7eb4ccd | {'Q7SFDZSJLULD': 395, 'EQLB6SK9W9H7': 618} |
| run-config | 3332674 | 771dc8eb013453c7849fef0757d0ae4544ccbb4554b22e4418824d4e7f9064cb | {'Q7SFDZSJLULD': 2, 'EQLB6SK9W9H7': 2} |

manifest已实际读取。v6-build两局均no_match；配置on不等于本流有entries/jev_answer/fallback/unknown，四项无法核定，不填写0消费或0收益。历史坏JSON与未知身份统计是全源信息，不归因给这两局。每个本批Jev行都有显式run_id，并与原始decisions的精确decision_id核对；不用正文提及、时间邻近或相似question_id认局。

Jev原流Q7=160行/159可用决策，EQL=134/133；各一条human-pace budget exhausted错误，均有code-fallback及实际动作。Q7错误精确ID b4fb1a1a-c436-40ea-826c-74d151207fb6（F2T4，end_turn completed）；EQL错误777555d6-6c84-45a5-a88c-9ef1455b47e0（第2试F33T1，打击指碾碎爪 completed）。错误不等0次请求，也不等整个回合未执行。

完整核读5道request.state/questions及answers/error，逐一关联chosen/result/gate_reject/selection_dispatch与后继：
- `d96fa2f2-f3d2-4605-9583-9ca820e73404`
- `93a06b9a-b866-4812-95bf-beffe2737042`
- `bcbb6c32-f26d-4bfd-9c0e-111f01ea36d3`
- `777555d6-6c84-45a5-a88c-9ef1455b47e0`
- `11f02f33-c9b5-46b6-87bc-ac3665962457`

Q7完整2/160，其余158行；EQL完整3/134，其余131行保留机械身份/答案存在/错误/统计索引，未逐题完整通读。未读原因：本批以整局、关键药水/预算错误/最终换线问题为有限原文核回窗口，其他题没有形成逐题牌线优劣结论；不能把索引、最后五条或SHA机械校验当通读。完整对象在read-question-windows.json，全部覆盖状态逐项在question-coverage.json。

药水、休息、死亡和关键失血状态另外按action-resource-audit.json与critical-turn-audit.json的原始offset核回。EQL赌徒回执pending后进入弃牌选择且槽清空；末试T4选线被SL覆盖并抽牌重问，whole_plan_executed=null。缺失字段保留null，不推执行成功。

## 数字、账本与实现交接

| 局 | Jev低信心<.35 | 有可比较rollout最佳的回答 | 自主code动作/战斗回合 | 护栏 | token口径 |
|---|---|---|---|---|
| Q7SFDZSJLULD | 23 | 112/119；另7不可比较 | 81/16，Jev续步排除；fallback另列 | 0 | runs/Jev合计1694032；脑输入663690/输出16289/缓存428416 |
| EQLB6SK9W9H7 | 11 | 112/112；另11不可比较 | 260/72，Jev续步排除；fallback另列 | 1 | runs/Jev合计1426575；脑输入1428499/输出33342/缓存1262592 |

上述是模型选中率与按原始动作分类后的计数，不是整线执行比例或胜率。大脑实际Codex，旧ds/deepseek字段不改历史。自主回合按(层、试次、回合)去重，Q7额外fallback在F2T4，与16个自主code回合分列；EQL fallback所在回合已在72中。

学习账本：Q7更新silent-0020/0278/0352；EQL新增silent-0604，更新silent-0017/0020/0046/0352/0570。全为support，无已证可避免旧错repeat。旧条目的claim/status/prior/first_run/版本、置信度与固定分母未改变。新0604为observed，prior=unknown；旧静默复盘已有购物前弃污浊描述，不能把所有弃药现象说成首次，首次是本批完整核实合法选择损失并定位该分支。

新纯bug：EQL F31 shop.ts:48—65的开店前自动丢弃；本批notes/fix-queue无相关已登记项。证据d513351/s532909→532910、账本silent-0604、proposal-shop-foul.md。use合法与文本不证明实际兑换会成功；缺Gold值、兑换回执、自然收益。只读当前源码与日志路径吻合，但准确当局源码提交未知。

| CLI提案 | 账本 | 实现任务/范围 | 验证缺口与处置 |
|---|---|---|---|
| silent-proposal-3477e3a0ce08a7c6 | silent-0604 | strategy-proposal；potion/structure，见proposal-shop-foul.md | 恢复合法选择比较，未知金币不填；固定前帧验证，后续单动作与资源读回；pending，未实现 |
| silent-proposal-25538ce7891b7d15 | silent-0278/0352 | strategy-proposal；combat/potion，见proposal.md | 条件剂量模型/同题对照；缺首轮/其他修饰组合与早喝受控后继时保留行为waiting；pending，未实现 |

没有提交、推送、play、游戏操作、生产代码或正式策略/rk修改。代码提案CLI及账本是本任务授权的专用记录例外。临时抽取/报告脚本只在本批目录；没有以记录任务为由跑全运行时测试。后续独立实现沿原测试/发布流程，不冒称implemented或shipped。

最终机械核验：2520个独立原字节引用的offset/bytes/SHA重读通过；关键进场/末血挡/来袭、8次+7毒、商店89→89已核；两局lessons标题各1。ledger.py find已分别读回，ledger.py check退出0。验证原件verification.json、两局lesson-readback.md。SHA通过是机械溯源，不代替完整科学覆盖。

未记录/未知：准确局源码SHA与release_id；完整逐来源毛伤/回复、同线全战时钟/估值比；未到达幕末与末幕连Boss；商人兑换金额/回执；早喝/留药、换路、删牌/购物与休息/锻造的受控整战收益；本批外部同流派人类可比组及完整三输入；未逐题通读的Jev问题。缺失不补0、不补最终牌组为中途状态。

最终机器回报见result.json。

## 机器回报

```json
{
  "task": "postmortem",
  "appended": [
    "Q7SFDZSJLULD",
    "EQLB6SK9W9H7"
  ],
  "skipped": [],
  "bugs": [
    {
      "run": "EQLB6SK9W9H7",
      "where": "agent/src/hand/screens/shop.ts:48",
      "what": "开店前按列表自动丢弃仍合法可用的污浊药水，移除兑换/保留选择；实际金币89→89，兑换金额与胜负收益未知",
      "new": true
    }
  ],
  "ledger": {
    "added": [
      "silent-0604"
    ],
    "updated": [
      "silent-0017",
      "silent-0020",
      "silent-0046",
      "silent-0278",
      "silent-0352",
      "silent-0570"
    ],
    "repeats": [],
    "check": 0
  },
  "code_proposals": [
    "silent-proposal-3477e3a0ce08a7c6",
    "silent-proposal-25538ce7891b7d15"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "structure"
  ],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261024-101320-cf99629d-d335-4914-8d46-c886cdcfa3fa-postmortem/report.md"
}
```
