# 静默 boss 模拟校准

Roy 授权的是角色隔离、整体 Platt、时间切分、原准入标准和定期重跑架构；下面样本、实胜败、拟合、残差及准入结论只来自已结束的 SILENT 对局。boss侧参数复用用户准许的既有模型/monster-db（含common），另记来源，不把它当作静默对局样本或校准参数。没有新增打法或策略阈值。

提取：338 局，1498 次尝试；614 次有实际结局且取得首回合帧（模拟成功数另列）。冻结到已结束局 `2026-10-17T08:15:36.275Z`；未进入 boss 的局号/版本及完整筛选列表在 extraction.json。提取排除原因：`{"SL predicted_death: censored, no actual win/loss; no observed completed outcome": 882, "SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand": 1, "no turn-1 decision with drawn hand": 1}`。
可用 303 局，实际结局 `{'won': 449, 'died': 165}`，各进阶场数 `{'0': 16, '1': 6, '2': 5, '3': 3, '4': 9, '5': 3, '6': 22, '7': 17, '8': 3, '9': 7, '10': 523}`。
SL predicted_death 是未实结算的截断样本，来源保留，不标实际败局；同一局全部 boss/SL 共享切分。校准胜率以有实际结局的尝试为条件，存在 SL 截断选择偏差，不是所有初试胜率或允许SL的整局通关率。开场我方资源取日志，boss HP/伤害/招式沿现有 monster-db 按进阶输入、缺级取最近观测，未重拟合 boss 侧。

SL口径：boss房间 616；初试结局 `{'predicted_death': 237, 'won': 365, 'died': 14}`，重试结局 `{'won': 84, 'predicted_death': 646, 'died': 152}`；没有实际结局的房间 `[{'run_id': 'TD1HVGS7H6LB', 'floor': 17}, {'run_id': 'TXZ6RVMQA09D', 'floor': 49}]`。失败重载仍不能补造实际败局；具体 reload 原记录随来源保留。

固定来源/模型：`{"simulator_base": "7e1193cef9467416bc10c8e344a49f4fd98390c7", "model_sha256": "a16714b6349b4d4c79bbc91c3875c979607f80da1e619b59f5a0a82e45210a5a", "samples": 200, "seed": 1, "boss_input_scope": {"openings": 614, "A10_hp_asc_sources": {"10": 699}, "A10_opening_asc_sources": {"10": 699}, "A10_damage_asc_sources": {"10": 48, "9": 1}, "A10_no_damage_records": ["AEONGLASS:INCREASING_INTENSITY_MOVE", "CEREMONIAL_BEAST:BEAST_CRY_MOVE", "CEREMONIAL_BEAST:STAMP_MOVE", "CEREMONIAL_BEAST:STUNNED", "CRUSHER:ADAPT_MOVE", "KIN_FOLLOWER:POWER_DANCE_MOVE", "KIN_PRIEST:RITUAL_MOVE", "KNOWLEDGE_DEMON:CURSE_OF_KNOWLEDGE_MOVE", "LAGAVULIN_MATRIARCH:SLEEP_MOVE", "LAGAVULIN_MATRIARCH:SOUL_SIPHON_MOVE", "LAGAVULIN_MATRIARCH:STUNNED", "QUEEN:BURN_BRIGHT_FOR_ME_MOVE", "QUEEN:ENRAGE_MOVE", "QUEEN:PUPPET_STRINGS_MOVE", "QUEEN:YOU_ARE_MINE_MOVE", "ROCKET:CHARGE_UP_MOVE", "ROCKET:RECHARGE_MOVE", "SOUL_FYSH:BECKON_MOVE", "SOUL_FYSH:FADE_MOVE", "TEST_SUBJECT:BURNING_GROWL_MOVE", "TEST_SUBJECT:RESPAWN_MOVE", "THE_INSATIABLE:LIQUIFY_GROUND_MOVE", "THE_INSATIABLE:SALIVATE_MOVE", "VANTOM:PREPARE_MOVE", "WATERFALL_GIANT:ABOUT_TO_BLOW_MOVE", "WATERFALL_GIANT:PRESSURIZE_MOVE", "WATERFALL_GIANT:SIPHON_MOVE"], "A10_estimated_damage_definitions": [{"monster": "TEST_SUBJECT", "move": "BIG_POUNCE", "damage": {"perHit": 45, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 45, "ratioN": 4, "ratioOwn": true, "ratioTo": 10}}], "F49_actual_attempts": 34, "limit": "Pinned published monster-db; missing damage definitions do not invent attacks. F49 is a separate actual-outcome fight, not joint F48/F49 clearance."}, "result_reuse": {"historical_fights": 588, "new_validation_fights": 26, "control_replays": ["C48LLXBGKXQ9:17:2:6263075551", "C48LLXBGKXQ9:33:6:6290069057"], "historical_input_and_turns_equal": true, "previous_artifact": "995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b", "counterfactual_current_source_replays": "Excluded from this periodic refresh; all interrupted outputs retained.", "tune_keys_and_model_version": "unchanged published107 keys and7e1193cef9467416bc10c8e344a49f4fd98390c7", "control_comparisons": [{"key": "C48LLXBGKXQ9:17:2:6263075551", "start": "t1", "identical_except_timing": true}, {"key": "C48LLXBGKXQ9:17:2:6263075551", "start": "pre", "identical_except_timing": true}, {"key": "C48LLXBGKXQ9:33:6:6290069057", "start": "t1", "identical_except_timing": true}, {"key": "C48LLXBGKXQ9:33:6:6290069057", "start": "pre", "identical_except_timing": true}], "reused_fights": 586, "replayed_fights": 28, "rows": 1228, "historical_results_sha256": "ac6a93085cb46f148cc482bd7ca1a5401bfa0a9202acfe41156d5f215bd83829", "combined_results_sha256": "b16bc64eb4a16c1f54f0219a864f5b8342640c09f1b758ec8ddc4191098396d9", "all_model_inputs_still_identical": true}, "compiled_replay_sha256": "43fc3612b7d0c478bdcc34ae8f05883116f997f6f456a8995993e56dedc194ef", "compiled_metafile_sha256": "b6cb76fe4fb6140ab950dd977bfa6823f5f4fdf7af38e176bad1a808c0ad4263", "replay_driver_sha256": "d79dea6c704c8e5acf97328686f07e254a43f8093c832fb3ea8e27f6d5c8f100", "sealing_driver_sha256": "342830e8e81087645ffdfa92629731c52d40f6442383944ec4cfb9e7a07d3d79", "admission_evaluation": {"version": "unrounded-original-thresholds", "files": {"calib.py": "d21f51f2177bd37894723eb7adda4655b2bb6efe372605315adb46b2df855202", "trust.py": "06281378f8adfd793f3f8245538906d6f6a071bd13d33ca69edb6d419505ebc2", "silent_calibration.py": "22adf92bc63b7327eeeafe7f415f6031864b87f9d14cf3c190bcb463b9378b40"}}, "runtime_source_audit_sha256": "6ecabe8a0abd7bd4d9cdea864348c78974b85705cc9c427aca066a84bc73d5df", "scope": "Periodic validation extension of exactly the published model; current production model/H0/H1 finite prefixes are not revalidated. Interrupted current-source replays and exploratory tuning are excluded.", "dataset_sha256": "4f2697dc22f10550d7efa4b25829d3e07d388297a46a53e2e262f5a1d8b76c7c", "sources_sha256": "5dd365c1dbdc7e2ad179155fedb8093d3f5bc2ed92a6114ba4fa3ab0c6e18fce", "versions": {"tune": ["0a066c2f+dirty", "0d0c4b69+dirty", "103fd5ff+dirty", "141df614+dirty", "1e047a36+dirty", "25a408ef+dirty", "2c81eb76+dirty", "2ec81b9f+dirty", "3a2a2a48+dirty", "3cbc6955+dirty", "3ebbdc6c+dirty", "41bd4a44+dirty", "42ac6c1d+dirty", "452f7bc7+dirty", "45965f49+dirty", "473a62f4+dirty", "48f2bf5a+dirty", "4915e3b3+dirty", "5ae08a3d+dirty", "5de5d518", "5de5d518+dirty", "6566b7d3+dirty", "65d99e74+dirty", "7be569b1+dirty", "7bea7d99+dirty", "7c7f22e3+dirty", "86b24a1f+dirty", "8b268858+dirty", "8d79fd5b+dirty", "9692ea6d+dirty", "9852b39f+dirty", "9988ca8b+dirty", "9e0fda2e+dirty", "a999dba8+dirty", "b9c46d66+dirty", "bb19732f+dirty", "bf3ebb7c", "bf63ab40+dirty", "c4c7ad97+dirty", "ccf1fcde+dirty", "d283e641+dirty", "d9a3ea37+dirty", "ee1f4fd1+dirty", "f1d951ec+dirty"], "val": ["0061f599+dirty", "0068600d+dirty", "03d50f0b+dirty", "03f4ffe0+dirty", "047c809e+dirty", "049dff24+dirty", "0581ecb3+dirty", "099656e5f+dirty", "09ac8004+dirty", "0d6c1a82+dirty", "0fd8e845+dirty", "10168ac71+dirty", "11d759cf+dirty", "157808e1e+dirty", "187c025a+dirty", "1a0adbaa+dirty", "1a5e1217+dirty", "1a89c2d4+dirty", "20cec89a+dirty", "2518c73d+dirty", "261af56e+dirty", "28e339fa+dirty", "2b1a5f6d+dirty", "31914e4b+dirty", "334d51498+dirty", "3541bc54+dirty", "3599ab0a+dirty", "3caa860b+dirty", "3cadc990+dirty", "3d05e954+dirty", "433144fb+dirty", "4cc52f9ab+dirty", "4fb81b17+dirty", "52aa3fcc+dirty", "56c64ff8+dirty", "57b661f07+dirty", "5925a43d+dirty", "5957f0563+dirty", "5ff4270d+dirty", "60685510+dirty", "650a6a84+dirty", "6519b8909+dirty", "65e3d10a9+dirty", "69a7b441+dirty", "6ac57ea6+dirty", "6ad5584f+dirty", "6c3d8187+dirty", "6e8de8ea4+dirty", "6fd495cc+dirty", "70c8352b+dirty", "710dc4dc+dirty", "722518cd+dirty", "72499093+dirty", "734c0860+dirty", "7375067d7+dirty", "74f82413+dirty", "77b15f03f+dirty", "79bee0fc+dirty", "7f0c04dd+dirty", "7f6d5b4b+dirty", "8149e4ca+dirty", "8ef00878+dirty", "910604a4+dirty", "91c1db90+dirty", "92376ca3+dirty", "93298980+dirty", "98d2d508+dirty", "9949a5de+dirty", "9a7dc931+dirty", "9e20ade9+dirty", "a340c1ec+dirty", "a73ce7cc+dirty", "a7c2a411+dirty", "a8bb1ebe5+dirty", "aa1e2136+dirty", "ac321b1f+dirty", "ad01f74a+dirty", "b0b0e679+dirty", "b0f41f03+dirty", "b1714285+dirty", "b219de68+dirty", "b8ca9311+dirty", "b934d888d+dirty", "bb728531+dirty", "be0ee6df+dirty", "c1dd721f+dirty", "c308b61e1+dirty", "c70efc8c+dirty", "c7e1e0ed3+dirty", "cc1bdc59+dirty", "ceb74207+dirty", "cecc8317+dirty", "cfa8112d+dirty", "current", "d07c38fc+dirty", "d4026dbb+dirty", "d422c5cec+dirty", "d5ad91e80+dirty", "d5f290f4+dirty", "d61bf0ec+dirty", "d6a39489f+dirty", "da2ccb92+dirty", "dc899f95+dirty", "e33ca6e0+dirty", "e838a975+dirty", "e8a6fb71+dirty", "eabdd307+dirty", "eaf3ac162+dirty", "ebd920b4+dirty", "f0c9dfbf+dirty", "f17e15ca+dirty", "f56da22b+dirty", "f65cbfac+dirty", "f8dd742d+dirty", "f8e01696+dirty", "f9db52c1+dirty", "fd4c8e52+dirty"]}, "completed_max_asc": 10}`。所有输入文件 SHA256 在同批 provenance.json。筛选读取总日志索引元信息，但没有纳入铁甲对局样本或校准参数，角色统计输入只取静默目录。common monster-db 是用户准许复用的既有模型；它已有的观测数值固定使用，验证的是静默胜率映射，不宣称从零预测未观测 boss 机制。
固定切点 `2026-10-06T02:46:11.648000`（UTC，与日志ts同口径），调参 107 场、验证 507 场；验证覆盖后期代码，完整版本逐项在来源表。每起点 200 样本，固定 seed=1（逐战seed=1+原始行号×101），模拟策略/费用/药水/保血/目标/SL阈值保持原样。

进阶项只作一个整体模型的统计校正，不解释为进阶机制的因果效应；版本、资源和SL选择与进阶共变。某进阶段验证 n=0 时，只有调参残差，没有该段独立的样本外可靠性证据。上线保留后来其他批次的代码修复和知识刷新；本表仅验证所列固定模型，不冒称后续模型版本已通过相同验证，本次定期重跑继续固定已发布模型；换模型须另立实验，不复用本次验证结论。

B2 用首回合起点；B3 用既有 pre/redeal 方法：实际首回合资源、全副牌重洗并重新抽开场手牌，不使用后续观测。B2 中途沿同一整体首回合映射，其独立中途校准未验证；铁甲映射保持原值。

A10 的 F48 胜只算该战胜利，不算整局通关；F49 是另一场独立 boss 战，以下列出本角色来源。怪物数值来源的 exact/nearest 及伤害估值在 results 的 bossSource 内，common 是用户准许复用的既有模型，校准参数不复用铁甲。

## A10 数值与 F49 范围

数值审计：`{"openings": 614, "A10_hp_asc_sources": {"10": 699}, "A10_opening_asc_sources": {"10": 699}, "A10_damage_asc_sources": {"10": 48, "9": 1}, "A10_no_damage_records": ["AEONGLASS:INCREASING_INTENSITY_MOVE", "CEREMONIAL_BEAST:BEAST_CRY_MOVE", "CEREMONIAL_BEAST:STAMP_MOVE", "CEREMONIAL_BEAST:STUNNED", "CRUSHER:ADAPT_MOVE", "KIN_FOLLOWER:POWER_DANCE_MOVE", "KIN_PRIEST:RITUAL_MOVE", "KNOWLEDGE_DEMON:CURSE_OF_KNOWLEDGE_MOVE", "LAGAVULIN_MATRIARCH:SLEEP_MOVE", "LAGAVULIN_MATRIARCH:SOUL_SIPHON_MOVE", "LAGAVULIN_MATRIARCH:STUNNED", "QUEEN:BURN_BRIGHT_FOR_ME_MOVE", "QUEEN:ENRAGE_MOVE", "QUEEN:PUPPET_STRINGS_MOVE", "QUEEN:YOU_ARE_MINE_MOVE", "ROCKET:CHARGE_UP_MOVE", "ROCKET:RECHARGE_MOVE", "SOUL_FYSH:BECKON_MOVE", "SOUL_FYSH:FADE_MOVE", "TEST_SUBJECT:BURNING_GROWL_MOVE", "TEST_SUBJECT:RESPAWN_MOVE", "THE_INSATIABLE:LIQUIFY_GROUND_MOVE", "THE_INSATIABLE:SALIVATE_MOVE", "VANTOM:PREPARE_MOVE", "WATERFALL_GIANT:ABOUT_TO_BLOW_MOVE", "WATERFALL_GIANT:PRESSURIZE_MOVE", "WATERFALL_GIANT:SIPHON_MOVE"], "A10_estimated_damage_definitions": [{"monster": "TEST_SUBJECT", "move": "BIG_POUNCE", "damage": {"perHit": 45, "hits": 1, "estimated": true, "from": 9, "ratio": 1, "logged": 45, "ratioN": 4, "ratioOwn": true, "ratioTo": 10}}], "F49_actual_attempts": 34, "limit": "Pinned published monster-db; missing damage definitions do not invent attacks. F49 is a separate actual-outcome fight, not joint F48/F49 clearance."}`。完整开场及后续攻击定义的数值来源另见 opening-audit.json / model-input-audit.json，缺级沿既有 nearest/ratio 方法。

F49 实际结局 34 场；单战必须同时满足场数与质量指标；这里只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。

