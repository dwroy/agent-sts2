# 原P0单次自然边界发布步骤

Claude原守候已绑定1ZZHM2MV19YB；不另建守候，不在局中写STOP。

1. 收到原守候终局通知后，实际核 ops/STOP、原1ZZ局终及无活动play。对局仍在或STOP未落地，结束本轮保pending，不轮询。
2. 调用已准备的单次发布器：`python3 .artifacts/ops-P0-stop-boundary-20261021-021x/publish-once.py`。执行前核本目录preparation.json中的SHA；它会持原live锁核原R406及源/数据漂移，窄运17+CARD配置、保最新知识，实际读回消费者、登记唯一release并写双通知。它不创建/删除STOP、不启动游戏、不重full；任一步失败保STOP，查publication-blocked.json告watcher/Claude，不盲目重跑部分完成交易。
3. publication.json确认source/registry/consumer/双通知完成后，再核无活动play和原STOP身份未变。若旧autoplay仍在，只对已核身份的原循环用现有 `bash ops/codex-ops-do.sh autoplay-stop`；不触对局、report/refresh或其他PID。
4. 沿现有 `bash ops/codex-ops-do.sh autoplay-start` 恢复。该原动作先检查旧循环/play/容量等守卫，才移除STOP并拉起原循环；失败不盲目重复，不声称已恢复。保存实际PID/开始回执。
5. 有界读取下一局run-config的实际CARD=jev/REFLEXoff、release/source与首动作。未出现则pending，等原调度事件，不sleep/轮询。第一新局由Claude判P0质量；同值/全跳/错误/兜底增多告Claude，按其下一边界指令回brain。P2仍等2稳定局，P4在实际发布之后，Regent暂停。

当前17源完整门已通过：628文件5932过2原跳、tree297cb270/2391输入2529b688。单配置语义差异和只读消费者预演不冒新的18叶full或自然质量。原R4空草稿/科学父/旧失败不变。
