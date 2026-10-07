# 第74批28项提案补链及余像语义勘误

记录时间：2026-10-07T20:13:46+08:00。来源experience-update/20261007-153133，实现/补链strategy-proposal/20261007-200254。
四局均SILENT A10，2027帧原始核对/566帧留存证据相等。13项已有实现，15项待证；余像新增正确账本链。每项证据、反例、旧/新行为、样本、验证、回退在链接文档；完整回报见report.md。

|经验/CLI id|证据局/层/回合|账本|处置/实际源码commit|理由|
|---|---|---|---|---|
|[silent-footwork-block](silent-footwork-block.md)<br>silent-proposal-61d51ad5255ff47d|5PM6JAQG6FNQ F39 T4|silent-0005|duplicate / d8a2b0090ba8145c0b6d20bcae700006f01e2c79|复用已有 dexterity 字段及同方案/后续轮传播；只确认增量，不改未知能力加分或构筑排序。|
|[silent-strength-weak-observation](silent-strength-weak-observation.md)<br>silent-proposal-49632bc4878fb597|CA5KE8GFJ9X2 F13 T5|silent-0005、silent-0231|waiting / 无|缺将力量、敏捷、弱、独立成长四条路径同时冻结的实际调用输入及源码对照；不能用一个步法提交证明整条复合经验全部实现。|
|[silent-deck-burst-observation](silent-deck-burst-observation.md)<br>silent-proposal-66532328a585941f|5PM6JAQG6FNQ F39 T2|silent-0021、silent-0009|waiting / 无|缺同起始局面、同抽序下不同启动/构筑顺序的完整胜负对照及可复现收益函数，不拟合启动阈值。|
|[silent-noxious-fumes-growth](silent-noxious-fumes-growth.md)<br>silent-proposal-e811f9fe3b1c34e5|5PM6JAQG6FNQ F33 T2|silent-0011|duplicate / f6c5504a73b2ee3702812a5217dfcda8b14e18aa|复用 poisonPerTurn 与后续玩家轮初施毒；不预支未到来的轮初。|
|[silent-bubble-bubble-condition](silent-bubble-bubble-condition.md)<br>silent-proposal-2f05905c397c3223|5PM6JAQG6FNQ F39 T2|silent-0010、silent-0009|duplicate / f6c5504a73b2ee3702812a5217dfcda8b14e18aa|复用 poisonRequiresExisting 的逐目标前置条件；保留选项，不新增强制禁打或评分权重。|
|[silent-accelerant-triggers](silent-accelerant-triggers.md)<br>silent-proposal-26221dcf765fd913|61E2QS63Y9WU F17 T5|silent-0027|duplicate / f6c5504a73b2ee3702812a5217dfcda8b14e18aa|复用 poisonExtraTriggers，每次结算后减1并按现有敌限制截断。|
|[silent-outbreak-immediate-poison](silent-outbreak-immediate-poison.md)<br>silent-proposal-8ce59566787877de|5PM6JAQG6FNQ F39 T4|silent-0037|duplicate / f6c5504a73b2ee3702812a5217dfcda8b14e18aa|复用 poisonNow：先加毒、立即结算并保留减层后的毒，再与结束结算分账。|
|[silent-afterimage-per-card-block](silent-afterimage-per-card-block.md)<br>silent-proposal-e7e09b65a704bfff|CA5KE8GFJ9X2 F2 T1|silent-0023|duplicate / e0541ebc4a8786250d08869731fa07d303c0c8b8|复用 afterImage：建立本身不触发自己，后续出牌/重放补挡并在新战重新读取。 原silent-0007账本为药瓶毒伤，另以silent-0023追加余像语义勘误链接，旧记录不覆盖。|
|[silent-lagavulin-siphon-poison-sl](silent-lagavulin-siphon-poison-sl.md)<br>silent-proposal-43a76a31ba7bdcfa|61E2QS63Y9WU F17 T6|silent-0030、silent-0027|waiting / 无|缺同起始血量/构筑/抽序下可救活的另一完整SL线路和完整已知抽牌记录；不据本局首试胜利改变SL阈值。|
|[silent-obscura-summon-growth](silent-obscura-summon-growth.md)<br>silent-proposal-5264153a4a4b0e5c|61E2QS63Y9WU F23 T4|silent-0039、silent-0209|waiting / 无|缺本次A10召唤/航行脚本的冻结完整输入与另一目标序后续实打；旧召唤提交不能证明新增成长和目标排序收益。|
|[silent-piercing-wail-temporary-strength](silent-piercing-wail-temporary-strength.md)<br>silent-proposal-e0275838dbb45d18|DUZUBAJ3A8GP F30 T5|silent-0046、silent-0128|waiting / 无|缺同一固定调用中同时覆盖尖啸恢复、甲虫独立增长和弱修正的红绿重放；已有通用减力接线不足以声称整条跨轮经验验证完成。|
|[silent-letter-opener-third-skill](silent-letter-opener-third-skill.md)<br>silent-proposal-9397e5ee011c1663|5PM6JAQG6FNQ F39 T4|silent-0055|duplicate / dba8d7caf9f2b44dd2fd11fd8861ecc14be4c09b|复用独立技能计数器和群伤结算；仅确认第三技能附加5伤。|
|[silent-anticipate-temporary-dexterity](silent-anticipate-temporary-dexterity.md)<br>silent-proposal-b7d95fdde39ed5ef|DUZUBAJ3A8GP F30 T2|silent-0080|duplicate / cd55a88517ed1d44c3f8bf64e0c9f2ab14ccb2e2|复用 temporaryDexterity 及后续轮撤回，不追补旧挡。|
|[silent-mirage-poison-card-block](silent-mirage-poison-card-block.md)<br>silent-proposal-329a2629d5f1bf1e|DUZUBAJ3A8GP F30 T5|silent-0010|waiting / 无|缺本次同方案先施毒/退场后蜃景的冻结输入和逐步源码重放；仅当前显示13挡不能证明动态毒量已接入，同步变动的敏捷/脆弱边界另需对照。|
|[silent-burst-next-skills-replay](silent-burst-next-skills-replay.md)<br>silent-proposal-2167dba21e7a4902|DUZUBAJ3A8GP F30 T6|silent-0115|duplicate / dafd280bc04f10573cf4205d55e5b80e1400be03|复用 burst/duplicateSkills：下一技能额外一次，攻击不消耗，未用不跨轮。|
|[silent-bronze-scales-per-hit-thorns](silent-bronze-scales-per-hit-thorns.md)<br>silent-proposal-fcfc3568c08fd6da|DUZUBAJ3A8GP F30 T6|silent-0129|waiting / 无|缺本次死亡/多攻击者边界的完整固定求解输入及敌方逐步结算验证，通用retaliate字段存在不等于所有边界已验证。|
|[silent-slumbering-beetle-wake-growth](silent-slumbering-beetle-wake-growth.md)<br>silent-proposal-bddfa690a84e03d0|DUZUBAJ3A8GP F30 T6|silent-0128、silent-0079|waiting / 无|缺同抽不同排序的完整获胜线路，以及醒来/眩晕接续与当前进阶成长的冻结全链输入；四次均败不能拟合输出血价权重。|
|[silent-serpent-form-per-card-damage](silent-serpent-form-per-card-damage.md)<br>silent-proposal-60930500313a651d|5PM6JAQG6FNQ F33 T1|silent-0132|waiting / 无|缺逐牌剥离牌伤/毒/群蛇4伤的固定前后帧及当前源码输出对照；多人随机目标、升级和叠加分布未核实，不能由整场净扣反推。|
|[silent-fasten-defend-extra-block](silent-fasten-defend-extra-block.md)<br>silent-proposal-4ef4320ee242f542|DUZUBAJ3A8GP F30 T4|silent-0143|duplicate / 1912b5e0c2c9d87622f6915d8a299f0ef6222588|复用 plain Fasten=4 的接线，仅DEFEND_SILENT得到专属增量。|
|[silent-infested-prism-tainted-skill-cost](silent-infested-prism-tainted-skill-cost.md)<br>silent-proposal-c20b5139dd0dff71|DUZUBAJ3A8GP F27 T5|silent-0168|waiting / 无|缺本次火花3→6增长、临时污染消失和迷雾收益同时固定的源码重放与完整替代线实打，不能据9损改强制少打技能规则。|
|[silent-permafrost-first-power-block](silent-permafrost-first-power-block.md)<br>silent-proposal-d01ced1dfd3ce8a0|CA5KE8GFJ9X2 F13 T1|silent-0173|duplicate / 157d635cd9e9880d7396e76a15594c6e7f0b0253|复用每战首次能力7挡及消费标记；与CALTROPS新建荆棘缺口分账。|
|[silent-lost-forgotten-possession](silent-lost-forgotten-possession.md)<br>silent-proposal-ae9e692d680e3819|5PM6JAQG6FNQ F39 T4|silent-0183、silent-0005|waiting / 无|缺抢夺各来源、同轮毒杀返还力量和后续重抢的固定完整输入；不能只由现帧负力/敏公式证明死亡返还已实现，目标顺序无完整胜局对照。|
|[silent-gardener-skittish-shield](silent-gardener-skittish-shield.md)<br>silent-proposal-246daedaa3021847|CA5KE8GFJ9X2 F9 T2|silent-0211、silent-0209|waiting / 无|缺同敌同回合连续非致死攻击的独立触发/消费序列及另一目标序全战结果；当前skittish接线不能单凭群伤帧证明所有触发边界。|
|[silent-caltrops-thorns](silent-caltrops-thorns.md)<br>silent-proposal-f84be739ede0e40e|CA5KE8GFJ9X2 F13 T3|silent-0230|duplicate / db6e32d2ee101af6b53f8228c27165bb41f04811|实际live已有普通ThornsPower=3建模及后续推演持久化；本次固定回归验证，升级和未观察组合保留。|
|[silent-sewer-clam-pressure-growth](silent-sewer-clam-pressure-growth.md)<br>silent-proposal-52f1e1bd2e7db0ed|CA5KE8GFJ9X2 F13 T5|silent-0231|waiting / 无|缺实际调用读取的A10移动表冻结副本、加压/覆甲逐步源码重放和未观察减层条件的独立证据；不将实盘数字替成未经验证的固定房间成本。|
|[silent-hunter-tender-card-attributes](silent-hunter-tender-card-attributes.md)<br>silent-proposal-f6d98c52fdc345b0|61E2QS63Y9WU F28 T2|silent-0232|waiting / 无|缺翻滚下轮挡在负敏捷恢复前后的固定模型输入/红绿验证和另一顺序完整结果；当前tender字段存在不证明跨轮挡时点正确。|
|[silent-zapbot-high-voltage-growth](silent-zapbot-high-voltage-growth.md)<br>silent-proposal-6dd8bbff876be528|5PM6JAQG6FNQ F38 T3|silent-0233、silent-0209|waiting / 无|缺本次召唤者身份与A10移动表的冻结实际输入、连续增长源码重放及另一杀序后续结果；通用growth路径只证明接线存在。|
|[silent-haze-group-poison-weak](silent-haze-group-poison-weak.md)<br>silent-proposal-1c51f79f5b69bf37|DUZUBAJ3A8GP F27 T4|silent-0235|duplicate / 20b04517393708c73912326bb35d8448d1b3f77e|实际live已将普通4/升级6施毒接入群体施毒、逐目标Artifact及回合末结算；虚弱与污染仍分账。|
|余像语义勘误<br>silent-proposal-676a9e6d5eeefb1d|CA5KE8GFJ9X2 F2 T1/T2|silent-0023|duplicate / e0541ebc4a8786250d08869731fa07d303c0c8b8|新增正确账本链；复用已有实现，历史0007错链保留并追加勘误。|
