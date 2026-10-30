# #28 怪物出牌条目与离线验证

## #83 第三幕与分 Boss 选择（2026-10-30）

本节接 [#83 方案批准](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6515854107) 和 [逐 Boss 开启授权](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6514971942)，优先于下文 #28 历史“再请 Roy 决定”停点。工程工具交付不代表任何新条目已经验证或可开启。主管已批准同一自有首次尝试留出题的真实 Jev 两臂验证：逐条及拟开启组合的独立局等权胜率差 ≥0、掉血改善 ≥0，新增非法动作/崩溃/超时为0，完整配对结果与命中必须齐，报告95%配对区间和逐局反例；区间跨零注明“经验性不劣”。完整标准与自有模型准入见 `paper/materials/20261030-issue83-boss-calibration/plan.md`。

capture/replay 现在接受第一、二幕 Boss/elite，以及第三幕 Boss；第三幕 elite、第四幕或未知/非整数幕数拒绝。manifest 的 act 与冻结审计必须一致；仍只消费原始结构化上下文和原 Plan，不生成候选或整场结果。

生产由原 ops 在 K/L 自然边界同时设置：

```bash
V6_COMBAT_ENTRIES=on
V6_COMBAT_ENTRY_SELECTION='{"AEONGLASS":["VALIDATED_ENTRY_ID_1","VALIDATED_ENTRY_ID_2"]}'
```

示例 ID 仅为占位，必须换成已通过验证、实际 K1 中存在的准确 ID。选择表仅对 Silent 生效，Boss 键只允许本任务的 `AEONGLASS`、`TEST_SUBJECT`、`THE_INSATIABLE`、`QUEEN`；匹配第一至三幕当前明确存活的原始实体 ID，不拿 run 的下一 Boss 或文本别名替代。无厌沙虫在本批自有来源为第二幕，不将四个 Boss 全绑第三幕。一个表可分别配置多个 Boss 的 ID，库中的其他条目不自动加入；删去某个 Boss 键或置空数组只关闭它，`{}` 关闭全部本次入口。全局 off 始终不加载条目。其他角色仍保持原有行为。

未设置 `V6_COMBAT_ENTRY_SELECTION` 保持原兼容行为（全局 on 加载旧完整角色库）；**不要用删除选择变量作单 Boss 回退**。空字符串、坏 JSON、通配符、未知 Boss 键、重复/非法 ID 会关闭 Silent 入口；当前 Boss 对应 ID 不存在、不是 combat_line 或不适用当前进阶也拒绝，不退到整库。选择表不授予模型可信度或条目有效性，ops 仍核准确 K1/LIVE 与已通过验证的版本；来源/版本变化须核原验证是否仍适用。

run-config 新增可选 `combat_entries`（只在全局 on 或显式配置选择表时出现），记录 requested 与规范化选择/invalid 状态，并进入 config_sha。原决策审计保存实际 Boss、选中 ID 和完整知识来源 SHA；原知识文件与 SHA 不裁剪、不重写。投影拒绝拿旧选择审计套新配置。离线 capture 可加 `--selection '{"AEONGLASS":["VALIDATED_ENTRY_ID_1"]}'`，回放复用冻结选择、核对 Boss 上下文并只评估该子集；不设置仍可验证旧全库回放。改变选择会改变请求身份，必须新实验目录，不能复用原调用结果。

开启/回退由原 ops 执行，登记开关值、ID、K1/LIVE、时间及开启前同口径首试基线。满10场该 Boss 首试过关率低于基线超过15pp，或出现非法动作/崩溃，直接关该 Boss 并报主管；新增超时也停接入查因。满30场报各 Boss 与 F33/F48/F49 首试过关率。下文 CLI 的 `enable_authorized:false` 表示 CLI 不控制生产开启，不覆盖本轮已给 ops 的授权。

目标是由学习者按第一、二幕 Boss 和常见精英提炼 `reflex-entry-v1`，先验证再决定是否发送给 Jev。`V6_COMBAT_ENTRIES` 仍由 Roy 决定；本实现没有改默认值，没有发布条目，也没有自动启用或启动 A/B。开卷只供大脑，Jev 采用 V5 题面和候选。

## 来源合同

`sources` 为兼容旧条目的可选数组；本轮学习任务要求每个新条目填写。各元素严格包含：

| 字段 | 含义 |
|---|---|
| `source` | `own` 或 `external:<名称>` |
| `path` / `sha256` | 仓库相对冻结原件路径、原文件 SHA256 |
| `game_version` / `retrieved_at` | 来源游戏版本、取证日期 YYYY-MM-DD |
| `sample.runs` / `sample.players` / `sample.selection` | 来源自己的局数、玩家数或 null、筛选和缺失口径 |
| `url` | 外部来源必填的 HTTP(S) 原地址 |
| `license` | 可选的已核许可说明 |

`evidence.observations` 与 `source_experience` 保持本系统证据语义。纯外部条目允许这两者为空，但必须有署名外部来源；不能为通过旧格式捏造本地局号。新来源在真实 loader 校验后进入候选 `evidence_sources`，同时保留整个知识文件的原来源。格式检查不证明来源可信或知识有效；学习者需核原件和反例。旧85条与铁甲战士的原题面保持兼容，无 `sources` 时不新增记忆字段。

## 固定回放输入

入口为 `agent/tools/v6/combat-entry-replay.ts`。依赖冻结的离线 planner 原题，顶层 `{state,questions}`：原 `state.v6_combat_entries` 含知识快照、SHA与角色/进阶，唯一 `plan` 或 `pick` choice 的每个候选包含原 `v6_combat_entry.context`。复用生产 `combatMemory` 求值，未知条件不匹配。不得从说明文本重建上下文。当前入口只接受 Silent Boss/elite；第一、二幕由 manifest 和审计共同核对。

离线 capture 由原开发/ops 用冻结状态、原计划与本批 pending 知识目录生成；本 CLI 不生成候选、不调用游戏、不运行模拟器。学习任务见 [jev-encounter-reflex.md](../learner/tasks/jev-encounter-reflex.md)。未具备 capture 或候选完整结果时，回放验收仍未完成。

有原始状态与逐候选原 `Plan` 时，用配套 capture 入口，无需重跑求解或改正式知识。输入为 `{schema:"combat-entry-capture-input-v1",state:原mod状态,request:{state:原V5题面,questions:原选择题},plans:{候选键:原Plan或null}}`；每个候选都要覆盖，null 只代表无模型候选，不能为缺原计划补造动作。层/回合须与原状态一致，保留原题和计划的冻结来源。候选知识根使用独立 pending 副本的 `characters/silent/{reflex,reflex-vocab}.json` 布局。该入口复用生产事实适配与条目求值，未来模拟条件因没有原结构化模拟输入而未知，不从题面推断，也不生成结果矩阵。

```bash
nice -n 19 agent/node_modules/.bin/tsx agent/tools/v6/capture-combat-entry-replay.ts \
  --input paper/materials/<experiment>/original-case.json \
  --knowledge knowledge/characters/silent/pending/<batch>/isolated-knowledge \
  --out paper/materials/<experiment>/capture.json
```

manifest 严格为：

```json
{
  "schema": "combat-entry-replay-manifest-v1",
  "character": "silent", "game_version": "SOURCE_VERSION", "ascension": 10,
  "selection": "预先规定的机会/留出局选择规则",
  "exclusions": ["全部排除及原因"],
  "cases": [{
    "id": "CASE_ID", "run_id": "ORIGINAL_RUN", "act": 1,
    "encounter": "ORIGINAL_ENCOUNTER_ID", "attempt": "first_attempt",
    "request": {"path": "仓库相对capture.json", "sha256": "64位原文件SHA"},
    "outcomes": null
  }]
}
```

`outcomes` 可为同样的文件引用，内容为 `combat-entry-outcomes-v1`：`kind:"model"`、`model_sha256`、`scope:"whole_fight"|"horizon"`、`rows:[{candidate,seed,hp_loss,win}]`。每个候选必须有完全相同的种子集合，禁止重复或缺候选；未知数值写 null，截断 `horizon` 的 win 必须为 null。原始结果及模拟器版本/可信度材料需随实验保存，不接受仅有候选均值/SE。候选实际完整执行和模型预测是两种证据，不能混用。

## 两臂与调用边界

baseline 从原题移除 V6 审计后走现有 V5 投影；memory 在其上仅添加 `combat_memory`。候选、数字、说明、计划和状态一致；因此测的是记忆增量，避免将 V6 on/off 伴随的投影变化误归因于条目。这个结果不是实际整体开启 `V6_COMBAT_ENTRIES` 的端到端验收，后续若决定开启仍须单独核原生产投影与自然消费。

从仓库根执行，使用既有 Node，不安装依赖：

```bash
nice -n 19 agent/node_modules/.bin/tsx agent/tools/v6/combat-entry-replay.ts \
  --manifest paper/materials/<experiment>/manifest.json \
  --out paper/materials/<experiment>/replay
```

默认只验证输入SHA、准备两臂请求和报告，零模型调用，不读取生产游戏配置/凭据。所有路径须在本工作树，重定向至共享 logs/data 的软链接不作为冻结输入；先保存独立的授权字节窗口。新条目每个 `sources.path` 都核原字节SHA。

具备学习者条目、预注册留出样本、完整模型结果及原资源窗口后，原 owner 可显式在同一命令追加 `--ask --max-calls N`，通过既有环境提供 Jev 认证。每题每臂单次，串行、SDK重试0、超时20秒，最多200物理调用，跨局交替两臂顺序。没有任何匹配条目则拒绝花费调用。没有 game/mod 动作，不调用生产日志器，不附开卷。该参数用于离线实验，不授权运行 A/B 游戏或改 live。

每次调用前持久写 claim，之后写结果；进程中断后有 claim 无 result 时，保留 uncertain 并拒绝自动重发，先核原服务回执。相同输入、模型与请求身份才可读回原结果；改变来源、案例或结果矩阵须新实验目录。失败/非法选择保留缺失，不补 rank1、不隐式重试。保留 identity、两臂请求、claims、results、report 原件。

## 结果口径与后续门槛

报告分别显示 Jev 的两臂选择、变化、匹配和未知条目；HP改善为 `baseline掉血 − memory掉血`，胜率差为 `memory − baseline`。先对种子取均值，再同一局的所有题取均值，最后独立局等权取均值及95% Student-t区间；不同遭遇/幕/版本/进阶/首试SL、模拟器SHA与完整/截断范围分层，不混算。单局不报区间，缺候选结果保持未知。报告包含全部未完成案例及分母。

这是给定模拟结果下的条件评估。区间不包含模型偏差或 Jev 单次回答的抽样波动；多个回合/随机种子不增加独立局数。常数差的点区间也不能解释为“零不确定性”。重试/缺失、训练与评估重叠、稀疏分层与多重尝试均需在实验报告另列。不能把模型掉血称为实盘反事实或因果增益。

正式验收仍依次需要：学习者条目和反证审计；真实 Jev 两臂固定回放及改善区间；提交 Roy 决定是否开启；原 ops 在获准边界发布与 A/B 对局确认。CLI 始终输出 `enable_authorized:false`，从不据显著结果自动开关。无改善、负向或区间跨零也必须交付；#28 不因工程框架、合成测试或学习批结束关闭。
