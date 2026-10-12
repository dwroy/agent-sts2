# 静默猎手策略提案与逐项处置

记录时间：2026-10-07 23:52:16 +0800（已先执行date）。实际调度batch为20261007-234302-strategy-proposal，指定scratch为20261007-234303-strategy-proposal；无proposal_repair。只读取本batch派发的10个ID，逐项核角色、账本、Markdown和SHA256；原Markdown的10个指纹均一致，原文完整保存于本目录。

角色silent；六个指定来源局经runs.jsonl和每帧character_id/ascension核为SILENT A10。重新提取3432帧，CA5/61E2/5PM/DUZ四局与旧证据SHA256一致；核证文件见evidence-manifest.json、selected-state-facts.json、selected-decisions.json、verify.log。没有读其他角色知识，也没有用未派发提案扩展学习范围。

本次没有新增源码或知识规则：1项duplicate、9项waiting。授权Roy-2026-10-07-learning只提供修改权限，不提供游戏事实。当前基线为`ef8009e0fcd9c70874cca5b0407d08d820e4daf1`；开工干净，git merge --no-edit main无冲突。本次没有源码提交、没有live合入、没有eval版本，也没有标shipped。原合法选项、并列排名、药水/SL/终局价值与所有角色行为保持等价；怪物当前进阶数据库首样本口径、房间代价5样本门槛不变。

历史勘误：准确路径是state.agent_view.combat.draw/discard/exhaust。VLZ共729帧，其中631帧含draw聚合文本，4761条draw记录无dynamic_values/稳定实例，只有card_ids、keywords、line、mods。旧报告“没有战内牌堆”过宽；本次修正理由但保留原报告和此前CLI勘误，不再重复写历史复盘。已观察的升级数值和升级勒紧源码不被否认；不将尚未覆盖的完整神化传播冒称已实现。

拟合与切分：只作保存样本内的事实核对，不拟合护栏、药价、预算、SL、启动或目标权重。SL尝试按run分组，不扩独立样本；新局才可作时间后置验证。本批六个来源局均为既有发现样本，不能假称盲测。没有规则需回退；已有实现沿其原提交/发布回退方法，不回退并行知识刷新。

## 固定验证

existing.test.ts只读本目录重新提取的DUZ固定原帧，屏蔽全部知识文件读取，固定怪物移动表、种子/时钟；没有网络或LLM。测试3例通过：T5/T6临时尖啸恢复加独立成长、T4逐击荆棘、T6死亡轮毒与荆棘分账。所用五源文件与live `fd4c8e52341c31cad606c0a4b96a43663843e201`逐字节相同，三项相关源提交祖先校验exit0，见live-source-proof.json。后两例只帮助核结算边界，不给本批其他ID冒称完整实现。

没有新源码，所以撤源码失败/恢复通过不适用，未撤旧live祖先代码，未冒报新红绿；tsc和原tools/test-sandbox.sh本轮未运行。vitest仅上述固定3例exit0，不能称完整套件通过。没有源码提交或上线，因此不重复合入或制造版本；运维仍需依据真实旧祖先核登记duplicate。

## silent-proposal-89354805ee4d7e77

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, structure。
账本：silent-0237, silent-0238。经验：原提案未指定经验ID。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1；states275564/275565、275679/275680/275687/275688、275722/275731/275732。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-89354805ee4d7e77.original.md)。原summary：按静默已观测帧补齐神化在同线及后续抽牌中的升级传播，并区分持有、施放与模型覆盖；无整场转胜保证。

本次处置：**waiting**。神化手牌升级成立，state.agent_view.combat.draw/discard/exhaust亦有聚合牌堆文本；不能沿用“729帧均无牌堆”的旧理由。729帧中631帧含draw，4761条draw记录均只有card_ids/keywords/line/mods，没有逐卡dynamic_values或稳定实例。完整传播仍缺未知升级/附魔及同回合抽弃/后续牌的复合输入；当前applyUpgrade也未覆盖所需所有模型字段。升级勒紧子项已经上线，不能据此宣布整项神化完成。
反例/边界：F45持有而未施放，不能预支升级；F35神化后改变目标，37→52伤不能全部归因升级。
预期行为与下一次验证：补逐卡升级前后dynamic_values与附魔信息，冻结手牌、各堆和抽弃选择输入，验证F43同序51伤/13损、后续已覆盖牌升级、未知保留未知和场外deck不变。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-f2bfceddb1898dca

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, potion。
账本：silent-0106, silent-0019, silent-0201。经验：原提案未指定经验ID。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F43 T1—T5、F44休息、F45 T1/T4/T5；decisions269748/269754/269770。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-f2bfceddb1898dca.original.md)。原summary：核验三骑士全败候选的即时血价、击杀缺口与药水MC预算成熟度；先做同盘预算实验，缺对照时保留原护栏、留药与目标规则。

