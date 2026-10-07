# 静默 boss 模拟校准

Roy 授权的是角色隔离、整体 Platt、时间切分、原准入标准和定期重跑架构；下面样本、实胜败、拟合、残差及准入结论只来自已结束的 SILENT 对局。boss侧参数复用用户准许的既有模型/monster-db（含common），另记来源，不把它当作静默对局样本或校准参数。没有新增打法或策略阈值。

提取：84 局，378 次尝试；160 次有实际结局且取得首回合帧（模拟成功数另列）。冻结到已结束局 `2026-10-06T23:52:17.960Z`；未进入 boss 的局号/版本及完整筛选列表在 extraction.json。提取排除原因：`{"SL predicted_death: censored, no actual win/loss; no observed completed outcome": 217, "SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand": 1}`。
可用 74 局，实际结局 `{'won': 119, 'died': 41}`，各进阶场数 `{'0': 16, '1': 6, '2': 5, '3': 3, '4': 9, '5': 3, '6': 22, '7': 17, '8': 3, '9': 7, '10': 69}`。
SL predicted_death 是未实结算的截断样本，来源保留，不标实际败局；同一局全部 boss/SL 共享切分。校准胜率以有实际结局的尝试为条件，存在 SL 截断选择偏差，不是所有初试胜率或允许SL的整局通关率。开场我方资源取日志，boss HP/伤害/招式沿现有 monster-db 按进阶输入、缺级取最近观测，未重拟合 boss 侧。

SL口径：boss房间 161；初试结局 `{'predicted_death': 60, 'won': 99, 'died': 2}`，重试结局 `{'won': 20, 'predicted_death': 158, 'died': 39}`；没有实际结局的房间 `[{'run_id': 'TD1HVGS7H6LB', 'floor': 17}]`。失败重载仍不能补造实际败局；具体 reload 原记录随来源保留。

固定来源/模型：`{"simulator_base": "ff571cf0049ca3581588f453f8df630af4451b36", "model_sha256": "ed59a56ba276882dc276311b65b7887af9ce5e61bfadf1b62de4fd43396a2474", "samples": 200, "seed": 1, "seed_formula": "1 + original fight row index * 101", "method": "existing B1.5 policy, best order, t1 + pre/redeal, no rollout; default settings unchanged", "normalization": "existing syntheticBossStart first-hit formula, DB nearest ascension HP/damage, actual opening powers/resources", "original_results": {"/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration/results/results-0.jsonl": "75a964104f8d260d952b74f8787c09c8b43f5e60f45a50ad0c539c2f856c4d50", "/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration/results/results-1.jsonl": "958c73584d71729256978a6b7a8d2baa8866041f18b9d0e93fe22fb8d5cc56fd"}, "corrected_results": {"/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration/corrected-results/results-0.jsonl": "12003594271f6571aff5a01719e6928a1db3c9a2070dcbcd2f0835253000724e", "/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration/corrected-results/results-1.jsonl": "e666411f802893eb31bc8d761f4cd96ae20e524633bf746d1158e26c0d3d9ede"}, "assembly": {"original_pairs": 320, "unchanged_fights": 136, "corrected_fights": 24, "rule": "opening audit identifies changed first-hit inputs; replace all t1/pre pairs for those keys, original indexes/seeds retained"}, "original_error_role_attribution": [{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "source": "exact frozen fight + raw T1 run.character_id=SILENT; error branch omitted the original output tag"}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "source": "exact frozen fight + raw T1 run.character_id=SILENT; error branch omitted the original output tag"}], "opening_audit_sha256": "a93ee24c3f2dbdce45f85147654c4ec2a04ab62cb85621e4834b46d14e0dae58", "opening_source_integrity_sha256": "c5c6d45b71a5ae4a499c4532071d4ac5d48d5f5f80ebaff56fc9fab18fba81fa", "model_input_audit_sha256": "b7122281323651484a232399c5e34c24d37e5c3d8417fb0accab65f2a06d524c", "censored_actual_hp_audit_sha256": "e1fe66a49fd122fb7320d69fb6f9a4c1c7b9226f01ff05c02a30cc125917ca39", "final_results_sha256": "8e3586a99598c5bf7ac87d7c0af74b36fffa31fdf8550e246f0c4d073000585d", "boss_input_scope": {"A10_fights": 69, "A10_opening_parts": 93, "A10_exact_hp_parts": 93, "A10_attack_definitions": 49, "A10_nearest_A9_definitions": [{"enemy": "QUEEN", "move": "EXECUTION_MOVE", "damage": {"perHit": 18, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 18, "ratioN": 1, "ratioOwn": true, "ratioTo": 10}}, {"enemy": "TEST_SUBJECT", "move": "BIG_POUNCE", "damage": {"perHit": 45, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 45, "ratioN": 4, "ratioOwn": true, "ratioTo": 10}}]}, "dataset_sha256": "86a167a41cda92bf3f4b0498529a76a8aefa5c4639af346b496e1533826e7e7d", "sources_sha256": "934ae5b1511760ebd6069e470de333a96d91d94906ce7252a75013a7aacda5a8", "versions": {"tune": ["0a066c2f+dirty", "0d0c4b69+dirty", "103fd5ff+dirty", "141df614+dirty", "1e047a36+dirty", "25a408ef+dirty", "2c81eb76+dirty", "2ec81b9f+dirty", "3a2a2a48+dirty", "3cbc6955+dirty", "3ebbdc6c+dirty", "41bd4a44+dirty", "42ac6c1d+dirty", "452f7bc7+dirty", "45965f49+dirty", "473a62f4+dirty", "48f2bf5a+dirty", "4915e3b3+dirty", "5ae08a3d+dirty", "5de5d518", "5de5d518+dirty", "6566b7d3+dirty", "65d99e74+dirty", "7be569b1+dirty", "7bea7d99+dirty", "7c7f22e3+dirty", "86b24a1f+dirty", "8b268858+dirty", "8d79fd5b+dirty", "9692ea6d+dirty", "9852b39f+dirty", "9988ca8b+dirty", "9e0fda2e+dirty", "a999dba8+dirty", "b9c46d66+dirty", "bb19732f+dirty", "bf3ebb7c", "bf63ab40+dirty", "c4c7ad97+dirty", "ccf1fcde+dirty", "d283e641+dirty", "d9a3ea37+dirty", "ee1f4fd1+dirty", "f1d951ec+dirty"], "val": ["0068600d+dirty", "0581ecb3+dirty", "09ac8004+dirty", "0fd8e845+dirty", "1a89c2d4+dirty", "28e339fa+dirty", "3599ab0a+dirty", "3caa860b+dirty", "4fb81b17+dirty", "56c64ff8+dirty", "6ac57ea6+dirty", "74f82413+dirty", "98d2d508+dirty", "9e20ade9+dirty", "ad01f74a+dirty", "b219de68+dirty", "be0ee6df+dirty", "cc1bdc59+dirty", "d4026dbb+dirty", "da2ccb92+dirty", "e33ca6e0+dirty", "e8a6fb71+dirty", "eabdd307+dirty", "ebd920b4+dirty", "f8e01696+dirty"]}, "completed_max_asc": 10}`。所有输入文件 SHA256 在同批 provenance.json。筛选读取总日志索引元信息，但没有纳入铁甲对局样本或校准参数，角色统计输入只取静默目录。common monster-db 是用户准许复用的既有模型；它已有的观测数值固定使用，验证的是静默胜率映射，不宣称从零预测未观测 boss 机制。
固定切点 `2026-10-06T02:46:11.648000`（UTC，与日志ts同口径），调参 107 场、验证 53 场；验证覆盖后期代码，完整版本逐项在来源表。每起点 200 样本，固定 seed=1（逐战seed=1+原始行号×101），模拟策略/费用/药水/保血/目标/SL阈值保持原样。

