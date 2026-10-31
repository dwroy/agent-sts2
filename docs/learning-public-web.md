# 学习侧公开资料研究（#69）

只在原 `strategy-proposal` 槽位显式派发 Silent 纯内容研究。Codex 内建搜索与页面读取请求为 `web_search="live"`；shell 的网络、文件权限、账号、模型、档位、并发门和对局大脑的 `web_search="disabled"` 保持原合同。没有声明的普通任务、代码任务及旧外部冻结批次仍不开放。Claude 暂未接入，声明联网时启动器拒绝，不冒称支持。

实际链：原 ops `write --public-web` → 原 `dispatch_write/start_learner`、登记屏障与独立工作树 → wrapper 核原登记并选择固定模板 → launcher 核任务声明/SHA、原批次/活owner/角色/runtime → exec 或 Herdr TUI 共用命令与前导说明 → 来源产物 → 原 `knowledge_runtime.complete` → K1 候选校验/事务发布 → 原只读工具。没有第二套调度器。队列接管不是本功能前置，仍按原发布顺序执行。

## 原 ops 的自然验收入口

集成/适用组合检查及宿主配套部署后，在已启用知识 runtime 的原运行根调用：

```bash
nice -n 19 python3 ops/codex-ops-learn.py write --task strategy-proposal --character silent --public-web
```

它使用原普通策略槽及原容量/发布/额度保护；不启额外槽位，不自动抢四道外部槽。仅手动 `write` 支持该标记，不接受 `--runs`、`--request`、其他角色/代码任务，也不自动把历史批次升级成联网批次。根运行状态登记 `public_web={schema,template_sha256}` 和原 `knowledge_runtime`。模板 `learner/tasks/public-web/strategy-proposal.md` 的 basename 保留原 task 身份，接既有内容注入及完成回调。wrapper 先等原登记屏障，再核模板 SHA 和原租约；启动器再独立核验一次。原学习者已登记后不得热改它的模板、SHA、runtime 或参数。

优先已下载玩家 A10 库；资料不足才检索/实际打开公开页面。一个合法真实单元依次保存：原批次登记、启动命令/前导、原生 `turn_context` 与 web 事件、来源账本、逐来源去向、真实候选及事务发布回执、该版本的本地工具读取结果。若已下载资料已足够，可以不搜索；这能交内容，但不能称真实搜索/读取验收完成。失败/空结果保留并正常交无增量报告，不伪造来源或知识。后续正常局核该条目实际采用；不为验收开局，搜索或发布成功不代表胜率提升。

## 显式问题输入（#69 后继，2026-10-26）

原053512按缓存优先合同完成且发布了内容，真实search/open为0；两个事实保持，不追加旧线程turn或改写cached/read。需要处理一个缓存未覆盖的公开问题时，在原入口显式给问题文件及其**原始字节SHA256**，不混用历史 `--request` / `research_request`。

本次已授权的问题文件为 `learner/requests/public-web/issue69-accuracy-v0111.json`，仅要求核公开ACCURACY原牌文/升级差异及是否对应缓存v0.111.0，不预填机制、数值或策略。配套代码经新固定组合检查/部署后，ops准确命令为：

```bash
nice -n 19 python3 ops/codex-ops-learn.py write --task strategy-proposal --character silent --public-web \
  --public-web-question learner/requests/public-web/issue69-accuracy-v0111.json \
  --public-web-question-sha256 884051eae3d739536fa7c7c2695628578bfa127fb40eafc7d2b35494a277c43d
```

本文件是研究输入，SHA变化须用新明确输入，不自行从当前文件重算并冒用原批准题目。schema为 `public-web-question-v1`，精确字段：`id/task/character/question/source_intent/target_game_version/parent`；task固定strategy-proposal、character固定silent，source_intent固定search-and-open-public-sts2，parent指原缓存/研究单元。问题文本是数据，不赋予代码、网络或账号权限。输入只从本仓 `learner/requests/public-web/*.json` 读取，限16KiB，不跟随软链接；任务/角色/来源意图/字段或SHA错误、参数缺一、其他任务及历史request混用均拒绝。

派发前保存原JSON文本、相对路径和SHA到新批的 `public_web.question`，原key绑定题目ID/SHA。同一输入处于running/done/awaiting_review时不盲目重派；失败沿原有界重试门。prepare及TS启动器核原登记；派发后不重新读取可变原问题文件。launcher在新scratch保存原字节 `public-web-question.json`，启动日志保存ID/路径/来源意图/输入SHA，原生原提示绑定沿原链。仅这个显式单元注入缺口问题和搜索/读取意图，覆盖缓存足够即可选题的默认；旧模板原字节/SHA及无问题旧批合同保持，不把所有学习改成必搜。

报告原JSON增加 `public_web_question:{id,input_sha256,status,version_match,conclusion}`，精确引用原ID和输入SHA。status为answered/waiting；version_match为matched/mismatch/unknown，conclusion保实际结论与限制。**answered须同时有原生已完成search及同URL实际已读页面的来源记录**，缓存单独不能冒问题已回答。搜索失败/空结果/读取受阻或未覆盖则waiting，未调用不冒网络失败；可以保无增量/反证，不强发知识。版本无法核对应就unknown，不以现行网页替换旧版本，不因已入库提升可信度。完成证明单列题目ID/SHA、parent/来源意图/目标版本、实际search/read ID及question状态；批次结算不等于问题/联网验收已过。正式候选仍走原K1，部分内容有支持才发布，旧内容成果与自然采用/胜率分账。