| 局号 | boss | 尝试 | 回合 | 结局 | 代码 |
|---|---|---|---|---|---|
| JMH5C51RLN4E | AEONGLASS | 6 | 1 | died | 41bd4a44+dirty |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | 141df614+dirty |
| ZVYUL2YP3518 | TEST_SUBJECT | 6 | 8 | died | 6ac57ea6+dirty |
| TDLBRNA0R05B | TEST_SUBJECT | 6 | 2 | died | dc899f95+dirty |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 6 | 4 | died | 03f4ffe0+dirty |
| PD9AYQVMLQW6 | AEONGLASS | 6 | 10 | died | 7f6d5b4b+dirty |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 6 | 2 | died | 8ef00878+dirty |
| AD3QSC3P41JU | TEST_SUBJECT | 6 | 2 | died | a340c1ec+dirty |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 6 | 4 | died | 72499093+dirty |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 6 | 5 | died | 3541bc54+dirty |
| PBUBM0LRTEDD | TEST_SUBJECT | 6 | 3 | died | 8149e4ca+dirty |
| JBX9JLH46KVN | TEST_SUBJECT | 6 | 2 | died | d5f290f4+dirty |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 6 | 4 | died | 6519b8909+dirty |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | 10168ac71+dirty |
| 833ZM0MJGWHC | TEST_SUBJECT | 6 | 7 | died | 57b661f07+dirty |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | c7e1e0ed3+dirty |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 6 | 3 | died | current |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | current |
| 7S8HCC0M6G9W | AEONGLASS | 2 | 10 | won | current |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 6 | 3 | died | current |
| 64VJC5XT2AT2 | TEST_SUBJECT | 6 | 6 | died | current |
| KF9HMZKTFC3V | AEONGLASS | 1 | 6 | won | current |
| LKC9YXKZWTKR | TEST_SUBJECT | 1 | 16 | won | current |
| Q10YYQ5DUPJA | TEST_SUBJECT | 6 | 6 | died | current |
| 9GTFF6DC500L | AEONGLASS | 6 | 8 | won | current |
| 1GN7WFBWC2E3 | QUEEN+TORCH_HEAD_AMALGAM | 2 | 5 | died | current |
| X06YT1507E5M | AEONGLASS | 6 | 7 | died | current |
| UPAB38G2PA02 | QUEEN+TORCH_HEAD_AMALGAM | 2 | 13 | won | current |
| HLAWCGM3KHVB | QUEEN+TORCH_HEAD_AMALGAM | 1 | 10 | died | current |
| RQCHNN0W72KF | TEST_SUBJECT | 6 | 2 | died | current |
| VNSXWCWXR3VW | TEST_SUBJECT | 6 | 3 | died | current |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 6 | 1 | died | current |
| TCDUBRWMEMNA | AEONGLASS | 6 | 4 | died | current |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 6 | 9 | died | current |

## B2 / t1

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=505（候选507），校准 Brier=0.1171；Platt={'a': 2.0844, 'b': 0.4502, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.134, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.231}, "A5–9": {"n": 52, "gap": -0.01100000000000001, "brier": 0.0832, "mean_pred": 0.797, "actual_win": 0.808, "leak_ratio": 1.198}, "A10": {"n": 16, "gap": 0.026000000000000023, "brier": 0.122, "mean_pred": 0.651, "actual_win": 0.625, "leak_ratio": 1.411}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.134 | 1.231 |
| tune | A5–9 | 52 | 0.797 | 0.808 | -0.01100000000000001 | 0.0832 | 1.198 |
| tune | A10 | 16 | 0.651 | 0.625 | 0.026000000000000023 | 0.122 | 1.411 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 505 | 0.761 | 0.725 | 0.03600000000000003 | 0.1171 | 1.327 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

准入比较使用未取整指标；显示取整不能放宽门槛。JSON的admission保留完整精度。

