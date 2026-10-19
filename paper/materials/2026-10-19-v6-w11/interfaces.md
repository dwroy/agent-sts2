# W1.1 build-core 接口

请求 roy-20261019-v6，代码不含游戏知识；正式知识不写入。

- `agent/src/v6/build-core.ts`：`BuildCore`、`BuildCombo`、`buildCoreSchema` / `buildCoreFileSchema`、`validateBuildCore` / `validateBuildCoreFile`。文件 envelope 为 build-cores-v1，entries 每方向一张 build-core-v1；多组合、any_of 与数量/升级要求、逐牌贡献/证据、反向关联均严格校验。类型允许学习者有证据地扩展，不用开发预填牌效。
- `loadV6Knowledge(...).cores`：独立读取本角色 build-cores.json，缺失/无效显式返回，不从 direction-cards 或其他角色生成。旧 directions 字段暂保留兼容 W4，新的组合消费者必须读 cores；后续 W4 用核心卡摘要替换旧卡题面。reflex 在已有核心卡时以新方向目录校验。
- `build-core-draft.ts` / `knowledge/builders/validate-v6-build-cores.ts DRAFT CONTEXT`：只读校验覆盖、固定局号与正反引用；context 含 character/experienceIds/directionIds/runIds/reflexIds，来源为冻结输入。经验必须逐条 linked/unrelated/unknown/disputed；四种类型缺证据必须在 missing 逐方向说明。允许诚实空草稿，不把通过格式当作知识成立。
- 组合 metrics 按 ascension、attempt(first/including_sl)、version 分层。27个 observed 槽及 Boss/逐牌按幕可得性与 simulation 分列；每项 n/unit/method/value/se/distribution/evidence/unknown_reason/small_sample，p25/p75 可选。无观察 n=0、value=null、原因非空，不冒充0胜率。模拟未做可空，学习批次不能启动模拟池。
- `learner/tasks/v6-build-cores.md`：只写第9.3节任务要求、冻结与证据边界、全成型局口径、经验关联和 CLI 台账/JSON 回报。W2.2 定期生成器不在此项。

新接口没有接入默认关闭的生产决策路径；不改 predicate 字段（由 v6-w8 负责）。不需要行为发布号。
