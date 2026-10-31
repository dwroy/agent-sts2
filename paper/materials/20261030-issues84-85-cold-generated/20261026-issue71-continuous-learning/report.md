# #71 持续整局学习库存交付

基线 `16f66e76ad49e65df75a2efd88685b56fb86294d`，独立分支/工作树 `issue-71-a10-continuous-learning`。本项提供后继库存与覆盖基础设施；无游戏结论、无 K1 类型/schema 或脑工具变化。#72 继续拥有整局研究类型、存储/候选合同与本地只读查询，交付公共叶按固定提交串行。

## 结果与边界

原外部入口之外增加独立的运营库存 overlay。原 Silent tick、原派发结束与完成回调低库存时各最多生成三个不可变计划；目标每单元40条完整轨迹、维持三个可执行后继，按字节/上下文拆小。先当前精确build，再分版本/build处理；按观察簇、阶段、胜败轮转，已对齐的自有失败簇仅影响选窗，不进入外部分母。

单元按匿名投影内容 SHA、版本、完整窗口、任务类型去重，固定问题与有序窗口生成稳定 plan/unit ID。库存先 fsync/原子提交，实际启动仍由原 writer、注册屏障和 checkpoint 负责。计划预留、原生启动、实际页面读完、待提炼/排除/候选、K1发布、待消费者分别记账。全页必须见于绑定原生 turn 的工具回执，不能由 processed 或报告自填替代。

七个 ROOT 运行源码叶：

- `ops/codex-ops-learn.py`：原 external 完成回调补货/状态投影。
- `ops/learner_jobs.py`：仅 Silent 原准入位置低库存补充。
- `ops/strategy_external_jobs.py`：旧队列之后拼接运营计划，沿原 validator/ready/dispatch/prepare；派发后补足库存。
- `ops/strategy_backfill_jobs.py`：只对新 stock 绑定核报告中的阅读/提炼分账，保旧报告合同。
- `ops/external_stock.py`、`ops/external_stock_source.py`、`ops/external_stock_cli.py`：库存/覆盖、既有匿名投影导入、一次性登记/只读状态/原绑定窗口读取。

其他执行叶只有本项 Python/Vitest 固定测试与既有 publication 注册夹具的两条新增依赖复制。`.gitignore` 忽略本项一次性运营控制；生成计划与数据在原忽略 state-dir，内容批不需要 Git/full。广域轮次源码/测试 SHA 见 `frozen-inputs.json`，最终源码见 `final-inputs.json`，检查方法见 `check-method.json`；七ROOT叶及继承依赖见 `delivery-leaves.json`。共享叶按固定提交合并后核实际组合SHA，不整叶覆盖并行改动。

LIVE部署叶为零。不改旧队列/计划/失败/绑定、K1知识schema、#69网络引擎、对局脑、whole-playbook消费者、live/STOP、共享权限、账号、服务档、预算或并发，不运行 play，不关闭其他会话，不分配游戏发布号。Ironclad 无补库存接线。无新依赖、模型调度器或定时器。

## 保留门与真实状态

原#54全部160个代表窗口保守保留，含旧c3；不把它们算已读。登记还逐SHA扫描旧A原manifest声明的aggregate/selection，额外完整窗口同样预留；缺稳定身份拒绝登记，不因旧未核启动推定未读。更广缓存才作为新库存。原记录尚未有可核读证、失败、lost、native不明退役、hold、逐窗blocked及旧A来源范围变化均不会重派已预留窗口。库存缺失但原batch还在时停止，须恢复原库存；不通过新ID或新generation绕过原owner。B/C/D旧计划继续原入口。

没有在本开发树登记或启用生产控制。开发读核过原#54现有160代表记录的结构；没有在文档所载主根路径找到safe-cache原receipt，因此没有导入真实原缓存、补写生产库存或编造可学数量。原ops部署时沿原回执定位既有缓存，不重抓数据、不读原库。本次所有准入/派发/回调验证均为小型匿名固定夹具，非自然运行验收。

状态简报含采样时间、缓存独立记录/保守预留/未分配、已读独立记录、ready计划/记录、原worker存活与退役、最新产出、发布批次和被引用窗口。只在实际K1 receipt、候选字节SHA及窗口引用都吻合时计被引用发布证据，消费保持pending；不把同批其他输入全部计入库。状态与恢复合同见 `docs/external-learning-stock.md`。

## 检查与失败原件

最终适用检查见 `checks.json`：生产tsc0、本项28项Python、10文件50项Vitest及单fork paths 11项均过，11输入叶无漂移，已核自有检查父PID退出。本段不以定向绿代最终组合full。当前已独立完成生产tsc（exit0）、本项28项Python固定测试、原外部22项，以及publication注册4项复验。原8文件定向首轮为7文件通过/1失败，38项通过/1超时；失败包装器30秒到期，原因是复制运行夹具未带新增模块，原stdout/stderr保留于 `targeted-vitest.log`，夹具只补两模块复制后原4项直接通过。原任务自身测试首轮发现A来源范围变更仍暴露旧库存，已补保留门；工具结果带code-mode外层文字时最初不能识别完整页的固定反例也保留，补完整JSON行解码后原23项通过。最终增加精确build分批、原库路径读前拒绝、一次性登记、旧声明窗口保守预留及未配置只读保护，28项通过。

广域轮次实际644文件/5939项通过、2项失败：旧只读断言发现未配置时新增external_stock状态，已修实现、原断言保持；另一项是稀疏检出缺少既有issue29 results.jsonl，按原HEAD精确blob恢复。首轮原件及后继独立复验分别保留；广域后的四叶差量仅本项core/CLI/source/测试，最终实际ROOT组合full交原集成，不称最终代码全绿full。

`original-external-tests.log`、`stock-tests-r*.log`、`native-envelope-before.log`、`stock-tests-final-v*.log`、`publication-pipeline-recheck.log`、`tsc.log`、`targeted-vitest.log` 和后续沙箱日志在原材料目录保留。两次编辑命令误用了agent子目录，报源文件路径不存在、未改执行源码；随后在原根修正，tsc本身均返回0。不删除失败或把局部复验说成原首轮全绿。

## 原集成/ops接续

原集成员按固定HEAD与交付叶核实际ROOT组合/唯一完整检查，保留69/70及其他在途工作；LIVE无源码。只准备固定board请求，不调用生产tick、安装或authority，不抢原唯一full/发布。

原ops先核实际部署七叶，按 `docs/external-learning-stock.md` 一次性登记原安全缓存/原投影/原分母/历史保守预留，再等待自然tick。至少连续两个不同输入单元自动接续，且至少一批真实提炼→原K1 runtime发布→生产本地工具读回。须留原batch/PID/原生turn、完整页、退役、输入SHA、实际发布/工具正文。手写第二计划、固定测试、启动或退出0不能代验收。

收益继续按正常Silent A10生产结果、引擎、首次尝试和SL终局分账；不为验收开局，不关闭#51等科学父。原ops已在补三批旧机制库存及69真实联网单元，本交付不替代其进展。

回退本控制enabled即可停止新stock准入，保留在途原合同/owner、库存、对象、候选、K1和全部日志。若需源码回退，待原在途停点后走原集成流程；不删现场、不改live/STOP。工程接收、自然运行和收益分别验收；本开发线程/树保留供具体返工恢复，不登记retention完成。
