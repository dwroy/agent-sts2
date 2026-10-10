

<!-- codex-brain-cache delivery 2026-10-08T15:05:30+08:00; prior text retained -->
# Codex 大脑缓存独立批次（阶段报告）

2026-10-08 14:21 CST。授权：Roy 2026-10-08 13:31、13:42。工作树 codex-brain-cache；基线 a9e9586338be9c74842fc535bdc31c6478c9cb91，开工干净，合 main 已是最新。不添加游戏知识、机制账本或策略提案。

已定位的实际缺陷是统计解析：`eval/cost.py:tokens` 读取 exec 的 `cached_input_tokens`，漏读 session 的 `cachedInputTokens`、`cacheWriteInputTokens`、`reasoningOutputTokens`。因此 session 的真实缓存与推理被记为零。原日志没有被修改；原成本 CSV 和原请求保留。运行时缓存接近零的总体前提不成立，剩余冷缓存原因尚未定位，不能声称修复传输或提高了缓存效率。

同一冻结切点、同一批调用：旧解析输入 339,269,444 / 缓存 1,266,176（0.3732%）；正确解析输入 339,269,444 / 缓存 180,677,504（53.2549%）。这些是历史数据重新解释，非上线效果。Roy 的 329M 窗口没有给定原字节切点，未冒称精确复现；当前原成本 CSV 的 A10/brain:codex 是 333,095,568 / 1,266,176，85 行、2,636 次调用。其输入也漏掉了当时 CSV 切点后的调用和未结束局的进阶归属；本报告按 run-config 纳入进行中 A10 局，另列口径。

| 窗口 | 局 / 物理调用 / 题 | 模型 / effort | 输入 / 缓存 / 输出 / 推理 | 命中率 | 有字段样本平均输入 | 耗时中位 / P90 |
|---|---|---|---|---|---|---|
| 冻结 A10 全部（2026-10-05T20:55:02.804Z—2026-10-08T06:02:35.600Z） | 86 / 2,680 / 2,666 | gpt-6.1-sol / high | 339,269,444 / 180,677,504 / 747,216 / 520,896 | 53.2549% | 127,257.86 | 11.702 / 24.810 秒 |
| 上述 session 子集 | 86 / 2,366 / 2,363 | 相同 | 299,733,970 / 179,411,328 / 662,263 / 462,138 | 59.8569% | 127,437.91 | 11.6015 / 25.078 秒 |
| 上述早期 exec 子集 | 10 / 314 / 314 | 相同 | 39,535,474 / 1,266,176 / 84,953 / 58,758 | 3.2026% | 125,909.15 | 12.466 / 22.411 秒 |
| 冻结最近 100 次 | 4 / 100 / 100 | 相同 | 13,309,236 / 8,013,824 / 25,969 / 17,427 | 60.2125% | 133,092.36 | 11.516 / 24.377 秒 |
| 隔离同题双问 | 待 broker；执行 0 次 | 固定同模型 / high | 待测 | 待测 | 待测 | 待测 |
| 实际发布后新生产窗口 | 待观察 | 保持原模型 / effort | 待观察 | 待观察 | 待观察 | 待观察 |

2,680 次中 answered 2,666、error 11、stalled 2、failed 1。2,666 次同时有输入/缓存计数，14 次缺失，缺失为未知；全体已知样本 1,107 次真实零缓存，其中 session 804、exec 303。总物理耗时 37,892,505 ms，使用 `ms` 而非对累计 `call_ms` 求和。输入含缓存，输出含推理；例如 H1T1F8ML9FUE rest/plan，151,051 输入 + 519 输出 = totalTokens 151,570，缓存 121,728、推理 282 都是子集，不重复加总。失败调用的缺失计数不据成功回答补造。

