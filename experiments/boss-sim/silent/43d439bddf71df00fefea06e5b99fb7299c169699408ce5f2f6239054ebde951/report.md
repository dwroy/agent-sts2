# 静默 boss 模拟校准

Roy 授权的是角色隔离、整体 Platt、时间切分、原准入标准和定期重跑架构；下面样本、实胜败、拟合、残差及准入结论只来自已结束的 SILENT 对局。boss侧参数复用用户准许的既有模型/monster-db（含common），另记来源，不把它当作静默对局样本或校准参数。没有新增打法或策略阈值。

提取：131 局，604 次尝试；241 次有实际结局且取得首回合帧（模拟成功数另列）。冻结到已结束局 `2026-10-08T06:10:52.521Z`；未进入 boss 的局号/版本及完整筛选列表在 extraction.json。提取排除原因：`{"SL predicted_death: censored, no actual win/loss; no observed completed outcome": 361, "SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand": 1, "no turn-1 decision with drawn hand": 1}`。
可用 118 局，实际结局 `{'won': 175, 'died': 66}`，各进阶场数 `{'0': 16, '1': 6, '2': 5, '3': 3, '4': 9, '5': 3, '6': 22, '7': 17, '8': 3, '9': 7, '10': 150}`。
SL predicted_death 是未实结算的截断样本，来源保留，不标实际败局；同一局全部 boss/SL 共享切分。校准胜率以有实际结局的尝试为条件，存在 SL 截断选择偏差，不是所有初试胜率或允许SL的整局通关率。开场我方资源取日志，boss HP/伤害/招式沿现有 monster-db 按进阶输入、缺级取最近观测，未重拟合 boss 侧。

SL口径：boss房间 243；初试结局 `{'predicted_death': 97, 'won': 143, 'died': 3}`，重试结局 `{'won': 32, 'predicted_death': 265, 'died': 64}`；没有实际结局的房间 `[{'run_id': 'TD1HVGS7H6LB', 'floor': 17}, {'run_id': 'TXZ6RVMQA09D', 'floor': 49}]`。失败重载仍不能补造实际败局；具体 reload 原记录随来源保留。

