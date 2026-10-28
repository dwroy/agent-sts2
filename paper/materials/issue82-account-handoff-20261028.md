# #82 账号切换安全交接（2026-10-28）

任务仍在进行中；本文件不是工程验收、发布或首次全量完成证明。按原 ops 评论 [6458879589](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6458879589)，当前步骤结束后提交、回安全停点，等待 ops 在原工作树启动 codex3 新 UUID，不跨账号 resume。

## 原现场

- 工作树：`.worktrees/issue-82-spire-codex-replays`，分支 `issue-82-spire-codex-replays`。
- 原基线：`f11183c49b34595f220758ecad672d1f7514cacd`。
- 原 Codex thread：`01a18047-843e-7402-8ff7-60d0601eac3f`（本进程的 CODEX_THREAD_ID）；未核原生 turn_context，不宣称实际档位或账号已切换。
- issue 已置 `status:in-progress`。无 main/live 合入、无行为编号、无 queue submit、无 play/STOP/PAUSE/账号/配额/其他会话操作。
- 只在原树增加离线源文件、固定测试、文档及检查材料。学习者派发和大脑工具尚未接入；首次全量归 ops。

## 已有实现

- `eval/spire_codex_download.py`：串行 curl 公共 API 客户端，持久限速、失败退避、Range/If-Range、manifest SHA/bytes、私有原始文件和 per-run 收据、按版本/胜负分片、翻到空页、可续 cycle/page、按 run 去重和条件重验。不限 build 的末次扫描覆盖 manifest 之后的新 build；无法再细分的 10000 上限明确失败。
- `eval/spire_codex_projection.py`：事件和嵌套对象白名单、已知标识回显脱敏、分域 HMAC run/seed ID、单人 Silent A10 回放/导出投影、读档边界和战斗索引。原始全下载与多人不投影计数分列，不给学习者 raw/index/salt。
- `eval/spire_codex.py`：DuckDB 重建、run/export_runs/combats/turns/plays/potions/decisions/events、默认 first 视图、禁外部访问的只读查询和管理员摘要。
- `eval/tests/test_spire_codex.py` 及 `agent/tests/spire-codex.test.ts`：全部固定合成输入、不联网；复用原 logdb venv，无新增依赖。
- `docs/spire-codex.md`：ops 命令、来源条款、投影字段与限制、分母/读档/回退合同。

## 已发现并保留的来源细节

1. 当前开发者页无 key 额度为 15/min，比 issue/旧 terms 的 60–120/min 严；客户端间隔改成至少 4.1 秒，不申请 key、不换 IP、不绕限。
2. GET replay 文档写 gzip，实际冻结样本同时支持 gzip magic/plain NDJSON，不依赖文件后缀。
3. `attempt_id` 是整局读档代数，不能 `>0 => 这场战斗重试`。已观察 F8 attempt0→1→2，F9 新战斗沿用2；实现按同战斗身份/历史/resume 分类，保留 after_run_reload。被读档中止的 first 仍留分母，结果未知。
4. API win=1 的冻结回放 end.terminal_reason 可以是 left_run，不能据终止原因覆盖胜负，或把它认成无 SL 胜利。
5. 没有显式手牌快照时仅有 observed_draws_partial，不补隐藏牌或机制；多人仅下载，当前投影排除并记分母。

