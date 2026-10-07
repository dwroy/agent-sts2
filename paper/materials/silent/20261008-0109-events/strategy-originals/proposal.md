# 本批静默猎手代码提案逐项核验

任务：20261008-004303-strategy-proposal；调度batch：20261008-004302-strategy-proposal；来源六局均已由runs.jsonl核实SILENT A10。
合入main后的base：`c2930ff9130766ab242233853fd0c2a1eff934f0`。核验live：`0d6c1a82ac0b7ec2b5134e2f650070bdeba7e56a`。merge配置live；本次无新增源码，不执行上线流程。

本批十份保存的原提案SHA256全部与专用队列一致；只消费本batch的proposal_ids，无proposal_repair。原提案分别复制为本目录`<id>.original.md`。账本、原经验和历史复盘只核对及补本次链接，不重写复盘。

本次原始日志重新抽取3432状态帧、3306决策；六局逐字节SHA256与前次保存证据一致，未发现本批来源新增帧。VLZ抽牌堆聚合信息存在，不能写成“没有牌堆”；缺逐卡动态值/实例和未知升级交互的完整输入。核验脚本及evidence-verification.json保存确定性原帧断言，属于证据校验，不是生产tsc/vitest或源码红绿测试。

无新策略权重拟合；六局按run_id计样本，重打不扩独立样本数。F35/F43等帧已用于发现和复核，不冒称盲测。若以后拟合阈值或改变目标/SL规则，须按结束时间另取后续独立静默局验证。未知或未观察进阶保持现状；本次所有角色代码等价。

## silent-proposal-89354805ee4d7e77：神化升级传播

来源任务：postmortem；实现任务：strategy-proposal。领域：combat, structure。
既有学习账本：silent-0237, silent-0238；原经验：原提案未指定。
证据局号/层/回合：VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1；states275564/275565、275679/275680/275687/275688、275722/275731/275732；decisions269706/269707/269748。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-89354805ee4d7e77.original.md](silent-proposal-89354805ee4d7e77.original.md)。

本次处置：waiting。已核7→5能量、突然一拳9伤/1弱→11伤/2弱、勒紧4→6、尖啸6→8，场外deck不变。631帧有抽牌堆聚合文本，4761个聚合条目均无逐卡dynamic_values；缺未知升级/附魔的逐卡转换及抽弃后的完整传播验证。当前源码只有forge手牌升级路径，未找到APOTHEOSIS接线；不能只把known改true当完整实现。
反例/限制：F35/F36/F37/F43打出神化赢，F43仍损57；F45未打而败，敌人、资源和抽序不同，不构成胜负因果对照。
下一次预期行为与验证：沿原提案冻结F35开发帧、F43同牌序验收帧与F45未知覆盖帧；补已覆盖逐卡转换、未知覆盖标记、后续抽弃状态和场外deck不变验证。未知升级与完整传播未完成时保留缺口；不增加必打神化规则。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-f2bfceddb1898dca：三骑士血价与随机药水预算

来源任务：postmortem；实现任务：strategy-proposal。领域：combat, potion。
既有学习账本：silent-0106, silent-0019, silent-0201；原经验：原提案未指定。
证据局号/层/回合：VLZ6CCT8AQ0A，F43 T1—T5、F44休息、F45 T1/T4/T5；decisions269748/269754/269770。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-f2bfceddb1898dca.original.md](silent-proposal-f2bfceddb1898dca.original.md)。

本次处置：waiting。模拟成熟度展示已有live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5；缺同总预算、同盘固定随机输入的MC对照、样本收益/候选稳定性曲线，且神化完整传播未覆盖。不能据单次707ms和1/12样本拟合预算、药价或目标规则。
反例/限制：T4攻击候选32伤/31损未实打，少损线实24伤/13损；全败参考并列不证明多8伤优于少18血价。F17/F33首试胜，不支持一律弃用推演。
下一次预期行为与验证：补同总预算、同进程条件、固定随机输入对照，记录用时、轮数、样本、best可比较性与覆盖缺口；先分离神化漏算，再评价MC分阶段。保留原预算、药价和所有目标选项。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-283a164780d11e69：神化经验实现链接

来源任务：experience-update；实现任务：strategy-proposal。领域：combat, structure。
既有学习账本：silent-0237, silent-0238；原经验：silent-apotheosis-combat-upgrades。
证据局号/层/回合：VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1；同89354805；经验silent-apotheosis-combat-upgrades。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-283a164780d11e69.original.md](silent-proposal-283a164780d11e69.original.md)。

