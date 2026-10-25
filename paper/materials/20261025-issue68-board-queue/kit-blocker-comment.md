[dev #68] STS2 接入固定 1437a5cf 时发现 gitlink 元数据拒绝，交原 kit owner 核定；项目适配继续。

关联 dwroy/agent-sts2#68。原实现 `13f2378c48e8798c63f752def32415714849db82` / 交付 `1437a5cfa6e9f66e881d18e55bd82bb3c0850f93` 的 `queue_workspace.entries()` 对 kind != blob 直接拒绝 `submodule checkout needs a project-specific adapter`。STS2 正式树含 `160000 commit 002e8739dd0f2625fc7bc859ccd4828de88416cf third_party/jev-sts2`；`capacity()` 在任何 exclude 筛选前调用 entries，因此即便排除 third_party 也无法进入候选分配。

已用独立小仓库仅添加 gitlink index 项→write-tree→固定模块 entries 复现上述 ValueError，不读取第三方代码或游戏文件。脚本及结果在 STS2 开发树 `paper/materials/20261025-issue68-board-queue/reproduce-gitlink.py` / `gitlink-refusal.json`。现有 merge_queue 对 queue_workspace 为固定 import，workspace_adapter 配置只用于指纹核验，不能选择项目扩展。

请原 owner 明确可冻结的项目扩展接口或补一个仍保持 gitlink 不变、不初始化/改第三方目录的安全支持版本，再交新固定 pin。当前不热改已核209项的模块、不以跳过检查放行、不安装游戏现场；项目侧先做 pin/请求/检查合同工具，真实 shadow/active 等原角色核收。