来源：[OpenAPI](https://spire-codex.com/openapi.json)、[开发者页](https://spire-codex.com/developers)、[条款](https://spire-codex.com/terms)。游戏知识没有写入本角色或公共库。

## 检查与原失败

- 第一轮固定 Python 23 项：22过/1错。第二次 build-db 的 audit 把自己的 contains_player_identifiers 安全标志误判成 player_id；已收窄到精确玩家键，原失败保留在原生工具转录。
- 修正后 23/23 通过。发现全局 attempt_id 语义后增回归并修正，24/24 通过。
- 后续又增加条件重验测试及管理员下载摘要/多人排除；最终源固定 Python **25/25 通过**（`20261028-issue82-spire-codex/python-final.txt`）。管理员摘要/多人排除的独立端到端回归仍待补，不能把25项覆盖范围扩大。
- 已运行 `agent/tools/test-sandbox.sh`，SANDBOX_WORKERS=1、nice19，自然终态 **rc1：650文件/6017项通过、1文件/1项失败**，耗时1422.79秒。失败是 `check-imports.test.ts` 的历史冷夹具 `paper/materials/issue29-brain-speed/results.jsonl` 未展开；HEAD原blob仍在、211076字节。未恢复或改写原件，未把该项冒称代码通过。脚本 set-e 导致末尾 paths 测试未执行。
- 原日志/终态：`paper/materials/20261028-issue82-spire-codex/sandbox.log`、`sandbox.rc`；完整文本副本 `sandbox-terminal.txt` 随交接提交。最终生产tsc rc0见 `tsc-final.txt`。这是沙箱排除集，不冒集成唯一完整检查。
- 检查开始后在原步骤中补了上述后继实现；接续必须按最终源重新核适用检查，不能只用宽域开始时的旧状态。
- 首次 Python urllib 读取 API 收到 HTTP403；标准 curl 公共 API 请求成功，没有凭据或其他权限。一次 `exports/runs?version=v0.111.0&limit=1` 60秒超时；后续只取一次不按版本的 limit=1 原件作字段形状核对成功，样本是 A3，未冒 Silent A10 验收或全量。

## 忽略目录中的原件

- `data/external/spire-codex/dev-probe/`：OpenAPI、manifest、两份 limit=1 Silent A10 列表、对应两份回放、一次 limit=1 整局导出。含玩家字段/原 run_hash/seed，只供原开发/ops 核源，不给学习者，不进 Git 或公开评论。
- `data/external/spire-codex/dev-validation/`：原两份回放的私有索引、盐与一次早期投影/DB。早期输出为2局/1胜、62战斗、291玩家回合、1437 play、163 decision、13891 event；这一轮发生在 attempt_id 语义修正前，分类结果已作废，不能复用其首次/重试比例。
- 原始两份回放字节保持。接续对 dev-validation 做最终语义核验前须保存旧 cache，再重建；当前 VERSION 仍 v1，早期 cache 会按相同 source SHA 命中跳过，不能把缓存当后继验证。
- 未下载 1.26GB 完整导出，未全量抓回放。manifest 当前 v0.111.0：319010全角色局、1257325731压缩字节、SHA `19b8aa8afc5b08aa7dd27b7f9b4a4336bb2e1d9e8c93534d0bf0b3db6a7c4b77`，仅元数据已核，不是文件 SHA 已验。

## 接续顺序

1. ops 核本次提交、原生日志/终端/空输入与无在途命令后，在原树开 codex3 新 UUID，保原分支/原失败/原数据；不跨账号恢复本 UUID。
2. 先按固定HEAD原blob恢复上述历史冷夹具，复验 check-imports 和脚本未到达的 paths；保留本次 rc1。自审最终实现和字段/分页/导出过滤，补必要边界检查；跑最终固定 Python、tsc 和适用沙箱检查。最终实际 ROOT 组合和唯一 full 仍交原集成员协调，不与当前他人检查竞争。
3. 用原已冻结两回放重建隔离 cache，核 after_run_reload 与每场首试分母、逐 Boss 出牌、白名单审计；此为格式/基础设施验证，不是学习结论。建议补 project 的持久幂等/多人排除和导出端到端固定测试，当前这两条新增路径尚无独立回归。
4. 完成工程后写交付报告、date 后追加 decision-log、gitleaks、提交和固定 queue request，回 #82 首行 `[dev #82]` 并改 review。当前账号交接不冒工程交付，保持 in-progress。
5. 原集成员/ops 核收后在 ROOT 运行首次全量，按 issue 的八 Boss、首试/重试/未知分母、总字节与导出 SHA、出牌样本和安全缓存审计回单。学习解释另走原学习单元，不改生产脑/战斗、live/STOP 或配额。

工程与科学父项未关闭。账号交接本身不授权发布、首次全量或现场回收。

## 安全停点终态

2026-10-28 10:49 +08:00 已核原 sandbox exec 自然退出1，原 Vitest PID2874743缺席；最终 Python25/25、生产tsc0均已终止。原失败、未执行路径与源码 SHA 清单保留。提交后本会话停止新增工作，等原 ops 核原生末回合/空输入/进程身份，再在原树起 codex3 新 UUID。不得把本次账号交接提交当工程review或已入库/已发布。
