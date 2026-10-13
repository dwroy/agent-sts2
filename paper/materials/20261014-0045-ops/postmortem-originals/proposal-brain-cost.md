# 独立run-plan脑请求未进入自动整局成本的修复提案

角色证据：silent，A10；纯统计基础设施缺口，不添加游戏知识或更改对局策略。来源任务：postmortem，20261014-001305-postmortem。账本：silent-0459。实现任务：独立strategy-proposal（本任务仅只读复盘；由既有调度器分配实现批号）。当前未实现、未上线。

证据：4U3WNL3JRRCX F32无回合，brain.jsonl:13642，question_id=mv6t2svo-509097-32，label=run-plan，engine=codex/model=gpt-6.1-sol/effort=xhigh/accepted=true；usage.inputTokens=145142/outputTokens=1755/cacheHitTokens=0，latency_ms=79521。run-plans.jsonl:3479对应同run/F32/trigger=review、无merged_into，同样用量。brain共32个不同question_id，而动作decisions仅31个实际付费脑答；runs.jsonl:760与notes/run-1013-2350-4U3WNL3JRRCX.md仅31次及4806356入/25160出。实际32条脑答合4951498入/26915出，少计146897 token；缓存总2870016不变，报告缓存59.71%应区别完整32请求57.96%。647动作决策计数、Jev1224414 token保持原口径，不伪造第648动作。

根因位置按只读live 7e04d9a42dd6080a8d3716dd165e44d4b30c458d：ops/report.py:261的本局recs只来自decisions；:309—311只从该列表算大脑用量；:315—318算付费请求；:401落runs。agent/src/hand/loop.ts:2065/2066调用及内部记数，:2070—2088独立写run-plan用量，因此生产脑请求本身未丢失，遗漏在报表读取源。两个文件与本局启动源码0b07f43b3bdf54138e922cb84f2fd41dce9db139一致；报告源码片段及SHA见本任务report-source.txt/source-evidence.json。

旧行为：只从动作决策汇总，独立计划无动作行便缺席整局脑请求数和token。
新行为：建立可追溯的本局真实脑请求成本源，合并独立计划请求与已在动作中计费的请求，按question_id或经核唯一身份去重。合题计划run-plans:3475—3478的question字段并非额外请求，不能再加一次；reused计划续步不收费。拒绝把同run/同层相近时间武断当唯一请求；老日志缺唯一身份时标覆盖/不确定与来源，并保存原基线，不重写原logs。统计读取brain真实引擎，旧ds_*兼容名称和历史行保持可重现。不得将输入缓存比例、log token或Jev估算价格当实付账单，也不得重新累计已经包含的79.521秒墙钟。

反例与限制：本局31个动作脑请求的合计与原局报完全一致，只有另一个独立计划漏项；32个原brain答均有不同question_id。这不证明所有历史局都漏相同数量。全局论文成本提取是否已经另纳独立计划须独立核，不能从runs漏项断言所有论文表也错。历史多进程/重试/容量失败、缺身份帧的合并规则需固定原件验证。

拟合：无需游戏拟合或参数训练；使用本局完整固定日志和一份合题/独立计划/复用边界夹具测试。未来范围审计按来源分列，不把重复SL尝试当额外脑请求。
验证：修复后本固定样本请求数32、输入4951498、输出26915、缓存2870016；原动作647和Jev151次/1224414 token不变；对四个合题计划去重，对纯续步不计费，缺来源明确未知。按仓库规定沙箱tsc/vitest自测并查发布规则；不运行play，不修改历史logs。若只修统计不得分配行为发布号，实际合入由ops核。
预期影响：整局成本、调用次数与缓存比例覆盖真实独立脑计划，不改变游戏行动。回退该新增成本汇总实现，保存修复前后审计与历史原值，不删原请求证据。无implemented_commit，pending不是shipped。
