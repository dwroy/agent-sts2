静默猎手 THE_INSATIABLE B4 原始证据核验（批次 20261013-044302，重放进行中）

本文件只记录已核实的原日志事实，最终门槛和处置以正式报告为准。

| 局号 | 进阶 | SL尝试 | 实际结局 | 起始HP | 结束HP | 回合 |
|---|---:|---:|---|---:|---:|---:|
| C48LLXBGKXQ9 | 0 | 6 | died | 60 | 0 | 11 |
| LRN0HPZ0FZS1 | 0 | 1 | won | 74 | 47 | 8 |
| R0HEV5E3QT6G | 0 | 1 | won | 53 | 5 | 8 |
| XYYQYBRM2A01 | 1 | 6 | died | 70 | 0 | 10 |
| ZZMYZ5UBCG72 | 2 | 1 | won | 63 | 52 | 5 |
| ENKYQMS9W4ZD | 6 | 2 | won | 68 | 55 | 6 |
| 2SU6XN2AEJRD | 6 | 1 | won | 78 | 19 | 8 |
| 2PVLGRBGUX9S | 7 | 1 | won | 70 | 54 | 9 |
| 25226ZFLNR1J | 10 | 1 | won | 65 | 1 | 11 |
| 4ANT8D00TP72 | 10 | 3 | won | 48 | 6 | 9 |
| XBD8Z9XLPCPN | 10 | 6 | died | 23 | 0 | 3 |
| HUVEPWQAHWFU | 10 | 2 | won | 52 | 8 | 10 |
| HSX4HYATB4E2 | 10 | 3 | won | 30 | 1 | 8 |
| MCT1GPTL8D35 | 10 | 2 | won | 63 | 9 | 9 |
| 8JRE1C4H4Z2W | 10 | 6 | died | 47 | 0 | 11 |
| YF0LXT1QSTGG | 10 | 2 | won | 55 | 20 | 8 |
| WQZVENQ7DTRP | 10 | 6 | died | 56 | 0 | 11 |
| 9R916WW0V65N | 10 | 1 | won | 63 | 40 | 8 |
| T0DGVABPV60U | 10 | 1 | won | 41 | 13 | 10 |
| H1T1F8ML9FUE | 10 | 2 | won | 45 | 28 | 9 |
| AD3QSC3P41JU | 10 | 1 | won | 70 | 19 | 11 |
| Y5H4CFAQ2WTG | 10 | 1 | died | 59 | 0 | 10 |
| SY0WMJNNVRLM | 10 | 6 | died | 70 | 0 | 9 |
| 4XLZURXMD872 | 10 | 6 | died | 23 | 0 | 3 |
| CNKR125PFHJ5 | 10 | 1 | died | 53 | 0 | 6 |
| R3AJCGQGGMR4 | 10 | 2 | won | 61 | 3 | 7 |
| Z91JN3S3PQX2 | 10 | 1 | died | 79 | 0 | 13 |
| HEMND3SMQYB8 | 10 | 1 | won | 32 | 15 | 6 |
| P2M3DFJ4DEZ3 | 10 | 1 | won | 60 | 8 | 10 |
| PBUBM0LRTEDD | 10 | 2 | won | 66 | 2 | 8 |
| JBX9JLH46KVN | 10 | 1 | won | 58 | 9 | 8 |
| HNX4A2WBC34W | 10 | 2 | won | 58 | 19 | 10 |
| 9663Y88TYK73 | 10 | 1 | won | 69 | 29 | 7 |
| 8HW407EAUYL7 | 10 | 2 | won | 70 | 42 | 11 |
| 7S8HCC0M6G9W | 10 | 1 | won | 82 | 59 | 6 |
| SPC7NVA5K4RL | 10 | 6 | won | 55 | 8 | 8 |
| H9ERYJLBL4UC | 10 | 2 | won | 72 | 14 | 9 |
| 64VJC5XT2AT2 | 10 | 1 | won | 86 | 19 | 9 |
| C7GNN3DDFUFY | 10 | 6 | died | 57 | 0 | 7 |
| 16UDD0430SXT | 10 | 1 | won | 49 | 23 | 8 |
| 47731LKMZRBJ | 10 | 1 | died | 62 | 0 | 5 |
| G4PQBCJQ7NP0 | 10 | 6 | died | 25 | 0 | 6 |

42场实际结局/106次尝试，64次预测死亡截尾排除。触发累计死亡13局与已结束runs逐局核对相符；开局原始SHA256全部匹配。

42次T2沙坑均为4；狂乱逃离均为6张，抽牌堆+手牌3/弃牌堆3。按最后可行动帧核实265次跨轮倒计时，均为下一轮减1。最初直接使用最后观察帧时产生过假偏差，初稿保留为raw-audit-initial/v2与mechanism-audit.json，不把它作为机制改动证据。

不受力量/虚弱/缩小/我方易伤影响的伤害观测：A10挥打9×2共24次，突咬31×1共23次；低阶挥打8×2、突咬28×1。与基准模型相符。已观察A10分泌力量+3共50次，低阶+2共11次；招式转移在320个逐轮入口中始终按已有循环。尚未找到可证实的fullFight源码校正。

冻结扩充数据464场，tune107固定、val357；新增4场只进验证，目标boss本次无新增结局。before/after将使用同一数据、200样本和原始整集行索引种子。旧发布固定模型的可信档案仅是派题证据，不代替dispatch_base重放。
