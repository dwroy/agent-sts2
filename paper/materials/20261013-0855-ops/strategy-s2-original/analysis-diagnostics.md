# 本批分析过程与限制

- 首轮打印派发提案的物理历史更新（178行）和账本全部证据导致终端截断；正式选择改用仓库原生 `code_proposals.fold` 与 `ledger.fold`，只取本批10个id及31个账本条目。初始读取输出保存在本目录，截断输出不作为完整读取或验收成功。
- 初步搜索误用不存在的 `20261007-234302-postmortem/audit.py`，以及 `agent/src/sim/boss-value.ts`、`agent/src/reflex/reflex.ts`、`agent/src/core/loop.ts`；原错误来自分析路径假设，不是生产故障。随后按 `rg --files` 定位 `continuation-value.ts`、`combat.ts`、`hand/loop.ts`，初始来源快照的missing项保留。
- 原始日志大部分使用无空格JSON；collect.py的带空格日期前缀优化没有触发，实际按开读时固定字节大小扫描，不按优化假设宣称提前停止。各选中记录仍经实际run id、角色和原字节SHA检查；不读后续局的游戏内容来扩展本批。
- 只读当前live源码快照可核已有有限子项；历史对局配置均带dirty，不能还原全部历史执行树。当前源码不作为历史游戏机制证据，也不假定未执行候选的后继胜负。
- 本次会话没有可用的原生模型/推理强度查询或切换工具；不把历史对局run-config的model/effort冒作本批学习者运行身份，不声称已切换运行会话。

- 原证据分析器首次假定每条decisions都有chosen，遇到附属记录KeyError；初稿已保存analyze-initial.py.txt与analysis-initial.log。正式分析只对有实际use_potion动作的记录计饮用。首次apply_patch写回失败，原文件/干净树及磁盘状态核实后，用同权限shell做单处文本修正；不是源码测试失败。
