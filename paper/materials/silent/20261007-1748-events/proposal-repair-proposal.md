# 静默猎手经验第74批代码提案补链

来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-170244-strategy-proposal。
本次明确派发的是 proposal_repair，原批没有 proposal_ids。本文件和逐条Markdown补齐28个缺链经验，不重写复盘。
四来源局已从runs.jsonl核对均SILENT A10。原经验源码7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a保留；本次没有改该经验或生产源码。
duplicate仅指每条文档明确划出的已实现代码子项，不表示整条经验全部边界、构筑/目标排序或A0—A20均已验证；implemented_commit逐项核实际live祖先。
样本均按局独立，SL不另计独立样本；原经验n_support不是本次独立验证分母。没有拟合新权重/阈值；后续新局按时间作为验证集，不能复用同局SL冒作留出集。
事实按当前进阶读，房间代价五样本门槛保持；选项全部保留、同值并列，路线/构筑/休息仍交当前生产大脑，战斗由Jev执行。
四局原始状态从logs/states.jsonl按字节偏移回读，共2027帧与原留存逐对象相等；选取566帧留存在verified-evidence.jsonl，指纹见evidence-manifest.json。

|经验|账本|证据|处置|
|---|---|---|---|
|[silent-footwork-block](silent-footwork-block.md)|silent-0005|5PM6JAQG6FNQ F39 T4|duplicate|
|[silent-strength-weak-observation](silent-strength-weak-observation.md)|silent-0005、silent-0231|CA5KE8GFJ9X2 F13 T5|waiting|
|[silent-deck-burst-observation](silent-deck-burst-observation.md)|silent-0021、silent-0009|5PM6JAQG6FNQ F39 T2|waiting|
|[silent-noxious-fumes-growth](silent-noxious-fumes-growth.md)|silent-0011|5PM6JAQG6FNQ F33 T2|duplicate|
|[silent-bubble-bubble-condition](silent-bubble-bubble-condition.md)|silent-0010、silent-0009|5PM6JAQG6FNQ F39 T2|duplicate|
|[silent-accelerant-triggers](silent-accelerant-triggers.md)|silent-0027|61E2QS63Y9WU F17 T5|duplicate|
|[silent-outbreak-immediate-poison](silent-outbreak-immediate-poison.md)|silent-0037|5PM6JAQG6FNQ F39 T4|duplicate|
|[silent-afterimage-per-card-block](silent-afterimage-per-card-block.md)|silent-0007|CA5KE8GFJ9X2 F2 T1|duplicate|
|[silent-lagavulin-siphon-poison-sl](silent-lagavulin-siphon-poison-sl.md)|silent-0030、silent-0027|61E2QS63Y9WU F17 T6|waiting|
|[silent-obscura-summon-growth](silent-obscura-summon-growth.md)|silent-0039、silent-0209|61E2QS63Y9WU F23 T4|waiting|
|[silent-piercing-wail-temporary-strength](silent-piercing-wail-temporary-strength.md)|silent-0046、silent-0128|DUZUBAJ3A8GP F30 T5|waiting|
|[silent-letter-opener-third-skill](silent-letter-opener-third-skill.md)|silent-0055|5PM6JAQG6FNQ F39 T4|duplicate|
|[silent-anticipate-temporary-dexterity](silent-anticipate-temporary-dexterity.md)|silent-0080|DUZUBAJ3A8GP F30 T2|duplicate|
|[silent-mirage-poison-card-block](silent-mirage-poison-card-block.md)|silent-0010|DUZUBAJ3A8GP F30 T5|waiting|
|[silent-burst-next-skills-replay](silent-burst-next-skills-replay.md)|silent-0115|DUZUBAJ3A8GP F30 T6|duplicate|
|[silent-bronze-scales-per-hit-thorns](silent-bronze-scales-per-hit-thorns.md)|silent-0129|DUZUBAJ3A8GP F30 T6|waiting|
|[silent-slumbering-beetle-wake-growth](silent-slumbering-beetle-wake-growth.md)|silent-0128、silent-0079|DUZUBAJ3A8GP F30 T6|waiting|
|[silent-serpent-form-per-card-damage](silent-serpent-form-per-card-damage.md)|silent-0132|5PM6JAQG6FNQ F33 T1|waiting|
|[silent-fasten-defend-extra-block](silent-fasten-defend-extra-block.md)|silent-0143|DUZUBAJ3A8GP F30 T4|duplicate|
|[silent-infested-prism-tainted-skill-cost](silent-infested-prism-tainted-skill-cost.md)|silent-0168|DUZUBAJ3A8GP F27 T5|waiting|
|[silent-permafrost-first-power-block](silent-permafrost-first-power-block.md)|silent-0173|CA5KE8GFJ9X2 F13 T1|duplicate|
|[silent-lost-forgotten-possession](silent-lost-forgotten-possession.md)|silent-0183、silent-0005|5PM6JAQG6FNQ F39 T4|waiting|
|[silent-gardener-skittish-shield](silent-gardener-skittish-shield.md)|silent-0211、silent-0209|CA5KE8GFJ9X2 F9 T2|waiting|
|[silent-caltrops-thorns](silent-caltrops-thorns.md)|silent-0230|CA5KE8GFJ9X2 F13 T3|waiting|
|[silent-sewer-clam-pressure-growth](silent-sewer-clam-pressure-growth.md)|silent-0231|CA5KE8GFJ9X2 F13 T5|waiting|
|[silent-hunter-tender-card-attributes](silent-hunter-tender-card-attributes.md)|silent-0232|61E2QS63Y9WU F28 T2|waiting|
|[silent-zapbot-high-voltage-growth](silent-zapbot-high-voltage-growth.md)|silent-0233、silent-0209|5PM6JAQG6FNQ F38 T3|waiting|
|[silent-haze-group-poison-weak](silent-haze-group-poison-weak.md)|silent-0235|DUZUBAJ3A8GP F27 T4|waiting|