| boss | 验证 n | 还差 | Brier/门槛（显示6位） | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 37 | 0 | 0.197212/0.146343 | 0.685/0.486 | 3.868 | brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 41 | 0 | 0.059265/0.146343 | 0.777/0.78 | 1.155 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 50 | 0 | 0.162427/0.146343 | 0.689/0.66 | 1.329 | brier,leak | 低 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 47 | 0 | 0.101369/0.146343 | 0.739/0.83 | 1.326 | leak | 低 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 43 | 0 | 0.057578/0.146343 | 0.848/0.86 | 0.974 | 无 | 达标 |
| 女王 (QUEEN) | 34 | 0 | 0.264547/0.146343 | 0.721/0.382 | 1.062 | brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 38 | 0 | 0.033005/0.146343 | 0.935/0.921 | 0.855 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 31 | 0 | 0.190524/0.146343 | 0.351/0.226 | 3.543 | brier,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 49 | 0 | 0.146397/0.146343 | 0.708/0.673 | 1.279 | brier | 低 |
| 同族 (THE_KIN) | 43 | 0 | 0.077199/0.146343 | 0.826/0.884 | 1.208 | 无 | 达标 |
| 墨影幻灵 (VANTOM) | 51 | 0 | 0.055655/0.146343 | 0.897/0.941 | 0.969 | 无 | 达标 |
| 瀑布巨兽 (WATERFALL_GIANT) | 41 | 0 | 0.110922/0.146343 | 0.842/0.805 | 0.929 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.351, "brier": 0.1233, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.351, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 1.0, "actual_enemy": 8.0, "enemy_ratio": 0.125, "sim_loss": 1.0, "actual_loss": 8.0, "loss_ratio": 0.125}}, "val": {"n": 32, "actual_win": 0.156, "mean_pred": 0.478, "brier": 0.2023, "auc": 0.804, "const_brier": 0.1318, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 22, "pred": 0.351, "actual": 0.045}, {"bucket": "40–60%", "n": 2, "pred": 0.504, "actual": 0.0}, {"bucket": "60–80%", "n": 2, "pred": 0.654, "actual": 0.5}, {"bucket": "80–100%", "n": 6, "pred": 0.876, "actual": 0.5}], "worst_bucket_n20": 0.306, "won_loss_err": {"n": 4, "median": 12.5, "mean": 21.1, "mae": 26.4, "p10": -10.5, "p90": 70, "within5": 0.0}, "leak": {"n": 88, "sim_enemy": 9.11, "actual_enemy": 3.67, "enemy_ratio": 2.482, "sim_loss": 8.7, "actual_loss": 4.25, "loss_ratio": 2.047}}}}`。验证还差 0 场；范围限制：`{"49": "F49独立战：校准 Brier 0.202262，高于整体 0.117074 的 1.25 倍 0.146343; 偏乐观：预测平均胜率 48%，实际 16%; 模拟每回合被打穿的血是实际的 2.48 倍"}`。

## B3 / pre

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=505（候选507），校准 Brier=0.1191；Platt={'a': 2.2754, 'b': 0.5047, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.1347, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.289}, "A5–9": {"n": 52, "gap": -0.009000000000000008, "brier": 0.0855, "mean_pred": 0.799, "actual_win": 0.808, "leak_ratio": 1.26}, "A10": {"n": 16, "gap": 0.020000000000000018, "brier": 0.1223, "mean_pred": 0.645, "actual_win": 0.625, "leak_ratio": 1.422}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.1347 | 1.289 |
| tune | A5–9 | 52 | 0.799 | 0.808 | -0.009000000000000008 | 0.0855 | 1.26 |
| tune | A10 | 16 | 0.645 | 0.625 | 0.020000000000000018 | 0.1223 | 1.422 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 505 | 0.765 | 0.725 | 0.040000000000000036 | 0.1191 | 1.345 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

准入比较使用未取整指标；显示取整不能放宽门槛。JSON的admission保留完整精度。

| boss | 验证 n | 还差 | Brier/门槛（显示6位） | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 37 | 0 | 0.210971/0.148836 | 0.687/0.486 | 3.909 | brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 41 | 0 | 0.052173/0.148836 | 0.788/0.78 | 1.179 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 50 | 0 | 0.181788/0.148836 | 0.708/0.66 | 1.352 | brier,leak | 低 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 47 | 0 | 0.089079/0.148836 | 0.749/0.83 | 1.363 | leak | 低 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 43 | 0 | 0.055468/0.148836 | 0.842/0.86 | 1.034 | 无 | 达标 |
| 女王 (QUEEN) | 34 | 0 | 0.252228/0.148836 | 0.692/0.382 | 1.176 | brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 38 | 0 | 0.035575/0.148836 | 0.944/0.921 | 0.862 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 31 | 0 | 0.183856/0.148836 | 0.321/0.226 | 3.483 | brier,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 49 | 0 | 0.166680/0.148836 | 0.715/0.673 | 1.317 | brier,leak | 低 |
| 同族 (THE_KIN) | 43 | 0 | 0.084654/0.148836 | 0.839/0.884 | 1.181 | 无 | 达标 |
| 墨影幻灵 (VANTOM) | 51 | 0 | 0.049966/0.148836 | 0.905/0.941 | 0.946 | 无 | 达标 |
| 瀑布巨兽 (WATERFALL_GIANT) | 41 | 0 | 0.110749/0.148836 | 0.859/0.805 | 0.9 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.321, "brier": 0.103, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.321, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 0.4, "actual_enemy": 8.0, "enemy_ratio": 0.05, "sim_loss": 0.4, "actual_loss": 8.0, "loss_ratio": 0.05}}, "val": {"n": 32, "actual_win": 0.156, "mean_pred": 0.435, "brier": 0.1807, "auc": 0.815, "const_brier": 0.1318, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 24, "pred": 0.321, "actual": 0.042}, {"bucket": "40–60%", "n": 2, "pred": 0.489, "actual": 0.5}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 6, "pred": 0.872, "actual": 0.5}], "worst_bucket_n20": 0.279, "won_loss_err": {"n": 4, "median": 5.0, "mean": 18.5, "mae": 22.0, "p10": -7, "p90": 71, "within5": 0.25}, "leak": {"n": 91, "sim_enemy": 9.65, "actual_enemy": 3.71, "enemy_ratio": 2.597, "sim_loss": 9.32, "actual_loss": 4.27, "loss_ratio": 2.18}}}}`。验证还差 0 场；范围限制：`{"49": "F49独立战：校准 Brier 0.180740，高于整体 0.119069 的 1.25 倍 0.148836; 偏乐观：预测平均胜率 43%，实际 16%; 模拟每回合被打穿的血是实际的 2.60 倍"}`。

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
| CA5KE8GFJ9X2 | 10 | 13 | 33f02a6f+dirty | no logged boss attempt |
| Q6M2Y34MWKRE | 10 | 9 | a881e27a+dirty | no logged boss attempt |
| 79UCJ0K6R9C1 | 10 | 14 | f8947651+dirty | no logged boss attempt |
| 7BNC8QX746YP | 10 | 14 | c70efc8c+dirty | no logged boss attempt |
| FU8ZUQHBHNV9 | 10 | 8 | a7c2a411+dirty | no logged boss attempt |
| RZ6YAC7K89NM | 10 | 12 | cfa8112d+dirty | no logged boss attempt |
| NG1FBJTSRLHS | 10 | 9 | 57a7f485+dirty | no logged boss attempt |
| NTMAU4XZ2NN2 | 10 | 14 | 57a7f485+dirty | no logged boss attempt |
| N8A2W8LH39N0 | 10 | 15 | 29cd6a323+dirty | no logged boss attempt |
| EMRME965K74Q | 10 | 9 | current | no logged boss attempt |
| JYTQSFJ96MG2 | 10 | 9 | current | no logged boss attempt |
| 1J44WWF1073H | 10 | 8 | current | no logged boss attempt |
| ATPX63FGDY6L | 10 | 12 | current | no logged boss attempt |
| A5HKP18P4Q0T | 10 | 14 | current | no logged boss attempt |
| 177AS39M1UPW | 10 | 5 | current | no logged boss attempt |
| 7LXWF33J5SAD | 10 | 9 | current | no logged boss attempt |
| QU61RVKHPTZS | 10 | 13 | current | no logged boss attempt |
| AX56AR19UCHD | 10 | 15 | current | no logged boss attempt |
| YP428GT9ZLL3 | 10 | 15 | current | no logged boss attempt |
| 4YPGHGJD393H | 10 | 14 | current | no logged boss attempt |
| Y2K25VFDU95P | 10 | 9 | current | no logged boss attempt |
| X7REGM0RUNSA | 10 | 5 | current | no logged boss attempt |
| A3X30TN54LSH | 10 | 12 | current | no logged boss attempt |
| 1L4RRN6AN5SQ | 10 | 11 | current | no logged boss attempt |
| 2Q6ZYZ6JHM0M | 10 | 8 | current | no logged boss attempt |

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
| YLYLZWHA0GKU | VANTOM | 10 | 17 | 1 | 8 | f65cbfac+dirty | val | won |
| YLYLZWHA0GKU | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | f65cbfac+dirty | val | won |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 1 | 14 | f0c9dfbf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 2 | 13 | f0c9dfbf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 3 | 12 | f0c9dfbf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 4 | 10 | f0c9dfbf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 5 | 13 | f0c9dfbf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7ZUC4VPMDS41 | CEREMONIAL_BEAST | 10 | 17 | 6 | 14 | f0c9dfbf+dirty | val | died |
| 2Y27VAYZDA02 | SOUL_FYSH | 10 | 17 | 1 | 12 | 1a5e1217+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2Y27VAYZDA02 | SOUL_FYSH | 10 | 17 | 2 | 12 | 1a5e1217+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2Y27VAYZDA02 | SOUL_FYSH | 10 | 17 | 3 | 12 | 1a5e1217+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2Y27VAYZDA02 | SOUL_FYSH | 10 | 17 | 4 | 13 | 1a5e1217+dirty | val | won |
| TDLBRNA0R05B | CEREMONIAL_BEAST | 10 | 17 | 1 | 8 | dc899f95+dirty | val | won |
| TDLBRNA0R05B | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | dc899f95+dirty | val | won |
| TDLBRNA0R05B | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 9 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 9 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 9 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 10 | dc899f95+dirty | val | won |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 1 | 2 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 2 | 2 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 3 | 2 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 4 | 3 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 5 | 3 | dc899f95+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TDLBRNA0R05B | TEST_SUBJECT | 10 | 49 | 6 | 2 | dc899f95+dirty | val | died |
| MCT1GPTL8D35 | SOUL_FYSH | 10 | 17 | 1 | 9 | 0061f599+dirty | val | won |
| MCT1GPTL8D35 | THE_INSATIABLE | 10 | 33 | 1 | 7 | 0061f599+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MCT1GPTL8D35 | THE_INSATIABLE | 10 | 33 | 2 | 9 | 0061f599+dirty | val | won |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 5 | 910604a4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 5 | 910604a4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 8 | 910604a4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 9 | 910604a4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 9 | 910604a4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W7BHM8U02RKG | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 9 | 910604a4+dirty | val | died |
| 01H1533KSS5C | VANTOM | 10 | 17 | 1 | 9 | f8dd742d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 01H1533KSS5C | VANTOM | 10 | 17 | 2 | 14 | f8dd742d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 01H1533KSS5C | VANTOM | 10 | 17 | 3 | 14 | f8dd742d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 01H1533KSS5C | VANTOM | 10 | 17 | 4 | 14 | f8dd742d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 01H1533KSS5C | VANTOM | 10 | 17 | 5 | 15 | f8dd742d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 01H1533KSS5C | VANTOM | 10 | 17 | 6 | 15 | f8dd742d+dirty | val | died |
| 2K4H3JEJHRSB | WATERFALL_GIANT | 10 | 17 | 1 | 10 | 2518c73d+dirty | val | won |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 1 | 7 | 92376ca3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 2 | 7 | 92376ca3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 3 | 7 | 92376ca3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 4 | 7 | 92376ca3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 5 | 7 | 92376ca3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ULP4TN1GNHMK | VANTOM | 10 | 17 | 6 | 7 | 92376ca3+dirty | val | died |
| 61E2QS63Y9WU | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | 03d50f0b+dirty | val | won |
| 5PM6JAQG6FNQ | CEREMONIAL_BEAST | 10 | 17 | 1 | 10 | f56da22b+dirty | val | won |
| 5PM6JAQG6FNQ | KNOWLEDGE_DEMON | 10 | 33 | 1 | 8 | f56da22b+dirty | val | won |
| DUZUBAJ3A8GP | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 11 | 93298980+dirty | val | won |
| VLZ6CCT8AQ0A | SOUL_FYSH | 10 | 17 | 1 | 8 | ac321b1f+dirty | val | won |
| VLZ6CCT8AQ0A | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | ac321b1f+dirty | val | won |
| 8JRE1C4H4Z2W | VANTOM | 10 | 17 | 1 | 7 | b0f41f03+dirty | val | won |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 1 | 7 | b0f41f03+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 2 | 7 | b0f41f03+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 3 | 7 | b0f41f03+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 4 | 9 | b0f41f03+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 5 | 9 | b0f41f03+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8JRE1C4H4Z2W | THE_INSATIABLE | 10 | 33 | 6 | 11 | b0f41f03+dirty | val | died |
| YF0LXT1QSTGG | WATERFALL_GIANT | 10 | 17 | 1 | 11 | 91c1db90+dirty | val | won |
| YF0LXT1QSTGG | THE_INSATIABLE | 10 | 33 | 1 | 11 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | THE_INSATIABLE | 10 | 33 | 2 | 8 | 91c1db90+dirty | val | won |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 1 | 5 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 2 | 6 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 3 | 7 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 4 | 7 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 5 | 6 | 91c1db90+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YF0LXT1QSTGG | TEST_SUBJECT | 10 | 48 | 6 | 5 | 91c1db90+dirty | val | died |
| XP2SL33HT0D9 | SOUL_FYSH | 10 | 17 | 1 | 9 | 60685510+dirty | val | won |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | 60685510+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 2 | 6 | 60685510+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 3 | 9 | 60685510+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 4 | 9 | 60685510+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 5 | 7 | 60685510+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XP2SL33HT0D9 | CRUSHER+ROCKET | 10 | 33 | 6 | 5 | 60685510+dirty | val | died |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 1 | 17 | 79bee0fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 2 | 15 | 79bee0fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 3 | 13 | 79bee0fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 4 | 15 | 79bee0fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 5 | 17 | 79bee0fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 751FN9QM9MHQ | SOUL_FYSH | 10 | 17 | 6 | 17 | 79bee0fc+dirty | val | died |
| KV0JHNJCKXLS | SOUL_FYSH | 10 | 17 | 1 | 11 | 70c8352b+dirty | val | won |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | 70c8352b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 2 | 8 | 70c8352b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 3 | 8 | 70c8352b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 4 | 10 | 70c8352b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 5 | 10 | 70c8352b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KV0JHNJCKXLS | KNOWLEDGE_DEMON | 10 | 33 | 6 | 8 | 70c8352b+dirty | val | died |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 1 | 13 | b0b0e679+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 2 | 13 | b0b0e679+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 3 | 12 | b0b0e679+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 4 | 13 | b0b0e679+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 5 | 13 | b0b0e679+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YQL8RZ8BWN1E | WATERFALL_GIANT | 10 | 17 | 6 | 10 | b0b0e679+dirty | val | died |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 1 | 12 | f9db52c1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 2 | 13 | f9db52c1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 3 | 15 | f9db52c1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 4 | 15 | f9db52c1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 5 | 13 | f9db52c1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KEN58SH9SLZ6 | SOUL_FYSH | 10 | 17 | 6 | 13 | f9db52c1+dirty | val | died |
| TXZ6RVMQA09D | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | f17e15ca+dirty | val | won |
| TXZ6RVMQA09D | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | f17e15ca+dirty | val | won |
| TXZ6RVMQA09D | AEONGLASS | 10 | 48 | 1 | 8 | f17e15ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TXZ6RVMQA09D | AEONGLASS | 10 | 48 | 2 | 10 | f17e15ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TXZ6RVMQA09D | AEONGLASS | 10 | 48 | 3 | 10 | f17e15ca+dirty | val | won |
| TXZ6RVMQA09D | TEST_SUBJECT | 10 | 49 | 1 | 1 | f17e15ca+dirty | 排除 | no turn-1 decision with drawn hand |
| WQZVENQ7DTRP | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | 31914e4b+dirty | val | won |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 1 | 9 | 31914e4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 2 | 11 | 31914e4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 3 | 11 | 31914e4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 4 | 11 | 31914e4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 5 | 11 | 31914e4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WQZVENQ7DTRP | THE_INSATIABLE | 10 | 33 | 6 | 11 | 31914e4b+dirty | val | died |
| 1913SE84AXQF | CEREMONIAL_BEAST | 10 | 17 | 1 | 8 | 734c0860+dirty | val | won |
| NHA2KW0RB7VP | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | b8ca9311+dirty | val | won |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 1 | 4 | b8ca9311+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 2 | 4 | b8ca9311+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 3 | 4 | b8ca9311+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 4 | 4 | b8ca9311+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 5 | 4 | b8ca9311+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NHA2KW0RB7VP | CRUSHER+ROCKET | 10 | 33 | 6 | 4 | b8ca9311+dirty | val | died |
| G33HU22H2543 | SOUL_FYSH | 10 | 17 | 1 | 8 | 710dc4dc+dirty | val | won |
| G33HU22H2543 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 9 | 710dc4dc+dirty | val | won |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 9 | 710dc4dc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 8 | 710dc4dc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 9 | 710dc4dc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 8 | 710dc4dc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 9 | 710dc4dc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G33HU22H2543 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 8 | 710dc4dc+dirty | val | died |
| P74C04AEPL1F | VANTOM | 10 | 17 | 1 | 9 | fd4c8e52+dirty | val | won |
| RC61MFQM63Y6 | SOUL_FYSH | 10 | 17 | 1 | 11 | 0d6c1a82+dirty | val | won |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | 0d6c1a82+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 2 | 5 | 0d6c1a82+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 3 | 4 | 0d6c1a82+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 4 | 7 | 0d6c1a82+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 5 | 5 | 0d6c1a82+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RC61MFQM63Y6 | CRUSHER+ROCKET | 10 | 33 | 6 | 4 | 0d6c1a82+dirty | val | died |
| BTSRF7JL1W1Y | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | 6ad5584f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BTSRF7JL1W1Y | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 11 | 6ad5584f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BTSRF7JL1W1Y | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 10 | 6ad5584f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BTSRF7JL1W1Y | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 13 | 6ad5584f+dirty | val | won |
| XTSV1U9JD34T | WATERFALL_GIANT | 10 | 17 | 1 | 8 | 03f4ffe0+dirty | val | won |
| XTSV1U9JD34T | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | KNOWLEDGE_DEMON | 10 | 33 | 2 | 10 | 03f4ffe0+dirty | val | won |
| XTSV1U9JD34T | AEONGLASS | 10 | 48 | 1 | 8 | 03f4ffe0+dirty | val | won |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 4 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 4 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 4 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 4 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 4 | 03f4ffe0+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 4 | 03f4ffe0+dirty | val | died |
| 9Z9H2EXKLF3T | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | 6c3d8187+dirty | val | won |
| 9Z9H2EXKLF3T | KNOWLEDGE_DEMON | 10 | 33 | 1 | 9 | 6c3d8187+dirty | val | won |
| 9Z9H2EXKLF3T | AEONGLASS | 10 | 48 | 1 | 7 | 6c3d8187+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9Z9H2EXKLF3T | AEONGLASS | 10 | 48 | 2 | 10 | 6c3d8187+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9Z9H2EXKLF3T | AEONGLASS | 10 | 48 | 3 | 11 | 6c3d8187+dirty | val | died |
| 7X0W3U8TVA2A | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | 047c809e+dirty | val | won |
| MTQ0EUBJ3R6T | CEREMONIAL_BEAST | 10 | 17 | 1 | 11 | ceb74207+dirty | val | won |
| KFRDELW2TH2P | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 6 | a73ce7cc+dirty | val | won |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | a73ce7cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 2 | 7 | a73ce7cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 3 | 7 | a73ce7cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 4 | 7 | a73ce7cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 5 | 7 | a73ce7cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KFRDELW2TH2P | KNOWLEDGE_DEMON | 10 | 33 | 6 | 7 | a73ce7cc+dirty | val | died |
| GXNKW8X1XYJP | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | b1714285+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| GXNKW8X1XYJP | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 9 | b1714285+dirty | val | won |
| GXNKW8X1XYJP | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | b1714285+dirty | val | won |
| PD9AYQVMLQW6 | SOUL_FYSH | 10 | 17 | 1 | 12 | 7f6d5b4b+dirty | val | won |
| PD9AYQVMLQW6 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 13 | 7f6d5b4b+dirty | val | won |
| PD9AYQVMLQW6 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 10 | 7f6d5b4b+dirty | val | won |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 1 | 10 | 7f6d5b4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 2 | 4 | 7f6d5b4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 3 | 5 | 7f6d5b4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 4 | 8 | 7f6d5b4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 5 | 9 | 7f6d5b4b+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PD9AYQVMLQW6 | AEONGLASS | 10 | 49 | 6 | 10 | 7f6d5b4b+dirty | val | died |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 1 | 10 | c1dd721f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 2 | 11 | c1dd721f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 3 | 11 | c1dd721f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 4 | 11 | c1dd721f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 5 | 11 | c1dd721f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L2TSFU62Z57Z | CEREMONIAL_BEAST | 10 | 17 | 6 | 8 | c1dd721f+dirty | val | died |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 15 | aa1e2136+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 10 | aa1e2136+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 14 | aa1e2136+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 14 | aa1e2136+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 14 | aa1e2136+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZTRGYYMLR8SC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 14 | aa1e2136+dirty | val | died |
| K2JAGKVJAWZJ | WATERFALL_GIANT | 10 | 17 | 1 | 10 | 6fd495cc+dirty | val | won |
| K2JAGKVJAWZJ | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | 6fd495cc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| K2JAGKVJAWZJ | CRUSHER+ROCKET | 10 | 33 | 2 | 11 | 6fd495cc+dirty | val | won |
| NEWRFAYKTQHR | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | cecc8317+dirty | val | won |
| 9R916WW0V65N | SOUL_FYSH | 10 | 17 | 1 | 14 | 8ef00878+dirty | val | won |
| 9R916WW0V65N | THE_INSATIABLE | 10 | 33 | 1 | 8 | 8ef00878+dirty | val | won |
| 9R916WW0V65N | TEST_SUBJECT | 10 | 48 | 1 | 11 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | TEST_SUBJECT | 10 | 48 | 2 | 10 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | TEST_SUBJECT | 10 | 48 | 3 | 15 | 8ef00878+dirty | val | won |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 3 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 2 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 3 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 3 | 8ef00878+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 2 | 8ef00878+dirty | val | died |
| T0DGVABPV60U | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | 261af56e+dirty | val | won |
| T0DGVABPV60U | THE_INSATIABLE | 10 | 33 | 1 | 10 | 261af56e+dirty | val | won |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 1 | 6 | 261af56e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 2 | 5 | 261af56e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 3 | 6 | 261af56e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 4 | 5 | 261af56e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 5 | 5 | 261af56e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| T0DGVABPV60U | TEST_SUBJECT | 10 | 48 | 6 | 5 | 261af56e+dirty | val | died |
| G8NHLL09DLBX | WATERFALL_GIANT | 10 | 17 | 1 | 16 | d61bf0ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G8NHLL09DLBX | WATERFALL_GIANT | 10 | 17 | 2 | 21 | d61bf0ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G8NHLL09DLBX | WATERFALL_GIANT | 10 | 17 | 3 | 20 | d61bf0ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G8NHLL09DLBX | WATERFALL_GIANT | 10 | 17 | 4 | 15 | d61bf0ec+dirty | val | won |
| LYBHQ1X230ZB | SOUL_FYSH | 10 | 17 | 1 | 11 | 5925a43d+dirty | val | won |
| H1T1F8ML9FUE | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | 1a0adbaa+dirty | val | won |
| H1T1F8ML9FUE | THE_INSATIABLE | 10 | 33 | 1 | 7 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | THE_INSATIABLE | 10 | 33 | 2 | 9 | 1a0adbaa+dirty | val | won |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 1 | 4 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 2 | 4 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 3 | 5 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 4 | 5 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 5 | 5 | 1a0adbaa+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H1T1F8ML9FUE | AEONGLASS | 10 | 48 | 6 | 4 | 1a0adbaa+dirty | val | died |
| AD3QSC3P41JU | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 11 | a340c1ec+dirty | val | won |
| AD3QSC3P41JU | THE_INSATIABLE | 10 | 33 | 1 | 11 | a340c1ec+dirty | val | won |
| AD3QSC3P41JU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 11 | a340c1ec+dirty | val | won |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 1 | 2 | a340c1ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 2 | 3 | a340c1ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 3 | 2 | a340c1ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 4 | 2 | a340c1ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 5 | 2 | a340c1ec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AD3QSC3P41JU | TEST_SUBJECT | 10 | 49 | 6 | 2 | a340c1ec+dirty | val | died |
| 9DAS5L8YM1CN | CEREMONIAL_BEAST | 10 | 17 | 1 | 11 | 7f0c04dd+dirty | val | won |
| BJLTVSYXCSGS | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | 722518cd+dirty | val | won |
| BJLTVSYXCSGS | CRUSHER+ROCKET | 10 | 33 | 1 | 6 | 722518cd+dirty | val | won |
| Y5H4CFAQ2WTG | WATERFALL_GIANT | 10 | 17 | 1 | 9 | 2b1a5f6d+dirty | val | won |
| Y5H4CFAQ2WTG | THE_INSATIABLE | 10 | 33 | 1 | 10 | 2b1a5f6d+dirty | val | died |
| SY0WMJNNVRLM | VANTOM | 10 | 17 | 1 | 9 | 650a6a84+dirty | val | won |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 1 | 7 | 650a6a84+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 2 | 7 | 650a6a84+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 3 | 7 | 650a6a84+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 4 | 7 | 650a6a84+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 5 | 7 | 650a6a84+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SY0WMJNNVRLM | THE_INSATIABLE | 10 | 33 | 6 | 9 | 650a6a84+dirty | val | died |
| 4XLZURXMD872 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | 187c025a+dirty | val | won |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 1 | 3 | 187c025a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 2 | 3 | 187c025a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 3 | 3 | 187c025a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 4 | 3 | 187c025a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 5 | 3 | 187c025a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4XLZURXMD872 | THE_INSATIABLE | 10 | 33 | 6 | 3 | 187c025a+dirty | val | died |
| QHK1XQ928TTM | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 12 | 69a7b441+dirty | val | won |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 1 | 4 | 69a7b441+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 2 | 5 | 69a7b441+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 3 | 5 | 69a7b441+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 4 | 5 | 69a7b441+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 5 | 4 | 69a7b441+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| QHK1XQ928TTM | CRUSHER+ROCKET | 10 | 33 | 6 | 4 | 69a7b441+dirty | val | died |
| UZ1T7AH49WMB | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 9 | c70efc8c+dirty | val | won |
| CNKR125PFHJ5 | SOUL_FYSH | 10 | 17 | 1 | 7 | c70efc8c+dirty | val | won |
| CNKR125PFHJ5 | THE_INSATIABLE | 10 | 33 | 1 | 6 | c70efc8c+dirty | val | died |
| PF90JTU0UZ5M | WATERFALL_GIANT | 10 | 17 | 1 | 10 | 433144fb+dirty | val | won |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 13 | e838a975+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 14 | e838a975+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 13 | e838a975+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 14 | e838a975+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 12 | e838a975+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2H311EAD34GD | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 12 | e838a975+dirty | val | died |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 1 | 8 | d07c38fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 2 | 8 | d07c38fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 3 | 7 | d07c38fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 4 | 8 | d07c38fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 5 | 8 | d07c38fc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WZL2AMEY85S7 | CEREMONIAL_BEAST | 10 | 17 | 6 | 8 | d07c38fc+dirty | val | died |
| R3AJCGQGGMR4 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 9 | 11d759cf+dirty | val | won |
| R3AJCGQGGMR4 | THE_INSATIABLE | 10 | 33 | 1 | 6 | 11d759cf+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R3AJCGQGGMR4 | THE_INSATIABLE | 10 | 33 | 2 | 7 | 11d759cf+dirty | val | won |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 1 | 6 | 9949a5de+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 2 | 11 | 9949a5de+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 3 | 11 | 9949a5de+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 4 | 10 | 9949a5de+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 5 | 11 | 9949a5de+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| M0GY0A4M2F7H | VANTOM | 10 | 17 | 6 | 7 | 9949a5de+dirty | val | died |
| Z91JN3S3PQX2 | WATERFALL_GIANT | 10 | 17 | 1 | 11 | 049dff24+dirty | val | won |
| Z91JN3S3PQX2 | THE_INSATIABLE | 10 | 33 | 1 | 13 | 049dff24+dirty | val | died |
| LY83ZMTFVKJH | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | 049dff24+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| LY83ZMTFVKJH | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 13 | 049dff24+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| LY83ZMTFVKJH | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 14 | 049dff24+dirty | val | won |
| HEMND3SMQYB8 | VANTOM | 10 | 17 | 1 | 6 | 72499093+dirty | val | won |
| HEMND3SMQYB8 | THE_INSATIABLE | 10 | 33 | 1 | 6 | 72499093+dirty | val | won |
| HEMND3SMQYB8 | AEONGLASS | 10 | 48 | 1 | 6 | 72499093+dirty | val | won |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 2 | 72499093+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 2 | 72499093+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 2 | 72499093+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 2 | 72499093+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 2 | 72499093+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HEMND3SMQYB8 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 4 | 72499093+dirty | val | died |
| P2M3DFJ4DEZ3 | SOUL_FYSH | 10 | 17 | 1 | 12 | 3541bc54+dirty | val | won |
| P2M3DFJ4DEZ3 | THE_INSATIABLE | 10 | 33 | 1 | 10 | 3541bc54+dirty | val | won |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 1 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 2 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 3 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 4 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 5 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | AEONGLASS | 10 | 48 | 6 | 10 | 3541bc54+dirty | val | won |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 5 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 5 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 5 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 6 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 11 | 3541bc54+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| P2M3DFJ4DEZ3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 5 | 3541bc54+dirty | val | died |
| PBUBM0LRTEDD | WATERFALL_GIANT | 10 | 17 | 1 | 11 | 8149e4ca+dirty | val | won |
| PBUBM0LRTEDD | THE_INSATIABLE | 10 | 33 | 1 | 7 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | THE_INSATIABLE | 10 | 33 | 2 | 8 | 8149e4ca+dirty | val | won |
| PBUBM0LRTEDD | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 6 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 6 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 9 | 8149e4ca+dirty | val | won |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 1 | 3 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 2 | 3 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 3 | 3 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 4 | 2 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 5 | 3 | 8149e4ca+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PBUBM0LRTEDD | TEST_SUBJECT | 10 | 49 | 6 | 3 | 8149e4ca+dirty | val | died |
| 456MRNGCPD8E | WATERFALL_GIANT | 10 | 17 | 1 | 9 | a7c2a411+dirty | val | won |
| J8PHG72DGD90 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | 20cec89a+dirty | val | won |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | 20cec89a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 2 | 13 | 20cec89a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 3 | 13 | 20cec89a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 4 | 11 | 20cec89a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 5 | 13 | 20cec89a+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| J8PHG72DGD90 | KNOWLEDGE_DEMON | 10 | 33 | 6 | 13 | 20cec89a+dirty | val | died |
| 0DJ6GFZZ0TG9 | WATERFALL_GIANT | 10 | 17 | 1 | 8 | 3cadc990+dirty | val | won |
| 0DJ6GFZZ0TG9 | CRUSHER+ROCKET | 10 | 33 | 1 | 6 | 3cadc990+dirty | val | died |
| KSX97DF5H3NY | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | 3cadc990+dirty | val | won |
| SV2GP9NX4HQD | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 17 | 52aa3fcc+dirty | val | won |
| SV2GP9NX4HQD | CRUSHER+ROCKET | 10 | 33 | 1 | 14 | 52aa3fcc+dirty | val | won |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 1 | 9 | 52aa3fcc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 2 | 8 | 52aa3fcc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 3 | 9 | 52aa3fcc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 4 | 9 | 52aa3fcc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 5 | 11 | 52aa3fcc+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SV2GP9NX4HQD | AEONGLASS | 10 | 48 | 6 | 10 | 52aa3fcc+dirty | val | died |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | 3d05e954+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 8 | 3d05e954+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 8 | 3d05e954+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 10 | 3d05e954+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 10 | 3d05e954+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CSLHFCBSC1UM | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 10 | 3d05e954+dirty | val | died |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 1 | 16 | cfa8112d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 2 | 16 | cfa8112d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 3 | 15 | cfa8112d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 4 | 16 | cfa8112d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 5 | 16 | cfa8112d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SDY5T9XCSQN2 | WATERFALL_GIANT | 10 | 17 | 6 | 15 | cfa8112d+dirty | val | died |
| VAC6Z1PZ1QJG | VANTOM | 10 | 17 | 1 | 7 | bb728531+dirty | val | won |
| VAC6Z1PZ1QJG | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | bb728531+dirty | val | won |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 12 | bb728531+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 12 | bb728531+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 12 | bb728531+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 12 | bb728531+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 12 | bb728531+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VAC6Z1PZ1QJG | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 12 | bb728531+dirty | val | died |
| E6DYYXRX7GVE | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 9 | 5ff4270d+dirty | val | won |
| E6DYYXRX7GVE | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | 5ff4270d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DYYXRX7GVE | KNOWLEDGE_DEMON | 10 | 33 | 2 | 14 | 5ff4270d+dirty | val | won |
| XZUJR08FW801 | VANTOM | 10 | 17 | 1 | 10 | 9a7dc931+dirty | val | won |
| JBX9JLH46KVN | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | d5f290f4+dirty | val | won |
| JBX9JLH46KVN | THE_INSATIABLE | 10 | 33 | 1 | 8 | d5f290f4+dirty | val | won |
| JBX9JLH46KVN | AEONGLASS | 10 | 48 | 1 | 11 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | AEONGLASS | 10 | 48 | 2 | 11 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | AEONGLASS | 10 | 48 | 3 | 11 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | AEONGLASS | 10 | 48 | 4 | 10 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | AEONGLASS | 10 | 48 | 5 | 9 | d5f290f4+dirty | val | won |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 1 | 2 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 2 | 2 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 3 | 2 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 4 | 2 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 5 | 2 | d5f290f4+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JBX9JLH46KVN | TEST_SUBJECT | 10 | 49 | 6 | 2 | d5f290f4+dirty | val | died |
| RMNXHZKV716Y | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 11 | 6519b8909+dirty | val | won |
| RMNXHZKV716Y | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | 6519b8909+dirty | val | won |
| RMNXHZKV716Y | AEONGLASS | 10 | 48 | 1 | 11 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | AEONGLASS | 10 | 48 | 2 | 11 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | AEONGLASS | 10 | 48 | 3 | 13 | 6519b8909+dirty | val | won |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 4 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 4 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 2 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 4 | 6519b8909+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RMNXHZKV716Y | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 4 | 6519b8909+dirty | val | died |
| NBJBVSBNPYQB | VANTOM | 10 | 17 | 1 | 10 | 10168ac71+dirty | val | won |
| NBJBVSBNPYQB | CRUSHER+ROCKET | 10 | 33 | 1 | 8 | 10168ac71+dirty | val | won |
| NBJBVSBNPYQB | AEONGLASS | 10 | 48 | 1 | 6 | 10168ac71+dirty | val | won |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | 10168ac71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 3 | 10168ac71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 3 | 10168ac71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 3 | 10168ac71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 3 | 10168ac71+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NBJBVSBNPYQB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 3 | 10168ac71+dirty | val | died |
| AF76L5UTPP8U | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 15 | d5ad91e80+dirty | val | won |
| 833ZM0MJGWHC | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | 57b661f07+dirty | val | won |
| 833ZM0MJGWHC | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | 57b661f07+dirty | val | won |
| 833ZM0MJGWHC | AEONGLASS | 10 | 48 | 1 | 7 | 57b661f07+dirty | val | won |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 1 | 8 | 57b661f07+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 2 | 6 | 57b661f07+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 3 | 3 | 57b661f07+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 4 | 3 | 57b661f07+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 5 | 3 | 57b661f07+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 833ZM0MJGWHC | TEST_SUBJECT | 10 | 49 | 6 | 7 | 57b661f07+dirty | val | died |
| 64R0P0MTZWAX | VANTOM | 10 | 17 | 1 | 11 | 7375067d7+dirty | val | won |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | 7375067d7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 2 | 13 | 7375067d7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 3 | 13 | 7375067d7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 4 | 13 | 7375067d7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 5 | 13 | 7375067d7+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64R0P0MTZWAX | KNOWLEDGE_DEMON | 10 | 33 | 6 | 11 | 7375067d7+dirty | val | died |
| C6Z8ATNBNHZ7 | SOUL_FYSH | 10 | 17 | 1 | 9 | c7e1e0ed3+dirty | val | won |
| XW8B5CHJ814J | VANTOM | 10 | 17 | 1 | 11 | c7e1e0ed3+dirty | val | won |
| XW8B5CHJ814J | KNOWLEDGE_DEMON | 10 | 33 | 1 | 13 | c7e1e0ed3+dirty | val | won |
| XW8B5CHJ814J | TEST_SUBJECT | 10 | 48 | 1 | 12 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | TEST_SUBJECT | 10 | 48 | 2 | 12 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | TEST_SUBJECT | 10 | 48 | 3 | 11 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | TEST_SUBJECT | 10 | 48 | 4 | 17 | c7e1e0ed3+dirty | val | won |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 3 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 3 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 3 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 3 | c7e1e0ed3+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XW8B5CHJ814J | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 3 | c7e1e0ed3+dirty | val | died |
| R6WDLYS19ZTY | WATERFALL_GIANT | 10 | 17 | 1 | 13 | c308b61e1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R6WDLYS19ZTY | WATERFALL_GIANT | 10 | 17 | 2 | 13 | c308b61e1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R6WDLYS19ZTY | WATERFALL_GIANT | 10 | 17 | 3 | 10 | c308b61e1+dirty | val | won |
| R6WDLYS19ZTY | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | c308b61e1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R6WDLYS19ZTY | CRUSHER+ROCKET | 10 | 33 | 2 | 10 | c308b61e1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R6WDLYS19ZTY | CRUSHER+ROCKET | 10 | 33 | 3 | 10 | c308b61e1+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| R6WDLYS19ZTY | CRUSHER+ROCKET | 10 | 33 | 4 | 10 | c308b61e1+dirty | val | won |
| HNX4A2WBC34W | CEREMONIAL_BEAST | 10 | 17 | 1 | 12 | 5957f0563+dirty | val | won |
| HNX4A2WBC34W | THE_INSATIABLE | 10 | 33 | 1 | 11 | 5957f0563+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HNX4A2WBC34W | THE_INSATIABLE | 10 | 33 | 2 | 10 | 5957f0563+dirty | val | won |
| HNX4A2WBC34W | AEONGLASS | 10 | 48 | 1 | 7 | 5957f0563+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HNX4A2WBC34W | AEONGLASS | 10 | 48 | 2 | 7 | 5957f0563+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HNX4A2WBC34W | AEONGLASS | 10 | 48 | 3 | 8 | 5957f0563+dirty | val | died |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | d6a39489f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 2 | 5 | d6a39489f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 3 | 6 | d6a39489f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 4 | 7 | d6a39489f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 5 | 6 | d6a39489f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| HXCY44VD9QWU | CEREMONIAL_BEAST | 10 | 17 | 6 | 8 | d6a39489f+dirty | val | died |
| 54G5683J0E5S | VANTOM | 10 | 17 | 1 | 11 | eaf3ac162+dirty | val | won |
| 54G5683J0E5S | KNOWLEDGE_DEMON | 10 | 33 | 1 | 12 | eaf3ac162+dirty | val | won |
| 9663Y88TYK73 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | 6e8de8ea4+dirty | val | won |
| 9663Y88TYK73 | THE_INSATIABLE | 10 | 33 | 1 | 7 | 6e8de8ea4+dirty | val | won |
| 0PH64C4AWAX9 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 11 | a8bb1ebe5+dirty | val | won |
| Q389KW7SVWKH | SOUL_FYSH | 10 | 17 | 1 | 8 | a8bb1ebe5+dirty | val | won |
| Q389KW7SVWKH | CRUSHER+ROCKET | 10 | 33 | 1 | 8 | a8bb1ebe5+dirty | val | won |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 1 | 6 | a8bb1ebe5+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 2 | 5 | a8bb1ebe5+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 3 | 6 | a8bb1ebe5+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 4 | 3 | a8bb1ebe5+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 5 | 4 | a8bb1ebe5+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q389KW7SVWKH | TEST_SUBJECT | 10 | 48 | 6 | 5 | a8bb1ebe5+dirty | val | died |
| 8HW407EAUYL7 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | 77b15f03f+dirty | val | won |
| 8HW407EAUYL7 | THE_INSATIABLE | 10 | 33 | 1 | 10 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | THE_INSATIABLE | 10 | 33 | 2 | 11 | 77b15f03f+dirty | val | won |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 6 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 9 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 9 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 16 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 15 | 77b15f03f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 8HW407EAUYL7 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 14 | 77b15f03f+dirty | val | died |
| WN0HA1L6MJ99 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 15 | d422c5cec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WN0HA1L6MJ99 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 11 | d422c5cec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WN0HA1L6MJ99 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 10 | d422c5cec+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WN0HA1L6MJ99 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 11 | d422c5cec+dirty | val | won |
| 9GVYTHSXB4Z5 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | b934d888d+dirty | val | won |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 1 | 6 | b934d888d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 2 | 7 | b934d888d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 3 | 7 | b934d888d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 4 | 8 | b934d888d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 5 | 7 | b934d888d+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GVYTHSXB4Z5 | CRUSHER+ROCKET | 10 | 33 | 6 | 8 | b934d888d+dirty | val | died |
| 08A0GEAL8KQ5 | CEREMONIAL_BEAST | 10 | 17 | 1 | 10 | 4cc52f9ab+dirty | val | won |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 1 | 5 | 4cc52f9ab+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 2 | 4 | 4cc52f9ab+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 3 | 4 | 4cc52f9ab+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 4 | 5 | 4cc52f9ab+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 5 | 4 | 4cc52f9ab+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 08A0GEAL8KQ5 | CRUSHER+ROCKET | 10 | 33 | 6 | 4 | 4cc52f9ab+dirty | val | died |
| 9SRPBTZYN44H | WATERFALL_GIANT | 10 | 17 | 1 | 11 | 334d51498+dirty | val | won |
| AYTX5H4H69E3 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | 099656e5f+dirty | val | won |
| AYTX5H4H69E3 | CRUSHER+ROCKET | 10 | 33 | 1 | 12 | 099656e5f+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| AYTX5H4H69E3 | CRUSHER+ROCKET | 10 | 33 | 2 | 12 | 099656e5f+dirty | val | won |
| 0B2567HG3T4D | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 10 | 157808e1e+dirty | val | won |
| 0B2567HG3T4D | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | KNOWLEDGE_DEMON | 10 | 33 | 2 | 11 | 157808e1e+dirty | val | won |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 1 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 2 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 3 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 4 | 5 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 5 | 4 | 157808e1e+dirty | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0B2567HG3T4D | AEONGLASS | 10 | 48 | 6 | 5 | 157808e1e+dirty | val | died |
| PYE4VXNSLGSS | VANTOM | 10 | 17 | 1 | 8 | current | val | won |
| PYE4VXNSLGSS | CRUSHER+ROCKET | 10 | 33 | 1 | 6 | current | val | died |
| Y8GDTNWG4R3X | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| Y8GDTNWG4R3X | KNOWLEDGE_DEMON | 10 | 33 | 1 | 12 | current | val | won |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y8GDTNWG4R3X | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 9 | current | val | died |
| X4M1GPAJGAB9 | VANTOM | 10 | 17 | 1 | 12 | current | val | won |
| 5BU7ZE1PWLSX | CEREMONIAL_BEAST | 10 | 17 | 1 | 10 | current | val | won |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 5 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5BU7ZE1PWLSX | CRUSHER+ROCKET | 10 | 33 | 6 | 9 | current | val | died |
| KDBWARERSGYW | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | current | val | won |
| KDBWARERSGYW | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | val | won |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 3 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 4 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KDBWARERSGYW | TEST_SUBJECT | 10 | 48 | 6 | 16 | current | val | died |
| TFYU1MY8NEJ1 | CEREMONIAL_BEAST | 10 | 17 | 1 | 6 | current | val | won |
| TFYU1MY8NEJ1 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | val | won |
| TFYU1MY8NEJ1 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 7 | current | val | won |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 1 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 2 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 3 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 4 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 5 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TFYU1MY8NEJ1 | TEST_SUBJECT | 10 | 49 | 6 | 3 | current | val | died |
| 49HL2N70CHMU | VANTOM | 10 | 17 | 1 | 7 | current | val | won |
| 49HL2N70CHMU | KNOWLEDGE_DEMON | 10 | 33 | 1 | 8 | current | val | won |
| 49HL2N70CHMU | AEONGLASS | 10 | 48 | 1 | 7 | current | val | won |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 49HL2N70CHMU | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 3 | current | val | died |
| F1TP5W6GF56Q | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 13 | current | val | won |
| 0DTPVHFXJ319 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | current | val | won |
| DW8M3G2PV3N7 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DW8M3G2PV3N7 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 10 | current | val | won |
| 675CHRV9HVQ3 | VANTOM | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 675CHRV9HVQ3 | VANTOM | 10 | 17 | 2 | 7 | current | val | won |
| 53NU9DWSTG9H | VANTOM | 10 | 17 | 1 | 10 | current | val | won |
| 53NU9DWSTG9H | KNOWLEDGE_DEMON | 10 | 33 | 1 | 9 | current | val | won |
| 53NU9DWSTG9H | AEONGLASS | 10 | 48 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 53NU9DWSTG9H | AEONGLASS | 10 | 48 | 2 | 7 | current | val | died |
| 1M7Z1CTJ3M1J | VANTOM | 10 | 17 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1M7Z1CTJ3M1J | VANTOM | 10 | 17 | 2 | 10 | current | val | won |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VT2F13ADA3M3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 11 | current | val | died |
| V3PJA3FV92BG | WATERFALL_GIANT | 10 | 17 | 1 | 6 | current | val | won |
| V3PJA3FV92BG | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | val | won |
| 3DY1QBM0CET0 | SOUL_FYSH | 10 | 17 | 1 | 8 | current | val | won |
| MR7EBRYRJ5R6 | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | val | won |
| EWLY3PWDDXJK | VANTOM | 10 | 17 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EWLY3PWDDXJK | VANTOM | 10 | 17 | 2 | 13 | current | val | won |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 5 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| U51W81MEBCLZ | SOUL_FYSH | 10 | 17 | 6 | 10 | current | val | died |
| 7S8HCC0M6G9W | CEREMONIAL_BEAST | 10 | 17 | 1 | 13 | current | val | won |
| 7S8HCC0M6G9W | THE_INSATIABLE | 10 | 33 | 1 | 6 | current | val | won |
| 7S8HCC0M6G9W | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 7 | current | val | won |
| 7S8HCC0M6G9W | AEONGLASS | 10 | 49 | 1 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 7S8HCC0M6G9W | AEONGLASS | 10 | 49 | 2 | 10 | current | val | won |
| LWQYSREHMMJ7 | VANTOM | 10 | 17 | 1 | 10 | current | val | won |
| 3R3LY2HVPPG0 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 17 | current | val | won |
| UV5YK5721RPB | WATERFALL_GIANT | 10 | 17 | 1 | 9 | current | val | won |
| BHSVN6X84UMN | VANTOM | 10 | 17 | 1 | 10 | current | val | won |
| U1QYLX1AE1WX | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 12 | current | val | won |
| U1QYLX1AE1WX | CRUSHER+ROCKET | 10 | 33 | 1 | 8 | current | val | won |
| N3YHJMV1ATFR | SOUL_FYSH | 10 | 17 | 1 | 11 | current | val | won |
| N3YHJMV1ATFR | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | val | won |
| G2QCF2R3A57K | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| G2QCF2R3A57K | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | current | val | won |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 2 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 3 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 4 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 5 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G2QCF2R3A57K | AEONGLASS | 10 | 48 | 6 | 5 | current | val | died |
| 8S9RNHFU5XF1 | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | current | val | won |
| 562GNK4ESMPE | SOUL_FYSH | 10 | 17 | 1 | 11 | current | val | won |
| L38NLY1XJ7VU | VANTOM | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L38NLY1XJ7VU | VANTOM | 10 | 17 | 2 | 10 | current | val | won |
| SPC7NVA5K4RL | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | current | val | won |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 4 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 5 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SPC7NVA5K4RL | THE_INSATIABLE | 10 | 33 | 6 | 8 | current | val | won |
| H9ERYJLBL4UC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| H9ERYJLBL4UC | THE_INSATIABLE | 10 | 33 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | THE_INSATIABLE | 10 | 33 | 2 | 9 | current | val | won |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| H9ERYJLBL4UC | TEST_SUBJECT | 10 | 48 | 6 | 12 | current | val | died |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 6D0M76419BU7 | WATERFALL_GIANT | 10 | 17 | 6 | 12 | current | val | died |
| 34PV33AA12QH | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 16 | current | val | won |
| 34PV33AA12QH | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 34PV33AA12QH | KNOWLEDGE_DEMON | 10 | 33 | 2 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 34PV33AA12QH | KNOWLEDGE_DEMON | 10 | 33 | 3 | 14 | current | val | won |
| P33MKRP6S4Q4 | SOUL_FYSH | 10 | 17 | 1 | 12 | current | val | won |
| P33MKRP6S4Q4 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 13 | current | val | won |
| BSXYMFKN0VJ5 | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | val | won |
| BSXYMFKN0VJ5 | CRUSHER+ROCKET | 10 | 33 | 1 | 10 | current | val | won |
| BSXYMFKN0VJ5 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 9 | current | val | won |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 1 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 2 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 3 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 4 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 5 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BSXYMFKN0VJ5 | TEST_SUBJECT | 10 | 49 | 6 | 3 | current | val | died |
| YBRA3EJ94GBR | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YBRA3EJ94GBR | KNOWLEDGE_DEMON | 10 | 33 | 6 | 10 | current | val | died |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 1 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 2 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 3 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 4 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 5 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3UPY3BP2LVS7 | CEREMONIAL_BEAST | 10 | 17 | 6 | 14 | current | val | died |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 1 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 3 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 4 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 5 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NYQW6JAD30K4 | WATERFALL_GIANT | 10 | 17 | 6 | 13 | current | val | died |
| E6DSUVTNVBMH | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | current | val | won |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E6DSUVTNVBMH | CRUSHER+ROCKET | 10 | 33 | 6 | 7 | current | val | died |
| 64VJC5XT2AT2 | VANTOM | 10 | 17 | 1 | 10 | current | val | won |
| 64VJC5XT2AT2 | THE_INSATIABLE | 10 | 33 | 1 | 9 | current | val | won |
| 64VJC5XT2AT2 | AEONGLASS | 10 | 48 | 1 | 13 | current | val | won |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 1 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 2 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 3 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 5 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 64VJC5XT2AT2 | TEST_SUBJECT | 10 | 49 | 6 | 6 | current | val | died |
| SB5N8GT2Y3VW | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | current | val | won |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 3 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| SB5N8GT2Y3VW | CRUSHER+ROCKET | 10 | 33 | 6 | 6 | current | val | died |
| N1ZEBMHZM4KC | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | 65e3d10a9+dirty | val | won |
| C7GNN3DDFUFY | VANTOM | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | VANTOM | 10 | 17 | 2 | 10 | current | val | won |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 5 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| C7GNN3DDFUFY | THE_INSATIABLE | 10 | 33 | 6 | 7 | current | val | died |
| F6XY4QJMS5RC | VANTOM | 10 | 17 | 1 | 8 | current | val | won |
| F6XY4QJMS5RC | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | val | died |
| CMS8QL9E3C5U | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 11 | current | val | won |
| PUY011SBWSSU | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | WATERFALL_GIANT | 10 | 17 | 2 | 10 | current | val | won |
| PUY011SBWSSU | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | current | val | won |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 2 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 4 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PUY011SBWSSU | TEST_SUBJECT | 10 | 48 | 6 | 9 | current | val | died |
| KF9HMZKTFC3V | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | current | val | won |
| KF9HMZKTFC3V | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | val | won |
| KF9HMZKTFC3V | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| KF9HMZKTFC3V | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 10 | current | val | won |
| KF9HMZKTFC3V | AEONGLASS | 10 | 49 | 1 | 6 | current | val | won |
| K643VJCTQT0J | WATERFALL_GIANT | 10 | 17 | 1 | 12 | current | val | won |
| K643VJCTQT0J | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| K643VJCTQT0J | CRUSHER+ROCKET | 10 | 33 | 2 | 12 | current | val | won |
| L6745E2ND5CT | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| L6745E2ND5CT | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | KNOWLEDGE_DEMON | 10 | 33 | 2 | 12 | current | val | won |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 5 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| L6745E2ND5CT | TEST_SUBJECT | 10 | 48 | 6 | 9 | current | val | died |
| 16UDD0430SXT | VANTOM | 10 | 17 | 1 | 7 | current | val | won |
| 16UDD0430SXT | THE_INSATIABLE | 10 | 33 | 1 | 8 | current | val | won |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 16UDD0430SXT | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 5 | current | val | died |
| 0C3AR6J0Z8LD | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | current | val | won |
| 0C3AR6J0Z8LD | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | val | won |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0C3AR6J0Z8LD | AEONGLASS | 10 | 48 | 6 | 11 | current | val | died |
| 8ZCFND4T35H7 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| PCDMYK2AEB2D | VANTOM | 10 | 17 | 1 | 7 | current | val | won |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 1 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 2 | 15 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 3 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 4 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 5 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DSZM9BL9B0B | WATERFALL_GIANT | 10 | 17 | 6 | 13 | current | val | died |
| 47731LKMZRBJ | CEREMONIAL_BEAST | 10 | 17 | 1 | 16 | current | val | won |
| 47731LKMZRBJ | THE_INSATIABLE | 10 | 33 | 1 | 5 | current | val | died |
| G4PQBCJQ7NP0 | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | current | val | won |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 2 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 3 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 4 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| G4PQBCJQ7NP0 | THE_INSATIABLE | 10 | 33 | 6 | 6 | current | val | died |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| XRCP2TKYKQBA | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 13 | current | val | died |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 4 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 5 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3WWHBRG66B7F | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 6 | 10 | current | val | died |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 2 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 4 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| MEXYTC0Z2MQQ | CEREMONIAL_BEAST | 10 | 17 | 6 | 7 | current | val | died |
| 4ATPGGUBWG8L | VANTOM | 10 | 17 | 1 | 11 | current | val | won |
| NEPESJXEV9V3 | CEREMONIAL_BEAST | 10 | 17 | 1 | 8 | current | val | won |
| NEPESJXEV9V3 | CRUSHER+ROCKET | 10 | 33 | 1 | 8 | current | val | won |
| WCDTYJKUDS4T | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 7 | current | val | won |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WCDTYJKUDS4T | KNOWLEDGE_DEMON | 10 | 33 | 6 | 7 | current | val | died |
| FETDVL1P59B9 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 7 | current | val | won |
| D9XJAX5KCSU2 | VANTOM | 10 | 17 | 1 | 6 | current | val | won |
| D9XJAX5KCSU2 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | val | won |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D9XJAX5KCSU2 | AEONGLASS | 10 | 48 | 6 | 7 | current | val | died |
| VGNDNGPFYRE3 | VANTOM | 10 | 17 | 1 | 6 | current | val | won |
| YZQEEDWQ6AY6 | WATERFALL_GIANT | 10 | 17 | 1 | 13 | current | val | won |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 2 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 3 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 4 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 5 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZQEEDWQ6AY6 | CRUSHER+ROCKET | 10 | 33 | 6 | 13 | current | val | died |
| TGTXN42TE0X4 | SOUL_FYSH | 10 | 17 | 1 | 8 | current | val | won |
| WG8GK5B9D7YH | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | current | val | won |
| V4BTVFPS9XHV | VANTOM | 10 | 17 | 1 | 11 | current | val | won |
| GD9QSQM0PH8T | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 6 | current | val | won |
| 3DW2DM7EY22W | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 1 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 2 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 3 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 5 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 3DW2DM7EY22W | THE_INSATIABLE | 10 | 33 | 6 | 10 | current | val | died |
| NQKVQ9RD9T2N | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| NQKVQ9RD9T2N | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 14 | current | val | won |
| A4VWQKBVBBMP | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 8 | current | val | won |
| PLMNP6XWPPC6 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | current | val | won |
| Y82C2NV7WM2M | WATERFALL_GIANT | 10 | 17 | 1 | 9 | current | val | won |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Y82C2NV7WM2M | KNOWLEDGE_DEMON | 10 | 33 | 6 | 6 | current | val | died |
| DWW8GX3UQCQM | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| DWW8GX3UQCQM | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | val | died |
| D2JR3FN0VYH5 | VANTOM | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| D2JR3FN0VYH5 | VANTOM | 10 | 17 | 2 | 7 | current | val | won |
| 32VSST9UX7MN | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| WA7FRJ7UABCV | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 14 | current | val | won |
| WA7FRJ7UABCV | THE_INSATIABLE | 10 | 33 | 1 | 13 | current | val | won |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 3 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| WA7FRJ7UABCV | AEONGLASS | 10 | 48 | 6 | 10 | current | val | died |
| 4U3WNL3JRRCX | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 1 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 2 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 3 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 4 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 4U3WNL3JRRCX | THE_INSATIABLE | 10 | 33 | 6 | 6 | current | val | died |
| 1269Y20SKHUM | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 13 | current | val | won |
| 1269Y20SKHUM | KNOWLEDGE_DEMON | 10 | 33 | 1 | 10 | current | val | won |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1269Y20SKHUM | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 9 | current | val | died |
| E5L15SK6ZHZB | SOUL_FYSH | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| E5L15SK6ZHZB | SOUL_FYSH | 10 | 17 | 2 | 13 | current | val | won |
| E5L15SK6ZHZB | THE_INSATIABLE | 10 | 33 | 1 | 9 | current | val | won |
| 8AGEGLG40SV3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 15 | current | val | won |
| EEVP0QTLMSX9 | CEREMONIAL_BEAST | 10 | 17 | 1 | 9 | current | val | won |
| EEVP0QTLMSX9 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | current | val | won |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| EEVP0QTLMSX9 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 7 | current | val | died |
| LKC9YXKZWTKR | VANTOM | 10 | 17 | 1 | 12 | current | val | won |
| LKC9YXKZWTKR | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | val | won |
| LKC9YXKZWTKR | AEONGLASS | 10 | 48 | 1 | 9 | current | val | won |
| LKC9YXKZWTKR | TEST_SUBJECT | 10 | 49 | 1 | 16 | current | val | won |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q9FM7A80E4BZ | LAGAVULIN_MATRIARCH | 10 | 17 | 6 | 11 | current | val | died |
| 6ZGMGEQ5YDVK | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| 6ZGMGEQ5YDVK | KNOWLEDGE_DEMON | 10 | 33 | 1 | 12 | current | val | won |
| EBVT8UZM6P12 | CEREMONIAL_BEAST | 10 | 17 | 1 | 12 | current | val | won |
| EBVT8UZM6P12 | THE_INSATIABLE | 10 | 33 | 1 | 8 | current | val | won |
| Q10YYQ5DUPJA | WATERFALL_GIANT | 10 | 17 | 1 | 12 | current | val | won |
| Q10YYQ5DUPJA | CRUSHER+ROCKET | 10 | 33 | 1 | 13 | current | val | won |
| Q10YYQ5DUPJA | AEONGLASS | 10 | 48 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | AEONGLASS | 10 | 48 | 2 | 9 | current | val | won |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 2 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 3 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 4 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| Q10YYQ5DUPJA | TEST_SUBJECT | 10 | 49 | 6 | 6 | current | val | died |
| 9GTFF6DC500L | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 7 | current | val | won |
| 9GTFF6DC500L | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | val | won |
| 9GTFF6DC500L | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 6 | current | val | won |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 2 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9GTFF6DC500L | AEONGLASS | 10 | 49 | 6 | 8 | current | val | won |
| QRZX1S9USYWP | VANTOM | 10 | 17 | 1 | 10 | current | val | won |
| W1YY8PEWGUF9 | WATERFALL_GIANT | 10 | 17 | 1 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W1YY8PEWGUF9 | WATERFALL_GIANT | 10 | 17 | 2 | 8 | current | val | won |
| W1YY8PEWGUF9 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| W1YY8PEWGUF9 | KNOWLEDGE_DEMON | 10 | 33 | 2 | 10 | current | val | won |
| YUWMCVH6MFUH | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| YUWMCVH6MFUH | THE_INSATIABLE | 10 | 33 | 1 | 10 | current | val | won |
| 1GN7WFBWC2E3 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| 1GN7WFBWC2E3 | CRUSHER+ROCKET | 10 | 33 | 1 | 11 | current | val | won |
| 1GN7WFBWC2E3 | AEONGLASS | 10 | 48 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1GN7WFBWC2E3 | AEONGLASS | 10 | 48 | 2 | 8 | current | val | won |
| 1GN7WFBWC2E3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 1GN7WFBWC2E3 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 5 | current | val | died |
| X06YT1507E5M | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 16 | current | val | won |
| X06YT1507E5M | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | CRUSHER+ROCKET | 10 | 33 | 2 | 12 | current | val | won |
| X06YT1507E5M | TEST_SUBJECT | 10 | 48 | 1 | 16 | current | val | won |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| X06YT1507E5M | AEONGLASS | 10 | 49 | 6 | 7 | current | val | died |
| 2E4UQ1BZTQWB | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| REEBQHPHSWGK | WATERFALL_GIANT | 10 | 17 | 1 | 10 | current | val | won |
| REEBQHPHSWGK | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| REEBQHPHSWGK | THE_INSATIABLE | 10 | 33 | 2 | 6 | current | val | won |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 13CBGUPK6122 | VANTOM | 10 | 17 | 6 | 11 | current | val | won |
| UPAB38G2PA02 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 12 | current | val | won |
| UPAB38G2PA02 | THE_INSATIABLE | 10 | 33 | 1 | 9 | current | val | won |
| UPAB38G2PA02 | AEONGLASS | 10 | 48 | 1 | 10 | current | val | won |
| UPAB38G2PA02 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| UPAB38G2PA02 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 13 | current | val | won |
| WJ0LTVSSDY61 | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| HLAWCGM3KHVB | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 13 | current | val | won |
| HLAWCGM3KHVB | THE_INSATIABLE | 10 | 33 | 1 | 9 | current | val | won |
| HLAWCGM3KHVB | TEST_SUBJECT | 10 | 48 | 1 | 17 | current | val | won |
| HLAWCGM3KHVB | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 10 | current | val | died |
| DUB5VQQ6D6D1 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 9 | current | val | won |
| 2LZHP9BYFTHE | CEREMONIAL_BEAST | 10 | 17 | 1 | 10 | current | val | won |
| 2LZHP9BYFTHE | KNOWLEDGE_DEMON | 10 | 33 | 1 | 11 | current | val | won |
| RQCHNN0W72KF | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 8 | current | val | won |
| RQCHNN0W72KF | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | val | won |
| RQCHNN0W72KF | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 8 | current | val | won |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 1 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 2 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 3 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 4 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 5 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| RQCHNN0W72KF | TEST_SUBJECT | 10 | 49 | 6 | 2 | current | val | died |
| VNSXWCWXR3VW | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 8 | current | val | won |
| VNSXWCWXR3VW | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | val | won |
| VNSXWCWXR3VW | AEONGLASS | 10 | 48 | 1 | 9 | current | val | won |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 2 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 3 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 4 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| VNSXWCWXR3VW | TEST_SUBJECT | 10 | 49 | 6 | 3 | current | val | died |
| PTGQF9BEQ6G1 | SOUL_FYSH | 10 | 17 | 1 | 13 | current | val | won |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 1 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 2 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 3 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 4 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 5 | 12 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| PTGQF9BEQ6G1 | CRUSHER+ROCKET | 10 | 33 | 6 | 14 | current | val | died |
| ZE2DNC29WWHB | SOUL_FYSH | 10 | 17 | 1 | 15 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| ZE2DNC29WWHB | SOUL_FYSH | 10 | 17 | 2 | 17 | current | val | won |
| JWK2C8LE4SFV | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 13 | current | val | won |
| JWK2C8LE4SFV | KNOWLEDGE_DEMON | 10 | 33 | 1 | 14 | current | val | won |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 1 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 3 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JWK2C8LE4SFV | TEST_SUBJECT | 10 | 48 | 6 | 8 | current | val | died |
| TKAN594T9SKS | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | val | won |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 1 | 18 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 2 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 3 | 18 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 4 | 18 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 5 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 0BHQCPAF33N6 | CEREMONIAL_BEAST | 10 | 17 | 6 | 13 | current | val | died |
| BGRC1SURKBJY | SOUL_FYSH | 10 | 17 | 1 | 11 | current | val | won |
| BGRC1SURKBJY | KNOWLEDGE_DEMON | 10 | 33 | 1 | 8 | current | val | won |
| BGRC1SURKBJY | AEONGLASS | 10 | 48 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BGRC1SURKBJY | AEONGLASS | 10 | 48 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BGRC1SURKBJY | AEONGLASS | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| BGRC1SURKBJY | AEONGLASS | 10 | 48 | 4 | 7 | current | val | died |
| LTQ083RTNZJQ | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 6 | current | val | won |
| ATP5MCMJDMQY | WATERFALL_GIANT | 10 | 17 | 1 | 12 | current | val | died |
| DHYFWEN40SJ7 | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | val | won |
| DHYFWEN40SJ7 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 12 | current | val | won |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 1 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 2 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 3 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 4 | 13 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 5 | 14 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DHYFWEN40SJ7 | TEST_SUBJECT | 10 | 48 | 6 | 14 | current | val | died |
| 9KP5S3317EEL | CEREMONIAL_BEAST | 10 | 17 | 1 | 12 | current | val | won |
| 9KP5S3317EEL | THE_INSATIABLE | 10 | 33 | 1 | 10 | current | val | won |
| 9KP5S3317EEL | TEST_SUBJECT | 10 | 48 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | TEST_SUBJECT | 10 | 48 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | TEST_SUBJECT | 10 | 48 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | TEST_SUBJECT | 10 | 48 | 4 | 11 | current | val | won |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 1 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 1 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 1 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 1 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 1 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 9KP5S3317EEL | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 1 | current | val | died |
| FGKZALWSTQQ1 | SOUL_FYSH | 10 | 17 | 1 | 11 | current | val | won |
| FD8NZAHU7SNY | SOUL_FYSH | 10 | 17 | 1 | 8 | current | val | won |
| TCDUBRWMEMNA | VANTOM | 10 | 17 | 1 | 12 | current | val | won |
| TCDUBRWMEMNA | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | val | won |
| TCDUBRWMEMNA | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 12 | current | val | won |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 2 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 3 | 2 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 4 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 5 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| TCDUBRWMEMNA | AEONGLASS | 10 | 49 | 6 | 4 | current | val | died |
| 4Z2GCLA4DU52 | VANTOM | 10 | 17 | 1 | 9 | current | val | won |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 1 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 3 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 4 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 5 | 16 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DYB7KFG723QM | WATERFALL_GIANT | 10 | 17 | 6 | 15 | current | val | died |
| 0YQJ9D1MC4NK | SOUL_FYSH | 10 | 17 | 1 | 9 | current | val | won |
| 0YQJ9D1MC4NK | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | val | died |
| 7X58G3LSHZ3U | SOUL_FYSH | 10 | 17 | 1 | 14 | current | val | won |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 2 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 3 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 4 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JH49PP3EYJH8 | CEREMONIAL_BEAST | 10 | 17 | 6 | 5 | current | val | died |
| DQSH393WPZW0 | CEREMONIAL_BEAST | 10 | 17 | 1 | 7 | current | val | won |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 2 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 4 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DQSH393WPZW0 | THE_INSATIABLE | 10 | 33 | 6 | 7 | current | val | died |
| YZWV37N2MU6N | VANTOM | 10 | 17 | 1 | 8 | current | val | won |
| YZWV37N2MU6N | THE_INSATIABLE | 10 | 33 | 1 | 7 | current | val | won |
| YZWV37N2MU6N | TEST_SUBJECT | 10 | 48 | 1 | 14 | current | val | won |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 1 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 3 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 4 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 5 | 9 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| YZWV37N2MU6N | QUEEN+TORCH_HEAD_AMALGAM | 10 | 49 | 6 | 9 | current | val | died |
| N9GKED3PMEV3 | VANTOM | 10 | 17 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | VANTOM | 10 | 17 | 2 | 15 | current | val | won |
| N9GKED3PMEV3 | CRUSHER+ROCKET | 10 | 33 | 1 | 16 | current | val | won |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 5 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| N9GKED3PMEV3 | AEONGLASS | 10 | 48 | 6 | 7 | current | val | died |
| CVJ4MLQF4CSY | WATERFALL_GIANT | 10 | 17 | 1 | 11 | current | val | won |
| CVJ4MLQF4CSY | KNOWLEDGE_DEMON | 10 | 33 | 1 | 12 | current | val | won |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| CVJ4MLQF4CSY | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 7 | current | val | died |
| DC32RW0A80V1 | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 10 | 17 | 1 | 10 | current | val | won |
| DC32RW0A80V1 | CRUSHER+ROCKET | 10 | 33 | 1 | 11 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | CRUSHER+ROCKET | 10 | 33 | 2 | 14 | current | val | won |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 1 | 8 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 2 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 3 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 5 | 10 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| DC32RW0A80V1 | AEONGLASS | 10 | 48 | 6 | 10 | current | val | died |
| JKDUL0AL0TW6 | VANTOM | 10 | 17 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | VANTOM | 10 | 17 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | VANTOM | 10 | 17 | 3 | 10 | current | val | won |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 3 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 4 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 5 | 6 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| JKDUL0AL0TW6 | KNOWLEDGE_DEMON | 10 | 33 | 6 | 6 | current | val | died |
| 5H83F3J0XSTE | SOUL_FYSH | 10 | 17 | 1 | 7 | current | val | won |
| 5H83F3J0XSTE | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | val | won |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 1 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 2 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 3 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 4 | 3 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 5 | 5 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 5H83F3J0XSTE | TEST_SUBJECT | 10 | 48 | 6 | 5 | current | val | died |
| 25MFNPAE37R2 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | current | val | won |
| 25MFNPAE37R2 | THE_INSATIABLE | 10 | 33 | 1 | 11 | current | val | won |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 1 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 2 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 3 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 4 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 5 | 4 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 25MFNPAE37R2 | QUEEN+TORCH_HEAD_AMALGAM | 10 | 48 | 6 | 4 | current | val | died |
| 2PQK67ULZY90 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 9 | current | val | won |
| 2PQK67ULZY90 | CRUSHER+ROCKET | 10 | 33 | 1 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PQK67ULZY90 | CRUSHER+ROCKET | 10 | 33 | 2 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PQK67ULZY90 | CRUSHER+ROCKET | 10 | 33 | 3 | 7 | current | 排除 | SL predicted_death: censored, no actual win/loss; no observed completed outcome |
| 2PQK67ULZY90 | CRUSHER+ROCKET | 10 | 33 | 4 | 11 | current | val | won |
| J2VR2DFJG8K4 | LAGAVULIN_MATRIARCH | 10 | 17 | 1 | 12 | current | val | won |

