# A7复盘、完整检查与经验 .23 兜底

记录时间 2026-10-05 22:45 CST；22:40五件事件。

fix-done 与固定成本最终树 learner-checks 均重复确认已在22:20轮归档的27f7a4d3/54560c45，五项源码与main同步64c93b38、229文件2821通过/2跳过历史保留；不重新合并、测试、加版本或shipped。后续刷新发布 7bea7d99ce309d37cbc1715ac169623b9de34df4/树 c196d2054e7a5d53de915e7944020dd4ca0d2da5 的完整外部 tsc+vitest exit0，229文件2821通过/2跳过，22:31:50开始513.33秒，日志 ops/codex-ops/learner/20261005-204301-fix-batch.fallback-c196d2054e7a5d53de915e7944020dd4ca0d2da5.checks.log。该树含最终分层及知识刷新，不含尚未合入的经验源0071cc6a；不把它冒记经验.23合后通过。

复盘 20261005-221301 exit0，Z6CFLDR3N4SB SILENT A7 F48永世沙漏：两次均80/80进场，第一次T10判死读档；第二次T11以4血14挡对34攻击及12凋萎死亡，需损32差28血，毒结算后敌134/512。成功SL1次，首末决策2669.566秒/44.49分钟。新增0124幽灵种子/营养汤与虚无基础牌耗尽的组合观察、0125两条全败线的护栏保血/输出/成长取舍、0126幽灵种子基础牌回合末虚无时点，均observed/prior unknown；旧0024/0025/0044/0063/0077/0120六项support补证，无repeat。复盘原文和22:31:24追加勘误完整归档，保留误写21→25的原句及更正41→25历史；旧3721884字节、SHA256 374c6112cb2879816961f6bd9099cb0c66c6923767d3c571f550ec0b25db6b18 不变，新段SHA256 8b61651be1fd3ea6298f433206c267e099bcf9641ede127dc9a925f589245931。

九条学习者CLI台账原行精准提交，check 126项0问题；暂不混入经验.23的15条proposed或其他工作区修改。回报bugs为空、无Roy待定；实际最优线执行比例、整场反事实/受控胜负、知识恶魔独立回血和原始伤害拆分、同ID敌次序、boss时钟比值保持未记录。只转录学习者发现，不添加游戏知识或修策略/机制。

经验批次20261005-220458（学习者220459）源 0071cc6a86f7674b91439d13ee99e5c117dc3f34 已提交，纯experience.json变更；初版及最终源固定沙箱tsc0、177文件2012例exit0，数据纠正后复测一次均通过。新增2/更新10/退役0，active88→90、48407字；A8/A9各81项39570字而实测样本0，240片配对中位+262字、最大6466→7278；旧29局重算与SADL3CGYTGSR A7来源保持。学习者刷新7bea7d99已保留，合入预检只在decision-log冲突停下，未实际merge/合后测试/版本/shipped。当前report.py刷新仍在运行，运维先归档复盘和必要论文数据，随后在允许合入时保留双方记录兜底；未提前登记shipped或宣称合后通过。

本轮按要求运行 paper_dataset.py --no-raw（nice19），执行日志 /tmp/sts2-2240-paper-dataset.log，结果另追加。学习者回报、原始事件及handoff路径按调度器消息保留；在线知识刷新、其他工作区修改和原TMPDIR/Inferno失败历史不覆盖，对局照常。

- 2026-10-05 22:49 论文数据刷新完成：`nice -n 19 python3 ops/paper_dataset.py --no-raw` exit0，切点2026-10-05T14:42:50.193Z，五项一致性通过、决策计数差异空、key scan CLEAN；行数{"commits.csv": 2519, "decisions_by_label.csv": 17268, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 517}。只提交本轮生成表和自身记录，组件成本表按已上线分层同步刷新，不重建知识；经验.23的合后沙箱检查在另一个有限命令执行，结果随后追加。

