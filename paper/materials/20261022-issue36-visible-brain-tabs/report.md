# #36：可见的大脑 tab

来源：https://github.com/dwroy/agent-sts2/issues/36 ，Roy 2026-10-22 授权。开发基线 `a960e08b3f1f3cb128c327a49789bdcdfd06daab`，独立工作树 `issue-36-visible-brain-tabs`。

## 实现

- 新增 `ops/brain_view.py`：独立 nice 19 只读视图，每秒增量读取本实例 `brain.jsonl`、`brain-wait.jsonl`、`run-config.jsonl`。常驻 tab 标题为 `对局大脑 · <run_id>`，无局号时为 `对局大脑 · 等待开局`；换局更新同一 tab。展示已落盘题目的时间、层数、题型、引擎/模型、请求与已记录原生强度、工具摘要、选择/理由、耗时与异常标记。
- `run.sh` 在自然启动边界异步尝试打开视图，原 `stall` tick 恢复已退出视图。使用独立启动锁和视图锁；已有忙 pane 保留，退出后复用原 tab。无游戏 API、模型调用、工具执行或控制器 IPC；启动失败/退出不会传播给对局。视图不关闭其他 pane。
- 托管器仅改 tab 显示标题，学习 pane label 仍是 `learner-*`，wrapper argv、PID、批次 id、登记键和 agent 身份不变。学习批次及日志镜像标题为 `学习大脑 · <批次> · <类型>`；原 close-on-exit、看门狗、派单及回收识别继续按稳定 label。`never_reclaim` 保留原学习者保护并加入 `brain-view`；`herdr-host.sh status` 同时显示 label/title。
- 开关沿用 hosting 文件：默认 `brain_view=herdr`；`brain_view=off` 只停视图，保留 tab。环境 `CODEX_OPS_BRAIN_VIEW` 优先。写回 herdr 后由下个自然启动边界/原 stall tick 恢复。学习者开关仍是 `learners=herdr|setsid`。说明见 `docs/codex-ops.md` 的 herdr 托管一节。

## 输出边界与证据粒度

工具输出只显示字节数，参数仅展示角色、进阶等白名单过滤值，其余只展示类型/长度；不输出工具返回正文、SQL/查询文本、完整 payload 或模型推理。题面截断到 160 字，理由截断到 360 字；先隐藏凭据、地址、邮箱、外部玩家字段、长标识及终端控制符，再截断。合成隐私 canary 检查及样例 gitleaks 通过，`view-sample.txt` 明确是固定合成数据，不是实盘证据。

原日志只在尝试结束后写 `brain.jsonl`，因此工具调用随该尝试完成后显示；不能看到尚未落盘的中间推理/工具进度。等待事件独立刷新。层数等原字段缺失显示 `?`，未做补推断；耗时区分单条尝试与首选失败，不称跨重试整题总耗时。既有学习批次不迁移/重启，新批次或新开的原日志镜像应用标题。

## 验证

- 最终生产 tsc：退出 0；最终专项 3 文件/30 项通过，Python 固定 11 项通过，shell 语法及 diff 检查通过。早期专项 2 文件/29 项通过单列保留。
- 第一轮完整 Vitest：653 文件通过、1 文件失败；6166 项通过、1 项失败、2 项跳过。唯一失败是 `check-imports.test.ts` 找不到稀疏工作树未展开的旧材料 `paper/materials/issue29-brain-speed/results.jsonl`，不是本次源码改动。原完整日志与失败状态保留；恢复动作前的一次导入专项同因失败，也单独保留原日志。
- 经原 `worktree_storage.py materialize` 只恢复基线精确 blob `b84d95c5185941eec143cbcf2966d5770309cca5`，不改材料内容或检查器。导入检查随后 1 文件/1 项通过；来源与 SHA 见 `fixture-restoration.json`。当时 11 个受测源码/配置/测试/文档输入前后 SHA 相同，初版见 `tested-inputs-initial.json`；补修后的最终输入另见 `tested-inputs.json`。
- 第二轮完整 Vitest 恢复缺件后启动；复查发现计划/路线/商店答案展示不全，本会话按精确 PID 中止自己的该次检查（退出 143，不计通过）。随后只补齐终端答案摘要的既有 schema 字段与固定回归测试，显示路线/商店动作、构筑方向、战斗计划及 summary；不输出 reasoning 字段。最终完整检查退出 0：654 文件全部通过，6167 项通过、2 项跳过（1427.88 秒，nice 19/单 fork worker）；最终 11 个输入 SHA 前后一致。
- 暂存代码及视图样例 gitleaks 退出 0。原检查日志在本材料目录 `checks/`（忽略文件），SHA 及各轮状态见 `checks.json`。最终全部暂存内容及视图样例重新扫描均退出 0；交付评论发前另扫。

初轮专项暴露了测试 wrapper 对启动 cwd 的假设，以及同 inode、同长度日志重写未被识别的问题。已分别改为基于测试文件位置定位仓库、读取末尾锚点检出重写；失败日志保留，后续结果单列。

## 交付与后续验收

Claude 接续指示：当前这轮完整检查结束后即提交交付；在 ops 完成 #33 上线组合检查前不再启动完整 Vitest，重任务窗口留给原 ops。该约束不因本轮结果自动解除。本轮完整检查已退出 0，开发重检查窗口已释放；后续完整检查须等原 ops 的 #33 上线组合检查完成后协调。

本开发会话只提交功能分支并交 `status:review`，未合 main/live、未运行 play、未改 live/STOP、未触碰其他会话。无对局决策或知识变化，不新增行为 release_id。

主运行根原 stall tick 直接读取 main 脚本，视图默认 herdr；为遵守本 issue 的自然边界上线要求，ops 应在集成前先设置 `brain_view=off`，到自然边界再设置 `brain_view=herdr` 并读回（显式环境覆盖也须核对）。本开发会话不改生产 hosting。集成员与 ops 协调该顺序后再集成/部署。自然验收仍开放：一局逐题显示、换局时同 tab 标题更新、新学习批次显示中文标题并结束照旧关闭。固定测试不替代这些读回。需要回退视图时设置 `brain_view=off`；学习标题回退可撤销本次托管器/标题助手变更，稳定 pane 身份始终沿原登记。
