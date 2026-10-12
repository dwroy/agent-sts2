# 抽取过程的失败与口径修订记录

初次生成候选题摘要时直接访问续步决策的questions字段，工具返回KeyError: 'questions'；摘要生成中断。随后在scratch抽取中改为d.get('questions') or {}，重新生成完整摘要。原日志没有改动，未将该抽取错误登记成游戏纯bug；工具会话中的原失败回执保留。本文件为失败摘要，不冒充原始stderr全文。

源码查找初次使用agent/src/sim/rollout.ts、rollout-live.ts路径，rg返回No such file or directory；随后核到agent/src/reflex下的实际文件并保存源码快照。未以找错路径证明游戏代码失败。

statistics.json初稿的only_code_turns按“无Jev整线题”排除，含单动作和弃牌题；该初稿保留。statistics-final.json另列“无任何Jev调用”8轮与混用3轮，lessons及最终报告始终使用11轮自主动作、其中8轮无Jev调用的口径，不需要修改已追加复盘。