进阶项只作一个整体模型的统计校正，不解释为进阶机制的因果效应；版本、资源和SL选择与进阶共变。某进阶段验证 n=0 时，只有调参残差，没有该段独立的样本外可靠性证据。上线保留后来其他批次的代码修复和知识刷新；本表仅验证所列固定模型，不冒称后续模型版本已通过相同验证，下一次定期重跑固定当时的模型。

B2 用首回合起点；B3 用既有 pre/redeal 方法：实际首回合资源、全副牌重洗并重新抽开场手牌，不使用后续观测。B2 中途沿同一整体首回合映射，其独立中途校准未验证；铁甲映射保持原值。

A10 的 F48 胜只算该战胜利，不算整局通关；F49 是另一场独立 boss 战，以下列出本角色来源。怪物数值来源的 exact/nearest 及伤害估值在 results 的 bossSource 内，common 是用户准许复用的既有模型，校准参数不复用铁甲。

## A10 数值与 F49 范围

数值审计：`{"A10_fights": 69, "A10_opening_parts": 93, "A10_exact_hp_parts": 93, "A10_attack_definitions": 49, "A10_nearest_A9_definitions": [{"enemy": "QUEEN", "move": "EXECUTION_MOVE", "damage": {"perHit": 18, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 18, "ratioN": 1, "ratioOwn": true, "ratioTo": 10}}, {"enemy": "TEST_SUBJECT", "move": "BIG_POUNCE", "damage": {"perHit": 45, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 45, "ratioN": 4, "ratioOwn": true, "ratioTo": 10}}]}`。完整开场及后续攻击定义的数值来源另见 opening-audit.json / model-input-audit.json，缺级沿既有 nearest/ratio 方法。

F49 实际结局 3 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。

| 局号 | boss | 尝试 | 回合 | 结局 | 代码 |
|---|---|---|---|---|---|
| JMH5C51RLN4E | AEONGLASS | 6 | 1 | died | 41bd4a44+dirty |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | 141df614+dirty |
| ZVYUL2YP3518 | TEST_SUBJECT | 6 | 8 | died | 6ac57ea6+dirty |

