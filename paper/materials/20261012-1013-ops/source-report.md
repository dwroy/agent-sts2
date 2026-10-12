# 本批策略提案回报

已实现原提案silent-proposal-a46bdb7fe711d79a的一个离线审计子项，源码提交`07192e6faf1da89c2719e22b3e0c280617795f22`。十个原ID均已逐项核验；完整提案仍waiting。实际live结果以本报告末尾合入回执为准，不把局部审计当成策略收益或整项完成。

## 身份及证据

- task=strategy-proposal；character=silent；batch=20261012-092818-strategy-proposal。
- 初始工作树干净；核对根learn.json本批全部十个proposal_ids、角色、六局集合及工作树。无research_request/implementation_request/proposal_repair。普通研究请求绑定另一旧批，不承接该专题；git merge --no-edit main返回Already up to date。
- 完整base：0478a90239003f23688bf95c1988dbf922804b1c。没有领取其他ID或修改原请求、learn.json、提案原文。
- 六局DUZUBAJ3A8GP、5PM6JAQG6FNQ、CA5KE8GFJ9X2、8JRE1C4H4Z2W、YF0LXT1QSTGG、XP2SL33HT0D9全部从runs.jsonl核为SILENT/A10；runs-verified.json保存原行。
- 十个原Markdown SHA全部吻合并逐字保存；相关silent账本快照ledger-snapshot.json。复用原ID，不新造代码提案、不重复历史复盘。
- 1062个状态、1043个决策从原logs逐行独立复核，核对原内容、角色局号及字节offset/length/SHA；见verify-originals.py、raw-verification.json与两份raw-offsets.json。verify-evidence.py固定断言四组同指纹实损与净扣、污染/力量/阶段/朝向事实。它是本批限定楼层核验，不是全历史或受控胜率研究。

## 实现与限制

关联账本silent-0021、silent-0027、silent-0028、silent-0085；原提案a46bdb7fe711d79a。YF0LXT1QSTGG F48末试T3—T5，d271489—271509及21帧为发现/固定回归。关键d271494/s277512→277513观察换相4→212、清旧毒；d271498→271499重问；d271499/s277517→277518触媒建2但敌无毒；d271507/s277525→277526敏捷5→6、已有23挡不变。

新增离线observed_intervals，补手牌、玩家能力、敌人HP/最大HP和能力原值；只连接原决策行相邻、同层/同SL尝试及重载、时间递增且两端状态唯一一致的观测，跨轮仅结束请求→下一轮。重问/选牌/跨轮分别标边界，缺帧/跨SL/不明条件拒连。actual_action_effect与完整候选执行仍null，不认为相邻日志排除了未落盘动作，不认敌index为跨帧实体，不合计跨阶段伤害。

旧输出只有部分问题段的动作前资源，不能直接审计持有与已建能力；新输出补观测，不拟合或改变任何出牌、护栏、药水、SL、终局权重。无在线调用和游戏知识库修改，铁甲及其他进阶在线行为等价，不需要游戏eval版本。未验证自然消费者采用或胜率改善。

反例和限制：前五试建毒雾/余像仍败；触媒建2但零毒不记毒收益；pending生存者不因下一帧选牌而被认证完成；敏捷后增不能回填既有挡；SL不是独立样本；原运行dirty源码未完整复原。检查污染时发现当前攻击意图已含既有污染，所以放弃“重新规划漏加既有污染”的假设，没有改计价。完整替线抽序/成长/后继缺失，规则保持。

## 验证

- 新增7个用例，使用21决策/21状态的原字段投影，42行递归比较一致，带原行SHA；fixture-projection-proof.json、原完整输入intervals-full-original.json均保存。
- intervals-first.log：新旧两文件15例通过。缩减夹具为实际消费字段后，撤源码intervals-withdrawn.log为7失败、exit1；恢复intervals-restored.log为7通过、exit0，源码字节完全恢复，见red-green.json。
- 真实离线CLI对YF的F33/F48共343决策、345状态，exit0，52个问题段，328个可连接观测区间、14个跨房间/尝试拒连、1个末尾无后帧。所有效果/完整候选认证均null。见yf-consumer-input.json、yf-consumer-output.json、consumer-verification.json；不声称自然大脑读取采用。
- 提交前原入口bash tools/test-sandbox.sh，SANDBOX_WORKERS=2，exit0；tsc0；vitest326文件3227例及paths单文件11例，共327文件3238例通过。无超时或重跑；没有修改排除名单、提高预算或放宽断言。sandbox-before-commit.log完整保存。
- gitleaks-staged.log：exit0，115086字节扫描无泄漏；git diff --check通过。提交使用本机身份及Codex GPT-6共同署名，无仓库身份设置、无推送。
- source.patch、selection-execution-baseline.txt、selection-execution-implemented.txt及tested-source-input.json保存撤码和最终源码；没有临时.ts副本。原提案、证据与初稿保留，没有运行play、LLM或网络，没有读取凭据/游戏二进制。

