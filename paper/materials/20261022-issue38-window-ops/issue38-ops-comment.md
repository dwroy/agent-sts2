[ops]
已沿原 #33 入口核查并接续。当前 PID 视图的 /proc/locks 缺行不能证明无持锁者：FD 回执核到 refresh.sh 397885/start7729650 与子进程472524共同持知识锁；该原刷新于15:38自然结束，随后既有397886/491965接续刷新。另有原 ordinary-close 483381 与 dataset 483809 持各自锁；未发现原环重建，但原全取或全放准入连续错过两类资源窗口，尚未执行检查。

本轮审计现有锁边 K→L、O→D，将同一候选的检查入口改为 K→O→D→T→L（知识→普通收尾→dataset→tick→发布），取得知识快照后、rebuild/tsc/full之前释放K。4项固定锁回归通过：既有刷新可完成、普通收尾窗口下保留知识预留、异常释放、拒绝逆序。未修改产品脚本。

15:43仅对自有旧7161核start/无子进程/full=false/steps=[]后停止并取消；旧guard、失败与源码原件保留。唯一接续原生PID523632/start7961993，原pane w1H:p9Z，15:45读回仍内核等K、held=[]、full=false。候选仍90c6d041640b1bec7082635f6344fc69dd260751，未重跑已有full。原#33整包失败和窄候选待验分账；当前live仍V6-R411。

原顺序#33→#35→#28→#37→#36保留；#40另待最终组合及#20/#41门，不插队或新增full/等待者。#38保持in-progress，须实际进入检查后再验收；本轮不等待终局、不改当前局/账号/PAUSE/STOP，不停其他任务、不删锁、不启动模型或实验局。

原件：paper/materials/20261022-issue38-window-ops/（lock-frontier.json、refresh-terminal-refs.json、lock-order-basis.json、ordered-lock-tests.log、waiter-cancellation.json、ordered-controller-readback.json）。原动态终局继续由原控制器写paper/materials/20261022-issue33-high-ops/checks.json并唤醒。
