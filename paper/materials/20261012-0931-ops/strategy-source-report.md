# 静默 A10 最后逃离弃牌事实实现报告

本批：20261012-090027-strategy-proposal。普通模式；独立执行，未派下级。base=64ce8ff3c9f2fe633c27d04d81ffcacce2a16671。身份及10个派发锚点的SILENT/A10局报见 identity.json。未承接专题、未扩大到其他提案队列。

提案：silent-proposal-d46c1cd4693e4a12，沿用原CLI ID。具体方案及适用范围见本目录 proposal.md；原 postmortem 提案文件及 SHA 保持。主账本 silent-0117，既有机制证据 silent-0018/0005/0194；仅经根 ledger.py 追加本批 proposed 链接，未标 shipped。

## 证据与交付

C7GNN3DDFUFY/F33/第6试T7，s367035有3能量、沙坑1、唯一1费逃离；d356715弃逃离，第二选择s367036的combat.hand仍含已选逃离而selection.cards已删除它。d356716再弃小刀，s367037真实4张手牌无逃离、6挡，d356717已有新求解。s367040为7血28挡/沙坑1，s367041为0血31挡/敌116血。T3及T6实打逃离的s367015→367016、367031→367032分别沙坑3→4、1→2，随后仍在T7失败，不能推保留必胜。

新增 agent/src/hand/screens/silent-sandpit-discard.ts，经真实 selection.ts 消费：向全部6/5个弃牌选项展示当前能量、剩余选择次数、已选逃离、该次弃后逃离及可支付数量；不依赖原计划后继。第二选择排除已选但尚留在combat.hand的副本。费用未知给null，不以中间态可打标记承诺实际后继。现有planCombatTurn重新读取实际弃后手牌与沙坑截止的逻辑无改动，已有独立固定回放验证。

范围仅静默A10、单个活体无厌沙虫、沙坑1、同轮早有准备二弃页面。原候选、评分与Jev选择权保持；铁甲、未观察进阶、其他来源、其他沙坑层数与不一致输入保持原行为。只改变题面事实，不修改SL/药水/终局参数。未修改经验JSON，不把经验已入库当策略已采用。

## 自测与原件

- 21条原日志按只读偏移核对，source-verification.json逐条保存SHA/长度/行号，原字节states.raw、decisions.raw保留。首次时间戳配对偏移失准材料以initial后缀保留；最终改为明确行号与同回合手牌核对。
- 初次固定夹具遗漏schema必填state_version导致12项解析失败，原targeted-initial.log与targeted-second.log保留；补回原帧字段后targeted-third.log为12项通过。这不是源码撤销的反证测试。
- 真正反证：撤生产selection.ts接线（保留独立helper用于控制），red.log退出1，4项题面断言失败/8项控制通过；恢复原字节后green.log退出0，3文件42项通过。含原始后继题、原始单弃快照与本次两阶段选择/重算/非适用范围。
- 固定测试隔离刷新知识路径，无LLM/网络；牌类型、文本及资源来自原帧。没有把修改后的测试当实战新对照。
- gitleaks-source.log/json：staged约178678字节，退出0、未发现泄漏。
- 规定完整沙箱检查、源码提交、live预检及部署结果在下方完成后追加；本段不表示已上线。

## 限制

只有一个独立失败局；SL尝试不是多个独立样本。没有“另一张弃牌”之后的受控整轮/整场实战结果，不能声称避免本局死亡或提高胜率。runs.jsonl源码字段为current，历史完整运行树未冻结；本次验证针对明确base上的现有实现，不冒称恢复旧运行树。其他旧A6弃牌来源与更宽沙坑规则仍不在本次范围。自然读取、Jev实际采用和部署后收益均待新局；不因题面自测通过而宣称量化学习完成。

回退：仅撤本项源码提交及对应实际发布记录，保留已有沙坑模型/护栏与所有原失败、经验、复盘、并行改动。实际live祖先确认前不登记implemented/shipped。

## 最终结果（2026-10-12）

源码提交 `608478393b0491c9d77441d06b7a402994987f42`（4个文件）；工作树干净。规定 `bash tools/test-sandbox.sh` 首次完整退出0：tsc0，326文件3232项及paths单文件11项，合计327文件3243项；没有超时重跑。日志 sandbox-source.log/exit。

根 code_proposals.py add 以原登记对象幂等核验返回原ID，无新提案ID、无原文改写；本批 proposal.md 链接仅经 ledger.py update 追加。

在live-merge.lock内等待builder完成，按原流程保存8份已刷新知识数据，提交 `bbdaadc8039d6684de8a0e157381fe077c3ec3e2`；gitleaks-refresh.log通过。这是刷新数据快照，不是本策略上线。随后用git merge-tree预检本分支，退出1，包装器merge-live.exit=31：notes/fix-queue-v4.md、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl三处内容冲突。原merge-tree.txt包含三stage blob与冲突路径；未执行实际git merge，无MERGE_HEAD、无需覆盖或解决并行记录。合前两份未提交notes回测记录保持。

策略源不是当前live祖先（检查退出1），merged=null；合后tsc/vitest未运行，版本=null。没有新增上线decision-log、eval版本、Roy双通知或shipped，因为本项规则尚未实际上线。账本经CLI保留proposed，原提案最终waiting，待运维沿本提交完成集成；不以此关闭更宽A6/其他来源的规则或主张胜率收益。

交运维：本目录proposal.md、report.json、source-commit.txt、sandbox-source.log、red.log、green.log、merge-tree.txt、live-before.txt及两次ledger回执；不得将刷新提交当策略实现提交。
