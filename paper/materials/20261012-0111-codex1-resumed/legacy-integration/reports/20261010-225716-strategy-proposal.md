# 策略批次回报：静默甲虫攻击下界

已在本分支实现并提交一项窄范围 SL 修正，测试通过；**未合入 live**。live 原有 19 项他人合并冲突，锁内两次核实仍在。本任务没有接管或修改该合并现场，待运维按正常兜底流程集成。

- 批次：`20261010-225716-strategy-proposal`；角色：silent；普通 `reason=tick`。
- 完整 base：`8410bcffa43722b282ebaec7a20223a7f0dff022`。
- 源提交：`42fb403efc1f8f9b618c10ab71668fd5a09df377`。
- 既有账本：`silent-0326`，只经根目录 `learner/ledger.py update` 追加本批证据、提案、提交，状态 `proposed`。
- 新代码提案：`silent-proposal-c393847857ffe811`，经根目录 `learner/code_proposals.py add --character silent` 登记，状态 `pending`；没有实际live祖先源码，因此未标implemented/shipped。
- 实现领域：`sl`；知识数据未改，其他角色保持旧行为。
- 提案交付路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261010-225716/learner/runs/20261010-225724-strategy-proposal/proposal.md`。

## 身份与来源

开工工作树干净，HEAD为上述base，普通流程 `git merge --no-edit main` 为 Already up to date。本批 learn.json 没有 research_request、proposal_ids 或 proposal_repair；普通匹配文件 notes/strategy-research-silent.json 属于150327的牌组规模专题，因此不承接。没有阅读另两个专题来替换身份，没有合入无关专题，也没有消费其他批次已领取ID。派发记录保存在 `dispatch.json`。

已按 README、最新 STATE、decision-log 末尾、学习协议及代码提案协议工作，读取普通fix-queue并比较本角色已有提案。选择本批已有实死/存活帧可验证的甲虫问题，关联原复盘214d57c8ef95faa7和经验补链04f6e1a3e265a6c6；这些不是本批派发ID，本报告不关闭其更广范围，不重写历史复盘。

用户题面要求普通模式/high；实际启动记录 `learner_launch.command` 是 `gpt-6-astra`、`model_reasoning_effort="xhigh"`。本任务没有自行降强度、更换引擎、启动下级agent或重启宿主；提交署名按实际启动记录写Codex gpt-6-astra。此差异如实保留，不声称实际以high启动。

## 分析范围与证据

十个派发局均由原始 runs.jsonl 核为 SILENT A10，调度键 `silent:A11:212` 不能成为适用进阶。只读抽取4,947帧状态、4,746条决策、39条SL记录，逐局数量与既有复盘一致；原始行的偏移/SHA及文件读取切点保存在 `input-manifest.json` 和三个抽取JSONL中。只分析这些静默证据；没有读游戏二进制或运行play、LLM/网络。

| 局号 | 状态帧 | 决策 | SL记录 | 本题覆盖 |
|---|---:|---:|---:|---|
| V3PJA3FV92BG | 529 | 507 | 2 | 扫描敌组，无甲虫战 |
| 3DY1QBM0CET0 | 612 | 590 | 9 | 同上 |
| 1J44WWF1073H | 135 | 133 | 0 | 同上 |
| MR7EBRYRJ5R6 | 446 | 432 | 3 | 同上 |
| ATPX63FGDY6L | 189 | 180 | 0 | 同上 |
| EWLY3PWDDXJK | 498 | 485 | 3 | 同上 |
| U51W81MEBCLZ | 560 | 545 | 6 | 同上 |
| 7S8HCC0M6G9W | 963 | 887 | 5 | 同上，不据通关归因本题 |
| LWQYSREHMMJ7 | 562 | 547 | 6 | F30甲虫战63帧、两次尝试，详细核验 |
| 3R3LY2HVPPG0 | 453 | 440 | 5 | 扫描敌组，无甲虫战 |

核心证据均关联0326：

1. **LWQYSREHMMJ7 F30第2试T3**：原states350966→350967，偏移11004376064→11004413780。3血5挡，石虫3血3毒，丝虫40血3毒/无攻击，甲虫85血3毒/滚动13攻。石虫实际先退、丝37血、甲虫82血、玩家0。SL1639明确因同伴可能先死而排除甲虫，拒绝判死；13−5＝8完整需损，当前3血，静态余−5，实际HP扣除只为3。
2. **同局F30首试T4→T5**：偏移11002640391→11002679284。16血11挡，石虫4血5毒，丝虫10攻、甲虫滚动13攻；石虫退场后次轮玩家4血，与合计23攻减11挡的12实损一致。没有逐击事件，不把一致性分解写成逐击日志。此例仍存活，作为不能无条件判死的对照。
3. **同局F30首试T8**：偏移11003710856，玩家4血21挡对25攻击，无同伴将死条件，原SL已正确判死并重载，修后保持。

只一局、两次尝试，不宣称两局独立支持，也没有跨局留出或额外SL胜线。既有0326的丝虫先死及其他怪物实例没有被拿来外推本次规则。更多假设、反例、来源层/回合与局限见 `proposal.md`。

## 改动与条件

改动文件：`agent/src/sl/judge.ts`，另附 `agent/tests/silent-sl-beetle.test.ts`、五帧固定证据 `silent-sl-beetle-evidence.json`。

旧规则只要同伴可能先死，就移除其他存活攻击者全部攻击。新分支仅在 silent/A10、石虫/丝虫/甲虫各一只、仅石虫普通毒足以致死、已醒甲虫单次ROLL_OUT攻击、敌方状态限于本次已见标识，且无其他回合末伤害/反伤/截断时，保留甲虫攻击下界。没有同时保留丝虫攻击。

甲虫自身可能死或眩晕、未知敌状态/招式、其他敌组/先死同伴、其他角色/进阶，仍走原规则。原复活、可用牌药、回合末格挡和确定死亡闸门保留；不改变终局估值、药价、HP护栏、探索次数或任何合法选项。未新增怪物固定血量/伤害常数，沿用当前帧数值。

预期是减少已验证窗口的一类漏判，不保证多一次SL能赢，不估计整局收益。观察范围以后的自然同条件A10新局应单列留出、记录全部误判/反例。

## 验证结果

| 检查 | 结果 | 材料 |
|---|---|---|
| 原源码新增固定测试 | exit1，2失败/17通过 | target-red.log |
| 恢复实现，目标＋毒阈值＋通用同伴死亡边界 | exit0，3文件52项通过 | target-green.log |
| 再将实际源码撤回base，固定最终夹具 | exit1，2失败/17通过，失败正是新增判死和8血边界 | source-withdraw.log / source-withdraw.exit |
| 恢复源码后，仓库固定沙箱入口 | exit0；tsc成功，vitest主池265文件2689项＋paths单池1文件11项，总266文件2700项 | sandbox.log / sandbox.exit |
| 提交前gitleaks，redact、staged扫描 | exit0，约216592字节，无泄漏 | gitleaks.log / gitleaks.json |
| git diff --check、恢复字节比对 | 通过；当前judge与judge-implemented.txt逐字节相同 | 验收命令输出 / artifacts.json |

使用现有依赖，TMPDIR始终为本任务scratch；沙箱入口自身nice、最多4worker。未发生高负载重试或放宽断言，未把沙箱排除项声称为完整宿主测试通过。目标恢复测试在补保留agent_view前运行；最终夹具的撤源失败和完整沙箱通过另有真实记录，不混称同一遍检查。

测试覆盖实际死亡、实际存活、原正确SL、8/9血边界、复活、其他角色/进阶、其他同伴/招式/多击/未知状态、甲虫也死、反伤及额外回合末伤害源。变异控制只验证代码边界，不当新实盘或新的游戏机制证据。

## 合入阻塞与交接

源提交已完成，工作树干净。锁内最终预检：

- live HEAD：`56268f61928e0330d91293e585efab075839bb4a`。
- 已有 MERGE_HEAD：`a83d9ab675560a177249aa638e99df40bcfb5553`。
- 19个冲突路径见 `live-final-precheck.json`，包括README、ops-codex测试、运维动作脚本、双收件箱、decision-log和文档。

因此没有提交live刷新数据或执行本批merge，没有合后测试、eval版本、shipped或实际上线通知，也没有改动live的冲突、索引、源码、知识刷新与运维prompt。不把其他任务的MERGE_HEAD当本批合入。

请运维在原冲突处理完成后按通常流程核知识刷新重叠，集成本批源提交，运行合后沙箱与宿主完整检查；实际合入后再登记版本、逐项双通知并核实账本shipped。回退只需撤销本源提交中的例外，保持证据和历史记录。

本批没有派发proposal_ids，所以 `proposal_results=[]`。新代码提案真实pending及账本proposed是当前状态，不伪报implemented或duplicate。完整机器回报见同目录 `result.json`。
