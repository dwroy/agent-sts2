# #25 开卷资料接入验收

2026-10-21。本批是离线机械资料与消费者接口；没有对局结果、策略提案或自然采用收益。来源许可、运行边界与重建命令见 [docs/open-book.md](../../../docs/open-book.md)。

## 来源与分账

仅使用 Spire Codex revision `4f52f5a53597e4fdc6cf130f7ebe2cdd35236101` 的 `data-beta/v0.111.0`，中英四类资料各一份，共 8 个源文件。先核 PolyForm Noncommercial 1.0.0；来源 URL、日期、样本、SHA、许可和过滤方法在 [coverage.json](coverage.json) 的 `source` 中逐项保留。原件只在忽略目录 `data/external/spire-codex/`，不进 git。有缓存不再下载；本次恢复和验收没有重新下载。

许可：[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)。Required Notice：

> Copyright © 2025-present Peter Lord and Spire Codex contributors.

共整理 1,074 条机械资料：595 牌、298 遗物、115 怪物、66 事件。Silent 专属 91 牌、9 遗物单列；其他角色池保留来源与条件范围，不计 Silent 实盘验证。没有导入 wiki、图片、风味或事件长剧情。

## 覆盖与差异

比较基准是只读的固定 mod 导出（SHA256 `b1f06dd2889e81550e1ed2d0c8759c1c218608e63f563907308fd09f8f072a34`），`mod_version=0.16.2`、`fetched_at=2026-10-19T17:47:55.308Z`。导出没有游戏版本，保持未知；WSL 重启后只读 health 不可达，没有启动游戏或读取 DLL/PCK，也没有拿旧导出冒充当前 v0.111 现场。

“Silent 保守上界”是该目录剔除明确其他角色池后的全部 ID，含事件、生成、多人专属与弃用占位，不是实际遇见概率。完整目录分母、外部独有 ID 和条件跨池 ID 均在 [coverage.json](coverage.json)，不靠隐藏弃用项提高覆盖率。

| 类别 | 外部总数 | 覆盖 / Silent 保守上界 | 覆盖率 | 缺项 |
| --- | ---: | ---: | ---: | --- |
| 牌 | 595 | 232 / 233 | 99.57% | DEPRECATED_CARD |
| 遗物 | 298 | 266 / 267 | 99.63% | DEPRECATED_RELIC |
| 怪物 | 115 | 107 / 107 | 100% | 无 |
| 事件 | 66 | 57 / 57 | 100% | 无 |

[conflicts.json](conflicts.json) 记录 689 处差异（牌 220、遗物 216、怪物 154、事件 99），按字段计数，同 ID 可有多项。313 处为 mod 模板与外部解析值的差异，376 处是文本或数值差异，含关键词、格式、版本和进阶口径，不能一律判作游戏错误。每项保留 mod 值、外部值、分类和 mod 优先的处理方式。模板报告不是运行时无条件替换名单。

## 五类固定题

[questions.json](../../../agent/tests/open-book-data/questions.json) 是合成结构夹具，牌面来自署名外部资料，商店价格仅为结构占位。通过生产 `Brain.choose/askJson -> userMessage` 组装，使用假引擎，不请求模型、mod 或网络。禁用对照只关闭适配器，题内角色始终是 SILENT。拿牌题采用生产 pick 摘要的 card/text 字段，并含一个未知数字占位，验证实际替换及出处标注。

每种开/关各 30 次，交替顺序；记录截至假引擎入口的准备耗时，含路由。首题首次读库，随后共用缓存。下表为 [replay.json](replay.json) 原件的四舍五入值；负差值只表示噪声。测量结果不证明实战延迟或策略收益。

| 题型 | 原题 bytes | 开卷 bytes | 增加 bytes | 热缓存增加中位 ms | 增加 p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 拿牌 | 518 | 4,932 | 4,414 | 1.246 | 3.257 |
| 事件 | 455 | 7,825 | 7,370 | 1.254 | 1.998 |
| 商店 | 583 | 5,411 | 4,828 | 1.382 | 2.093 |
| 休息 | 518 | 4,869 | 4,351 | 1.276 | 2.083 |
| 幕初 | 429 | 6,166 | 5,737 | 1.240 | 2.028 |

首次加载（拿牌）32.956 ms。五题所需条目均出现、`omitted=0`；新增总量均小于 18,000 UTF-8 bytes。拥挤牌组另有上限与遗漏测试。报告保留夹具 SHA、两种题面 SHA、相关 ID、字节、Node 版本和采样次数，可离线复现。

## 消费者与补缺证据

- `agent/tests/open-book.test.ts`：19 项通过。覆盖四类来源、真实 JSON 字符串选项、拿牌 card/text 摘要、升级、保留已知值和动态值、mod 冲突、队列去重与路径过滤、拥挤题面上限、文件缺失重读、已审核 overlay 读回/未审核 revision 拒绝、模拟卡牌/怪物参考字段、Ironclad 等价，以及 Brain 实际 request 与 Jev SDK 假调用/日志/投影字节的一致性，以及 Jev 总预算、刻意省略资料后的压缩重试不二次增补。
- `ops/tests/test_open_book_refresh.py`：6 项通过。固定测试禁止实际联网，验证缓存不重复下载、许可变化失败、事件叙事剔除、对局推迟、overlay 写回且受跟踪知识保持原样、available 与 unresolved 分账、完成的首批不会饿死后续、坏 JSON 不阻塞。
- 模拟读取静态事实不会提升 `known`，也不替代 live 数值或实现 #13 的卡牌机制。外部参考字段不可枚举，保持现有序列化和求解器状态。
- 缺项经原 ops learn tick 处理，最多 256 条；只补已核来源缓存。已审核快照没有的 ID 收据为 `unresolved-in-reviewed-snapshot`，继续是缺口。没有真实联网补到新 ID、也没有自然对局消费者证据。

完整检查与本地日志 SHA 索引见 [checks.json](checks.json)：生产 tsc 通过；完整 Vitest 642/642 文件通过，6,074 项通过、2 项跳过，耗时 1,277.13 秒；失败文件的最终聚焦复验 5 文件/70 项通过；新增回放工具与测试的独立类型检查、Python 6 项测试、离线重建、ops shell 语法及 diff 检查通过。

此前完整回归曾有 5 个失败文件，暴露 Jev 总预算、旧题面 hash/evidence 预期、common 目录登记、threads 不支持 process.chdir 及拿牌补全断言；修正后冻结源码，用默认 fork pool 单 worker 完整重跑，上述结果为最终回执。补充的全量 `tsconfig.tools` 检查还有 50 项诊断，均在本次未修改的既有工具文件，未声称该配置通过；本次新增工具已独立检查。失败日志及诊断原件保留，未覆盖。

停机前的 WIP Vitest 已按协调 SIGTERM，exit 143，不能算通过或产品失败；原件保持在 `data/external/issue-25-wip-vitest.log`。恢复后的诊断中断也另存原件，均不冒充完整检查结果。

未合 main/live、不分配 release_id；上线由集成员核验、ops 在开局边界处理。保留本树和本地原件直到标准验收回收流程完成。
