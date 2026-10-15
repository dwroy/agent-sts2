# V5 战绩读回 — 2026-10-15 17:35 CST

用户请求：看看v5的战绩。

仅统计主线静默猎手实际 A10、已结束的独立局。按每局 run-config 的真实代码祖先认定 V5（起点 V5-R328），按 codex-successful-brain-v1 纳入默认成绩；一局内 SL 不增加分母。最后已结束局为 2LZHP9BYFTHE，17:24:35 CST 止于 F39。

| 口径 | 胜 / 已结束局 | 比例 |
|---|---:|---:|
| V5 默认最终成绩（含 SL） | 3 / 28 | 10.71% |
| V5 首试通关 | 1 / 28 | 3.57% |
| 最近 20 局默认最终成绩 | 3 / 20 | 15.00% |
| V5 全部原始局（含两局来源未闭环） | 3 / 30 | 10.00% |

默认成绩为 3 胜 25 负；三胜中首试 1 胜、SL 后 2 胜。LKC9YXKZWTKR 首试获胜（10-14 07:18 CST）；9GTFF6DC500L（10-14 14:18 CST）及 UPAB38G2PA02（10-15 10:59 CST）均为 SL 后胜。默认最终平均到达 F34.29；该漏斗不代替通关指标。

W1YY8PEWGUF9、HLAWCGM3KHVB 两局保留原始负局，各有旧脑题未闭环，按现行默认来源策略排除；不将其未知来源称为另一个成功引擎。HLAW 另因混合账号整局不进 V5-S 自然验收。

P1/P3 on 的三个已结束合格局 WJ0LTVSSDY61、DUB5VQQ6D6D1、2LZHP9BYFTHE，分别止于 F23/F24/F39，0 胜 3 负。P2/C2 on 刚发布，当前没有已结束的对应自然局，不能从旧 shadow 局宣称效果。版本、知识、账号和对局条件同期变化，样本小，不据此认定升级因果收益或退步。

## 证据与复算

先用现有 eval/metrics.py 完成日志库增量同步，再保存以下查询的原输出（只读评估，无模拟/API/对局改动）：

```sh
nice -n 19 data/logdb-venv/bin/python eval/metrics.py --character silent --ascension 10 --since 2026-10-13T10:00:00Z --group-by family --json --no-calibration --no-sync
```

metrics.json 保留现有工具原输出，不是最终架构分母：runs.code=current 触发时间兜底，且专题 family=Silent 会把若干实际 V5 局分到旧类别。最终 verified-cohort.json 对 32 个范围内已结束局逐一绑定真实 run-config.commit、原终局 offset/bytes/SHA 与 V5-R328 祖先；其中 30 局确属 V5、2 局为旧架构。实际 V5 中默认合格 28 局。所有真实启动的 dirty_files 仅为知识/记录目录，元数据不冒充历史脏叶快照。

P1/P3 配置及 WJ/DUB 自然消费者另见原 V5-S 完整接线回执；新 P2/C2 on 的下一自然消费者仍由原 watcher 验收。当前只读战绩，不更改分组脚本、原始日志、版本、游戏、账号或学习任务。
