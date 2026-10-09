Roy 已授权新功能：静默 boss 模拟校准定期刷新已上线 S1.boss-calibration8。

任务 20261009-114303-silent-boss-calibration；只处理本功能，未修其他队列。只读取已结束静默局，未运行play、真实LLM或联网，未修改策略阈值。本批复用已上线源码 cdf75af64fb5b118a5a808ecb3b05e2a05991c36，新增20次实际结局触发，固定切分与调参keys，仅扩验证并发布新准入名单。

发布链：base f3f4366038918fcb22d25dd80be15716b91f4697；数据/来源提交 e7ea26412a65409d1f1d27ff72dd6dc050df98c3；live原提交 10168ac71ecdbd5cf5209cc9e865fcd387e6d71e；8项刷新保存 8d8ae86583b84ca339ccf8e6e8a2fc6da1126407；实际合入 855a758e1b698573c16605a10a8669a326f93338；测试树 958a3da06e9e33c34668bbc874e2c2738d398edd；发布 a0618c990f9f503c5d5de7d4ce1d5da11a04e08a；固定发布树 9109872dd6d3732c5232f1f3b6040818e06e6a6e。发布时间 2026-10-09 12:42:43 CST，先date再追加decision-log并登记唯一eval版本。源/现实现/刷新/合入均已核实为发布祖先；75任务路径和来源提交逐blob相同；除decision-log/eval两记录外，所有非任务路径保持合前值；8项刷新逐hash保留。完整审计 release-audit.json。

账本 silent-0337 为fight/proposed，仅经根目录CLI追加提案及来源提交，337条目检查0问题；未冒标shipped，交运维核实后登记。没有新增出牌/药水/SL/终局规则或结构不一致结论，code_proposals=[]，implementation_domains=[]。

源与合后均按固定数据运行sandbox：tsc0、vitest0、251文件2627例；Python校准固定夹具12例0；调度固定夹具45例0；源最终及live三次提交gitleaks0。原日志均在本scratch。完整外部检查由调度器执行，尚未执行，不冒报通过。

发布辅助脚本首次在任何live改动前因git status前导空格被strip丢失而退出1；原publish-live-v1.py/live-publish-v1.log/.exit保留。仅纠正scratch辅助脚本，成功发布执行的是本目录publish-live.py，原封存目录仍保留最初脚本及其哈希，不回写历史。最初全量重放主动中断130、原始日志空行检查退出2均保留；其后数值等价审计/增量重放/非日志内容检查/源与合后测试通过。没有回滚此次成功发布。

运维交接：固定树/版本/源码和actual merge已提供；请核实后登记shipped并由调度器补完整外部检查。回退如确需执行，应在live锁内仅恢复上一版静默boss-trust.json（从合前 8d8ae86583b84ca339ccf8e6e8a2fc6da1126407），保留刷新与全部新旧实验来源，测试并新增回退版本/记录；不能撤销刷新保存提交。本批未执行回退。

校准来源清单760行、完整残差/逐boss数值/不足与架构边界见下附正式报告（与发布blob相同）；运维原件另见live-release-state.json、release-audit.json、live-sandbox.log/.exit、ledger-final.json、ledger-final-check.log/.exit与final.json。

# 静默 boss 模拟校准

Roy 授权的是角色隔离、整体 Platt、时间切分、原准入标准和定期重跑架构；下面样本、实胜败、拟合、残差及准入结论只来自已结束的 SILENT 对局。boss侧参数复用用户准许的既有模型/monster-db（含common），另记来源，不把它当作静默对局样本或校准参数。没有新增打法或策略阈值。

提取：166 局，760 次尝试；301 次有实际结局且取得首回合帧（模拟成功数另列）。冻结到已结束局 `2026-10-09T03:30:50.069Z`；未进入 boss 的局号/版本及完整筛选列表在 extraction.json。提取排除原因：`{"SL predicted_death: censored, no actual win/loss; no observed completed outcome": 457, "SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand": 1, "no turn-1 decision with drawn hand": 1}`。
可用 148 局，实际结局 `{'won': 215, 'died': 86}`，各进阶场数 `{'0': 16, '1': 6, '2': 5, '3': 3, '4': 9, '5': 3, '6': 22, '7': 17, '8': 3, '9': 7, '10': 210}`。
SL predicted_death 是未实结算的截断样本，来源保留，不标实际败局；同一局全部 boss/SL 共享切分。校准胜率以有实际结局的尝试为条件，存在 SL 截断选择偏差，不是所有初试胜率或允许SL的整局通关率。开场我方资源取日志，boss HP/伤害/招式沿现有 monster-db 按进阶输入、缺级取最近观测，未重拟合 boss 侧。