本次处置：waiting。与89354805共享silent-0237/0238的源码缺口；经验文本上线与升级勒紧子项均不等于神化完整传播。缺逐卡未知升级/附魔输入和跨抽弃传播验收，沿原实现链等待，不重复造提案。
反例/限制：牌组持有与本战施放不同；四个赢战和F45死战条件不同，经验支持局数不能当独立受控样本。
下一次预期行为与验证：复用89354805的固定夹具与后续验证，保留postmortem和experience-update两份来源/经验链接。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-ebbfe3b97548756d：攻防、持续资源复合核验

来源任务：experience-update；实现任务：strategy-proposal。领域：combat, structure。
既有学习账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019；原经验：silent-strength-weak-observation, silent-footwork-block, silent-gorget-plating, silent-vajra-opening-strength, silent-sparkling-rouge-turn-three, silent-fasten-defend-extra-block, silent-piercing-wail-temporary-strength, silent-malaise-x-debuff, silent-accelerant-triggers, silent-noxious-fumes-growth, silent-deck-burst-observation, silent-three-knights-output-buffer-observation, silent-stone-humidifier-rest-growth, silent-rest-buffer-observation, silent-route-hp-observation。
证据局号/层/回合：VLZ6CCT8AQ0A，F43 T1/T3/T4/T5、F44休息、F45 T3/T5；states275679/275680/275752/275754及原资源链。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-ebbfe3b97548756d.original.md](silent-proposal-ebbfe3b97548756d.original.md)。

本次处置：waiting。升级勒紧子项已有live源码5e80e683daa08ae2569733b3b541cb523d7fe861；14账本/15经验的整体请求仍缺神化完整传播与持续输出/资源共同冻结的复合验收。局部源码祖先不能关闭全部请求；原本已上线的机制和版本保持。
反例/限制：F45两雾持有而未建立，覆甲末轮为0；32HP+20挡对减力后59仍差7。单轮减力和开场资源不能预支为后轮存活。
下一次预期行为与验证：神化沿专属链处理；固定F43三次毒结算与F45逐击减力、敏捷、普通/升级勒紧、覆甲和资源期限逐项核验，不拟合统一路线或休息阈值。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-e5b87be50f28f311：Jev、护栏与SL全过程审计

来源任务：postmortem；实现任务：strategy-proposal。领域：combat, sl。
既有学习账本：silent-0079, silent-0021, silent-0125, silent-0018；原经验：原提案未指定。
证据局号/层/回合：8JRE1C4H4Z2W，F33首/第三试T2、第二试T5、末试T11，另F17 T6；decisions270216/270282/270264。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-e5b87be50f28f311.original.md](silent-proposal-e5b87be50f28f311.original.md)。

本次处置：waiting。原答同fingerprint已核，第三试多损12血只多7当轮伤。缺原答→HP护栏→SL替换→实际前缀→抽弃/重规划的统一候选身份与完整配对记录，不能用候选省血当实际收益；本批固定日志未补齐该链。新增敌HP审计源码3f69541b5d3259dac94d3395bfe3da47936b4de9仅覆盖血量口径，不覆盖整个决策审计。
反例/限制：末试T2防御替换省3血少10伤、延至T11仍败；不支持一律禁止防御替换。原答0/24与替换5/24死亡不能写成相同死亡率；都封顶47损也不等于都24/24死亡。
下一次预期行为与验证：先以固定帧补统一候选/尝试/观测身份及重规划边界，再分列预测和完整/部分执行。策略阈值需后续独立同角色验证，当前保持护栏和SL规则。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-49632bc4878fb597：当前属性、虚弱与独立成长

来源任务：experience-update；实现任务：strategy-proposal。领域：combat。
既有学习账本：silent-0005, silent-0231；原经验：silent-strength-weak-observation。
证据局号/层/回合：CA5KE8GFJ9X2，F13 T1/T3/T5；账本silent-0005/0231。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-49632bc4878fb597.original.md](silent-proposal-49632bc4878fb597.original.md)。

本次处置：waiting。加压力量0→4→8、无弱喷水11→15→19及虚弱后11/14可核；该局计划步法未取得，不能补敏捷收益。缺四条属性/减益/成长路径共同冻结的本角色调用与完整源码对照；未核出需要新增统一攻防权重的证据。
反例/限制：临时虚弱不取消下一次加压，T5两血10挡仍不足14攻击。单条步法或成长源码不能证明整个复合请求。
下一次预期行为与验证：冻结实际有据的独立路径；出现同局可配对的敏捷、虚弱和成长复合输入再验证整体，避免从计划取得组件补事实。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-66532328a585941f：持有与实际启动分账

