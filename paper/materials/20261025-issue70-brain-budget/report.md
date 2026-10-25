# #70：预算耗尽与工具失败留证

基线 `50c720312d1c3fe0d3e43edb2b7e17a19a8d3e8d`，独立开发树 `issue-70-brain-budget-evidence`。任务及补充：#70、主管评论6399204091、原集成员在本 issue 的独核回执。本报告交工程候选，最终实际组合检查及自然发布/下一普通生产题由原集成/ops 接续。

## 原例及归因边界

从 ops `20261025-issue51-wake-recovery-ops/natural-new-K-and-brain-blocker.json` 的固定偏移读取七条 brain、17条 codex-calls 原字节，全部逐长度/SHA核同。`original-window.json` 保存原切片指针、原失败字段、三个未完成回答全文；原文件未写。`brain-budget-original.json` 固定第三题的原题/状态/选项；`brain-budget-cuts.json` 固定三次失控原文，仅供格式回归，不作为新知识。

| 证据 | 已知事实 | 不能据此声称 |
| --- | --- | --- |
| 七外层题 | 300000–300002 ms，0 accepted，attempts=0、tool_calls空 | 没有原生尝试或没有查工具 |
| 17原生尝试 | 14 aborted、3 stalled；13次没有 answer_text；7个 dynamicToolCall 完成事件 | 七次都实际返回目标知识，或新知识导致故障 |
| 三次空白失控 | 完整 choice/reason 后的初始 run_plan 尚未完成；原 cut_rejected=missing run_plan | 应放宽初始计划或接受残缺答案 |
| 单次服务延迟 | 第一题首 delta 166978 ms，查询预算结束时只输出部分计划；其他题也有无输出 | 具体服务限流根因已确定 |
| 后继 ops 429 | 来自另一请求/回合，只是独立环境线索 | 原七题曾收到相同429 |

核当前部署 `5ba38052a814bfe960e3f5429b55ddfc3251eb78` 的八个既有相关源码叶与开发基线逐字节一致，见 `deployed-baseline.json`。这保证复现针对现有实现；不是本候选已发布证明。

## 已证实问题与候选行为

1. 原 router 预算 race 写失败时尚无异步错误附带的 host.calls；Codex 的失败也没有 BrainAnswer。现在原生 start、工具输入/返回、取消与 cleanup 进入同题独立 journal，外层失败快照能读到真实尝试、完成工具和已取得回执；晚到事件追加、旧行不回填。
2. 原查询内 stall retry 会先新开线程重复同类查询，再到保留作答阶段；首次工具资料没有作为该重开线程的显式输入。知识模式改为第一次查询 stall 后直接进入现有无工具作答阶段，携带已完成的完整原返回，保持同引擎与原预算/重问上限。
3. abort 后原 ask 继续等待 turn/start、interrupt/revert/read 等控制请求，可能消耗作答保留时间。知识模式取消自己的 harness，按原TERM/KILL界限等退出后交后继；准备后的取消复核阻止晚发 turn。单题/相邻题串行结算，MCP状态局部化并撤销旧 host，避免异步旧调用占新题额度。
4. 原 server_requests 是进程累计值，后一次原生尝试看起来仍带前次工具请求；现在按 turn 切片。新工具桥记录请求/调用/线程/turn身份，去重同一次调用，错turn/冲突/未知allowlist明确拒绝，不放宽工具权限。
5. 回执除 SHA 还保原 turn_context 行，在清理前持久化到原生trace/同题journal；无法取得就标未知，不回填历史。

初始完整计划、已有计划复用、游戏合法性、严格JSON和总预算均沿原消费者。铁甲战士的知识与决策数值未改；仅通用知识 harness 的故障路径、日志与去重改善。未运行play/真实模型、未写live/STOP、未改学习侧#69、账号、联网、权限、档位、容量或他会话。

## 验证与保留失败

固定时钟测试覆盖原始三次prefix拒收、正常查询作答、180s查询+120s作答总截止、已完成工具后的外层取消、晚到工具只追加、重复/错turn、初始计划重问、旧计划省略、turn/start不应答、等待旧harness退出及旧MCP撤权。真实假app-server子进程另核取消后的PID退出；不调用真实服务。

首轮新增测试有4项失败：3项测试直接用了pickSpec，漏接生产Brain.request中的runPlanSpec校验；1项没有安装生产H1总预算，使原Codex outage wait按原合同继续。修正固定夹具接线后8/8，再扩14/14通过。首轮tsc有2项active.cancelled字面量推断错误，补显式类型后通过。它们保留为开发自测失败，不冒生产故障或抹除。

广域沙箱首轮：生产tsc通过，641文件/638过3败，5928测试过/3败，1264.58秒，原件 `sandbox.log`、`sandbox-inputs.json` 保留。三项分别是：原HEAD稀疏issue29夹具缺失；本次前置取消检查误影响历史物理探针；未改的ordinary-close子进程夹具撞原15秒时限。前者按原Git blob精确恢复，中者将检查限定到生产knowledgeAgent，后者不改源码/时限、同环境独立复验。原因未核的负载因素不冒根因。

最小负例用Vite load只替换原router/KnowledgeAgent两个固定blob，不改检出源码、不换后端；同一工具完成→取消夹具明确复现 `attempts=0, native_receipt=null, tool_calls=[]`（1项预期红，13项未运行）。输入见 `baseline-probe-inputs.json`，实际输出 `baseline-negative.log`。

另以独立Node父/子夹具核新增退出等待：首个helper扩展名误设.ts导致CJS导入首败保留；正确.mts版本在child/kill timer都unref时父进程退出13、缺退出确认标记。只对核同cmdline的本夹具PID做SIGKILL，生产及其他会话未控制。等待期间ref原child后，同一夹具退出0、确认标记存在、子PID缺席。见 `shutdown-readback.json`、对应日志及三份 `.txt` 原夹具副本；此为收尾候选自身的缺口，不回填为原七题根因。

广域沙箱之后的收尾还包括：JSON-RPC去重只在本turn生效，后继turn可复用request ID；native_status只取真正收到的原生终态，未收到则null，与本地aborted/cleanup分开。既有取消准备门仅知识模式生效，历史探针计数保持。没有重跑第二次广域/冒称最终全绿full；最终生产tsc=0、13文件184项定向全过、fork路径/导入2文件12项全过（详checks.json），实际组合full交原集成唯一入口。全部开发失败及检查范围见 `check-history.json`；最终精确叶子清单在 `delivery-leaves.json`。

## 交接

合同见 `docs/brain-budget-evidence.md`。ROOT和实际LIVE部署须一起包含九生产叶，保持原运行知识与差异；集成按实际组合核源码适用性和唯一完整检查。ops自然边界部署/编号，下一普通题按日志合同核工具、回执、计划/动作和耗时。后端速度、空白失控服务原因及胜率仍未知，不由本离线交付关闭。原科学父、失败历史及新旧知识绑定保留。

回退九生产叶到本次部署前像，保全部新增及原日志；不回退知识、抬预算或去掉守卫。本开发保原分支/树/会话，不自行complete/delete/关他会话。
