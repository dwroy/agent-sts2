# #82 Spire Codex 回放与整局导出工程交付

本交付从原树 `a10a8483441f619d8367c458ab4ffa9f13e85b40` 接续，原始基线 `f11183c49b34595f220758ecad672d1f7514cacd`。交付固定 HEAD、保留分支和优先级以准备的 `issue-82-spire-codex-r1` 请求为准；开发只准备请求，不操作生产队列。原账号停点和历史失败保留在 `paper/materials/issue82-account-handoff-20261028.md` 及上一材料目录。

## 最终行为

- 公开 API 串行下载 Silent A10 全版本回放，默认另取 v0.111.0 静态整局导出；按 build/win 分片、翻到空页、显式饱和失败、持久 cycle/page 和 per-run 去重。不限 build 的末次扫描补每日 manifest 之外的新 build。当前无 key 请求间隔至少4.1秒，按 Retry-After 退避；没有账号、key、配额或并发调整。
- 下载在调用 curl 前保存 inflight 偏移，curl 继承同一 intake 锁；中断恢复 `.chunk`/响应头，追加回到原偏移保证幂等，再核 Range/验证器/字节/SHA。已有文件按条件 HTTP 重验，manifest 对象只有 SHA/bytes 通过才登记成功。更新返回新字节时先保留旧raw和原收据，并在新收据链接旧SHA修订；坏归档会阻止替换当前原件。
- 独立原始目录与 v3 学习缓存，递归字段白名单、已知标识文本回显脱敏、分域 HMAC run/seed ID。列表中的私有脱敏值只存私有索引；缓存修订也使用 HMAC，不用无盐的玩家值哈希。salt 丢失/改变拒绝续接。多人/人数未知只下载，投影明确排除并保留分母。
- v3 manifest 精确列投影文件和 SHA；版本/输入/元数据更新生成新文件，旧文件保留。仅整个投影成功才原子发布新 manifest，建库只读该清单，不混入目录中的旧文件；坏缓存拒绝替换旧 DB，可从已核原件重建。
- DuckDB 八张表覆盖 run、整局导出、战斗、回合、出牌、药水、决策、白名单事件；有界批量导入，一线程/512MB。只读 query 关闭外部访问；`boss-plays` 用参数绑定 encounter，默认查 API 胜局中该战斗 first/victory 的逐回合序列，retry/all 显式分开。

`attempt_id` 是整局读档代数，不能按非零值判断每场战斗重试。实现保留原值，以同战斗 `(combat_id,floor,act)` 的出现历史与 resume 分类，记录 after_run_reload 和未知。中止首次也留在首次分母，缺结果为null；不把整局经历SL后的新战斗误计成该战斗重试。手牌只有观察抽牌集合时标 partial，未知事件只记数量；不推算隐藏信息或游戏机制。

## 验证与原失败