## B2 / t1

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=53（候选53），校准 Brier=0.1186；Platt={'a': 2.0561, 'b': 0.4347, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0, "brier": 0.1406, "mean_pred": 0.763, "actual_win": 0.763, "leak_ratio": 1.232}, "A5–9": {"n": 52, "gap": -0.010000000000000009, "brier": 0.0843, "mean_pred": 0.798, "actual_win": 0.808, "leak_ratio": 1.199}, "A10": {"n": 16, "gap": 0.031000000000000028, "brier": 0.1234, "mean_pred": 0.656, "actual_win": 0.625, "leak_ratio": 1.33}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.763 | 0.763 | 0.0 | 0.1406 | 1.232 |
| tune | A5–9 | 52 | 0.798 | 0.808 | -0.010000000000000009 | 0.0843 | 1.199 |
| tune | A10 | 16 | 0.656 | 0.625 | 0.031000000000000028 | 0.1234 | 1.33 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 53 | 0.749 | 0.698 | 0.051000000000000045 | 0.1186 | 1.275 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 3 | 7 | 0.5643 | 0.71/0.0 | 2.238 | n,brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 5 | 5 | 0.0401 | 0.785/0.8 | 1.097 | n | 低 |
| 帝王蟹 (KAISER_CRAB) | 9 | 1 | 0.098 | 0.66/0.667 | 1.221 | n | 低 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 4 | 6 | 0.061 | 0.777/1.0 | 1.012 | n,gap | 低 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 6 | 4 | 0.0465 | 0.76/0.667 | 0.93 | n | 低 |
| 女王 (QUEEN) | 2 | 8 | 0.3838 | 0.904/0.5 | 0.951 | n,brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 2 | 8 | 0.007 | 0.933/1.0 | 1.16 | n | 低 |
| 实验体 (TEST_SUBJECT) | 3 | 7 | 0.1339 | 0.366/0.0 | 2.834 | n,gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 4 | 6 | 0.1611 | 0.549/0.75 | 1.533 | n,brier,gap,leak | 低 |
| 同族 (THE_KIN) | 4 | 6 | 0.2294 | 0.874/0.75 | 1.337 | n,brier,leak | 低 |
| 墨影幻灵 (VANTOM) | 4 | 6 | 0.0025 | 0.968/1.0 | 0.916 | n | 低 |
| 瀑布巨兽 (WATERFALL_GIANT) | 7 | 3 | 0.0332 | 0.813/0.857 | 0.804 | n | 低 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.366, "brier": 0.1339, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.366, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 1.0, "actual_enemy": 8.0, "enemy_ratio": 0.125, "sim_loss": 1.0, "actual_loss": 8.0, "loss_ratio": 0.125}}, "val": {"n": 1, "actual_win": 0.0, "mean_pred": 0.366, "brier": 0.1339, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 1, "pred": 0.366, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 6, "sim_enemy": 19.73, "actual_enemy": 5.33, "enemy_ratio": 3.7, "sim_loss": 19.73, "actual_loss": 5.33, "loss_ratio": 3.7}}}}`。验证还差 9 场；范围限制：`{"49": "F49独立战：验证集只有 1 场（至少要 10 场）; 偏乐观：预测平均胜率 37%，实际 0%; 模拟每回合被打穿的血是实际的 3.70 倍"}`。

## B3 / pre

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=53（候选53），校准 Brier=0.1137；Platt={'a': 2.2581, 'b': 0.4892, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": -0.0010000000000000009, "brier": 0.1419, "mean_pred": 0.762, "actual_win": 0.763, "leak_ratio": 1.284}, "A5–9": {"n": 52, "gap": -0.008000000000000007, "brier": 0.0863, "mean_pred": 0.8, "actual_win": 0.808, "leak_ratio": 1.262}, "A10": {"n": 16, "gap": 0.026000000000000023, "brier": 0.1236, "mean_pred": 0.651, "actual_win": 0.625, "leak_ratio": 1.341}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.762 | 0.763 | -0.0010000000000000009 | 0.1419 | 1.284 |
| tune | A5–9 | 52 | 0.8 | 0.808 | -0.008000000000000007 | 0.0863 | 1.262 |
| tune | A10 | 16 | 0.651 | 0.625 | 0.026000000000000023 | 0.1236 | 1.341 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 53 | 0.749 | 0.698 | 0.051000000000000045 | 0.1137 | 1.27 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 3 | 7 | 0.5673 | 0.707/0.0 | 2.371 | n,brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 5 | 5 | 0.0346 | 0.787/0.8 | 1.165 | n | 低 |
| 帝王蟹 (KAISER_CRAB) | 9 | 1 | 0.0948 | 0.652/0.667 | 1.216 | n | 低 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 4 | 6 | 0.0465 | 0.8/1.0 | 0.972 | n,gap | 低 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 6 | 4 | 0.0392 | 0.753/0.667 | 1.143 | n | 低 |
| 女王 (QUEEN) | 2 | 8 | 0.3995 | 0.925/0.5 | 0.85 | n,brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 2 | 8 | 0.0115 | 0.921/1.0 | 1.071 | n | 低 |
| 实验体 (TEST_SUBJECT) | 3 | 7 | 0.114 | 0.338/0.0 | 2.58 | n,gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 4 | 6 | 0.1565 | 0.553/0.75 | 1.557 | n,brier,gap,leak | 低 |
| 同族 (THE_KIN) | 4 | 6 | 0.22 | 0.881/0.75 | 1.343 | n,brier,leak | 低 |
| 墨影幻灵 (VANTOM) | 4 | 6 | 0.0018 | 0.975/1.0 | 0.87 | n | 低 |
| 瀑布巨兽 (WATERFALL_GIANT) | 7 | 3 | 0.0284 | 0.819/0.857 | 0.789 | n | 低 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.338, "brier": 0.114, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.338, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 0.4, "actual_enemy": 8.0, "enemy_ratio": 0.05, "sim_loss": 0.4, "actual_loss": 8.0, "loss_ratio": 0.05}}, "val": {"n": 1, "actual_win": 0.0, "mean_pred": 0.338, "brier": 0.114, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 1, "pred": 0.338, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 6, "sim_enemy": 18.82, "actual_enemy": 5.33, "enemy_ratio": 3.528, "sim_loss": 18.82, "actual_loss": 5.33, "loss_ratio": 3.528}}}}`。验证还差 9 场；范围限制：`{"49": "F49独立战：验证集只有 1 场（至少要 10 场）; 偏乐观：预测平均胜率 34%，实际 0%; 模拟每回合被打穿的血是实际的 3.53 倍"}`。

## 定期刷新

运维调度 tick（每小时 :13/:43，另在学习批次完成事件检查）读取已完成的静默局和 boss 尝试；升阶或新增20次实际结局 boss尝试时启动独占校准任务。SL截断不凑20场。入口 agent/tools/boss-sim/refresh-silent.py；旧切点/调参keys固定，新局只进验证；生成独立内容指纹目录，重复输入跳过，旧报告和来源留存。达标名单由 trust.py --character silent 自动生成，仍由学习者依锁内测试/合入流程发布和增加唯一版本，运维核实际后登记shipped。只写静默 boss-trust，不刷新其他角色数据。

## 无 boss 记录的已结束局

| 局号 | A | 结束层 | 代码 | 排除原因 |
|---|---|---|---|---|
| FH2HB2X17F2H | 6 | 6 | f8229263+dirty | no logged boss attempt |
| MCCK2602T1SR | 10 | 7 | 4fb81b17+dirty | no logged boss attempt |
| U8K28UUGYP3U | 10 | 11 | 4fb81b17+dirty | no logged boss attempt |
| CRK2HNYKSCZC | 10 | 11 | 884c9f33+dirty | no logged boss attempt |
| V0383V5S9BCQ | 10 | 11 | 3ac2445a+dirty | no logged boss attempt |
| WYB0NCD6W83J | 10 | 15 | e33ca6e0+dirty | no logged boss attempt |
| 87LCSDR5P3DL | 10 | 9 | e33ca6e0+dirty | no logged boss attempt |
| 02HB4L0C3C67 | 10 | 12 | e33ca6e0+dirty | no logged boss attempt |
| T3FW7R2R2306 | 10 | 8 | 98df162d+dirty | no logged boss attempt |

## 完整来源清单

原始 states byte offset/len/SHA256、SL区间、逐战回合和排除原因另存 sources.jsonl；每项以下列出，不把模型错误/缺记录冒报通过。

