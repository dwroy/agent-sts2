# #56 集成员独立核验：退原开发修占槽缺口

来源交付 dfd847f819f13d681202d4ab7bc6742fc8fa18e9，基线 2b0f1ebc；独立验证树从当前 main afd47ac94dd8642c2a1b34db49b4be601810cdc5 分配，仅覆盖 14 个交付代码/测试叶，逐叶 SHA 见 source-overlay.json。没有合入 main 产品、没有部署宿主/live，也没有运行模型、游戏或生产 tick/finish/reclaim。

## 阻断项：未核实原生退役的历史 owner 会释放该道

`ops/strategy_external_jobs.py:162–181` 的 active_external/occupied_lanes 只保留非 done/failed 或 wrapper PID 尚活的批次。dispatch 仅对同 plan 和重叠 entry ID 调用原 shared.retired；同道下一不同 plan、不同 unit ID 因而跳过该证明。

固定反例复用本次交付的 External fixture：四道已登记，A 原批原生 task_started/绑定成立但没有末回合，wrapper PID 不活；分别令登记状态为 failed/rc1 和 done/rc0。原 shared.retired 两例均抛 `native session retirement or original learner log is unverified`。下一次调度却都启动 lane-unit-4，lane=A，writer 调用各新增一次；原 owner 字段保持不变。反例是合成状态，不声称生产发生了该事故。

这不能满足本次“每道最多一个未结算 owner”及保原退役/租约保护的验收：状态字和 wrapper 退出不足以证明原生回合结束。应让同道已知或未知原 owner 在可核实原退役前保持占道；证据不足保留，只阻该道，不妨碍其余道和独立自有槽。证明可按原证明缓存，但不能把任意历史失败全局永久阻塞。增加不同 plan/不重叠 ID 的负控，以及原 not-started/真实终态证明后续派的正控。

## 本轮检查

- 独立 `nice -n 10 python3 -B -m unittest discover -s ops/tests -p 'test_strategy*.py'`：107 项，6.364 秒，全部通过；原日志保留。
- 自写固定反例两例均复现；源 SHA 和复跑脚本保留。
- 尚未冻结最新 live 知识或运行新 tsc/full；发现阻断后不进入完整检查，不用开发沙箱绿或此前 #37+#20 full 代本轮结果。
- 70/90% 分支与主管 6383255912 的后备方案一致：90% 拒新外部、原 ops 队列换号请求，不自切、不打断在途。自然五槽、实际 ultrafast 和上线两小时四单元仍待实际发布后 ops 验收。

原 #36/#37/#20 自然事务、R434 及后续知识、旧 #51 八叶排除、科学父和正式 ACK 边界保持。