模拟失败原件：`[{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "error": "board: Error: no solve"}, {"key": "54G5683J0E5S:33:1:10284668504", "start": "t1", "error": "board: Error: no solve"}, {"key": "Y8GDTNWG4R3X:48:6:10587883165", "start": "t1", "error": "board: Error: no solve"}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "error": "board: Error: no solve"}, {"key": "54G5683J0E5S:33:1:10284668504", "start": "pre", "error": "board: Error: no solve"}, {"key": "Y8GDTNWG4R3X:48:6:10587883165", "start": "pre", "error": "board: Error: no solve"}]`。


## 本批复用与运行版本审计

沿用已发布模型、107调参keys与切点，588场历史开场/回合逐值一致；复用586场，另重放2场控制及26场新增验证，各起点200样本，完整输入行号种子不变。4条控制结果除耗时外逐值一致。Platt和进阶项选择与旧发布完全相同，未用新增验证样本调参。原误启的当前源码重放、提前拟合及memo试验只保存在scratch，不进入本次校准。

新增26场的run.code原值均current；按已结束SILENT局号补读启动HEAD、dirty、重启配置，保留原code，不把dirty启动HEAD当作整战已复原源码。完整offset/bytes/SHA在runtime-source-audit.json。

| 局号 | 新增样本局 | 配置行数 | 启动HEAD | dirty行数 |
|---|---|---|---|---|
| 01H1533KSS5C | 否 | 1 | f8dd742d64b073225cf54f221a9b24cfc6612fdd | 1 |
| 02HB4L0C3C67 | 否 | 1 | e33ca6e0146fd5ddf9cc99d1d670135551922764 | 1 |
| 08A0GEAL8KQ5 | 否 | 1 | 4cc52f9ab83f9d0fca70c047813ae379cc44c20f | 1 |
| 0B2567HG3T4D | 否 | 1 | 157808e1e302fcf56a4c12266e3e999fb6d3c73d | 1 |
| 0BHQCPAF33N6 | 否 | 1 | cfa1c0be88147b4eac65c13d8c550b23ed4eef17 | 1 |
| 0C3AR6J0Z8LD | 否 | 1 | 1d3b8508d4b58b2dc24815c8b740d95e7c54a48b | 1 |
| 0DJ6GFZZ0TG9 | 否 | 1 | 3cadc990c75e21bc3d40bc4cba818bb4dd565a5f | 1 |
| 0DTPVHFXJ319 | 否 | 1 | 2bd274887b839af6feb6f98ae0d95ff84f0cd003 | 1 |
| 0NZXA12NLDMH | 否 | 1 | 0fd8e845f7d54dd7fe900f18d4ed6368110cb7cc | 1 |
| 0PH64C4AWAX9 | 否 | 1 | a8bb1ebe5e3aed093914622da19bab5d40bfaccb | 1 |
| 0YQJ9D1MC4NK | 否 | 1 | a9e687d9f0acccccddbfa92895d7966b58900658 | 1 |
| 10GPK5XGHCK3 | 否 | 1 | 9e0fda2e5057e199b05e2b55397499518f12fe52 | 1 |
| 1269Y20SKHUM | 否 | 1 | e0b125153bc08d324f67622153b06fe06a8428cd | 1 |
| 13CBGUPK6122 | 否 | 1 | 94113a1eac8a5443f033ac06223f2970522dedf6 | 1 |
| 16UDD0430SXT | 否 | 2 | 460725771eec2081ee531fe7922b3cb82d7a45ef,fab7c90945bd4a899d411438a22952b252272aa4 | 2 |
| 177AS39M1UPW | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 1913SE84AXQF | 否 | 1 | 734c08608055167fd220800439dbf7407cff6e57 | 1 |
| 1GN7WFBWC2E3 | 否 | 1 | 8035f8223f0a5e9c7caea4971a5f547a6f9b8901 | 1 |
| 1HC609GTLGN3 | 否 | 1 | 4915e3b34b48c324afb64ed9fbd20a2752c571f9 | 1 |
| 1J44WWF1073H | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 1L4RRN6AN5SQ | 否 | 1 | 1ddaba4bca8350969bb2e8dda1265095cc86b61d | 1 |
| 1LMBFGSMCWKU | 否 | 1 | 86b24a1f33dba25e4b00427e48a35c4c85ecd73b | 1 |
| 1M7Z1CTJ3M1J | 否 | 1 | 13421094857016bb295b840b27a516728192159a | 1 |
| 1NZ8FE5F34R9 | 否 | 1 | 45965f496135d8755c69edbadb3eddafbddf703a | 1 |
| 25226ZFLNR1J | 否 | 1 | 9852b39f2be0d95ae102209851af2745c327a79a | 1 |
| 25MFNPAE37R2 | 是 | 1 | 6fbbd82abd6d407dbaf93f82639b7f927efa54a0 | 1 |
| 2E4UQ1BZTQWB | 否 | 1 | ffb51b0bf12b3b49e30ec5b8c689550616d30981 | 1 |
| 2H311EAD34GD | 否 | 1 | e838a975e31aa406481e953d9cdbd01ee2d11717 | 1 |
| 2K4H3JEJHRSB | 否 | 1 | 2518c73d745023219b3d32820bd31c8f117d0575 | 1 |
| 2L1BNN9ZJEFU | 否 | 1 | 7c7f22e3a80f2addba1ba199eb1a18084ef78bba | 1 |
| 2LZHP9BYFTHE | 否 | 1 | 9de6d107c5dad20095a37e33695f8c18a963d081 | 1 |
| 2PQK67ULZY90 | 是 | 1 | 5782a41c4b1db735e3eba8e769e0ad52c356f136 | 1 |
| 2PVLGRBGUX9S | 否 | 1 | 9988ca8b527d0d83d5f8552564532f33e463986c | 1 |
| 2Q6ZYZ6JHM0M | 否 | 1 | 99737be9fdb9c2ea92089d768947c49b49b62382 | 1 |
| 2SU6XN2AEJRD | 否 | 1 | 2ec81b9f2f0856cac2cfecf5c65750759c3aafae | 1 |
| 2Y27VAYZDA02 | 否 | 1 | 1a5e1217a024ffa10321660028f65b602d7d9296 | 1 |
| 32VSST9UX7MN | 否 | 1 | fa0a436f9b283e83a322a6821b01696f22153a62 | 1 |
| 34PV33AA12QH | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 3DSZM9BL9B0B | 否 | 1 | d0b3836f059048ce6a46db99e8c84cbadd2f6118 | 1 |
| 3DW2DM7EY22W | 否 | 1 | 569db5cb21b03089845f5ad22bca99600c239bc0 | 1 |
| 3DY1QBM0CET0 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 3KME36ADUE4U | 否 | 1 | 5ae08a3dfedbb1c7f7f8c627aa7556e3bda4e938 | 1 |
| 3R3LY2HVPPG0 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 3UPY3BP2LVS7 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 3WWHBRG66B7F | 否 | 1 | 33f42aee34175987601615b14fc4f08f52dd3c8d | 1 |
| 456MRNGCPD8E | 否 | 1 | a7c2a4114c7404639da5ec190df56c6a6ef4e07f | 1 |
| 47731LKMZRBJ | 否 | 1 | 44e82b09e670af9144e6e7d6f697cb0ac19f69b3 | 1 |
| 49HL2N70CHMU | 否 | 1 | 027bd9c570df19f4734e47059755f6698ca36452 | 1 |
| 4ANT8D00TP72 | 否 | 1 | b219de68e6a8688573d9c739374bfc329a3d9743 | 1 |
| 4ATPGGUBWG8L | 否 | 1 | f791ed9ea8f462723d371eda8c88fce2393c60f0 | 1 |
| 4D4J8USKCPAV | 否 | 1 | 1e047a360ec6aa1a19205c068fb73cef46d685ea | 1 |
| 4U3WNL3JRRCX | 否 | 1 | 0b07f43b3bdf54138e922cb84f2fd41dce9db139 | 1 |
| 4XLZURXMD872 | 否 | 1 | 187c025aaf27a3d52db651849ac22ce2a83714bb | 1 |
| 4Y94N8RDPGPM | 否 | 1 | 8b2688581394344419420a0c341c498d07f03efc | 1 |
| 4YPGHGJD393H | 否 | 1 | bc8ac5b44a6acae03dec148f552790009df3a4c2 | 1 |
| 4Z2GCLA4DU52 | 否 | 1 | 9afbe4075ac8d941da6f1a47020e046aa2d5d8be | 1 |
| 53FLQ68CETW0 | 否 | 1 | ee1f4fd1897685ecc479e38492d548efa6bb1cf2 | 1 |
| 53NU9DWSTG9H | 否 | 1 | 6bbbd4705b1f626bf1bbd30cb18658c3b8dcedd7 | 1 |
| 54G5683J0E5S | 否 | 1 | eaf3ac162afe487705d5b46ab049871308022173 | 1 |
| 562GNK4ESMPE | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 5BU7ZE1PWLSX | 否 | 1 | fcf7d3c6e21b25c82cb28fee5ca79678593bfc59 | 1 |
| 5H83F3J0XSTE | 是 | 2 | 6fbbd82abd6d407dbaf93f82639b7f927efa54a0,dbd41616420f62e6502e9cb6c5827e852a6b4949 | 1 |
| 5PM6JAQG6FNQ | 否 | 1 | f56da22bda53151e052bb64d0a3339139c4dd550 | 1 |
| 5X2GHKJ89PN1 | 否 | 1 | 3599ab0ae3be80d13b77f57f5af8b785cb09c437 | 1 |
| 61E2QS63Y9WU | 否 | 1 | 03d50f0b2ae81f6f1b8800c6471c145580eb4668 | 1 |
| 64R0P0MTZWAX | 否 | 1 | 7375067d7653833d0d40a4fc8711a12dbe9de269 | 1 |
| 64VJC5XT2AT2 | 否 | 1 | 9f5d3ec373631ac36a10139ab935d669700c44a4 | 1 |
| 675CHRV9HVQ3 | 否 | 1 | a11645b431b07ed4e65ea47c1ba5b21e9c9255e3 | 1 |
| 6D0M76419BU7 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 6EV5V6PJJS9D | 否 | 1 | 3ebbdc6c01a8685c09ebb2933f6dea76e35fb8d5 | 1 |
| 6ZGMGEQ5YDVK | 否 | 1 | cc82ef5cbc3c14a304a70229b72fb39b17f60f13 | 1 |
| 751FN9QM9MHQ | 否 | 1 | 79bee0fc11793a410218ae50ca43e41474eec19e | 1 |
| 75X1BARMNZ03 | 否 | 1 | 0a066c2f9dd01c0dba7a34b03570e646557bf817 | 1 |
| 79UCJ0K6R9C1 | 否 | 1 | f89476513e37ba1bfe269f820f5147740adb5a67 | 1 |
| 7BNC8QX746YP | 否 | 1 | c70efc8ca855a756c66ea43cd2dd44bef91a7882 | 1 |
| 7LXWF33J5SAD | 否 | 1 | 3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee | 1 |
| 7S8HCC0M6G9W | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 7X0W3U8TVA2A | 否 | 1 | 047c809e625da861e34469791370f620866dee6f | 1 |
| 7X58G3LSHZ3U | 否 | 1 | a9e687d9f0acccccddbfa92895d7966b58900658 | 1 |
| 7ZUC4VPMDS41 | 否 | 1 | f0c9dfbf06624f9137b1a186adb1f47f8a761f53 | 1 |
| 833ZM0MJGWHC | 否 | 1 | 57b661f07711e9aa80eee9fd375d2eb164921b2e | 1 |
| 87LCSDR5P3DL | 否 | 1 | e33ca6e0146fd5ddf9cc99d1d670135551922764 | 1 |
| 8AGEGLG40SV3 | 否 | 1 | 60d5206de96389c3430370c0dbb8704f32714d7a | 1 |
| 8CFMW9SAGFWQ | 否 | 1 | 7c7f22e3a80f2addba1ba199eb1a18084ef78bba | 1 |
| 8HW407EAUYL7 | 否 | 1 | 77b15f03f580972406cf02f601afd35edd959ab4 | 1 |
| 8JRE1C4H4Z2W | 否 | 1 | b0f41f039b136e69485027ecbf9042c23170b4ab | 1 |
| 8R5CXD5C8PW8 | 否 | 1 | e8a6fb714b9fde4ed85e5cc76e3fbb839e6b83c7 | 1 |
| 8S9RNHFU5XF1 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| 8ZCFND4T35H7 | 否 | 1 | 1672801d0d70daa5be8ddb8cefd3cf08172ed593 | 1 |
| 9663Y88TYK73 | 否 | 1 | 6e8de8ea4498c0754b727d239aac418cb321be3f | 1 |
| 9DAS5L8YM1CN | 否 | 1 | 7f0c04dd5114d2f8152da1fb8cb6c5f45e1c478e | 1 |
| 9GTFF6DC500L | 否 | 1 | 093c68ac658980f53b9940756b3df925adfb49bb | 1 |
| 9GVYTHSXB4Z5 | 否 | 1 | b934d888d536d04b9089290b71e589f9d3193df8 | 1 |
| 9KP5S3317EEL | 否 | 1 | 2806f8bd8376e9e6e83c296226d9209b386d7292 | 1 |
| 9R916WW0V65N | 否 | 1 | 8ef00878e539c8abf24d63254a9fa57eaf70c675 | 1 |
| 9SRPBTZYN44H | 否 | 1 | 334d51498e6b552d2370b05b230a13dfc3b765ea | 1 |
| 9TG1RP5LFAAK | 否 | 1 | 141df6140cada59c3ad4960fd69aebf0a0749eeb | 1 |
| 9YBKCNBFP0X5 | 否 | 1 | d9a3ea37a0d1f01cdbeb395c060b0fc57e3f8449 | 1 |
| 9YT51CK8RC39 | 否 | 1 | 0d0c4b690fb372fe0810c99b619c52e239a5c85b | 1 |
| 9Z9H2EXKLF3T | 否 | 1 | 6c3d8187c205c6062ecd939cc93d09bbe34bafd6 | 1 |
| A3X30TN54LSH | 否 | 1 | f92636aec0e099e656eb18d14ef73c7dc266ff55 | 1 |
| A4VWQKBVBBMP | 否 | 1 | f1a00c4e32f2064b1e728c4493f02695a8826097 | 1 |
| A5HKP18P4Q0T | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| AD3QSC3P41JU | 否 | 1 | a340c1ec3825bf5e7048b5ec700539c2b98602c6 | 1 |
| AF76L5UTPP8U | 否 | 1 | d5ad91e80d76c8634d6bdab8ff47c8d1d2abe03b | 1 |
| ARKQLHG6RS4W | 否 | 1 | 25a408ef16313502ae378c36900236075ec3b262 | 1 |
| ATP5MCMJDMQY | 否 | 1 | e716bd28fd8eca9e4d76d066680304fd11935e37 | 1 |
| ATPX63FGDY6L | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| AX56AR19UCHD | 否 | 1 | 019b2d4ec078e20ad244ed251a27a26612214219 | 1 |
| AYTX5H4H69E3 | 否 | 1 | 099656e5f60664d2641b7a16187ad247f41a8c92 | 1 |
| BGRC1SURKBJY | 否 | 1 | e716bd28fd8eca9e4d76d066680304fd11935e37 | 1 |
| BHSVN6X84UMN | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| BJLTVSYXCSGS | 否 | 1 | 722518cdb9edfe808864da176f7e512bd820e170 | 1 |
| BSXYMFKN0VJ5 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| BTSRF7JL1W1Y | 否 | 1 | 6ad5584f709579d8f379f91b763504e8cc96e468 | 1 |
| BVF22RSFVBS9 | 否 | 1 | 28e339fa3ff7b39ed7f45397c621f47873b3c795 | 1 |
| C48LLXBGKXQ9 | 否 | 1 | bf3ebb7ce07113857adb789f00a734a445fe024e | 0 |
| C6Z8ATNBNHZ7 | 否 | 1 | c7e1e0ed360c72903c84fb3791cf66c193c369cd | 1 |
| C7GNN3DDFUFY | 否 | 1 | e5d0913aecc0af50986de75784943e82df5495d2 | 1 |
| CA5KE8GFJ9X2 | 否 | 1 | 33f02a6f37dc8dd820cd9d8cbc1ec207cb49624f | 1 |
| CMS8QL9E3C5U | 否 | 1 | 1777464fad172a3f785d1a4215c3d6ae4f5c667a | 1 |
| CNKR125PFHJ5 | 否 | 1 | c70efc8ca855a756c66ea43cd2dd44bef91a7882 | 1 |
| CRK2HNYKSCZC | 否 | 1 | 884c9f337d4300fb0bbae53d1764950a8f2c6ffc | 1 |
| CSBR5CRDWQNB | 否 | 1 | c4c7ad97ce666769dadbf912a8fa1e51c0ca3892 | 1 |
| CSLHFCBSC1UM | 否 | 1 | 3d05e9547eb14400b3fa4c18b1da8efd9817b324 | 1 |
| CVJ4MLQF4CSY | 是 | 2 | 5e70fa3dd1c5f8f1e5b00b9ac70083a68d93b922,f1a334a372c9ea63fdfda78378a83f36b317d42b | 2 |
| D2JR3FN0VYH5 | 否 | 1 | efe099dd297f188197c27623970cdf36d76c6bba | 1 |
| D4LJ9QMGFB8Q | 否 | 1 | 4fb81b17d099018d348942677bfe31dca333a4b1 | 1 |
| D9XJAX5KCSU2 | 否 | 1 | a2cee596182af746c5e1e1c18783a5e0f21fe83e | 1 |
| DC32RW0A80V1 | 是 | 1 | 51511b28e8fa085adbd30f232e625ebee058fe59 | 1 |
| DHYFWEN40SJ7 | 否 | 1 | e716bd28fd8eca9e4d76d066680304fd11935e37 | 1 |
| DPYF2BAA3DKT | 否 | 1 | ad01f74a152250f6d0c0f5e19fd5905d98b165b2 | 1 |
| DQSH393WPZW0 | 是 | 1 | a9e687d9f0acccccddbfa92895d7966b58900658 | 1 |
| DUB5VQQ6D6D1 | 否 | 1 | 534c3140f2e3a98fcd6380ce4447b00592cba026 | 1 |
| DUZUBAJ3A8GP | 否 | 1 | 93298980fd59963328e824286d1c3cf277c78e4b | 1 |
| DW8M3G2PV3N7 | 否 | 1 | 231cf80ee974678a013ab0b02d101289c9e3aed0 | 1 |
| DWW8GX3UQCQM | 否 | 1 | 9ab2f1fd1ff78389f20d5dd1fc433c0976f5a28b | 1 |
| DYB7KFG723QM | 否 | 1 | a9e687d9f0acccccddbfa92895d7966b58900658 | 1 |
| E5L15SK6ZHZB | 否 | 1 | 7e04d9a42dd6080a8d3716dd165e44d4b30c458d | 1 |
| E6AVMMVCSRPC | 否 | 1 | 7be569b159e478a120f0397bf8ca9c931bb533c2 | 1 |
| E6DSUVTNVBMH | 否 | 1 | 3b2791a4523b3ca269db3fbb6838bb3bf1054528 | 1 |
| E6DYYXRX7GVE | 否 | 1 | 5ff4270dbf44cbd1a36dcb3df8df5565653ee59f | 1 |
| EBVT8UZM6P12 | 否 | 1 | be35c7a32ce7f294e4fd2645d0fcb812e9c87b29 | 1 |
| EEVP0QTLMSX9 | 否 | 1 | 60d5206de96389c3430370c0dbb8704f32714d7a | 1 |
| EMRME965K74Q | 否 | 1 | 2bd274887b839af6feb6f98ae0d95ff84f0cd003 | 1 |
| ENKYQMS9W4ZD | 否 | 1 | 65d99e74c24daf6dfbe746d9dc810832e199c979 | 1 |
| EWLY3PWDDXJK | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| F1TP5W6GF56Q | 否 | 1 | 45582a7225ead21cdcaa6e5ed23508f8735674cb | 1 |
| F4QKG4J1AJJZ | 否 | 1 | 3a2a2a48ed594dea69b9c088edfe9259ac89bac8 | 1 |
| F6XY4QJMS5RC | 否 | 1 | 574d27dea9593ec14d85b22ff0fdb59c791270d0 | 1 |
| F9PP859XZ3RJ | 否 | 1 | d283e641016e6f250e11ab1b1459d013b6719ad7 | 1 |
| FD8NZAHU7SNY | 否 | 1 | 0e7998bfa8df267dcf8835a57949bdb982c9feb0 | 1 |
| FETDVL1P59B9 | 否 | 1 | e62833a5dd44c13422a03a2d132a947739cdada6 | 1 |
| FGKZALWSTQQ1 | 否 | 1 | 298e74fd3be01610f2b817b9ec5675d58a8241dd | 1 |
| FH2HB2X17F2H | 否 | 1 | f822926366119fff7fa4188924b30d2283bf0722 | 1 |
| FU8ZUQHBHNV9 | 否 | 1 | a7c2a4114c7404639da5ec190df56c6a6ef4e07f | 1 |
| G2QCF2R3A57K | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| G33HU22H2543 | 否 | 1 | 710dc4dca3e8e1ca6cd174a17dd425a1cf20bbda | 1 |
| G403VCZ3BH1B | 否 | 1 | 473a62f475dc5af126f231061a1c3c33880ed7a9 | 1 |
| G4PQBCJQ7NP0 | 否 | 2 | a62368d9cc3d3c3bd714eeccdff8dc71ebb5c9d4,f2df18b3c1b27fd72b5fd19b0e5261c490a7b855 | 2 |
| G8NHLL09DLBX | 否 | 1 | d61bf0ec98ea1c87c6a009c33530f8756b6d6ba4 | 1 |
| GD9QSQM0PH8T | 否 | 1 | d2992f99b86575e681e2e07f0e68bd91ddb98829 | 1 |
| GXNKW8X1XYJP | 否 | 1 | b1714285e60ce5a02798bea8cd5d4aa3118a2512 | 1 |
| H1T1F8ML9FUE | 否 | 1 | 1a0adbaadb1cd9d422c69bd61aa183a48ea93146 | 1 |
| H9ERYJLBL4UC | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| HEMND3SMQYB8 | 否 | 1 | 72499093cf518d69e056ae8bc1f95347d800a273 | 1 |
| HLAWCGM3KHVB | 否 | 2 | efed9b0a105c2f2c0d59089c8e938121f5ea8fc1,fba193dfe31844e1dbde9f2ad7174427fcd446dc | 2 |
| HMVJKM56S4Q8 | 否 | 1 | 6566b7d308947e1929cb398034dd8f02a1d1cb25 | 1 |
| HNX4A2WBC34W | 否 | 1 | 5957f056390032639e701fde18f74e60b21536ce | 1 |
| HSX4HYATB4E2 | 否 | 1 | 09ac8004aabfb0957e8fbacaa018dfd9046dafdd | 1 |
| HUVEPWQAHWFU | 否 | 1 | 9e20ade95055b14ed77446313fd6e71e2f2ff2d5 | 1 |
| HXCY44VD9QWU | 否 | 1 | d6a39489f5b67489c4ecdb092d40fb81bcd6ae01 | 1 |
| J2VR2DFJG8K4 | 是 | 1 | 7b61eaa636148221cbfc166067662e481ac7e0a7 | 1 |
| J8PHG72DGD90 | 否 | 1 | 20cec89a328cc9bd3b415e34f3bd1aac9bc1cd63 | 1 |
| JBX9JLH46KVN | 否 | 1 | d5f290f425fa1d84b0502e7d28ccc2b807b8d8a4 | 1 |
| JH49PP3EYJH8 | 否 | 1 | a9e687d9f0acccccddbfa92895d7966b58900658 | 1 |
| JKDUL0AL0TW6 | 是 | 1 | 99737be9fdb9c2ea92089d768947c49b49b62382 | 1 |
| JLN5SK17W4FQ | 否 | 1 | f1d951ec442548711c671cb7f9855a4ade1dc412 | 1 |
| JMH5C51RLN4E | 否 | 2 | 41bd4a44e4f5148304f072993e04e3685d534616,60c245ee77c9dd317c64f993852ef9dc9f3bf9bc | 2 |
| JQPT83P8KDSZ | 否 | 1 | 3cbc6955b270538e452d19118bab91a949305ab3 | 1 |
| JWK2C8LE4SFV | 否 | 1 | cfa1c0be88147b4eac65c13d8c550b23ed4eef17 | 1 |
| JYTQSFJ96MG2 | 否 | 1 | 231cf80ee974678a013ab0b02d101289c9e3aed0 | 1 |
| K2JAGKVJAWZJ | 否 | 1 | 6fd495ccabba4b740e7f84d57e36aba5988c5f8f | 1 |
| K3676LU8B0UH | 否 | 1 | ccf1fcde1f456c92ab4542710a54338e4bcdcd5c | 1 |
| K643VJCTQT0J | 否 | 2 | 3a20d222afff91ddacef24a94b24b3395bcd5451,eecdb847ff858a7026765eb5f15edd147cf7e7a1 | 2 |
| KAY522KT5NXR | 否 | 1 | 5de5d5182c050e41500e97465348a008172fe445 | 1 |
| KDBWARERSGYW | 否 | 1 | 8e74493d92f757a88f15dffb48e2f5336c0cd0ac | 1 |
| KEN58SH9SLZ6 | 否 | 1 | f9db52c1ed7af16d019e32528953e5ffcc8e08f0 | 1 |
| KF9HMZKTFC3V | 否 | 2 | eecdb847ff858a7026765eb5f15edd147cf7e7a1,f48154c11d41cb82c762a0afd671fe430ef199b8 | 2 |
| KFRDELW2TH2P | 否 | 1 | a73ce7ccbcfd09a9f9679dc4bddaf3dacb56b253 | 1 |
| KQQELQSZ382Z | 否 | 1 | f8e01696b9fa4dc863ad6377118962d7c1c22710 | 1 |
| KSX97DF5H3NY | 否 | 1 | 3cadc990c75e21bc3d40bc4cba818bb4dd565a5f | 1 |
| KUZVERN40NGK | 否 | 1 | 28e339fa3ff7b39ed7f45397c621f47873b3c795 | 1 |
| KV0JHNJCKXLS | 否 | 1 | 70c8352bc9ea84d18f9bc0f82244b0e1f76405e8 | 1 |
| L2TSFU62Z57Z | 否 | 1 | c1dd721fe682910095768eb4007cb836b6991152 | 1 |
| L38NLY1XJ7VU | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| L6745E2ND5CT | 否 | 1 | 80dbde56c871660e572c9dd15a27390f746ff5bf | 1 |
| L704TLETMZBM | 否 | 1 | cc1bdc598777acec145622aac6567593c4559dff | 1 |
| L9SGRBB5R698 | 否 | 1 | 4fb81b17d099018d348942677bfe31dca333a4b1 | 1 |
| LKC9YXKZWTKR | 否 | 1 | caa27990d46ac612a54eea03135b7152ccf93e9b | 1 |
| LLYSRQQ35AVW | 否 | 1 | bf63ab407b647a10bbae156fe05f6741d1fe4eb4 | 1 |
| LRN0HPZ0FZS1 | 否 | 1 | 8d79fd5bfb9b6c0368e7ab6c0662a6786403875c | 1 |
| LS8035TB32P3 | 否 | 1 | 74f824130c2b9d60cdda8c398590fee394f7e7db | 1 |
| LTQ083RTNZJQ | 否 | 1 | e716bd28fd8eca9e4d76d066680304fd11935e37 | 1 |
| LWQYSREHMMJ7 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| LY83ZMTFVKJH | 否 | 1 | 049dff244edcc7426913d090cf6ff1e2c2f86512 | 1 |
| LYBHQ1X230ZB | 否 | 1 | 5925a43d773d5eecf4442ee4e3e60d39d98ec99d | 1 |
| M0GY0A4M2F7H | 否 | 1 | 9949a5dee4e782c9a700a488de86b4edf1a4dd97 | 1 |
| MCCK2602T1SR | 否 | 1 | 4fb81b17d099018d348942677bfe31dca333a4b1 | 1 |
| MCT1GPTL8D35 | 否 | 1 | 0061f599c60537b86263bd783d274858c3876190 | 1 |
| MEXYTC0Z2MQQ | 否 | 1 | 3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee | 1 |
| MGA0CZDDKC0P | 否 | 1 | a999dba8c53a2dfc22825ba5603cde3f0bebf74b | 1 |
| MR7EBRYRJ5R6 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| MTQ0EUBJ3R6T | 否 | 1 | ceb74207f90ed2e2f94f96570e70d00d84290081 | 1 |
| N1ZEBMHZM4KC | 否 | 2 | 2b95b45a0485fd14c472a8fc5e0e8bb25c95d689,65e3d10a9b82a03176bafe6a6e61c6ef53f12c12 | 2 |
| N3YHJMV1ATFR | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| N8A2W8LH39N0 | 否 | 1 | 29cd6a323692e1b22d084fb523758b3865ac5810 | 1 |
| N9GKED3PMEV3 | 是 | 1 | c783c6c83d09e669f49518a4536ae5bc3766c2a2 | 1 |
| NB8KCF6HRGVF | 否 | 1 | 56c64ff8c32d6ef1cc0d2febb8252229f7e69133 | 1 |
| NBJBVSBNPYQB | 否 | 1 | 10168ac71ecdbd5cf5209cc9e865fcd387e6d71e | 1 |
| NEPESJXEV9V3 | 否 | 1 | e813a9507f20d8d03f382774774911522612940c | 1 |
| NEWRFAYKTQHR | 否 | 1 | cecc8317aef38a05a9ddaa71da2c088a06ddfeff | 1 |
| NG1FBJTSRLHS | 否 | 1 | 57a7f48519f59a87fb59a015a7ba7ea130b279ee | 1 |
| NHA2KW0RB7VP | 否 | 1 | b8ca931139bf94138132aeffe423e34892b7b5fd | 1 |
| NQKVQ9RD9T2N | 否 | 1 | ffeab7d4253cf09639be6805bb1ecb94606ce12f | 1 |
| NTMAU4XZ2NN2 | 否 | 1 | 57a7f48519f59a87fb59a015a7ba7ea130b279ee | 1 |
| NYQW6JAD30K4 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| P2M3DFJ4DEZ3 | 否 | 1 | 3541bc5477eda9604f7aec4c1ea46476570a2f79 | 1 |
| P33MKRP6S4Q4 | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| P5HT1272P5SB | 否 | 1 | 1a89c2d481689bf0793c89c53318c247a1ea1997 | 1 |
| P74C04AEPL1F | 否 | 1 | fd4c8e52341c31cad606c0a4b96a43663843e201 | 1 |
| PBUBM0LRTEDD | 否 | 1 | 8149e4ca46c2565cbb590fc56b7b10fe16b46d41 | 1 |
| PCDMYK2AEB2D | 否 | 1 | a9127cd90c1e62dd09a9325962d21bc4b11a44d3 | 1 |
| PD9AYQVMLQW6 | 否 | 1 | 7f6d5b4b6a1d1563ebf662db806eb9f3d18b6172 | 1 |
| PF90JTU0UZ5M | 否 | 1 | 433144fb8eaebbb11af7162c996733d4660a5dff | 1 |
| PJ2LL9KU7FHD | 否 | 1 | eabdd307b11199de406e5eed5f1dedad0a39f431 | 1 |
| PLMNP6XWPPC6 | 否 | 1 | 9f360da723f3f83e9e341dec34738b9f00797bc2 | 1 |
| PTGQF9BEQ6G1 | 否 | 1 | fe6462651b593b9831581c088deface9957a404f | 1 |
| PU80F84P6HPN | 否 | 1 | 0581ecb38e0379fdad01307e4966d9da629d76b4 | 1 |
| PUY011SBWSSU | 否 | 1 | c56900bd37e5eaa6680381a3300fb7d3aafac7a5 | 1 |
| PYE4VXNSLGSS | 否 | 2 | 4861986b3f737fb3f83a9afb32a2dcbe159dfd5e,caf3bc2c132a95b060322b4d391848fa1be7e35a | 2 |
| Q10YYQ5DUPJA | 否 | 1 | 908f043bb01b6c7c1406bed6394df36f41528a56 | 1 |
| Q389KW7SVWKH | 否 | 1 | a8bb1ebe5e3aed093914622da19bab5d40bfaccb | 1 |
| Q6M2Y34MWKRE | 否 | 1 | a881e27a54e458bd027244db12503e96197d6e51 | 1 |
| Q9FM7A80E4BZ | 否 | 1 | 19b02dcc884825226c193ac1616f0c397f38fae9 | 1 |
| QHK1XQ928TTM | 否 | 1 | 69a7b4414cdbaade679427d96af1a2cbbd04062d | 1 |
| QNTW139MGECA | 否 | 1 | 98d2d50895fd836fcbc826b12dff6d46913f12ab | 1 |
| QRZX1S9USYWP | 否 | 1 | 4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac | 1 |
| QU61RVKHPTZS | 否 | 1 | 3d83115fd3f74dc7a580c3f28cf7ecbb10283f03 | 1 |
| R0HEV5E3QT6G | 否 | 1 | 5de5d5182c050e41500e97465348a008172fe445 | 0 |
| R3AJCGQGGMR4 | 否 | 1 | 11d759cfe20c64e90c1d5ebf0dc930ae8b24ffc5 | 1 |
| R6WDLYS19ZTY | 否 | 1 | c308b61e13c15ee90d62798f732d800055313f65 | 1 |
| RC61MFQM63Y6 | 否 | 1 | 0d6c1a82ac0b7ec2b5134e2f650070bdeba7e56a | 1 |
| REEBQHPHSWGK | 否 | 1 | ae6a8d9950594c9b1e0ebe40fe6ed0866982fe15 | 1 |
| RMNXHZKV716Y | 否 | 1 | 6519b89093213125f9a91714dd35dafcedd643d6 | 1 |
| RQCHNN0W72KF | 否 | 1 | 3d066a583631b85acb208813c31510864007adac | 1 |
| RZ6YAC7K89NM | 否 | 1 | cfa8112dd55126722f4bd6f6edb05f152ccd1826 | 1 |
| S9UZAK0JP0C0 | 否 | 1 | be0ee6df1395b2373a88e0bf222a6e89312b0945 | 1 |
| SADL3CGYTGSR | 否 | 1 | 2c81eb76f84443e9ff9e0d54ad0ccb84663417ec | 1 |
| SB5N8GT2Y3VW | 否 | 1 | fdf1dd89c97712f9ac2d4c71053140e13ddbd7c5 | 1 |
| SDY5T9XCSQN2 | 否 | 1 | cfa8112dd55126722f4bd6f6edb05f152ccd1826 | 1 |
| SPC7NVA5K4RL | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| SV2GP9NX4HQD | 否 | 1 | 52aa3fcca307e289db09ce926b045e734be92fda | 1 |
| SY0WMJNNVRLM | 否 | 1 | 650a6a84c82351faef30462e87b82d7fbd0dae78 | 1 |
| T082DRCUHRRD | 否 | 1 | 8d79fd5bfb9b6c0368e7ab6c0662a6786403875c | 1 |
| T0DGVABPV60U | 否 | 1 | 261af56e0022cc0012b80870bd3f52bd121d45c2 | 1 |
| T3FW7R2R2306 | 否 | 1 | 98df162d756d3eca8d0b6383f2a2398d624ab074 | 1 |
| TCDUBRWMEMNA | 否 | 1 | 0e7998bfa8df267dcf8835a57949bdb982c9feb0 | 1 |
| TCFAHJ9K19VY | 否 | 1 | d4026dbbda334bb607f5df269d9bd9a0c6a7fa7d | 1 |
| TD1HVGS7H6LB | 否 | 2 | 62b4caf85ded558e5d07ef840ae882d82bc7ae2c,c1f61de9136d1be16bebd8eed60a54e14f9ebba0 | 2 |
| TDLBRNA0R05B | 否 | 1 | dc899f95af670e66bd0735bc3c868aeff60d682e | 1 |
| TFYU1MY8NEJ1 | 否 | 1 | 8e74493d92f757a88f15dffb48e2f5336c0cd0ac | 1 |
| TGTXN42TE0X4 | 否 | 1 | c53b03527a953836317edec2829e315e9c411a40 | 1 |
| TKAN594T9SKS | 否 | 1 | cfa1c0be88147b4eac65c13d8c550b23ed4eef17 | 1 |
| TKXQ6L4N9A6U | 否 | 1 | e33ca6e0146fd5ddf9cc99d1d670135551922764 | 1 |
| TU3XB4CAEDAW | 否 | 1 | 0068600d255da2487f777a6e18903fa984895a82 | 1 |
| TXZ6RVMQA09D | 否 | 1 | f17e15ca474fd6b829f5ad85819a3315c359792a | 1 |
| U1QYLX1AE1WX | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| U51W81MEBCLZ | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| U8K28UUGYP3U | 否 | 1 | 4fb81b17d099018d348942677bfe31dca333a4b1 | 1 |
| UACFSW4VDDLD | 否 | 1 | 103fd5ff1d7e592a6ab1b1817e1188b5747fba9c | 1 |
| UJ0K3G10609Y | 否 | 1 | 4fb81b17d099018d348942677bfe31dca333a4b1 | 1 |
| ULP4TN1GNHMK | 否 | 1 | 92376ca3b3b2a9e7e895b3b7b312e2e7e98325b7 | 1 |
| UMVLWER4CD98 | 否 | 1 | ebd920b46668fc63babae6a79359d926d3c620ad | 1 |
| UPAB38G2PA02 | 否 | 1 | 52046a3deaa359adbafdd9e6d3e96c2527017f49 | 1 |
| UV5YK5721RPB | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| UZ1T7AH49WMB | 否 | 1 | c70efc8ca855a756c66ea43cd2dd44bef91a7882 | 1 |
| V0383V5S9BCQ | 否 | 1 | 3ac2445ace29411d2118191ecb924fd37864d7d0 | 1 |
| V3PJA3FV92BG | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| V4BTVFPS9XHV | 否 | 1 | ad95ba0f842eb4b73847bf01a143be54802c2bd3 | 1 |
| VAC6Z1PZ1QJG | 否 | 1 | bb7285314f126e372ee61c6a331565a89e5418fa | 1 |
| VGNDNGPFYRE3 | 否 | 1 | e39ced86de2566780e324e5a2a000664dba2cb6c | 1 |
| VLV17NUSFS61 | 否 | 1 | 7bea7d99ce309d37cbc1715ac169623b9de34df4 | 1 |
| VLZ6CCT8AQ0A | 否 | 1 | ac321b1f2224305d51f74fbf309b49c0c741843d | 1 |
| VN7RQJMJEFMX | 否 | 1 | 6a16980e431c72529c909a5314e0da3172835d1e | 1 |
| VNSXWCWXR3VW | 否 | 1 | fe6462651b593b9831581c088deface9957a404f | 1 |
| VPW8YH7A4QFM | 否 | 1 | 3caa860b03e4ed76a2afd81635f9c52c18e456c4 | 1 |
| VT2F13ADA3M3 | 否 | 1 | e52c5a24a52e2ea2074d7dddbfabe71d203b5794 | 1 |
| W1YY8PEWGUF9 | 否 | 3 | 4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac,93cedf7ecc10d9dba9ba138e45df98b021875920,d9bfb65a4ec28cdda8706a150fc4341d28db1227 | 3 |
| W7BHM8U02RKG | 否 | 1 | 910604a4471ad4470e563d6d4e16d05bdcb78758 | 1 |
| WA7FRJ7UABCV | 否 | 1 | 7d5b95142bbb89ed71279791786f40d312eed61c | 1 |
| WCDTYJKUDS4T | 否 | 1 | 2ccc01768229b0735ebb255abbbbbc7f4f337fd3 | 1 |
| WG8GK5B9D7YH | 否 | 3 | 1406e5cc5d21d51dd74b58677eb3a15c8c99e7e1,ad95ba0f842eb4b73847bf01a143be54802c2bd3,c8c75dd3ae139a9f408e446aa184169faa85d2d4 | 3 |
| WJ0LTVSSDY61 | 否 | 1 | 9aefbaf476256caff190ef09880ee71cdd6443aa | 1 |
| WN0HA1L6MJ99 | 否 | 1 | d422c5cec81df06fadb2b05fa1d0f4c80089095a | 1 |
| WQZVENQ7DTRP | 否 | 1 | 31914e4ba652d6e8466a4a99f04128005166ecf2 | 1 |
| WYB0NCD6W83J | 否 | 1 | e33ca6e0146fd5ddf9cc99d1d670135551922764 | 1 |
| WZL2AMEY85S7 | 否 | 1 | d07c38fcc4e7cd92f8bed147eb87696b18212432 | 1 |
| X06YT1507E5M | 否 | 1 | eafecc850a8ad55d36e67644236a98d196b61161 | 1 |
| X4M1GPAJGAB9 | 否 | 1 | fcf7d3c6e21b25c82cb28fee5ca79678593bfc59 | 1 |
| X7REGM0RUNSA | 否 | 1 | 52046a3deaa359adbafdd9e6d3e96c2527017f49 | 1 |
| XBD8Z9XLPCPN | 否 | 1 | da2ccb9230a65ae210b3aafe481d97f66b610141 | 1 |
| XP2SL33HT0D9 | 否 | 1 | 606855106dfb90ca8ffe27b985ed3c3b3f2424a2 | 1 |
| XRCP2TKYKQBA | 否 | 1 | f2df18b3c1b27fd72b5fd19b0e5261c490a7b855 | 1 |
| XTSV1U9JD34T | 否 | 1 | 03f4ffe017f886f9ee92be50911a318f5f90f4bd | 1 |
| XW8B5CHJ814J | 否 | 1 | c7e1e0ed360c72903c84fb3791cf66c193c369cd | 1 |
| XYYQYBRM2A01 | 否 | 1 | bb19732f15457fb312901985ed3890a9e8775806 | 1 |
| XZUJR08FW801 | 否 | 1 | 9a7dc93194b93f78494028b4ed11100825848797 | 1 |
| Y2K25VFDU95P | 否 | 1 | 059bf4cfb3ab843754f4c26a38c70942a8940408 | 1 |
| Y5H4CFAQ2WTG | 否 | 1 | 2b1a5f6d491f826ea1bac28f707716d109fb3e65 | 1 |
| Y6GM2CHWJBEY | 否 | 1 | 9692ea6d632162edbd674fa6d83344e380d15e1b | 1 |
| Y82C2NV7WM2M | 否 | 1 | 4d06059e69167c2e48383002bd4904066a9824d4 | 1 |
| Y8GDTNWG4R3X | 否 | 1 | 98c8ce27985782c99e1e71594c103c3b9da3e23d | 1 |
| YBRA3EJ94GBR | 否 | 1 | 56268f61928e0330d91293e585efab075839bb4a | 1 |
| YF0LXT1QSTGG | 否 | 1 | 91c1db906d74457da9a93fb8e99e7e0394406b4e | 1 |
| YLYLZWHA0GKU | 否 | 1 | f65cbfac6c4aeeccbe4a0dffd19a86e6087b30b7 | 1 |
| YP428GT9ZLL3 | 否 | 1 | 83ef7ec4a635529b626bb8ea95e51871384457da | 1 |
| YQL8RZ8BWN1E | 否 | 1 | b0b0e679dbab626af188fec8bb180af74e319e71 | 1 |
| YUWMCVH6MFUH | 否 | 1 | b0b4d0a152155582c52ef622fe8fc6d9a0c27335 | 1 |
| YZQEEDWQ6AY6 | 否 | 1 | 4192688e8f9edc9eaa3c37a7928ec951216ccc6e | 1 |
| YZWV37N2MU6N | 是 | 1 | a14ebd0592f0cba9f7d3053eb5809754dd78ee2d | 1 |
| Z6CFLDR3N4SB | 否 | 1 | 48f2bf5a95dae915c263b993f9d4f86784bc30e2 | 1 |
| Z91JN3S3PQX2 | 否 | 1 | 049dff244edcc7426913d090cf6ff1e2c2f86512 | 1 |
| ZE2DNC29WWHB | 否 | 1 | f92636aec0e099e656eb18d14ef73c7dc266ff55 | 1 |
| ZE8F192FKX24 | 否 | 1 | 452f7bc7ac23bd1464fe04b951272236f471de8d | 1 |
| ZTRGYYMLR8SC | 否 | 1 | aa1e21361f65bf891e513002fa69d8f2b60e93b7 | 1 |
| ZVYUL2YP3518 | 否 | 1 | 6ac57ea6b407befa1e613cdb8d3e0be4880c3852 | 1 |
| ZZMYZ5UBCG72 | 否 | 1 | b9c46d6686a8d7e05915323c6e5f6acdfc476e1a | 1 |

准入精度审计：THE_INSATIABLE/B2未取整Brier=0.14639716573405037，高于整体0.11707407977085513×1.25=0.14634259971356892；保留低信度，不因显示取整提升可信。原四个门槛不变，Ironclad默认统计/准入保持逐值等价；拟合、选择及模拟物理不变。全部boss数量门槛均已达到（数量还差0），质量失败不能承诺再补固定场数即可达标；A0–4和A5–9独立验证均0，各距10场还差10。

本批统计量只描述列明固定模型和实际结局尝试。未验证当前H0模型/有限前缀，不关闭H0、0332或其他学习父要求；未观察自然对局消费及胜率改善。