来源任务：experience-update；实现任务：strategy-proposal。领域：combat, structure。
既有学习账本：silent-0021, silent-0009；原经验：silent-deck-burst-observation。
证据局号/层/回合：5PM6JAQG6FNQ，F39末试T2，另F33已建立能力的胜场。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-66532328a585941f.original.md](silent-proposal-66532328a585941f.original.md)。

本次处置：waiting。重新核原帧：F39向无毒目标打冒泡，能量5→4、玩家29HP及敌状态不变。缺同血量、构筑、抽序下不同启动顺序的完整结局与可复现收益函数；不能据未兑现组件拟合构筑/启动权重。
反例/限制：F33已建雾3/触媒1/群蛇4并赢，与F39不同敌人/资源；不能将跨房间比较当受控替换。
下一次预期行为与验证：后续记录能力建立时点、每轮真实兑现、当前资源和完整结局；有配对证据才评价启动权重，现有选项保留。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷与毒/SL

来源任务：experience-update；实现任务：strategy-proposal。领域：combat, sl。
既有学习账本：silent-0030, silent-0027；原经验：silent-lagavulin-siphon-poison-sl。
证据局号/层/回合：61E2QS63Y9WU，F17 T5吸取、T6双防御、T7首试胜；states273506/273507。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-43a76a31ba7bdcfa.original.md](silent-proposal-43a76a31ba7bdcfa.original.md)。

本次处置：waiting。负敏捷−2、两防御各3共6挡及17毒成立；本局60HP首试七轮胜。缺相同起始资源和完整抽序下另一可救活SL线路，不能用首试胜调整SL范围/换线偏好。
反例/限制：本局已经首试胜，其他局不同资源的失败不提供本局必须读档的证据。
下一次预期行为与验证：保留分项事实；待完整已知抽序和可配对SL线路核实后重验偏好，不改变现有必死判定。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤、成长与退场

来源任务：experience-update；实现任务：strategy-proposal。领域：combat。
既有学习账本：silent-0039, silent-0209；原经验：silent-obscura-summon-growth。
证据局号/层/回合：61E2QS63Y9WU，F23 T4/T5；states273594/273595及后续状态。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-5264153a4a4b0e5c.original.md](silent-proposal-5264153a4a4b0e5c.original.md)。

本次处置：waiting。T4本体线47伤/15损兑现，幻象14→2仍可攻击；另一focus幻象39伤/零损只为未实打候选。缺A10召唤/航行/复活完整组合调用及另一目标序后续实打。3f69541b已有敌HP审计不能证明召唤/复活模拟和目标排序全部完成。
反例/限制：本体输出兑现不等于幻象退场；未打零损候选不等于整场胜线，不强制首杀。
下一次预期行为与验证：补当前进阶移动表和前后逐实体身份/血量/成长，冻结完整前缀；相同推演值并列，保留全部目标，目标排序收益另需后续对照。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫唤醒、成长与血价

来源任务：experience-update；实现任务：strategy-proposal。领域：combat。
既有学习账本：silent-0128, silent-0079；原经验：silent-slumbering-beetle-wake-growth。
证据局号/层/回合：DUZUBAJ3A8GP，F30 T1—T6、四次尝试；states275013/275018/275023。
旧规则、完整拟实现行为、原验证和回退：[silent-proposal-bddfa690a84e03d0.original.md](silent-proposal-bddfa690a84e03d0.original.md)。

本次处置：waiting。睡3/2/1、T4醒、T5尖啸、T6恢复成长至4力/22攻击可核，四试均败；c7578f37608526591edd86041cee5a28c3894fee已有当前进阶后轮伤害子项。缺同抽同资源的另一完整获胜线及睡眠/眩晕/醒来组合验收，不能以全败样本拟合少挡换伤的血价。
反例/限制：末试T4比首试多扣3敌血却多损2玩家血；当前减力不能关闭后续成长，T6只剩1血16挡仍死。
下一次预期行为与验证：按当前进阶单独冻结睡眠/实际失血唤醒/眩晕/成长；待完整可配对线路再评价血价和排序。已完成局部恢复不当作整个请求implemented。
预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。

