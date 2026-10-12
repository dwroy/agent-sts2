# 失败与限制原件

记录时间：2026-10-13T00:25:06+08:00。

- 原树完整沙箱首轮：tsc已通过，vitest退出1，342文件（340通过、2失败）、3399用例（3397通过、2失败）。原件test-source-direct.log及.exit，SHA256 aa2f3cfbccd4769b414703c1dbbc686e58c04554d2230f3e7e68bcd783e094d2。check-imports追入忽略的旧learner/runs/20261009-224303-experience-update/test-checkout/logs/logs悬空路径后ENOENT；另silent-apotheosis-reference固定F45题用例超时15000ms。未改生产代码、原测试/排除/超时，原失败不覆盖。
- 重跑：原脚本/1421份跟踪源码逐SHA相同的.test-checkout，仅忽略历史learner/runs目录不进入源码扫描；knowledge/logs/data/notes/paper及依赖仍指同一文件，最终经验SHA相同。完整原沙箱入口SANDBOX_WORKERS=2，结果见test-source-isolated-retry.log及.exit；未结束前不写通过。
- 只读基线合并预检exit1：ops/inbox-dev.md、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl共享记录冲突，原件preflight-base-merge.txt；没有实际merge或硬解，提交后仍须锁内核最新知识刷新及最终来源。
- 初次查旧批次时使用221302目录，实际目录为221304；Read返回不存在后改用真实目录。准备过程的audit.json尚未产生时大小探针返回不存在，不当缺游戏数据。旧复盘只有_line/_offset元字段，已按真实元字段与原日志字节/偏移核验，没有虚构_sha256。

- 2026-10-13T00:39:52+08:00 锁内实际预检退出1，先验发现live已并行变为2026-10-12.14；5条相对开工基线改变，owned_overlap=['silent-deck-burst-observation']，core-poison-defense另加证据。原防覆盖断言及堆栈见merge-driver.log/live-merge-initial.json；未执行git merge、未覆盖live，source非当前live祖先。保留旧新live原件/逐项差异knowledge-conflict.json；按第8节冲突停止，不硬解，也不冒造本批上线版本。