本次处置：**waiting**。成熟度展示子项已有实际live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5。调整随机药水MC先行、非药候选预算或药价仍缺同总预算、同盘、固定随机输入的受控结果与候选稳定性曲线；神化未完整传播，不能将其漏算归为预算收益。
反例/边界：F45 T4未实打高伤候选，全败并列不能证明多8伤优于少18血损；F17/F33首试胜，也不支持一律弃用模拟。
预期行为与下一次验证：保存完整调用及固定随机种子，在相同总预算比较当前算法和分阶段方案，记录耗时、样本、退化和模型覆盖，再评价目标/药价。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-283a164780d11e69

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。
账本：silent-0237, silent-0238。经验：silent-apotheosis-combat-upgrades。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1；与89354805ee4d7e77共享0237/0238，经验silent-apotheosis-combat-upgrades。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-283a164780d11e69.original.md)。原summary：神化已观察升级进入同方案与后续抽牌，保留未知边界，不定必打规则

本次处置：**waiting**。同一神化缺口的经验链接，不能把经验发布或升级勒紧子项当完整源码实现。聚合牌堆确实存在，缺口是未知升级/附魔及抽弃后的完整模型输入和字段传播；与89354805ee4d7e77合并后续实现，不重复造新提案。
反例/边界：持有神化不等于施放；四个赢战与F45死战起始资源、敌人与抽序不同。
预期行为与下一次验证：沿0237/0238专属实现链补相同固定夹具与逐卡动态值，保留两份来源任务/经验链接。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-ebbfe3b97548756d

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。
账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。经验：silent-strength-weak-observation, silent-footwork-block, silent-gorget-plating, silent-vajra-opening-strength, silent-sparkling-rouge-turn-three, silent-fasten-defend-extra-block, silent-piercing-wail-temporary-strength, silent-malaise-x-debuff, silent-accelerant-triggers, silent-noxious-fumes-growth, silent-deck-burst-observation, silent-three-knights-output-buffer-observation, silent-stone-humidifier-rest-growth, silent-rest-buffer-observation, silent-route-hp-observation。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F43 T1/T3/T4/T5、F44休息、F45 T3/T5；states275679/275680/275752/275754及全局资源链。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-ebbfe3b97548756d.original.md)。原summary：逐源验证当前攻防、毒触发与持续资源，不从持有或单轮减力预支整场收益

本次处置：**waiting**。14账本/15经验的复合请求中，升级勒紧有实际源码5e80e683daa08ae2569733b3b541cb523d7fe861，尖啸和成熟度亦有局部实现；神化完整传播和持续输出/资源共同冻结的调用仍不齐。逐项经验支持不能代替整个复合模型的验证，不能据局部提交关闭整项。
反例/边界：F45有两张雾但未建立，覆甲末轮已0；32血20挡对减力后59仍差7，不能把持有能力或开场覆甲预支为末轮收益。
预期行为与下一次验证：先沿神化专属链补完整输入，再用F43毒结算与F45四段减力/属性/资源固定组合验证；路线与休息只保留观察。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-e5b87be50f28f311

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, sl。
账本：silent-0079, silent-0021, silent-0125, silent-0018。经验：原提案未指定经验ID。
证据局号/层/回合：8JRE1C4H4Z2W A10 F33首试/第三试T2、第二试T5、末试T11，F17 T6；decisions270216/270282指纹完全相同，270264含护栏替换。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-e5b87be50f28f311.original.md)。原summary：静默A10同盘SL以12血换7伤重犯：补齐Jev原答、HP护栏、SL换线及重规划的候选代价与实际成长兑现审计；单局不足以改阈值，保留现行为并独立验证。

本次处置：**waiting**。本批确认同指纹原答/SL替换事实，但历史日志缺跨Jev原答、HP护栏、SL替换、实际前缀及重规划的统一候选标识和完整冻结调用。抽牌/选择重规划后原候选差额不能直接作为实际收益；缺这种全过程配对数据和另一完整线结果，不调整探索/成长规则。审计请求仍开放，不能凭已有文本理由声称完整审计已实现。
反例/边界：首/三试T2多7伤付12血且均T7判死；末试T2防御换线省3血少10伤虽延到T11仍败，不能认定所有保血或所有探索均错。
预期行为与下一次验证：新增对局保存五阶段统一候选ID、相同起点数值与实际前缀/重规划终止标记，按run分组复核；规则变更另需完整离线线路及后置同角色验证。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-49632bc4878fb597

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat。
账本：silent-0005, silent-0231。经验：silent-strength-weak-observation。
证据局号/层/回合：CA5KE8GFJ9X2 A10 F13 T1/T3/T5；states273268/273269确认2血10挡对14攻击、敌力8且有弱。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-49632bc4878fb597.original.md)。原summary：把当前属性、每击修正、弱与成长分项验证，不增加统一保血或输出权重。

