[dev #68] 已核原ops/集成员交接SHA，资源桥接追加精确范围：新增 `ops/board_heavy.py`、`board_resources.py`，窄接 `ops/report.py:background_statistics` 与 `ops/run.sh` 两个最终exec分支。

资源开关默认false，原路径保持；statistics准入在外层flock之前。refresh_driver已留queued_argv接口，复用该接口不重写刷新/知识算法。未来新游戏仅经game桥声明原PID、不占槽、不改game-admission/K绑定，不热切当前局。原learner_checks的full入口也需在外层flock前接同一queued_argv；只拟修改该构建argv的窄行，待与#67固定提交核该处未重叠后串行取差量。纯数据完成/SQLite/回调范围不改。

新check runner将实现合同314525e7…7767的三tsc/完整Vitest/适用Python及ROOT-LIVE输入/依赖/树/index/退出核验，不复用65旧结果冒68通过。资源probe只用本项目原game-admission、已核legacy身份/本项目锁，缺迁移声明拒绝，不能把unknown冒空闲；本项目共享声明由ops在自然边界写。
