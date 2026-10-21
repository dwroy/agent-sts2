# Silent A10：三项策略候选的原文核验与未实现原因

来源/实现任务：strategy-proposal；批次20261021-163323-strategy-proposal。基线c371a1f530d7d3f13fd38b1c58d00c6e7d3f5f45。普通tick批次，无proposal_ids/proposal_repair、research_request或implementation_request；未领取其他批次。只研究本批Silent数据，不使用外部数据或其他角色经验。

结论：本次不提出新参数、固定牌序、强制用药或固定杀序，不修改源码。复用原CLI提案，不建重复id；下列waiting是本报告的科学处置，不冒称已改动专用队列租约、implemented或shipped。原经验已发布的status保留，不能当相关缺口已修。

## 1. 抽弃/取回候选兑现：TS0BHDLAH8ME F17 attempt2 T8—T10

原CLI提案silent-proposal-d7c38f35e4bd613d；审计账本silent-0418。取牌缺口沿原silent-proposal-0cd2f0dfbc4a0805、silent-0496，不重复建项。

完整Jev原行74248：offset2356176902、bytes54401、SHA256 4ec9e5e136c9ca817e4c24850369caa2cd824b4f1dd05e8dd824fa701e5e6873。精确decision_id=24e6cb1d-b364-4aea-bef5-3f4985173d73，decision原行457616：offset3254110748、bytes39998、SHA256 e9f76756ebb373d71f0f3dd40a3244f5fe192a8741ec2d133dbc9ee0ff21ed7e。身份为显式run_id及fingerprint.run一致，并核对原决策行；不靠正文、question_id或时间近邻归局。

完整题有plan1/plan2两项。plan1预计当轮损0、敌78→45、cards_drawn=2，5轮13/24胜；整场50/200样本、原始MC95%区间24–50%、文字校准86%，三者不混为一个胜率。Jev以0.98选plan1；chosen为打击/0/目标0，result=completed。原selection_dispatch仅single_action_receipt，state_effect_verified=false、whole_plan_executed=null；gate_reject字段缺席。

原状态473785—473796和决策457616—457627核得：14血/3能、敌78，打击→72；涅奥之怒→62并进入deck_card_select，min0/max2，唯一可选是一张普通打击，selected_count=0。决策457618直接confirm_selection，返回战斗后手牌并未取回该可选牌；继续切割→56、打击→50，结5毒→45，T9仍14血。T10敌32、来袭11×2，原决策457627被SL拦下且未派发，不能写成第二试已实死。完整取牌页原文在question-windows.json保留。

本窗口反驳“cards_drawn=2意味着已取回两张牌”；支持当轮总推进33的端点，但其28牌伤+5结毒不能证明原候选所有来源都合法兑现或86%校准正确。这里没有取牌之后的实打对照，且本例取牌页只有普通打击、零选本身合法。不能从已知页面种类漏接直接推出应无条件取满2或采用原抽牌候选。

旧行为的当前源码参照：selection.ts只在combat_hand_select的可选取牌分支处理，deck_card_select到通用selected>=min确认；card-model.ts通用Cards回退仍可把取回当draw。历史run-config的commit/dirty因ENOBUFS未知，当前基线只作参照，不重建虚假历史树。

拟议后续仍沿原0496完整提案：真实选择名单/来源与普通抽牌分账，选择索引来自现场、零选合法；取回后重新核合法能量/手牌与后继，不预支未取回牌。waiting原因：本批这一页可定位原缺口，却没有覆盖完整取牌来源、主动零选、升级/重放、选择数量与回流后继的固定回归集；不将一次0/2直接升级为强制选牌规则。本次仅补本局原文，未重新验收原0496全部旧样本或改其实现范围。

## 2. 双蟹目标、朝向及提示冲突：862JGUUWUQZX F33 attempt4 T5—T8

原CLI提案silent-proposal-f02bf7d768f7b383；账本silent-0062、silent-0385。

完整Jev原行74459：offset2369727081、bytes66029、SHA256 bbd35515a71975229232180d8aebb4ab80614abb89c143b2c7b71c793c73aec0。精确decision_id=42b509c1-7676-4d5e-bc2a-7d0e000049ac；decision原行458833：offset3276203851、bytes27555、SHA256 4838900c269002cc6142fe015a46ec9e4ef550ce9a942186770b1a85b874029f。