| 局号 | boss | A | 层 | 尝试 | 回合 | 代码（局级，dirty不冒充复原） | 切分 | 结局/排除 |
|---|---|---|---|---|---|---|---|---|
| C48LLXBGKXQ9 | WATERFALL_GIANT | 0 | 17 | 1 | 19 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | WATERFALL_GIANT | 0 | 17 | 2 | 15 | bf3ebb7c | tune | won |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 1 | 12 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 2 | 11 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 3 | 14 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 4 | 13 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 5 | 13 | bf3ebb7c | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C48LLXBGKXQ9 | THE_INSATIABLE | 0 | 33 | 6 | 11 | bf3ebb7c | tune | died |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 1 | 10 | 9692ea6d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 2 | 9 | 9692ea6d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 3 | 9 | 9692ea6d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 4 | 9 | 9692ea6d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 5 | 8 | 9692ea6d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y6GM2CHWJBEY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0 | 17 | 6 | 10 | 9692ea6d+dirty | tune | died |
| LRN0HPZ0FZS1 | CEREMONIAL_BEAST | 0 | 17 | 1 | 12 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| LRN0HPZ0FZS1 | CEREMONIAL_BEAST | 0 | 17 | 2 | 11 | 8d79fd5b+dirty | tune | won |
| LRN0HPZ0FZS1 | THE_INSATIABLE | 0 | 33 | 1 | 8 | 8d79fd5b+dirty | tune | won |
| LRN0HPZ0FZS1 | AEONGLASS | 0 | 48 | 1 | 8 | 8d79fd5b+dirty | tune | died |
| T082DRCUHRRD | SOUL_FYSH | 0 | 17 | 1 | 13 | 8d79fd5b+dirty | tune | won |
| T082DRCUHRRD | CRUSHER+ROCKET | 0 | 33 | 1 | 9 | 8d79fd5b+dirty | tune | won |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 1 | 9 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 2 | 9 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 3 | 10 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 4 | 9 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 5 | 8 | 8d79fd5b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T082DRCUHRRD | TEST_SUBJECT | 0 | 48 | 6 | 11 | 8d79fd5b+dirty | tune | died |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 1 | 12 | 4915e3b3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 2 | 10 | 4915e3b3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 3 | 12 | 4915e3b3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 4 | 12 | 4915e3b3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 5 | 12 | 4915e3b3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1HC609GTLGN3 | LAGAVULIN_MATRIARCH | 0 | 17 | 6 | 12 | 4915e3b3+dirty | tune | won |
| R0HEV5E3QT6G | WATERFALL_GIANT | 0 | 17 | 1 | 14 | 5de5d518 | tune | won |
| R0HEV5E3QT6G | THE_INSATIABLE | 0 | 33 | 1 | 8 | 5de5d518 | tune | won |
| R0HEV5E3QT6G | TEST_SUBJECT | 0 | 48 | 1 | 5 | 5de5d518 | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R0HEV5E3QT6G | TEST_SUBJECT | 0 | 48 | 2 | 5 | 5de5d518 | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand |
| R0HEV5E3QT6G | TEST_SUBJECT | 0 | 48 | 3 | 3 | 5de5d518 | tune | died |
| KAY522KT5NXR | SOUL_FYSH | 0 | 17 | 1 | 13 | 5de5d518+dirty | tune | won |
| KAY522KT5NXR | KNOWLEDGE_DEMON | 0 | 33 | 1 | 11 | 5de5d518+dirty | tune | won |
| KAY522KT5NXR | TEST_SUBJECT | 0 | 48 | 1 | 11 | 5de5d518+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KAY522KT5NXR | TEST_SUBJECT | 0 | 48 | 2 | 14 | 5de5d518+dirty | tune | won |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 1 | 12 | 7be569b1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 2 | 12 | 7be569b1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 3 | 12 | 7be569b1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 4 | 12 | 7be569b1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 5 | 12 | 7be569b1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6AVMMVCSRPC | LAGAVULIN_MATRIARCH | 1 | 17 | 6 | 12 | 7be569b1+dirty | tune | died |
| XYYQYBRM2A01 | WATERFALL_GIANT | 1 | 17 | 1 | 14 | bb19732f+dirty | tune | won |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 1 | 10 | bb19732f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 2 | 10 | bb19732f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 3 | 9 | bb19732f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 4 | 10 | bb19732f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 5 | 7 | bb19732f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XYYQYBRM2A01 | THE_INSATIABLE | 1 | 33 | 6 | 10 | bb19732f+dirty | tune | died |
| K3676LU8B0UH | LAGAVULIN_MATRIARCH | 1 | 17 | 1 | 10 | ccf1fcde+dirty | tune | won |
| K3676LU8B0UH | KNOWLEDGE_DEMON | 1 | 33 | 1 | 10 | ccf1fcde+dirty | tune | won |
| K3676LU8B0UH | AEONGLASS | 1 | 48 | 1 | 11 | ccf1fcde+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| K3676LU8B0UH | AEONGLASS | 1 | 48 | 2 | 12 | ccf1fcde+dirty | tune | won |
| CSBR5CRDWQNB | WATERFALL_GIANT | 2 | 17 | 1 | 9 | c4c7ad97+dirty | tune | won |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 1 | 4 | c4c7ad97+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 2 | 4 | c4c7ad97+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 3 | 4 | c4c7ad97+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 4 | 4 | c4c7ad97+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 5 | 4 | c4c7ad97+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSBR5CRDWQNB | CRUSHER+ROCKET | 2 | 33 | 6 | 4 | c4c7ad97+dirty | tune | died |
| ZZMYZ5UBCG72 | LAGAVULIN_MATRIARCH | 2 | 17 | 1 | 11 | b9c46d66+dirty | tune | won |
| ZZMYZ5UBCG72 | THE_INSATIABLE | 2 | 33 | 1 | 5 | b9c46d66+dirty | tune | won |
| ZZMYZ5UBCG72 | QUEEN+TORCH_HEAD_AMALGAM | 2 | 48 | 1 | 8 | b9c46d66+dirty | tune | won |
| 10GPK5XGHCK3 | SOUL_FYSH | 3 | 17 | 1 | 9 | 9e0fda2e+dirty | tune | won |
| 10GPK5XGHCK3 | KNOWLEDGE_DEMON | 3 | 33 | 1 | 8 | 9e0fda2e+dirty | tune | won |
| 10GPK5XGHCK3 | TEST_SUBJECT | 3 | 48 | 1 | 13 | 9e0fda2e+dirty | tune | won |
| 1NZ8FE5F34R9 | LAGAVULIN_MATRIARCH | 4 | 17 | 1 | 6 | 45965f49+dirty | tune | won |
| F9PP859XZ3RJ | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 4 | 17 | 1 | 9 | d283e641+dirty | tune | won |
| F9PP859XZ3RJ | KNOWLEDGE_DEMON | 4 | 33 | 1 | 10 | d283e641+dirty | tune | won |
| 9YBKCNBFP0X5 | CEREMONIAL_BEAST | 4 | 17 | 1 | 9 | d9a3ea37+dirty | tune | won |
| 9YBKCNBFP0X5 | CRUSHER+ROCKET | 4 | 33 | 1 | 10 | d9a3ea37+dirty | tune | won |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 1 | 8 | d9a3ea37+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 2 | 9 | d9a3ea37+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 3 | 8 | d9a3ea37+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 4 | 9 | d9a3ea37+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 5 | 7 | d9a3ea37+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YBKCNBFP0X5 | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 6 | 9 | d9a3ea37+dirty | tune | died |
| 1LMBFGSMCWKU | WATERFALL_GIANT | 4 | 17 | 1 | 10 | 86b24a1f+dirty | tune | won |
| 1LMBFGSMCWKU | KNOWLEDGE_DEMON | 4 | 33 | 1 | 10 | 86b24a1f+dirty | tune | won |
| 1LMBFGSMCWKU | QUEEN+TORCH_HEAD_AMALGAM | 4 | 48 | 1 | 11 | 86b24a1f+dirty | tune | won |
| ZE8F192FKX24 | WATERFALL_GIANT | 5 | 17 | 1 | 8 | 452f7bc7+dirty | tune | won |
| ZE8F192FKX24 | KNOWLEDGE_DEMON | 5 | 33 | 1 | 9 | 452f7bc7+dirty | tune | won |
| ZE8F192FKX24 | AEONGLASS | 5 | 48 | 1 | 11 | 452f7bc7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZE8F192FKX24 | AEONGLASS | 5 | 48 | 2 | 12 | 452f7bc7+dirty | tune | won |
| UACFSW4VDDLD | VANTOM | 6 | 17 | 1 | 11 | 103fd5ff+dirty | tune | won |
| UACFSW4VDDLD | KNOWLEDGE_DEMON | 6 | 33 | 1 | 14 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | KNOWLEDGE_DEMON | 6 | 33 | 2 | 14 | 103fd5ff+dirty | tune | won |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 1 | 10 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 2 | 9 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 3 | 11 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 4 | 7 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 5 | 7 | 103fd5ff+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UACFSW4VDDLD | TEST_SUBJECT | 6 | 48 | 6 | 9 | 103fd5ff+dirty | tune | died |
| VN7RQJMJEFMX | WATERFALL_GIANT | 6 | 17 | 1 | 9 | 42ac6c1d+dirty | tune | won |
| VN7RQJMJEFMX | KNOWLEDGE_DEMON | 6 | 33 | 1 | 14 | 42ac6c1d+dirty | tune | won |
| 75X1BARMNZ03 | CEREMONIAL_BEAST | 6 | 17 | 1 | 10 | 0a066c2f+dirty | tune | won |
| ARKQLHG6RS4W | SOUL_FYSH | 6 | 17 | 1 | 9 | 25a408ef+dirty | tune | won |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 1 | 4 | 25a408ef+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 2 | 4 | 25a408ef+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 3 | 4 | 25a408ef+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 4 | 4 | 25a408ef+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 5 | 4 | 25a408ef+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ARKQLHG6RS4W | CRUSHER+ROCKET | 6 | 33 | 6 | 4 | 25a408ef+dirty | tune | died |
| 6EV5V6PJJS9D | WATERFALL_GIANT | 6 | 17 | 1 | 10 | 3ebbdc6c+dirty | tune | won |
| 6EV5V6PJJS9D | KNOWLEDGE_DEMON | 6 | 33 | 1 | 9 | 3ebbdc6c+dirty | tune | won |
| 8CFMW9SAGFWQ | CEREMONIAL_BEAST | 6 | 17 | 1 | 13 | 7c7f22e3+dirty | tune | won |
| 2L1BNN9ZJEFU | WATERFALL_GIANT | 6 | 17 | 1 | 9 | 7c7f22e3+dirty | tune | won |
| 2L1BNN9ZJEFU | CRUSHER+ROCKET | 6 | 33 | 1 | 10 | 7c7f22e3+dirty | tune | won |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 1 | 5 | 7c7f22e3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 2 | 5 | 7c7f22e3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 3 | 5 | 7c7f22e3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 4 | 9 | 7c7f22e3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 5 | 9 | 7c7f22e3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2L1BNN9ZJEFU | TEST_SUBJECT | 6 | 48 | 6 | 9 | 7c7f22e3+dirty | tune | died |
| 53FLQ68CETW0 | WATERFALL_GIANT | 6 | 17 | 1 | 9 | ee1f4fd1+dirty | tune | won |
| 53FLQ68CETW0 | CRUSHER+ROCKET | 6 | 33 | 1 | 11 | ee1f4fd1+dirty | tune | won |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 1 | 11 | ee1f4fd1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 2 | 11 | ee1f4fd1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 3 | 10 | ee1f4fd1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 4 | 11 | ee1f4fd1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 5 | 13 | ee1f4fd1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53FLQ68CETW0 | AEONGLASS | 6 | 48 | 6 | 11 | ee1f4fd1+dirty | tune | died |
| ENKYQMS9W4ZD | SOUL_FYSH | 6 | 17 | 1 | 8 | 65d99e74+dirty | tune | won |
| ENKYQMS9W4ZD | THE_INSATIABLE | 6 | 33 | 1 | 11 | 65d99e74+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ENKYQMS9W4ZD | THE_INSATIABLE | 6 | 33 | 2 | 6 | 65d99e74+dirty | tune | won |
| 2SU6XN2AEJRD | VANTOM | 6 | 17 | 1 | 7 | 2ec81b9f+dirty | tune | won |
| 2SU6XN2AEJRD | THE_INSATIABLE | 6 | 33 | 1 | 8 | 2ec81b9f+dirty | tune | won |
| 2SU6XN2AEJRD | AEONGLASS | 6 | 48 | 1 | 10 | 2ec81b9f+dirty | tune | won |
| SADL3CGYTGSR | SOUL_FYSH | 7 | 17 | 1 | 9 | 2c81eb76+dirty | tune | won |
| SADL3CGYTGSR | KNOWLEDGE_DEMON | 7 | 33 | 1 | 12 | 2c81eb76+dirty | tune | won |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 1 | 10 | 2c81eb76+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 2 | 10 | 2c81eb76+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 3 | 10 | 2c81eb76+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 4 | 8 | 2c81eb76+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 5 | 11 | 2c81eb76+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SADL3CGYTGSR | AEONGLASS | 7 | 48 | 6 | 7 | 2c81eb76+dirty | tune | died |
| Z6CFLDR3N4SB | LAGAVULIN_MATRIARCH | 7 | 17 | 1 | 11 | 48f2bf5a+dirty | tune | won |
| Z6CFLDR3N4SB | KNOWLEDGE_DEMON | 7 | 33 | 1 | 14 | 48f2bf5a+dirty | tune | won |
| Z6CFLDR3N4SB | AEONGLASS | 7 | 48 | 1 | 10 | 48f2bf5a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Z6CFLDR3N4SB | AEONGLASS | 7 | 48 | 2 | 11 | 48f2bf5a+dirty | tune | died |
| 3KME36ADUE4U | CEREMONIAL_BEAST | 7 | 17 | 1 | 7 | 5ae08a3d+dirty | tune | won |
| VLV17NUSFS61 | LAGAVULIN_MATRIARCH | 7 | 17 | 1 | 10 | 7bea7d99+dirty | tune | won |
| VLV17NUSFS61 | KNOWLEDGE_DEMON | 7 | 33 | 1 | 10 | 7bea7d99+dirty | tune | won |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 1 | 5 | 7bea7d99+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 2 | 5 | 7bea7d99+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 3 | 6 | 7bea7d99+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 4 | 5 | 7bea7d99+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 5 | 5 | 7bea7d99+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VLV17NUSFS61 | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 6 | 5 | 7bea7d99+dirty | tune | died |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 1 | 13 | 0d0c4b69+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 2 | 16 | 0d0c4b69+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 3 | 17 | 0d0c4b69+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 4 | 14 | 0d0c4b69+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 5 | 9 | 0d0c4b69+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9YT51CK8RC39 | CEREMONIAL_BEAST | 7 | 17 | 6 | 14 | 0d0c4b69+dirty | tune | died |
| 2PVLGRBGUX9S | VANTOM | 7 | 17 | 1 | 8 | 9988ca8b+dirty | tune | won |
| 2PVLGRBGUX9S | THE_INSATIABLE | 7 | 33 | 1 | 9 | 9988ca8b+dirty | tune | won |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 1 | 13 | 9988ca8b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 2 | 13 | 9988ca8b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 3 | 11 | 9988ca8b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 4 | 13 | 9988ca8b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 5 | 13 | 9988ca8b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PVLGRBGUX9S | AEONGLASS | 7 | 48 | 6 | 12 | 9988ca8b+dirty | tune | died |
| 4Y94N8RDPGPM | CEREMONIAL_BEAST | 7 | 17 | 1 | 10 | 8b268858+dirty | tune | won |
| 4Y94N8RDPGPM | KNOWLEDGE_DEMON | 7 | 33 | 1 | 10 | 8b268858+dirty | tune | won |
| 4Y94N8RDPGPM | QUEEN+TORCH_HEAD_AMALGAM | 7 | 48 | 1 | 15 | 8b268858+dirty | tune | won |
| LLYSRQQ35AVW | CEREMONIAL_BEAST | 8 | 17 | 1 | 6 | bf63ab40+dirty | tune | won |
| LLYSRQQ35AVW | CRUSHER+ROCKET | 8 | 33 | 1 | 5 | bf63ab40+dirty | tune | won |
| LLYSRQQ35AVW | QUEEN+TORCH_HEAD_AMALGAM | 8 | 48 | 1 | 7 | bf63ab40+dirty | tune | won |
| HMVJKM56S4Q8 | LAGAVULIN_MATRIARCH | 9 | 17 | 1 | 12 | 6566b7d3+dirty | tune | won |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 1 | 4 | 6566b7d3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 2 | 4 | 6566b7d3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 3 | 4 | 6566b7d3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 4 | 4 | 6566b7d3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 5 | 4 | 6566b7d3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HMVJKM56S4Q8 | CRUSHER+ROCKET | 9 | 33 | 6 | 4 | 6566b7d3+dirty | tune | died |
| F4QKG4J1AJJZ | CEREMONIAL_BEAST | 9 | 17 | 1 | 9 | 3a2a2a48+dirty | tune | won |
| F4QKG4J1AJJZ | CRUSHER+ROCKET | 9 | 33 | 1 | 10 | 3a2a2a48+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| F4QKG4J1AJJZ | CRUSHER+ROCKET | 9 | 33 | 2 | 9 | 3a2a2a48+dirty | tune | won |
| G403VCZ3BH1B | SOUL_FYSH | 9 | 17 | 1 | 8 | 473a62f4+dirty | tune | won |
| G403VCZ3BH1B | CRUSHER+ROCKET | 9 | 33 | 1 | 7 | 473a62f4+dirty | tune | won |
| G403VCZ3BH1B | QUEEN+TORCH_HEAD_AMALGAM | 9 | 48 | 1 | 10 | 473a62f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G403VCZ3BH1B | QUEEN+TORCH_HEAD_AMALGAM | 9 | 48 | 2 | 11 | 473a62f4+dirty | tune | won |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 1 | 4 | a999dba8+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 2 | 4 | a999dba8+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 3 | 4 | a999dba8+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 4 | 4 | a999dba8+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 5 | 4 | a999dba8+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MGA0CZDDKC0P | CEREMONIAL_BEAST | 10 | 17 | 6 | 3 | a999dba8+dirty | tune | died |
| 25226ZFLNR1J | SOUL_FYSH | 10 | 17 | 1 | 14 | 9852b39f+dirty | tune | won |
| 25226ZFLNR1J | THE_INSATIABLE | 10 | 33 | 1 | 11 | 9852b39f+dirty | tune | won |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 1 | 8 | 9852b39f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 2 | 7 | 9852b39f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 3 | 6 | 9852b39f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 4 | 8 | 9852b39f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 5 | 7 | 9852b39f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25226ZFLNR1J | AEONGLASS | 10 | 48 | 6 | 8 | 9852b39f+dirty | tune | died |
| JLN5SK17W4FQ | WATERFALL_GIANT | 10 | 17 | 1 | 10 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | WATERFALL_GIANT | 10 | 17 | 2 | 10 | f1d951ec+dirty | tune | won |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 2 | 6 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 3 | 7 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 4 | 7 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 5 | 7 | f1d951ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JLN5SK17W4FQ | CRUSHER+ROCKET | 10 | 33 | 6 | 9 | f1d951ec+dirty | tune | died |
| JMH5C51RLN4E | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | 41bd4a44+dirty | tune | won |
| JMH5C51RLN4E | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | 41bd4a44+dirty | tune | won |
| JMH5C51RLN4E | TEST_SUBJECT | 10 | 48 | 1 | 6 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | TEST_SUBJECT | 10 | 48 | 2 | 6 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | TEST_SUBJECT | 10 | 48 | 3 | 4 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | TEST_SUBJECT | 10 | 48 | 4 | 6 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | TEST_SUBJECT | 10 | 48 | 5 | 13 | 41bd4a44+dirty | tune | won |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 1 | 1 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 2 | 1 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 3 | 1 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 4 | 1 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 5 | 1 | 41bd4a44+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JMH5C51RLN4E | AEONGLASS | 10 | 49 | 6 | 1 | 41bd4a44+dirty | tune | died |
| 9TG1RP5LFAAK | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | 141df614+dirty | tune | won |
| 9TG1RP5LFAAK | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | 141df614+dirty | tune | won |
| 9TG1RP5LFAAK | TEST_SUBJECT | 10 | 48 | 1 | 9 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | TEST_SUBJECT | 10 | 48 | 2 | 16 | 141df614+dirty | tune | won |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 3 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 3 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 3 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 3 | 141df614+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 3 | 141df614+dirty | tune | died |
| JQPT83P8KDSZ | SOUL_FYSH | 10 | 17 | 1 | 11 | 3cbc6955+dirty | tune | won |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 8 | 1e047a36+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 7 | 1e047a36+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 7 | 1e047a36+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 7 | 1e047a36+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 7 | 1e047a36+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4D4J8USKCPAV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 8 | 1e047a36+dirty | tune | died |
| TD1HVGS7H6LB | WATERFALL_GIANT | 10 | 17 | 1 | 16 | c1f61de9+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 16 | eabdd307+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 16 | eabdd307+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 14 | eabdd307+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 14 | eabdd307+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 13 | eabdd307+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PJ2LL9KU7FHD | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 16 | eabdd307+dirty | val | died |
| S9UZAK0JP0C0 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 11 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 10 | be0ee6df+dirty | val | won |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 2 | 9 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 3 | 9 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 4 | 7 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 5 | 7 | be0ee6df+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| S9UZAK0JP0C0 | CRUSHER+ROCKET | 10 | 33 | 6 | 9 | be0ee6df+dirty | val | died |
| UJ0K3G10609Y | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | 4fb81b17+dirty | val | won |
| UJ0K3G10609Y | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | 4fb81b17+dirty | val | won |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 1 | 7 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 2 | 8 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 3 | 8 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 4 | 8 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 5 | 8 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UJ0K3G10609Y | TEST_SUBJECT | 10 | 48 | 6 | 8 | 4fb81b17+dirty | val | died |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 1 | 14 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 2 | 10 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 3 | 13 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 4 | 14 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 5 | 13 | 4fb81b17+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L9SGRBB5R698 | WATERFALL_GIANT | 10 | 17 | 6 | 13 | 4fb81b17+dirty | val | died |
| D4LJ9QMGFB8Q | SOUL_FYSH | 10 | 17 | 1 | 12 | 4fb81b17+dirty | val | won |
| 0NZXA12NLDMH | CEREMONIAL_BEAST | 10 | 17 | 1 | 12 | 0fd8e845+dirty | val | won |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 1 | 8 | 0fd8e845+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 2 | 7 | 0fd8e845+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 3 | 7 | 0fd8e845+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 4 | 6 | 0fd8e845+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 5 | 10 | 0fd8e845+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0NZXA12NLDMH | CRUSHER+ROCKET | 10 | 33 | 6 | 8 | 0fd8e845+dirty | val | died |
| 4ANT8D00TP72 | WATERFALL_GIANT | 10 | 17 | 1 | 9 | b219de68+dirty | val | won |
| 4ANT8D00TP72 | THE_INSATIABLE | 10 | 33 | 1 | 7 | b219de68+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4ANT8D00TP72 | THE_INSATIABLE | 10 | 33 | 2 | 7 | b219de68+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4ANT8D00TP72 | THE_INSATIABLE | 10 | 33 | 3 | 9 | b219de68+dirty | val | won |
| XBD8Z9XLPCPN | VANTOM | 10 | 17 | 1 | 9 | da2ccb92+dirty | val | won |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 1 | 3 | da2ccb92+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 2 | 3 | da2ccb92+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 3 | 3 | da2ccb92+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 4 | 3 | da2ccb92+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 5 | 3 | da2ccb92+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XBD8Z9XLPCPN | THE_INSATIABLE | 10 | 33 | 6 | 3 | da2ccb92+dirty | val | died |
| PU80F84P6HPN | WATERFALL_GIANT | 10 | 17 | 1 | 17 | 0581ecb3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PU80F84P6HPN | WATERFALL_GIANT | 10 | 17 | 2 | 17 | 0581ecb3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PU80F84P6HPN | WATERFALL_GIANT | 10 | 17 | 3 | 19 | 0581ecb3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PU80F84P6HPN | WATERFALL_GIANT | 10 | 17 | 4 | 18 | 0581ecb3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PU80F84P6HPN | WATERFALL_GIANT | 10 | 17 | 5 | 15 | 0581ecb3+dirty | val | won |
| PU80F84P6HPN | CRUSHER+ROCKET | 10 | 33 | 1 | 4 | 0581ecb3+dirty | val | died |
| NB8KCF6HRGVF | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | 56c64ff8+dirty | val | won |
| 5X2GHKJ89PN1 | WATERFALL_GIANT | 10 | 17 | 1 | 12 | 3599ab0a+dirty | val | won |
| 5X2GHKJ89PN1 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | 3599ab0a+dirty | val | won |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 6 | 3599ab0a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 6 | 3599ab0a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 6 | 3599ab0a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 6 | 3599ab0a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 6 | 3599ab0a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5X2GHKJ89PN1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 6 | 3599ab0a+dirty | val | died |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 5 | d4026dbb+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 6 | d4026dbb+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 6 | d4026dbb+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 6 | d4026dbb+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 6 | d4026dbb+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCFAHJ9K19VY | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 7 | d4026dbb+dirty | val | died |
| LS8035TB32P3 | VANTOM | 10 | 17 | 1 | 12 | 74f82413+dirty | val | won |
| LS8035TB32P3 | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | 74f82413+dirty | val | won |
| L704TLETMZBM | WATERFALL_GIANT | 10 | 17 | 1 | 10 | cc1bdc59+dirty | val | won |
| L704TLETMZBM | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | cc1bdc59+dirty | val | won |
| L704TLETMZBM | TEST_SUBJECT | 10 | 48 | 1 | 6 | cc1bdc59+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L704TLETMZBM | TEST_SUBJECT | 10 | 48 | 2 | 7 | cc1bdc59+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L704TLETMZBM | TEST_SUBJECT | 10 | 48 | 3 | 6 | cc1bdc59+dirty | val | died |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 1 | 5 | 28e339fa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 2 | 5 | 28e339fa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 3 | 5 | 28e339fa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 4 | 5 | 28e339fa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 5 | 6 | 28e339fa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KUZVERN40NGK | CEREMONIAL_BEAST | 10 | 17 | 6 | 8 | 28e339fa+dirty | val | died |
| BVF22RSFVBS9 | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | 28e339fa+dirty | val | won |
| ZVYUL2YP3518 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 9 | 6ac57ea6+dirty | val | won |
| ZVYUL2YP3518 | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | 6ac57ea6+dirty | val | won |
| ZVYUL2YP3518 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 10 | 6ac57ea6+dirty | val | won |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 1 | 6 | 6ac57ea6+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 2 | 7 | 6ac57ea6+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 3 | 8 | 6ac57ea6+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 4 | 8 | 6ac57ea6+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 5 | 8 | 6ac57ea6+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZVYUL2YP3518 | TEST_SUBJECT | 10 | 49 | 6 | 8 | 6ac57ea6+dirty | val | died |
| VPW8YH7A4QFM | VANTOM | 10 | 17 | 1 | 11 | 3caa860b+dirty | val | won |
| VPW8YH7A4QFM | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | 3caa860b+dirty | val | won |
| DPYF2BAA3DKT | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | ad01f74a+dirty | val | won |
| DPYF2BAA3DKT | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | ad01f74a+dirty | val | won |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 1 | 8 | ad01f74a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 2 | 7 | ad01f74a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 3 | 8 | ad01f74a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 4 | 7 | ad01f74a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 5 | 8 | ad01f74a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DPYF2BAA3DKT | AEONGLASS | 10 | 48 | 6 | 7 | ad01f74a+dirty | val | died |
| HUVEPWQAHWFU | SOUL_FYSH | 10 | 17 | 1 | 10 | 9e20ade9+dirty | val | won |
| HUVEPWQAHWFU | THE_INSATIABLE | 10 | 33 | 1 | 10 | 9e20ade9+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HUVEPWQAHWFU | THE_INSATIABLE | 10 | 33 | 2 | 10 | 9e20ade9+dirty | val | won |
| UMVLWER4CD98 | VANTOM | 10 | 17 | 1 | 9 | ebd920b4+dirty | val | won |
| UMVLWER4CD98 | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | ebd920b4+dirty | val | won |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 1 | 10 | ebd920b4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 2 | 8 | ebd920b4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 3 | 10 | ebd920b4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 4 | 11 | ebd920b4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 5 | 11 | ebd920b4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UMVLWER4CD98 | AEONGLASS | 10 | 48 | 6 | 11 | ebd920b4+dirty | val | died |
| TU3XB4CAEDAW | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | 0068600d+dirty | val | won |
| TU3XB4CAEDAW | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | 0068600d+dirty | val | won |
| 8R5CXD5C8PW8 | WATERFALL_GIANT | 10 | 17 | 1 | 10 | e8a6fb71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8R5CXD5C8PW8 | WATERFALL_GIANT | 10 | 17 | 2 | 9 | e8a6fb71+dirty | val | won |
| 8R5CXD5C8PW8 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 13 | e8a6fb71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8R5CXD5C8PW8 | KNOWLEDGE_DEMON | 10 | 33 | 2 | 14 | e8a6fb71+dirty | val | won |
| QNTW139MGECA | CEREMONIAL_BEAST | 10 | 17 | 1 | 12 | 98d2d508+dirty | val | won |
| HSX4HYATB4E2 | CEREMONIAL_BEAST | 10 | 17 | 1 | 8 | 09ac8004+dirty | val | won |
| HSX4HYATB4E2 | THE_INSATIABLE | 10 | 33 | 1 | 6 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | THE_INSATIABLE | 10 | 33 | 2 | 6 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | THE_INSATIABLE | 10 | 33 | 3 | 8 | 09ac8004+dirty | val | won |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 1 | 7 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 2 | 7 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 3 | 5 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 4 | 5 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 5 | 7 | 09ac8004+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HSX4HYATB4E2 | AEONGLASS | 10 | 48 | 6 | 7 | 09ac8004+dirty | val | died |
| TKXQ6L4N9A6U | WATERFALL_GIANT | 10 | 17 | 1 | 11 | e33ca6e0+dirty | val | won |
| P5HT1272P5SB | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 17 | 1a89c2d4+dirty | val | won |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 13 | f8e01696+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 13 | f8e01696+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 13 | f8e01696+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 12 | f8e01696+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 13 | f8e01696+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KQQELQSZ382Z | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 13 | f8e01696+dirty | val | died |

模拟失败原件：`[{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "error": "board: Error: no solve"}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "error": "board: Error: no solve"}]`。
