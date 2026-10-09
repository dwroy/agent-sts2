# 离线抽取过程保留

- summarize.py第一版用r['chosen']读取纯路线变更行，出现KeyError；summarize-v1.py保留，第二版改为get后完成。原始逐行抽取与资源链均保留，没有删失败数据。
- 探索阶段误查agent/src/core/loop.ts及agent/src/loop.ts，返回不存在；后来通过rg --files定位到agent/src/hand/loop.ts。均是离线查路径错误，未记游戏bug。
- 开局前账本折叠第一版向ledger.fold传字典列表，接口实际需要(line,row)，出现ValueError；第二版按接口调用通过，首次失败未进行账本写入。
- 草稿第一版误述F3取第二张带毒刺击；决策复核发现F3是宝箱，F2/F6才各取一张。draft-tail-v1.md保留，正式追加之前已改；append.sh只追加draft-v2.md，不对已追加内容重写。
- 最初排除结束回合问答时用'end turn'匹配，实际题面为'nothing (end the turn now)'；原metrics.json保留，metrics-corrected.json另存，排除22结束问答后106/113。正式复盘使用经原字段核对的总体128/135，不使用错误的排除统计。
- 数次探索输出被显示预算截断；所有本局完整抽取行、原字节偏移与SHA已保留于scratch，可重现；未以截断输出当证据缺失或代码失败。
