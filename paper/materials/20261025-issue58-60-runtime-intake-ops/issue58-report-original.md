# #58 工具用途与未变计划复用

基线 `ebe5bfc38d80694f6ec5a4f2e0c8ebf0bb2c3bf5`，独立分支 `issue-58-brain-tools-plan-reuse`。按最新正文实施；初稿的逐题保持/更新协议、四种组合与计划版本体系未实施。开发只写本树，未运行游戏入口、修改 live/STOP、共享账号/服务档或其他会话。

## 最终行为

- 系统提示逐项说明本次实际注册工具的定义、主要选择参数和用途；用途在原 ToolDef.description，提示从同一 ToolDef/name/inputSchema 渲染。Silent 15项，其他角色按实际注册清单。参数仅简列选择器与枚举，分页等正式约束仍随工具提供。机制、经验、策略/rk、自有与外部统计对启动/过渡、本幕Boss、最终双Boss、爬楼、拿/删/升级/商店的帮助明确，保留来源、反证及能力限制。最终无工具作答/重问阶段撤下能力表并说明工具已关闭。
- Silent A10 初次建立完整 run_plan/endgame。已有计划时省略或null即复用，选择答案不再隐含要求完整计划；实际调整才给受影响字段和 change_reason，说明当前情况、相对旧计划的取舍及预期胜率收益。代码要求理由非空，不冒称能机械验证理由的语义或胜率。字段可局部更新，未改字段不经完整解析器重归一化。重复等值字段不新建计划；checkpoint仅更新幕末判断。原V6可选方向更新也提示默认复用、需要收益判断，不因幕/HP复核强制生成整套方向。
- 原RoutePlan、合法节点检查及代码逐节点执行继续使用；普通路线复核省略/keep/重复同一节点序列都保留原对象，真实改线才要求route_reason并创建路线。幕初随机结果的一次复核对重复路线也按keep处理，初始规划及路线失效入口保持。
- 数值投影按依赖分别缓存 plan_facts、next_rest、初始candidate_routes。相同依赖不调用原整段计算/替代路线枚举；仅休息选项变化不重新计算next_rest。地图/位置/可达性/飞行靴、剩余节点、房间模型、HP/maxHP、连续战斗及各自选项按消费者参与失效。实际状态照常读取；牌组/遗物使routeCosts改变时数值也失效。缓存在进程内，冷恢复重新核当前数值，不把旧计划投影当现在HP。
- 最终答案省略计划时不从被重问的首答捞回旧patch。原完整计划持久化、后继读回、floor边界恢复、合法执行与第一幕起F48→F49连胜目标保留。新计划/路线控制和投影缓存限原Silent A10范围，其他角色/进阶保留原控制和日志；工具能力说明按各角色真实清单统一改善，不声称系统提示字节未变。

## 固定证据

`capture.mts` 经实际createBrain请求构造器、固定进程内引擎导出 `system-prompt.txt`、`registered-tools.json`、`request-fixture.json`。没有调用模型或对局服务；快照不证明自然加载或决策质量。复现：

```bash
cd agent
nice -n 19 node --import tsx ../paper/materials/20261025-issue58-plan-reuse/capture.mts
```

`route-reuse-fixture.json` 使用既有合成route-fixture：初次computed；重复依赖plan_facts/next_rest都reused；仅休息选项变化plan_facts失效、next_rest复用；HP、路径变化重新计算相关投影。新固定测试对原routeFacts/nextRestFacts/candidateRoutesFacts的实际调用计数断言，并覆盖收益理由、保留无关字段、checkpoint、严格schema、最终省略不捞首答及报告读回。旧恢复矩阵继续覆盖Codex/DeepSeek、跨题/重启/同局回退/未来或异局计划拒绝；新reuse分支核省略后后继仍读原计划。

最终生产tsc退出0。全量首轮685文件：683通过/2失败，6666项通过/2失败/2历史跳过；失败一为遗漏的旧“系统不能出现策略/rk名称”断言，一为稀疏分配未展开的#29原材料。前者按本需求修正，后者从分配基线精确Git blob展开（SHA见materialized-import.json，历史字节未改）。最终12文件172项复验通过，含两失败文件及本次全部修改测试、schema、agent模式、路线/恢复、幕初接入；paths单列1文件11项通过。覆盖合计686文件/6679项通过/2历史跳过，无未处置失败；**这是全量首轮加修正复验的覆盖，不冒称另跑了一次单次全绿full**。额外tsconfig.test探测仍有非生产范围诊断（含旧测试与ops模块配置）；初次新增夹具缺类型字段已修正，新文件最终0诊断，不代生产tsc门。详情checks.json。

原.log按仓库规则留在本开发工作树，原字节SHA见artifact-manifest.json；提交保留检查清单和可重建的请求/工具/计算快照，不用提交日志冒运行发布证明。检查结果以同目录原日志及检查清单为准；所有命令nice19，worker=1。首次定向失败的旧断言与一次为新发现重问边界而终止的自有回归保留，不覆盖成通过。

## 交接与runtime

公共ToolDef、工具名、输入schema和只读返回未改；#60在底层存储/读取接入，本项不改其文件。重叠接入以最终固定commit串行核对。没有新增依赖或游戏知识，不在开发树分配行为发布号；实际上线由原集成/ops在自然边界核组合、编号、decision-log及双通知。

原 `brain-agent-report.ts` 增加planning_questions，逐题列实际工具调用与耗时、plan输出/变更理由、route及理由、route_calculation、答案JSON字符、原文字符、output_tokens和整题耗时；缺失原字段为null。run-plans的plan_update和decisions的run_plan_merge记reused/updated/checkpoint及变更字段；实际落盘、路线执行与后继消费仍须核对应原件，不用accepted代采用。

原ops沿发布后自然局核实际工具/系统提示SHA、未变路线的缓存复用、变更理由/范围和依赖失效、后继/冷恢复，再结合选项质量、输出长度与整题时延评估。工程交付/必要运行核收与#50达标线、长期学习/胜率效果按#59分账；后者保持开放，不为本任务额外开局，也不以查询次数下降单独验收。回退本提交的源码差量即可恢复旧提示/完整计划流程；已有JSONL和完整合并后的RunPlan沿旧格式保留，不删除历史/反证/失败。
