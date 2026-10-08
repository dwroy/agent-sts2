# 静默持续能力、临时力量与分来源血价提案

旧规则须核现有源码，不因已有公式重复改。新行为仅在存在缺项时按已核数字补同等条件的推演：步法普通2/升级3敏捷、能力不直接得挡、多牌基础加当前敏捷再核脆弱；临时减力/药后增力次轮撤，敌永久成长另核；余像逐后续出牌1、钗起7、水盆无攻击末4均不再次加敏捷。

WQZVENQ7DTRP A10 F33六次T1双普通步法共4敏，防御9/生存者12/斗篷10，末T7共21对25实损4；T3尖啸临时0→−6令弱后23→18，22牌挡零损；T6敌力3中和后9×2无挡实损18。F25棱柱T1步法不添污染，两毒药技能添0→3→6且弱单击12→15→17；T3蛇咬/冒泡使三击6→9→12，26毒实扣26而零挡损36，T5火花3→6。技能毒/挡收益和逐击污染代价须同核，不一概禁技能。

TXZ6RVMQA09D A10 F48末次T2暴露去3制品后可建弱；T5毒雾能力总5，T8补30→35、迷雾加4至39、触媒+建2后结39+38+37=114；T9三结120+直伤46至108，T10潜在126只扣剩108。末T10起钗7、防御5及余像1至13、无攻击水盆另4，两凋萎各12令11→4损7；毒杀没有免状态伤，内部结算先后未记录。三次T3虚弱药因爬行动物饰品给临时3力量，次轮撤，不能给毒伤加此力量。

固定验收以上前后帧和历史公式/反例集，已有实现登记真实等价祖先，缺任何内部全序不凭预训练补齐。原方案抽牌重问前后不能沿旧整线预测，不将所有局部误差当纯bug，不拟合单卡胜率或固定出牌顺序。

关联经验：silent-footwork-block,silent-strength-weak-observation,silent-noxious-fumes-growth,silent-accelerant-triggers,silent-afterimage-per-card-block,silent-sai-start-block,silent-ripple-basin-no-attack-block,silent-wither-end-turn-loss,silent-infested-prism-tainted-skill-cost,silent-piercing-wail-temporary-strength,silent-haze-group-poison-weak,silent-reptile-trinket-temporary-strength。
关联账本：silent-0005,silent-0006,silent-0007,silent-0011,silent-0023,silent-0024,silent-0027,silent-0038,silent-0046,silent-0048,silent-0059,silent-0063,silent-0168。

角色silent，仅已观察机制/进阶；所有evidence与反例分布见historical-facts.json和cunning-history.json。旧105局作历史核验，新两局作后期固定案例，同一战多试不当独立局；不既用本批拟合又宣称独立验证。首帧/最终退出HP净损、完整威胁与死亡截断分别算；未观察结算全序留未知。来源任务experience-update，实现任务strategy-proposal。

固定验证只用本批已保存原始状态/动作与历史案例，不跑boss模拟池。本任务不改策略源码或依赖。独立任务先核现有实现；已等价须核实际live祖先源码才登记duplicate/implemented。证据不足保留现行为、waiting，完整未来整战验证按开始时间留出新局。Roy-2026-10-07-learning允许依据足够本人核验数据改旧规则，授权不提供游戏事实。其他角色及未观察进阶保持等价。实际规则上线先date并双通知Roy；回退恢复实现前源码，保留提案/原日志/失败历史。
