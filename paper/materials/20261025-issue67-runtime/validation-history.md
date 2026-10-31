# #67 验证历史

基线 a6767d51efe6a06717037af28300bf4837dd5643，独立树 issue-67-pure-learning-runtime。仅固定夹具；未调用模型/对局/生产库。所有检查 nice19，Vitest单线程worker。

- 分类最小接线：生产tsc0，knowledge-runtime.test.ts 10通过；8d6e4b021交#66，不冒整体full。
- 首次 Python 8项有1败：source-lock正例夹具新建的 `ops/live-merge.lock` 没被夹具.gitignore忽略，纯输出检测将其计为未知改动。补齐夹具 `*.lock`，再次8通过；生产锁未被删除或放松。
- 首次7文件定向：48通过/2失败；都在 legacy-refresh-incremental.test.ts。旧未配置runtime的可重建刷新夹具只复制原模块，driver却无条件导入新module，`ModuleNotFoundError: No module named 'learning_runtime_data'`。修为无控制文件保持原step路径；旧刷新6项复验通过。
- 追加实际D1/loader/合同测试后，6文件46项通过；独立Python9项通过，含原refresh-silent.py真实校准固定夹具、原算法与原门、D1发布、重复调用不重算、原运营完成。原calibrator输出的“trusted”仅固定测试原数据结果，不是本系统新增知识或生产准入。
- 扩展事务负例至12项时1败：预期SQLite NOT NULL故障未抛出。原因是记录修订去重用了宽 `INSERT OR IGNORE`，会吞掉其他约束失败。改为仅 `ON CONFLICT(character,id,revision) DO NOTHING`；后续12项通过，证明中途约束失败整笔事务回滚。
- 上述早期stdout/stderr还在本开发原生会话工具回执中；本文件保留首败与修复事实，不将早期检查改写为通过。最终检查日志另以独立文件追加，不覆盖。
- `sandbox-full.log`：第一轮完整沙箱由本会话主动中断，exit130，无最终分母。检查期间发现原保留校准树的当前脚本/方法根和 JSON 兼容视图接续缺口，核 exact cwd/argv/stdout 后仅 SIGINT 本项 Vitest PID1045070/birth34440683；原对局/其他会话未动。修复后实际旧 Git worktree + 当前安装脚本的原校准固定夹具通过。
- `python-tests-with-builder.log`：首次实际 outcome 构建夹具缺少 MAP 边界，原 builder 保留未知没有生成预期分母；修正夹具为原真实 MAP 边界和显式 A10，未改算法。后续 `python-tests-statistics.log` 13项通过。
- `mixed-probe.log`：首次混合产物夹具选择需实现的 general:deck 经验，却未提供原代码提案，原审计拒绝。改夹具为原无实现依赖的 general:route 后，`mixed-probe-valid.log` 和 `mixed-probe-final.log` 通过；未豁免提案规则。
- `sandbox-final.log`：第二轮同样主动中断/exit130，无最终分母。收尾发现升阶审计通用recheck缺六覆盖/原租约门，核本项 PID1302230/birth34838251/cwd/stdout 后仅中断本 runner。现原recheck复用 ascension_audit.finish，原合同另存 audit_level，真实升阶工作树夹具核不完整拒绝/迟到不覆盖/原请求恢复。
- `python-tests-audit-recovery.log`：20项通过，含以上原恢复入口、运营失败原候选事件、证据字节区间、刷新排队前合同/重启、分入口managed_paths、真实统计/固定校准/锁忙/中断恢复/备份损坏拒绝。
- `targeted-final.log`：7文件43项通过（此前版本，最终冻结检查另列）；生产tsc及runtime CLI编译exit0，`mixed-probe-final.log` 真实SQLite跨进程K1+运营分别完成、源码仍未合入、未知能力拒绝。
- 最终源码冻结清单 `source-freeze.json`，完整沙箱日志 `sandbox-frozen.log`。终态与准确分母在交付报告追加；前两轮中断不计通过。
- `sandbox-frozen.log`：第三轮主动中断/exit130，无最终分母。已核本项 PID1309964/birth34850902/cwd/stdout，仅中断该runner；修分入口managed_paths后，catalog/query旧调用仍传basename，补为完整角色/公共相对路径，增加真实查询data_version与缺叶不回旧catalog断言。另将D1/K1依赖核验延至实际数据读取/run-config，避免外层K1 CLI在绑定子进程之前导入模块就误核Git源；真正消费者仍拒绝不匹配依赖。没有改K1 CLI或#68排队边界。
- `targeted-frozen.log` 7文件43项通过（含20项Python固定夹具与真实下游路径；依赖核验时机的最终小差量由最终沙箱覆盖）；另 `audit-retention-final.log` 6文件53项通过，原升阶报告/路径/输出、wrapper、registration、retention均核。
- 最终清单改为 `source-freeze-final.json`，实际适用完整检查 `sandbox-final-complete.log`，启动身份 `final-check-start.json`；前三轮中断日志全部保留，不计通过。最终结果在report.md登记。
- `sandbox-final-complete.log`：冻结源码未变，但线程池在约18分钟CPU后连续数分钟无CPU增量/无测试子进程；进程只剩epoll/futex等待（含rolldown线程），无最终汇总。仅SIGINT已核PID1355916/birth34881348/cwd/stdout，exit130。不是源码测试通过，也不编造卡住的具体测试。
- `pool-recovery-probe.log`：试用末尾重复`--pool`覆盖被Vitest明确拒绝，exit1；没有执行测试。保留此探针首败。随后原脚本另存`sandbox-forks.sh`诊断副本，仅改cd定位与主池threads→forks（原排除项/tsc/paths检查不变），单worker+verbose跑`sandbox-forks.log`；未改仓库原测试脚本或受测源码。
- `sandbox-forks.log`：160文件/2942项已报告通过后同样卡住，无最终分母。只读诊断本项worker PID1481976/birth35100892，实际文件为`silent-potion-reference.test.ts`，只有PipeWrap。根因是本包runtime-data新增静态node:fs依赖，与该既存fs mock工厂导入knowledge/files形成模块Promise循环；此前“线程池问题”的判断过早，修代码而非改排除。诊断见`hang-diagnosis.json`。仅中断本项已核fork runner PID1455055/birth35020560，exit130；原诊断worker已退出。
- 修为D1实际消费时createRequire延迟读取真实fs，默认关闭路径保留无fs依赖；原测试没有被改动。`fs-cycle-recovery.log`：原12项药水引用+4项运营/D1读回，共2文件16项通过。runtime CLI重新编译后`mixed-probe-delivery-compiled.log`重新核真实混合产物，避免复用编译在途结果。
- 本次交付冻结为`source-freeze-delivery.json`；重新使用**原始未改动**`agent/tools/test-sandbox.sh`（单worker、verbose）产生`sandbox-delivery.log`。此前冻结与中断记录全部保留，不将任何中断轮计成full通过。
- `sandbox-delivery.log`终态exit1，638文件635过/3败，5900项过/3败，1415.20s。失败精确为：fight-value静态读取者检查将D1 names Set字符串算成读者；test_llm_handoff复制旧模块列表导致新launch适配器缺失；check-imports缺HEAD原始results.jsonl。
- 运行时/原冻结33叶均未再改。只把names Set作为文件注册从原静态检查文本中去掉（其他位置仍受原限制），账号夹具复制四个新模块并核关闭时不初始化DB；原storage CLI展开唯一基线blob b84d95c5185941eec143cbcf2966d5770309cca5（211076 bytes/task_state_unchanged=true）。`verification-delta.json`记录两测试叶与恢复输入。
- `final-recovery.log`：5文件23项全通过/exit0，覆盖原三失败、真实运营/D1及未执行到的paths。未重复广跑、未把先前full改写成全绿。三方实际发布组合full继续归原集成。
