# 静默 A10 升级勒紧的六点状态变换

来源任务：strategy-proposal，batch 20261007-214301-strategy-proposal；实现任务：strategy-proposal，scratch 20261007-214302-strategy-proposal。角色 silent；范围仅已观察 A10、FASTEN upgraded=true 且 ExtraBlock=6。授权 Roy-2026-10-07-learning，仅为修改权限。

原队列 silent-proposal-ebbfe3b97548756d 的子缺口；既有学习账本 silent-0143（普通勒紧与脆弱公式）、silent-0237/0238（神化缺口），本项另经CLI新增 proposed 条目，保留旧shipped状态。

## 本角色证据

VLZ6CCT8AQ0A A10 F43 T1：原 logs/states.jsonl L275682→L275683，07:35:39.704Z→07:35:40.874Z，神化后手牌勒紧+ ExtraBlock=6；实打花1能量，FASTEN_POWER 从无到6。T2 L275687 防御+ base=8、current=14；T4 L275696 已4敏捷、防御+ current=18。五帧按原_offset重新读取根日志，确认缓存state与原帧完全相同，SHA256与偏移保存 fasten-provenance.json。牌面14/18是观测，不冒记这两张牌已打出。

反例：同局F45 T1 L275722未施放神化、勒紧仍4；旧 P5HT1272P5SB F25 T9普通4沿旧固定测试验证。其他角色、A9/A11、缺角色/进阶及升级变量不是6保留旧行为。没有同盘另一出牌线胜负，不推断必打或转胜。

## 旧规则与新行为

旧modelHandCard只识别静默普通勒紧ExtraBlock=4，升级6遗漏；Power仍有旧参考值但未建立六点后续状态。新代码只在silent且ascension=10、upgraded=true、ExtraBlock=6时赋fasten=6；复用既有求解器的施放后Defend专属增挡及rollout持续状态。将现有GameState进阶传入手牌、已知抽牌/各堆和deckModels建模；其他条件不变。当前已建立状态的牌面增挡不重复计算；非Defend格挡技能不受新增值影响。

本项不实现神化自身、未知卡升级、整副牌战内升级传播，不把局部修复冒称原神化提案完成。原综合提案保持waiting，已实现子项与其余缺数据分别回报。

## 验证、拟合与限制

固定夹具只保存核验过的五帧消费字段，禁止刷新知识文件读取；对六点建立、同线前后顺序、已显示14/18不重复、后续rollout保留及deckModels进阶传递做确定性回归。复合同线测试把已见升级卡放在同一起点检查状态转换，是构造回归，不冒称原局实打组合。撤生产源码应失败，恢复通过，随后原tools/test-sandbox.sh检查。保留普通勒紧原8例与铁甲/未观察等级等价。

不拟合权重；VLZ同局F43是发现及回归，F45仅普通版本反例，不称独立盲测。缺完整神化牌堆/抽序与未知升级差值，未观察进阶保留旧行为。预期减少已升级勒紧线的漏挡，无胜率保证。回退独立源码提交，保留证据/账本/报告；实际live合入后再记录唯一版本及Roy双通知，否则保持proposed、不标shipped。