SL口径：boss房间 303；初试结局 `{'predicted_death': 120, 'won': 176, 'died': 7}`，重试结局 `{'won': 39, 'predicted_death': 338, 'died': 80}`；没有可用实际结局开场的房间 `[{'run_id': 'TD1HVGS7H6LB', 'floor': 17}, {'run_id': 'TXZ6RVMQA09D', 'floor': 49}]`。失败重载仍不能补造实际败局；具体 reload 原记录随来源保留。

固定来源/模型：`{"simulator_base": "f3f4366038918fcb22d25dd80be15716b91f4697", "model_sha256": "2e9a6b00c7e36a5f4a29cbf2674b050e62e27cb7c76b9eca9cfef01e17f22909", "samples": 200, "seed": 1, "dataset_sha256": "251b738b51ee8190593e1dbf41a8f48a08f5436638f19884a772173c08af5ab7", "sources_sha256": "f0bbf061c0ce59f3e58ac224a0db4c87c216841712a68e42ff520424f913b7f1", "versions": {"tune": ["0a066c2f+dirty", "0d0c4b69+dirty", "103fd5ff+dirty", "141df614+dirty", "1e047a36+dirty", "25a408ef+dirty", "2c81eb76+dirty", "2ec81b9f+dirty", "3a2a2a48+dirty", "3cbc6955+dirty", "3ebbdc6c+dirty", "41bd4a44+dirty", "42ac6c1d+dirty", "452f7bc7+dirty", "45965f49+dirty", "473a62f4+dirty", "48f2bf5a+dirty", "4915e3b3+dirty", "5ae08a3d+dirty", "5de5d518", "5de5d518+dirty", "6566b7d3+dirty", "65d99e74+dirty", "7be569b1+dirty", "7bea7d99+dirty", "7c7f22e3+dirty", "86b24a1f+dirty", "8b268858+dirty", "8d79fd5b+dirty", "9692ea6d+dirty", "9852b39f+dirty", "9988ca8b+dirty", "9e0fda2e+dirty", "a999dba8+dirty", "b9c46d66+dirty", "bb19732f+dirty", "bf3ebb7c", "bf63ab40+dirty", "c4c7ad97+dirty", "ccf1fcde+dirty", "d283e641+dirty", "d9a3ea37+dirty", "ee1f4fd1+dirty", "f1d951ec+dirty"], "val": ["0061f599+dirty", "0068600d+dirty", "03d50f0b+dirty", "03f4ffe0+dirty", "047c809e+dirty", "049dff24+dirty", "0581ecb3+dirty", "09ac8004+dirty", "0d6c1a82+dirty", "0fd8e845+dirty", "11d759cf+dirty", "187c025a+dirty", "1a0adbaa+dirty", "1a5e1217+dirty", "1a89c2d4+dirty", "20cec89a+dirty", "2518c73d+dirty", "261af56e+dirty", "28e339fa+dirty", "2b1a5f6d+dirty", "31914e4b+dirty", "3541bc54+dirty", "3599ab0a+dirty", "3caa860b+dirty", "3cadc990+dirty", "3d05e954+dirty", "433144fb+dirty", "4fb81b17+dirty", "52aa3fcc+dirty", "56c64ff8+dirty", "5925a43d+dirty", "5ff4270d+dirty", "60685510+dirty", "650a6a84+dirty", "69a7b441+dirty", "6ac57ea6+dirty", "6ad5584f+dirty", "6c3d8187+dirty", "6fd495cc+dirty", "70c8352b+dirty", "710dc4dc+dirty", "722518cd+dirty", "72499093+dirty", "734c0860+dirty", "74f82413+dirty", "79bee0fc+dirty", "7f0c04dd+dirty", "7f6d5b4b+dirty", "8149e4ca+dirty", "8ef00878+dirty", "910604a4+dirty", "91c1db90+dirty", "92376ca3+dirty", "93298980+dirty", "98d2d508+dirty", "9949a5de+dirty", "9a7dc931+dirty", "9e20ade9+dirty", "a340c1ec+dirty", "a73ce7cc+dirty", "a7c2a411+dirty", "aa1e2136+dirty", "ac321b1f+dirty", "ad01f74a+dirty", "b0b0e679+dirty", "b0f41f03+dirty", "b1714285+dirty", "b219de68+dirty", "b8ca9311+dirty", "bb728531+dirty", "be0ee6df+dirty", "c1dd721f+dirty", "c70efc8c+dirty", "cc1bdc59+dirty", "ceb74207+dirty", "cecc8317+dirty", "cfa8112d+dirty", "d07c38fc+dirty", "d4026dbb+dirty", "d5f290f4+dirty", "d61bf0ec+dirty", "da2ccb92+dirty", "dc899f95+dirty", "e33ca6e0+dirty", "e838a975+dirty", "e8a6fb71+dirty", "eabdd307+dirty", "ebd920b4+dirty", "f0c9dfbf+dirty", "f17e15ca+dirty", "f56da22b+dirty", "f65cbfac+dirty", "f8dd742d+dirty", "f8e01696+dirty", "f9db52c1+dirty", "fd4c8e52+dirty"]}, "completed_max_asc": 10, "result_reuse": {"previous_artifact": "c2332ff110efe0b0c98de20828e177e168dc35b74a49884656c6beefda9cce31", "previous_model_sha256": "9fe0002e222d97f71be934184905fe6772124f4760fc6e6294cdd34af9a5b9ca", "current_model_sha256": "2e9a6b00c7e36a5f4a29cbf2674b050e62e27cb7c76b9eca9cfef01e17f22909", "changed_paths": ["knowledge/characters/silent/experience.json"], "reused_fights": 281, "new_replayed_fights": 20, "identical_old_inputs_and_order": true, "identical_old_turns": true, "checked_replays_except_ms": 3, "reason": "Only experience text changed. The backtest captures the solver input before fightLessons/jevExperience; the boss simulator does not read experience text. All numerical source, model data, game-data, historical inputs and seed indices are byte-identical. Historical replays match every non-timing field. Reuse immutable prior results and replay all new fights at the original full-dataset indices.", "initial_replay_exit": 130, "initial_replay_preserved": "learner/runs/20261009-114303-silent-boss-calibration/f28d9fcd355540452ebc2ec583e8c83d44aa6dca486ee679a943d99b22fd2c6a/results/results-0.jsonl"}, "boss_input_scope": {"openings": 301, "a10_hp_asc_sources": {"10": 272}, "a10_opening_asc_sources": {"10": 272}, "corrected_first_hit": 41, "a10_move_damage_asc_sources": {"10": 48, "9": 1}, "a10_no_damage_records": ["AEONGLASS:INCREASING_INTENSITY_MOVE", "CEREMONIAL_BEAST:BEAST_CRY_MOVE", "CEREMONIAL_BEAST:STAMP_MOVE", "CEREMONIAL_BEAST:STUNNED", "CRUSHER:ADAPT_MOVE", "KIN_FOLLOWER:POWER_DANCE_MOVE", "KIN_PRIEST:RITUAL_MOVE", "KNOWLEDGE_DEMON:CURSE_OF_KNOWLEDGE_MOVE", "LAGAVULIN_MATRIARCH:SLEEP_MOVE", "LAGAVULIN_MATRIARCH:SOUL_SIPHON_MOVE", "LAGAVULIN_MATRIARCH:STUNNED", "QUEEN:BURN_BRIGHT_FOR_ME_MOVE", "QUEEN:ENRAGE_MOVE", "QUEEN:PUPPET_STRINGS_MOVE", "QUEEN:YOU_ARE_MINE_MOVE", "ROCKET:CHARGE_UP_MOVE", "ROCKET:RECHARGE_MOVE", "SOUL_FYSH:BECKON_MOVE", "SOUL_FYSH:FADE_MOVE", "TEST_SUBJECT:BURNING_GROWL_MOVE", "TEST_SUBJECT:RESPAWN_MOVE", "THE_INSATIABLE:LIQUIFY_GROUND_MOVE", "THE_INSATIABLE:SALIVATE_MOVE", "VANTOM:PREPARE_MOVE", "WATERFALL_GIANT:ABOUT_TO_BLOW_MOVE", "WATERFALL_GIANT:PRESSURIZE_MOVE", "WATERFALL_GIANT:SIPHON_MOVE"]}}`。所有输入文件 SHA256 在同批 provenance.json。筛选读取总日志索引元信息，但没有纳入铁甲对局样本或校准参数，角色统计输入只取静默目录。common monster-db 是用户准许复用的既有模型；它已有的观测数值固定使用，验证的是静默胜率映射，不宣称从零预测未观测 boss 机制。
固定切点 `2026-10-06T02:46:11.648000`（UTC，与日志ts同口径），调参 107 场、验证 194 场；验证覆盖后期代码，完整版本逐项在来源表。每起点 200 样本，固定 seed=1（逐战seed=1+原始行号×101），模拟策略/费用/药水/保血/目标/SL阈值保持原样。

