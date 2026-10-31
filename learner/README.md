# 离线学习者（learner）

2026-10-12 按 Roy 的统一模型要求更新。学习者在对局外读本角色日志，复盘、更新经验、提出并实现代码改动。当前生产使用 Codex，默认 `gpt-6.1-sol` / `xhigh`，normal / 关闭 Fast（显式 `service_tier="default"`），context 上限 512000、自动压缩阈值 460800；启动器仍忽略用户配置。启动器保留 Claude 适配，但现行职责要求 Claude 只观察和与 Roy 对话，不修改或审核。边界见 [学习协议](../docs/learning-protocol.md)，整体职责见 [V4 架构](../docs/v4-architecture.md) §4。

## 入口与产物

#69 的[公开资料研究](../docs/learning-public-web.md)沿原策略槽显式 `write --public-web` 派发：仅获准的 Silent 纯内容批次使用 Codex 内建搜索/页面读取，shell 网络仍关闭；优先复用已下载 A10 库，来源摘要/SHA、原生事件与 runtime 交付分账。普通任务与对局大脑不因本功能开放联网，Claude 暂未接入。

| 路径（项目根下） | 用途 |
|---|---|
| `learner/run.ts`、`learner/lib/` | 统一 CLI；任务渲染、引擎命令、权限、运行日志、摘要与密钥清洗 |
| `learner/tasks/*.md` | 与引擎工具名称无关的任务正文，front matter 配工具权限和默认参数 |
| `learner/pending.ts` | 按角色列尚未并入经验库的复盘 |
| `learner/ledger.py` | 学习账本的 add / update / find / show / fold / check |
| `learner/code_proposals.py` | 代码提案登记、证据/任务链和经验提案覆盖检查 |
| `learner/runs/` | 原始事件流、scratch、报告和提案；运行文件通常忽略，关键证据另归档进 paper |
| `ops/codex-ops-learn.py`、`ops/learner_jobs.py` | 正常派发、批次状态、租约、重试、完成核验及外部检查 |

## 用法

以下是启动器用法，正常批次由运维调度器派发，避免重复领取活任务。示例用 `--dry-run` 只查看任务，不启动模型；A/B/C 需要换成该角色的真实局号。

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd /home/dw/Projects/agent-sts2

# 复盘：工作目录在主检出，代码引用默认指向 live
agent/node_modules/.bin/tsx learner/run.ts --engine codex --task postmortem \
  --character silent --set runs=A,B,C --cwd . --dry-run

# 经验更新：专用空闲工作树；默认 base_branch=main、merge=live
agent/node_modules/.bin/tsx learner/run.ts --engine codex --task experience-update \
  --character silent --set runs=A,B,C --cwd .worktrees/exp --dry-run

# 纯 bug 修复：专用空闲工作树；策略问题另走 strategy-proposal
agent/node_modules/.bin/tsx learner/run.ts --engine codex --task fix-batch \
  --character silent --cwd .worktrees/codex-fix --dry-run
