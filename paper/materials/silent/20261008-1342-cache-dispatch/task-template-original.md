---
title: Roy 高优先 Codex 大脑缓存排查与修复
effort.codex: xhigh
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# 独立批次：Codex 大脑缓存

Roy 2026-10-08 13:31、13:42 manual 已授权单独高优先排查并修复 Codex 大脑缓存。你负责完整调查、固定回归、实际修复和 live 发布；运维只派发、核实及登记。这是已授权系统功能，不与普通修复、A10 回退排查、boss 校准或策略批次混用，不添加游戏知识。不得降低大脑推理强度、换模型或删除题面内容来提高命中率。

工作树 {{worktree}}；根目录 {{project_root}}；角色 {{character}}；日志只读 {{logs_dir}}；临时材料 {{scratch}}。先读 README、AGENTS、最新 STATE、decision-log 尾部、docs/learning-protocol.md、docs/learning-code-proposals.md、notes/ops-handoff.md 的 live 流程和根目录 notes/fix-queue-v4.md 最后「codex 大脑缓存几乎为零」原节。确认工作树干净，再合 {{base_branch}}；目标 {{merge}}、{{merge_dir}}。任务 frontmatter 的 xhigh 只规定学习者，生产大脑保持自己原有模型和推理强度。

## Roy 原请求与待验证线索

原请求：A10 期间 brain:codex 输入 3.29 亿 token，缓存命中只有 127 万（约 0.4%）；学习者和运维同期约 95%。logs/codex-calls.jsonl 最近各行 mode=session、reverted=true、同一 thread（例 01a119fc-33a…），每题 inputTokens 约 12.7–13.2 万、cachedInputTokens 恒为 0，单次约 14 秒。必须从实际日志重新核对这些数字及统计范围，不把观察者线索冒作已经定位的原因。

Roy 要求：
1. 查明原因：可能的方向——每题前缀是否在变（知识前缀在知识文件或 notes/lessons.md 变化时重渲染，复盘每局都改 lessons.md；前缀里有没有每题变化的内容排在不变内容之前）；会话模式 thread + revert 的用法是否让服务端每次都当成新请求；service tier / prompt_cache_key / 前缀长度上限等；用一次受控实验（同一题连问两次、固定前缀）确认缓存能不能命中。
2. 修复，让稳定的知识前缀能命中缓存（例如把每局 / 每题变化的部分放到最后、前缀只在批次边界更新、给 prompt_cache_key），不降低推理强度、不删题面内容；改动对铁甲保持等价或说明。
3. 上线后在 codex-calls / brain.jsonl 和成本统计里核对命中率，并报告前后对比（命中率、每题 token、单次耗时、额度消耗速度）。

括号中的例子是调查假设，不是指定实现；不能仅因 thread 相同/reverted=true 就断言服务端缓存失效，也不能把计数字段缺失当真实零命中。

## 调查、受控验证和修复

1. 冻结日志切点，保存原样本引用与 SHA、局号/题型/调用时间、实际源码/dirty 限制、模型/effort、session/exec、thread/revert、CLI 版本、可见 tier 和 usage。分别统计总输入、缓存输入、输出/推理 token、真实调用/成功/失败数量、wall time、费用或额度窗口变化；命中率用 sum(cachedInputTokens)/sum(inputTokens)，注明缺字段、计数是否含缓存、费用推算和窗口背景流量。学习者/运维的 95% 仅在实际同口径、模型/CLI/窗口可比时作对照。不要读登录令牌、key 或任何 .env 来补配置，使用已有安全 run-config、命令参数或日志。
2. 追溯知识渲染、system/user 消息顺序、动态问题/记忆/时间戳、schema/tool 设置、session thread 及 revert 请求。在固定夹具保存各输入段长度与摘要、首个差异偏移、渲染源变更及实际调用参数，分清每题、每局、真实知识变更、schema 切换造成的前缀差异。核对 CLI/RPC 的真实能力和 usage 提取，不凭一个未支持的 prompt_cache_key 字段就宣布修复。日志若只存聚合 token、没有实际消息或缓存细分，先明确 instrumentation 限制，再补必要的安全测量。
3. 固定离线测试不调用真实 Codex。Roy 授权的同题重复实验在隔离线程上用一份冻结的既有题面、相同原模型/effort/知识/schema、同题连问两次；与现有用法作受控比较。如沙箱无法访问真实 Codex，本条 Roy 授权已包含同题双问与最多四次基线/修复调用，不需要再次询问授权；只经已固定自测的专用受限 broker 动作，在下一次唤醒重新加载白名单后执行，不直接启动嵌套联网引擎或绕过沙箱。若需要新增 probe 动作，由本批实现并自测：固定动作名、批准的固定本仓库夹具/源码、最多一个基线双调用和一个修复双调用（总计最多四次），保留当前额度保护与超时、只用现有安全引擎入口，不接受任意命令/路径/URL/额外模型或 effort，不执行任何游戏动作、不改生产线程/config。由运维在白名单生效后触发一次；缺入口/usage/额度就保存 pending 和精确续办方法，不能伪造实验结果或把超时解释为缓存原因。报告真实命中/不命中及不确定性；两次命中只验证能力，不代表整个生产窗口已改善。
4. 依据证据修复稳定前缀或缓存会话用法，保持完整题面、最新知识刷新和题型 schema、状态/合法性检查、Codex-only 等待/失败规则、取消和预算、角色隔离。不冻结旧知识来制造好看的缓存数据，不留跨局/跨角色旧记忆污染，不向另一角色注入静默知识。铁甲的游戏行为与信息保持等价；若共用传输层调整，分别说明相同内容、模型/effort和可测等价范围。严禁以删调用/漏脑题、裁知识或降低推理强度冒充缓存修复。
5. 固定回归覆盖真正观察到的原因，以及相同题重复、动态题变化、真实知识变更应更新、题型/schema变化、角色/局隔离、revert/错误/取消、缓存字段缺失和重复计费。保存修前失败、撤去源码红/恢复原字节绿和相同夹具证据；测试不随生产知识刷新漂移，不削弱断言、测试排除名单或额度保护。只在本工作树实现代码/固定测试，不顺便修策略和游戏模型。

