# 最小运输接口

- source: `6707f7ac42191becb5bbf18eed7a1f4f3ad4dc2f`
- source parent: `6df876dd6afecf5cfc44fdf7f609116593dba76f`（旧材料提交，不是运输依赖）
- source tree: `21a301f93e0dfb1e21e0fb9d85e37d500cfe8779`
- 仅一叶：`agent/tests/inferno-planner.test.ts`；逐叶前后 SHA/blob 在 `checks/source-manifest.json`。
- 使用 `checks/minimal-source.patch` 应用到 ops 原失败组合，不运输整 source 分支或父提交。
- 必须保留原 CEN `f993d9b1dd88c2b36534d16c3560358e23a89a95` 三叶（死亡优先生产修复与既有回归）。本次无新增生产依赖、配置、运行逻辑、知识、公式或 API。
- 原 test 前像与 ops tree377e290c 一致；新 full 只认 ops 后续实际 R409+最新知识冻结组合，不能用本树定向替代。
- 铁甲行为差异：该原题推荐从血墙+、上勾拳+改为防御、上勾拳+、打击；两次 HP=0 假胜去除，理由见报告。不是全角色等价声明。
