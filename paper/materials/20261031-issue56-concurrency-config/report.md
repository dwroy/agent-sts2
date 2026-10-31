# #56 独立学习并发实现

批准：[6538878220](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6538878220)。原方案：[df79619d](../20261030-issue56-concurrency-config/plan.md)。本树先通过合并提交 `6f9dc86456d0864a35da6900d0cf1f5c4f1223ab` 整合指定 main `39e48ce9d09248b86c0eec1bf2339c4b453ec253`；所有冲突的运行源码采用 main，原 #77 `efae4d79` 在祖先链中。旧两批开发材料和原方案继续保留，不作为本轮新运行证据。

## 行为与范围

- 新 `ops/learning_concurrency.py` 读取 board 独立 learning 段，默认 own1/ext4/total5；整数范围 own/ext0–10、total1–10，非法配置拒绝新准入。分项上限与总量同时约束，不使用开发会话登记或 heavy 槽。board、`own_learning_slot.py`、`learner_supervisor_close.py` 与指定 main 字节保持相同。
- 精确读取统一快照的当前学习 home SHA、codex/primary、10080分钟窗，最多600秒；>=70%或未知将有效总限降至不超过4，<70%新鲜样本恢复。其他 bucket/五小时窗不代周窗，不增加采样。旧0/2/4及90%换号请求分支不再控制学习；当前 default 服务档不变。
- 用原 own/native/主管作废和 external/shared.retired 证明计算保守占位，审计 request 的 batch/PID 与原行明确绑定时才去重，错绑或未知 lease 另占一位，未知 owner 保留。自然 tick、writer、feature、postmortem、原线程接续、audit、boss-sim/calibration 及 finish 续派都在原 learn.lock 内根据已登记行检查同一预算。
- A–D 保持主题，ext1–ext10 单独标识计算席位。默认保留每主题一批；external<=4不屏蔽C/D，显式>4才允许同主题不同合法来源/plan/unit占多席。原 generation、同 plan/重叠、退役、来源和磁盘/发布/独占门不放宽。旧行只读映射，高位缩槽不清旧 owner。
- 降档/缩槽不信号、不改旧状态/线程/租约；8/4继续运行，保守占位到3才可再准入一个。外部启动的 Python tier 和 TS frozen-registration 检查保留账号/服务档及原绑定，容量或额度快照变化不取消已登记席位。已登记workers必须仍是有效的正整数，不凭环境变量伪造外部任务。
- 原注册120秒屏障保持；新增席位在完整原子注册中发布。check_jobs 每个完整高层调用返回后可 checkpoint，避免扩 own 后让前一批等待后续慢任务；不在底层 proposal writer 中提前发布缺 caller metadata 的行。原注册五 wrapper 固定测试继续覆盖。
- 原 tick 首次及至少每7200秒报告到 inbox-claude；含已登记running且supervisor存活数/有效总限、保守占位、配置、周已用%、降档及原因，未知另列。报告ID处理追加与水位保存中断后的去重；水位另存learning-concurrency-report.json，排空tick保持原learn.json逐字节不变；candidate-only/原排空准入暂停的tick仍报告。无新定时器、模型或调度进程。

实际运行源码为11叶，均为ROOT，无游戏LIVE叶：`learner/lib/external-source.ts`，以及 `ops/` 下的 `learning_concurrency.py`、`external_learning_policy.py`、`strategy_external_jobs.py`、`learner_jobs.py`、`learner_registration.py`、`learner_tui.py`、`codex-ops-learn.py`、`ascension_audit.py`、`boss_sim_jobs.py`、`learning_requests.py`。另有12个新/改测试及fixture叶和文档。修改的运行叶不属于现有 fixed-producer-dependencies 声明输入，不改科学方法声明或游戏发布号；整批检查仍检原闭包。

## 验证

最终生产tsc0，canonical sandbox 656文件/6074项全过（0败/0跳过），paths11项全过；最终相关Python664项全过，现有13个producer声明闭包核验全过。结果见 `validation.json`；最终开测前23个源码/测试叶SHA固定在 `source-freeze.json`，结束后逐项核同。原 canonical sandbox 使用 nice19、两worker，含生产tsc、完整固定排除列表和单fork paths；相关 Python 套件同样 nice19、仅固定数据。未调用模型、游戏、真实Jev、生产tick或生产进程处置。

新固定测试覆盖实际 writer 的own2+ext8十次登记、第十一次拒绝，70精确边界/未知/坏数/错账号/非primary/新周期恢复，小于4上限、非法配置、分类关闭，8在途降4及动态缩槽不改行/不信号，audit去重/孤立lease，external2仍派C/D、高位未知owner保留，两小时报告及追加后崩溃恢复，candidate-only原tick报告，以及feature/audit/boss-sim/CLI/原线程接续共用满额门。研发board字节保持的固定断言与原重任务/发布门测试分开保留。

早期红项保留：旧quota fixture没有primary bucket，按新规则应降档；旧边界断言按批准的新总限调整。第一轮定向78项中策略fixture用`alive(None)=True`使无PID历史行虚占计算位，新增投影对正整数PID作防御性检查后原策略测试通过。首轮相关Python589通过，但当时仍在完善后续注册/边界检查，不借作最终组合证明。首轮完整沙箱6068过/6败（无跳过），分别为排空报告误存learn.json、两个旧90%断言，以及main39原夹具的队列/heavy启用和一个稀疏冷输入。前者改为独立报告水位，不放松排空行守卫；后两种按新授权更新断言、在临时夹具显式关独立queue/heavy，冷输入从39的原blob核同展开，均不改生产门。两个main夹具问题用main39原测试字节、未改动的实际运行源码独立复现为1败/1错；修后相关Python73项绿。定向Vitest还出现库存父测试15秒小于原子进程20秒的夹具预算冲突，子进程限额保持20秒，仅父测试设25秒；28个库存用例及该Vitest包装随后通过。所有原始输出保存在本工作树 `.cache/issue56-concurrency-implementation/`，最终摘要登记其SHA，未删除旧红项。

## 集成与运行接续

本交付不写main/live、生产board、learn.json、账号、prompt、STOP或其他会话；不 submit/install/执行生产合并队列。固定HEAD/ref请求由本树准备给原集成员，接下一批；不要求阻住 #77/#79 原批。

采用时安装完整11叶及测试/文档，待原自然 learn.lock 事务退锁后由原 ops 核源码与原owner；不得给旧行补slot、改租约、强tick或重学旧产物。ops在自然停点设置total_limit=10并按库存选择own/ext，记录实际配置、账号绑定、周窗、首批自然准入和两小时报告；board dev8/heavy及其他发布/库存门原样核回。现有external disabled等门继续生效，不能以配置代替恢复授权。

撤回由原集成员/ops沿原渠道撤本次调度源码差量，保留 #77 owner证明、所有新旧batch/slot、原生证据、知识和报告。源码检查通过不代表生产已扩到10、自然消费/产出或学习父要求通过；原科学父、长期效果和当前未决运行验收保持开放。
