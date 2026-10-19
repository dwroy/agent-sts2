# V6-W3 pick 跨方向同种子配对

`V6ProjectionTable.pick_direction_comparisons` 为每个选项（含 skip）×方向给出相对大脑最高概率方向的连战差与标准误，供 W4 T2/T3 使用。每目标取该方向原有最大期望组合；差的符号是本方向减参考方向，参考概率并列时按方向 ID 排序。权重无效时参考方向为空。

每项含 option_id、direction_id、reference_direction_id、targets（目标与两边组合 ID、joint_paired_delta）、混合 joint_paired_delta、known_mass、labels。只混合 chain 目标，按已观测候选连战概率；要求全部正概率质量已知且总和为 1，不把未知质量重新归一。相同战斗种子及供给世界保留跨目标协方差，战斗误差与供给误差平方和合并。缺种子/模型/组合/概率任一项则差为 null；0 概率目标不污染结果。

这是模拟与描述性最大组合选择的差，不声称无偏估计，未估计候选 Boss 频率自身的不确定度。off/act 的新字段为空，不增加模拟任务，不改 projection-entry-v1。

3 个固定测试覆盖方向参考/并列、同种子协方差、skip、自比较、缺目标质量、种子身份不符、无效方向权重和 off/act。单项完整 tsc+vitest 已通过：580 文件、5,559 通过、2 跳过（checks-2134）。最终联合检查另记。

## 独立验收补记

独立完整检查 checks-2134：tsc 退出 0，vitest 580 文件、5,559 通过、2 跳过（888.21s）。 检查时基线 a1743a354 的 agent 树与最新 main f7580b3f5 相同，随后工作分支快进最新 main，逐文件 SHA 确认功能代码未变。最终共同树验收另见 runtime 报告。完整检查原件 SHA 与保留位置见同目录 evidence JSON。
