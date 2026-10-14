# P0 后续：S 伤害归属修复

旧反例和 p0-sign-audit-b2.md 保留不改。已定位到现有统计链：turn-solver 输出的 retaliated 已被 rollout.applyPlan 扣到敌人HP，但原 bossMargin.outgoingHp 只累加 action-only 的 dmg；终止于回合开始效果时，startDealt 也没有下一条记录来结转。这是已有模拟结果的归属遗漏，不是新增机制/牌值。

修复新增仅供 Boss margin 的 outgoingHpDamage：旧动作伤害 + 已结转开始伤害 + 实际扣除的反伤 + 终止时尚未结转的开始伤害。只读现有模型实际结算，不按牌名补伤害，不改旧dmg/回合数/候选/胜负/药水/HP/SL。未知目标群、截断、混合归属和原信任闸保持。

固定反伤夹具原 won=true、Boss入场3/剩0，但outgoing=0、S=-0.17857；修复后计入实际扣除3。五项新增夹具覆盖过量反伤截断、单/多回合终止carry恰好一次、其他结果逐值等价和unknown不越闸；撤修复红、恢复绿，22项相关固定测试通过。

原冻结 B2 题相同状态和seed再算，每候选600，1,800样本反号17→0；胜负、死亡、回合数、复活与连续战标记逐值一致。b2-fixed/是新的修复后产物，旧b2-samples.json.gz和b2-sign-audit.json保持原值。没有新Jev请求或游戏动作，不能冒作实盘收益、全部Boss已校准或P3已开启。

S作为现有题面统计已经在线，所以本修复会改变题面数字，须独立行为发布编号、双通知与部署树检查。P1默认仍shadow，P1-on/P2/P3/P4/P5均未发布；父请求保持开放。