## 原ID处置

所有原ID保留waiting；逐项证据/层/回合/账本/反例见proposal.md，各自理由如下。

| 原ID | 处置理由 |
| --- | --- |
| silent-proposal-c20b5139dd0dff71 | 当前意图已经含既有污染，不能初始化再次加价。缺固定A10移动输入下毒/挡/污染联合消费者校准及完整替线后继。 |
| silent-proposal-ae9e692d680e3819 | 缺遗忘死亡返敏、多来源抢夺和临时属性混合返还隔离帧；不能推固定击杀顺序。 |
| silent-proposal-52f1e1bd2e7db0ed | 缺覆甲减层条件隔离及固定A10移动表联合重放；首样本读取只覆盖子项。 |
| silent-proposal-6dd8bbff876be528 | 缺同种重复召唤身份隔离、完整敌方行动时序与生成到消费者验收；未选杀序无完整后继。 |
| silent-proposal-578e415a259e6835 | 旧预测审计及单步派发已上线；跨重规划完整动作、能力与实际轮末资源归因仍未齐，缺受控整战胜线。 |
| silent-proposal-c0767768bf6a7ab1 | 旧资源比较和单步派发已上线；覆盖重放/弃牌续步完整执行验收及受控整战后继仍缺。 |
| silent-proposal-a46bdb7fe711d79a | 本批补相邻观测区间、持有/能力快照与缺帧拒连子项；完整执行归因和同资源整战后继仍缺，不能改候选排序。 |
| silent-proposal-1044224808015e5c | 旧候选及单步派发已上线；缺同抽序/成长后继和独立整战胜线，不启用固定低损血优先。 |
| silent-proposal-7cbc6005db712ba9 | 缺额外触发隔离及抽弃重规划到完整能力兑现的联合验收；已有公式子项不代表整项完成。 |
| silent-proposal-c59f592f1427a67e | 预测和单步派发已有实现；本批相邻观测也不证明完整资源、恢复链、能力因果及受控胜线，综合提案保留。 |

原预测be69855995737d6f381adb10bf248964832da24b、资源比较5604982e13890e0e2bc8bf8246272e8267321c0b、阶段参考a83d9ab675560a177249aa638e99df40bcfb5553及单步派发fdaf787a372880b0438e73bcac7e6d2168b038ed均核为实际live80387c563d4b42b6e14b940dda86e1d2aa420d3c祖先。这里只更正旧未上线阻塞理由，各自子项不等于整个宽提案duplicate。

根ledger.py已经追加四个相关旧账本的proposed、提案/报告和源码链接；不改claim、证据历史或标shipped。原代码提案ID复用，不重新add形成重复ID。运维应核最终合入范围后，仅为有限子项登记实际交付，不关闭完整策略提案。

交运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-092818/learner/runs/20261012-092828-strategy-proposal/proposal.md

## live合入结果：受阻，源码尚未上线

在ops/live-merge.lock内等待刷新检查后，原live为c56900bd37e5eaa6680381a3300fb7d3aafac7a5，按任务提交9项已刷新的知识数据为01ef3b632542bd43aae03af1fab1e097ba72e45d；刷新暂存gitleaks退出0。刷新路径与本分支增量无重叠，原有两份未提交notes记录保持。未修改生成脚本，不另重建数据。

合前git merge-tree预检退出1，三处content冲突：

- notes/fix-queue-v4.md
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl

依任务“冲突就停下回报”，没有执行实际源码merge，没有解冲突或覆盖刷新数据；merged=null、version=null。合后检查未运行，不能把分支自测填成live检查。现场见merge-receipt.json、merge-preflight.txt、live-merge-attempt.log；本次只是预检冲突，live没有留下MERGE_HEAD或冲突index。

源码07192e6faf1da89c2719e22b3e0c280617795f22及四文件补丁已保存，运维可沿原授权范围接续固定增量；不是缺新局才能继续的工程阻塞。本子项不改变游戏行为，无新eval版本/规则双通知，没有登记shipped。真正的策略调整仍缺完整执行归因及受控后继，不因工程合入成功就关闭十个宽提案。

账本只经根ledger.py追加proposed、源码及阻塞链接。原工作树源码已提交，最终保持干净。若后续实际上线需要回退，应revert该有限审计源码增量，保留历史；当前live尚无本次源码，无需回退生产行为。

机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-092818/learner/runs/20261012-092828-strategy-proposal/final-report.json
