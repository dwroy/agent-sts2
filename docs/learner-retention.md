# 完成验收与现场回收

#67 新的原派发合同例外：携带 `operational_runtime` 且 SQLite 真实运营回执/原报告SHA核同的纯复盘或审计，运营记录本身可作为完成证明，无源码合入/full/经验提炼前置；不冒称已入正式知识。旧批次仍沿下文原合同，混合源码仍须工程发布检查。后续原请求/研究owner、进程、身份、实例、干净树、归档与恢复门全部保持；记录入库不等于已删除工作树。接口与逐入口范围见 [运营学习 runtime](learning-runtime.md)。

Roy 2026-10-13 要求：学习入库后回收过程遗留数据。原调度器的 learn tick 和完整检查结束时启动一个 `nice 19` 回收进程，每轮最多处理四批；不新增定时器，不启动模型，不改变对局或学习者权限。

所有学习任务成功退出并完成原批次登记后，启动器释放该 checkout 的租约，自动提交本批回收请求到 `retention/requests/<batch>.json`。回收器优先处理这些请求，再处理历史积压；退出只是申请，仍须实际入库、完整检查及无活动 owner 才能删除。不依赖模型手动删文件，也不需要 ops 手动派清理。专门研究、进阶验收和有父要求的任务也登记请求，但未完成的接续和入库门禁继续暂缓，记录实际原因。

实际源码发布必须已进入本实例的 main/live，原完整检查通过且原日志有完成摘要，才清理成功批次。复盘须先进入已完整检查的本角色经验库；仅有复盘、报告或进程退出不算入库。带原线程接续/研究要求、运行中、未发布、缺检查、失败退出、lost、rejected、未解决审计及脏工作树都保留。历史 merged=null/state=failed 但 rc=0 的兜底批次只在实际源码和后补完整检查都已验证时可回收；其原失败状态不改。

入库批次的 scratch 先压缩到本实例 `ops/codex-ops/retention/archives/<batch>.tar.gz`，逐文件核 SHA256 并读回压缩包，写持久清单后才删除原过程副本。小型报告、提案、JSON 清单和分析脚本仍留在原路径；完整过程材料可按批次恢复。归档不提交 Git，避免再被每个工作树复制。原对局 logs/data、经验库、账本、源码提交和分支、原生会话及 learner 事件流、out/err/完整检查原件不删。

独立且干净的已完成普通修复/策略工作树同时回收整个 checkout，分支保留。报告型批次没有入库结论时，只回收可由 Git 重建的 checkout，所有待证 scratch 原字节保留；不关闭提案或量化父项。共享 exp 和主检出不移除，只按已绑定的已入库 scratch 回收。原 request/thread 工作树保持，包含已完成但以后可增加 revision 的请求。租约、进程 cwd、实例根、路径与软链接边界在删除前复核；不读取凭据文件或跟随依赖软链接。

```bash
nice -n 19 python3 ops/learner_retention.py plan --limit 4
nice -n 19 python3 ops/learner_retention.py sweep --apply --limit 4
nice -n 19 python3 ops/learner_retention.py restore --batch <准确批次号>
```

`plan` 不删除。`last-sweep.json` 记录实际回收和保留原因，每批清单记录归档、校验、分支及空间变化。中断的归档不会自动重复删除；可显式恢复后核查。恢复拒绝被改动的现存证据、被移动的原分支、篡改的归档和运行中的 owner；独立工作树会恢复原分支 checkout。`CODEX_OPS_RETENTION=off` 可暂停自动回收，已保存的分支和归档仍保留。

独立实例手动执行时，先用本实例的 `ops/paths.sh` 恢复环境，再显式核对 `--root`、`--state-dir` 和 `STS2_LIVE`。储君实例的集成根与实际运行目录同为 `.worktrees/regent-climb`；回收完成回执只证明这个实例中的实际集成/部署，不代表中央 `main` 分支已发布，也不能借用其他 space 的发布证明。旧的暂缓记录保留，由新的完成回执接续。

每轮上限只计算可回收的批次。仍待入库、仅保留过程材料的报告不占这四个名额，避免较新的待证报告阻塞更早已完成的批次。

## 运维、开发工作树和可重建缓存

