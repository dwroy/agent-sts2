只读命令与限定范围：

- date --iso-8601=seconds（每次写生成时间前执行）
- git diff --stat / git diff -- <八个审阅源路径> / git diff --check（仅拥有者源树）
- sed -n <限定行>、rg -n / rg --files（源函数、模板、固定测试、已有材料）
- nice -n 19 python3 -B ops/tests/test_strategy_research_scheduling.py -v（仅临时固定 Git/状态/wrapper fixture）
- nice -n 19 python3 -B ops/tests/test_strategy_research.py -v（仅临时固定纯报告/完成 fixture）
- 临时固定 fixture：保留 batch 原基线，提交人工 ops/fixed.py，前移 root baseline/report.base，调用 no_change；修前 true、唯一请求修后 false。
- SHA256 对上述源、输入、说明、测试日志和本目录材料逐文件记录。
- 只读解析 notes/strategy-research-silent.json 和冻结 input-manifest/task.md；未调用任何 sandbox status、busy 或实际调度函数。

独立测试命令、工作目录、执行结果和前后源SHA见 independent-scheduling-tests.json 与 independent-final-tests.json。模型/宿主/游戏没有调用，临时 fixture 不读项目凭据或环境文件。
