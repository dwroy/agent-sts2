# 新字段读取审计

fullFightAeonglass 仅由 boardRolloutInput 附带，不改 solver。角色需为 SILENT、存在 AEONGLASS、进阶精确属于 tune 观察0/1/5/6/7/10；其他角色/怪物/未知级不附字段。

rollout.ts 的 simulate 起点只有 fullFight && field && solver.wither 时复制 wither damage，五回合短路不读。fullFightState 本身仅在 simulate 的 fullFight 展开分支调用；aeonglassBuffs 是样本内部字段。applyPlan 的 made、力量与升级、敌招状态牌读取全部受 fullFight 短路保护。后轮 wither.damage 的读取有 fullFight；nextAttacks/aeonglassStrength 仅由 fullFight 的 lookaheadOf 调用，不改实盘输入或5轮策略。

board 构建未增加游戏规则给实盘 solver；live builder 的5轮实测在新固定测试中去掉该字段并逐对象比对全输出完全相同。Ironclad与未观察级的固定整场记录保持基准行为。acceptance.py 将以 dispatch_base 的不可变 fixture/runner 独立对两边实盘solver/5轮逐字节验证。新增完整字段读取列表保留在 field-reads.txt。没有其他实盘源码变化，也未修改调度器、验收器或旧断言。
