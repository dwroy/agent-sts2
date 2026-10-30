# Fixed producer 方法准入与刷新健康度（#84）

本合同替换固定方法对整个 `agent/src`、builders 的宽枚举。D1、旧方法 provenance、旧请求选择、三个旧 outcome published 及失败不重写；统计方法、角色/进阶/SL/缺帧规则不调整。五项修复同批交工程队列，实际部署与补算归原 ops。

## 方法输入

`ops/fixed-producer-dependencies.json` 是工程声明，不是运营知识或可由模型刷新准入的数据。每个 producer 声明入口、源码叶、静态/显式动态边、审阅源码 SHA 和 opaque call site。`fixed_producer_methods.py` 只读检查字节、静态导入边及声明完整性，不执行被检查模块。源码、动态 import、拼路径、子进程或代码读取变化而声明未同步，直接拒绝；不能只更新文件 SHA 绕过新增 opaque site，也不以宽读整个目录兜底。

调用的源根必须明确：普通 producer 从 LIVE 取代码，实际 `ops` 适配器/验证器从 ROOT 取；校准沿既有 ROOT 当前入口。缺叶不借另一根补齐。方法身份不包含工作树绝对路径，包含来源命名空间、输入 SHA、边与 producer 合同。与本 producer 无关的源码不进入身份。

outcome 当前闭包为15叶（10个 producer/LogDB/缓存代码叶，5个 ROOT 共用叶），没有 `agent/src`。药水确实读取 `potion-values.ts`、`card-model.ts` 文本，只声明其文本读取，不借此递归引入模拟器。Silent 校准原 `model_fingerprint` 确实读取整套源码，保留其原科学冻结；新出现的实际读取叶也须显式声明。执行 TS 的 producer 还固定 package/lock/tsconfig。没有改变铁甲战士的统计或游戏行为。

声明匹配具体受核源码。仅 outcome 已与 #81 后实际 LIVE 源码逐叶核对；未启用的 producer 若映射到不同 LIVE 实现，必须先审计并冻结那个实际组合，不能将 ROOT 声明套到缺叶的 LIVE，或为了方法检查额外部署无关源码。

```bash
nice -n 19 python3 ops/fixed_producer_methods.py \
  --code-root "$CHECKED_LIVE" --runtime-root "$CHECKED_ROOT" --producer outcome
```

这只输出清单和 SHA，不写 control、不准入。原 `learning_runtime_data.py method --root LIVE --producer outcome` 沿执行脚本的 ROOT 读取 runtime 声明；检查隔离组合时优先用上面的双根显式入口。

## 同一次工程发布

集成员先冻结最终 ROOT/LIVE 组合、精确部署映射及检查；原唯一完整检查通过后，使用其 `sts2-terminal.json` 准备方法材料。材料核六项检查 passed、full_runs=1、candidate/两个检查视图、每个方法输入与声明的冻结 SHA，以及真实 LIVE HEAD/方法前像与原检查一致。自测报告不代此回执。

```bash
nice -n 19 python3 ops/fixed_method_admission.py --root "$PROJECT_ROOT" \
  --runtime-source "$CHECKED_ROOT" --code-source "$CHECKED_LIVE" \
  --engineering-receipt "$FINAL_TERMINAL" --output "$METHOD_TICKET"
```

这里只准备本实例根内的新文件，不更新准入。原 publication owner 沿原 `publication_gate.py begin` 建新事务，再在同一个 write 中部署、核已安装方法、CAS 更新 control.methods、保存持久回执：

```bash
nice -n 19 python3 ops/publication_gate.py --root "$PROJECT_ROOT" write \
  --owner "$PUBLICATION_OWNER" --pid "$OWNER_PID" --token "$PUBLICATION_TOKEN" \
  --fixed-method-admission "$METHOD_TICKET" -- <原固定部署命令及参数>
```

启用 fixed producer 的新发布必须带材料，即使预计方法不变也要比较并留回执。缺材料或前像漂移在部署命令之前拒绝。写区保持原 learn→game admission→K→L 顺序和自然终态门，额外非阻塞持有原 D1 publication 锁，避免与其 writer 交叠；不持锁等待资源。只更新现有启用 producer 的 methods，其他 control 字段、D1 库和 launch selection 不改。无须或不得手改 control 补绿。

`fixed-method-publications/<原事务ID>.json` 保存前后 control、材料 SHA、阶段及实际 ROOT/LIVE HEAD。部署命令失败、前像/CAS 冲突、安装不符或中断均保留 marker/原件，不能 release。检查已安装状态后，原 owner 只接原事务：

```bash
nice -n 19 python3 ops/publication_gate.py --root "$PROJECT_ROOT" write \
  --owner "$PUBLICATION_OWNER" --pid "$OWNER_PID" --token "$PUBLICATION_TOKEN" \
  --fixed-method-admission "$METHOD_TICKET" --resume-fixed-methods
```