同一回收进程会使用每轮剩余名额回收已发布且无活动进程的独立运维和开发工作树，总上限仍为四个（即使传入更大的 limit 也截到四个）。旧 `ops-*` 工作树须干净、至少闲置一小时、HEAD 已进入本实例 main 且来源分支引用仍在，没有原请求或学习 owner 占用。任务相对原分配基线的可执行代码和知识改动仍须实际进入 live；纯报告、研究、文档不要求整个 HEAD 进入 live。无原分配回执时保守使用 source 与 live 的共同祖先，不能因 source 已在 main 就把待发源码当成空改动。新分配的运维工作树不能以初始 HEAD 已存在于 main 为由删除。Roy 10-24（#20）授权回收任务自理：仅当 HEAD 已不同于原分配基线、源码实际满足原 main/live 发布门及 owner/进程/干净/归档等检查时，回收器自行结算，证据进入原归档 proof；其余情况仍需下面的完成回执或继续保留。live、exp、角色常驻实例、运行中、未提交、未发布、被锁定或有未完成要求的工作树始终保留。

开发或运维完成一个功能时，先跑项目要求的检查并实际合入 main；要部署的源码还须合入 live，然后登记原源码和实际 main/live 提交。live SHA 对纯材料也记录为运行上下文，但不要求包含该材料提交。程序逐项比对原源码与发布树的执行代码、校验文件和知识叶子的 Git 对象，允许保留来源分支的精确叶子集成；发布提交是原源码的后代时，允许后续发布继续演进。Roy/Claude 10-24（#20 评论6381379788）补核：精确叶子被后续发布演进或按授权回退时，当前叶子不相同不代表从未发布。原门先保留源码祖先/当前叶子核验；历史采用仅在原 allocator 回执存在各通道独立快照时启用。allocator 完成创建、校验工具/干净状态后、返回并允许任务启动前，在原 allocation 回执的 `publication_boundaries` 可选字段保存实际 integration-root HEAD 与本实例注册 live HEAD（含 root/工作树绑定）；live 缺席不推算。resume 保留原快照，不用当前值覆盖。回收器证明各自快照在对应发布提交的 first-parent 链上，只查快照之后、严格不含快照本身的原叶子；窄集成保留同文件其他修改时，仅接受完整逐文件补丁的 `git patch-id --verbatim` 一致（空白、路径、模式及上下文仍参与比较，不做模糊 hunk 匹配）。每个通道单列见证 commit、种类，补丁见证另记 parent/patch_id；不能用 main 代 live、丢弃旁支或分配前旧状态充数。#20 核验6381989248发现旧候选的 `published ^allocation-base` 对分叉live无效，该候选已退回；不能仅靠提交时间戳排除。旧 allocation 没有独立快照时，历史采用返回无法证明并保留；不改写原回执、补造边界或沿用旧三树可通过结论。当前整叶/来源祖先仍按原合同核验。最多查每叶每通道256个发布变更，超界仍保留为未知，不冒未发布或放行。二进制仅接受原叶子/源码祖先证明；测试文件仍须真实 live 采用。原请求的未完成范围不能被这个工作树回执关闭。登记后原调度 tick 自动清理，手动 sweep 也经过同一门禁：

```bash
nice -n 19 python3 ops/worktree_retention.py complete --workspace <工作树名> \
  --source <原源码完整SHA> --main-commit <实际main提交SHA> --live-commit <实际live提交SHA>
nice -n 19 python3 ops/worktree_retention.py plan --limit 4
nice -n 19 python3 ops/worktree_retention.py restore --workspace <工作树名>
```

唯一的忽略文件先归档、逐文件 SHA 校验并读回，原路径保留报告及原始 jsonl/out/err/log，体积大的过程副本可以恢复。只丢弃可重建的 Python 字节码、TypeScript 构建缓存及 checkout 副本；保留源分支。依赖、logs/data 只接受指向本实例原目录的已知软链接，绝不跟随删除共享目标。凭据名、陌生链接和未知文件暂缓。中断在删除前可重用原校验归档，删除后可重新投影原证据；修改过或新增的证据不会被恢复覆盖。结果在 `retention/last-worktree-sweep.json` 和 `retention/worktree-archives/` 持久记录。

