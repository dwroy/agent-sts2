# 原量化实现的有界接续入口

记录：2026-10-12 01:18:33 CST。请求 ops-20261012-quantitative-continuation，父请求 roy-20261011-silent-core-cycle-quantitative-learning；原批 20261011-221722-strategy-proposal 已done，四成果未完成。本任务仅是已授权学习链的恢复接线，不重新研究全历史或添加游戏知识。

证据与阻塞：ops/strategy_implementation_jobs.py:121-139 的 dispatch 拒绝任何已登记 implementation_request；proposal_inputs:92-105 只收 pending，而原三项现为 waiting。原batch终态/注册和冻结输入应保留，不能删除后伪装首次派发。

要求沿原 strategy-proposal/learner/broker 通道增加显式、持久去重、有界的续办身份，绑定父请求、原batch、旧ACK/9输入SHA、先前产物清单及本次独立职责补充。只在原owner已退出且相关proposal无活租约时领取；同续办ID重复调用返回原回执，失败保留原历史、原有1小时/最多3次边界，不自动重派旧研究。不强改原proposal为pending，不关闭原父请求。

职责补充见 paper/materials/20261012-0111-codex1-resumed/quantitative-ownership-addendum.json：已交付框架的六路径可由原实现学习者按证据继续；actual_dispatch前重核owner。复用221722已有57项coverage、300记录/106端点与抽象重算及原报告限制，完整核心资格/次数、条件经验、消费者、真实预测实际校准及自然读取/采用/效果仍须分别完成，不把框架/入口当成果。

固定验证覆盖重复续办、活租约、旧输入漂移、跨请求误绑定、失败重试上限及原done/waiting/失败历史保持；经自测上线后由主ops使用现有broker真实派发并保存新账号消费回执。不要改当前011302活批输入、修改ops prompt、读凭据或启动第二调度器。
