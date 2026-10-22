# #20 资源与冲突及启动入口发布

按 Roy 2026-10-22 批准的最新[补充需求3](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6331895699)交付；取代前一条仅发窗口提醒的方案。沿原 issue 分支快进 main `2bb0a9cffafa568858a3b7a62311235b6bc61adc`，保留开发并发上限10。生产配置 `dispatcher.heavy.enabled` 默认 false，本会话没有启用或改变实际生产开关。后续[启动脚本发布补充](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6332405448)一并实现。**影响 live 启动：是**，须由 ops 发布核对、首次固定及安全接续后才算生效。

## 最终行为

通用 kit 新增 `board.py heavy --root ROOT ROLE -- COMMAND` 和可嵌入的 `heavy.admission`。一个短 flock 串行登记/准入，每项前台命令持独立租约；CLI exec 保留租约，不额外常驻一个包装进程。退出或异常退出，内核关闭租约后位置即可接续；历史 JSON 不冒仍在跑或检查通过。等待由 inotify 与游戏/旧检查进程 pidfd 驱动，无 sleep/定时轮询、新 daemon、守候模型、kill 或 signal。

容量读项目配置：对局中1、停局2；ops > integrator > learner/experiment > dev/other，同档登记 FIFO。高优先级排在低优先级等待项之前，不打断在跑任务；游戏开始时只收紧后续准入，游戏退出可放第二项。项目适配器沿原 play/cwd 身份读取游戏状态；旧未托管完整 Vitest 也计占位，ops 改等这些原进程退出，不因并行测试直接拒绝。队列摘要显示任务/角色、运行/等待、等待秒数和默认60分钟 overdue。

标准 `ops/release_checks.py` 在资源准入后取得原 live 锁，对固定 tsc+完整 Vitest 产生绑定 repo/root、树 SHA、完整结果及输入未变的回执；同树完整通过可复用，并引用原回执 SHA。不同树、失败/定向/不完整回执必须重跑；原回执不覆盖。实际发布仍须原绑定保护、自然边界、编号和自然读回，不以工具返回0代上线。09:37 原手工驱动作为历史原件保留，后续组合检查改走本入口，旧的并行测试 assert 不再放进新入口内。

原自动 post-merge full、fallback full 与续验在 live 锁前接资源准入；局后知识刷新、fight-value 和后台统计在知识锁前排队。开关 false 保持旧执行路径。开发工作树的 `ops/board_heavy.py` 自动定位本 Git 主运行根并保留 cwd/argv；未安装或未启用则拒绝新的手工重任务入口，不悄悄绕队列。

派单器按 `area:*` 避免同区域 in-progress/review 同时派活，ready 的生命周期预约和同 tick 派发也占区域；后者在原 journal/digest 写明等哪个 issue。转 waiting-release 不继续占开发区域，无 area 照旧。新流程启用后，开发交付只做 tsc+定向测试并列改动文件；集成员对 review 批次合入前全检一次，ops 同树复用、异树重跑。同文件交付先由集成员定顺序，后者变基再交。

## 启动入口发布

`ops/launch_runtime.py pin` 在原 live 发布锁内，从实际 live 的精确提交归档 ops 脚本、固定行为配置，生成忽略目录下的完整哈希/模式清单与不可混用的启动包。入口通过发布选择器执行固定 run/autoplay；paths、production-runtime、trial/instance helper 等也取同版本。main 的脚本、环境行为参数、ablation 策略变更不进入该包。live 关键输入改变但尚未重新固定时拒绝启动下一局；在跑进程不改参、不发信号。

非秘密行为覆盖可随 live 的 `ops/launch-settings.json` 发布；密钥、账号/home、鉴权外部文件不复制、不读取内容、不提交，不允许将共享可变 .env 链接冒充独立 live 环境。首次启用由 ops 对照实际 run-config 补齐期望覆盖，不把固定脚本默认值冒充当前已授权配置。Regent lane 不在本次启用范围；无发布清单时仍为原路径，不宣称已经隔离。集成员合 main 前须与 ops 协调首次迁移窗口，在自然边界保持下一局准入直到实际 live 协议发布、pin 及安全接续完成；不可先合 main 后任由旧控制器开局。

保留原 STOP/日志/账号状态/实例绑定的运行控制；ablation 固定策略与可变游标分离，report 只推进运行游标。旧 autoplay 在每次新局边界读取最新固定版本；autoplay 自身内容变化仍由 ops 按原安全 reload 接续，不切断当前对局。console 记录启动源 SHA；reload PID 识别保留历史固定脚本身份。工作流文档列明首次发布、核回、回退及开发/集成员的“影响 live 启动”单独结论。

## 验证

