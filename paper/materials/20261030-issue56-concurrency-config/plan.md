# #56 学习并发配置化方案（先交方案）

时间：2026-10-30 21:50 +08:00。本文为方案交付，尚未实现、安装或变更生产调度。

授权原件：[56/6523800528](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6523800528)、[20/6524090002](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6524090002)。额度事实参考原 ops 的 [20/6523717462](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6523717462)，不把其 21:05 的 24% 当成本轮实时值。

只读基线：已 fetch 并核 `origin/main=1b7c652cbd5ef2355687e1e159fccacb2a73da06`；原开发分支 HEAD 为 `56800c0500a4ba06b491bb2a0061da0e8ca04113`。两者非祖先关系，实施须先在本任务树整合最新 main，保留原提交/分支和此前交付。本文以最新 main 的源码为依据，不把本树 10/24 源码当成当前生产。

## 1. 配置与额度语义

选择 `.agents/board.yaml` 的独立顶层 `learning` 段；沿项目现有 YAML 读取方式，不增加依赖、不调用整个开发派单器。拟议字段如下，**这是文档示例，不写入运行配置**：

```yaml
learning:
  own_slots: 1
  external_slots: 4
  total_limit: 5
```

- `own_slots`、`external_slots` 接受 0–10 的整数；`total_limit` 接受 1–10 的整数。拒绝布尔、浮点、负数、超 10 和未知字段，不把非法配置静默放大。各分项之和可大于总限，总限优先。两类都为 0 表示不新派学习。
- 段/字段缺省采用上面的 1/4/5。未配置时保留旧派发顺序、同任务/共享工作树约束、无外部需求时的原普通流水线；旧代码的 own 单槽仅用于外部期，这一兼容细节必须有独立测试，不能无意把无外部旧路径强制串行。显式配置 own 槽时，各自有入口统一受该值约束。
- 有效总限为 `min(total_limit, 10)`；周已用 **>=70%** 或未知时进一步取 `min(配置总限, 4)`。小于 70% 的新鲜样本恢复配置总限，不需要重启。配置比 4 更小时不被降档逻辑反向放大。
- 沿已有 `subscription-usage.json`，不增加 `account/rateLimits/read` 调用、定时器或模型请求。精确匹配当前学习所选 codex3 home SHA、`bucket=codex/primary`、`window_minutes=10080` 的周窗。样本超过现有 600 秒、新周期已到却无新样本、缺失/读取失败/格式不对/账号不符/无目标窗，均记未知。其他 bucket/五小时窗不代替这个周窗。
- 新的总量护栏替代旧 external 0/2/4 额度分档；70% 边界不沿用旧的 `>70`。本轮按 codex3 共享额度管理新派发，不因旧 `>=90%` 分支另发 codex1 换号请求。账号/服务不可用的原启动安全门仍保留，实际账号切换继续由 ops 独立事务负责。
- 当前 main 的学习服务档已为 `default`，保持不变，不恢复本树历史 ultrafast/fast 规则，不修改任何账号或共用 config。

## 2. 席位、在途 owner 和入口覆盖

仅改计数常量不足以扩到 10：`strategy_external_jobs` 当前循环四次、A–D 每主题只能占一个；`check_jobs` 还用布尔变量限制普通任务每轮一个。

实施方式：

1. 新增统一的学习配置/占用投影模块。所有新准入在原 `learn.lock` 事务内检查总量和分类余量，取得 PID/登记 launching 后立即计入同轮预算；完整注册沿现有 batch 屏障原子发布。不同分类、不同入口不能各自重复花费同一个余量。
2. 自有占用复用 `own_learning_slot` 的原生终态/宿主空闲/主管作废回执证明；外部复用 `lane_owners`/`shared.retired`。不把死 wrapper、awaiting_review、摘要或 PID 缺失当作释放证明；原证据未核的 owner 继续保留。batch 与同一 audit request/lease 去重，孤立未明 lease 仍单独保留一位。已证明只待审、无计算的条目沿原规则释放计算位，任务状态和科学父不改。
3. A/B/C/D 保持原主题与来源身份，新增独立 `external_slot` 席位身份（有序 ext1–ext10）。默认至多四批且每主题一个；配置 external<=4 时仍在全部 A–D 间沿旧顺序轮转，配置 2 不等于只开 A/B。显式提高到 >4 后先覆盖各主题，再把空席分给不同且原验证允许并行的 plan/unit；同主题可有多席，不能绕过同 plan 重试、generation、unit 重叠、原生退役或来源冻结门。旧批无新字段时按原主题/批号做只读占位映射；无法归属的 owner 保守占位并拒绝有歧义的同主题新派发。缩容后仍占用的高编号席位保留并计总量，不改写旧注册。
4. 保留 own 预留优先级：外部期先为 `min(own_slots, 有效总限)` 留自有余量，external 只能用剩余额度；因此默认降档为 own 最多 1 / ext 最多 3 / 合计最多 4。已运行批次优先占用，不要求它们立即符合新分配。无合法任务或原重任务门拒绝时，少于配置上限是正常结果。
5. 改 `check_jobs` 的普通单次布尔领取为按可用 own 席位领取。保留原复盘优先级、经验/提案等原顺序和各任务独占资源，不为填满席位并行写同一经验树或 live。学习席位是准入上限，不承诺队列一定能填满十个。
6. 覆盖自然 tick、CLI 手动 dispatch/write、finish 后续派、显式 feature、learning_requests 原线程接续、boss-sim/calibration、ascension audit、backfill 等实际启动路径。统一门放在能看到当前 state 的启动适配层，并在底层 writer 复核；先查清每条 start 回调的登记顺序，不能只给 `check_jobs` 外层加一次 if。复用登记事务避免 ascension 的 launching 行再次被当作一个新申请。
7. 不修改 `roles.dev.max_parallel` 或开发会话登记；学习不进入 issue 开发并发计数。heavy slot、磁盘/发布锁/账号身份/来源/冻结/重试/retention 门继续取交集，不拿十个模型席位当作十个 heavy 位。

