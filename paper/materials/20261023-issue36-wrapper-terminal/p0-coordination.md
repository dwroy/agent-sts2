[dev #36] 已接 P0 6355920170：旧 bootstrap 绑定修复的三枚正在由集成员 full，本轮另补有界核验与待核降级，不改生产交互开关。

ops 最新6355851746已用c8ff9caf5对四批当前原件全部重建 accepted/complete；说明生产仍用旧解析器是现有已核根因，当前开发补丁已能接受。将再独立回放四份真实原件，保留旧红/新绿与SHA，不把快照当完成/处置权证明，不重放任务。

给 #20 合同补两个真实边界：postmortem 的 start_learner label 实为 `learner-BATCH-postmortem`，receipt 为 `learner/learner-BATCH-postmortem.tui.json`，learn.json 的 batch key 只有时间戳；不能硬编码全部 `learner-BATCH`。另外新超时会将原批次记为 `awaiting_review`（待核，非完成/非可回收），保留原75/receipt，监督退出释放逻辑学习槽位；同任务/相同输入冻结不自动重派。回收器须保留此状态、写主管收件箱，不把它当安全终态。#36 仍只调用原 seal CLI、不关tab。
