# #36 原生前缀补交核验：退回一项 P1

核 `6a5d049f043d7c530a13850a0fde915ccddea25b` 与 `76b41d6d7ef4df6a2423210eb4a2780a686ed159` 两枚差量，远端原分支精确核同末枚。当前实际 live 仍为 R416 `3849fcb8a35940315422f64b16fbc104a6cb8b8b`。本轮未合源码、未跑或占唯一 full、未改生产；原完整 6123 过/2 跳不覆盖本修复。发布顺序保持主管原裁决，不插队。

独立 tsc 0；定向 9 文件/112 项通过（Python 23 项已由包装入口包含，不重复加算）。2597 枚举受测输入前后逐 SHA 相同。nice 19、单 worker、无文件并行。原测试绿不能覆盖新增固定反例的失败。

## P1：前缀之前的工具/助手输出会被漏掉

`learner/lib/herdr.ts:158` 与 `ops/learner_tui.py:106` 只在已有 pending/confirmed prelude 时拒绝提示前的助手/工具活动。在同一已开始、尚无提示绑定的回合，插入 `function_call`、`local_shell_call` 或 assistant message，然后才给合法两段 AGENTS/environment、同 cwd/turn 的 context、原完整提示与完成事件：三种序列的 NativeBatch 都得到 accepted=true/foreign=false/successful=true；只读对账也 accepted=true，Python 独立 verify_native 连 code=0 的重建完成证明也接受。仅把相同活动挪到前缀后，三条路径才拒绝；干净正例通过。详见 finding.json 与两份 boundary.json。

这把已存在的未绑定模型活动当成合法启动上下文之前的无害记录，违背本次交付明确的“提示前工具/助手输出仍拒绝”合同。请原 dev36 在活动派发回合的整个未绑定窗口跟踪并保留外来活动，覆盖前缀前/后、context 前/后、明确续轮提示前，不能靠随后正确 marker 清除；历史 resume 的非活动窗口继续按原边界隔离，身份/完整提示/未知用户/草稿/lease/PID/退场守卫保留。补对应 TS、独立 Python 与只读 CLI 反例后回 review。现有两个测试只在前缀与 context 之间插工具，未覆盖前缀之前。

固定复现（在含两枚交付的独立树，agent 目录中）：`nice -n 19 node --import tsx ../paper/materials/20261023-issue36-native-context-integrator/repro.ts`；Python 在仓库根执行 `nice -n 19 python3 -B paper/materials/20261023-issue36-native-context-integrator/repro.py`。均只造固定事件，不连 herdr、不操作模型或生产；输出中的 before-prelude 本应拒绝却接受，after-prelude 为拒绝对照。

## 四份真实快照的独立只读对账成立

分别核原档案及冻结 JSONL 的逐字节 SHA，再用交付 CLI 和独立 Python 纯 native 重建：四份均接受、无 foreign，session/turn/原 marker 与完整提示 SHA/前缀 SHA 与开发摘要核同；原目录 18 文件前后 SHA 相同。仅 fix 与主策略冻结快照有 task_complete；复盘与 s2 快照仍 open。这些是历史快照观察，不回填当前运行状态。fix 原档案是 submitted/无 result，另三是75；全部原 bindings 空，差异保留。

对账不验证当前 pane/PID/lease，不授权提示、退场、产物完成或 finish。四个现有模型已消费，不重送/重排/另开同任务模型；原监督与75门仍归 ops。R416实际上线及原四旧批各恢复一次的 ops 事实保留，不以本轮技术退回撤销，也不以源码修复或快照 task_complete 关闭自然验收、四批完成、学习或科学父。无新增主管裁决需求。