早期 11 个 session error 明确记录 `config.toml: approvals_reviewer; config.toml: model_context_window` 隔离检查失败；其后同题走 exec。该历史原因解释当时传输模式切换，不解释当前 session 冷缓存。本批未改 config 或放松隔离检查。CLI 按每次调用之前最近的启动配置关联：0.160.0 session 663 / exec 314，0.160.1 session 1,190，0.161.0 session 513。初版按局末配置关联造成 40 个源码归属差异，已修正到启动时序，原中间材料保留在 original-last-config-join.jsonl / config-join-correction.json。

本次核实的现行请求顺序是 `thread/start.baseInstructions=完整 system`，`turn/start.input=[完整 user]`，schema 是单独 `outputSchema`；模型、effort 和 summary 是独立参数。题目、状态和本局记忆在知识之后。system 内头部进阶固定，整份知识固定分块排序，数据版本在经验/药水表之后。文件或 postmortem loader 变更时重渲染；只有渲染后 system SHA 变化才换线程，并不每题换前缀。每次回答后依旧 `thread/revert.beforeTurnId`，出错/取消/回退逻辑保持。

直接反例：同线程 H1T1F8ML9FUE，system_sha=4ede9002f9df，2026-10-08T05:58:18.217Z event/choose 缓存 0；05:58:35.307Z 下一次 event/choose 缓存 121,472；其后 reward/card、shop/plan、rest/plan 连续非零。两次都 reverted=true。因此线程相同和 reverted=true 不能证明缓存失效。这是生产观察，并非本批授权隔离实验的结果。

session 相邻同线程、同 system 的同 label 样本：449 次、80.1095% 命中，56 次零；变 label：1,783 个已知计数样本、58.6894%，628 次零；新线程首题 120 个已知样本均零。label 不等同 schema；这只是关联，不能作为 schema 导致冷缓存的因果证据。9 个错误行缺 brain SHA，不把缺失当真前缀变化。

0.161.0 CLI 仅执行了离线 `--version`、`app-server --help`、`generate-ts --experimental`，原协议绑定与生成日志保留（.protocol-snapshot）。ThreadStartParams / TurnStartParams 支持 serviceTier；均无 prompt_cache_key 公开参数。本批不传未支持字段，不推断服务器路由、缓存长度上限或服务端的实际消息序列。现行 run-config tier=null（默认）、summary=auto、schema_fields=used、route_reason=drop、route_pattern=true、max_field_chars=600。日志只有 system/prefix 摘要和 usage，没有历史完整 system 或后端序列化请求；历史 dirty 知识完整树未留存，因此不能以当前渲染假装旧请求字节重放。

已实现待发布的改动：

- 成本统一读取 camelCase / snake_case 的缓存、写入和推理；CSV 加已观测输入/缓存子集及缺字段标志，比例只对成对计数求和。Trace 与 brain 同题不重复加调用次数和 wall time；重试逐物理调用使用 ms。原费用模型保持，历史输出不覆盖。
- codex-calls 增加 `cache_request`：完整 instructions/user/schema 的 SHA256、UTF-8 字节数、字符数、同角色同局相邻输入第一差异字节，以及可见 tier。不记录正文、不改变 RPC 输入、不冻结生产知识，换角色或换局不比较旧记忆。
- 固定受限 broker 动作 `codex-brain-cache-probe`，无参数；校验已测 agent 树、runner 摘要、固定夹具摘要。只使用原 CodexEngine 安全入口、隔离线程/目录、gpt-6.1-sol/high、相同知识/题面/schema，usage required=on、stop=80%，每题检查额度；20 分钟取消、broker 21 分钟超时。持久 wx 预约保证最多一次双问，物理调用总预算 2（包括错误/重试/回退），不执行游戏动作、不改生产配置或线程。无新增修复 pair；将来若有真正传输修复可按原授权另做剩余最多 2 次，但本工具不能任意改模型/effort/路径/URL。
- `eval/codex_cache.py` 在后续已完成事件取一次安全日志切点，按 role/A10、mode/model/effort/thread/system/schema/tier 分组；缺 usage 和 brain 交叉计数不匹配明确保留。