本次处置：**waiting**。两次加压后的力量0→4→8、喷水11→15→19及弱后11/14可从原帧确认。该提案还覆盖敏捷与独立成长的组合验证；本局未取得步法，不能填入不存在的敏捷实测。现有分项接线不是该四路径共同冻结调用的实盘证明，本批没有补足此复合输入。
反例/边界：虚弱没有取消下次加压；计划中的步法未取得，不能用另一角色样本或预训练知识补敏捷。
预期行为与下一次验证：取得本角色同范围敏捷与敌成长/弱共存的逐牌原帧，并冻结实际调用，逐路径比较现场和推演，不拟合统一攻防权重。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-66532328a585941f

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。
账本：silent-0021, silent-0009。经验：silent-deck-burst-observation。
证据局号/层/回合：5PM6JAQG6FNQ A10 F39第二次T2及F33 T1/T2；states274382/274383附近的原动作保存于本目录逐局原帧。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-66532328a585941f.original.md)。原summary：持有/计划/已建立分账；如提构筑或启动权重，先做实盘兑现与受控整场验证。

本次处置：**waiting**。F39无毒目标上咕嘟冒泡消耗1能而不建立毒可核，F33建立成长并赢也可核；两战敌人、资源及启动条件不同。缺同起始血量/构筑/抽序下不同启动顺序的整场对照和收益函数，不拟合构筑或启动优先级，也不把持有/计划当已建立。
反例/边界：同局F33已有雾3/触媒1/群蛇4并赢，与F39死亡场不是受控替换。
预期行为与下一次验证：记录相同资源与抽序下实际建立时点、逐轮兑现和完整结局；缺反事实时只保留事实，不改变构筑权重。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-43a76a31ba7bdcfa

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, sl。
账本：silent-0030, silent-0027。经验：silent-lagavulin-siphon-poison-sl。
证据局号/层/回合：61E2QS63Y9WU A10 F17 T5吸取、T6双防御、T7胜；states273506/273507显示−2敏捷、两防御合6挡及17毒。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-43a76a31ba7bdcfa.original.md)。原summary：冻结吸取、负敏捷与毒的分项事实；任何SL范围或换线偏好需完整同盘验证。

本次处置：**waiting**。吸取、负敏捷和毒的分项实盘成立，但本局首试60血七轮胜。缺同起始血量/构筑/完整抽序下可救活的另一SL线路，不能用首试胜或其他不同局失败调整本条SL范围/换线偏好。
反例/边界：本局已首试获胜，不能把其分项机制支持误作必须读档的依据。
预期行为与下一次验证：保留分项事实；仅当本角色出现可配对的完整SL线路和已知抽序时重验范围或选择偏好。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-5264153a4a4b0e5c

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat。
账本：silent-0039, silent-0209。经验：silent-obscura-summon-growth。
证据局号/层/回合：61E2QS63Y9WU A10 F23 T4/T5；states273594/273595及后轮保存帧，T4幻象14→2仍有15攻击，本体毒后余41。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-5264153a4a4b0e5c.original.md)。原summary：复验已有召唤和各实体成长；保留所有目标选项，相同推演值并列，不强制首杀。

本次处置：**waiting**。本体线47伤/损15及两次航行增长可核，另一focus幻象39伤零损只是候选，未完整实打。旧召唤源码不足以证明A10召唤/航行/复活完整组合及目标排序收益；本批仍缺该组合完整冻结调用和另一目标序后续证据，保留所有目标与现有排名。
反例/边界：T4本体线输出兑现但幻象未退场；不能把未打的零损候选当整场胜线或强制首杀依据。
预期行为与下一次验证：补A10召唤/航行/复活前后逐实体状态及移动表，冻结完整前缀；目标排序改变另需受控后续结果。不承诺整场胜率，不强制未实打顺序。

未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。

## silent-proposal-e0275838dbb45d18

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat。
账本：silent-0046, silent-0128。经验：silent-piercing-wail-temporary-strength。
证据局号/层/回合：DUZUBAJ3A8GP A10 F30 T5/T6；逐局帧612—622（原states275013—275023），账本0046/0128。
旧规则/拟实现行为、原验证与回退：[保存的原提案](silent-proposal-e0275838dbb45d18.original.md)。原summary：逐击计算临时减力并在后轮恢复，独立成长照常；不改变保血/留牌阈值。

本次处置：**duplicate**。普通尖啸逐击临时−6、次轮恢复并继续独立增长已实现。本批重新提取原帧，与旧哈希一致；固定重放得到当轮14攻击、次轮力量4/攻击22。c7578f37608526591edd86041cee5a28c3894fee为实际live源码祖先，相关五个现用源文件与核验时live逐字节一致，不重复实现或发布。
反例/边界：减力只在本轮有效，T6恢复及成长后16挡不足22攻击；现有实现不证明整场能赢。
预期行为与下一次验证：保持现有临时减力/恢复/独立成长行为与全部合法选择；未知升级组合继续沿原模型。不承诺整场胜率，不强制未实打顺序。

实际live祖先源码commit：`c7578f37608526591edd86041cee5a28c3894fee`。
