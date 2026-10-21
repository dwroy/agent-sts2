# #20 持久开关与宿主登记接续

来源：#20 原 ops 2026-10-21 21:53 评论要求项目内持久 on/off，默认 off、显式环境优先，仍仅原 stall tick 消费，并给出宿主登记协调路径。沿本 issue 原开发会话/工作树接续；分支从原交付快进至已包含 #20 的 main `6a131e5d550a08ccc96c40944bb3c93ff8218e51` 后修改。未修改 main/live/STOP、宿主 cron、共用环境或 ops prompt，未启动生产派单器。

## 改动

- `.agents/board.yaml` 新增 `dispatcher.control: ops/codex-ops/agent-board-control.json`，文件随原 runtime 目录忽略，不进入 Git。
- `ops/agent_board.py --show-enabled` 只读有效 on/off；缺控制文件默认 off。显式 `CODEX_AGENT_BOARD=on|off` 优先于持久值，明确的 off 也优先；空值/其他值拒绝。读取不创建控制文件或锁，不调用 kit。
- `--set-enabled on|off` 只在本仓配置路径内锁定并原子写入 repo/root 绑定记录，不执行派单、不改宿主登记表或事件账本。设置 on 先核 kit 文件和本地候选登记格式、唯一根与本项目条目；权限范围仍由原 owner 确认。控制记录损坏或异根时拒绝覆盖。设置结果包含 persisted/effective/source，避免环境覆盖时误报。
- `ops/codex-ops.sh` 每次沿原 tick 读有效值：on 只让原 stall 调 kit，learn/snapshot 不重复；off 沿原兼容回收路径。无效控制/环境保留该轮会话动作并写 inbox，不落入旧回收路径。PAUSE/LLM_DRAIN 和 RETENTION 开关保持原含义。没有新增轮询源或修改 cron。
- `docs/github-issues-workflow.md` 写明主管协调各项目原 owner → 确认本批授权范围/实际根/角色及会话绑定 → 指定有权限的宿主登记协调者 → 各 owner 核自己的候选条目及无重复 kit 消费入口 → 原 ops 只读演练、持久启用、首 tick 读回。未获准项目保持 pending，不由 STS2 ops 越仓扫描/认领，不把“同机”当已授权。

## 安装、启用和回退

集成员合入本补丁后，由原 ops 在实际主运行根执行；本开发会话不在生产执行这些命令：

```bash
nice -n 19 python3 ops/agent_board.py --root "$PWD" --show-enabled
nice -n 19 python3 ops/agent_board.py --root "$PWD" --dry-run
# 仅在主管确认本批宿主登记范围和唯一入口、各 owner 核同自己条目后：
nice -n 19 python3 ops/agent_board.py --root "$PWD" --set-enabled on
# 回退：
nice -n 19 python3 ops/agent_board.py --root "$PWD" --set-enabled off
```

原 cron 不带显式覆盖时，下一原 stall tick 直接读取持久值，pane export 不参与。若原 cron 已带显式环境，先记录覆盖来源并沿原调度维护流程处理，不能以持久 on 代 effective on。无效环境/记录会保留会话动作；不要删改原事件账本、派发绑定或 uncertain 来重新派发。

私有 kit 只更新 README：`68c1689adc849765499557a53076f17207274e78` 已经 Windows ssh.exe 推送并核远端。`board.py`、`test_board.py`、`.gitignore` 与 ops 已安装的 `d15456158f0d7d4ad3b48537b034013fa20cb9f1` 逐 Git diff 相同，因此原精确 kit 引擎无需重装；新增功能在 STS2 适配器。README 同步持久控制与 owner 协调说明，没有引擎代码或依赖改动。

## 验证与仍待运行验收

53 项生命周期/入口固定测试通过，含真实 shell tick + 假 kit 的默认 off、跨独立进程持久 on/off、设置不派发、只在 stall 派发、环境双向覆盖、损坏记录不回退到旧回收器；另覆盖重复/非规范根、异根记录保全、无效环境。生产类型检查及 bash 语法检查退出 0。单 fork/一个 worker 的完整 Vitest（含 paths）647 文件、6090 项通过、2 原有跳过，退出 0。具体命令、原日志 SHA 与被测源码 blob 见 `verification.json`；本地 `.log`、`vitest.json` 保留，不把旧交付或集成员检查充成本次运行结果。kit 引擎代码没改，本轮仅更新 README，没有重复其既有 26 项引擎测试。

导入预检查曾因稀疏工作树未展开 #29 原材料退出 1；在完整套件开始前从本基线精确补齐 Git blob，未改数据，见 `material-readback.json`。原件与该结果保留，不能称首次预检查已通过。

实际宿主授权登记、生产持久 on、原 cron 首 tick、实际命名/锁忙重试及回收仍由原角色分项验收；设置命令的机器检查、固定测试和只读排队不代这些结果。本补丁没有填写其他角色确认，也没有修改或自动认领其他项目。
