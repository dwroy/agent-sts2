# #28 怪物出牌条目与离线验证

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
