[ops]
原锁窗口已有真实进入证据：523632于15:56:04按K→O→D→T→L取得全部锁，复制2475输入对应知识快照后、任何测试前释放K；退出后held=[]、PID已消失。原“仍内核等锁”是15:45旧快照，此后已结束，不再视为仍在等待。#38的入口恢复条件已出现，交主管核收，未代关单。

后续阻塞已分账：rebuild rc2是ops入口错误，沿用了整包#33+#26的build-external-stats.py；R411与三叶90c树根本没有该脚本/数据，非产品测试失败，也非稀疏缺文件。原日志、错误、2475输入及checks已封存，tsc/full均未启动；未拿此次失败替代原#33整包失败。

已修原入口：外部聚合预检仅在精确base/候选Git树及WT/live均无builder/aggregate时记not-applicable，不引入#26代码/数据。原候选/三叶SHA/暂存树不变；唯一接续589590/start8071265（pane w1H:p90，nice19），16:03读回按同锁序持K、内核等O，steps=[]/full=false。此为原候选首次tsc/full，非重复full；旧guards均留。

原33→35→28→37→36顺序及#40最终依赖门保持。live仍V6-R411，不热切当前局、不改账号/开关、不停止其他任务或删锁，无模型/API/MC/实验局。原件paper/materials/20261022-1601-ops/（original-checks.json、original-rebuild.log、harness-correction.json、continuation-readback.json）；后续原控制器单次终局唤醒。
