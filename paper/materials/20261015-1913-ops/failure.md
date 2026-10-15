# RQCHNN0W72KF 复盘启动失败

原批次 `20261015-191301` 在创建会话前退出1；没有模型轮次、工具、完成回报或新增复盘。原始输出、stderr和事件流保存在本目录归档及manifest中。

错误为已知 `sandbox-glob-startup-race`：bubblewrap构造期间ripgrep目录扫描遇ENOENT。没有额度或登录错误证据；启动阶段的Sol6.1/xhigh telemetry和 `/models` 200不证明已完成模型请求或额度可用。

本次仅attempt1，`retryable=true`，但batch/lease=null，未获有效租约便不附加重放。原d998复盘ID修复仍是main/live祖先；不能由null判断哪项守卫或谁移除了目录。错误只提及外项目路径，本轮没有读取、检查或修改外项目，也没有改变沙箱、凭据拒绝规则或全局配置。

沿既有启动竞态队列补证；保留调度器20:13:08 CST的一小时重试、attempts1及最多3次规则，不手动复派、改账号模型或重启对局。空提案审计已按原失败分类跳过。此前RQ的ops0332追溯不是本次学习者产出。

按事件要求仅启动一次 `python3 ops/paper_dataset.py --no-raw`，nice19，旧输出已保存。实际退出、固定截点、输出与缺复盘口径见 `paper-dataset-result.json` 和 `paper-snapshot-readback.json`；不把数据刷新当复盘完成或游戏收益。
