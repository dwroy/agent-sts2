# 第104批代码提案证据更正

本文件更正本批四份已登记初稿共同段落，原提案及指纹全部保留：silent-proposal-2ea03873248ad65f,silent-proposal-4c28c13316c0d88e,silent-proposal-51d8fe5060c677e8,silent-proposal-4114571d6f0866e1。初稿“前24抽牌”误把首试未记录的后两张补全；实际首试22张，后两试26张且相同。初稿“次轮15血”漏计荆棘3，实际12血；退场后索引重排，不能把index0延续为原实体。这些更正不改变建议、支持局数、胜负或本轮经验文字。实现任务必须连同本更正核验，不以初稿错误数字实施规则。

关联全部账本：silent-0302,silent-0301,silent-0005,silent-0012,silent-0006,silent-0027,silent-0115,silent-0129,silent-0173,silent-0013,silent-0259,silent-0243,silent-0020,silent-0019,silent-0021,silent-0125,silent-0018,silent-0079,silent-0235,silent-0220
全部经验：silent-fight-me-upgraded-dual-strength,silent-ghost-in-a-jar-current-turn,silent-footwork-block,silent-strength-weak-observation,silent-accelerant-triggers,silent-burst-next-skills-replay,silent-bronze-scales-per-hit-thorns,silent-permafrost-first-power-block,silent-vambrace-opening-block,silent-regen-potion-decay-heal,silent-act-transition-missing-hp-heal,silent-rest-buffer-observation,silent-route-hp-observation,silent-deck-burst-observation,silent-insatiable-dual-clock,silent-myte-toxic-block-sl-observation,silent-haze-group-poison-weak,silent-snakebite-retained-poison

# 静默猎手：以异螨同盘改目标及沙虫抽牌后重问核完整SL线，合核当轮血价和后轮活敌，不由全败有限模拟推最优。

账本：silent-0018,silent-0079
经验：silent-insatiable-dual-clock,silent-myte-toxic-block-sl-observation

来源任务experience-update/20261008-174751；实现任务独立strategy-proposal。角色silent。新局SY0WMJNNVRLM为A10；历史验证136完局分阶/支持/反例见historical-mechanism-summary.json、update-summary.json。机制经验[0,20]表示机制分类，代码改变只覆盖已核对应进阶/场景；未观察等级/交互和其他角色保持等价。授权Roy-2026-10-07-learning只允许有证据的更改，不提供游戏事实。本任务不改打法源码，不登记implemented或shipped。

旧行为及定位：实际运行650a6a84+dirty，完整dirty源码缺失；当前参考源码card-model.ts已有APPARITION/intangible、动态Strength/EnemyStrength，但未登记GHOST_IN_A_JAR；combat-plan.ts药水题面声明该瓶效果未模拟，boss持有成本0。旧HP护栏8血容差及SL少挡换伤基于题面，抽牌会重问；这些规则不因人定而禁止提案，也不由本局败认定纯bug。现有牌模型可能已等价实现，独立任务先核最新live，实际祖先实现才可duplicate/implemented。

冻结证据：F30/F31T1升级FIGHT_ME先扣12后玩家力4/目标力1；F31随后突然一拳12、中和7，各比本局无力基础多4。boss六试无玩家力量/未施放FIGHT_ME。T3力量线题面损27并有敌增力，未实打强制启动，不能固定T3。末T4步法建2敏，T6两防御各7比基础共多4，仍损10。T1触媒1层触发冰晶7挡，首后空翻+由臂甲8→16，第二能力不再给7。首T5爆发复施蛇咬14毒结27，末单蛇咬7毒结13；荆棘双击另6。末T9两逃离沙坑1→3、结束仍2，11血7挡对30完整需损23、当轮存活至少差13，敌仍179；不能当整场只差13。