固定来源/模型：`{"simulator_base": "a85b3c5d88a3c2bcd8053f1bad8f447310c1ccd9", "model_sha256": "14f9521c1ec36428c32e698019ade6a603e5ebf7d05c5a3e32c8a04deed5792b", "samples": 200, "seed": 1, "dataset_sha256": "ebf5d831a06060265aabe6ee6161be2241d8422150bbd55560e9027a8dab519c", "sources_sha256": "a8e253817b31411f75b63864193c25d44be63f4a093619577ef3300dedfd6d40", "versions": {"tune": ["0a066c2f+dirty", "0d0c4b69+dirty", "103fd5ff+dirty", "141df614+dirty", "1e047a36+dirty", "25a408ef+dirty", "2c81eb76+dirty", "2ec81b9f+dirty", "3a2a2a48+dirty", "3cbc6955+dirty", "3ebbdc6c+dirty", "41bd4a44+dirty", "42ac6c1d+dirty", "452f7bc7+dirty", "45965f49+dirty", "473a62f4+dirty", "48f2bf5a+dirty", "4915e3b3+dirty", "5ae08a3d+dirty", "5de5d518", "5de5d518+dirty", "6566b7d3+dirty", "65d99e74+dirty", "7be569b1+dirty", "7bea7d99+dirty", "7c7f22e3+dirty", "86b24a1f+dirty", "8b268858+dirty", "8d79fd5b+dirty", "9692ea6d+dirty", "9852b39f+dirty", "9988ca8b+dirty", "9e0fda2e+dirty", "a999dba8+dirty", "b9c46d66+dirty", "bb19732f+dirty", "bf3ebb7c", "bf63ab40+dirty", "c4c7ad97+dirty", "ccf1fcde+dirty", "d283e641+dirty", "d9a3ea37+dirty", "ee1f4fd1+dirty", "f1d951ec+dirty"], "val": ["0061f599+dirty", "0068600d+dirty", "03d50f0b+dirty", "03f4ffe0+dirty", "047c809e+dirty", "0581ecb3+dirty", "09ac8004+dirty", "0d6c1a82+dirty", "0fd8e845+dirty", "1a0adbaa+dirty", "1a5e1217+dirty", "1a89c2d4+dirty", "2518c73d+dirty", "261af56e+dirty", "28e339fa+dirty", "31914e4b+dirty", "3599ab0a+dirty", "3caa860b+dirty", "4fb81b17+dirty", "56c64ff8+dirty", "5925a43d+dirty", "60685510+dirty", "6ac57ea6+dirty", "6ad5584f+dirty", "6c3d8187+dirty", "6fd495cc+dirty", "70c8352b+dirty", "710dc4dc+dirty", "734c0860+dirty", "74f82413+dirty", "79bee0fc+dirty", "7f6d5b4b+dirty", "8ef00878+dirty", "910604a4+dirty", "91c1db90+dirty", "92376ca3+dirty", "93298980+dirty", "98d2d508+dirty", "9e20ade9+dirty", "a73ce7cc+dirty", "aa1e2136+dirty", "ac321b1f+dirty", "ad01f74a+dirty", "b0b0e679+dirty", "b0f41f03+dirty", "b1714285+dirty", "b219de68+dirty", "b8ca9311+dirty", "be0ee6df+dirty", "c1dd721f+dirty", "cc1bdc59+dirty", "ceb74207+dirty", "cecc8317+dirty", "d4026dbb+dirty", "d61bf0ec+dirty", "da2ccb92+dirty", "dc899f95+dirty", "e33ca6e0+dirty", "e8a6fb71+dirty", "eabdd307+dirty", "ebd920b4+dirty", "f0c9dfbf+dirty", "f17e15ca+dirty", "f56da22b+dirty", "f65cbfac+dirty", "f8dd742d+dirty", "f8e01696+dirty", "f9db52c1+dirty", "fd4c8e52+dirty"]}, "completed_max_asc": 10}`。所有输入文件 SHA256 在同批 provenance.json。筛选读取总日志索引元信息，但没有纳入铁甲对局样本或校准参数，角色统计输入只取静默目录。common monster-db 是用户准许复用的既有模型；它已有的观测数值固定使用，验证的是静默胜率映射，不宣称从零预测未观测 boss 机制。
固定切点 `2026-10-06T02:46:11.648000`（UTC，与日志ts同口径），调参 107 场、验证 134 场；验证覆盖后期代码，完整版本逐项在来源表。每起点 200 样本，固定 seed=1（逐战seed=1+原始行号×101），模拟策略/费用/药水/保血/目标/SL阈值保持原样。

进阶项只作一个整体模型的统计校正，不解释为进阶机制的因果效应；版本、资源和SL选择与进阶共变。某进阶段验证 n=0 时，只有调参残差，没有该段独立的样本外可靠性证据。上线保留后来其他批次的代码修复和知识刷新；本表仅验证所列固定模型，不冒称后续模型版本已通过相同验证，下一次定期重跑固定当时的模型。

B2 用首回合起点；B3 用既有 pre/redeal 方法：实际首回合资源、全副牌重洗并重新抽开场手牌，不使用后续观测。B2 中途沿同一整体首回合映射，其独立中途校准未验证；铁甲映射保持原值。

A10 的 F48 胜只算该战胜利，不算整局通关；F49 是另一场独立 boss 战，以下列出本角色来源。怪物数值来源的 exact/nearest 及伤害估值在 results 的 bossSource 内，common 是用户准许复用的既有模型，校准参数不复用铁甲。

## A10 数值与 F49 范围

数值审计：`{}`。完整开场及后续攻击定义的数值来源另见 opening-audit.json / model-input-audit.json，缺级沿既有 nearest/ratio 方法。

F49 实际结局 7 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。

| 局号 | boss | 尝试 | 回合 | 结局 | 代码 |
|---|---|---|---|---|---|
| JMH5C51RLN4E | AEONGLASS | 6 | 1 | died | 41bd4a44+dirty |
| 9TG1RP5LFAAK | QUEEN+TORCH_HEAD_AMALGAM | 6 | 3 | died | 141df614+dirty |
| ZVYUL2YP3518 | TEST_SUBJECT | 6 | 8 | died | 6ac57ea6+dirty |
| TDLBRNA0R05B | TEST_SUBJECT | 6 | 2 | died | dc899f95+dirty |
| XTSV1U9JD34T | QUEEN+TORCH_HEAD_AMALGAM | 6 | 4 | died | 03f4ffe0+dirty |
| PD9AYQVMLQW6 | AEONGLASS | 6 | 10 | died | 7f6d5b4b+dirty |
| 9R916WW0V65N | QUEEN+TORCH_HEAD_AMALGAM | 6 | 2 | died | 8ef00878+dirty |

