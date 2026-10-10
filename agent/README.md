# agent：对局控制器

2026-10-10 按 main 核对。这里是 TypeScript 包：从 STS2-Agent mod 的本地 HTTP 接口读结构化状态，构造决策，再经执行闸发送合法动作。战斗由代码求解、推演和 Jev 配合；路线、构筑、事件与计划由 Codex 大脑回答。

项目目标和权限见 [根 README](../README.md)、[AGENTS.md](../AGENTS.md)，当前实现见 [V4 架构](../docs/v4-architecture.md)。[PLAN.md](PLAN.md) 保留上游早期设计及历史章节引用；其中 Jev 单一决策路径、旧版本和里程碑验收不能当作当前生产说明。

## 检查与运行

需要 Node ≥ 20、Python 3 和已配置的依赖；现有工作区不运行 npm install。命令从 agent/ 执行：

```bash
export PATH=$HOME/.local/node/bin:$PATH
npx tsc -p tsconfig.json --noEmit
npx vitest run
# Codex 沙箱内改用此入口（含 tsc，固定排除名单见脚本）
bash tools/test-sandbox.sh

npm run doctor
npm run shadow -- --max-decisions 20
```

doctor 检查 mod、配置、Jev 与大脑启动条件；shadow 做决策而不派发游戏动作，两者可触发模型请求。开发会话不运行 play。对局只由运维的 ops/autoplay.sh / ops/run.sh 从 `.worktrees/live` 启动，保留单实例锁、当前存档和原日志。

| 命令 | 用途 |
|---|---|
| doctor | 检查接口、状态/协议兼容、实际配置与模型可用性 |
| shadow | 决策循环，不派发动作 |
| play | 真实执行；由运维循环启动 |
| record | 录制原始状态，供固定回放使用 |
| replay | 对已录制状态离线重出决策；`--ask` 会实际请求模型 |
| explain | 展示当前状态的 Jev 请求 |
| check:imports | 模块导入边界检查 |

fake-mod.mjs 和 tests/*-data 提供固定接口/状态夹具；不能把夹具通过当作真实对局验证。当前 mod/game/Jev 版本从 doctor、health 和 run-config 核实，旧兼容表只代表当时开发环境。

## 配置与路径

默认配置文件是 agent/.env，模板 .env.example；密钥不进 Git、不打印。配置解释器在 src/core/config.ts；相对日志/数据路径从项目根解析，不从当前 shell 目录解析，见 [布局](../docs/layout.md)。

| 配置 | 当前含义 |
|---|---|
| CHARACTER | 选择角色及 knowledge/characters/<角色>/；缺省知识角色为 ironclad，缺文件不回退到其他角色 |
| TARGET_ASCENSION | 固定等级或 climb 自动升阶；默认战绩与升阶按纯 Codex 成功脑局统计 |
| BRAIN_ENGINE / BRAIN_ENGINE_<题型> / BRAIN_FALLBACK | 历史配置解析保留，生产 createRouter 强制 Codex、关闭引擎回退 |
| BRAIN_CODEX_MODEL / EFFORT / TIMEOUT_MS | 配置名称完整前缀均为 BRAIN_CODEX_；缺省 gpt-6.1-sol / xhigh / 600000 ms |
| BRAIN_CODEX_MODE | exec / session；解析默认 exec，session 使用 app-server |
| KNOWLEDGE_PREFIX | full 为全量适用知识；解析默认 off，实际值查 run-config |
| RUN_PLAN / FIGHT_PLAN / SL_* | 本局计划、战斗计划与 SL 的开关/预算；具体默认查配置与实际启动记录 |
| STS2_WORKSPACE | 主工作区，供 notes/ops 与学习者记录定位；live/开发工作树通常指向主检出 |

Codex Fast 档位在代码中固定 priority，保留原模型和强度。额度/登录/服务或答案校验失败时，在原题等待 Codex 恢复；程序故障停止该决策。不会把这些题交给其他引擎、Jev 或代码代答。详见 [等待与战绩口径](../docs/codex-only-brain.md)、[Fast](../docs/codex-fast.md)。

## 模块与记录

src/core/ 装配配置和 CLI；hand/ 执行循环与屏幕规划；eye/ 记录与回放；reflex/ 战斗求解、推演和 Jev；brain/ Codex 路由、题面、知识前缀、额度/缓存与等待；sim/ 整场模拟及路线事实；memory/ 本局历史/计划；sl/ 终局与重试；knowledge/ 只放知识加载代码，数据在项目根 knowledge/。完整职责见 [架构](../docs/v4-architecture.md) §1。

执行闸在决策时和派发前重新核合法性、动作身份及状态指纹；过期动作重新规划。循环保持一条在途动作、单实例锁、预算和日志。Jev 战斗基线与大脑等待路径各有处理，不能把历史 Jev 回退规则用于 Codex 大脑题。

原始记录在项目根 logs/：decisions、states、runs、brain、codex-calls、jev-prompts、run-config、brain-wait 等。system/知识前缀摘要不能代替逐题完整 system 原文。data/logdb/ 是可重建分析库；[日志库](../docs/logdb.md) 与 [评估](../docs/eval.md) 说明费用、实际引擎、首次尝试和 SL 口径。

游戏知识由离线学习者从本角色对局证据得出，代码修复、上线与记录遵循 [学习协议](../docs/learning-protocol.md)。
