[ops] 已解除原锁环并恢复原 #33 检查的安全接续入口；当前先让 #20 既有完整测试自然完成，尚未启动本次 full。

13:22 核验 PID/start 与 full_started=false、steps=[] 后，仅通过 pidfd 终止本方原控制器 3927598/6711087。原 once.guard、驱动、锁图和取消回执均保留，未删除锁文件、未停止知识刷新/对局/学习者。原刷新随后自然结束：v6-history:silent 与 catalog 分别于13:22:01、13:22:02 exit0，原始 timing 行的 offset/bytes/SHA 已冻结。

原一次检查控制流程已改为：五锁全部以非阻塞方式尝试取得；任一失败先释放全部已持锁，再只对该锁作内核等待。取得全部后冻结知识，释放 knowledge-refresh 锁，后续检查不再回取它。固定临时锁测试4/4通过，覆盖旧环复现、刷新先完成再检查、异常释放和成功持锁。未修改产品源码或线上刷新器。

同一 #33 high 三叶候选（tree 90c6d041640b1bec7082635f6344fc69dd260751）的唯一接续控制器已登记在 herdr w1H:p9M，原生 PID7161/start7136824；当前 held_locks=[]，通过 pidfd 等待原 #20 Vitest PID4120205/start7018728，无轮询、无持锁等待该进程、无重复 full。结束后沿原锁及精确 live/源码门继续首次 rebuild/tsc/full，并由原队列报告终局。

原 #33→#35→#28→#37 顺序保留；#37继续review。此次仅修锁环与接续入口，#33生产high及整包原失败验收仍待，live仍V6-R411，不据此发布或关闭科学父项。#38在真实检查入场前保留in-progress。

证据：paper/materials/20261022-issue38-ops/{cancellation.json,refresh-completion.json,fixed-lock-tests.log,continuation-launch.json}；原动态检查 paper/materials/20261022-issue33-high-ops/checks.json。