- 2026-10-05 23:03 经验.23兜底上线完成：源 `0071cc6a86f7674b91439d13ee99e5c117dc3f34` → 实际合入 `6c4a855811c5ded1ddf94e264855f85a0bae4522` → 发布 `256b0eee715750c1851f85274885a0770c85977f`，固定发布树 `5a02c2fd115d11fecf795e9759d8d7be8d708d7a`；S1.exp23唯一指向实际合入，S1.fix21仍唯一指向e7370f88。锁内提交七项新知识刷新 `f72d687f4981a575f6b82c57e25f12ad58f8dc67`，保留它们原blob及双方decision-log，唯一经验变更blob与学习者源一致（SHA256 9cbfde9465aa90e47afe05f954db418c21d10dc0d19449d32a20d2893b16d0c5）。源两轮固定沙箱177文件2012例、合后178文件2013例均tsc0/exit0，本次合后无失败或重跑；原始完整合后日志保存 `paper/materials/silent/20261005-2240-experience23-live-sandbox.md`（原始日志体 SHA256 `22e8851f1fd6b61b27894a0cd014a78351cb7afebce5e4c5ab61120c5d04f507`）。main机械同步 `0f08dd3d619bb783a1c94dd0d76866fe58d48c15`，12项incoming知识/eval逐blob与固定发布一致，999项已有源码及81份记录/生成表原样保留；铁甲战士不变，main已有herdr保留，未追随后续分支。

- 2026-10-05 23:03 已经ledger.py update --json/by=ops追加并精准提交15项S1.exp23 shipped：silent-0019、silent-0020、silent-0021、silent-0006、silent-0024、silent-0059、silent-0025、silent-0077、silent-0027、silent-0053、silent-0110、silent-0111、silent-0121、silent-0122、silent-0123；学习者15条proposed原行与第二十三节173行先归档ea869e2d，旧643705字节/SHA256及全部旧失败/预检历史保留。CLI校验：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 127 item(s), 0 problem(s)；0114/0115原链与完整折叠内容未动。仅登记学习者实际产出，不补0059窄结论的新支持、不添加游戏知识。刷新静默learning-curve CSV反映当前登记，主论文与成本表保留本轮862d42dd的14:42:50.193Z切点，不重新扫描完整原日志；无新纯bug或Roy待定，本轮不追加收件箱。

- 2026-10-05 23:03 完整外部补测命令 `bash ops/codex-ops-do.sh learner-recheck 20261005-220458-experience-update` 已请求，有限动作由沙箱外执行，正式结果等待后续learner-checks；本记录不宣称该检查通过，也不把本轮成本fix树27f7a4d3/7bea7d99的完整成功算本经验树成功。后续新224301学习批次工作树和在线刷新留原处；对局/调度持续，没有运行play或停止进程。

- 2026-10-05 23:08 收回已提交的有限补测动作：`bash ops/codex-ops-do.sh learner-recheck 20261005-220458-experience-update` exit0，本批固定发布 `256b0eee715750c1851f85274885a0770c85977f`/树 `5a02c2fd115d11fecf795e9759d8d7be8d708d7a` 完整沙箱外tsc+vitest exit0，229文件2821例通过/2跳过，22:53:41开始、530.85秒；日志 `ops/codex-ops/learner/20261005-220458-experience-update.fallback-5a02c2fd115d11fecf795e9759d8d7be8d708d7a.checks.log`（SHA256 `dd208eeb154d278aaf009bed2fad0d7b91e6f7df93ae759cb037280b30147ada`），fallback_checks源仅0071cc6a，git对象/main/live祖先一致。完整补测待办完成，先前等待及原merged=null/预检停止状态保留，不改学习者原回报或调度器原batch.state=failed；正式learner-checks事件随后只需重复确认，不再请求、测试或登记版本/shipped。15项登记与合后日志归档已提交 `acf9e441a21bd794d717bb803d30d15d5b7d59c5`，记录数据免代码测试；没有停止对局或处理新批次。
