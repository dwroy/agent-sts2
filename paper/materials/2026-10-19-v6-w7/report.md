# V6-W7 商店与休息 Jev 路由

记录时间：2026-10-20T01:46:59.610210+08:00。工作树 `.worktrees/v6-w7-20261019`，分支 `v6-w7-20261019`。代码与完整检查已完成；受测基线 main `435dadad7`（含 W3 `a92e8b37f`、W5 `abe8c7c2a` / `815535dbb`）。实际 main 集成提交由 decision-log 与交付回报记录。

商店买牌、买药、删牌及休息升级、回血已接入代码选项、W3 组合投影、Jev 选择和一次合法兜底。`runLoop` 默认复用 `env.v6Projection.context(env,"pick")` 的开局冻结工厂与实际现场，通过同一前台锁调用 `evaluateRequest`；显式测试注入仍优先。未复制历史包、路线模型、模拟器或拿牌路由。

选项按实际库存、金币、HP、牌与药水槽位构造完整资源变更；删牌/升级保留原有 PendingPick 和身份闸。缺字段、未支持的遗物/其他资源效果、未知药水结果均保留原因，不当成不变牌组，也不补零。丢药后重读现场。题面按 option × direction × combo × target 输出数值、n、误差、可信度和模型标签；完整来源与工厂拒绝原因保留审计，观察指标仅作描述。

计算和 Jev 分别独立最多 5 秒。获取上下文、构造请求、等待前台锁计入计算额度，获锁后重新检查取消和剩余时间，不重新补满预算；迟到表不记录或发送。Jev 失败、非法回答或超时仅走一次合法兜底，不调用大脑。升级/删牌后续动作记录实际 Jev 或 code-fallback 来源，不误记 DeepSeek。

`V6_BUILD=on` 且 `V6_SHOP_DECIDER=jev` / `V6_REST_DECIDER=jev` 才替换对应路由；两类默认仍为 brain。off/shadow 或对应开关关闭时不访问房间投影提供器。五角色题面及解析动作与 W7 前 `7aa094344` 的独立 SHA256 基线相同。

完整检查：`npx tsc -p tsconfig.json --noEmit` 退出 0；`npx vitest run --maxWorkers=1` 退出 0，589 文件 / 5650 项通过、2 项跳过，1590.90 秒。定向 10 文件 / 182 项通过，覆盖 W7、W5、共用运行时/工厂、五角色 off 等价及旧商店/休息路由。受测 1441 文件 SHA 清单与当前工作树一致，源码与 index 字节一致。最终 gitleaks 结果写入 `checks-production/result.json`。

首轮完整检查在四 worker 下有 4 个既有 Python `spawnSync(timeout=5000)` 用例超时（588 文件 / 5646 项通过）；原件保留，本轮只降低并发，未改源码或时限。较早的重复 import 与扫描 SHA 清单误报同样保留原件和独立重跑，不改扫描白名单。历史接口等待状态保留于 `pre-integration-report.md` / `pre-integration-interfaces.md`，早期检查保留于 `checks-pre-integration/`、`checks-after-factory/`；最终日志、SHA 与结果在 `checks-production/`。

本功能只交付 main，下一局的开关、live 同步、release 登记及上线读回由 ops 处理；回退为对应 decider=brain（或 V6_BUILD=off）。正式发布后由原调度器核实 main/live 并登记工作树回收，当前保留工作树。固定数据与脚本化 HTTP/Jev 验证不能代表自然对局收益；本次未开局、未发 W7 真实模型请求、未修改投影模拟、正式知识、共用 Codex 配置、STOP 或 Regent。

第三轮小脑已按授权派发且结束，详见 `../2026-10-19-v6-reflex-distill-r3/`。启动档位核实为 codex1 / gpt-6.1-sol / xhigh、240 分钟；产物仅 scratch/pending，78 数值 / 7 tag，`complete=false`。缺计划证据与观察元数据消费者合同仍需原流程接续，正式发布任务由 ops 负责；没有续派。
