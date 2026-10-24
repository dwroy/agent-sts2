# #60最新接线组合退修

[watcher]
2026-10-25T02:57:14+08:00 最新28780925b实际组合的唯一本批full已到终态，**暂不工程接收/安装/发布，退原开发补测试夹具依赖**。生产tsc0；679文件中677过、2失败；测试6626过、2失败、2原有跳过（Python子进程中3断言失败，不另混成3个Vitest失败）。原PID2026370/birth29104679已退出，原检查锁独立可取；2788输入/1417依赖、index entries/flags及tree独立核同，原index字节变化仍保留，结果SHA `99803774472adf367990ce974febef90e1afce6468b297fef7725ca07c901eb4`。没有重复full。

两处失败均有原日志证实新增解析器在隔离根不存在：
- `agent/tests/account-drain.test.ts` → `ops/tests/test_llm_handoff.py`：第136/149行复制清单没有`knowledge_runtime_env.py`，`test_real_launchers_defer_before_any_game_or_broker_work`与`test_brain_selector_is_passed_to_next_play`分别得到78而预期76/0。
- `agent/tests/publication-admission.test.ts` → `ops/tests/test_publication_gate.py`：第46行复制清单漏同一文件，`test_all_three_real_game_entries_refuse_publication_and_global_markers`得到78而预期76。

`ops/run.sh`第10行新增调用该只依赖Python标准库的真实解析器，隔离夹具仍只复制旧依赖，所以在原准入门/brain选择断言之前返回78。当前证据定位为夹具依赖闭包缺口，不能据此说线上解析器本身失败，也不能忽略失败称全绿。请原dev修两文件共三处fixture复制清单，保真实解析器、缺控制off和原预期/准入断言；不要mock掉解析或改预期吞78。补固定SHA、精确变更清单及对应Python两文件和TS两包装结果，再交原集成员核新输入及下一必要检查；开发不要重复启动full。

本批未运行预备安装脚本，main/live源码未改、生产DB/控制文件未建，未热改在途、未强tick/模型/游戏。独立Python19项和开发A→B/disabled真实SQLite探针原件审读仍分别保留，不抵这两项失败。一次状态查询误调原启动器被原锁在tsc/full前拒绝，未开第二次full；状态临时覆盖按原上下文恢复，`observation-correction.json`保原件，不把该锁拒绝冒代码失败。

冻结来源`28780925be9e2ba4029a328920946aac05d9b328`，anchor`4e435fa174b88009e2c239067dfc2b138d78fe12`，tree`8998bfe7737d9a40d057fdd98058302fed7ada00`；原日志/结果/独立终态/退修定位在`paper/materials/20261025-issue60-wiring-composition-integrator/`。保原失败、树和证据，不修改本冻结树补绿。原ops继续#58原RR2，#60暂停待修；生产迁移只冻届时真实已发布叶，469当时物理叶/135统计夹具/465快照差异保边界，控制SHA/原batch恢复/合法候选→tools正负例→自然局及学习效果、旧反证/ACK/科学父仍未验，不让#58等#60。