## CLI登记结果

- silent-footwork-block → silent-proposal-61d51ad5255ff47d：duplicate。
- silent-strength-weak-observation → silent-proposal-49632bc4878fb597：waiting。
- silent-deck-burst-observation → silent-proposal-66532328a585941f：waiting。
- silent-noxious-fumes-growth → silent-proposal-e811f9fe3b1c34e5：duplicate。
- silent-bubble-bubble-condition → silent-proposal-2f05905c397c3223：duplicate。
- silent-accelerant-triggers → silent-proposal-26221dcf765fd913：duplicate。
- silent-outbreak-immediate-poison → silent-proposal-8ce59566787877de：duplicate。
- silent-afterimage-per-card-block → silent-proposal-e7e09b65a704bfff：duplicate。
- silent-lagavulin-siphon-poison-sl → silent-proposal-43a76a31ba7bdcfa：waiting。
- silent-obscura-summon-growth → silent-proposal-5264153a4a4b0e5c：waiting。
- silent-piercing-wail-temporary-strength → silent-proposal-e0275838dbb45d18：waiting。
- silent-letter-opener-third-skill → silent-proposal-9397e5ee011c1663：duplicate。
- silent-anticipate-temporary-dexterity → silent-proposal-b7d95fdde39ed5ef：duplicate。
- silent-mirage-poison-card-block → silent-proposal-329a2629d5f1bf1e：waiting。
- silent-burst-next-skills-replay → silent-proposal-2167dba21e7a4902：duplicate。
- silent-bronze-scales-per-hit-thorns → silent-proposal-fcfc3568c08fd6da：waiting。
- silent-slumbering-beetle-wake-growth → silent-proposal-bddfa690a84e03d0：waiting。
- silent-serpent-form-per-card-damage → silent-proposal-60930500313a651d：waiting。
- silent-fasten-defend-extra-block → silent-proposal-4ef4320ee242f542：duplicate。
- silent-infested-prism-tainted-skill-cost → silent-proposal-c20b5139dd0dff71：waiting。
- silent-permafrost-first-power-block → silent-proposal-d01ced1dfd3ce8a0：duplicate。
- silent-lost-forgotten-possession → silent-proposal-ae9e692d680e3819：waiting。
- silent-gardener-skittish-shield → silent-proposal-246daedaa3021847：waiting。
- silent-caltrops-thorns → silent-proposal-f84be739ede0e40e：waiting。
- silent-sewer-clam-pressure-growth → silent-proposal-52f1e1bd2e7db0ed：waiting。
- silent-hunter-tender-card-attributes → silent-proposal-f6d98c52fdc345b0：waiting。
- silent-zapbot-high-voltage-growth → silent-proposal-6dd8bbff876be528：waiting。
- silent-haze-group-poison-weak → silent-proposal-1c51f79f5b69bf37：waiting。