进阶项只作一个整体模型的统计校正，不解释为进阶机制的因果效应；版本、资源和SL选择与进阶共变。某进阶段验证 n=0 时，只有调参残差，没有该段独立的样本外可靠性证据。上线保留后来其他批次的代码修复和知识刷新；本表仅验证所列固定模型，不冒称后续模型版本已通过相同验证，下一次定期重跑固定当时的模型。

B2 用首回合起点；B3 用既有 pre/redeal 方法：实际首回合资源、全副牌重洗并重新抽开场手牌，不使用后续观测。B2 中途沿同一整体首回合映射，其独立中途校准未验证；铁甲映射保持原值。

A10 的 F48 胜只算该战胜利，不算整局通关；F49 是另一场独立 boss 战，以下列出本角色来源。怪物数值来源的 exact/nearest 及伤害估值在 results 的 bossSource 内，common 是用户准许复用的既有模型，校准参数不复用铁甲。

## A10 数值与 F49 范围

数值审计：`{"openings": 301, "a10_hp_asc_sources": {"10": 272}, "a10_opening_asc_sources": {"10": 272}, "corrected_first_hit": 41, "a10_move_damage_asc_sources": {"10": 48, "9": 1}, "a10_no_damage_records": ["AEONGLASS:INCREASING_INTENSITY_MOVE", "CEREMONIAL_BEAST:BEAST_CRY_MOVE", "CEREMONIAL_BEAST:STAMP_MOVE", "CEREMONIAL_BEAST:STUNNED", "CRUSHER:ADAPT_MOVE", "KIN_FOLLOWER:POWER_DANCE_MOVE", "KIN_PRIEST:RITUAL_MOVE", "KNOWLEDGE_DEMON:CURSE_OF_KNOWLEDGE_MOVE", "LAGAVULIN_MATRIARCH:SLEEP_MOVE", "LAGAVULIN_MATRIARCH:SOUL_SIPHON_MOVE", "LAGAVULIN_MATRIARCH:STUNNED", "QUEEN:BURN_BRIGHT_FOR_ME_MOVE", "QUEEN:ENRAGE_MOVE", "QUEEN:PUPPET_STRINGS_MOVE", "QUEEN:YOU_ARE_MINE_MOVE", "ROCKET:CHARGE_UP_MOVE", "ROCKET:RECHARGE_MOVE", "SOUL_FYSH:BECKON_MOVE", "SOUL_FYSH:FADE_MOVE", "TEST_SUBJECT:BURNING_GROWL_MOVE", "TEST_SUBJECT:RESPAWN_MOVE", "THE_INSATIABLE:LIQUIFY_GROUND_MOVE", "THE_INSATIABLE:SALIVATE_MOVE", "VANTOM:PREPARE_MOVE", "WATERFALL_GIANT:ABOUT_TO_BLOW_MOVE", "WATERFALL_GIANT:PRESSURIZE_MOVE", "WATERFALL_GIANT:SIPHON_MOVE"]}`。完整开场及后续攻击定义的数值来源另见 opening-audit.json / model-input-audit.json，缺级沿既有 nearest/ratio 方法。

