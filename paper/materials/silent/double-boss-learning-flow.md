# silent-double-boss B/C/D 学习流程实施

这是 Roy 2026-10-07 12:22、12:35 对独立任务 silent-double-boss 的授权实现。A 的证据、拟合、不确定性和行为上线见 double-boss.md，源 e1a467e18a0dfa8d99046a24ff4c0e1af59278c8，live ac076f8a71f101de62d5345fa6b4fca248fd928c，版本 S1.double-boss1。本节只改变离线学习与机械调度，不新增游戏规则，不造第二个对局版本。

## B 实盘资源归属

postmortem 明确包含赢的战斗，逐场进/离场 HP、max HP、带槽位的药水和回合证据，追溯关键进场资源被前面哪场耗掉。learner/resource_chain.py 按局号流式读固定文件截止，核角色已结束局；退出帧变化归前场，战前/战间资源单列，缺首/尾帧明示。SL 时间和回合重置分开；同 T1 重试也单列。工具不判胜负，不把净HP变化当敌人伤害，不从药水槽位变化自行断言饮用，也不宣称缺失反事实可赢。

固定验证复用本任务自行提取的全部静默A10第三幕帧（8,405,204,707 字节截止，原始 states 行号保留）。四局 F48 实际离场/紧接F49进场 HP 为 JMH5C51RLN4E 8→8、9TG1RP5LFAAK 17→17、ZVYUL2YP3518 50→50、TDLBRNA0R05B 2→2。TDL 重打首帧也观察到66/4等与原始64/2不同的HP，保留原帧，不把 SL 恢复与常规回血或独立新战斗混算。原始 SL、资源逐帧和每次尝试退出缺失全部保存 scratch/*-resources.json，不重写既有复盘。

## C 独立升阶结构审计

调度读取本角色 run-config 的实际 climb 等级，不从跳级补造未观察等级。首次安装只补当前已观察等级，之后每次记录的升级都持久化；新等级有已结束本角色局后自动派独立 ascension-audit。固定模式和外角色不派。角色+等级去重，最多一个独立审计运行；启动前保存 launching 与尝试，后台执行不等待审计完成、不阻塞 play。

每个等级每次尝试用新的独立树 ascension-audit-<角色>-a<级>-<1..3> 和 per-level flock，失败/丢失的旧树与日志保留，一小时冷却后重试，三次耗尽通知运维；租约占用和脏树不回退到普通 codex-dev。迟到完成只保存旧回报，不覆盖新租约。完成必须是相符的角色/等级/来源局，报告在 learner/runs，六项 floors/combat_counts/healing/campfires/rules/assumptions 覆盖齐全且提案链接通过。审计只由学习者比较已观察结构和代码、写证据/账本/提案，运维不添加游戏知识。纯审计不伪造合入、eval版本或游戏源码检查成功。

## D 经验到代码提案闭环

AGENTS、learning-protocol、postmortem/experience/fix/strategy及其他相关任务模板同步 Roy 新授权：有足够理由和本角色自行核实数据时，学习者可以修改人定的出牌、药水、SL、终局价值规则，自测上线后按 date + 根目录双通知报告，不再因“人定”本身送待审批。只读任务仍由独立策略任务实现，证据不足保留原行为，不扩大到未授权架构。

learner/code_proposals.py 使用追加队列，校验本角色已结束局、对应账本、保存的 Markdown 和任务关联，CLI 追加账本的提案/任务链接。提交前经验校验和完成事件按实际 source commit 的前后经验核验，不能只凭回报自称有提案。新协议批次必须有 typed code_proposals/implementation_domains；旧批次不倒记成功或重置历史。待实现提案优先于持续开放的普通bug队列获得共享工作树，再派策略学习者，逐id回报 actual-live implemented/duplicate 或缺数据 waiting；waiting等新增本角色完局再派。合法无源码修改要核真实40位base、干净工作树和保存报告，不造merge/版本/完整测试。遗漏链的产出保留、另派学习者补链，不因复盘已经写过而丢失。中断队列行原文保存并追加带指纹 recovery，不将半行当成成功。

## 固定检查与部署边界

learner/tests/test_resource_chain.py、ops/tests/test_learning_flow.py 为固定数据；不调用引擎、网络或 play。B/C/D 撤源码检查分别失败、恢复通过，原日志和初稿保留 scratch。原沙箱入口与固定排除未修改，完整源/合后检查及固定树写最终 report.md/report.json。只读根目录主检出源码不在本任务写入范围；合入 live 后把 main/实际调度调用点的同步请求写已授权 ops/inbox-dev.md，由运维集成。没有实际 batch/PID 时不声称新审计已运行。已有铁甲及其他角色对局行为与知识数据保持等价；学习模板与机械审计按角色通用。
