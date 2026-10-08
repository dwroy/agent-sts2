# Codex 大脑缓存续办

基线 6e427e001bf72d14bb097a75986834276724c7eb，干净工作树合 main 为 fast-forward。只修固定 probe home/前检/独立修复双问，保留上一批全部调查和失败原件。

已证实：原 runner 使用全局 ~/.codex；生产隔离 home 已在 2026-10-06 14:31 decision-log 记为 ~/.codex-brain。原预约存在，原结果因全局 AGENTS 被隔离检查拒绝；无 calls trace，原模型调用观察为 0。历史真实命中率 53.2549%，20 题生产窗口 59.2996%，均复用冻结原件；没有缓存效率提升的因果证据。

新受控实验尚未执行（pending）。最多一个新增修复 pair/2 次，原分配 2 次永久保留，总分配最多 4。物理调用将发送前持久登记，失败/取消/崩溃不退款。不改变生产题面/知识/模型/high/schema/thread/revert。费用和共享额度速度未知。

## 续办修复与固定证据

probeConfig 使用已存在的 ~/.codex-brain，不读取、复制或打印登录令牌。预约前先拒绝 AGENTS/override 或不允许的 config 项，再通过既有 CLI 模型/effort 检查和原 usage required/80% 保护。新 pair 固定在本任务 scratch；原 pair 永久保留，冻结预约/结果 SHA 任一变化或出现未知 trace 就停止。新预约记录原 2 + 修复 2 = 总分配 4；每次 session/exec 发送前写 fsync/wx 的物理尝试文件，持久两次上限不会随失败或进程重启退款。发送前记录是保守占位，未完成状态须与 raw trace 对账，不能把未发送/取消占位当成已完成调用。

完整 system/user/schema 冻结重建 SHA 均相同；模型 gpt-6.1-sol、effort high、session+revert、题面和 Silent 知识原样。revert 失败或回退传输时停止双问，缺 usage 为未知。公共引擎只增加 probe 专用可选发送前回调，生产没有配置该回调/上限，传输和铁甲信息/游戏行为保持等价。未读铁甲知识，仅用固定合成角色边界夹具。没有新增游戏版本、经验条目、机制账本或代码提案。

定向 TS 3 文件 19 例通过；Python broker/独立派发固定测试 48 例通过。撤去实际 home 修复和公共引擎记账回调后两个固定用例失败，恢复保存原字节后两个通过；测试字节 SHA 不变，red-green.json 存恢复校验。第一次定向检查有两项实现错误（错误 import、未显式关闭工具配置），日志保留；更正实现后定向检查通过，未削弱断言。broker 当前更新为固定源码/agent 树门控，不接收路径、URL、模型或 effort 参数；只离线验证过，不调用真实 Codex。原完整沙箱入口正在执行，尚未记通过。

| 窗口 | 局/题/实际模型调用 | 模型/effort | 输入/缓存/输出/推理 | 缓存率 | 每题输入 | 耗时中位/P90 | 费用与额度速度 |
|---|---|---|---|---|---|---|---|
| 原冻结 A10 | 86/2666/2669（2680 trace，11前检未发） | gpt-6.1-sol/high | 339269444/180677504/747216/520896 | 53.2549%（旧成本漏计0.3732%） | 127257.86 | 11.702/24.810秒 | 未知；共享订阅、背景未分离 |
| 原隔离基线 | 0/0/0 | 固定同模型/high | 未记录，非真实0 token | 未知；隔离前检拒绝 | 未测 | 未测 | 未知 |
| 新隔离修复 pair | 待下一wake；已调用0 | 固定同模型/high | 待测 | 待测 | 待测 | 待测 | 待测 |
| 先前统计上线后20题 | 1进行中/20/20 | 相同 | 2647437/1569920/6946/4686 | 59.2996% | 132371.85 | 17.232/25.482秒 | 未知；不同题型/冷启动小样本 |
| 本次工具发布后 | 未改生产调用行为 | 保持原值 | 不作新性能窗口 | 无因果提升结论 | 待后续正常事件 | 待后续正常事件 | 未知 |

输入含缓存，输出含推理，不重复计费。原窗口14个缺字段 trace 为未知，不作为零命中；学习者/运维95%无相同CLI/模型/窗口冻结对照。先前20题与86局不能用于证明缓存性能改善，同题两次即使命中也只验证能力。当前冷缓存原因与耗时/额度改善仍 unknown。原数据切点、行SHA、局号/题型/dirty与CLI限制复用原报告，路径/摘要见baseline.json；不覆盖旧报告或重新跑历史调查。