冻结夹具来自 H1T1F8ML9FUE rest/plan，question_id=muz3irrn-52312-46。完整 user 76,090 bytes / 53,642 chars；当前完整 Silent system 307,347 bytes / 160,774 chars；schema 266 bytes。夹具 SHA256=6c84bfef4438bc164d75901fcf88d6e08aadc2efd9ad64dfbab1f1634257bc98。各知识段长度/SHA、来源文件 SHA 在 probe-fixture.json / probe-freeze.log；system 和 user 摘要分别 da2a756d914208ddb6b69882d7e3c9f975d839fc3efe0568c4b0d86af8811ea6 / 812b2ec48ee78e159d96658ec063bdb6077698a467eb05913e08aa02f7913448。这是冻结当前知识 + 既有完整题面，历史 system 不可复原，不声称历史完全等字节；两次 probe 内输入必须等字节。

铁甲的传输、信息、模型/effort和决策保持等价。新摘要测量只观察；物理预算只由受限 probe 显式设置，生产无上限分支保持原逻辑。新固定测试以合成文本验证角色/局隔离，未读铁甲知识或向其注入 Silent 信息。本批 code_proposals=[]、implementation_domains=[]。

固定检查：cost 源码撤去 2 红 / 原字节恢复 8 绿（后来增加快照测试为 9 绿）；新增 3 个 TS 文件 10 例定向通过。第一次原沙箱 tsc 通过、vitest 249 文件 / 2,601 过 / 3 失败：两个是扩展 Python 用例后 wrapper 仍要求 6 个的计数契约，一个是临时 CLI 生成协议绑定被源码 import 检查扫描。wrapper 更新为精确 9 个；协议原字节作为测量材料放 .protocol-snapshot，源码断言/排除名单不改。另一次从仓库根使用 --root agent 运行 wrapper 时 cwd 错误造成 2 失败，原日志保留；正式入口始终在 agent/。最终固定源码原沙箱进行中，未宣告通过。完整外部检查未执行。

费用与额度：ChatGPT 为共享订阅，token 不是逐次现金账单。原费用估算按包含缓存的总 token 分摊，字段修正不产生实测现金节省。窗口采样分别为重置 10-11T07:07:58Z 的 61→100（323 样本），重置 10-13T23:50:54Z 的 0→7（43），重置 10-14T03:28:43Z 的 0→42（318）；另有相差 1 秒 reset 的单条样本保留不强并。不同重置窗不能相加。学习者、运维、后台流量和可能的账户切换未分离，脑调用额度消耗速度及修后变化均未知。没有可比 CLI/模型/窗口的学习者/运维冻结样本，95% 不作同口径对照。

发布与受控实验目前 pending。现有 broker `procs` 请求在 15 秒内无回复，exit124，说明本次无可用唤醒 broker；沙箱 PID 名字空间看不到后台知识刷新，且源码证明刷新脚本未持有 live-merge.lock。不能仅取锁就宣称无在途刷新。未修改 live、未提交其刷新数据、未建游戏版本。合入前必须由可见外部进程的一方核实，再在锁内保存全部刷新及新增知识文件、预检重叠、记合前 SHA，仅 cherry-pick 本批已测源码，原沙箱合后通过后登记。无实际对局行为变化，本批不造 eval 游戏版本。

运维续办（下一次既有完成事件/唤醒，勿轮询新对局）：先从最终 report.json 取不可变源码提交；核实际 HEAD/无在途 report.py、refresh.sh/build-*；非阻塞取得根 ops/live-merge.lock，保留全部 live 刷新、新增知识、双方记录，按上述源码净路径集成及合后原入口自测。root/main 集成新的 broker 白名单后必须下一次唤醒重新加载；再执行且只执行一次 `bash ops/codex-ops-do.sh codex-brain-cache-probe`。若已存在 probe-reserved.json，不再重跑；核 probe-codex-calls 的真实 raw usage 与结果，缺字段为未知。随后在一个已完成事件运行：`nice -n 19 python3 eval/codex_cache.py --logs /home/dw/Projects/agent-sts2/logs --after <实际发布UTC切点> --out learner/runs/20261008-140043-codex-brain-cache/production-after.json`，同时按新 cost.py 刷新成本表的正常归档流程；不等待新局，不把两次 probe 命中当整体窗口改善。

