# 抽取失败与修正记录

第一次临时抽取直接索引chosen，遇到map/route-change只有记录而没有chosen，产生KeyError。改为可空字段读取后逐条继续，原始行保留在decisions-numbered.jsonl。

第一次analyze.py将questions当列表，实际为对象，产生KeyError: 0。原脚本与已打印逐轮数据保存在analyze-first-draft.py、analysis-first-output.txt；修正后脚本、输出及空错误回执分别为analyze.py、analysis-output.txt、analysis-errors.txt。

一次tail -c 8192截断了deepseek-reasoning末条大记录，JSON解码失败。改为按末尾2097152字节偏移seek、跳过首段截断行并流式读完整记录，取得62条完整行；末条早于本局，回执deepseek-window-check.json保留。

复盘初稿中的待核数字、T8伤害拆分及T10呼唤与攻击拆分已在正式追加之前核对修正，原稿lessons-first-draft.md保持。正式复盘只追加一次，原有内容前缀哈希未变。正式追加后只新增学习状态标签勘误，未改旧文字；十二窗口逐轮数字校验与死亡数字重新grep均通过。
