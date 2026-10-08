# 本批固定重放入口

源码必须使用不可变 `261af56e0022cc0012b80870bd3f52bd121d45c2`，模型输入逐项核对 before-provenance.json 的 SHA256。档案中 model-inputs 保存本角色和公共 JSON 原件，game-data.frozen.json 保存运行所用固定卡牌缓存；不加载实时刷新替代固定输入。

审计助手原位置是 `learner/runs/20261008-112138-boss-sim-batch/`。助手的相对源码导入按这个深度书写；从归档重放时，先在同 base 独立工作树恢复这个相对目录，再复制档案内容到该目录，而不是在 experiments 目录直接运行助手。原始绝对日志路径、off/len/hash 作为证据保留；模拟只读已嵌入 fights/ranking-inputs 的固定状态，不重新抽取后续日志。原验收回执中的输入路径和 SHA 必须保持，移位副本仅用于独立复核，不覆盖原验收文件。

在 agent/ 设置 PATH 加 ~/.local/node/bin、TMPDIR 为恢复目录、CHARACTER=silent，以 nice -n 19 调用原 `node --import tsx tools/boss-sim/backtest.ts`，参数在 jobs.json：200 样本、seed=1、t1/pre、--no-rollout。一定保留完整原 fights 行顺序；--enc 和 --keys 的选择在原 runner 内执行，不能先过滤/重排行以改变 seed。after 女王重放使用 --enc QUEEN；其他 boss 复用仅在源/模型/按键结果核对后进行。

调参 threat=1/2 只用 tune-keys.json，禁止包含 val。tune-analysis.py 所有拟合和 OOF 只使用 tune。ranking-replay.mts 对完整原选项组使用 200 样本、seed=7、原配对并列口径，缺选项不报告收益。

基准前缀 before-prefix.frozen.jsonl 保存原串行已完成的 138 场/276 行，其余 95 场使用 before-tail-0/1.keys.json（48/47 场）从同一完整 fights 文件调用原 runner，输出到独立目录。assemble-partition.py 核对三部分互斥和全覆盖后生成 before-authoritative-results/results-0.jsonl；存储重排发生在模拟完成后，不改变模拟 seed。原整批串行原件与状态另存，不用其未完成部分冒充全量。

finalize-pair.py 要求 before-authoritative-results 全量 466 行和女王 30 行全部完成，核对模型、结局和配对键后调用原 trust.py/per-turn.py。原 acceptance.py 的 base/head 都取 dispatch_base，没有生产源码候选；B5 场数与严格改善门槛自然拒绝。重新验收必须输出到新的 scratch 目录，不能覆盖本批原回执和两份 trust。

test-sandbox.original.log/receipt.json 与 checks-summary.json 是实际原脚本结果；gitleaks 日志、原失败转录、根台账请求/回执和归档 manifest 分别保留。此档案未发布到 live，不创建版本，不修改 knowledge/characters/silent/boss-trust.json。
