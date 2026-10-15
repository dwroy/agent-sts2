# P0.3 现有 Boss 模拟可信度

只整理现有 boss-trust.json 与已发布校准报告。固定模型 7e1193cef 的结论不推广到后续生产模型；首试和 SL 的实际结果保持分账。

| Boss | 通道 | 已可信 | n | Brier | 预测 | 实际 | 失败项 |
|---|---|---|---:|---:|---:|---:|---|
| KAISER_CRAB | b2 | False | 41 | 0.1727 | 0.689 | 0.61 | brier,leak |
| KAISER_CRAB | b3 | False | 41 | 0.2027 | 0.705 | 0.61 | brier,leak |
| THE_KIN | b2 | True | 34 | 0.0849 | 0.807 | 0.853 |  |
| THE_KIN | b3 | True | 34 | 0.0932 | 0.823 | 0.853 |  |
| QUEEN | b2 | False | 25 | 0.2433 | 0.721 | 0.4 | brier,gap |
| QUEEN | b3 | False | 25 | 0.2294 | 0.695 | 0.4 | brier,gap |
| AEONGLASS | b2 | False | 29 | 0.178 | 0.689 | 0.517 | brier,gap,leak |
| AEONGLASS | b3 | False | 29 | 0.1948 | 0.692 | 0.517 | brier,gap,leak |
| CEREMONIAL_BEAST | b2 | True | 36 | 0.0597 | 0.79 | 0.806 |  |
| CEREMONIAL_BEAST | b3 | True | 36 | 0.0523 | 0.806 | 0.806 |  |
| KNOWLEDGE_DEMON | b2 | False | 41 | 0.0934 | 0.76 | 0.829 | leak |
| KNOWLEDGE_DEMON | b3 | False | 41 | 0.0833 | 0.766 | 0.829 | leak |
| LAGAVULIN_MATRIARCH | b2 | True | 38 | 0.0644 | 0.836 | 0.842 |  |
| LAGAVULIN_MATRIARCH | b3 | True | 38 | 0.0623 | 0.827 | 0.842 |  |
| SOUL_FYSH | b2 | True | 29 | 0.0425 | 0.924 | 0.897 |  |
| SOUL_FYSH | b3 | True | 29 | 0.0463 | 0.933 | 0.897 |  |
| TEST_SUBJECT | b2 | False | 22 | 0.1639 | 0.351 | 0.136 | brier,gap,leak |
| TEST_SUBJECT | b3 | False | 22 | 0.1518 | 0.321 | 0.136 | brier,gap,leak |
| THE_INSATIABLE | b2 | False | 39 | 0.1424 | 0.677 | 0.641 | brier |
| THE_INSATIABLE | b3 | False | 39 | 0.1624 | 0.68 | 0.641 | brier,leak |
| VANTOM | b2 | True | 44 | 0.0612 | 0.899 | 0.932 |  |
| VANTOM | b3 | True | 44 | 0.0562 | 0.904 | 0.932 |  |
| WATERFALL_GIANT | b2 | True | 35 | 0.0971 | 0.833 | 0.829 |  |
| WATERFALL_GIANT | b3 | True | 35 | 0.0973 | 0.854 | 0.829 |  |

原整体胜率分桶完整保存在 evaluation.json 的 boss_trust.overall；原文件没有的逐 Boss 分桶留空，不重拟合。A0–4/A5–9 独立验证不足及 F49 低可信仍以原 ascension_low/stage_low 为准。
现有 eval/calibration.py 测的是 rollout/路线/Boss 时钟误差，不是 B2/B3 胜率 Platt 验证；两套统计没有合并。
