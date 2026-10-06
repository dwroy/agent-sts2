# 运维交接：fix-batch / S1.fix36

本批已完成一个纯 bug，已实际合入 live，并通过源与合后沙箱检查。请运维据本批 fix-done 完成事件核验后，经主目录 learner/ledger.py 将 silent-0193 登记为 shipped、版本 S1.fix36；学习者仅追加 proposed，未代登记 shipped。silent-0194 是独立机制账本，不要随本 bug 重置或改状态。主分支同步由运维处理。

- 基线 main：b9d0fb62a779ab876b0159abc80ace487942c3b4。
- 源修复：3a4c5626434efc909122483769468bba953d63c1。
- live 知识刷新保留点：b75e1076afbabab562dc56798c2955b210cc04a0。
- 实际 live 代码合并：da78fee9739a8548827094e30cd2594362c526f4。
- live 上线记录提交：8aead9fa447e76f6a36bdf0a5d5214ccc5aeb522。
- 发布 tree：d03d1bf45fc5f4ffa87825d07c318f3fff5e570a。
- eval 版本：S1.fix36，其 commit 字段指向实际代码合并。
- 来源：fix-queue-v4 的 21:58 结实绷带条目；silent-0193 bug-infra 与独立机制 silent-0194；L704TLETMZBM / SILENT / A10 / F48 / 末次 T3、T4，notes/lessons.md:5153。

实现仅补已观察弃牌格挡：末 T4 两次弃牌各 3，生存者自身 12，加成后 18 挡，对 24 来袭损 6，总伤害 23 含毒 6。末 T3 爆发重放杂技的两次实际弃牌共补 6；计算下注自身离手后弃 9 张补 27，已有 6 到 33。普通投掷匕首的抽 1 仅在绷带接线内读已有文本；未知弃牌身份仍交 Jev，模型停止续推，实际已知选择可离线重放。不外推升级、回合末弃牌、未知交互或整场胜负；铁甲与无绷带行为保持。

固定证据帧在 agent/tests/silent-tough-bandages-state.json，测试 agent/tests/silent-tough-bandages.test.ts 共 10 例。关键用例：F48 final T4: Dagger Throw and Survivor discard twice for eighteen Block and six HP loss。测试用手写固定知识和固定怪物数据，不依赖知识刷新数据或调用 LLM/网络。

最终三处源码撤回后，新测试 8 失败、2 通过，退出 1；恢复后新 10 例通过，连同相关旧测试 4 文件 27 例通过。源与 live 的最终 test-sandbox 均 tsc 0、vitest 208 文件/2237 用例/退出 0。初稿夹具错误、投掷匕首无 Cards 变量诊断、未固定 rollout 抽序断言错误、初稿扩大抽牌接线造成 silent-hidden-daggers 旧用例回归及首轮全套失败，均保留原日志；已缩小接线范围修正，最终全套通过。没有高负载超时重跑。完整沙箱外 tsc/vitest 尚待调度器补跑，不把沙箱结果冒充完整外部结果。

live 合并锁内先等待刷新，再提交 7 个刷新文件；知识重叠 0，合前/合后/发布版本知识逐 blob 相同。双方 decision-log 只有追加历史冲突，已保留两侧原文并登记本批上线。未改生成器，无需重建。gitleaks 源、刷新、合并、上线四次均通过。live 既有 notes/monster-db-check.md 和未跟踪 notes/fight-value-backtest-silent.md 保留，源工作树干净。队列未修改。

124 项既有修复逐项提交在 already-fixed.md / already-fixed.json；未重复实现。剩余五类见 skipped.json：永冻首次能力状态需专项；mod 超时根因与 Codex 缓存受控实测证据不足；boss 模拟性能需专项；策略事项交 Dai。本批未新增药水代价、过滤、否决或其他打法规则。

核验收据 verification.json；源码全套 source-suite-final.txt/exit；合后全套 live-suite.log/exit；撤修复 bandages-final-without-fix.txt/exit；恢复 bandages-final-restored.txt/exit；ledger-update-source.json 与 ledger-update-live.json 记录 CLI 追加内容。账本校验 195 item(s)、0 problem(s)。不推送、不运行 play、不停止对局。
