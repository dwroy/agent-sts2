# 发布组装与顺序

本说明供集成员、ops及沿原授权自行上线的学习者使用。依据[#20补充](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6339964056)。每个项目独立队列；CPU申领仍走统一机器协议，预约不是CPU位，不持生产锁等待资源。

## 角色与切换

集成员在开始组合检查前预约一个稳定id，列全部issue，核完整组装清单并冻结受测树；通过后预约继续保留，将id、plan和原完整结果交ops。ops沿同一id核实际最新live/知识、组装必要精确组合、完成检查后经publish入口执行原有限发布脚本，保留原K→L短锁、预像/绑定保护、自然边界及启动pin/首局核回。学习者的源码及纯数据发布也使用该队列，不能仅因原来有自行上线授权插入当前组合。

默认`dispatcher.release.enabled:false`不改变生产。原ops先在自然边界盘点原检查/冻结/未完成发布，选唯一事务登记并核原件；取得本轮代码与精确kit、核原入口和probe后才将本项目开关启用。不热切模型/会话，不增timer；旧未完成命令必须明确停止新增或迁到入口，源码无法替尚未迁移的手工git命令提供拦截。直接显式调用新queue的预约/publish始终执行门禁，开关只控制原checks/派单器接入。

当前v1/自定义历史检查缺少v2清单指纹，不能自动当作可复用v2证明。原owner可在原明确授权下收尾当前事务，再于无在途发布的自然边界启用；若需迁移，先唯一预约并核完整原输入/日志，保持原授权与原回执分账，不编造绿或在本工具内把旧摘要直接升级。此次开发未执行任何生产迁移。

```bash
python3 ops/release_queue.py --root "$ROOT" request --id high40 --issue 33 --issue 40
python3 ops/release_queue.py --root "$ROOT" status
python3 ops/release_checks.py --root "$ROOT" --worktree "$CANDIDATE" --role integrator \
  --release-id high40 --issue 33 --issue 40 --plan "$PLAN" --receipt "$NEW_RECEIPT"
# 已占预约时第二项返回75并记queued，不申请CPU或执行发布命令。使用新的回执路径续验。
python3 ops/release_queue.py --root "$ROOT" publish --id high40 --checks "$GREEN_RECEIPT" \
  --worktree "$CANDIDATE" -- python3 path/to/original-finite-publication-driver.py
python3 ops/release_queue.py --root "$ROOT" complete --id high40 --source "$ACTUAL_LIVE_SHA" --evidence "$PUBLICATION_RECEIPT"
```

publish再次核原完整/定向证明、当前候选、最新live和知识；原脚本仍须在K→L内重新核预像/绑定/自然边界再修改live。新门不接管原脚本、不移STOP，也不因命令退出0自动完成。complete还核实际live源码/知识与受检输入一致；pin、版本登记和首局回执仍按原发布要求保存。脚本失败保留原结果；不自动回滚或重放。

预约会跨检查进程退出保留。失败、异常退出或publishing回执丢失，先核真实现场，再用`retry --id ... --evidence 原件`或`abandon ...`；核未完成动作后retry允许原事务重新组装检查。abandon是明确放弃，释放后排队者按原登记顺序申请；同一终态id不可重放。紧急发布必须留Roy授权与原预约处置，不提供隐式抢占开关。`status`和派单器probe只读，不创建目录或锁。

## 清单与plan

原ops先持知识锁→live短锁冻结最新知识，工具不构建知识或读取凭据：

```bash
python3 ops/release_plan.py --root "$ROOT" --live "$LIVE" --snapshot "$NEW_SNAPSHOT_JSON"
```

snapshot绑定root/repo/实际baseline、逐份知识JSON的SHA256和模式，保留原件。复制这份冻结知识到组合，预期修改的知识叶必须作为显式交付登记；不能拿旧快照或另一棵树代替。

plan为`release-assembly-v1` JSON。路径均相对主运行根，文件不得含秘密、越界或软链接。每份来源证明必须取已核交付/源提交的真实字节，不能从待验候选回填来“证明”自身。以下是字段示意，不是可直接投产的验收记录：

```json
{
  "schema": "release-assembly-v1", "root": "/project", "repo": "owner/project",
  "baseline": "40位实际live提交", "knowledge_snapshot": "paper/materials/BATCH/knowledge.json",
  "deliveries": {"agent/src/example.ts": {
    "value": {"sha256": "已核来源文件SHA256", "mode": "100644"},
    "preimage": {"sha256": "baseline该叶SHA256", "mode": "100644"}
  }},
  "test_dependencies": {"ops/tests/test_example.py": {"sha256": "已核来源SHA256", "mode": "100644"}},
  "prerequisites": [{"issue": 41, "files": {"agent/tests/example.test.ts": {"sha256": "前置实际叶SHA256", "mode": "100644"}}}],
  "excluded_tests": [],
  "review": {"path": "paper/materials/BATCH/assembly-review.md",
    "value": {"sha256": "审阅原件SHA256", "mode": "100644"}, "dependencies_complete": true,
    "timeout_margins": [{"test": "agent/tests/example.test.ts", "timeout_ms": 30000,
      "observed_max_ms": 4500, "load_evidence": "当前约束负载原日志引用"}]},
  "data_consumers": {"knowledge/common/catalog.json": ["agent/tests/catalog-consumer.test.ts"]}
}
```

新文件preimage为null。清单检查所有未列为数据的候选差异都来自交付/依赖/前置或有理由剔除的测试，拒绝漏带baseline运行源码；已调用的常见Python测试路径自动扫描并要求列全。动态拼接路径、断言前置及未捕获的超时须在review原件人工盘点，`dependencies_complete`只记录该责任，不替代审阅。剔除测试须在候选树实际不存在，并列`path/reason/prerequisite_issue`，不得为了过检查临时降低断言。固定字面量timeout测试须列当前负载实测最大值、配置值和证据；无固定超时的夹具须明确`no_fixed_timeouts_reason`，不能空表默认通过。余量不足或历史偶发超时转#41类修复，不自动重跑。

v2回执保存五项清单实值、完整受测树/运行源码指纹、交付预像、知识清单、日志SHA和前后输入一致。测试期间不持知识/live锁，前后各短锁核快照；发现变化就失败保留，不拿旧绿冒当前。

## 基线仅数据变化后的复用

用新的plan/snapshot/receipt，在同一预约下传`--reuse "$ORIGINAL_FULL_RECEIPT"`。原完整回执及日志必须存在、SHA可核、完整通过且输入未变。工具比较新旧baseline差异、候选运行/测试/依赖/配置指纹以及交付内容/预像；允许的数据限知识JSON（不含builders）和少量发布记录，其他差异保守走full。

符合条件时仅执行tsc与`data_consumers`覆盖每个变化知识文件的定向测试，逐项核最新ops快照；回执为data-rebase-reuse，分别列原full引用、本次executed/results，不伪造本次Vitest完整执行。不同源码或预像需要full；失败/中断/仅定向结果不能充当原full。相同受测树可以exact-reuse，仍重新核清单与最新知识。

仅数据的独立发布仍按原规则免源码全套测试，但先预约并经同一publish门。用`--data-plan "$PLAN" --evidence "$ORIGINAL_DATA_ACCEPTANCE" --checks "$NEW_DATA_RECEIPT"`替代已有full回执，工具拒绝任何源码/测试/依赖变化，并核显式交付、最新知识和原数据验收证据SHA；不声称执行了完整测试。原经验/来源/消费者/版本与通知门照旧。

## 18:39–19:36复盘对照

| 原事件 | 新入口的对应拦截/处置 |
| --- | --- |
| 18:39:20 high+#40第一次联合检查6008过/6败：漏带四个被调脚本、前置断言不匹配 | 组装清单先查调用脚本、前置叶及来源；缺项在申请CPU前失败，不能用两份独立绿代组合绿。原6败保留。 |
| 18:57快照后发现组合未含ops最新冻结知识，221份不同并主动中断 | 同一份ops快照逐项核同；组合开跑前及资源等待后再核，变化则保留失败。 |
| 19:21:13第二次6009过/1败，launch-game固定5秒子进程超时 | 当前负载余量清单；沿#41类问题修夹具/子进程预算并留原失败，不靠复跑判绿。 |
| 19:25:29 bb1c16原组合再次full在途，之后ops独立发布#27为R412，19:36前后确认新基线 | high40预约仍checking，data27请求应queued，publish入口也拒绝执行；digest显示等待。历史门当时未安装，不能追称已拦截。 |
| 已经发生R412数据变更：463份知识中新增5711B策略、catalog来源；29个交付预像未变 | 按Roy后续授权，原bb1c16完整结果**若通过**才复用；R412精确组合补tsc/策略检索题面/catalog/#40相关定向及463份快照核同。若原full失败则不复用。 |

时间与数字来自[ops失败接管](https://github.com/dwroy/agent-sts2/issues/33#issuecomment-6338812184)、[R412发布/原失败](https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6339783295)、[集成员R412快照与在途说明](https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6339910392)和[Roy定向复用授权](https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6339963519)。这些是历史原角色回执；本工具固定回放不代表生产已迁移或上述原full最终通过。
