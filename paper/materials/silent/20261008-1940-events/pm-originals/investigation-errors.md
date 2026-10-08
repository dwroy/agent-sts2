# 抽取诊断历史

- 首次结构试读时EVENT帧combat为null，直接get导致AttributeError；随后按combat or {}读取，正式抽取完成。
- 首次路线试读时act_boss_sim是文本，直接get导致AttributeError；随后按对象/文本分别读取，正式数值用decisions.boss_sim复核。
- 首次追加后grep使用-n给已有原行号加了第二前缀，verify-grep出现JSONDecodeError: Extra data；空输出保留为post-append-key-numbers.failed.jsonl。取消多余-n后重跑9帧并校验通过，无复盘数据被该失败改写。
- 初稿中的F20动作、focus分层、旧投影约值和F9样本数在追加前已按日志修正，初稿与终稿分别保留；已追加两节未发生关键数字不一致。
