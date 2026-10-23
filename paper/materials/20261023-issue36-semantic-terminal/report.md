# #36：原生正常退出与批次语义失败的退场合同

处理 [ops6358044084](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6358044084) 和 [独立核收6358077224](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6358077224)。只读核原131316归档：原生code0、绑定1；原空fix报告fixes=[]、merged=null、tests=null/null/0，真实批次failed/rc0。原wrapper段缺失，旧主管已退出，本轮不向原批补写或伪造封印，保留原pane和失败。

运行差量只有ops/learner_tui.py的finished：移除“native code0必须batch done”这一条错误等价，增加两层含义的英文注释。rc仍须与原生退出码一致，state直接保存原finish审计的done/failed/rejected；原 finished、直接主管PID/birth、pane/label/cwd、日志/summary/原生绑定/输出SHA与75守卫均保留。记录传输结束不等于接受空修复，也不把failed转换done。wrapper、原tab日志、可选#20 seal分工和回收门不改，尤其不能用本旧分支整文件覆盖main/live的wrapper。

固定回归先调用真实finish_write_batch及verify_empty_fix：null/null/0仍返回None并登记failed/rc0，不生成no_changes/checks，不触发补测/Git（夹具会对任何此类调用抛错）。再调用finished，新的wrapper回执保存failed/rc0，原batch文件逐字节不变。0933ea0ef精确旧源码可复现同一固定用例被拒绝；其verifier前像与实际发布c707相同。另覆盖真实shell wrapper的failed和rejected/code0交接、原非终态/失权/缺完成/错退出码等拒绝。原learner_checks.py和learner-empty-fix.test.ts逐字节未改，不放宽空fix验收或原测试。

nice19、单线程worker、串行定向：tsc0；2文件21项通过（一个包装入口内有Python43项，不重复加算），wrapper Python17项单独通过。原空fix验收20项仍全过。日志本地同材料目录保留、SHA见checks.json；真实归档仅记录最小事实与原SHA，见natural-facts.json。没有full/占#46检查位、main/live/STOP/开关/在途会话动作、play、重派旧任务或关tab。

请集成员只取本次差量，保现有main/live的最小P0、stdio日志和可选seal；后续发布及下一自然批完整完成/退场/续派由原ops核收。旧131316不补造父进程权限或新测试，#36自然五项与学习/科学父继续开放。