后续在下一次白名单加载且本次六源码已实际合main/live、工作树HEAD:agent和runner摘要仍匹配时，由运维仅执行一次：`bash ops/codex-ops-do.sh codex-brain-cache-probe`。动作无参数，使用固定旧完整题面，只建立新隔离线程/state，不接触生产线程/config/游戏动作。预约/claim已经存在时不得删除或重跑。核新scratch的probe-result/独立attempt、probe-codex-calls和probe-physical-claim-1/2；缺usage/额度/超时仍pending/unknown。

后续已完成事件只取已有日志一次，不等待新局：`nice -n 19 python3 eval/codex_cache.py --logs /home/dw/Projects/agent-sts2/logs --after 2026-10-08T06:58:26.265Z --out /home/dw/Projects/agent-sts2/.worktrees/codex-brain-cache/learner/runs/20261008-153529-codex-brain-cache/production-after-completed.json`。其physical_calls为trace尝试，另据turn_id/exec outcome排除未发前检；核brain缓存字段/成本和共享reset窗，保留背景不可归因限制。

回退只逆向本次六路径源码，保留全部知识刷新、原预约/失败与新增claim/结果历史。原成本字段修复独立已上线，不在本次回退范围。完整沙箱外检查由本批完成事件续办，当前未执行，不能标0。

## 最终交付状态（保留前述阶段）

源码 **548b53ca211231ab5f1079a16fe9ad65f62b3c6c**，完整源码树 b713cfe9957519b07f1b6705f9dff0d8ab7375a8；固定 agent 树 08dd9a59bb69317f447d770fe6207474b4c82c6f，runner SHA 094c940768dc1177166ec70bb138f4f86ced85c07865e14c4d3a13116a72e935。原入口实际 tsc0/vitest0、251 文件2627例通过；gitleaks0无泄漏。

唯一一次非阻塞 live 锁尝试 EAGAIN/busy，尚未获得锁、未查锁内刷新、未执行 cherry-pick 或合后检查；publication.json 记录 merged=null。live/main 源码未被本次发布，**不标 implemented/shipped**。只读观察 live 2b1a5f6d491f826ea1bac28f707716d109fb3e65 不作为合前已锁定 SHA；main 并行索引仍占用，未覆盖/提交他人记录。原 procs 成功只代表取样时视图，不替代合前锁内检查。

既有 learner-merge codex-brain-cache 请求退出2：固定 request-merge 仅接受 codex-dev/exp-silent，本次没有兜底事件被该动作发出；拒绝日志保留，不扩展调度范围。交 root inbox 与本批正常 fix-done 完成事件续办。真实模型实验0次、修复 pair未预约，结果pending；缓存传输原因、性能/费用/额度改善 unknown。原预约、结果、冻结夹具与原调查记录 SHA 全部保持。

运维兜底精确步骤：空闲非阻塞根live锁内重新核当前live和真实procs无report/refresh/builders，保存并登记全部刷新/新增知识、记锁内最新SHA；只cherry-pick固定548b53ca六路径（source-validation.json净路径/blob清单），不要整枝带入旧知识或本报告阶段材料。检查源blob与完整题面一致，实际合后原沙箱通过，再按相同六路径集成main并保留并行记录；纯工具无游戏版本。必要的源祖先登记仅在净源码blob匹配且已测树不变时机械做。只有完成main/live且下一wake重新加载固定动作后才执行一次codex-brain-cache-probe。固定动作要求本工作树HEAD:agent=08dd9a59bb69317f447d770fe6207474b4c82c6f和runner摘要匹配；不得随意合main移动固定实验源码。新pair使用本任务scratch，旧pair永久占位保留，总分配≤4；不删预约、不无限重试、不改home/模型/effort/题面来放行。

未执行的合后/完整外部检查均为null，无新游戏版本/游戏知识台账，code_proposals=[]、implementation_domains=[]。

续办回执勘误：上一段“请求退出2/未发出”的描述是错误地将已读源码的分支限制当作本次实际返回。真实动作退出 **124**，20秒无broker回复（fallback-request.log/.exit）；是否入队未确认，不冒称收到分支拒绝或发出事件。已有源码仅接受codex-dev/exp-silent是入口限制证据，交root inbox及正常fix-done续办；原实际超时日志保留。
