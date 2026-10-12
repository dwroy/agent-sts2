# 原件格式检查的失败记录

初次检查两个来源状态文件的元数据时，把 8JRE1C4H4Z2W-states-lines.jsonl 的首行直接交给 json.loads，得到 `json.decoder.JSONDecodeError: Extra data: line 1 column 7 (char 6)`；该文件原格式为 `275759:{...}`，前缀是原日志行号。没有写入或修改原来源文件。

随后按第一处冒号拆分行号与JSON，在 verify_evidence.py 中保留该格式分支。六局3,432帧、8JRE659条决策与原日志比对通过；首版和扩展核验日志分别保留 evidence-verification.log、evidence-verification-v2.log。本失败属于只读检查脚本格式处理，不是生产源码、tsc或vitest失败，也没有高负载超时重跑。
