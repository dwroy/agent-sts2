本任务是 Claude 明确指派的 H1 两局自然验收，只读原始日志；不启动或重启对局，不改线上，不开启 H2+。原 ops 负责精确发布树宿主闭环。

发布边界按正式 ops-publication.json 的实际时间 2026-10-17 10:50:56 CST（02:50:56Z），不是后写 decision-log 的时间。基线是该时间之前结束的最后五局 Silent：YZW、N9GK、CVJ4、DC32、2Q6。JKDUL0AL0TW6 在发布前以旧进程/99737be 开局、10:51:27 才结束，既不充新局，也不改填进冻结基线；另外报告它便于追溯。

第一个候选 5H83F3J0XSTE 于 11:00:49 启动，原 run-config 为 dbd416164、human-pace-h1-v1、Silent/play/auto/非restart/F1。run-config 的 loop.boss_sim_completion 是遗留文字 required-full-paired-v1；采纳判断使用明确的 human_pace.required_full_replaced=true 和终局实际 time_budget/completion 记录，不能只凭该旧标签下结论。dirty 列表是知识/记录，未据此冒认完整运行树全检或重新校准。

监听只有一个，PID3307923/birth109774449，exec session77455，锁 listener.once；阻塞 inotify 监听 run-config/runs 追加。session92638 仅转显自己的 listener.log，不查询对局或数据库。监听保留启动/分段和终局原行、offset/length/SHA，收到两局终局即退出。

可比延迟使用每条决策 latency_ms 的 pre+planner+plan+jev+deepseek，排除 action；同时报告同战斗回合累计值。这个旧新共同代理量仍可能含不属于 H1 预算的传输，因此与新 time_budget.actual_ms/turn_actual_ms 分列。后者按 key 去重，不能重复累计 turn_actual_ms。普通/精英/Boss 首试回合与 SL 重试分开，L2 大脑另列；L2 可能嵌入 pre/planner，归因项不能再次相加。超预算与预算兜底只用实际新字段，旧局为 unknown，不能倒填 0。

L2 题数按 question_id；原生调用记录包括失败/重试。native ms 是本次尝试，call_ms 可含本题之前尝试的累计值，不能跨重试相加。题延迟优先 brain.jsonl 的整题 latency_ms，若缺行则采用本题原生 cumulative call_ms 最大值并明确边界。CVJ4 有两条历史坏行（brain/codex-calls 各一）已隔离保存与 SHA 绑定；合法记录计数不是未记录调用的完整证明。

B2/B3 分别列 completion 状态、budgeted partial 数/比例、根样本分布、候选和配对样本分布、requested、memoHit。C2 提前完成和低可信样本上限不算预算截断；缓存行与独立计算不混为独立样本。

G1c 沿原 V5 root/exclusion、Silent A10 描述性口径，不冒原生身份门槛；初始58局/旧归档50局，首候选预期为第59局，必须终局后才登记完成。Boss 首试与含SL最终分开；首试漏斗在第一次实际/预测死亡停止，不能纳入之后SL才到达的Boss。两局不能证明总体过关率不下降。

复现：先按 data-cut.json 冻结边界运行 freeze-inputs.py；analyze.py 只读冻结 projection。baseline-r2 复用第一轮已完成四流，原初稿因历史坏行失败保留，不重扫四流；所有有效引用逐行带 SHA，原帧不改。