回退：只逆向本批源码提交，保留知识刷新和所有报告/失败原件；不会变更游戏知识或生产配置。统计回退会恢复已证实的漏计，应明确注明。若未来证明需要传输修复，追加证据/受控对比再实现，不覆盖本报告历史。

原始证据：baseline.json 的每个日志路径、字节切点、整体 SHA；frozen-a10-calls.jsonl 每行的原 codex-calls 字节偏移及原行 SHA；frozen-question.json、frozen-run-config.json、frozen-quota.jsonl；original-cost-a10.json；reconciled.json；红绿 / 首次失败 / 最终自测日志。第一次分析因 tuple JSON key 序列化报错已更正，初版统计只认 camelCase 后由 reconcile.py 统一两种字段，未把初版 328 缺字段数当真实缺失数。

## 2026-10-08 14:40 CST 阶段更新（保留上述原阶段）

首批源码 f602fa22ded02adf1ad32aac2d2f664c4ea286e4，原入口 source/live 均 tsc0、vitest0，251 文件/2,618 例。14:29:50 锁内已有 broker procs 真实返回 0，无 report.py/knowledge builders/refresh.sh；最新 live 45801fcc56b7c0614f074ad0e84ce90650d23082 的知识已提交，另保留 notes/fight-value-backtest-silent.md 原 SHA，刷新提交 c2fab73dfe84d9f01fbba35f1bd05f8dd70c0927；预检重叠空/apply0，仅净13源码/固定测试路径集成到 bea18dc71a6f781e837644c7b98c385d0f62d066，固定树9d0ca941472e43252060c7828d03c130ff903306。全部知识 Git blob清单在 publication.json，合前/后相同。main 已机械集成 ca625c25eda018b794783729a48275b318c49ad5。无对局调用语义改变，不造游戏版本。

调用数量进一步分开：2,680 为 trace 尝试，其中 11 次隔离前检报错（合计2,192 ms），没有发出模型题；2355个session turn_id + 314个实际exec = 2,669个可核实模型调用，回答2,666、stalled2、failed1。表中的2,680“物理调用”应据此读为trace尝试，token和缓存比率不受这个计数修正影响。新取样工具的physical_calls是trace尝试计数；交付时同时核turn_id/exec outcome，不能把前检算作已发脑题。

probe 未调用。收尾补强：原始usage缺输入/缓存时保持pending/unknown，已预约的pair在读额度前拒绝重复执行；每次结果独立wx文件落盘，canonical首次结果不覆盖。该小补丁仍在原自测，不宣告其live完成。源f602与cherry-pick实际be映射已有净13blob/固定树证据；另一次非阻塞祖先登记锁busy未改live，原失败保留。

发布后取样必须选“新进程run-config已含本批源码、codex-calls已带cache_request”的范围。当前进程在发布前已加载代码，发布时间之后的旧进程调用也只归旧窗口；先核新process/commit与已测源码blob，再以该新进程run-config.ts作为--after，并查看按上下文分组，不能只按文件修改时间认定上线效果。

## 2026-10-08T15:05:30+08:00 交付记录（保留各阶段原件）

已实际发布的是统计/测量源码 f602fa22ded02adf1ad32aac2d2f664c4ea286e4 → live bea18dc71a6f781e837644c7b98c385d0f62d066，合后原入口 tsc0/vitest0、251文件2618例，固定树 9d0ca941472e43252060c7828d03c130ff903306；知识/并行代码保存证据见 publication.json。main 机械合入 ca625c25eda018b794783729a48275b318c49ad5。RPC 题面、instructions、schema、顺序、thread/revert、模型/effort和生产额度规则逐原行为保持，不是缓存传输优化，不建游戏版本。