药水：沙虫六次T4无攻击时实饮幽灵建1，次T5撤，T4各损0、T5零挡各损24。较早静默A9 G403VCZ3BH1B F38T1也在NOTHING_MOVE喝并到期；A4 9YBKCNBFP0X5及A10 XTSV1U9JD34T攻击轮有26→1，A10 YLYLZWHA0GKU有9→1。五局20次实饮/全部次轮撤独立核验，不把攻击轮有效当本局留药胜局。新行为：量化该已见1层的当轮收益和到期，保留不喝线；不禁候选、不强制固定T5、不用boss药价0代替收益或机会成本。再生本角色18局25饮均增5，旧条目16/23漂移修为18/25；本局F30净回6但T2净损2，回血/受击中间帧缺失，不能以REGEN4断定实回4。

SL天然对照：F21三试均17血/同镣铐；三试共有22张已记录抽牌前缀，第2/3试26张已记录抽序相同。第2/3试T4完整combat相同：9血3能、串刺/带毒刺击/步法/中和/精确切击，敌39/23各5毒。第2试先杀#2当轮不掉血，#1毒后22血并添状态、T5判死；第3试集中非攻击#1，余6被8毒退，弱化#2由9→6攻、付6血到3，轮末原攻击者由20血结5毒并受3荆棘，次轮对12血唯一活敌实胜。次序/多个目标共同改变，只证明记录到的路线，不能归单牌/运气/固定目标优先。旧MTQ0EUBJ3R6T四試0赢反例边界保留，两场七試1赢。沙虫六试同首抽、首五T7判死，末T3后空翻重问加防御/中和实损8，延至T9仍败；无赢的那次，有限B2全0胜不作为精确必死或最优排名。

资源与方案边界：初56+六火154+跨幕44−事件7/6−十二胜房净损171=70进boss。独立八瓶/七饮瓶/一丢，实际饮用14、SL恢复7，不把恢复当治疗/新瓶。六火全回血、取得枕头后36/31/24受缺口限制，不定普通火固定36。F19/20/21两赢走廊加问号58−11−30−14=3，之后火恢复，并无替路线受控结局。F9T2护栏方案省10血少12伤，实际后空翻抽中和/带毒刺击后重问，实损2且扣12；原线未执行，13血差不当受控省血。构筑拟力量/毒雾/尖啸而boss未建力量且未持后两组件，不预支。F31按17:46勘误出口三段0血，最后毒/反伤内部先后未知；不能冒认未记录归零。DeepSeek调用0，实际脑37 Codex请求；不虚构DeepSeek经验引用。

拟议机制/资源新行为：以取得→抽到→可支付→实际建立→后续兑现和当前真正HP/药槽传递至候选，重问后按新状态验收；若现接线已符合只登记对应事实和缺数据，不用新固定牌值/路线/终局价值取代证据。需要规则改变时先证明结构缺口及本角色数据，尤其能力长期价值与即时血价、药水到期、SL目标差异；本批不给强制出牌/药水/SL门槛参数。

样本/拟合与反例：旧135局作前置历史，新局冻结核验而非未读盲测；所有旧七数组、血档/节点/火/SL逐行复算。无自由参数拟合。新策略后续取时间更晚的独立silent A10完局验证，SL按局/场分组，不把六次当六局；对应contradicting保持，已见胜/败均可支持局部算术。没有强制力量/延后幽灵/改营火/组件移除完整受控胜局、完整dirty源码、部分毒/反伤中间序、SL截断真实出口或boss时钟；不足则waiting保留原行为，不补预训练知识。

验证：固定原帧回放当轮效果、到期、毒层/反伤、目标/抽牌重问、血药守恒及独立战房结局；实际接线撤掉应使针对性样本失败、恢复后通过。固定沙箱与gitleaks通过并实际合live后才能登记实现。预期减少未建能力/未来保护预支，改善数字可靠性，不承诺胜率。回退：仅逆向独立实现任务的源码/模型提交，保持其他角色等价和全部记录。规则实际上线后先date，按授权在根目录notes/for-roy与ops/inbox-dev双通知旧/新规则、证据/账本/任务、影响与回退；本经验任务不改运维prompt。
