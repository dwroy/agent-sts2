# 整体检查清单（经验库、历史打分模型完成后逐项核对）

## 分工与配置
- [ ] DeepSeek 直接决定：选牌、商店（买牌、买药、删牌）、事件和问号房、路线（每幕规划一次，只在必要时重新规划）、休息点、遗物、开局奖励
- [ ] 战斗由 Jev 执行：没有 CLOSE_CALL 自动出牌，没有战斗中的 DeepSeek 兜底，没有普通战 <0.3 置信度的回退
- [ ] .env 与上面一致：FIGHT_PLAN=off、ESCALATION_CHAIN=deepseek、DEEPSEEK_MAX_CALLS=300、Jev 走官方 API（jev-latest）
- [ ] DeepSeek 失败时的兜底路径能正常工作

## DeepSeek 拿到的信息
- [ ] 历史完整不删减：DeepSeek 自己的全部决定和理由、路线规划与进度、每场战斗一行、当前状态
- [ ] 怪物数据库：本幕 boss、精英和危险普通怪的数据，每个数值都注明样本量 n
- [ ] boss 伤害估算：使用校准后的版本
- [ ] 经验库：只给相关的那一部分，并注明证据
- [ ] 路线事实：实际看一局的日志抽查
- [ ] 进程中途重启后历史会丢失（已知限制）：确认是否需要从日志恢复

## Jev 拿到的信息
- [ ] 每个选项的事实都正确：抽查实际对局的问题
- [ ] 历史打分模型：离线检验通过后才接入
- [ ] 5 回合推演：离线检验通过后才接入
- [ ] 给 Jev 6 到 8 个有区别的选项：尚未实现

## 数据与工具
- [ ] 每局结束后刷新 monster-db 和按场次统计的 move-model（wait-run.sh、学习闭环）
- [ ] 刷新 outcome-stats（经验库的一部分）
- [ ] ops/stats.py、report.py 要能统计 DeepSeek 的直接决策（目前读的是 jev_confidence）
- [ ] plan_adherence.py 与新版本兼容
- [ ] 药水说明里的占位符都已填上，遗物数值未知时标为"?"

## 待定事项（10 局后）
- [ ] 药水规则 P1–P8
- [ ] 保血规则 C5
- [ ] 给 boss 留药的约束（战斗计划关掉之后）
- [ ] 替代 enemy-dossiers 里手写的数值

## 留档
- [ ] decision-log、讨论记录、STATE、记忆、paper_dataset、会话存档
