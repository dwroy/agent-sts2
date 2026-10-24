#52 集成员核验记录

来源代码1fd887cfce534bc84cf5f01148d99f1c5d031389，原开发交接e604db5068398f263bf5a3396920f065cf788bcc；独立候选tree94fe7717d202a725e60a6394977caf4c807e3ca4。四生产/四测试叶同开发SHA，main前像一致。原main并行增加仅运维记录，不进入候选源码。

- 校准producer、requested_feature与优先探针共享feature_worktree；保原完成/awaiting_review、活动PID、三次上限、retry_at、专树存在/脏树/外部writer门，不创建专树。
- 升阶audit dispatch与优先探针共享candidate，使用同一目标进阶、角色和合法局号、重试/次数、树与占用门；原runs.jsonl是report.py追加的已结束局账。只读lease探针不创建锁或预留尝试，未知日志读取保持hold。
- 普通writer等待、其他pending/running learning_requests、真实running/launching与原heavy/双槽门保留。两来源显式传真实root；原source配置/plan未改。补树/补证据自然使用原request身份。
- 集成员在隔离树独立执行原7个固定测试通过（directed.json/log）；两来源无标记/不可派标记/可派正控、保留请求/原lease、native首次消费/重复tick等在该测试内。开发82项作为来源证据分账，未累计为集成员定向计数。

稀疏组装首尝试误以为新增TS测试有父blob，Git拒绝且未写叶；随后用A/M状态准确组装。首条定向在叶尚未组装时rc2，修正后7项通过；这些为full前准备错误，full不重跑。原fixed results.jsonl按基线Git原字节补齐，SHA见assembly。

完整检查结果以checks.json及输入前后原件为准，本文不提前断言通过。full JSON/log存.artifacts/integrator52-20261024/，worker固定单次guard、nice、单worker、禁文件并行；原knowledge锁内取快照后释放，再取得live-merge锁执行检查，不反序嵌套。代码通过后精确合main，宿主四脚本部署交原ops，不复制整main到游戏live；#51明确释放前#28净组合full仍0，科学父和实际派发/入库/消费者读回不关闭。

2026-10-24T04:46:05+08:00 原唯一full完成：680文件6644过/2跳过/0失败，production tsc与full均rc0；2246源码夹具、1688依赖和469知识前后同，原worker PID41930/出生21125769已退出。full结果SHA256为65498d26f57e4c2c873bb6711152e84a79a512ab32bc54d10be03ba8f93f9b9e。新Python7项在full由一个Vitest包装测试执行，独立7与full6644分账，不相加。等待合main前最终漂移/完整知识覆盖复核和远端读回；本行不代窗口释放或宿主部署。

2026-10-24T04:49:15+08:00 合入预检第一尝试在任何Git/工作区写入前拒绝：live生成知识刷新，最初4叶、随后6叶，非仅时间戳变化；原失败见integration-preflight-first-failure.json。受测469快照、2246输入、1688依赖与tree仍同，main自anchor的tracked knowledge无差异。复核scope后将本地附加的“移动live须同旧快照”前置改为：仅8代码/测试叶精确合main，受测快照完整同、live提交同、main源码/知识无漂移；在knowledge-refresh原锁内单独抓取完整当前469清单，记录六个builder生成输出差异，不复制/覆盖任何知识、不把新数据称为已full覆盖。原锁释放后才取live-merge锁，无反序嵌套。

四生产脚本的priority_hold/feature_worktree/audit candidate不读取此六叶；calibration_job读取boss-trust.json（SHA仍同）、logs/runs.jsonl、logs/sl-attempts.jsonl及纯cadence.py，audit探针读已结束runs账。刷新输出由refresh_driver的monster-db/card-upgrades及每角色outcome/construction builders维护。固定数据测试不证明生产后续派发。下游033643宿主补测与#28游戏净组合必须由ops重新冻结最新知识，不能复用本次full。最终live知识清单与范围见live-knowledge-at-merge.json、merge-preflight.json。

2026-10-24T04:50:18+08:00 对上一段拟定预检流程补正：refresh_driver仍持原知识锁，后续room-costs/boss-damage也已自然生成。仅等待知识锁的本集成员预检PID153571已按cmdline/wchan核同并SIGTERM撤回，无index/ref/产品写入；不干预原refresh、不增加full。8叶宿主代码合入无知识冲突，不为取得新的游戏发布快照阻塞。最终仅双次只读清单采样字节同即记时观察，明确不是新的锁内稳定冻结，不能当新live数据的full。原受测快照来自原锁内且前后同；main知识Git自anchor无差异，8个刷新输出均在refresh_driver原builder链，门修不消费其内容。boss-trust仍同。下游ops按原合同独立锁内重冻最新知识；live-knowledge-at-merge.json给出实际观察范围，上一段的“最终锁内取快照”不视为已执行。
