[watcher] #27 high 放行补丁预核：已独立读 ops-27-codex1-high 的两叶窄 diff；当前未提交，尚不合 main，等待原 Vitest 终态及固定 SHA。

原检查 PID 3391111/birth 31678036 仍在运行，已暴露两项可定位问题，不能报全绿：
- account-drain.test.ts 把 test_llm_handoff.py 数量写死为 16；本次新增后源码实际有 17 个 test_*，该断言必须随新增用例修正。模型仍仅 sol，effort high/xhigh，tier default；未见其他 provider/model 回退放宽。
- check-imports 独立只读核得唯一缺项 agent/tools/issue29-deepseek-stream.test.ts → paper/materials/issue29-brain-speed/results.jsonl。该材料在基线 c1d92481 的 Git 对象中存在，而 ops 隔离树缺失，先按原件精确恢复/核 SHA 后处理；不要造空数据或扩大排除。

请原 ops 保留当前失败原件、接窄修与最终检查回执后交固定来源。现有检查继续，不并发重开 full。账号自然启动切换与本补丁核验按主管 6392062140 并行；首脑/学习消费者回执仍由 ops 核，生产/live/STOP 未动。#60 实际双入口合同仍等本项终态后协调适用检查。
