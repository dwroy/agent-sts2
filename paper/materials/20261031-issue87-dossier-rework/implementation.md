# #87 档案返工：机制 / M 优先，O/E 后排

按 [87/6544939471](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6544939471) 返工；保留已通过的 A 对齐内容与原固定 `2ec93ece` 引用。本次只修改档案投影两源叶、对应测试、随两叶内容变化的工程方法 pin 和本报告。对齐的 15 叶逐项与 2ec 同 blob/同缺失，详见 [alignment-15-unchanged.json](alignment-15-unchanged.json)，前后完整 blob 表仍见前次报告。不重新改 LIVE、超时、loop/card-pick/construction-safety 或知识条目。

## 修正结果

- 正文仍需正式发布、confidence=null、按 #85 标为机制事实；再按原 trigger 排除 fight_plan 专用条目及含 fight_plan 的单窗条目。这样即使某条的 single_observation_window 标志为 false，只限 fight_plan 也不能进构筑正文。未改原 grade、标志或证据。实际 K1 中 8 条相关战斗观察仅计入每 Boss 的 `K目录n条` 和 strategy_references，构筑正文只剩两条蟹机制事实。
- 恢复每 Boss 的 r1 M 核心：源序前三项关键攻击/能力/成长连同 HP、相位和原 n 全保留，再加入适用机制事实和目录计数，作为固定预算主体。所有原 r1 三题出现过的 M 项均保留，并在三题里统一补足三项。源序其余 M 保留完整审计与原工具查询，不引入人工挑选的 Boss 知识。
- O/E 最后试填，预算不足整字段省略，不能挤掉 M 或机制事实；不截断数字、招式或条件。O 口径未变，仍首试 unknown / 含重试 x/n、分窗不相减。当前只显示放得下的 O 行，E 在三题中均省略；所有 Boss 的两口径仍完整留在审计，等正式首试源发布后沿原接口接入。
- K 版本仍固定 `K1-0924d4ea26809fc410f7fbbfa0e22ce2b5bf60091686bbefb62db2b7bcf0be30`。两蟹事实完整原文/条件/反证/冲突保留在 replay audit 与原工具里；没有凭模型知识补事实，也没将观察提成构筑策略或放宽正文额度。

真实三题的每一行已核：知识的诅咒和思考力量+3、噬咬22、消退26/人工制品3、强力冲撞32、液化地面/力量+3全部存在；两条蟹机制也全部存在。完整机械核查 [three-prompt-review.json](three-prompt-review.json) 同时列出排除的8条 ID、保留的18个 M 项和目录计数。旧 first 单窗与“未标单窗但只限fight_plan”两种固定反例均有回归；巨型 O/E 尾部不能挤掉任一 Boss M 或事实的测试通过。

## 三题完整前后题面

| 原题 | 返工前（固定2ec） | 返工后 | 档案 B | 相对原始题面整题增量 B | 温投影 p95 ms |
| --- | --- | --- | --- | --- | --- |
| F1 | [返工前完整题面](https://github.com/dwroy/agent-sts2/blob/2ec93ecea95a056df89637fdcde2bc9ca35c6603/paper/materials/20261031-issue87-r2-v6-alignment/full-prompts-final/opening.after.json) | [返工后完整题面](full-prompts-final/opening.after.json) | 1480 | 2019 | 0.285 |
| F32 | [返工前完整题面](https://github.com/dwroy/agent-sts2/blob/2ec93ecea95a056df89637fdcde2bc9ca35c6603/paper/materials/20261031-issue87-r2-v6-alignment/full-prompts-final/act2_before_boss.after.json) | [返工后完整题面](full-prompts-final/act2_before_boss.after.json) | 1472 | 1993 | 0.260 |
| F35 | [返工前完整题面](https://github.com/dwroy/agent-sts2/blob/2ec93ecea95a056df89637fdcde2bc9ca35c6603/paper/materials/20261031-issue87-r2-v6-alignment/full-prompts-final/act3_revealed.after.json) | [返工后完整题面](full-prompts-final/act3_revealed.after.json) | 1477 | 1991 | 0.346 |

本目录还保留原始改造前的三份 `.before.json` 与本次 `.after.json`，完整六文件均由原 CLI/真实消息、任务、schema 构造器生成；[report.json](full-prompts-final/report.json) 给出源 SHA、完整事实/M/O 审计和约束检查。每题100次温投影、档案≤1500B，模拟数值除已批准 S 目标键外不变；没有调用模型或游戏。完整消息和本地投影计时不能代自然采用/生产决策延迟。

## 验证与闭包

生产 tsc、报告CLI+learner 隔离 tsc、2 文件33项档案定向、24项固定方法、实际相对导入全部通过。新增两个回归覆盖正文触发范围和 O/E 预算优先级；前一固定2ec的34文件387项对齐/共享消费者检查继续留原记录，15对齐叶没有改动，本轮不重起全量。最终 full 仍由原合并批组合检查完成。

本轮预检发现的 boolean 局部推断类型错误和测试误选上下文行已修正并复验；一次回放输出父目录未建的环境失败也保原件，补目录后复验成功，没有改生产构造器或安装依赖。详见 [validation.json](validation.json) 与 [checks/](checks/)。原首轮6118/6119、缺稀疏fixture及同blob复验、2ec的定向与历史失败全部保留，不改写为通过。

[declaration-delta.json](declaration-delta.json)：两个闭包的节点、静态/动态边和contract均与2ec相同，仍308/402；只更新两源叶在两方法中的哈希/opaque pin。其余11方法身份不变。工程方法不是生产准入票；#83先行rollout新字节仍由集成员语义合并及重算，不能整声明覆盖。

## 接续边界

新固定工程 HEAD 交原集成员再次核全部映射/runtime不越界/cold，以及83/86交集。此前2ec初检 [87/6544923341](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6544923341) 不是新HEAD的票，也不代真正submit前当时main→最终规范候选三门；当前不自行submit/tick/assembly/full。

最新方法例外按 [77/6544817571](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6544817571)，已替代前次报告历史“五项”摘要：14项精确清单只适用77/87r1/83r5。本次对齐实际部署必须方法正常、闭包零差异，由ops回执后主管整体撤销例外。本开发没有部署、撤例外、分号或关闭其他会话；10自然/30首试效果父项继续分账开放。
