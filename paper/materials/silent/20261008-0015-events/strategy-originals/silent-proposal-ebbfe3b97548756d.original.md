# 静默攻防机制、持续输出与资源分账的固定证据验证

来源任务：experience-update，20261007-164302-experience-update；实现任务：strategy-proposal。角色silent；本批A10，历史按逐条支持局分A0—A10。授权Roy-2026-10-07-learning；本次不改源码，不登记implemented。

## 证据、账本和经验

- silent-strength-weak-observation → silent-0005。
- silent-footwork-block → silent-0005。
- silent-gorget-plating → silent-0016。
- silent-vajra-opening-strength → silent-0049。
- silent-sparkling-rouge-turn-three → silent-0071。
- silent-fasten-defend-extra-block → silent-0143。
- silent-piercing-wail-temporary-strength → silent-0046。
- silent-malaise-x-debuff → silent-0053。
- silent-accelerant-triggers → silent-0027。
- silent-noxious-fumes-growth → silent-0011。
- silent-deck-burst-observation → silent-0021。
- silent-three-knights-output-buffer-observation → silent-0106。
- silent-stone-humidifier-rest-growth → silent-0204。
- silent-rest-buffer-observation → silent-0020。
- silent-route-hp-observation → silent-0019。

新局VLZ6CCT8AQ0A所有支持按一局计。历史完整支持/反例、进阶、动作与层/回合留historical-facts.json；新局逐帧事实在VLZ6CCT8AQ0A/facts.json。

- F43 T1神化后勒紧4→6、尖啸6→8；T2萎靡+X2建−3力/3弱，多击20→12但仍损9。T3步法+3与口红1合4敏，后空翻+12、生存者+15。牌升级、属性、减益和被动收益须分源，不把旧数值用于升级后的牌。
- F43 T4/T5的12/16毒在触媒2下实际33/45；后者加直接23合扣68。F45普通触媒1使7毒扣13、末2毒仅扣3；两雾未建、另两敌无毒，持有不代表群体输出。
- F45 T3口红建1力/1敏，金刚杵开场1力，总2力量，中和5、匕首雨每敌两击共12、猎杀者17。T5步法2加口红1使后空翻8、防御5+勒紧4+敏3=12；覆甲已0，不沿用开场4。
- F45 T5力量增长后新意图26+17+40=83，尖啸对四段各减6，总59。32血20挡完整需损39、差7；结算毒后80/21/77各存活，不能把focus选择当实际减员。T4少损线24伤/13损，对未实打攻击线32伤/31损只是推演比较，未证明整战优劣。
- 本局9次火房动作中8回血合242、1锻造；上限+40而F35另损6至终104。F43胜损57、F44回34至67仍死；与历史A10不同节点/血档比较只观察，样本见audit.json，不拟合硬安全线。

## 旧行为与拟实现行为

独立任务先用保存的固定帧检验现有模型已经体现的逐击力量、逐牌敏捷、勒紧专属挡、普通/升级毒触发、口红T3、现场覆甲和临时减力恢复。已准确实现的机制保留行为并指明实际live源码祖先；发现与以上实盘数值不符的缺口，才在静默路径补对应状态变换。神化传播交专属提案，不重复修；禁止用固定加分覆盖真实升级，禁止把单轮减力计作永久存活价值。

面向Jev/大脑的结构只分列持有与本战建立、各敌剩血及攻击段、已结算与未来毒、现场覆甲、当前回复和后续投影。若当前已有这些信息，可记duplicate并引用真实live源码；没有源码实现不能凭经验上线标implemented。路线样本只供观察，不用它强制改路线、休息、focus、SL或终局门槛。

## 反例、拟合、样本与时间切分

各条反例0；机制成立但死局不算反例。子公式的独立实验分母分别核，综合条目的94局不是94次相同属性实验。三骑士A5/A6/A7/A10四局两勝两败、无重打，对不同敌人/构筑的赢败不作因果；此前SL比较仍分draws/explore，当前无新重打。

不拟合收益常数或优先级。历史至2026-10-07T06:57:27.794Z为复核集，本局至07:38:37.200Z为发现/验收帧；它们已用于分析，不能称盲测。后续独立完局再按时间和进阶验泛化。缺另一focus、未施放能力、改线和火堆选择的同盘整场反事实，保留旧行为。

## 验证、预期影响与回退

固定夹具从已保存原帧生成，验证同轮收益与状态期限：F43升级/毒三结算，F45四段减力、20挡与0覆甲、全部敌未退场；资源链包含已胜场和实际净回。对已核实缺口须撤源码红/恢复绿，再跑原沙箱入口及角色隔离。未知升级、复杂减层和未见卡保持unknown，不补其他角色知识。

预期让候选和知识使用同一现场数据，不承诺胜率，也不把死局倒推为Jev必须选另一线。回退独立实现源码/对应开关，保留经验、账本、全部夹具和失败历史；实际改行为上线后按授权双通知Roy。
