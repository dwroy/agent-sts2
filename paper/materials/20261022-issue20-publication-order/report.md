# #20：发布顺序、组装清单与数据基线复用

依据[本轮要求](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6339964056)，公共父 `fd968fb8fb370cac2fc1dbffd965d98e74ad11c3`；上游kit **`26130354b86fbdbb4a1baddda07a770b0b9d6fd5`**（父86cdf3b，Windows ssh.exe推送并核远端main同SHA）。

**本轮增量影响live启动：否；父交付仍为是。** 改的是发布预约/检查与通知入口，不改run/autoplay/固定bundle、行为默认值或游戏知识。生产`dispatcher.release.enabled`候选默认false，未迁移/启用原ops的在途事务。

## 交付

- `ops/release_queue.py`：本项目持久FIFO预约，检查→冻结→发布→核实完成跨进程保留。第二个发布（包括纯数据）返回75/queued；实际publish入口再次核同一预约和受检候选，命令退出0仍awaiting-completion。complete核实际live提交、运行源码/知识与证据才释放。失败/进程退出不释放，需本人核现场后retry/abandon；同id执行另有内核租约，避免两个调用同时运行。
- `ops/release_plan.py`：ops用原K→L短锁冻结实际live知识，plan逐项核来源叶SHA/模式和预像、测试依赖与前置实际叶/剔除理由、同一份最新冻结知识、当前负载固定超时余量、完整输入。拒绝未声明的运行源码差异与未跟踪源码/配置；操作锁不冒为源码。常见被调Python脚本、字面量固定超时有静态补查，动态读取和断言语义仍须原角色代码审阅，不能把清单布尔值当学习/策略成立证明。
- `ops/release_checks.py`：启用后先预约、组装预检，再申请CPU；检查期间不持知识/live短锁，前后短锁重核。v2回执绑定清单、受测树、运行指纹、实际执行结果、原full引用和日志SHA。基线及候选仅数据变化、运行源码与交付内容/预像不变、原完整绿及日志核同才复用；新组合执行tsc+逐变化知识文件覆盖的消费者定向，并核最新知识。未跟踪但被ops冻结的知识变化也不能绕过消费者。源码/测试/依赖/预像变化走full；原失败与定向不能冒充full。
- 独立纯数据发布仍保留原数据验收边界，不强加源码全套检查；先预约，publish用data-plan+原数据验收证据，机械拒绝运行源码/测试/依赖变化，保留原数据证据SHA与清单，不声称跑过full。
- kit以项目只读probe核发布队列，digest列Publication queue；另一个waiting-release不提醒发布、不计为ops空闲失败，Roy新评论仍可送达。门损坏/异根在外部动作前停止，dry-run不写。机器级CPU协议未改，不设中心派单器、不以CPU空位抢发布。

## 检查与原失败

| 范围 | 实际结果 |
| --- | --- |
| 生产tsc（既有Node PATH、生产tsconfig、同npx所用编译器） | 退出0，tsc.log |
| 公共定向：test_release_order + test_release_checks | 22/22；含检查中第二发布排队、冻结保留、失败/放弃/完成、数据复用/消费者失败、源码/预像变化、缺依赖/知识/余量/输入漂移、未跟踪知识/源码、纯数据入口 |
| kit定向：test_release_order + 原board/watchdog/project-contract/claude-inbox | 90/90；新增4项覆盖派单等待/汇总、Roy评论、坏probe、只读 |
| diff检查、kit源码gitleaks | 退出0；公共完整增量、明文日志/材料及发前正文另扫 |

未跑完整Vitest、未增加重任务等位者；agent/tests/board-resources.test.ts只增加新Python定向入口，完整组合仍交集成员沿原窗口。旧#39/#41/#40来源和原失败均保留，不据本轮定向绿认定最终组合full或自然采用。

首轮夹具发生回执路径重用/锁错误类型断言不匹配、以及误以为在位ops也不能自动接续的断言失败，修夹具后原范围通过。随后新增未跟踪源码门把运维锁当源码，22项出现10败1错；修为实际源码/配置扩展及可执行文件分类，保留真实未跟踪源码负控，最终22项全过。`public-first-failure.log`、`public-input-guard-failure.log`与最终日志分别保留，早期无落盘原输出按observations.json登记，不伪造raw日志。未以重跑覆盖上述失败。

## 文档、复盘与采用边界

[角色说明、plan字段、命令与18:39–19:36对照](../../../docs/release-assembly.md)，同步到流程发布一节、架构与AGENTS。对照保留原6败/221快照差异中断/固定5秒超时/R412插入事实；新预约若已启用应挡第二发布，源码未部署时不能追称已挡。Roy关于bb1c16通过后复用的授权与原角色回执按链接引用，未推定该原full最终通过或替原ops上线。

新门默认关闭。原ops先核实际原检查/冻结与唯一入口；历史v1/自定义回执缺v2输入指纹时不自动升级。可按原明确授权收尾当前事务后，在无在途发布自然边界迁移启用；不能把本轮开发测试当当前生产已具门禁。实际命令仍须保留原K→L内预像/绑定/自然边界再核、发布版本/通知、启动pin与首局核回。未触ops prompt，不需在途会话热切。

回退停止新增预约/派单，核清在途命令后沿原owner关闭release开关并恢复受检入口；保留queue/history、failed/uncertain、所有full/定向/数据证明及快照，不删锁/预约来重发。不能只回退派单器而让发布入口绕行。各项目仅安装自己的精确kit和门，相同上游版本同步炉石#24；不替其部署。

公共源/配置/文档变更10份及私有4份详见inputs.json；另追加本材料和decision-log。本轮未修改main/live/STOP、真实发布队列/收件箱、共享安装/开关/pin、账号或其他会话，未运行play/模型/生产刷新。原最终组合full、#39发布与真实采用验收仍待原角色完成。
