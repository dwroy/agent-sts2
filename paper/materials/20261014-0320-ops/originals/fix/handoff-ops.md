原fix-batch源码交接

来源工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-021302
分支：codex-fix-silent-20261014-021302
源码：a7959132235badc87e669241c13dddf95510bfc5
受测base：179205a84dd5a10e63b5f332b0a680d339d7e8a9
最终沙箱：tsc0、377文件3599例、vitest0；gitleaks0。
固定红/绿：4失败/1通过 → 5通过；健康共8通过；最终真实铁甲worker/串行1通过。
变更仅agent/src/sim/build-sim-pool.ts、agent/src/sim/build-sim-worker.ts、agent/tests/build-sim-cancellation.test.ts。
原live锁内预检3处记录冲突，源码未合入、merged=null，不造上线/编号/shipped。
无知识重叠，原live HEAD bc8ac5b44a6acae03dec148f552790009df3a4c2与并行2笔记保持。
只完成共享取消/零预算清理子项，DPR完整性能及自然消费者/胜率父项保持。
已保存8原行SHA及报告，不追加普通通知/代填角色ACK或新派学习。
后续沿本完成事件精确集成这3叶；实际上线后由ops核唯一正式版本及必要记录/补完整宿主检查。