后续 probe 防护源码 76508f8aed6fbcf3cd43e1cf2f2fda78d0c5eaa9（最终agent树1f30b1faaf55e985640f30e08e64c1d5b8496313，runner SHA f4010706221a81836775621518920fe3e43d6e00751e22e6fb0fe19d65bde20c）工作树已原入口 tsc0/vitest0、251文件2621例；原脚本/断言/排除名单未变。恢复原10分钟每题取消后，撤去该源码的定向用例实际超时失败1例，原字节恢复通过1例（另5例只是过滤未执行）；固定SHA相同，probe-timeout-*.log/json保留。该测试超时是离线模拟取消回归，与服务器缓存无关。

此防护补丁尚未合入：14:54和14:58两次非阻塞锁内现有broker均核实 report.py 仍在运行，未修改live；第一尝试全文在 followup-attempt-1454，第二在 publication-followup.json / followup-merge-lock-procs.log。main索引为并行复盘记录占用（HEAD 00e7bbe55941daaff1f657ded6c6df0a45793f40），未清空、暂存或提交他人的记录。按授权交运维兜底，不冒记source2已上线，也未执行任何真实隔离probe。首批源cherry-pick映射已核净13blob；字面祖先登记的锁busy历史在source-ancestry.json，没有将源伪记为live祖先。

已产生一个新进程样本，单次冻结，不轮询：9DAS5L8YM1CN，PID224333，startup 2026-10-08T06:58:26.265Z、启动commit7f0c04dd5114d2f8152da1fb8cb6c5f45e1c478e，13源码/测试/工具blob与首批源相同，dirty清单只有刷新知识；CLI0.161.0、gpt-6.1-sol/high、session、tier默认。首4题全部answered且带cache_request，完整instructions摘要均相同，user/schema首差异有实际记录。

| 实际上线后切点 | 局/题/调用 | 输入/缓存/输出/推理 | 命中率 | 每题输入 | 耗时 | 费用/额度速度 |
|---|---|---|---|---|---|---|
| 9DAS5L8YM1CN 前4题，06:58:55.721Z—07:00:18.805Z | 1进行中/4/4 | 511947/120704/1368/931 | 23.5774% | 127986.75 | 中位17.8315秒，范围10.482—25.482秒，合71.627秒 | 未知，共享订阅背景未分离 |

三题真实零、一题cache120704且reverted=true；input含cache/output含reasoning，不能另相加。原始行偏移/SHA、startup原config和全日志切点/SHA见production-initial-raw.json / production-initial-source.json / production-initial.json。brain交叉缓存计数不匹配 0 行。此窗口是冷启动、不同题型、仍在进行中的4题，不是同题实验或整体缓存改善；不能与86局历史差值归因于修复。小样本不解释P90；取样器floor分位定义保留原值。更长的已完成事件窗口仍待测，不预测省额度或耗时。

精确续办：运维在已有完成事件处理且并行索引已释放后，仅集成source2的3路径（ops/codex-brain-cache-probe.ts、ops/codex-ops-actions.sh、agent/tests/codex-cache-probe.test.ts）到main/live；live锁内必须先通过已有broker核实无在途report/refresh/builders，保存全部刷新与新增文件、记最新SHA、预检无重叠，原入口合后自测通过。必要的源祖先登记只在所有净源码blob匹配且已测树不变时做，保留最新知识。当前不改原blocked回报。next wake加载main的新白名单/最终固定摘要后，仅触发一次 `bash ops/codex-ops-do.sh codex-brain-cache-probe`；无参数，永久预约限制2物理调用、每题10分钟/总20分钟、usage required/80%原保护；已有probe-reserved.json不得重跑。保存安全CLI版本、raw usage与结果；缺字段/额度不足/取消是pending或unknown，不能说命中为0或归因缓存。新增修复双问尚未实现，全部实际真实probe调用0。

