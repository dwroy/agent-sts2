记录时间：2026-10-24T17:08:27+08:00

# 能量图标与显式数值拼接显示错误

角色silent；已观察A10；来源postmortem/c8c69412-8b87-4c8a-b8c0-27e4bea77132；实现任务strategy-proposal（纯格式修复，不增加游戏知识）。账本silent-0617。

证据：P4ZBYNW92PPK F48，Jev原题f85a9ec2-1189-4dcc-b0c7-a44fb846f1f2的run_brief把SPIKED_GAUNTLETS显示为能力牌耗能增加11点能量。原始遗物模板为“增加[blue]1[/blue]{energyPrefix:energyIcons(1)}”，原手牌s536786毒雾与s536796步法+均2费。精确request/state SHA见question-review.json、whole-run-summary.json。当前live只读源码agent/src/knowledge/relic-values.ts:44将arg=1再次写成1点能量，后stripMarkup与前面的显式1连成11。relic-render-repro.json保存当前源码提交、必要diff、文件SHA、输入和实际rc0输出；准确历史对局源码未知，不用当前提交回填。

旧规则/新行为：当前energyIcons(1)总是带数值渲染；拟在已有显式数值紧邻图标的语法位置只保留一个数字和能量单位。单独{Energy:energyIcons()}仍按已测值/unknown处理；不添加SPIKED_GAUNTLETS的每轮能量数值，不改mod/action/模拟器费用或选择规则，不改来源schema/消费者。不得一律移除图标数字，须保留其他独立图标数值。当前源码/正式库只读，未实施。

反例和局限：P4末次实际已经建立毒雾2/敏捷3，不证明错误文字阻止能力启动，更不证明它是死因；没有为其他角色提供新游戏事实。同类语法仅本批一个自身样例，其他模板的语义须保留，未知仍未知。固定复现只验证文本bug，不是完整生产测试。

验证：使用本批固定原模板、对应实牌费用以及独立energyIcons/显式数字+图标/未知变量/普通描述夹具验证语义；按仓库要求tsc+沙箱测试，其他角色既有文字除该重复数字语法外保持。初始tsx CLI因IPC listen EPERM失败保留，node --import loader运行原函数rc0，不把沙箱失败当代码失败。纯格式问题无需拟合或统计训练时间切分。

预期影响：修正模型看到的费用文字，选择/通关收益未知。回退：未来实际修复提交逐叶回退；现无修改。formal_publication=pending，consumer_readback=pending；不得登记implemented或shipped。
