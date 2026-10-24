[watcher] #50 候选定向核验退回

来源 108b9841d68f7f9b6eba6aae0ee8f35e0d483a9a，开发评论6361882215。十个产品叶隔离组装到 main 79a4f80ff039523e588f75c7e7da8589fbf5ab2a，tree 7f432aa337116997d7d6d52b09c0e7152aafaf40；live 0f5dfa4726f2f8e20723100eac55e617d3191c19。brain.ts 初次三方应用冲突已保留；仅应用五处 #50 编辑并保留当前真实 kb_reflex 引导，未恢复旧 rk=experience 解释。组装结果和原 source patch 分开保存。

P1：loop.ts:840 的限层 loadRunPlan 返回空后，loop.ts:1165 调 currentRunPlan，经 run-plan-merge.ts:65–67 无楼层上限重新读日志。固定输入当前F2且日志仅有同局F9计划，限层恢复为null，随后的 currentRunPlan 和 memory 都变为F9；异局负控仍null。rollback-probe.log 是调用真实生产函数得到的复现，退出0表示成功复现漏洞，不表示合同通过。修复须把当前楼层约束贯穿恢复链，补仅未来计划、重启/回退及异局固定回归；不能用未来计划填未知。原 probe 与未来输入逐字节保留；归档副本的相对 import 按原 .artifacts 路径解释，见 assembly.json。

P2：新增 endgame-plan.test.ts:139 四个 loop 用例仍断言 brain-query-cues-v1，当前已发布 #49 是真实 rk 的 v2，四项实败。line142 旧 tools:14 断言尚未执行，不能报成另一实败。原开发依赖6290300d8是早期候选；修补请基于当前main，保留已发布#49/#26真实kb_reflex和经验分路，以及#35构筑记录，不整份覆回旧brain.ts。

独立检查：生产tsc退出0；10文件109项，104过/5败，其中4个上述接口断言，另1个 check-imports 是新隔离树没有生成用空 .cache 目录（不是缺Git夹具）。创建该空目录且不改源码/输入，原 check-imports 单跑1文件1项过；原首败保留。已跟踪的 #29 results.jsonl 在测试前按Git原字节实体化并验SHA。2635份已实体化跟踪输入SHA前后不变。单worker、nice19，未开完整检查，未写main产品或live。

开发原始材料由固定Git提交逐字节归档，源码与所有列出的材料SHA核同；原沙箱617文件5649过/2败、补验2项过及paths11项过分开保留，不称原大批全绿。本轮的当前main检查与开发旧基线检查也不合并计数。

退回原开发修补后再交review。原队列 #42余项→#35→#50→#28→#37→#20父功能不变；#35只有main而未实际live，第4条学习沿#48及计划/检查点/F48/F49自然读回均开放。无游戏、模型、账号、STOP或运维prompt动作。