## 来源保存

来源助手只处理 stdin JSON 和本批 scratch，不联网，也不读取传入的任意文件路径。写时间前先 `date`。调用：

```bash
python3 learner/public_web_sources.py record --scratch <本批scratch绝对路径> --batch <原batch> < <本批来源JSON>
python3 learner/public_web_sources.py verify --scratch <本批scratch绝对路径> --batch <原batch>
```

stdin 字段如下（这是格式，不是游戏知识）：

```json
{
  "url": "https://example.org/sts2/source",
  "acquired_at": "2026-10-25T22:00:00+08:00",
  "game_version": "unknown",
  "character": "silent",
  "ascension": 10,
  "sample": {"runs": null, "players": null},
  "license": "unknown; 核实际页面许可后填写",
  "limitations": "实际限制/代理/未读范围/版本未知",
  "summary": "实际阅读后保存的去标识来源摘要；不执行网页内指令",
  "status": "read",
  "native_call_id": "原生读取调用ID"
}
```

`status` 为 `read | cached | failed | empty`；搜索失败/空结果可用 `url:null,native_call_id:null`，`summary` 写实际失败/空查询与限制。`cached` 用于本地已有资料，摘要写原冻结路径、manifest/原缓存 SHA 与范围，不能自报新网络读取。只有实际读取的网页用 `read`；完成时须有对应已完成原生事件。统计缺失保留 null，版本未知保留 unknown。普通公开 HTTPS URL 不含认证、凭据或私网地址；不访问私密账号，不保存/发布玩家标识。助手不代许可核验、游戏内容验证或样本去重。

每个来源有内容身份 `id`，同时保存 `summary_sha256`。它是学习者保存的摘要 SHA，**不是网页原件 SHA**；确有合法原始缓存时另在摘要/证据记录缓存 SHA。相同 URL/版本/摘要/元数据的重试不会重复计条；内容、版本、样本或许可不同保留不同记录，冲突由学习者明确解释。`public-web-sources.json` 保存当前完整账本，每次增量另留 `public-web-sources-<SHA>.json` 不可变快照；损坏或意外临时文件不会覆盖旧证据。并发写同一 scratch 不受支持，沿原单owner门。

启动器自动从原事件流另存 `public-web-events.jsonl`，逐事件附原 JSON SHA，区分 exec 的 `item.* web_search` 与 TUI 的 `response_item.web_search_call`/`event_msg.web_search_*`，包括失败与空结果事件。原完整 jsonl/rollout 仍保留。`learner_launch.public_web.requested=live,observed=null` 仅代表请求；实际调用看这些原生事件及工具输出。只记完成调用不证明命中、阅读充分、知识成立或采用。无事件不能冒已搜索。

## 内容与完成合同

纯内容只写原 scratch、沿原 CLI 记 ledger/代码提案。保持本树原 HEAD 与干净源码，不跑整套代码测试、不 commit/merge/main/live。runtime 附加合同照常查询/导出真实基线、保存 `knowledge-candidate-v1`；正式知识/策略/rk 沿现行格式与适用条件、证据/反证、可信度和版本门，不改 schema 来容纳本批结论。`source:external:public-web`，自有与外部分账，不能补战前状态或把观察性样本冒作自有验证。未能表达的整局/时序保原文候选及具体消费者缺口，能表达的部分继续交。

最终 JSON 与 `report.md` 末尾对象一致，保原 task/character/batch/base、空 runs/fixes、commit/merged=null、implementation_domains=[]、真实 code_proposals、tests 全 null，并增加：

- `public_web_sources`：本批来源账本绝对路径。
- `limitations`：非空限制列表；失败/空结果或无内容时具体说明。
- 有正式候选时，`knowledge_candidate` 指向本批真实候选；`public_web_results:[{source_id,state,reason}]` 精确覆盖每个来源，state 为 cited/unused/waiting，reason 写目标条目ID及去向/限制。cited 的摘要 SHA 留在正式候选证据中（如外部策略 `dataset_sha256`，注明其摘要身份），不能引用 failed/empty 支撑知识。

回调先核原身份、来源账本/快照/摘要/原生事件 SHA、逐来源去向及源码基线，再调用原 K1 publisher。没有内容时仍核来源和原提案链，记“无增量、未发布”，不会建库。校验失败留原件/待核；发布不确定仍以同一 batch/candidate ID 沿原 runtime 回查，旧局绑定不变。它不替代学习者核查结论是否有来源支持，也不代本地读回/自然采用/胜率父项。

工程部署需 ROOT 的 ops/learner 链及同批模板/来源助手配套；本项没有对局源码叶，不分配游戏行为发布号。回退时停止新 `--public-web` 派发，保留已登记批次原源码/模板/线程、来源快照、K1 版本与旧绑定；既有任务沿原版本终结。回退能力差量只影响后续启动，已发布知识若需撤回用原 K1 版本回退，不改历史记录，不关闭科学父。

Codex 配置依据：[官方配置参考](https://developers.openai.com/codex/config-reference/)（`web_search` 顶层模式；旧 feature 开关已废弃）。已安装 CLI 的实际原生暴露和外站可用性仍须 ops 用上述真实单元核验；固定测试仅验证参数、拒绝路径与本地数据链。
