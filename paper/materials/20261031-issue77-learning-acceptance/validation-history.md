# 验证历史

保留 `slots-first.log` 的首轮16项2失败：新夹具未写原batch.out，原verify按合同拒绝；只补固定输出后重跑通过。`four-candidates-readonly.log` 保存原对象追加超过8 MiB文档上限的实际失败；后续单独日志保留，未改原外部候选。

TS定向第一次从仓库根以--root agent启动：3文件22项通过，learning-concurrency旧包装以cwd解释../ops失败。已从agent目录按原合同重跑，四文件23项通过。该启动错误日志后来在更正cwd时被同名目标覆盖；下方为覆盖前工具读取保留的错误段，不冒原完整raw日志：

```
FAIL tests/learning-concurrency.test.ts > enforces configurable shared learning admission and the original tick report
Error: Command failed: nice -n 19 python3 -B ../ops/tests/test_learning_concurrency.py
python3: can't open file '/home/dw/Projects/agent-sts2/.worktrees/issue-77-own-learning-slot/../ops/tests/test_learning_concurrency.py': [Errno 2] No such file or directory
Test Files 1 failed | 3 passed (4)
Tests 1 failed | 22 passed (23)
```

纠正时另一次metadata读取从agent目录误用ops相对路径报ModuleNotFoundError，移动日志也用错相对路径报cannot stat；这些只影响读取/归档命令，未改生产状态。后续从根目录重新读取原报告，从agent目录执行定向，均完成。完整sandbox按规范入口从agent内部运行，与上述启动错误分账。

最终git diff --cached --check只报三份原始Vitest日志末尾空行；原始日志保留，不为格式检查重写。排除本批raw .log后源码/文档的空白检查通过，与测试失败分账。
