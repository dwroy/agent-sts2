# P0.3 现有 Boss 模拟可信度

只整理现有 boss-trust.json 与已发布校准报告。固定模型 7e1193cef 的结论不推广到后续生产模型；首试和 SL 的实际结果保持分账。

| Boss | 通道 | 已可信 | n | Brier | 预测 | 实际 | 失败项 |
|---|---|---|---:|---:|---:|---:|---|
| KAISER_CRAB | b2 | False | 43 | 0.1661 | 0.697 | 0.628 | brier,leak |
| KAISER_CRAB | b3 | False | 43 | 0.1941 | 0.713 | 0.628 | brier,leak |
| THE_KIN | b2 | True | 39 | 0.0742 | 0.828 | 0.872 |  |
| THE_KIN | b3 | True | 39 | 0.0815 | 0.842 | 0.872 |  |
| QUEEN | b2 | False | 28 | 0.2487 | 0.718 | 0.393 | brier,gap |
| QUEEN | b3 | False | 28 | 0.2358 | 0.692 | 0.393 | brier,gap |
| AEONGLASS | b2 | False | 32 | 0.19 | 0.702 | 0.531 | brier,gap,leak |
| AEONGLASS | b3 | False | 32 | 0.2074 | 0.706 | 0.531 | brier,gap,leak |
| CEREMONIAL_BEAST | b2 | True | 36 | 0.0597 | 0.79 | 0.806 |  |
| CEREMONIAL_BEAST | b3 | True | 36 | 0.0523 | 0.806 | 0.806 |  |
| KNOWLEDGE_DEMON | b2 | False | 41 | 0.0934 | 0.76 | 0.829 | leak |
| KNOWLEDGE_DEMON | b3 | False | 41 | 0.0833 | 0.766 | 0.829 | leak |
| LAGAVULIN_MATRIARCH | b2 | True | 38 | 0.0644 | 0.836 | 0.842 |  |
| LAGAVULIN_MATRIARCH | b3 | True | 38 | 0.0623 | 0.827 | 0.842 |  |
| SOUL_FYSH | b2 | True | 30 | 0.0411 | 0.927 | 0.9 |  |
| SOUL_FYSH | b3 | True | 30 | 0.0447 | 0.935 | 0.9 |  |
| TEST_SUBJECT | b2 | False | 24 | 0.1853 | 0.351 | 0.208 | brier,leak |
| TEST_SUBJECT | b3 | False | 24 | 0.1776 | 0.321 | 0.208 | brier,leak |
| THE_INSATIABLE | b2 | True | 43 | 0.1299 | 0.699 | 0.674 |  |
| THE_INSATIABLE | b3 | False | 43 | 0.1484 | 0.702 | 0.674 | brier,leak |
| VANTOM | b2 | True | 46 | 0.0589 | 0.9 | 0.935 |  |
| VANTOM | b3 | True | 46 | 0.0539 | 0.906 | 0.935 |  |
| WATERFALL_GIANT | b2 | True | 36 | 0.0945 | 0.837 | 0.833 |  |
| WATERFALL_GIANT | b3 | True | 36 | 0.0947 | 0.857 | 0.833 |  |

原整体胜率分桶完整保存在 evaluation.json 的 boss_trust.overall；原文件没有的逐 Boss 分桶留空，不重拟合。A0–4/A5–9 独立验证不足及 F49 低可信仍以原 ascension_low/stage_low 为准。
现有 eval/calibration.py 测的是 rollout/路线/Boss 时钟误差，不是 B2/B3 胜率 Platt 验证；两套统计没有合并。
