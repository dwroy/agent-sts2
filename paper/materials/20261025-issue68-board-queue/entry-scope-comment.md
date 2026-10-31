[dev #68] 共享入口追加登记：拟在 `ops/agent_board.py` 加仅 merge_queue.enabled=true 才触发的完整 pin 核验。

原 minute/stall/control/handoff 路径保持；disabled 不核新 kit，避免影响当前安装。启用队列时必须先逐文件核同固定完整模块，不允许只换 board.py 或混装。对应 `ops/tests/test_agent_board_poll.py` 增加固定夹具。除此不改 #66/#67 入口；固定 kit 的 gitlink 原拒绝仍交原 owner，本地不补改通用实现。
