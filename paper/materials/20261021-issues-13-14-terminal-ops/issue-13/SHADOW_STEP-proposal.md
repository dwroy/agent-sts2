# Issue #13：SHADOW_STEP 候选研究与原提案续接

来源任务：issue-13-card-models；batch=issue-13-card-models-20261021-111429；角色silent。研究基线e8811ce066141356035aaa10259b31f9dae88c7c，运行时代码V6-R410/5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。

这是未发布研究稿；不新增审批门，不提交或合入父分支。已有授权Roy-2026-10-07-learning不作为游戏事实。实现任务沿原strategy-proposal/ops调度，原ID保持。

账本：silent-0033、silent-0035、silent-0436。
原代码提案：silent-proposal-a770c8a2cb863eff。

## 旧行为与候选

候选：普通模板全弃、无即时抽3、下一回合双倍；现有字段已存在但known仍false。

需为已核普通模板补known资格和弃牌副作用/下一回合消费的联合验证。

## 证据、反例和范围

本批深核动作5，独立局2；进阶[0, 10]。普通/升级和pending/完成分列effect-audit.json；不把候选或重复SL计独立局。
- R0HEV5E3QT6G F48 T4，动作字节474571272，SHA256 f403beaea89b98381a80f8dffb081609ca15929ce299a87379316173abbf483c；原结果 `completed: Action completed.`。
- K643VJCTQT0J F33 T1，动作字节1039335293，SHA256 315e4f931f85c1d33ffec2d5a71eec764fa27bbdea8200bb0e8d4a723e23e670；原结果 `completed: Action completed.`。
- K643VJCTQT0J F33 T7，动作字节1039781304，SHA256 5716524383bfc788e49c78ae24333e5f55d932e2970cf20953922c1828690f93；原结果 `completed: Action completed.`。
- K643VJCTQT0J F33 T1，动作字节1040005349，SHA256 9e580881d47d61e36b79539c76d25ae1d5432a89383d208b5f6ce8422e84179c；原结果 `completed: Action completed.`。
- K643VJCTQT0J F33 T8，动作字节1040821567，SHA256 0b003211cecdd3943ed6045e7724ce8d9908acc9f8976d3f10cfcc580b6ecdd0；原结果 `completed: Action completed.`。

完整前帧、选择、后帧、来源字节和SHA索引：本目录source-index.json、effect-audit.json、historical-selected-chains.json及shadow-card-executions.json。每行只读冻结完整字节切点内。具体复制品无实例ID、内部中间帧缺失、未观测升级/目标/期限均保持unknown。

## 方法与验证

非权重拟合。六局shadow全题/全标签清单完整核对；历史从只读索引发现，选择已登记原证据及普通/升级、SL未到次轮和奇巧反例，样本不是随机效益评估。较早局与7XS A10分别保留；没有独立自然上线后留出。原R409失败不倒改为R410成功。

固定验证设计：
- 普通Cards=3不当draw3
- 当轮不立刻双倍；弃掉旧后继
- 升级、未知副作用、其他角色保持unknown

1804项检查含大量逐行SHA/边界机械检查，不能说成1804个独立效果试验。R410消费者只做modelHandCard/offHandCardModel单例读回，不跑模拟批次；draft遵循已发布CardModel字段，未表示的生命周期另记审计，全部known=false。

## 预期影响、回退、剩余验收

预期仅补已观察机制和合法后继，不制定新拿牌/出牌、药水、SL或终局阈值，不声称胜率提升。实现时从精确牌面/角色/进阶保护起步，覆盖选择、离手物化及solver/rollout；其他角色和未观察分支等价。测试通过沿原学习闭环发布、开局边界核版本及消费者读回；本报告不代这些验收。

回退：未来只撤本提案实际实现提交及对应模型增量，保留原0066/0217/0455修复、所有失败和证据；本批无需生产回退，因为没有生产更改。