降档为 **只挡新准入**：例如已经运行 8 个，变为 4 后仍报告 8/4，不发信号、不改失败/lease/原生线程、不重排；占用自然降到 3 才可再派一个。已取得席位并完整注册的 wrapper 也属于在途，不能因 `tier` 再比较 workers 数而中断准备。保留账号身份和原服务档/来源校验，动态容量变化只作用于下一次申请。

## 3. 沿原 tick 的两小时报告

在原 `cmd_tick` 中追加一行到 `ops/codex-ops/inbox-claude.md`，不新建任务/计时器。首次自然 tick 报告，之后距上次成功报告至少 7200 秒才报；candidate-only/准入暂停的 tick 也报告实际占用和限制，不能因没派发而不报。

示例：`[学习并发] codex3 在跑=8 / 有效总限=4；占位=8（own=2, ext=6）；配置own=2/ext=8/total=10；周已用=70.0%；降档=是；原因=weekly_ge_70；sample=…`。

在跑数和未明保留席位分开显示，避免把等待审查或未知证据冒报为模型在跑；准入用保守占位。未知时百分比写“未知”并给固定原因码。报告时间/ID 存原 learn state，原锁串行；追加成功但 state 保存前崩溃时按报告 ID 去重，不能每次重启刷同一行。报告失败不篡改批次或关闭任务，保留可重试状态。

## 4. 固定验收矩阵

| 输入/场景 | 必须观察到的行为 |
| --- | --- |
| 无 learning 配置、额度 <70% | own1/ext4 的旧外部期准入；无外部旧普通路径、原顺序和独占门回归通过 |
| 配置 own2/ext8/total10、额度 69.99% | 十个独立合法固定任务可登记；第十一个被挡；A–D 主题与扩展席位生效 |
| external_slots=2，仅 C/D 有任务 | 仍可派两个，不因席位编号屏蔽主题；同主题旧四道限制保留 |
| 70.0%、70.01%、90%、100% | 学习总限均至多 4；无旧 90% 自动请求换号的副作用 |
| 缺文件/读失败/过期/错 home/非 primary 周窗/坏数值 | unknown、总限至多 4；不把未知当 0% 或读取其他账号 |
| 新周窗有新鲜 0% 样本 | 自动恢复配置值；仅旧窗口已重置无新样本仍按未知 |
| 8 在途后降档/动态缩槽 | 原行/线程/PID/lease 和信号调用均不变；计数降到 3 后才能再派 1 |
| 同 tick、跨 writer/helper、CLI/finish/审计入口 | 分类位和总量共用；不漏计、重复计或超发；原登记 120 秒门回归通过 |
| unknown native owner、同 plan 换名/换 unit、旧高编号席位 | 原 owner 不被挤掉；重试/重叠/退役门不绕过 |
| 开发 8 个占满/学习 10 个占满/重任务门拒绝 | 开发上限与占用不变；学习不花开发位；重任务拒绝仍生效 |
| tick 重复、间隔 7199/7200 秒、落盘中断 | 两小时恰当报告、固定 ID 去重；不增加调度器 |
| 非法配置、总限小于 4、单类为 0 | 拒绝非法配置；较小上限不放大；关闭分类不终止原批 |

用临时根、固定 quota 文件、假时钟/固定原生证据及 mocked start 完成，不启动真实学习/对局，不调用生产 tick。代码实现后跑相关 Python/入口测试与仓库必需生产 tsc、两 worker 的 canonical sandbox；保留红项与原件，不以方案检查代工程测试。

## 5. 交付、上线与边界

预期源码范围：新增学习并发模块，调整 `external_learning_policy.py`、`strategy_external_jobs.py`、`learner_jobs.py`、`codex-ops-learn.py` 及确有独立启动入口的 helper/注册元数据，补测试和 `docs/learner-retention.md`；实现时逐叶列清并更新原发布方法的必要 producer 声明。先在本树整合最新 main 的 #77 owner/来源修复，不覆盖它们。

**本次方案不修改 `.agents/board.yaml`。** #20 指定的 ROOT 开发上限 8、merge_queue/heavy/machine_state 纯登记仍由原集成员独立完成；最新 main 仍显示 dev5，不能在本开发树替它登记或声称已提交。后续源码交付按 #68 准备固定 HEAD/ref 请求，由原集成员沿唯一队列核合；不触发生产 submit/tick/install/authority。

合入后由 ops 在自然停点设置 `total_limit=10`，并按可派库存自行设置 own/ext 分配，记录配置字节、实际源码、账号 home SHA、周窗、原 tick 首次准入、在跑/保留占位、两小时报告及 dev8/heavy 未变的回执。外部 disabled、库存、原 owner 或发布门尚未解除时继续等待，配置不授权恢复或绕门。

回退：ops 沿原渠道撤回本次配置/准入差量，恢复原已核调度；保留所有新旧 batch、slot、历史尝试、报告、知识、原生证据和父要求。不得直接删除占用/重写旧注册以得到低并发数字。本开发不改 main/live、STOP、账号、生产配置或其他会话，不分配游戏行为发布号。本方案 review 不代表本轮工程已完成或生产已恢复。
