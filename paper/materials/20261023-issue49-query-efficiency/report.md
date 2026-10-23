# #49 查询效率小修正

2026-10-23T23:16:29+08:00，[dev #49]，原工作树/会话接续。依据 [Claude转Roy晚间授权6367991625](https://github.com/dwroy/agent-sts2/issues/49#issuecomment-6367991625)。原 #49+#26 已由ops发布为V6-R418，原18局身份及首局对比见6367643586/6367810632；本次只交新的净差量，不重复集成或发布原两提交。

## 小修正

1. `brain-query-cues-v3` 的策略/rk计数与对应工具共用选择器。0匹配或缺失/坏库不提供调用工具名/参数；非零实体查询才有参数。同步移除基础指令、题面及工具说明中的无条件“先查”，只按非空线索与需要查询。经验保持独立，0条经验也不附调用参数。未增加强制查询闸，原15工具/8次调用与原查询/作答预算不变。
2. 构筑rk按题型筛选用途：拿牌为card_pick，商店为shop/card_pick/potion，休息为rest，事件/幕初规划为四种构筑用途。构筑题不能通过显式applies_to绕过combat_line过滤；只返回原label_en的一句话摘要、ID/版本/用途、原可信度/证据/来源经验关联，不发原始predicate/signal JSON。来源文件及SHA保留。摘要省略条件并不意味着无条件适用，仍标记predicate未求值。fight-plan保持原完整结果，包括携带幕初规划任务的备战题。
3. 拿牌/商店增加六外部统计工具的可选线索：先核同一已发布SHA固定聚合，只按候选精确ID/当前幕核实际行存在；给候选匹配数、最多六张候选ID及非零工具输入，不塞拿取率、胜率、区间等正文。角色/进阶限Silent A10、版本v0.111；缺库/坏SHA/不支持题型不提示。保留非因果/自有分账与聚类共现不作方向依据说明，明确奖励统计不是商店购买率。模型自行决定是否调用，不改#26已发布的奖励提示模块，也不引入其工作树缺失的本地模块依赖。
4. 自然读回报告继续分列策略/rk/经验的查询率、命中率及耗时，新增引擎/互斥题型的 `latency_ms_median` 与前后中位数差值；缺失保持null，不补零。约14秒中位数是待自然验证的目标，固定测试不证明时延或命中率收益。

本次没有修改正式知识文件、V6开关/加载器、Jev出牌逻辑、其他角色工具/指令、main/live或运维prompt。构筑摘要仍保留来源与可信度，实际hit_ids只来自工具真正返回的条目。

## 定向验证

新增9条固定回归在原7d262cd77上8失败/1通过，见 red-original.log：复现0条仍引导、构筑混入combat_line/谓词、缺少外部线索；原件保留。首轮修正tsc0/6文件88项通过。补充时延中位数、备战携带规划兼容与外部表单次解包后，最终 **tsc0、8文件136项通过、0失败**。15份最终源/文档/测试输入SHA前后相同（inputs-before/after.json）。

```text
cd agent
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 npx tsc -p tsconfig.json --noEmit
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 npx vitest run \
  tests/brain-query-efficiency.test.ts tests/brain-query-guidance.test.ts \
  tests/brain-reflex-knowledge.test.ts tests/brain-agent-mode.test.ts \
  tests/brain-agent-report.test.ts tests/external-stats-tools.test.ts \
  tests/brain-agent-provenance.test.ts tests/v6-combat-entries.test.ts \
  --pool=threads --maxWorkers=1
```

固定夹具覆盖0匹配不引导、非零线索与真实返回一致、构筑拒绝combat_line且无谓词/信号JSON、备战原结果、外部六工具线索参数与实际total_rows一致、坏SHA/缺失/角色进阶题型边界、只读聚合字节、原来源/MCP/额度兜底与Jev关闭态字节等价、中位数计算/缺失。外部数据测试仅用既有SHA固定聚合，不下载或联网。原生turn_context本轮实核gpt-6.1-sol/high，未改配置。

按授权只跑tsc与定向测试，没有full、模型、play、A/B或额外实验局。新回归文件在旧fixture中把默认题型改为fight-plan，以继续验证原完整rk结果；构筑行为由新增专项夹具验证，未放宽原来源/置信度/安全断言。

## 交接

本次差量基于7d262cd77，仅取该基线到本次提交的净补丁；已上线的6290300d8/7d262cd77及#26不重复带入。集成员按最新授权定向核验后交ops自然边界发布，沿实际live知识与最新功能保留，不整叶覆盖main/live的brain.ts或旧决策日志。旧R418原18局/首局报告原件不改写。

发布后冻结下一批自然题独立读回查询率/命中率、真实ID、总耗时中位数/均值/p95及fallback，和原18局口径分账比较；不把回归绿或减少空查询当作已达14秒或科学收益。回退仅撤本次净补丁，保留原V6-R418真实rk功能、知识与全部历史记录。