F49 实际结局 13 次、可用开场 12 场、验证 {'t1': 10, 'pre': 10}；不足与失败指标见下表，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。

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

## B2 / t1

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=194（候选194），校准 Brier=0.1211；Platt={'a': 2.0844, 'b': 0.4502, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.134, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.231}, "A5–9": {"n": 52, "gap": -0.01100000000000001, "brier": 0.0832, "mean_pred": 0.797, "actual_win": 0.808, "leak_ratio": 1.198}, "A10": {"n": 16, "gap": 0.026000000000000023, "brier": 0.122, "mean_pred": 0.651, "actual_win": 0.625, "leak_ratio": 1.411}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.134 | 1.231 |
| tune | A5–9 | 52 | 0.797 | 0.808 | -0.01100000000000001 | 0.0832 | 1.198 |
| tune | A10 | 16 | 0.651 | 0.625 | 0.026000000000000023 | 0.122 | 1.411 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 194 | 0.763 | 0.686 | 0.07699999999999996 | 0.1211 | 1.255 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 12 | 0 | 0.1921 | 0.65/0.417 | 2.927 | brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 19 | 0 | 0.0626 | 0.793/0.789 | 1.028 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 19 | 0 | 0.1256 | 0.627/0.579 | 1.173 | 无 | 达标 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 17 | 0 | 0.063 | 0.794/0.824 | 1.242 | 无 | 达标 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 20 | 0 | 0.0695 | 0.842/0.75 | 0.923 | 无 | 达标 |
| 女王 (QUEEN) | 12 | 0 | 0.2795 | 0.753/0.417 | 1.028 | brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 16 | 0 | 0.0678 | 0.929/0.875 | 0.873 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 10 | 0 | 0.1531 | 0.351/0.1 | 3.413 | brier,gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 22 | 0 | 0.157 | 0.671/0.636 | 1.438 | brier,leak | 低 |
| 同族 (THE_KIN) | 13 | 0 | 0.1719 | 0.788/0.846 | 1.364 | brier,leak | 低 |
| 墨影幻灵 (VANTOM) | 14 | 0 | 0.1274 | 0.926/0.786 | 1.018 | 无 | 达标 |
| 瀑布巨兽 (WATERFALL_GIANT) | 20 | 0 | 0.0852 | 0.877/0.85 | 0.894 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.351, "brier": 0.1233, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.351, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 1.0, "actual_enemy": 8.0, "enemy_ratio": 0.125, "sim_loss": 1.0, "actual_loss": 8.0, "loss_ratio": 0.125}}, "val": {"n": 10, "actual_win": 0.0, "mean_pred": 0.394, "brier": 0.1633, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 8, "pred": 0.351, "actual": 0.0}, {"bucket": "40–60%", "n": 1, "pred": 0.504, "actual": 0.0}, {"bucket": "60–80%", "n": 1, "pred": 0.627, "actual": 0.0}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 20, "sim_enemy": 11.53, "actual_enemy": 4.2, "enemy_ratio": 2.744, "sim_loss": 11.53, "actual_loss": 4.9, "loss_ratio": 2.352}}}}`。验证还差 0 场；范围限制：`{"49": "F49独立战：校准 Brier 0.163，高于整体 0.121 的 1.25 倍 0.151; 偏乐观：预测平均胜率 39%，实际 0%; 模拟每回合被打穿的血是实际的 2.74 倍"}`。

## B3 / pre

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=194（候选194），校准 Brier=0.1227；Platt={'a': 2.2754, 'b': 0.5047, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.1347, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.289}, "A5–9": {"n": 52, "gap": -0.009000000000000008, "brier": 0.0855, "mean_pred": 0.799, "actual_win": 0.808, "leak_ratio": 1.26}, "A10": {"n": 16, "gap": 0.020000000000000018, "brier": 0.1223, "mean_pred": 0.645, "actual_win": 0.625, "leak_ratio": 1.422}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.1347 | 1.289 |
| tune | A5–9 | 52 | 0.799 | 0.808 | -0.009000000000000008 | 0.0855 | 1.26 |
| tune | A10 | 16 | 0.645 | 0.625 | 0.020000000000000018 | 0.1223 | 1.422 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 194 | 0.766 | 0.686 | 0.07999999999999996 | 0.1227 | 1.28 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 12 | 0 | 0.1799 | 0.654/0.417 | 2.84 | brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 19 | 0 | 0.0678 | 0.803/0.789 | 1.074 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 19 | 0 | 0.1504 | 0.635/0.579 | 1.178 | 无 | 达标 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 17 | 0 | 0.0518 | 0.795/0.824 | 1.269 | 无 | 达标 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 20 | 0 | 0.0633 | 0.832/0.75 | 1.081 | 无 | 达标 |
| 女王 (QUEEN) | 12 | 0 | 0.2641 | 0.717/0.417 | 1.208 | brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 16 | 0 | 0.0764 | 0.94/0.875 | 0.862 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 10 | 0 | 0.1388 | 0.321/0.1 | 3.333 | gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 22 | 0 | 0.1801 | 0.696/0.636 | 1.474 | brier,leak | 低 |
| 同族 (THE_KIN) | 13 | 0 | 0.1743 | 0.81/0.846 | 1.321 | brier,leak | 低 |
| 墨影幻灵 (VANTOM) | 14 | 0 | 0.1182 | 0.913/0.786 | 0.992 | 无 | 达标 |
| 瀑布巨兽 (WATERFALL_GIANT) | 20 | 0 | 0.0846 | 0.892/0.85 | 0.876 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.321, "brier": 0.103, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.321, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 0.4, "actual_enemy": 8.0, "enemy_ratio": 0.05, "sim_loss": 0.4, "actual_loss": 8.0, "loss_ratio": 0.05}}, "val": {"n": 10, "actual_win": 0.0, "mean_pred": 0.338, "brier": 0.1166, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 9, "pred": 0.321, "actual": 0.0}, {"bucket": "40–60%", "n": 1, "pred": 0.489, "actual": 0.0}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 20, "sim_enemy": 12.63, "actual_enemy": 4.2, "enemy_ratio": 3.007, "sim_loss": 12.63, "actual_loss": 4.9, "loss_ratio": 2.579}}}}`。验证还差 0 场；范围限制：`{"49": "F49独立战：偏乐观：预测平均胜率 34%，实际 0%; 模拟每回合被打穿的血是实际的 3.01 倍"}`。

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