`ops/instance-binding.json` 是忽略的运行身份，不随 Git 分配新树。历史受跟踪副本仅在与 HEAD、独立登记的主运行根绑定逐字节相同、主控制会话和宿主进程已核实、候选无本地范围/控制租约或活动进程时排除。未跟踪、改动、冲突、未知身份及常驻实例继续保留。实际绑定停止跟踪时，集成员和 ops 必须先备份各自运行根的绑定，合并后恢复并核对；不得把删除提交直接合到运行根后留下缺失文件。见 [#23 绑定保护及部署步骤](../paper/materials/20261021-issue-23-reclaim-gates/handoff.md)。

## 新工作树的分配

### 等待证据的提案先聚合，再分配（#46）

普通策略提案及二组仍各用独立工作树、原批次 scratch 和租约。自动重审 `waiting` 提案时，每个角色在原 `learn.lock` 内登记一个复核轮次：相较上轮派发时原 `finished_count` 计数新增 10 局，或已过 6 小时，才准入下一轮；每轮最多两批、每批仍最多 10 个提案。每项还须满足原 `count > seen_runs` 条件，无新局不能仅靠时钟反复派发。按最后处置时间从旧到新轮转，保持失败候选与历史处置。首次安装无轮次记录时允许一轮，启动成功取得 PID 后才消耗名额；后续启动或模型失败保留原失败及重试规则，并占用该轮名额。

新 `pending` 提案、补链、显式 ops 请求、原线程接续、经验更新、修复、复盘与专门学习不经过这个等待门。两组不混用树，不能以“上次无源码”推定本次只读。原门已到但槽位忙或原重试门未到时不消耗新轮次；计数或时钟倒退保留准入。等待轮次保存在原 `learn.json.proposal_rechecks.<character>`，不修改提案账本的 waiting/seen_runs，不把延期当完成；复核 eligible 不代表已投递。旧 waiting 积压可能跨日轮转，pending/补链优先也可能继续延后，六小时是下一轮的准入条件，不是单项最长等待时限。

上线和回退由集成员及 ops 沿原队列执行，不由开发树改生产。回退本次 `proposal_dispatch.py` 调度差量即可恢复原逐新局重审，保留轮次记录、原批次与所有候选；未来再次启用会继续读取原水位。此项只改学习调度，不分配游戏发布号、不改游戏知识或出牌行为。方案、固定基线及估算见 [#46 交付](../paper/materials/20261023-issue46-allocation/report.md)。

上线后由 ops 记实际发布时间 T 和实际源码 SHA，再读取 **[T,T+24h)** 的原分配回执，不能用开发固定测试或流量估算代验收：

```bash
nice -n 19 python3 ops/worktree_allocation_report.py --root "$PWD" \
  --since '<T，带时区>' --until '<T+24h，带时区>'
```

工具只读原 `retention/allocations`，按半开时间窗口统计成功分配、失败/在途尝试及类别，已经回收的树仍计入。损坏回执会令 complete=false/退出1，目录缺失不会冒报零。无原分配回执的 legacy checkout、restore 不在此口径，须分开记录。24 小时终局前保持 #46 此验收项开放，记录当日对局量、pending/补链/专题/修复量与等待轮次数；比较策略树和全类别，不能将正常业务停摆当成减少分配的收益。不新增计时器、模型或调度进程。

新的普通学习和进阶验收工作树使用 `ops/worktree_checkout.py`，其他新功能和运维工作树也使用同一入口：

```bash
nice -n 19 python3 ops/worktree_checkout.py "$PWD" "$PWD/.worktrees/<功能名>" HEAD
```

分配前检查剩余字节和 inode，失败不启动模型；分配过程失败只回收本次尚未启动的副本，保留失败回执和来源分支。默认展开源码、测试、知识和文档，保留 `paper/materials/` 顶层 Markdown（STATE、决定和变更记录）及 `learning/` 账本；历史 `paper/data/history/`、`paper/raw/`、`experiments/` 与其他 materials 使用固定 Git 提交按需读取。分配回执记录实际基线，原件仍在原实例和 Git 中。缺少历史文件不代表证据不存在，不应据此增加新游戏知识。

## 历史副本和过程副本的独立回收

任务完成、入库和上线继续经过上述验收；存储回收不改变这些状态。原 retention worker 同时执行 `worktree_storage.sweep`，每轮最多处理四棵缓存或过程副本，不新建计时器、模型或调度器。空闲工作树即使是 failed、等待验收或被原要求引用，也可只移除干净的历史 Git 副本：保留分支、提交、原 cwd、修改过的材料、独有文件、所有原日志和报告。实际基线增加独立 Git ref，prepared 和完成动作日志保留。运行中批次、宿主进程引用、学习启动租约、共享发布事务和常驻游戏实例均阻止回收；中途 Git 操作也保留。

```bash
nice -n 19 python3 ops/worktree_storage.py sweep --root "$PWD" --limit 4 --apply
python3 ops/worktree_storage.py materialize --root "$PWD" --workspace <原工作树名> \
  --path paper/materials/<精确证据文件>
```

materialize 只接受精确的普通 Git 文件，校验实际 HEAD 与 blob；已有展开输入和修改保持不变。每棵树干净的历史输入缓存上限 256 MiB，空闲后原 worker 再回收；修改过的证据不受缓存额度限制，不会被删除。原学习 wrapper 从实例根运行当前 launcher，传给原工作树的 cwd、任务、模型、账号、线程和基线保持原绑定，因此旧 exp 等常驻树也收到新存储规则。全量仓库 tar 与展开 checkout 不作为新的对照输入：记录 Git SHA、`git diff --binary`、固定输入清单及测试输出即可，按所需路径恢复。

旧 `.source-checkout`、`.before-checkout` 和 `source-archive.tar` 可单独压缩归档。先核原 batch、报告路径与 learner_launch 的 cwd/task/scratch，完整 gzip 归档逐文件 SHA 和归档读回通过后，才删除对应的过程副本。原报告、jsonl/out/err/log、其他冻结证据均留在原路径；已知 node_modules 软链接也留在原路径。缺少 batch.report 时可从原 BATCH.out 的最终任务回报恢复 scratch 路径，仍须原 learner_launch 的 cwd/task/params.scratch 三者一致；不修改批次结果。凭据、陌生软链接、嵌套 Git 和未知 owner 保留。归档在原 `ops/codex-ops/retention/storage/source-copies/`，不因任务失败丢弃。

```bash
nice -n 19 python3 ops/worktree_storage.py compress --root "$PWD" \
  --batch <原批次> --scratch <原scratch绝对路径> --apply
python3 ops/worktree_storage.py restore-copies --root "$PWD" --batch <原批次>
```

显式恢复前检查容量、归档 SHA 和原路径，已修改文件拒绝覆盖。原 learning-followup 启动器在恢复原线程前自动恢复该原批次的过程副本；其他历史 continuation 需要原 owner 先用 restore-copies 恢复，不改变其 UUID、任务状态、账号或队列。缓存回收结果不构成任务完成、实际入库或消费者上线证明。

标准闭环是：任务结束登记 → 原范围验收和实际发布 → 归档校验 → 复核 owner/进程/租约和共享发布锁 → 回收现场 → 持久回执；任一门禁未满足，原调度器记录原因并继续重试，不派新的清理模型。原对局、token/费用原件、知识库、版本、学习账本、原生会话及失败证据不属于可丢弃现场。

实际删除和恢复必须在宿主进程视图中执行；沙箱只看得到自身进程，不能据此判断其他 owner 已退出。CLI 检出这种视图就拒绝删除，原调度器仍在宿主中自动执行。固定临时仓库用例独立验证回收函数，不操作生产目录。


Roy/Claude 2026-10-24（#51 评论6376022286）：外部冻结单元待派时，与普通学习批次交替，两个外部单元之间最多插一个普通批次；复盘仍走原入口优先，不占交替轮次。交替依据已注册且有PID的原批次时间序列，空tick、准入拒绝不消耗轮次；没有普通任务可启动时外部可接续，没有外部待派时保留原流水线。现有运行者、原审计租约、双策略槽、容量/来源/重试/原生核验门保持；调度部署、批次注册与来源消费/经验live验收分别记账。


Roy/主管 2026-10-24（#56，覆盖 #51 旧轮换和未部署的 3:1 八叶）：外部学习按 A 流派剧本、B 单牌、C 遭遇战与 rk、D 其余决策四道分别登记，每道至多一个未结算批次。队列 plan 的 `lane` 是派发元数据，冻结来源清单、SHA 与样本分母不变；同道按原队列顺序续派，D 内保留商店/删牌→遗物→事件顺序。外部 pending/在途时另留一个自有学习槽，优先原复盘入口，之后走经验、提案等原路径；已有自有 owner 和审计文件锁不因拆道被释放。无外部需求时保留原普通流水线。新批次仍走原 ready/dispatch/finish、原生消费核验、未送草稿及工作树 retention；四道不授权并行写 live。

现有五分钟订阅采样同时写 `ops/codex-ops/subscription-usage.json`，账号 home 的 SHA256 只用于绑定；不含凭据。调度器与 wrapper/launcher 共用这份最多十分钟的快照：按 Roy 2026-10-28 授权（[#56/6458903164](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6458903164)），所有新外部批次固定 `service_tier=default`；周用量 ≤70% 仍为四道，>70% 且 <90% 仍为两道，≥90% 停止新外部准入并向原 ops 队列去重请求 codex1 换号。#56 评论 6383255912 明确当前没有预检事务 ID，真实预检、drain、换号及验证归 ops，不在开发交付中切账号；不打断在途批次。未知/过期/账号不符也不准入。刷新快照但仍在同一 workers 档允许已登记 checkout 继续，跨 workers 档或旧 fast/ultrafast 登记需保留原注册并走原失败/重试门，不能重写租约。主盘可用空间 ≤80 GiB 拒绝新外部派发，原临时盘及其他容量门继续生效。service tier 仅经启动参数传入，不改共享 config。

每批 `external-launch.json` 初始区分 requested/effective 与尚未知的 observed；只有原生 turn_context 经原绑定核验后，调度器才补写 `observed_service_tier` 和对应只读证据。发布后由 ops 记录 T/源码、自然 tick 的四道+自有槽五个独立批次及实际档位，并在 [T,T+2h) 读回至少四个完成单元。固定测试和启动请求不能代这两项验收；R434 正式策略/rk、旧失败、未完成学习父要求与自然采用/收益保持分账。


#56 退回修正：道位释放还须核原 owner 的 `shared.retired`。即使原批是 done/failed 且 wrapper PID 已退，不同 plan、不同 unit ID 也不能跳过原生退役/原 learner 日志证明；不明时保留该道及其 worker 名额，仍按额度上限调度其他空道，自有槽独立。not-started 原证明或已核原生终态到齐后，下一自然派发可释放原道；不重置原状态、失败、租约，也不把已核退役历史永久计入占用。该检查同时适用原 external dispatch 和底层 writer 准入。

#56 注册超时修正：新调度在原全局 `learn.lock` 事务中为每个新 wrapper 预持独立 batch 发布锁；完整 batch（含原 supervisor PID、external binding/lane/policy）原子写入并 fsync 后，才释放该批屏障。启动准备与 learner_entry 等待该批屏障，仍核原保存的 PID/batch 租约；不必等待父 tick 后续来源校验结束。全局锁继续串行化派发/finish，超时仍120秒，旧/手动 wrapper 未携带受约束新屏障时仍走原全局路径。外部来源按空道惰性选择，一次原事务内复用已校验源，仅缓存冻结 metadata；依赖文件身份变化即重验，下一事务或独立 wrapper prepare 不复用缓存。

注册修正必须完整安装父 tick/learner_jobs、`learner_registration.py`、wrapper 与外部来源模块；不得只换 wrapper 后给原在途行添加屏障或元数据。先由 ops 待原自然事务退锁并核旧 wrapper 的零模型启动证明，再沿原失败/租约/世代续接，不重放旧产物或强 tick。#56 主管6385018900的23:30前合入门保持；未能完成时，原 ops 按其裁决回退到 #56 之前的调度恢复原两槽，知识、原 owner、失败和证据原样保留。恢复数量和时刻均须实际读回，不以源代码安装代自然验收。
