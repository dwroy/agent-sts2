# #84 工程交付：固定 producer 输入、同事务准入、告警和 outcome 补算

基于主管指定 `main 9b0cf5955`；原方案和输入核查记录已接到该基线，原提交另留 `refs/heads/issue-84-proposal-original`。五项作为一个源码交付请求，不拆发布批次；#77 准备完成时由原集成员决定同批组合。

批准原文见 `approval.json`。本开发只在原工作树实现与固定数据自测，没有部署或写生产 control/main/live/STOP，没有运行 play、生产补算或控制其他会话。

## 最终行为

1. 每个 producer 固定代码入口/边/审阅字节/opaque site，静态缺边、动态变更、缺叶拒绝。普通代码来自 LIVE、验证适配来自 ROOT，不能补借缺叶；outcome 实际闭包15叶、没有 agent/src。ROOT 核心验证器的函数内静态导入也检查。药水两份真实 TS 文本输入与校准原宽冻结保留，不改变铁甲统计或游戏规则。
2. 原工程最终组合回执生成固定材料，原 publication write 在部署前核前像，部署后用新进程加载实际已安装验证器，CAS 准入、持久回执，完成才 release。缺材料、漂移、冲突、中断保留 marker；同事务恢复不重放部署命令；control 已改而回执未落盘可接续；旧事务不自动转换。
3. 原 refresh/stall 记录实际 step/cycle 与明确终态，三连败/12小时告警向原主管箱追加一行并去重。取消/缺终态不冒失败，同 request 不增周期；成功重试另记 recovery，保原失败。发布水位只取原 D1 数据/完成回执，观察时刻和 unchanged 不补成新发布；完成回执晚于 pointer 的竞态有独立核收。
4. 新显式 LogDB outcome 模式先同步、固定原 manifest/shards/raw prefix 和 SHA，按原 off/len 交原 reducer。全量结束局、实际纳入统计局、旧切点后两种局数及缺状态/时间未知分账，不能把三个历史 D1 当独立分母。
5. 工程后续和自然验收分别留给原集成/ops，见下面步骤。开发报告、固定回放和预览不代生产准入或新 D1。

合同与命令：[docs/fixed-producer-admission.md](../../../docs/fixed-producer-admission.md)。实际固定 HEAD/保留源分支见本工作树准备的 delivery 请求和 #84 交付评论。

## 生产只读预览

最终 `actual-input-preview-final.json` 固定了 #81 后真实 LIVE `f6ccd3fcc79c2527acfa1ed7da183e311ec84764`；它是 `2e179cba...` 的记录后继，相关源码没有变化。当前启用 fixed refresh 只有 outcome，原准入仍是 `c15317...`。

从真实 LIVE 只复制10个代码输入，在隔离目录替换本批 outcome 构建器/新增 LogDB 适配器，再配本批5个 ROOT 输入，最终投影方法为 `f50b9ea3c7debe7724ad29e0d36d654791442f252ede0d6f2dc28a5fe8fdfaf9`。采样前后核真实源码字节/HEAD，没有生产写入。先前预览另保 `actual-input-preview.json`，不转为最终准入。

生产原库只读快照：4个 D1 release（含初始基线）、3条 published attempt，精确 ID/request 留在预览原件。最终部署仍以原检查冻结的实际组合和安装后读回为准，不能拿预览 SHA 直接填 control。未启用 producer 的声明必须匹配其将来实际源码，不能为通过检查额外向 LIVE 部署无关模块。

## 检查与限制

- 生产 tsc 退出0，原 outcome `--self-test` 和 shell 语法检查通过。
- 最终核心 Python **70项通过**：完整声明、缺边/根隔离、原发布门、原 learning runtime、同事务恢复/CAS、成功重试留失败、旧请求读原 D1、告警和 LogDB/raw/D1/消费者。
- 原刷新 pipeline **15项**、独立入口 **2项**、V6 报告链 **18项**通过；只补齐真实新增 ROOT 依赖和本地测试命名空间，没有放松原断言。
- 首轮沙箱原件退出1：**651文件中647通过/4失败，6022项中6017通过/5失败**。一项是 #29 冷夹具缺失，三项为旧 fixture 缺健康检查依赖，另一项为 external-stock 包装超时。原失败不覆盖。
- 冷夹具仅恢复 HEAD 原 blob `b84d95c5...`。六文件第一次定向 **24项全部通过**；最终源码复验 **23项通过/1项超时**，唯一未绿是未改动的 external-stock，隔离复验仍触发原15秒包装限制。其原生 Python 入口 **28项/2.993秒通过**。没有改超时、断言或排除名单，不冒最终广域/组合 full 通过。
- 最终18个执行/测试文件的 SHA 在70项核心及最终定向前后无漂移。原日志、早期夹具/加载上下文错误、修复复验和文件 SHA 见 `checks.json`；完整 stdout/stderr 留在本树 `.cache/issue84/`。

本摘要不能作方法准入的 engineering receipt。原集成员仍须冻结实际 ROOT/LIVE/依赖组合，接唯一完整检查；其原60秒 testTimeout 合同不在本开发中改写。external-stock 包装的运行表现随原件交核，不伪称已解决该项耗时原因。

## 部署图和后续顺序

ROOT+LIVE 三叶：`knowledge/builders/build-outcome-stats.py`、`outcome_logdb.py`、`refresh_driver.py`。

ROOT 七叶：`ops/learning_runtime_data.py`、`fixed_producer_methods.py`、`fixed-producer-dependencies.json`、`fixed_method_admission.py`、`publication_gate.py`、`refresh_health.py`、`codex-ops.sh`。测试只在 ROOT，逐项见合同。声明 JSON 是工程能力，不能走纯运营数据发布。

1. 原集成员按上述映射核最终组合、所有适用宿主/消费者/完整检查。可以保留 #77 同叶修改后同批，但涉及本方法输入时也须核新声明，不能自动重写 SHA 补绿。
2. 原 ops 自然边界沿原 publication admission 开新事务；准备固定方法材料，部署/核安装/准入并留回执。旧 f6e 中间态与旧失败不转换。
3. 准入后优先一次新 request 的 `outcome:silent --outcome-logdb`，旧切点取原最后 published 的精确带时区时间（10/26 01:47 后的新增数量单列）。核原4个 release/3条 published 未变、新 D1、全量与切点后局数/限制，以及真实消费者 D1/内容 SHA。可在 write 已退 K/L 而最终 release 前完成；原资源门拒绝则保原状态，不强 tick。
4. 沿原 release/发布记录流程收尾；下一次无关 agent/src 正常 LIVE 发布核 outcome 方法不变且成功刷新。此自然验收继续开放，不关闭科学父要求。

回退必须由原 owner 沿原工程事务恢复匹配源码/准入前像；保留全部方法回执、健康事件、原 D1/失败及新 D1。不要单独回退一个 helper 留混装闭包，不删除或重建原库。
