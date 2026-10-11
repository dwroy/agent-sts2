# 主 ops 的只读辅助 session

Roy 2026-10-11 授权主 ops 开辅助 session。主 ops 自行拆分核查任务，经原 broker 显式启动，最多同时 2 个。没有按积压自动扩容、定时器或第二个运维主控。已有人工/内置子任务领取的事件不再重复派给辅助。

辅助仅审计积压事件、固定源提交及合入前提、已授权请求状态。所有合入、代码/知识/台账修改、上线登记和生产动作仍由主 ops 串行处理。辅助不产生游戏知识，不启动学习者，不再派发，不消费原事件。

Roy与watcher在框架正常运行后负责持续观察、讨论改进计划，以及获批的架构和运行流程迭代；最高权限不作为日常接管运行的理由。辅助任务的拆分、派发、验收和后续生产处理由主ops负责，watcher不亲自代办对局、学习调度或运行处置。本能力的生产验收也由主ops经既有入口执行，watcher核对真实回执。

## 派发

主 ops 在主检出的 `ops/codex-ops/assist/requests/<request-id>.json` 写请求。ID 必须以小写字母开头，后接小写字母/数字/连字符，共最多 48 字符；包括失败在内的已用 ID 永不重用。

```json
{
  "request_id": "ops-infra-audit-20261011-01",
  "character": "silent",
  "kind": "request-status",
  "objective": "只核实这个基础设施请求的当前状态、缺失回执及下一步，不执行修改。",
  "inputs": ["notes/example-infra-request.json"]
}
```

该示例路径是占位符，先换为实际待核查文件。`kind` 限 `event-audit`、`source-check`、`request-status`。`source-check` 必须再提供 `source_commit`（40 位小写 SHA）。宿主保存该固定提交的有界 `git show --patch --stat`，禁用 external diff/textconv，并记录冻结时 main/live 的 HEAD、源是否祖先；当前工作树文件不是固定 SHA 的源码。祖先成立本身也不证明完整检查或上线登记完成；祖先不成立也不能证明未集成，cherry-pick可能产生不同提交，应记录限制并由主ops核对实际补丁与登记。

`inputs` 为 1–24 个主仓相对路径；事件直接列原 `ops/codex-ops/queue/<时间>-<类型>.md` 或 `delivered/` 路径，保留原 ID。允许 ops、notes、paper、learner、knowledge、docs、agent 下的 UTF-8 文本（md/json/jsonl/out/err/log/ts/py/sh）；拒绝隐藏路径、node_modules、符号链接、越界、角色目录或显式 character 字段冲突。文件和固定 git 证据合计最多 240000 字节，不自动截断；超限应明确拆任务。跨角色或过大的共享汇总，先由主 ops 准备带原路径、SHA和角色的必要摘录。不要把敏感资料放进请求或证据。

```bash
bash ops/codex-ops-do.sh ops-assist ops-infra-audit-20261011-01
bash ops/codex-ops-do.sh ops-assist-status
```

原 broker 只在主 ops wake 期间运行。白名单改动从下一 wake 加载，第一次调用必须核实际回执。派发返回 starting/running/launch-uncertain 只表示启动状态；不要同步轮询等待辅助完成。辅助结束把 `ops-assist-done` 放入原 queue，原调度器下次正常处理。status 是宿主核对 PID 的入口，可回收已死的槽位；沙箱里的 `ps` 不能代替它。

两个不领取当前游戏积压的基础设施示例已在 `ops/assist-examples/`：固定 `acf2611db281456c63915a98b0995d3d04bcd35a` 的 Herdr派单恢复，以及 `62c22f7c764fd3def66c7c16a7f034095ddd7bf6` 的归档修复。上线后主 ops 可复制对应 JSON 到 requests/，分别调用同名 ID；它们尚未派发，先核ID未用过。

## 权限和回执

复用 learner 的 Codex 命令、模型/强度/tier/context 默认、隔离环境和 key 自检，专用 `ops_assist` profile 只包含 Read/Grep/Glob：整个文件系统只读，仓库、live、/tmp、请求、队列均无写权限；不联网，已知 key 和 env 文件不可读，关闭 MCP/插件/多 agent。模型只可按任务读取冻结输入并在 stdout 返回 JSON，宿主负责写报告。

**角色及冻结证据范围由输入校验和任务约束保证，不是业务文件的操作系统读隔离。** 这个成熟 profile 允许读取其他非敏感文件；不为辅助放开写权限，也不声称整个宿主不可见。辅助不能把可读性当成使用其他角色资料或外部知识的许可。

每任务原件在 `ops/codex-ops/assist/jobs/<id>/`：request.json、input/manifest.json、输入原字节、state.json、history.jsonl、启动输出、原 stdout.jsonl/stderr.log、失败和 report.json。manifest 含请求SHA、原路径/事件名、各文件SHA、冻结时间和输入摘要；模型前后都核SHA，运行中外部改动会拒收。

只有 rc0、真实 thread/turn 完成、最后模型 JSON 回报匹配 ID/角色/输入SHA、至少一项引用实输入的核查事实均成立，才记 completed。blocked 是保留的未完成核查，rc0/排队/空回报均不算完成；completed 也不关闭被核查的原请求，不登记 shipped。主 ops 必须重新核对已变化现场，再决定处理。事件恢复同时查 queue/delivered，保留同一事件名，不把辅助回执变成原事件的处理回执。

## 宿主和故障

跟随既有 `hosting` 的 learners：herdr 时建立 `ops-assist-<id>` tab，沿既有 helper 跟主 ops 所在 workspace；tab 显示任务ID、阶段、wrapper/engine PID及输出/报告路径；终态沿既有 helper 延迟关闭并把最后输出存入 herdr-panes.log，不额外启动 tail/watcher。orphaned 状态保留 tab 供主 ops 排查。不可用时安全退回 setsid；Herdr run 已发出却失败/超时会保留 launch-uncertain，不再另启一份。120秒未认领可由 status 回收，晚到 worker 会拒绝执行。

任务由 nice 19 启动；宿主包装器和模型进程使用既有工具链，不开输出 tail 或 watcher，模型每次只做一个同步只读命令。引擎独立进程 session，保存 PID/starttime/boot/UID；包装器退出而原生子进程仍活时保留 orphaned 槽。30分钟模型超时按已核身份 PID 终止，清理完成才释放槽。启动失败、死PID、错误完成、原始失败文件都保留；重试必须新 ID 并说明原 ID。

不新增自动清理或归档调度；主 ops 可将这些只读核查原件按现有归档流程保存。功能回退：停止新派发即可；在途只读任务可自然结束，主 ops 继续原工作流，不更改对局。

固定验证：`nice -n 19 python3 -m unittest discover -s tests -p test_ops_assist.py -v`；`agent/tests/ops-assist.test.ts`；宿主运行 `nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs tests/ops-assist-sandbox-probe.ts`，只使用临时固定夹具和真实 Codex sandbox，不调用模型或游戏。
