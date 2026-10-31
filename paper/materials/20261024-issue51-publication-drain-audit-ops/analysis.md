# #51 发布 drain 与学习派发核验

授权原件：6384124064，仅判断与交付改点；不扩大 #56 当前评审，不改宿主代码、账号、权限或原在途会话。

结论：等待自然终局只需要挡住下一局，不必停掉已冻结输入、独立 worktree/scratch、只产候选且 merge=no 的外部学习。#37 原九产品叶不涉及学习启动器或任务输入；该窗口整段使用全局 LLM_DRAIN，范围过大。此结论不适用于账号切换、PAUSE、未知/旧全局 drain，亦不把普通经验/修复任务当候选任务：当前 wrapper 对非 external 可设置 merge=live。是否暂停取决于实际资源/写入范围及阶段，不仅看发布文件名。

当前两道硬门是 ops/codex-ops.sh:46/231 的 paused()、ops/codex-ops-learn.py:396/669 的 account_draining()；finish 的后续派发也使用同一 Python 门。learn tick 还会运行 open_book_refresh（写 data/external/open-book 忽略层而非 live/main knowledge），并可派普通/专项任务及走公共收尾；不能整体认作候选计算。LLM_DRAIN 原本服务 llm_handoff 的全账号排空协议，直接删除判断会破坏该协议。现有 ops/run.sh 只在启动检查 drain，未发现它挡正在运行的 brain；原局确于20:19自然终局。

建议独立开发：新增显式的发布对局准入（例如 PUBLICATION_DRAIN，命名由开发统一），带 owner、PID/birth、范围、阶段、来源及独占释放凭据。自然等待阶段仅阻止下一局，原 LLM_DRAIN/ACCOUNT_DRAIN/PAUSE 语义保持。最小影响方案是保留上述 shell/Python 的全局门，发布方改用独立对局门；如选择带类型的统一 marker，才同步修改两层及所有后续入口，不能只改 paused()。修改并统一 ops/autoplay.sh、ops/run.sh、ops/codex-ops-actions.sh 的开局门与原发布事务；对学习入口采用同一作用域策略，shell/Python/finish 后续/直接 dispatch 或 write 均一致，未知范围从严。候选任务需明确 merge=no、冻结源 SHA/输入/输出位置，沿原槽位、磁盘、用量和沙箱门，不强派、不借 #56 预先扩槽。外部任务只因当前未传 merge=live 不足以充当强合同，应在原启动绑定/原生任务中核实并固定候选模式。

实际改共享源码/启动器/输入快照、入库或刷新时才短暂停相应写入与新启动：沿 learn.lock 与已有 knowledge-refresh/live-merge 锁，按统一锁序重核，不能持 live 锁再等 learn 锁；冲突保存阶段并退出重试，不持这些锁等整局；工作树 checkout 必须绑定同一已提交 base，不能在主源/知识半写状态取输入。并发学习完成允许保存报告/回执；自动合 live、共享账本/目录写入等按已有专用锁及发布合同串行。缺隔离合同的普通任务可先继续挡；不要求为了候选计算等所有活跃学习者结束。不要用 STOP 代替 drain（run.sh/llm_handoff 已注明 STOP 会取消在途 brain 请求）。

固定数据验收应覆盖：发布等待中候选派发成功而开局被挡；PAUSE/ACCOUNT_DRAIN/旧或未知 LLM_DRAIN 仍挡新任务；容量/用量/槽位拒绝不失效；finish 记账与后续准入分开；候选无 live 写入、checkout/source 一致；实际写入窗口互斥、拥有者崩溃/重入/替换不误删他人门；释放后仅原调度器自然派发。按仓库完整检查流程交集成员，不复跑本轮 #37 full，也不向 #56 当前评审塞范围。

本轮未放宽生产门禁。原 #37 worker 自行于20:19:26释放全局门，V6-R438 登记及九产品/518知识原样证据已核；原 autoplay 1245890 已自然续开7RDXHY68SMWF，未额外 start。首自然 F2/T1 Jev 请求无 open_book 字段、配对完成无 fallback/调用错误已核；只认此一次，不代全局效益。该局原 run-config 仍 ENOBUFS/commit=null，不倒填；live 九叶与进程边界另外核实。实际新学习单元尚未观察到，不报已恢复产出。主管所述每窗约损失两单元未独立测量，不当实测吞吐。
