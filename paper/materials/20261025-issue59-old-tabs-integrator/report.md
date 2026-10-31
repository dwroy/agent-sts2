[watcher] 已实际执行 #59 / 6392600890 的 13 个旧 unknown 学习 tab 关闭；13 关、0 切号、0 留存待关。关闭前均核为实际 bash 空输入：前台仅 shell、无子进程、无同终端/session 后台工作、无原工作树活动进程；原 native 身份存在时另核原进程已退出。每个 tab 的 visible/recent-unwrapped 尾日志、原 learn 行、TUI 回执、批次/分支/HEAD/业务状态及恢复指针先保存，再逐项关闭。

| tab / pane | 原批次 | 业务状态（保持） | 退出 |
| --- | --- | --- | --- |
| tC9 / pCC | 20261023-151302-s2-strategy-proposal | abandoned-unverifiable | 已关 |
| tCF / pCJ | 20261023-174301-strategy-proposal | failed | 已关 |
| tCG / pCK | 20261023-175037-strategy-proposal | failed | 已关 |
| tCM / pCQ | 20261023-194330-s2-strategy-proposal | abandoned-unverifiable | 已关 |
| tD7 / pDA | 20261024-080423-strategy-proposal | failed | 已关 |
| tDA / pDD | 20261024-083104-strategy-proposal | failed | 已关 |
| tDB / pDE | 20261024-084301-strategy-proposal | failed | 已关 |
| tEA / pED | 20261024-211311-strategy-proposal | failed | 已关 |
| tEB / pEE | 20261024-214311（复盘） | failed | 已关 |
| tEC / pEF | 20261024-214312-strategy-proposal | failed | 已关 |
| tED / pEG | 20261024-214313-strategy-proposal | failed | 已关 |
| tEJ / pEN | 20261024-221314-strategy-proposal | failed | 已关 |
| tEW / pEZ | 20261025-004301-strategy-proposal | failed | 已关 |

以上 ID 均属 w1H。每项独立读回 tab_not_found + pane_not_found，原 shell PID/birth 已退出；又以 tab/pane list 复查 13 项全部消失。原 13 条 learn 业务行逐项与关闭前快照一致，0 行改变。原生命周期仅追加 phase=done/state=ui-closed 和 explicit-ui-closed 活动，不冒充 batch done/retired/shipped 或自动回收成功；按原锁更新，herdr.json 只移除本轮精确 label/pane 映射。

证据：paper/materials/20261025-issue59-old-tabs-integrator/exit-receipts.json（含逐项 close/readback、shell birth、原记录 SHA、原生 UUID/rollout 或缺失说明、尾日志和批次指针 SHA）。原始快照及尾日志保留在 ops/codex-ops/learner-tab-ui-closures/issue59-20261025-1047/<batch>/。214312/214313 两个工作树在关闭前已不存在，前后状态相同，未重建或删除；其 external-not-started/registration 原证据指针均保留。没有原 UUID 的批次明确记缺失，不补造原生验收。

剩余业务仍原 ops：失败、处置/学习闭环、租约及禁止自动 finish/replay 的限制原样保留；确需返工用 codex1 新会话沿原批次/原树和上述快照接续，不跨号 resume、不重跑整批。本轮未调用 complete、删树或切号。tF3–tF8 仍由 ops 独管，未操作新 C 批 tF9/pFC、发布 tFA/pFD、对局、autoplay-log 或 ops。

仅记录与运行回执，无源码改动、未新增 full；公开材料及评论先经 gitleaks 扫描无泄漏。
