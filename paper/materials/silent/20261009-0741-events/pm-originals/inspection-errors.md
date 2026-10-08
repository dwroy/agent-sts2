抽取核验的失败与修正保留：

- detail.py初版假定每条决策都有questions，遇run/finalize为KeyError；detail-failed.txt与detail-failed.err保留。后续audit.py使用get并核实原帧。
- stats.py初版假定路线criteria为JSON，实际路线选项是文本，触发JSONDecodeError；stats-failed.txt与stats-failed.err保留。stats-v2.py改为直接显示文本。
- 临时只读命令把ledger.read_rows的返回二元组直接当行列表，触发AttributeError；后续按账本逐行读同角色shipped记录核实开局前版本，未写错账本。
- 临时只读命令对战外combat=None调用get，触发AttributeError；extra_verify.py改用空字典且extra-verify.err保留。
- final_evidence.py初版同盘比对拿错首试T1末帧315632，显示False；原结果保留。正确T2首帧315633与第四试315736的决策fingerprint完全一致，逐项核对血／能量／手牌／敌血／增益，不修改原日志。
- 草稿初版把第二试T4写成后空翻重问，原稿保留lesson-draft-initial.md；实际是防御→猎杀者，追加前已依据d307491—307493改正为与首试后空翻处理的比较。
- 追加前标题检索无匹配的exit1符合预期，非异常。