## B2 / t1

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=134（候选134），校准 Brier=0.1158；Platt={'a': 2.0844, 'b': 0.4502, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.134, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.231}, "A5–9": {"n": 52, "gap": -0.01100000000000001, "brier": 0.0832, "mean_pred": 0.797, "actual_win": 0.808, "leak_ratio": 1.198}, "A10": {"n": 16, "gap": 0.026000000000000023, "brier": 0.122, "mean_pred": 0.651, "actual_win": 0.625, "leak_ratio": 1.411}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.134 | 1.231 |
| tune | A5–9 | 52 | 0.797 | 0.808 | -0.01100000000000001 | 0.0832 | 1.198 |
| tune | A10 | 16 | 0.651 | 0.625 | 0.026000000000000023 | 0.122 | 1.411 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 134 | 0.767 | 0.694 | 0.07300000000000006 | 0.1158 | 1.273 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 8 | 2 | 0.2608 | 0.62/0.25 | 3.043 | n,brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 16 | 0 | 0.045 | 0.79/0.812 | 1.006 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 14 | 0 | 0.1069 | 0.652/0.571 | 1.248 | 无 | 达标 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 15 | 0 | 0.0606 | 0.823/0.867 | 1.126 | 无 | 达标 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 13 | 0 | 0.0406 | 0.831/0.769 | 1.013 | 无 | 达标 |
| 女王 (QUEEN) | 7 | 3 | 0.2815 | 0.787/0.429 | 0.919 | n,brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 14 | 0 | 0.0774 | 0.922/0.857 | 0.853 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 7 | 3 | 0.1658 | 0.351/0.143 | 3.752 | n,brier,gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 11 | 0 | 0.1254 | 0.622/0.727 | 1.573 | leak | 低 |
| 同族 (THE_KIN) | 7 | 3 | 0.2415 | 0.793/0.714 | 1.287 | n,brier | 低 |
| 墨影幻灵 (VANTOM) | 9 | 1 | 0.1602 | 0.941/0.778 | 1.043 | n,brier,gap | 低 |
| 瀑布巨兽 (WATERFALL_GIANT) | 13 | 0 | 0.0806 | 0.86/0.846 | 0.992 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.351, "brier": 0.1233, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.351, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 1.0, "actual_enemy": 8.0, "enemy_ratio": 0.125, "sim_loss": 1.0, "actual_loss": 8.0, "loss_ratio": 0.125}}, "val": {"n": 5, "actual_win": 0.0, "mean_pred": 0.406, "brier": 0.1773, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 4, "pred": 0.351, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 1, "pred": 0.627, "actual": 0.0}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 14, "sim_enemy": 13.12, "actual_enemy": 3.86, "enemy_ratio": 3.402, "sim_loss": 13.12, "actual_loss": 3.93, "loss_ratio": 3.34}}}}`。验证还差 5 场；范围限制：`{"49": "F49独立战：验证集只有 5 场（至少要 10 场）; 校准 Brier 0.177，高于整体 0.116 的 1.25 倍 0.145; 偏乐观：预测平均胜率 41%，实际 0%; 模拟每回合被打穿的血是实际的 3.40 倍"}`。

## B3 / pre

参与拟合的模拟成功调参 n=106（候选107）；整体验证成功 n=134（候选134），校准 Brier=0.1129；Platt={'a': 2.2754, 'b': 0.5047, 'c': 0.0}。失败记录未补造预测或实际胜败。

进阶项选择（只看调参）：`{"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005", "base_tune_residuals": {"A0–4": {"n": 38, "gap": 0.0030000000000000027, "brier": 0.1347, "mean_pred": 0.766, "actual_win": 0.763, "leak_ratio": 1.289}, "A5–9": {"n": 52, "gap": -0.009000000000000008, "brier": 0.0855, "mean_pred": 0.799, "actual_win": 0.808, "leak_ratio": 1.26}, "A10": {"n": 16, "gap": 0.020000000000000018, "brier": 0.1223, "mean_pred": 0.645, "actual_win": 0.625, "leak_ratio": 1.422}}, "systematic": false, "selected_ascension": false}`。

| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |
|---|---|---|---|---|---|---|---|
| tune | A0–4 | 38 | 0.766 | 0.763 | 0.0030000000000000027 | 0.1347 | 1.289 |
| tune | A5–9 | 52 | 0.799 | 0.808 | -0.009000000000000008 | 0.0855 | 1.26 |
| tune | A10 | 16 | 0.645 | 0.625 | 0.020000000000000018 | 0.1223 | 1.422 |
| val | A0–4 | 0 | None | None | None | None | None |
| val | A5–9 | 0 | None | None | None | None | None |
| val | A10 | 134 | 0.766 | 0.694 | 0.07200000000000006 | 0.1129 | 1.304 |

原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。

| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |
|---|---|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 8 | 2 | 0.2513 | 0.61/0.25 | 3.18 | n,brier,gap,leak | 低 |
| 仪式兽 (CEREMONIAL_BEAST) | 16 | 0 | 0.0328 | 0.791/0.812 | 1.052 | 无 | 达标 |
| 帝王蟹 (KAISER_CRAB) | 14 | 0 | 0.1167 | 0.654/0.571 | 1.242 | 无 | 达标 |
| 知识恶魔 (KNOWLEDGE_DEMON) | 15 | 0 | 0.0507 | 0.821/0.867 | 1.188 | 无 | 达标 |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 13 | 0 | 0.0262 | 0.809/0.769 | 1.153 | 无 | 达标 |
| 女王 (QUEEN) | 7 | 3 | 0.2845 | 0.757/0.429 | 1.036 | n,brier,gap | 低 |
| 灵魂异鱼 (SOUL_FYSH) | 14 | 0 | 0.0873 | 0.934/0.857 | 0.856 | 无 | 达标 |
| 实验体 (TEST_SUBJECT) | 7 | 3 | 0.1541 | 0.321/0.143 | 3.68 | n,brier,gap,leak | 低 |
| 无厌沙虫 (THE_INSATIABLE) | 11 | 0 | 0.1221 | 0.618/0.727 | 1.645 | leak | 低 |
| 同族 (THE_KIN) | 7 | 3 | 0.2391 | 0.836/0.714 | 1.263 | n,brier | 低 |
| 墨影幻灵 (VANTOM) | 9 | 1 | 0.172 | 0.952/0.778 | 0.991 | n,brier,gap | 低 |
| 瀑布巨兽 (WATERFALL_GIANT) | 13 | 0 | 0.0767 | 0.873/0.846 | 0.975 | 无 | 达标 |

A10 附加限制：`{}`。

F49单独调参/验证指标（同一整体映射）：`{"F49": {"tune": {"n": 2, "actual_win": 0.0, "mean_pred": 0.321, "brier": 0.103, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 2, "pred": 0.321, "actual": 0.0}, {"bucket": "40–60%", "n": 0, "pred": null, "actual": null}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 1, "sim_enemy": 0.4, "actual_enemy": 8.0, "enemy_ratio": 0.05, "sim_loss": 0.4, "actual_loss": 8.0, "loss_ratio": 0.05}}, "val": {"n": 5, "actual_win": 0.0, "mean_pred": 0.355, "brier": 0.1302, "auc": null, "const_brier": 0.0, "buckets": [{"bucket": "0–20%", "n": 0, "pred": null, "actual": null}, {"bucket": "20–40%", "n": 4, "pred": 0.321, "actual": 0.0}, {"bucket": "40–60%", "n": 1, "pred": 0.489, "actual": 0.0}, {"bucket": "60–80%", "n": 0, "pred": null, "actual": null}, {"bucket": "80–100%", "n": 0, "pred": null, "actual": null}], "worst_bucket_n20": null, "won_loss_err": {"n": 0}, "leak": {"n": 14, "sim_enemy": 13.35, "actual_enemy": 3.86, "enemy_ratio": 3.461, "sim_loss": 13.35, "actual_loss": 3.93, "loss_ratio": 3.398}}}}`。验证还差 5 场；范围限制：`{"49": "F49独立战：验证集只有 5 场（至少要 10 场）; 偏乐观：预测平均胜率 36%，实际 0%; 模拟每回合被打穿的血是实际的 3.46 倍"}`。

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

模拟失败原件：`[{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "error": "board: Error: no solve"}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "error": "board: Error: no solve"}]`。
