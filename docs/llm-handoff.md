# Agent 的 LLM 切换协议

Roy 2026-10-11 授权：框架把切换 LLM/账号作为标准能力，采用 drain，保留任务、证据、队列、授权和权限。第一项实际适配是 Codex 的 `codex → codex1` 账号切换。`ops/llm_handoff.py` 定义供应商无关的事务，`ops/llm_switch.py` 提供 Codex 适配器和一次性控制进程；它不是第二个调度器，不自动根据额度反复换号。

## 状态与边界

`prepared → draining → ready → activating → verifying → activated → complete`

1. **预检**：目标 profile 只保存 engine、账号标签、model、effort、service_tier、隔离 home 路径和交接文件路径。凭据只引用已登录位置，不读取或复制到交接。目标模型可用且 key 隔离检查通过，才允许 prepare。
2. **停止准入**：在原 learn.lock 下设置归本事务所有的 `LLM_DRAIN` 和 `PAUSE`。原 cron/wake、手工派发、完成回调、boss 校准、辅助会话和下一局启动均停止新增工作。已开始的学习仍可完成、合入、检查和写回原事件。
3. **排空**：等待对局、报告、学习 wrapper（包括模型完成后的宿主检查）、辅助进程和旧账号模型进程自然结束。ops 完成本轮并写 `ready_to_drain` 及原会话 ID 的交接后空闲。PID 不可见不等于完成；未结算批次、身份不符、盘点失败均保持 draining。
4. **切换**：重新持 wake/learn/assist 锁核验无在途工作。只让已空闲的旧 ops 正常 `/quit`，核 PID 与启动时间确认退出；备份路径选择器、项目 cron 块、旧 session 标识，安装目标配置。复用 Herdr pane 时在真实 shell 导出目标 home，等该 shell 写回路径回执后才启动新会话（仅传 open-pane --env 不会更新旧 pane）。修改失败则尝试恢复配置及 pane 环境，继续保持准入关闭。
5. **接管验证**：沿原调度器、broker、权限和 ops prompt 新建会话，通过交接文件恢复任务语义。Codex 跨账号使用新 UUID，不恢复旧账号的加密 session。模型、强度、普通服务档、512k 上下文沿用项目既有策略。
6. **释放**：新会话成功完成接管轮、UUID 和目标 rollout 校验通过后，只删除本事务仍拥有的标记。原有 PAUSE/STOP 保留；从原事件队列恢复，由新 ops 沿原 broker 收报告、启动下一局和未完成学习。

**不能用 `ops/STOP` 做 drain**：它也会让 `agent/src/brain/wait.ts` 取消当前模型请求。本协议从不创建 STOP、不发送 SIGTERM、不停止 play、不搬运任务租约或重置失败/退避历史。`run.sh` 只在开始时读取 `LLM_DRAIN`，以 76 表示未启动；autoplay 在局末报告之后退出。正常对局中的模型调用不读取此标记。

`complete` 表示控制面接管完成；验收回执的 `runtime_play_and_learning` 仍为 `awaiting normal dispatch`，直到原 ops 记录真实新 brain/learner 进程的账号配置。启动成功不等于学习完成、效果达标或最终 main/push 完成。

## 标准入口

在主检出、宿主环境执行（沙箱的 PID/Herdr 可见性不足以验收排空）：

```bash
python3 ops/llm_switch.py prepare --id codex1-20261011 \
  --profile ops/codex-ops/accounts/codex1/profile.json \
  --preflight paper/materials/20261011-codex-account-drain/codex1-precheck.json
python3 ops/llm_switch.py status --id codex1-20261011
bash ops/herdr-host.sh run llm-switch-codex1 --close-on-exit -- \
  nice -n 19 python3 ops/llm_switch.py run --id codex1-20261011
```

事务保存在忽略目录 `ops/codex-ops/llm-switches/<id>/state.json`，另存原 session 标识、bootstrap 日志和 PID。一个 ID 绑定一个目标摘要；禁止并发控制器、篡改已预检目标、覆盖另一事务的 drain。

示例 profile（实际绝对路径由当前部署确定，不含凭据）：

```json
{
  "engine": "codex", "account": "codex1",
  "model": "gpt-6-astra", "effort": "xhigh", "service_tier": "default",
  "learner_home": "/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex1/learner",
  "brain_home": "/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex1/brain",
  "handoff": "notes/codex1-drain-ops-handoff.md"
}
```

Codex preflight 文件是两项原 `checkCodex` 结果 `{role, home, check}`（role 为 learner/brain），learner 另有 `key_check.ok=true`。检查针对实际隔离 home 执行；home 不加载全局 AGENTS/hooks，auth 仅软链接到本人已登录账号，原 key deny 规则解析软链接真实路径。

## 中断、失败与接续

- prepared/draining/ready 可用**同一 ID**重新 run；等待默认最多六小时，超时保留闸与现场，不杀在途任务。
- activating/verifying/failed 禁止自动重跑启动。先核对持久化回执、bootstrap PID、实际 session 与配置；可能已经创建会话时不能猜测失败、再建第二个。由 watcher/ops 依据真实身份修复后接续，原失败记录保留。
- 目标校验失败时拒绝回落到其他模型、账号或更低权限隔离。配置回退失败也明确记 failed，不释放准入。
- 普通 `unpause` 无法绕过 LLM_DRAIN。释放前检查所有标记所有者；他人改过任何 owned 标记时全部保留，等待核对。
- 手工原有暂停继续生效；resume 事件留在原队列等待正常授权。不要为了验证新账号而撤销原有 STOP 或额外发起学习任务。

## 新供应商适配合同

通用 `Handoff` 不选择供应商，也不启动模型。新适配器须实现 `backup(state)`、`activate(state)`、`rollback(state, backup)`、`bootstrap(state)`；提供目标能力/权限预检、全部在途进程清单与 checkpoint、新会话身份和真实配置验收。是否允许复用 session 必须由适配器明确证明，默认新建并从交接恢复业务状态。

当前 CLI 只开放已实现的 Codex 账号适配，且不改变已授权 Astra/xhigh/default 策略。其他供应商或模型 profile 会显式拒绝；后续需接入对应 brain/learner/ops launcher 和测试后开放，不能只改 engine 字段就声称完成跨供应商切换。

固定测试覆盖完成回调继续落盘、准入拦截、原队列保留、边界启动、配置选择器、并发互斥、所有权、失败回退、重放和身份验证；生产换号另外保存宿主排空/新会话及实际消费者证据。游戏规则与知识不在此变更范围。