后续已完成事件只执行一次：`nice -n 19 python3 eval/codex_cache.py --logs /home/dw/Projects/agent-sts2/logs --after 2026-10-08T06:58:26.265Z --out /home/dw/Projects/agent-sts2/.worktrees/codex-brain-cache/learner/runs/20261008-140043-codex-brain-cache/production-after-completed.json`。新进程已验证，但按by_request_context核实际源码、知识/schema差异与是否跨进程；此工具physical_calls字段实际是trace尝试，须排除无turn_id的前检错误再数发模型调用。成本表由新cost.py沿既有归档流程刷新，不覆盖原CSV。只读取当时已有完成切点，不轮询或等新局。完整外部检查尚未执行，由调度器按正常完成事件补跑，不把其他批次外部通过冒作本批通过。

回退：仅逆向本批实际源码cherry-pick（当前live为bea18dc7，source2尚未上线；如后续合入则先撤source2再撤首批），保留所有知识刷新、经验、报告、失败/blocked与并行记录；祖先元数据合并不作代码回退。成本回退将恢复已证实的漏计。无游戏机制账本/经验，code_proposals=[]、implementation_domains=[]。

## 2026-10-08 15:28 运维核实 Codex 缓存批次及隔离实验续办

已核实原统计修复bea18dc71a6f781e837644c7b98c385d0f62d066实际合live/main。同冻结86局339269444输入/180677504缓存，旧0.3732%纠正为53.2549%；修的是session camelCase漏计和重复计数，不能声称缓存性能从0.37%提高到53%。生产传输、角色隔离及gpt-6.1-sol/high保持。首4题23.5774%原报告保留；本轮一次取样20题2647437输入/1569920缓存、59.2996%，每题132371.85输入、中位17.232秒，20题usage均可核且无前检伪调用；进行中小样本/不同题型，费用和额度改善未知。

probe防护source76508f8aed6fbcf3cd43e1cf2f2fda78d0c5eaa9兜底只合3路径，实际3119da5fc4960d9354e7550e5390864866fb05b1→祖先登记722518cdb9edfe808864da176f7e512bd820e170，固定树d25b1cc3835b19f8e50205b250c079ae060894f2，组合原入口tsc0/vitest0、251文件2621例；main f4fcd6c8e2dfd3f47d7293bb804445da980353d9/c970fefb13ff466cebe4b46d18a7cf2ab92643b0。锁内最新live cffd20db、知识刷新/并行代码/原回报保持；原source实际成为live祖先，原批完整外部learner-recheck只请求一次，正在执行，尚不冒报通过。

一次获准同题双问在知识隔离前检被拒：实验使用全局Codex home，可能加载全局AGENTS.md；模型调用0、pending，原预约/失败原件保留，不重跑原pair。已写原高优先缓存独立续办请求，修实验home/启动检查后使用独立修复pair，最多再2次且保留原总授权4次上限；普通游戏修复不混入。冷缓存原因与受控比较仍未知，不移除全局指令、不绕过隔离、不改生产配置。预期影响是准确计量与可复验测量；回退只逆向本批实际源码（先撤probe实际3119da5f，再按需撤bea18dc7），保留刷新、并行功能及失败证据。无游戏版本/知识条目。回执paper/materials/silent/20261008-1507-cache；原报告paper/materials/silent/codex-brain-cache-2026-10-08.md。

- 2026-10-08 15:38 缓存批140042最终核实：固定live722518cd/树d25b1cc3，完整外部tsc/vitest0、302文件3429过2跳；原外部日志与84项原回报/失败SHA不变，不重复补测。隔离实验仍pending/模型调用0，原永久预约保留；首次续派请求在外部检查占用期间5秒超时且未被领取，原件保留，空闲后仅重试一次成功实际派独立codex-brain-cache续批20261008-153528-fix-batch/PID271862/引擎272108/pane wJ:p8M，host alive已核。原授权最多再2物理调用/总≤4，仅修实验home与前检并复用冻结调查，不改生产、不混普通游戏修复。临时662测试缓存已移出版本控制但本地原件保留；主记录6e427e00，实际终态回执paper/materials/silent/20261008-1507-cache/closure-final.json。


## 2026-10-08 15:57 独立probe-home续办最终报告（原历史保留）

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