模拟失败原件：`[{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "error": "board: Error: no solve"}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "error": "board: Error: no solve"}]`。

## 本批来源与增量重放审计

任务 20261009-114303-silent-boss-calibration 为 Roy 已授权新功能定期刷新，20次新实际结局（13胜/7死）触发；固定107调参keys和UTC切点，仅扩验证174→194。各起点Platt和进阶项选择与上批逐项相同。

301个开场按原始states偏移、长度、SHA256和角色/进阶逐一核实，战斗入口HP/最大HP与第一帧逐项一致，我方状态与日志一致。旧281场输入、行序、回合记录及数值源码/模型数据/game-data均相同；差异只有经验文本，模拟器不读取这些文本。3条历史重放所有非耗时字段完全一致。复用上批562条封存结果，完整重放20新场t1/pre共40条，逐战seed仍按全数据原始行号。这是增量验证，不冒称全量重放；初始全量重放主动中断130，原结果和日志保留。

A10 HP进阶来源 {'10': 272}、开场进阶来源 {'10': 272}，有伤害记录的后续招式进阶来源 {'10': 48, '9': 1}；实验体BIG_POUNCE仍由A9估。27个无伤害记录的招式不能当成已验证机制。41个开场沿既有模型修正首击数值，未补新机制。

F49实际结局13、可用开场12、验证{'t1': 10, 'pre': 10}。TXZ6RVMQA09D F49有died但缺首回合手牌帧而排除；rooms_without_actual_outcome实际表示没有可用实际结局开场。F48战胜不代表整局通关，F48→F49联合通关概率未验证。A0–4、A5–9验证均0，保留该样本外限制。

复用已上线实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36及调度入口；本批仅发布静默统计校准数据，没有新增出牌/药水/保血/目标/SL/终局规则或结构不一致，code_proposals与implementation_domains为空。live后续知识刷新依锁内流程保留；本表验证固定模型，不冒称刷新后的模型已经同次验证。

本批实际CLI账本为silent-0337（kind=fight/proposed）；ledger-proposal.json为执行原件，ledger-payload-draft.json仅为保留草稿，未重复add。来源提交随后用CLI追加，shipped由运维核实际发布后登记。
