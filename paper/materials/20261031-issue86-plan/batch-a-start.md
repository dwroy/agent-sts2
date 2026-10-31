# 第1批开工与策略116/173读者核查

2026-10-31 14:15 CST；主管批准原件：[#86/6539967934](https://github.com/dwroy/agent-sts2/issues/86#issuecomment-6539967934)。第1批实施授权现已生效，CodeSeal不新做；生产shadow连续5局自然零差异且既定时延门通过后由ops局间切换，出现差异修复后重新计数。

预计第1批A完整工程候选 **2026-10-31 22:00 CST**；首个可独立合并/回退的小步（stats存储、资源接口及固定夹具）预计 **18:00 CST**。这是本开发树的工程候选时间，不包含原队列等待及ops的5局自然shadow；不抢当前唯一检查。若发现影响交期的阻断，提前在issue报告并向原inbox追加一行。

当前核查结论：**未发现绑定K1后仍读取Git/LIVE116条策略副本的生产运行读者。**

- `brain/tools/query-guidance.ts:strategyMatches`、`brain/tools/typed-knowledge.ts`、`brain/decision-knowledge.ts:boundSource`优先使用`indexedKnowledge`，按绑定K1查SQLite正式成员。
- 非agentMode的`StrategyEntries.apply`虽然有readFileSync，但先调用`knowledgeFile`，`runtime-paths.ts`对strategy-entries.json重定向到绑定K1快照；正常生产knowledgeDir是`KNOWLEDGE_DIR`，因此也不读Git116副本。
- `queryKnowledgeCatalog`递归枚举函数没有agent/src的调用者；不能因函数可扫描目录就称生产脑实际走该入口。明确自定义研究/fixture目录仍可读其自有文件，属于原隔离合同，不是生产回退。
- 上述6个相关运行源叶逐字节核与LIVE相同。最新读取的run-config（ts=2026-10-31T06:08:53.388Z，局QE18E5JXBUZB）绑定`K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`；前次正式只读回执确认该版173条且release_entries=173。运行源码code字段有既存ENOBUFS/未知，未拿它冒源码身份，另外逐叶核对支持上述调用链结论。

该结论不等于173条全部已经自然查询/采用；本轮不需要把策略内容重写或把Git116导入库。第1批补固定回归证明绑定K1的策略路径不读取旧Git副本，缺绑定库/版明确失败，不新增静默fallback。

## 17:49 CST 只读复核

最新原 run-config 为局 `48LJUVW34AHT`（17:47:53 CST），仍绑定原 `K1-753af285…`。
六个运行读者源叶再次与 LIVE 逐字节核同；按该局绑定版查询正式库，策略正文173条、
release_entries173，Git/LIVE仍各116且SHA不同。材料 `batch-a1-k1-reader-recheck.json`。
结论仍是未发现正常生产已绑定K1读者回落116；没有声称173条均已自然采用。
可选Claude MCP环境分支缺口已在本步修复并用私有子进程回归，不据此反推现网曾走该分支。
首步ETA因最终检查更正至18:15 CST，见86/6541810442；原18:00记录保留。
