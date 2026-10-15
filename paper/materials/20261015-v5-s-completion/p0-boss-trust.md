# P0.3 现有 Boss 模拟可信度清单（接续）

来源：当前已发布Silent boss-trust，固定模型7e1193；完整来源SHA、已有分桶及F49限制见同目录p0-boss-trust-inventory.json。当前生产模型未独立复验，不因这份清单新增可信结论。

| Boss | 通道 | 现有可信 | n | Brier | 预测胜率 | 实际胜率 | 失败项 |
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

逐Boss分桶原件未记录，保留未知；总体与F49分桶保留在JSON。F49独立验证23场、数量缺口0仍未达标，不能由新增两胜或满样本数推成可信。首试和SL沿原校准划分；宽R3及新模型校准保持原线程继续。