```

| 参数 | 说明 |
|---|---|
| `--engine claude\|codex` | 必填；当前生产使用 codex |
| `--task <名字或路径>` | 必填；名字对应 `learner/tasks/<名字>.md` |
| `--cwd <目录>` | 必填；必须在启动器的工作区内；独立工作树的边界由 `STS2_WORKSPACE` 决定 |
| `--set name=value` | 可重复；填任务声明的参数；缺参数或多传未使用参数退出 2 |
| `--character <id>` | 角色 id；未传取 `CHARACTER`，再没有取 ironclad |
| `--model`、`--effort` | 优先于任务 `model.<引擎>` / `effort.<引擎>`；Codex 缺省 gpt-6.1-sol / xhigh |
| `--max-turns N` | Claude 的轮数上限；Codex 使用超时约束 |
| `--timeout-min N` | 优先于任务 timeout_min；超时按 PID 终止并保留原日志 |
| `--dry-run` | 只打印渲染提示、命令和被去掉的变量名；不启动 agent、不建运行日志 |
| `--with-tools`、`--ascension N`、`--knowledge-dir D` | 显式挂只读 stdio MCP 知识工具；进阶/目录可覆盖默认值 |

退出码：0 完成；1 agent 失败；2 参数/任务有错；3 引擎或隔离预检不可用；124 超时。退出 0、自报提交或 JSON 中的 merged 都不能代替实际 Git/产物检查。

路径由 `agent/src/core/paths.ts` 和启动器解析。`{{project_root}}` 是 `STS2_WORKSPACE`，未配置时为启动器所在检出；`{{logs_dir}}` 默认在这个工作区下。调度器从主检出派发并设置工作区，独立工作树保留自己的源码/知识数据，不能把旧副本当成最新运维记录。

## 任务与默认参数

| 任务 | 参数和当前默认 | 产物与权限边界 |
|---|---|---|
| postmortem | 必填 runs；code_dir 默认 `<工作区>/.worktrees/live` | 追加复盘、CLI 账本及要求的提案；不直接改打法 |
| experience-update | 必填 runs；base_branch=main、merge=live、merge_dir=`<工作区>/.worktrees/live` | 本角色经验、变更记录、关联提案；自测后合 live |
| fix-batch | items 默认 notes/fix-queue-v4.md 未关闭纯 bug；其余合入默认同上 | 纯 bug 与获批架构修复；策略问题移交策略任务 |
| strategy-proposal | 默认 base_branch=main、merge=live、batch=manual；其他参数依渲染任务 | 从本角色证据核实、提案及实现；可报告 waiting/duplicate，无源码改动不造版本 |
| ascension-audit | 由调度器提供已观察等级与局号；base_branch=main | 核结构差异、保存报告和提案；不能推断未观察等级 |
| mechanics-audit | report / summary / monster_db / out 有任务默认；min_n=20 | 只出提案，不自动应用机制 |
| smoke | 必填 run | 只读冒烟 |
| experience-asc-audit | ironclad 专用；默认 merge=no | 历史进阶经验审计，不能作为通用写任务的默认流程 |

boss-sim、静默校准、双 boss、核心组合等专题各有任务文件；角色限制、参数、授权及报告要求以对应 front matter 和正文为准。`learner/proposal-ops-prompt.md` 是早期运维改造建议，不是当前派发流程。

### 角色与节奏

- 内置参数：cwd、worktree、project_root、logs_dir、scratch、task；角色参数：character、character_name、character_dir、experience_path、changelog_path。只允许覆盖 worktree / logs_dir，角色用 `--character` 指定。
- `characters:` 限定任务角色；`{{#is_ironclad}}` / `{{^is_ironclad}}` 按角色保留正文。runs/run 参数中的已知局号与目标角色不符直接退出 2。
- 经验从本角色对局学出，数据只在 `knowledge/characters/<角色>/` 读写；没有知识时保持空，不混用其他角色。没有角色字段的历史局按 ironclad 处理。
- 当前调度器按角色批复盘（最多 5 局），有待并复盘即可派经验更新；旧「每 10 局并经验」是早期节奏。自动策略复核另在升阶或新增 10 局完成复盘时触发，并消费证据关联代码提案。
- 策略消费者当前两路，各持独立工作树与任务租约，不能重复领取同提案；状态写入及 live 合入/完整检查仍串行。

### 后置经验回刷（#48）

`ops/strategy_backfill_jobs.py` 是统一 `strategy-proposal` 的来源适配器。自然 `tick` 先运行原复盘、经验、注册学习、旧专题、提案、普通策略、修复、校准、Boss 重任务和升阶审计，再考虑回刷；正常来源已经就绪但在等 writer/lease 时仍让行。运行中的正常任务及原重任务候选队列也先行。原两个策略槽、learn.lock、账号选择、磁盘门和工作树锁继续由原启动器管理；不增加定时器或独立经验更新链。铁甲战士的派发行为不变。

来源配置是 `notes/strategy-backfill-silent.json`，随代码交付时 `enabled=false`。集成员核验、ops 精确发布后，ops 沿原发布步骤开启，再等自然 tick；这不是新增审批。首计划 `issue48-boss-elite-001` 直接引用原冻结 manifest/work_spec，每次派发和宿主准备都核全部输入 SHA、原经验 ID/原文及已结束 Silent 锚点；不继承旧专题 ID、旧批次或旧线程。`artifact_copies` 只允许把 manifest 中原引用指向同 SHA/字节数的持久冻结副本；首批 rk 参考使用 ops 已保存的 `rk-task-reference.md`，保留其原临时树路径及 SHA，不依赖原树继续存在。每次注册使用当次真实 batch、独立工作树和 `backfill_source/backfill_binding`，模型请求保持 gpt-6.1-sol/high，实际生效以原生回执为准。

进度位于原 `learn.json.strategy_backfill`，只读投影是同目录 `strategy-backfill-progress.json`。`cursor` 是已核原生接受任务的唯一旧 ID 数；注册 wrapper、提交 prompt 或空 bindings 不推进。TUI 沿原 journal；原启动器退回 stdio 时，只核该 launcher、该账号、该 session 的原生 prompt/context。进度另记实际 batch/session/turn、输入 SHA、原生启动时间、结束及耗时、逐 ID 去向、processed/remaining。运行中只更新独立进度，不改变批次租约指纹；重启从原批次和原生原件恢复，重复 tick 不重计。

首批在原策略 scratch 产出 brain strategy/rk 候选和逐旧 ID 的 `backfill_results`，正式知识与旧经验原文不改。`processed` 只表示有真实候选文件的提炼处置；`waiting` 保留缺证理由和剩余数，不表示已上线、消费者已读回或科学父完成。正式策略、rk 回放门、账本/提案、发布和自然消费继续沿 #27/#28 原流程。缺失、重复 ID、虚构文件或报告身份不符不能完成该来源，也不转成普通提案补链任务。

失败或 waiting 保留原批次，不自动重播。原会话的不确定状态先沿既有工具核查/恢复；确认原 wrapper 未启动模型，或原模型和 launcher 已真实退出后，ops 可增加该计划的 `retry_generation`，下一自然 tick 只领取剩余 ID，同计划最多三个实际登记尝试。完成项不重做，唯一启动游标不重计；缺退出证明或仍有 owner 时继续等待。新的冻结小计划可追加 `plans`，重叠来源同样必须核原租约退场，不能用新计划绕过不确定旧启动。

吞吐验收沿既有调度和批次记录，以 ops 实际发布时刻 T 为切点，比较 T 前后各 24 小时的正常派发间隔、完成产出、等待/失败/重复与槽位占用。配置准备、源码交付和排队都不是 T，不新增观察计时器；#48/#50 的内容入库、消费与收益验收仍开放。

### 任务格式

```yaml
---
title: 复盘
tools: Read, Grep, Glob, Bash
timeout_min: 120
max_turns: 400
effort.codex: xhigh
default.code_dir: {{project_root}}/.worktrees/live
---
```

正文用中文和 `{{参数}}`。工具名仅从 Read / Grep / Glob / Bash / Edit / Write 选；启动器映射到实际引擎权限。模型/强度按引擎设置，单独 `model:` / `effort:` 会报错。最终回报依任务要求含 JSON，代码提案消费必须逐项给出实际结果。

## 自测、合入与记录

Codex 学习者依据本角色证据实现，自测通过按 live 流程自行合入，不另设审核。默认写任务已是 merge=live；未授权架构调整仍交 Roy，证据不足保留现状并报告限制。Roy 2026-10-07 对其原定规则的学习修改授权见 [学习协议](../docs/learning-protocol.md)。

改代码在 agent/ 跑 `bash tools/test-sandbox.sh`（内含生产 tsc 和固定排除的 vitest）；提交前 gitleaks。合前检查 live 刷新的知识和并行记录，持 `ops/live-merge.lock`；实际合入后由调度器在沙箱外补完整 tsc + vitest，发 learner-checks。失败由运维决定回滚或派修复；沙箱限制与代码失败分别记。纯记录/数据不需代码全套测试。

运维核实际合入、登记 shipped、同步 main 与唯一行为版本；学习者提交/合入受阻时兜底。账本只经 `learner/ledger.py`，提案只经 `learner/code_proposals.py`；涉及出牌、药水、SL、终局价值的经验必须有提案链和 check-experience 覆盖检查。规则实际上线后双通知 notes/for-roy.md 与 ops/inbox-dev.md，详见 [代码提案闭环](../docs/learning-code-proposals.md)。

## 权限、隔离与日志

Codex 使用登录态；程序由 LEARNER_CODEX_BIN 覆盖，登录目录由 LEARNER_CODEX_HOME / CODEX_HOME 解析。启动前检查 CLI、登录、模型/强度与密钥隔离；隔离失败退出 3，不降级绕过。命令和权限实现在 `learner/lib/engines.ts`，运行管理在 launcher.ts。

- 权限 profile 为 learner：只读任务不能写；写任务可写工作目录、工作区与临时目录。网络禁用，游戏知识不能从网页获取。
- key 文件、auth.json、工作区及工作树的 `.env` / `*.env` 不可读；启动前在同 profile 内核实不能打开。子进程环境清除密钥变量，日志另做密钥扫描和替换；不打印值。
- 学习者保留 shell 工具和仓库文档，读取 AGENTS.md；这与关闭工具/项目文档的在线 Codex 大脑不同。会话不使用 ephemeral，可保留 resume 历史。
- `--with-tools` 显式挂 `agent/src/brain/tools/mcp-server.ts` 的 gkb，只读知识和日志；工具定义以 registry.ts 及其注册模块为准。服务器不存在报错，不能假称已挂工具。
- Claude 适配保留订阅登录、restricted、工具白名单、禁止 key/play/push 的规则与 MCP 隔离；适配能力不改变现行角色权限。

调度入口显式传入该模型和强度，并通过 learner 专用 CLI 包装器去掉旧租约工作树传入的 Fast 档位；不会修改旧工作树或打断已运行批次。运维和对局同样默认 GPT-6.1 Sol / xhigh / normal / 512k。

每次运行写 learner/runs/<时间>-<任务>.jsonl：learner_launch（命令、参数、完整任务提示）、引擎事件流及 stderr、learner_summary（退出码、超时、耗时、用量与摘要）。失败原件保留，修复与复验另存；摘要和自然语言回报都要核对实际产物。

学习入库并验收后，调度器自动回收过程副本和可重建的独立工作树；必要复查材料先压缩留档并核 SHA，原经验、账本、对局日志、事件流和失败原件保留。报告型待证批次只回收 checkout，过程材料仍在原路径；原线程接续要求不受回收影响。见 [学习者产物回收](../docs/learner-retention.md)。

所有学习批次成功结束后，启动器会自动申请本批回收并释放 checkout 租约；回收结果或暂缓原因写入 `ops/codex-ops/retention/requests/<batch>.json`。学习者无需在仍运行时删除自己的工作树，入库和完整检查门禁始终生效。新独立 checkout 使用标准稀疏分配器，运维/开发功能发布后另登记完成回执；原请求接续、进阶审计和未完成研究不会被普通完成回执关闭。

早期 Claude/Codex 冒烟和 v3 迁移过程保留在 Git 历史及 paper 材料中，只证明当时测试场景；当前生产流程见 [codex-ops.md](../docs/codex-ops.md)。


运维通过 `learners=herdr` 新派的 Codex 批次现在直接打开交互 TUI（#36），原任务、权限/key 预检和日志/完成审计继续。原生回合结束、实际 TUI 空闲且无未发文本、输出持久化并执行原完成事务后才关闭本批 tab；容量/限流按原会话十分钟退避接续，三次无工具进展后交原 ops。发送/退场不确定时不重开、不标完成或回收；旧在途 headless 批次保持原样。传输、落盘回执和操作边界详见 [herdr 托管](../docs/codex-ops.md#herdr-托管)。
