# Potions Jev drank outside a boss fight, and what each paid (tools/potion-drink-audit.py)

Chosen options that drink, with a potion_cost fact (potion cost live): 1421; outside a boss fight 862.

- Offered by: a solver line 652, the rollout's added best line 3, a random potion's "drink now" 207; flagged rollout_best 634.
- Paid the table's held value (cost > 0 in the chosen option's total): 837; 0: 25, every one on a board where the line's samples all die or every line loses all our HP (25 of 25): rollout.ts valueAt / pickRolloutBest, no later for the potion there (decision log 2026-09-30 15:24, open for Roy).
- Saturated boards (every line loses all our HP: ranked without costs): 49 choices in 27 fights, 14 of them won.
- The run plan's words on potions were in the question (run_plan_on_potions): 772.
- Death-saving (the chosen line died less often than the no-potion line within the horizon): 99.

## Cases

| run F | T | potion | path | cost paid | chosen: deaths | no-potion line: deaths | run plan on potions |
|---|---|---|---|---|---|---|---|
| AKK0 F14 | 1 | 固化药水 | rollout's added line | fight HP loss 3.8; potions used 1.8 (this turn: 固化药水 4.7 HP; later turns: 肌肉药水 in 6/8 samples); potion cost 6.6 HP (potion table, this act's held value, later turns' drinks averaged over the samples); total 10.3 | 0/8 | 0/8 | DeepSeek's run plan (F11), its words on potions: Preserve Flex for attack-heavy burst and Fortifier for Pressure Gun or explosion / Preserve Flex for burst and Fortifier for explosion |
| AKK0 F14 | 1 | 固化药水 | rollout's added line | fight HP loss 4.8; potions used 2 (this turn: 固化药水 4.7 HP; later turns: 肌肉药水 in 8/8 samples); potion cost 7.2 HP (potion table, this act's held value, later turns' drinks averaged over the samples); total 12 | 0/8 | 0/8 | DeepSeek's run plan (F11), its words on potions: Preserve Flex for attack-heavy burst and Fortifier for Pressure Gun or explosion / Preserve Flex for burst and Fortifier for explosion |
| ABCJ F30 | 1 | 鲜血药水 | solver line | fight HP loss 10; potions used 1 (this turn: 鲜血药水 16 HP); potion cost 16 HP (potion table, this act's held value); total 26 | 0/8 | 0/8 | DeepSeek's run plan (F29), its words on potions: reserve defensive potions for turn-four laser. / Avoid elites, heal before crab, and preserve boss potions. |
| ABCJ F44 | 1 | 能力药水 | random potion | fight HP loss 45.7; potions used 1 (this turn: 能力药水 17.3 HP); potion cost 17.3 HP (potion table, this act's held value); total 63 | 0/8 | 0/8 | DeepSeek's run plan (F42), its words on potions: Save both Power Potions for boss turn one / Heal both rests, avoid elites, and reserve both Power Potions for boss turn one. |
| ABCJ F46 | 1 | 能力药水 | random potion | fight HP loss 42.7; potions used 1 (this turn: 能力药水 17.3 HP); potion cost 17.3 HP (potion table, this act's held value); total 60 | 0/8 | 0/8 | DeepSeek's run plan (F42), its words on potions: Save both Power Potions for boss turn one / Heal both rests, avoid elites, and reserve both Power Potions for boss turn one. |