恢复不接受部署 argv，不重放命令。control 已 CAS 而回执未落盘时识别同一前后像接续；其他并行 control 变化拒绝覆盖。原 gate.recover 验证 owner 退休后换 PID/token 时保留方法事务身份。release 再核回执、control、源码；关闭 runtime 也不能绕过本次必需准入。

新 begin 会记录 `fixed_method_contract`。安装前已有的旧事务沿原合同收尾，不自动转换为新方法事务；其后开启新 begin。未知全局门、STOP/PAUSE/账号/在途会话不转换。新代码对带启用 producer 的旧事务拒绝新的 write，不伪造该旧事务的准入回执。

本次基线要求是 #81 后实际 LIVE，不是 f6e 反事实中间态。开发只读核到 `f6ccd3fcc79c2527acfa1ed7da183e311ec84764` 是 #81 `2e179cba...` 的记录后继，相关源码无差异；部署时仍以最终检查冻结的真实 HEAD 为准，不沿用本次预览或旧 full。

## 连续失败与发布水位

原 refresh_driver 为每个实际选中步骤记录 running 和明确终态，覆盖子程序尚未启动的准入拒绝、启动失败、非零退出与发布异常。不同 cycle 连续三次明确失败才告警；同 request 重放不增加周期，running/取消/缺终态不补成成功或失败。成功后结束原失败 episode，再次三连败产生新告警。

原 refresh 和五分钟 stall 调用 `refresh_health.py`，没有新 daemon、cron 或模型。`refresh-health.json` 与按 step/cycle 固定身份的 events 留证，告警向原 `inbox-claude.md` 追加一行、按 episode 持久去重。写前 prepared、写后 appended 分列，不确定交付不会自动重复发送。

D1 发布水位从当前继承清单的原生成时间、原完成回执恢复，不拿安装时间掩盖旧数据。`unchanged` 是成功刷新但没有新 D1，不重置发布年龄。固定产物超过12小时无发布告警；非 D1 步骤用原 timing/后续明确完成时间检查12小时无完成。原 cycle/失败/计时行不修改。

## 本次优先补算及消费者核收

部署和方法准入完成后，原 ops 优先执行一次新 request；可在原发布 write 已退出、K/L 已释放而最终 release 之前完成，避免下一游戏追加日志使同步截止线立即过期。资源准入、原刷新队列和 worker 锁仍走原入口，不强 tick、不新建模型或游戏。

```bash
nice -n 19 python3 "$LIVE/knowledge/builders/refresh_driver.py" --ops-root "$PROJECT_ROOT" \
  --only-producer outcome --character silent --request "$NEW_REQUEST" \
  --outcome-logdb --outcome-since '<旧D1最后一次published的精确时间，含时区>'
```

该选项只允许显式 outcome/角色/新 request/旧切点组合；原普通刷新参数和旧 launch options 不变。先同步原 LogDB，再在原 read.lock 内固定 manifest、已登记 shards、raw prefix 和 SHA。用 runs_raw/decisions/frames 原 off/len 取回完整原始行，按原顺序交原 reducer。派生 `runs` 含未结束局，不能当结束局分母；默认 query 显示的行数/单元格截断也不能充当数据集。缺索引/分母不齐/源变化/同步落后均拒绝，保留旧 D1。

新输出 `_source_logdb` 留 manifest、各流前缀字节/SHA/索引行数/坏行、shards SHA。`finished_runs` 为角色/进阶筛选后原结束局数，`statistic_runs` 为有状态而实际进入统计的局数；`finished_since`/`statistic_since` 单列旧 published 切点之后数量，另列缺状态及时间未知 ID。旧三次 D1 不是三个独立样本，不能相加。

ops 回执须列旧三次 published 和新 D1/request/method/control、上述全量/切点后局数与限制、真实消费者使用的 D1 和内容 SHA。新旧分账、父要求保持；然后沿原 gate release/发布记录流程完成。

下一次只改无关 agent/src 的正常 LIVE 发布沿同一工程准入事务，核 outcome 方法不变且 outcome:silent 成功发布。固定模拟发布测试不替代这项自然验收。

## 部署映射与回退

- ROOT+LIVE：`knowledge/builders/build-outcome-stats.py`、`outcome_logdb.py`、`refresh_driver.py`。
- ROOT/宿主：`ops/learning_runtime_data.py`、`fixed_producer_methods.py`、`fixed-producer-dependencies.json`、`fixed_method_admission.py`、`publication_gate.py`、`refresh_health.py`、`codex-ops.sh`。
- ROOT 测试：原 `test_learning_runtime.py`、新增 fixture/admission/health/LogDB 测试。LIVE 不安装这些测试或 ROOT ops helper。

回退由原集成/ops 沿原 publication-admission 新事务恢复前像源码与匹配的原 methods/control；保留本次 marker/方法回执、健康事件/告警、所有 D1/旧失败，不删库或覆盖历史。不能只回退一个 helper 留混装闭包，也不能把新 D1 当旧方法产物。旧请求继续原选择，数据版本回退仍用原 D1 显式恢复入口。
