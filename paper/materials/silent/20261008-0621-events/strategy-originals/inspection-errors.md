# 取证与测试初稿错误保留

以下为本会话工具输出的转录及定位，不冒称原始日志文件；代码测试原始输出保存在对应 log/rc 文件。

- 首次原帧提取误按 JSONL 顶层查 run_id，原 states 行的局号在 state.run_id，触发 `AssertionError: dict_keys(['ts', 'observed_ts', 'fingerprint', 'screen', 'session', 'state'])`。未输出其他角色数据，提取随即停止；后续按 state.run_id 验角色并保存 bullet-states.json / assigned-states.json。初步账本快照已保存，未重复添加证据。
- 首次定向测试前两个读取命令在 agent 工作目录误仍用 agent/src 路径，报 `No such file or directory`；随后的 vitest 正常执行。路径读取重做，不作为代码失败或红绿验收。
- fixed-first.log：4 失败/7 通过。一个 knownTop 控制测试使用 index=100，与固定药水槽模型索引冲突，重放实际上找到药水。改为 777；未修改生产重放协议掩盖该测试错误。另一个控制错误要求无来袭时排序保留子弹时间，当前评分能合法选择等价更短线；改为明确需要两张格挡牌的固定来袭控制。
- fixed-second.log：3 失败/8 通过。整场测试误把 TurnRecord 当成有 line 字段，实际该类型不暴露候选计划；改从现有 solveTap 保存每轮 SolverInput，验证能量、费用和封抽期限，不给生产新增只供测试的接口。
- fixed-third.log：11 通过，是早期完整固定回归。之后 source-removed.log 的 6 失败/5 通过与 source-restored.log 的 11 通过是该版红绿。
- fixed-lock-expiry.log：1 失败/10 通过。改为实际封抽帧后，最后一轮会抽回原手牌，错误地假定所有牌仍为后空翻导致期待 6 抽、实际 4；改验证真实期限、原费用和抽牌恢复，不把这种夹具假设说成游戏机制缺陷。fixed-lock-expiry-final.log：11 通过。
- fixed-final.log：加入预期抽牌适配器与新生成牌费用控制后，12 通过。最终红绿和完整沙箱必须另存后缀 final，早期失败与成功不覆盖。
- source-sandbox.log：首轮完整套件未结束时补改源码与适配器控制测试，混用了旧模型缓存和新断言，tsc0、Vitest 2586通过/1失败、入口exit1；这是本会话执行错误，不能作为固定最终源码的验收。保留原日志后，源码固定且不再修改，source-sandbox-final.log 重新跑同一入口：tsc0、主套件2587通过、paths11通过，入口exit0。
- source-removed-final.log：最终12例撤源码后5失败/7通过，exit1；source-restored-final.log 恢复后12通过，exit0。两次均未调用LLM、网络或刷新知识数据，没有覆盖早期红绿日志。

合入预检 merge-preview.txt 的记录冲突另列；没有修改或合入 live，也没有把预检失败当源码自测失败。
