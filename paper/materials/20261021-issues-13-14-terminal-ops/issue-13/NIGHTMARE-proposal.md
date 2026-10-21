# Issue #13：NIGHTMARE 候选研究与原提案续接

来源任务：issue-13-card-models；batch=issue-13-card-models-20261021-111429；角色silent。研究基线e8811ce066141356035aaa10259b31f9dae88c7c，运行时代码V6-R410/5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。

这是未发布研究稿；不新增审批门，不提交或合入父分支。已有授权Roy-2026-10-07-learning不作为游戏事实。实现任务沿原strategy-proposal/ops调度，原ID保持。

账本：silent-0140、silent-0141、silent-0385。
原代码提案：silent-proposal-f9dc6814eddac8ba、silent-proposal-0129c465c6f5bd79、silent-proposal-9e81dc5f9a4c3bd5。

## 旧行为与候选

候选：绑定真实selection对象，在存活的下一回合交付三副本；不即时施放。

当前CardModel没有带所选牌快照的延迟复制字段；adds为即时生成不能替代。

## 证据、反例和范围

本批深核动作11，独立局5；进阶[7, 10]。普通/升级和pending/完成分列effect-audit.json；不把候选或重复SL计独立局。
- 4Y94N8RDPGPM F33 T4，动作字节548996787，SHA256 667042016e2076c6022b0d851e915e71e0e06f5f7fe566c39d74227f0655b78d；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- 4Y94N8RDPGPM F45 T4，动作字节549722426，SHA256 e71f78aa26a8efe66f38ac9efedaad63480ed76bf5dd11167798d9364c7b29f3；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- 4Y94N8RDPGPM F48 T10，动作字节550085559，SHA256 0e140124e808a23c2f53b28b1d6529d013db2a4453f39410fbf4c9182ac969cd；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- 9TG1RP5LFAAK F39 T2，动作字节571641387，SHA256 9ce1a7cde2c364e7f649ad919a11efff3383096b8f62fe4ed92e29610c93c960；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- 9TG1RP5LFAAK F42 T3，动作字节571868878，SHA256 5074a2df01309563106a38b670fdae3d19a1ca5ec7beb0d2175bef366b807dd0；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- P5HT1272P5SB F25 T1，动作字节650286626，SHA256 1b4935dca2b1efb68d1f2eaf6743a630b60cfdc168291751b308504d153327f0；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- XTSV1U9JD34T F49 T4，动作字节720258808，SHA256 57002a8a4025666cc960dff8de6b3e7eaad4800d1374405cf5911a1bd5b337d1；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- XTSV1U9JD34T F49 T4，动作字节720344752，SHA256 e7322fcee6f6e3ded9230b0bd261cdb22e1e6433e0d0a0c45552e7ff41fbd870；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- XTSV1U9JD34T F49 T4，动作字节720435515，SHA256 774cecba2ae2b74f5c0db50d021308dd9093203cc369ac41efd7fa4e4d475e0c；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- XTSV1U9JD34T F49 T4，动作字节720476788，SHA256 20474507b78c19cc8861295853e208795ebeb3cea0f0c71b12813225969bf2e7；原结果 `pending (unstable): Action queued but state is still transitioning.`。
- 54G5683J0E5S F33 T5，动作字节867386885，SHA256 bbaa46456fd9de6199f814fca78e16abd0b133c23a8f7c4b03906985d11661ff；原结果 `pending (unstable): Action queued but state is still transitioning.`。

完整前帧、选择、后帧、来源字节和SHA索引：本目录source-index.json、effect-audit.json、historical-selected-chains.json及shadow-card-executions.json。每行只读冻结完整字节切点内。具体复制品无实例ID、内部中间帧缺失、未观测升级/目标/期限均保持unknown。

## 方法与验证

非权重拟合。六局shadow全题/全标签清单完整核对；历史从只读索引发现，选择已登记原证据及普通/升级、SL未到次轮和奇巧反例，样本不是随机效益评估。较早局与7XS A10分别保留；没有独立自然上线后留出。原R409失败不倒改为R410成功。

固定验证设计：
- 先选择再建立NIGHTMARE_POWER3，次回合到手
- 原牌保留时同名4张不计4个复制
- 4次同层SL分支未到次轮，不计兑现

1804项检查含大量逐行SHA/边界机械检查，不能说成1804个独立效果试验。R410消费者只做modelHandCard/offHandCardModel单例读回，不跑模拟批次；draft遵循已发布CardModel字段，未表示的生命周期另记审计，全部known=false。

## 预期影响、回退、剩余验收

预期仅补已观察机制和合法后继，不制定新拿牌/出牌、药水、SL或终局阈值，不声称胜率提升。实现时从精确牌面/角色/进阶保护起步，覆盖选择、离手物化及solver/rollout；其他角色和未观察分支等价。测试通过沿原学习闭环发布、开局边界核版本及消费者读回；本报告不代这些验收。

回退：未来只撤本提案实际实现提交及对应模型增量，保留原0066/0217/0455修复、所有失败和证据；本批无需生产回退，因为没有生产更改。
