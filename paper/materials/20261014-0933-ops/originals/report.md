# 本批策略核证报告

登记依据时间：2026-10-14 09:26:41 CST（先执行 `date`）。本批 `20261014-091302-s2-strategy-proposal` 的十个派发id全部处置为waiting。未发现由本批冻结证据支持的新确定模型差额或可校准策略参数；没有新增源码、知识、经验条目、提交、live合入或发布版本。原提案完整范围仍待数据，不把已有子实现当整项duplicate，不关闭学习父要求。

base=`61abbbe2f0171061b913f4d6cecd0d903e63fd1a`，fixes=[]，merged=null。工作树开工干净，核普通派发身份后 `git merge --no-edit main` 为 Already up to date。普通派发有proposal_ids；没有本批研究或实现绑定，不使用旧专题完成字段。全程自行完成，未派辅助agent，未联网、运行play或干预对局。

交运维的提案材料：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-091302-s2/learner/runs/20261014-091329-strategy-proposal/proposal.md`。它逐项列出旧/预期行为、证据局/层/回合/账本id、反例、缺口和后续验证方法；result.json逐项给出proposal_results。只使用已领取的原CLI id，没有新造id、修改原提案/根请求或复写历史复盘。

| 派发局号 | 实际角色/进阶 | 决策原行 | 状态原行 | SL原行 | 结束/历史源码记录 |
| --- | --- | --- | --- | --- | --- |
| NHA2KW0RB7VP | SILENT/A10 | 584 | 602 | 7 | F33败，b8ca9311+dirty |
| P74C04AEPL1F | SILENT/A10 | 395 | 410 | 5 | F23败，fd4c8e52+dirty |
| G33HU22H2543 | SILENT/A10 | 850 | 879 | 8 | F48败，710dc4dc+dirty |
| RC61MFQM63Y6 | SILENT/A10 | 674 | 694 | 7 | F33败，0d6c1a82+dirty |
| BTSRF7JL1W1Y | SILENT/A10 | 635 | 653 | 4 | F31败，6ad5584f+dirty |

合计3138决策、3238状态、31个SL记录，另各5个runs/config原行。6417个原行的offset/length/SHA256逐条与只读日志及冻结副本相符，五个input.json也按manifest实际SHA复核。原提案十份全部满足原登记SHA。角色核验在解析正文前完成，没有混入其他角色知识或统计；本批只读知识为22个相关silent经验条目。

消费者核证：四局全量 audit-selection 成功；P74全量输入因decision 278271缺decision_id退出1，原stderr保留，未补造id。随后仅限定其F22/F23的89个决策及对应原状态，保持原行号，消费者退出0。这是有界材料消费，未宣称P74全量成功，未跨缺行续链。

成功消费输入共2832动作、465题段、1000可见相邻观测区间及1832未知区间；459个轮窗中141个有可见整轮端点，318个未知。完整候选结果全部null，表示该消费者未认证完整候选身份/结果，不表示实盘没有完成过任何方案。整轮净HP和可见扣敌血不能直接归因一条候选、一次SL换线或某能力。五局SL不作31个独立样本。

29个固定材料数值检查通过。主要读回：NHA同指纹首/末T1挡14/8、实损1/7、扣敌8/24；RC61首/末T1挡16/12、实损4/8、扣敌30/23，两条都实喝格挡药。RC61日志SL.original是朝火箭不喝药的另一个题面对象（报损21），与首试实线分开。P74赢战53→9、T2/T4净损20/24，火焰在该滑溜状态扣1；F22可见扣血下限156、观察新增HP42，主怪归零缺帧保留。G33 F31累计可见扣298/新增150与六次复活对应，不按初始148当完整需伤。RC61五次实际休息合105，下一boss首操作52血。BTS最终重问plan2的4模拟样本已含1死，T4实际死亡不足以证明概率或模型bug。

资源消费者的进房首帧还可能早于开场遗物/抽牌结算：例如NHA第一试先见28血、敌219/209，而首操作已30血、敌209/199；G33女王第一试先见81血，首操作已77血。这些过渡不归为所选T1候选的伤害或回复。用于同盘比较的是时间和指纹唯一匹配的真实决策帧，原过渡帧完整保留。

既有生产 survivorDiscardFacts 在P74 decision278543/state284817上保留全部四候选；实际弃精确切击后的state284818与该分支保留手牌一致，HP/挡/能量为1/16/2且输入未修改。每个分支仅提供手牌/费用快照，未模拟后继伤害、格挡或剩血。这支持子事实已实现，不支持关闭四分支动态推演父项。

源码核查的live快照为 `6c8eed9f4b6f95a09d259fe9089dcdcc4c1f39c6`，本批未修改live。投斧e784dd9f043bf87c29109573f48975f9903280d3、唯一生存者单弃bf423c173d3be348a4ad714e1d26516df619ff41、手牌快照4b0823f519f1b724d6cff2b1cd50b74146dc4a9d、滑溜毒9c19ce71a149300442b01adcfa50df543bc8a7f1、士兵19e41a26648542b7ad0bce4e70b55f30be532d49均核为base/live祖先。旧分支f34700874c9f48b614991f769532115a0f24f27b本身不是live祖先；当前discardPlanFacts代码已在实际祖先5b56a452bb9be14d620b368ec46974c1b57901ca中，未冒用旧分支commit登记duplicate。

九个相关源码叶的base/live内容和SHA均保存，五叶逐字节相同；turn-solver/rollout/explore/combat-plan四叶差异仅现存Roy→Dai文字替换，原补丁保存。没有改写其注释或沿此差异覆盖live。源码副本均为.txt，不使用可执行.ts副本。

没有源码修改，因此tsc、vitest、cases均为null，未运行生产源码测试、撤源码失败/恢复通过或合后测试，不引用历史测试为本批成功。上述消费者退出码、29个材料检查和6417个原行校验单列，不计入生产cases。没有合入提交/版本/implemented/shipped或上线规则双通知。

账本仅经根目录learner/ledger.py update补本批原id和材料链接，by=learner:strategy-proposal，保留既有claim/status/version/首证/prior/evidence；既有shipped机制不降级为proposed，宽代码提案waiting由最终proposal_results交调度器登记。未创建新经验或向大脑发布知识。CLI输入、stdout/stderr、读回验证及最终材料扫描结果均保存在本目录，详见ledger-updates.jsonl、ledger-update.log、completion-check.json、gitleaks.json。各waiting缺口仍经原strategy队列等待新局重派，不冒称经验实际入库或消费者已采用策略。
