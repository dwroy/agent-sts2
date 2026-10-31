# #68 开发范围登记

基线：2a77c8400b9ac13e47b353b096cb3a2d3b0b44f3。
固定 kit：实现 13f2378c48e8798c63f752def32415714849db82，交付 1437a5cfa6e9f66e881d18e55bd82bb3c0850f93；从原工作树的 Git 对象取完整模块，不拉 main 冒新版。

预计新增：
- `.agents/merge-queue.json`、`.agents/queue-workspace.json`、`.agents/queue-checks.json`、固定 kit 清单；默认生产队列关闭。
- `ops/board_queue_*.py`：项目准入、固定安装核验、候选检查与交付请求工具；不复制 kit 队列核心。
- `ops/tests/test_board_queue_*.py`、必要的 TS 测试入口。
- `docs/board-merge-queue.md`、本目录证据及 decision-log 追加。

共享入口仅拟在 `.agents/board.yaml` 增加默认 disabled 的 merge_queue 配置，若需 `ops/agent_board.py` 差量会先登记；保留 minute poll/handoff、现有资源开关和角色声明。
不改 #67 学习完成/知识运营入口，不改 #66 分类入口，不改 ops prompt，不写 main/live/STOP/生产安装或 authority，不开新 timer，不停其他会话。

依赖与分工：原集成员给匹配 ROOT/LIVE 组合的真正检查合同/部署叶映射；原 ops 给 #20 的可信资源声明、唯一 tick、现有锁/进程与自然采用步骤。开发先完成独立模块和固定用例，真实 shadow/active 交原角色沿本 issue 的三步批准继续。