- kit 固定测试69项通过：原59项与重任务/区域新增10项。优先级插队不抢占、FIFO、异常退出释放、游戏容量切换、摘要/超时标记、同区域与同 tick 预约、waiting-release 释放区域均覆盖。多数队列测试用线程/固定执行器；异常退出只起自有子进程并由它自行退出，不向其他进程发信号。
- 公共 Python 最终53项通过；最终 Vitest 定向13文件101项通过。此前资源范围为43项与8文件18项，范围扩大后增加启动发布测试。首次8文件中1败/2项失败是续验模块独立加载缺 ops 路径，已修并原套复跑通过；首个失败保留，见 failure-ledger。复核补齐固定包历史/当前 report 的安全重载身份，相关2文件19项复跑通过。标准回执另覆盖同 SHA 复用不执行、异 SHA 重跑、定向/失败/布尔假退出码不能当完整绿、输入变化保留失败及准入顺序。
- 生产 tsc 退出0；全检修复后再次 tsc0、公共 Python53项通过；原稀疏检出缺失 #29 材料已按 HEAD blob精确补齐，导入检查0。原缺失预检查退出1保留于 sparse-precheck。
- 启动发布固定测试10项通过，包括实际 Bash 头部/配置在 main 改动后保持原参数、发布后切新参数、在跑控制器保持原参数、CLI 禁止未发布行为参数、清单/执行模式完整性与 ablation 策略/游标分账。测试仅临时 Git/worktree 和固定 Bash 占位执行，不调用游戏、模型或实际运维。
- 首次完成的完整检查为6167通过/10失败/2跳过，失败原件 first-complete 全部保留。3项旧自检要求2 worker、1项规则文档缺 learner-checks 说明已修；5项启动器夹具只导入 read_report 时被新队列提前依赖阻断，改为执行检查时才加载准入依赖，不静默绕队列。另1项候选卡牌固定样本用例的墙钟使预期8样本截成2；只给此测试注入固定时钟，保留8样本/真实模拟断言与生产算法。全部失败7文件28项复跑通过。
- 修正后的最终完整 Vitest **656文件全部通过，6177项通过、2项跳过，退出0**，1556.95秒；33项冻结输入核回未变，实际 CLI 租约退出后已释放。本次生产尚未启用新分工，仍补原完整检查。先前两次完整检查分别因整体资源流程、启动发布需求追加中断130，均只对核回身份的本会话检查进程操作，保留原日志，不算本版全绿；其后复核重载守卫导致一次本会话全检中断130，另保留 pre-reload-guard 原件。第二次验证队列先等已有 #37 检查自然退出，实际排队101.473秒后 exec 单 worker；该中断原件见 pre-startup-vitest。生产队列/开关未写；验证与未来生产启用分列。

最终全检输入冻结见 final-source-freeze；前两个范围的 source-freeze/public-tested-inputs/kit-tested-inputs 作为历史保留，不冒最终完整检查输入。最终源 SHA、测试结果和日志字节/压缩明文 SHA 见 verification。全检后仅补回 AGENTS 原 PATH/增加依赖先问 Roy 约束、调整流程文档章节层级；角色文档1文件4项复验0，最终交付字节见 final-delivery-inputs，执行代码未再改。

## 09:37 原现场回放

replay-fixture 引原 #33 驱动/资源门终局及09:37核回原件的字节/SHA，保留 #33 PID3113069/start5712502、09:29排队、09:37退出，原重建/tsc/full未启动。`replay.py` 调用固定内核等待测试：#35 已完成、以 #36 为最后在跑旧检查，#33 先排队，#36 自有模拟子进程经 stdin 正常退出后，pidfd 唤醒并执行 #33，而非守卫退出。结果见 replay-queue-result；不是当时已执行的新流程，不改旧失败或推断收益。

## 集成及启用

交付代码与配置、三份流程文档/规则和派发提示一并更新。安装 kit 必须带 board.py、watchdog.py、heavy.py 及测试/README，保留旧 journal、registry、持久开关与 uncertain。由原 ops 在自然边界核唯一原 stall、安装精确提交后将项目 heavy.enabled 切 true；同时协调各角色用统一入口和标准完整检查回执，启用前照旧。没有修改 main/live/STOP、运维 prompt、其他会话、游戏或学习知识，不分配行为 release_id。

回退：停止新重任务提交，让在途前台命令自然退出，再关项目 heavy 配置；保留队列/失败回执和 issue 待办。旧仅窗口提醒实现及中断材料列 superseded，不装进最终引擎。交付不替代 ops 自然启用后的真实在跑/等位/同区派单验收，#20 原有其他自然验收待办继续开放。

精确私有 kit 提交：`f1cc7285de2f14aeea33cebb8e6eba4ce618af01`；公共提交由 issue 交付评论核回，材料与源码同提交。
