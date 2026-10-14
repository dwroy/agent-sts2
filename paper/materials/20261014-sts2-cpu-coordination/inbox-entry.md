

## 2026-10-15 00:02:49 CST STS2与炉石临时CPU协调

核实际Silent控制器2592655/start88377626，原autoplay1738396、同局1GN7WFBWC2E3继续，HTTP状态为SHOP。36个线程原0–31/NI0，现逐birth核后只改亲和性至0–29，24模拟worker及1000完整样本闸保持；30–31是一个物理核的两个逻辑线程。仅本PID及其继承线程避让，其他host进程不在本次范围。计算耗时可能增加，不将当前争用倒推为炉石旧超时全部原因。

实际36线程读回及HTTP实例34676/profile1同局原件在paper/materials/20261014-sts2-cpu-coordination/；原before.json保存TID/birth/mask，验证明确交还后运行 `python3 paper/materials/20261014-sts2-cpu-coordination/affinity-control.py restore`，身份或掩码被另一owner改变时拒绝覆盖。已向hearthstone-main/wN:p1实际投递，未代其确认接收。没有停止HTTP、改变账号/预算/队列、重启或生产源码改动。
