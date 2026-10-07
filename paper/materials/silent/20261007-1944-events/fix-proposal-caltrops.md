# 恢复已有铁蒺藜接线修复

来源任务：fix-batch 20261007-173847；实现任务链接：strategy-proposal；角色 silent，观察进阶 A10；账本 silent-0229。已有纯 bug 源提交 be0df8cd17319dbae0d51c421ccad62b2cb8228b 未进入本批 main 基线；本批复用其实现及固定测试。本学习者已从 logs/states.jsonl 按时间定位 CA5KE8GFJ9X2 F9 T6、F13 T1，两份手牌逐字相等，保存 caltrops-log-verification.json。

旧行为：普通 CALTROPS 的 ThornsPower=3 只有通用 Power 评分，未输出 card.thorns，也没有建立后续轮 THORNS_POWER。新行为：仅 silent 已见普通卡牌输出三点 thorns，并走既有求解器反伤与 Power 持久化路径。行动伤害与敌方行动后反伤分账，不叠算已有荆棘。

固定回归覆盖当轮反伤、持久反伤、已有荆棘不重复和无攻击轮。其他角色、升级牌、未见变量维持原行为。无拟合、无新出牌规则，未有修正后的整场反事实，不保证转胜。撤源码红、恢复绿与整套检查见本批报告；回退为 revert 本批恢复提交。来源原复盘 paper/materials/silent/20261007-1414-events/postmortem.out.txt 保持，不覆盖历史失败或原提案。

已自测源码提交：db6e32d2ee101af6b53f8228c27165bb41f04811；本批每次提交前原沙箱入口退出0。实际合入事实以本批 report.md 为准；未合入不登记 implemented/shipped。