- 最终固定 Python38项通过，见 `python-final-38.txt`；临时目录/合成输入，不联网。覆盖续传与中断追加、FD传递、退避、分页上限、重复/失败游标、字段与文本脱敏、读档分母、幂等/多人排除、manifest与salt、坏缓存/旧代隔离、整局导出和参数化Boss查询，以及raw/收据旧修订保留与坏归档拒绝。v2的35项和v3归档修正前37项原结果分别保留于 `python-final.txt` / `python-v3.txt`。
- 原 WIP 沙箱650文件/6017项过、1历史冷夹具缺失失败仍留原目录；本轮按原 HEAD blob 恢复 `issue29-brain-speed/results.jsonl`，未改其字节或提交源。新一轮沙箱及paths终态另见本目录的检查终态材料，不能拿旧失败回填成成功。
- 两份冻结真实回放的 SHA 与原交接清单一致；在新的忽略目录 `dev-final` 投影/建库，旧 `dev-validation` 原件和缓存保持。实际读回2局、62战斗、291玩家回合、1437 play、163 decision、13891事件；52场first、10场retry、unknown0，全部中止10场，其中首次中止8场。胜局四Boss逐回合序列分别40/33/32/43次出牌，精确数据以 `frozen-readback.json` 为准。
- 真实样本字段及已知标识文本/原run-seed值审计通过，投影重复执行新增0。实际建库约1.03秒，仅作小样本耗时，不外推全量。原生CLI也返回亲族该场40条出牌，详见 `native-cli-readback.json`；完整行结果只留忽略目录。
- 本轮冻结读回首个断言误把“首次中止8”用于“全部中止10”；验证断言修正、解析器未改，原失败摘要 `frozen-readback-first-failure.txt` 保留。
- 接续首轮沙箱固定v2源码（`source-before-checks.json` / `v2-source.patch.b64`）自然rc1，650文件/6017项过，唯一失败是external-stock包装的默认15秒超时，内层Python28项18.205秒已过。日志 `sandbox.log` 保留；末尾paths未执行。最终v3复验采用原集成合同的60秒testTimeout，子进程上限与全局配置均不改，不把首轮失败冒成成功。
- 自审用固定名字SILENT/TEST_CARD复现通用字符串替换误改游戏标识（`redaction-collision-before.json`），v3只对四类文本字段脱敏，游戏标识由白名单保原值；缺header现在明确失败并保留旧manifest。两项回归均纳入最终测试。v2源码/样本结果保留，v3使用独立source receipt和新投影版本，不复用旧缓存冒新读回。
- 固定v3的沙箱宽域最终rc0：651文件/6018项通过，随后paths11项通过，期间五源SHA未漂移，见 `source-v3-after-checks.json` / `sandbox-v3.log`。宽域结束后仅下载模块和其Python测试补raw旧修订保留；最终38项、Vitest两文件两项（含Python包装/导入）、生产tsc0和paths11均过。最终源见 `source-final-before-targeted.json` / 后置核验，不将宽域修正前版本冒成最终固定组合full；原集成员仍核实际交付组合。

这两局是固定格式/消费者探针，不是全量、不代表玩家分母或自然学习效果；没有下载完整外部导出，也未声称其文件 SHA 已验证。导出全链路用固定合成 gzip/manifest 覆盖。先前的A3动态limit=1导出只用于字段形状核对，不计 Silent A10 样本。

## 部署、适用检查与回退

ROOT运行叶只有 `eval/spire_codex.py`、`eval/spire_codex_download.py`、`eval/spire_codex_projection.py`；ROOT固定测试叶是 `eval/tests/test_spire_codex.py`、`agent/tests/spire-codex.test.ts`，文档 `docs/spire-codex.md` / `docs/README.md`。最终逐叶字节/SHA/对象见 `source-final-before-targeted.json` 与部署映射。LIVE运行叶=0、宿主常驻入口=0，没有生产自动启用或新调度器。仅用现有logdb venv的DuckDB1.5.6，未装依赖。

集成员沿原唯一队列核固定组合，适用消费者至少包含：现有Python环境跑 `-B eval/tests/test_spire_codex.py`、CLI `--help`，以及最终组合Vitest中的新包装测试；新 CLI/SQL 能力由本项 ROOT 消费者验证，不为空配适用命令，不改LIVE安装路径充数。开发沙箱结果不冒原集成唯一full。原完整检查、依赖和权限门保持。

ops工程核收后执行 `docs/spire-codex.md` 的 download→project→build-db→audit→report；回 #82 原始/安全回放总/胜/v0.111分母、八Boss首试/重试/未知/中止场次及比例、总字节、导出压缩字节/SHA核对结果、cache审计和前十场逐回合出牌。子集、分片失败或来源缺失不能冒零场或全量；未知字段/牌组/版本/SL限制随样本保留。

后继学习单元只冻结cache manifest及其引用，不把raw/private-index/salt加入学习输入。本项没有给现有学习调度新增来源，也没有开展学习解释或发布策略。

回退撤销上述ROOT工具/测试/文档差量，保留原 raw、私有索引、salt、收据、缓存与研究证据；DB可从精确manifest重建。未写 main/live/STOP/PAUSE/正式知识、大脑/战斗、账号/配额或行为编号，未运行play、派学习模型或关闭其他会话。铁甲等其他角色的对局行为保持等价。学习解释、正式知识、自然采用/胜率与科学父项仍走原owner，工程交付不代其完成。
