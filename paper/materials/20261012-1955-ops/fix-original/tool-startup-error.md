# 测试命令启动记录

第一次定向 Vitest 的 shell 命令没有启动，exec_command 在构建沙箱时返回退出码 1：

```text
error building bubblewrap command: Fatal error: ripgrep unreadable glob scan failed for /home/dw: rg: /home/dw/Projects/agent-hearthstone/.aws: No such file or directory (os error 2)
rg: /home/dw/Projects/agent-hearthstone/.codex: No such file or directory (os error 2)
```

以完全相同命令重试后启动成功。没有放宽沙箱、读取上述路径、修改权限或删除目录。这属于命令启动前的环境错误，不计作 Vitest 用例失败；实际测试结果另见 vitest-targeted.log 和 vitest-targeted.exit。
