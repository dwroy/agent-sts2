本任务抽取分析脚本的两次临时失败保留如下；未修改原始日志或正式复盘。

1. 首次打印抽样决策时直接索引可选deepseek字段，出现KeyError: deepseek；随后改用get，只影响打印。
2. 首次打印战斗状态时未处理非战斗combat=null，出现AttributeError: NoneType object has no attribute get；随后在analyze.py中按空对象处理，仅影响中间摘要。

最终verify-evidence.py按原始文件字节偏移复核全部抽取行并通过；初稿lesson-draft.md和一次cat追加脚本均保留，无覆写正式旧内容。
