# 本批诊断与更正

1. 必读文件列表首次shell未执行：bubblewrap构建阶段rg扫描到并行工作树`.worktrees/codex-strategy-silent-20261013-091302/.codex`已消失。重新用限定ls／tail读取成功，未降低权限。
2. 两次rg提供了实际不存在的旧源码路径（eye/combat-*.ts、hand/act.ts、hand/screens/combat.ts）。改由rg --files与真实loop／reflex路径定位；不存在的路径不作为功能缺失证据。
3. collect_evidence初稿按states.ts而非states.observed_ts回连。初稿报告562／586／244／623／994／659未匹配，这是取证脚本口径错；正式六局均0未匹配。初稿manifest原件保留为evidence-manifest.initial.json，脚本已更正；没有重扫日志。
4. 首次样例结构命令在EVENT帧对combat=null取keys报TypeError，后选真实COMBAT帧查看。没有把该诊断写成游戏或生产bug。
5. 轮次摘要初稿用energy>0选入先手选择未就绪帧、排除GAME_OVER而丢末轮结算。初稿输出和脚本保存round-summary.json.initial.txt、summarize_evidence.py.initial.txt；正式按can_use_combat_actions和真实终态。读档未结算轮保留不完整标记，阶段／人口变化的敌HP合计差仅是差值，不是伤害。
6. 摘要更正后第一次启动未进入Python：bubblewrap扫描并行`.worktrees/exp/learner/runs/20261013-084306-experience-update/tmpb7xdfw7p`消失。原权限重试成功，未将沙箱路径竞争作为代码失败。
7. 源码差异分类首次遗漏单行/**前缀，断言失败于combat-plan.ts。正式允许真实注释前缀，并要求base全文仅Roy→Dai即等于live；16路径8相同／8仅注释署名，source-manifest保留限定结论。

以上诊断不是本批生产修复，不计fixes、不造测试成功。原宿主out／err历史仍由启动器保存；本目录保留初稿和正式材料，便于核对。

8. 账本前后全量字段比较首次在silent-0020.evidence断言失败，原因是并行学习者正常追加了证据。本批没有还原这些并行更新。正式只按本批原CLI请求核物理追加行，再保存当前fold与并行差额。
9. 物理CLI核对初稿只用note作索引，同组账本的说明相同而发生字典覆盖，id比对断言失败。正式按(id,note)联合键核30条原物理行，全部只含op/id/ts/by/where/note；没有重跑CLI或重复追加。原诊断概要保存在ledger-verification-initial.log.txt。
10. 最后补记材料的apply_patch返回Failed to write file diagnostics.md，没有修改文件。检查工作树、文件权限和可用空间后，改用任务允许的shell写本批scratch材料；不改生产源码或权限。

正式限定账本核对显示silent-0020、0021、0046、0062、0065有并行evidence追加，详见ledger-link-verification.json；它们不属于本批原30条只链接CLI，不混报本批新学习或覆盖并行记录。
