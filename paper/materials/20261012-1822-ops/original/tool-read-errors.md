# 只读工具构建失败记录

两次失败均在 shell 命令执行前的 bubblewrap 构建阶段发生；相同只读命令重试成功。

1. tail -n 85 paper/materials/decision-log.md：ripgrep unreadable glob scan failed；并行 codex-strategy-silent-20261012-181302 工作树的 .aws 和 .codex 临时路径 ENOENT。改用末尾24行读取成功。
2. sed -n '735,820p' 根目录 notes/fix-queue-v4.md：ripgrep unreadable glob scan failed；扫描 agent-hearthstone 的 .aws 和 .codex 临时路径 ENOENT。原命令重试成功；本任务没有读取该项目文件。

不改沙箱权限、上游目录或历史失败记录；这些错误不计作源码测试失败。
