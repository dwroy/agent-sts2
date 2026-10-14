# P0.3 现有 Boss 模拟可信度

只整理现有 boss-trust.json 与已发布校准报告。固定模型 7e1193cef 的结论不推广到后续生产模型；首试和 SL 的实际结果保持分账。

| Boss | 通道 | 已可信 | n | Brier | 预测 | 实际 | 失败项 |
|---|---|---|---:|---:|---:|---:|---|
| KAISER_CRAB | b2 | False | 38 | 0.1857 | 0.671 | 0.579 | brier |
| KAISER_CRAB | b3 | False | 38 | 0.2177 | 0.69 | 0.579 | brier,leak |
| THE_KIN | b2 | True | 34 | 0.0849 | 0.807 | 0.853 |  |
| THE_KIN | b3 | True | 34 | 0.0932 | 0.823 | 0.853 |  |
| QUEEN | b2 | False | 24 | 0.2534 | 0.711 | 0.375 | brier,gap |
| QUEEN | b3 | False | 24 | 0.2389 | 0.684 | 0.375 | brier,gap |
| AEONGLASS | b2 | False | 26 | 0.1932 | 0.676 | 0.462 | brier,gap,leak |
| AEONGLASS | b3 | False | 26 | 0.2057 | 0.687 | 0.462 | brier,gap,leak |
| CEREMONIAL_BEAST | b2 | True | 35 | 0.0613 | 0.786 | 0.8 |  |
| CEREMONIAL_BEAST | b3 | True | 35 | 0.0537 | 0.802 | 0.8 |  |
| KNOWLEDGE_DEMON | b2 | False | 39 | 0.0961 | 0.758 | 0.821 | leak |
| KNOWLEDGE_DEMON | b3 | False | 39 | 0.0863 | 0.762 | 0.821 | leak |
| LAGAVULIN_MATRIARCH | b2 | True | 36 | 0.0645 | 0.845 | 0.861 |  |
| LAGAVULIN_MATRIARCH | b3 | True | 36 | 0.0628 | 0.837 | 0.861 |  |
| SOUL_FYSH | b2 | True | 28 | 0.0441 | 0.922 | 0.893 |  |
| SOUL_FYSH | b3 | True | 28 | 0.0479 | 0.93 | 0.893 |  |
| TEST_SUBJECT | b2 | False | 20 | 0.1531 | 0.351 | 0.1 | brier,gap,leak |
| TEST_SUBJECT | b3 | False | 20 | 0.1388 | 0.321 | 0.1 | gap,leak |
| THE_INSATIABLE | b2 | False | 38 | 0.1458 | 0.672 | 0.632 | brier |
| THE_INSATIABLE | b3 | False | 38 | 0.1665 | 0.674 | 0.632 | brier,leak |
| VANTOM | b2 | True | 42 | 0.0637 | 0.898 | 0.929 |  |
| VANTOM | b3 | True | 42 | 0.0586 | 0.902 | 0.929 |  |
| WATERFALL_GIANT | b2 | True | 33 | 0.102 | 0.83 | 0.818 |  |
| WATERFALL_GIANT | b3 | True | 33 | 0.1028 | 0.85 | 0.818 |  |

原整体胜率分桶完整保存在 evaluation.json 的 boss_trust.overall；原文件没有的逐 Boss 分桶留空，不重拟合。A0–4/A5–9 独立验证不足及 F49 低可信仍以原 ascension_low/stage_low 为准。
现有 eval/calibration.py 测的是 rollout/路线/Boss 时钟误差，不是 B2/B3 胜率 Platt 验证；两套统计没有合并。
