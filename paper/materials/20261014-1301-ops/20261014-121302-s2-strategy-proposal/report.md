# 静默猎手策略提案批次报告

记录时间：2026-10-14 12:34:44 CST。批次 `20261014-121302-s2-strategy-proposal`，角色 silent，任务 strategy-proposal。

本批十项原领取提案全部 waiting。已核实的局部事实、既有子实现和具体补证条件保存在 [proposal.md](proposal.md)。没有源码／知识／策略参数改动，没有实现提交、合入提交、eval 版本或规则上线通知；不能将子项已部署认作整个宽提案 implemented／duplicate／shipped。

基线 `67d52c4c16f9357e607eecc70ba8eecd16d1677b`。开工 git status 干净，普通批次合并 main 返回 Already up to date。learn.json 任务／角色／工作树／五锚点及十 proposal_ids 匹配；无 research_request、implementation_request 或 proposal_repair。旧普通专题请求绑定另一批，故保持本次提案消费身份，没有切成纯研究或扩展队列。

| 实盘局号 | 实际角色／进阶 | 冻结状态 | 冻结决策 | 主要核验 |
|---|---|---:|---:|---|
| NHA2KW0RB7VP | SILENT A10 | 602 | 584 | F33 六试 T1 损1／7、敌血净减8／24 |
| P74C04AEPL1F | SILENT A10 | 410 | 395 | F22 赢战损20／24、赢至9；F23 末次T3弃精确后死亡 |
| G33HU22H2543 | SILENT A10 | 879 | 850 | F48 首牌不同候选18／10挡、75／107伤；候选不当实线 |
| RC61MFQM63Y6 | SILENT A10 | 694 | 674 | F33 首末T1损4／8、敌血净减30／23；第三试T4唯一单弃 |
| BTSRF7JL1W1Y | SILENT A10 | 653 | 635 | F31 醒后力量0／2／4、末轮5挡加1覆甲仍死 |

此外冻结 31 条 SL、5 条 run-config，总计 6,412 条原始记录，逐根日志 byte offset／长度／SHA256 读回一致。五局均为已结束失败局，原运行 code 均带 dirty，不能冒称恢复历史完整源码。原账本的 32 个关联 id 在 `ledger-before.json`，每项层／回合／id、反例、旧行为／期望行为和验证条件在 proposal.md。原十个 Markdown 哈希与队列完全一致，无新提案 id。

483 个可操作轮片段已按局／层／尝试／回合整理；决策指纹与原状态可核。P74 F11 的唯一无 decision_id 行是路线变更元数据，保留 null。此类匹配没有认证跨重规划的完整采用候选，也没有证明未采用方案、所有抽序／随机样本或完整能力收益。HP 与敌血净差不是毛伤，SL 截尾不是实际死亡；下一尝试终帧不补到上一尝试。五局是原提案回归材料，不是时间后置新局或独立胜率验证。

七项已有子实现均核实实际 live 祖先源码：首牌身份 e784dd9f043bf87c29109573f48975f9903280d3、弃牌计划 97efc0618936c6d7783fbf36e79b056b90d65589、静态快照 4b0823f519f1b724d6cff2b1cd50b74146dc4a9d、普通生存者唯一单弃 bf423c173d3be348a4ad714e1d26516df619ff41、资源比较 5604982e13890e0e2bc8bf8246272e8267321c0b、候选比较 c769739b97389fdc978b6515b83a38e3cd900f67、预测选择审计 be69855995737d6f381adb10bf248964832da24b。核验 live 为 `30569977308fe1bbc688053029c3c6ec84d323ba`；八个所核文件的 live 工作区均等于提交字节。基线／live 五叶完全相等，三叶仅有七处 Roy／Dai 注释差异；保留差异，不声称全仓库字节相同。

只读固定消费者核验四项：P74 四个合法弃牌选项与贪婪分支保留精确副本、G33 投斧首牌两序不同键、RC 唯一打击后继不可兑现且局部57来袭对7挡需损50、缺 SL 候选保持 null。`consumer-audit.json` 保留输入范围与结果。它不读取刷新知识、调用 LLM／网络或运行 play，不替代完整生产模型／长程回放。普通生存者子项已解决，动态弃牌、累计能力、完整 SL 后继、同条件后战和新血价的宽父范围仍待证据。

本批无代码提交，撤源码失败／恢复通过不适用，`tests={"tsc":null,"vitest":null,"cases":null}`。13 项证据断言、6,412 条原字节验证和四项消费者核验是证据工作，不能填成源码测试成功。没有运行完整 tsc／vitest。gitleaks 扫描退出 0，未发现泄漏，报告 `gitleaks.json`。

保留的诊断：初次 shell 构建碰到另一临时工作树的 `.codex` 路径 ENOENT，原权限下重试后正常读取；消费者首次 tsx CLI 因 Unix socket listen EPERM 未启动，原 out／err 保留。同权限下 node --import 的固定入口退出 0，没有扩大权限或把沙箱限制判为源码失败。证据轮端点抽取初稿曾可能跨重载找终帧，已加入同层／尝试边界并完整重算；最终字节与事实核验为 verification.json。原日志、原提案和本批材料均保留。

最终逐项处置见 report.json 的 proposal_results，共十项。每项的具体补证范围、可验证行为及反例已在 proposal.md 写明；当前保持策略，后续原调度器按新证据接续，不创建重复父项或提前关闭量化学习。账本仅通过根目录 learner/ledger.py update 追加 32 个原条目的本批报告／提案追溯，旧结论、证据、首证、28 个原 shipped／4 个原 proposed 及版本读回均保持。CLI 回执和逐项语义核验已保存到 ledger-updates.out、ledger-verification.json；根账本 check 为469项、0问题。最终全目录 gitleaks 扫描退出0、无泄漏。

最终工作树 git status 为空，HEAD 仍等于完整基线；scratch 由原忽略规则保留，不提交报告来伪造新基线。无实现所以 fixes=[]、merged=null，源码测试三项均 null。新代码、知识、版本、上线通知与 main/live 合并均未产生。

提案交运维的真实绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-121302-s2/learner/runs/20261014-121330-strategy-proposal/proposal.md`。本批没有实际上线，ops 无需登记新 shipped 或行为发布号；不得将 waiting 报成入库／消费者全部采用／胜率改善。
