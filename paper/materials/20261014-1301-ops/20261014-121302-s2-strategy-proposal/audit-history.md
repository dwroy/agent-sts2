# 本批诊断与核验边界

首次开工 shell 在真正运行 pwd／git status／README 读取之前，被沙箱构建阶段另一临时工作树的 `.codex` 路径 ENOENT 拦住。后续按相同权限重新调用成功。这个错误未触碰源码、凭据或被屏蔽文件，原工具回执在本批原生事件流中保留。

`consumer-audit.out`／`consumer-audit.err` 对应首次 tsx CLI；退出1来自 Unix socket listen EPERM，消费者脚本未执行。`consumer-audit-node.out`／`consumer-audit-node.err` 对应随后同权限下 node --import tsx loader 的固定入口，退出0，consumer-audit.json有四项限定读回，刷新知识读取数0。前后入口均未运行play或网络，不改生产代码、不申请权限、不宣称tsc／vitest成功。

证据分析初稿的末轮终帧搜索为：

```python
end = following[0] if following else next((n for n in range(indices[-1] + 1, len(states))
    if states[n]['state']['run']['floor'] == floor and states[n]['state']['screen'] in ['REWARD', 'GAME_OVER']), None)
```

该末轮搜索可能跨 SL 尝试去取同层较晚退出帧，不能用于实盘结算。最终脚本增加了同层／同尝试 boundary，截尾明确 missing_exit_or_reloaded；决策指纹匹配也增加层、回合、SL尝试约束。完整重算后再跑 verify-evidence.py，6412条源字节与13项限定事实断言通过。初稿从未用于生产或提交，不将重载前截尾视为已执行死亡。

本批没有任何源码撤销／恢复操作，也没有策略实现提交。因此负对照、源码测试、合入与版本结果均不适用，保留null。报告、原提案、输入副本、索引、CLI回执和诊断均由原调度器按验收门禁接续，不在会话运行中清理自身工作树。