## 前后报告与发布

阶段报告及时写 {{scratch}}/report.md 和 report.json，保留原始实验与失败日志。前后表分别列原日志窗口、隔离实验、实际上线后生产窗口：样本局/题数、模型/effort、缓存命中率、输入/缓存/输出、每题 token、耗时分布、费用与可测额度消耗速度，注明不能归因的背景消耗、窗口/样本限制和回退方法。生产数据尚未产生时填待观察而非预测结果；给运维一条可在后续已完成事件执行的取样/统计指令，不轮询或等待新对局。

仅在分配工作树与 {{scratch}} 写实现、测试及报告；根目录报告和通知属于本任务授权记录例外。最终报告追加到根目录 paper/materials/silent/codex-brain-cache-2026-10-08.md（已有则保留原文和历史）；先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加 Roy 的实际结论、原因证据、旧/新传输行为、真实前后结果或测量限制、预期影响和回退方法，不覆盖并行记录。纯缓存传输不创建游戏机制账本或经验条目；最终 code_proposals 可为空字符串数组，implementation_domains 只列实际涉及范围，纯工具可空。若发现独立游戏问题，仅保留证据交原提案流程，本批不实现。

不读游戏包/key/.env，不改 hooks/config/运维 prompt，不装依赖、不推送、不运行 play、不停对局或调度、不改生产配置，不启动子学习者。后台每项 nice、最多四进程。每次代码提交前在 agent/ 运行原 bash tools/test-sandbox.sh（含 tsc），PATH 加 ~/.local/node/bin，TMPDIR 指向 scratch，SANDBOX_WORKERS≤4；涉及 Python/调度的固定测试也要通过。全局 Git 身份，提交前 gitleaks，提交末尾带实际引擎/模型 Co-Authored-By。

自测通过按项目 live 流程自行合入，不另设审核：根目录 ops/live-merge.lock 内核实最新 live、无在途刷新，保存所有刷新及新增知识文件，预检重叠并记合前 SHA，仅合本批已测源码；合后原沙箱通过再登记唯一行为发布及 decision-log（先 date）。仅派发、probe 工具或报告且未改对局行为，不造游戏版本；实际大脑调用行为修复按实际发布登记。失败保留原检查，只撤本批代码并保留刷新；提交/合入受阻交运维兜底，不改原失败回报。

最终使用 fix-batch 完成 JSON，task=fix-batch、fixes.item=codex-brain-cache（独立功能，不当普通 bug 队列）：base、逐源码 commit、test、经实际验证的 fails_without_fix、skipped、实际 merged/null、tests 实际 tsc/vitest/files/cases、source/实际合入/发布/固定树/版本与报告/原日志路径。必须带 code_proposals（CLI id 字符串数组）及 implementation_domains 字符串数组；没执行的检查不能填 0，没上线不能标 implemented/shipped。真实原因与前后实验不足就清楚回报 pending/unknown，保留可复验依据。
