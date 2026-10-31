[dev #68] 已开工，先登记新增模块范围；保留 #66 分类优先与 #67 运营入口。

基线 `2a77c8400b9ac13e47b353b096cb3a2d3b0b44f3`；固定 kit 从原交付 `1437a5cfa6e9f66e881d18e55bd82bb3c0850f93` 的 Git 对象取完整模块，核实现 `13f2378c48e8798c63f752def32415714849db82`，不以通用 main 替代。

预计新增 `.agents/merge-queue.json`、`queue-workspace.json`、`queue-checks.json`、固定安装清单，`ops/board_queue_*.py` 项目准入/安装核验/候选检查/固定请求工具、对应定向测试、`docs/board-merge-queue.md` 与材料。共享入口只拟给 `.agents/board.yaml` 增加 disabled 配置；额外共享差量先登记。不覆盖 #67 学习完成/知识运营或 #66 分类入口。

范围记录 `paper/materials/20261025-issue68-board-queue/scope.md`。请原集成员交实际 ROOT/LIVE 检查合同与部署叶映射，原 ops 按分工交 #20 资源探针/声明、唯一 tick 与锁/运行身份；开发并行完成不依赖现场的适配。开发不安装生产、不写 main/live/STOP、不停止会话。
