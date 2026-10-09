# Roy 已授权的核心构筑入口与结果通知适配（待现有 learner 执行）

父请求：roy-20261009-historical-core-builds。关联论文留痕补充 roy-20261009-historical-core-builds-paper-trace 和结果通知补充 roy-20261009-historical-core-builds-result-notify。这是入口/完成通道的机械适配准备，不是游戏知识，不是第二批核心构筑学习，也没有实际派发或安装通知 hook。

## 任务范围及现有入口

由现有普通 fix-batch learner 在其合法、干净且无人占用的工作树实现最小适配。读 notes/silent-historical-core-builds-dispatch.json 与本目录三个原始请求；本稿不允许清理或接管 codex-dev 的旧策略暂存代码。旧拥有者 20261008-075538-strategy-proposal 的四文件/测试超时/原回报保存在 owner-before.json、owner-candidate-original.patch、owner-report-original.md；必须先沿原候选链作保存及处置交接，不能把此稿当其游戏修复审核或上线授权。其他活任务继续。

新增 learner/tasks/silent-historical-core-builds.md，使用现有任务格式及现有 Codex runner；在 ops/learner_jobs.py 的 FEATURE_REQUESTS/requested_feature 注册唯一父请求的 notes JSON，在 ops/codex-ops-learner.sh 注册明确模板、角色和专用工作树。沿现有短锁、工作树租约、标准 finish 与完整外部检查事件路径实现，不另建 cron/heartbeat，不修改运维 prompt、模型/推理强度、env、对局/hosting 参数，不复用其他功能的工作树或伪装另一个 feature。任务采用专用 .worktrees/silent-historical-core-builds，必须经已授权的功能工作树流程建立并核实无租约/dirty，不能忽略现有安全拒绝。当前此树尚不存在。

父请求状态仍 pending/batch null，直到标准 broker 真正返回批号并核实 thread/宿主身份，才记录正式学习 batch。入口适配本身单独记录其 fix-batch 号和源/实际 live/检查，不把它填入核心学习 batch，不造游戏版本/ledger/shipped。若纯工具适配不改变对局行为，按纯工具记录；真正改变游戏行为的知识/实现由后续 learner 按原协议登记。

## 全历史任务模板必须完整承载

学习输入是 SILENT 全部已结束胜/负局，在实际派发时冻结日志切点、完整局号清单、输入 SHA、抽取命令与缺帧覆盖；不得受普通单局/十局增量截断，也不得声称现在已冻结。按进阶、代码版本、实际成功大脑来源分层，主战绩保持纯 Codex，首试/SL 最终分开；依据实际战斗前牌组/资源及成型时点分型，不能拿最终幸存牌组倒填早期。只用本角色证据，由 learner 自己提出具体组合、打法、阈值；运维不预定流派/牌表。

首轮实质报告必须给候选核心运转/支持/完整反例及未知范围；真实伤害、生存、启动、战斗回合、HP/药水/SL 等资源消耗；逐候选/实际 boss/进阶到达数、独立局通过率与整局胜率，明确分母、区间和重复 SL 口径；实际可用的构筑目标、当前缺口、替代/过渡、转型/放弃条件及证据局/层/回合。和 arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression 关联，保留前期漏斗。当前 A10 无胜局，低阶成功不能外推稳定通杀；证据不足也必须形成上述内容及限制的实质报告，不能用一个空数组/最终成功摘要通过验收。

有证据的知识/代码沿既有 learner/ledger.py 与 learner/code_proposals.py CLI 登记，自测→实际 live→唯一版本（行为改变时）/所属账本/双收件箱→完整外部检查。核实大脑消费者实际读取与策略采用、已知生效局边界；报告/派发/自测不是上线。所有候选提出/修改/放弃、旧新 diff/提交、失败/冲突/拒绝/测试原日志及效果/重犯都原样留论文证据；更正独立保存。保持本目录原 pending 和旧失败。

## 宿主完成与 Roy 通知

在现有 runner 完成/ops 标准事件路径新增明确的报告验收与通知状态，不直接 enqueue 新任务。严格绑定父 request_id、实际 batch、角色 silent、learner_task、租约报告 realpath 与报告 SHA，核实候选/逐 boss 矩阵/伤害资源/构筑模板/证据限制。允许有实质分析的“尚无足够证据”；入口完成、派发成功、空报告、错误任务/批号/角色/路径、过期 SHA 均不得当组合有结果。

ops 核实后在 notes/for-dai.md 和 ops/inbox-dev.md 写简洁候选/矩阵/可用模板或缺证限制摘要，关联 request+batch+报告路径/SHA。通过宿主现有完成路径调用 argv 形式 herdr notification show --body <TEXT> --sound done <TITLE>，不可 shell 拼接、不向 TUI 输入、不 resume watcher 会话。按唯一父请求+batch+报告 SHA 做持久去重；短事务保存通知领取/完成状态，命令后保存 success/failure/rc 和脱敏输出回执，失败原件保留，崩溃后不可无凭据重复通知，不长时间持 learn.lock。通知机制实际通过验收并成为 live 祖先前 notification_hook 必须 pending，不能承诺已开启。测试只用固定报告和 fake herdr，不实际给 Roy 发测试通知。

## 固定验收与发布

固定夹具覆盖父请求/补充去重、dirty/活租约拒绝、模板白名单与角色/路径绑定、完整历史不截十局、同一父请求仅一个活学习 batch；报告身份/realpath/SHA、不完整报告/入口完成不通知、实质缺证报告可通知、相同 request+batch+SHA 重入只一次、原 CLI 失败回执保留与并行完成事务无覆盖。现有业务测试仍通过，源撤销后对应真实断言红、原字节恢复绿，全部失败/超时原日志保留。按仓库要求 nice/最多四进程跑原沙箱入口（含 tsc/vitest）及针对性 Python 固定夹具，gitleaks 后提交、自行合入 live；运维核实实际源祖先、标准完整外部检查与记录。不能新写的测试只是模拟实现，不能冒报外部检查或生产通知。

入口实际 live 核实后，用同一父请求通过标准 broker 一次正式派全历史学习，登记真实 batch/PID/工作树/输入切点及模板 SHA。不派第二核心学习；首轮报告回执与通知去重记录沿父项留痕。观察者 CODEX_HOME=/home/dw/.codex1 转录覆盖目前 pending；如需补既有归档选择入口，只走现有脱敏/key扫描流程，禁止读取/复制凭据/env，未核实仍写 pending，不新服务。
