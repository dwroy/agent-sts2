本批取证诊断（非生产代码失败）：

1. 首轮查找 runtime-identity/learner-launch 文件名不存在；未据此冒报原生运行模型或强度已核实。
2. 一次搜索 agent/src/core/loop.ts 不存在；实际循环在 agent/src/hand/loop.ts。
3. verify_evidence 首轮22项原帧算术已过，在源码差异分类时漏认单行 /** 注释而退出1；补识别后仅重跑此取证程序。initial.txt由保留的首轮程序与单行补丁复原，initial.log由已显示的工具stderr转存，均明确为转存材料。
4. 首轮试图cp备份时沙箱构建被另一工作树 .codex 消失触发rg ENOENT拒绝，命令未执行；随后在本scratch保存上述复原/转存材料，不将其当生产修复或测试失败。
5. 阶段清毒祖先查询初稿使用过宽 e.poison=0 标记，只定位了通用早期清零；initial.json保留，正式回执改用阶段分支专用注释并核实际live祖先。

未运行tsc/vitest、撤生产源码、模型调用或游戏。

6. 最终验收初次误把ledger.py update的纯ID空格列表回执当JSON解析，JSONDecodeError退出1；回执原件ledger-cli.log保持，改按真实输出核全部30个ID及原生fold中的链接，没有重复执行CLI追加。