13血16挡，两个合法候选都打一张小刀、预计伤3。打碾碎爪预计损1、打火箭预计损9；五轮均24/24死。整场两项各50/100、零赢样本、原始区间0–7%，却各有文字校准49%；rankingEligible=false，不能拿S或49%强排。Jev以0.88选plan1，chosen为小刀/3/目标0，result=completed；原gate_reject缺席，selection_dispatch仍只确认该单步，未确认整线。

状态475038—475054核实爪162→159、玩家13不变，T6玩家12；选择当轮预测损1与后继相符。末T8仅7血4挡，对爪7×2，结毒后爪74、火箭60仍活，GAME_OVER。另一目标损9只是候选预测，不是未选支线的实盘；差8不能累计为已获得8血收益或证明应固定打爪。

同一完整题里，CRAB_RAGE_POWER附加旧提示含“past runs won 9/12 ... so put single-target damage into the Rocket”；经验栏明确“不定固定杀序”。这是既有原提案已记录的结构冲突，本次独立读回确认；Jev本题实际没有跟随该固定指令。当前源码combat-plan.ts POWER_NOTES仍有该文字，不能当没有冲突，也不能据此认定它导致本局死亡。牌面描述5力量与代码提示6力量的差异保留，本窗口双方未退场，不据该窗口改加力数值。

waiting原因：没有隔离杀序/朝向/增益建立的整场对照，未复核9/12和8/39的历史来源与适用范围、也未验证跨角色提示来源。本次不改共享POWER_NOTES，避免未经证据改变铁甲等角色；不以当前经验已shipped冒称原提示冲突已修。后续需角色限定提示的一致性夹具及原分母来源审计，仍保留Jev全部合法候选和原信任闸。

## 3. 未知药价与后续饮用：JS5UV1DUB1K1 F31 T2—T4

原CLI提案silent-proposal-ed86692b5612e878；账本silent-0431、silent-0385。

完整Jev原行74614：offset2380866096、bytes53104、SHA256 912d15471b3b2ea04e00e54e42f00be298b309676d4622873ef502327d713f26。精确decision_id=a6903a5a-845f-4470-a52d-2d9927fc883d；decision原行459619：offset3296225228、bytes28739、SHA256 1df71fb7cfcc603d95955d170db8b2eadbbac9a2abe831cd3577f36491ef5ca8。

41血13挡0能。力量药水hold_hp=null、charged_hp=0、zero_reason=no_value。plan1当轮喝；plan2本轮不喝而后续5/5样本喝，均预计损39.2；plan3才是整战无药参考、预计损41。三项仅5轮5样本、各0/5已赢/1死亡；22%和8%包含终点估计，不是抽样实胜率。plan1/plan2标并列且best=null，未把相同推演强排。

Jev0.19选plan2，chosen=end_turn且completed；gate_reject字段缺席，原single_action_receipt不验证整战后果。状态475926—475936核得T3仍41血且药仍在；决策459621实际use_potion/0，后继新增2力量、药槽变空；该步敌血不变。T3余下动作后零挡承受30、T4只11血，灵动步法此时才建立3敏捷；最后8挡、前段结毒退场，中后段16+9攻击仍实死。不是“到死从未喝药”。

waiting原因：同题展示已分清未知持有价与零计费，也已分清本轮无药与整战无药；没有本局早喝或整战留药的受控后继，不能拟正药价、强制早喝、认留药错误或改HP护栏/SL阈值。此处没有发现需要新修的并列或未知展示回归。

## 验证、限制和回退

全部原问答、执行回执、选中状态窗口的offset/bytes/SHA及身份链见question-*.json、decision-*.json、question-windows.json和raw-verification.json；selected-original-rows.jsonl保存按原偏移回读的原字节。question-coverage.json逐项列出874行Jev中实际完整读的3行与未完整读的871行；不声称对其余问题做策略验收，亦不把最后五条索引当全覆盖。

本次不拟合或训练；三局窗口只作研发支持，不将SL尝试当独立局或留出集。其他七局只核完局/配置与机械证据计数，不据其死亡推断新策略；未独立复原全十局的路线、胜战耗血和资源链，故不提出全局资源因果结论。没有外部数据、其他角色/未观察进阶分母。

无源码修改、无提交/合入、无行为版本、无测试成功声明；撤源码红/恢复绿与tsc/vitest均不适用。未来有证据实现时按原提案固定输入回归、撤修失败/恢复通过、原沙箱tsc/vitest、live集成及原通知流程执行。仅窄实现独立提交可回退，所有原始证据与旧失败保留；本次没有行为回退项。不代运维登记shipped或关闭父要求。
