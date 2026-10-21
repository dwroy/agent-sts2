# Issue #13：STORM_OF_STEEL 候选研究与原提案续接

来源任务：issue-13-card-models；batch=issue-13-card-models-20261021-111429；角色silent。研究基线e8811ce066141356035aaa10259b31f9dae88c7c，运行时代码V6-R410/5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。

这是未发布研究稿；不新增审批门，不提交或合入父分支。已有授权Roy-2026-10-07-learning不作为游戏事实。实现任务沿原strategy-proposal/ops调度，原ID保持。

账本：silent-0455、silent-0456、silent-0458。
原代码提案：silent-proposal-71e742c6453608bf、silent-proposal-c1dd614cdf7bfc37、silent-proposal-69776c308a3b298e。

## 旧行为与候选

候选：按实际施放时剩余手牌转换小刀，普通/升级分别；保留自动弃牌分支未知。

现有discardsHand/handReplacement只清旧手牌并停线，不完整生成；adds静态张数不能覆盖前缀离手。

## 证据、反例和范围

本批深核动作12，独立局4；进阶[10]。普通/升级和pending/完成分列effect-audit.json；不把候选或重复SL计独立局。
- 0NZXA12NLDMH F33 T6，动作字节593292200，SHA256 2d27d6b8cdd2b6f88283b31d1f87b94ac982d2c1babc2b5f31fa030cfd9c04ac；原结果 `completed: Action completed.`。
- C7GNN3DDFUFY F20 T2，动作字节1001473732，SHA256 67431dd21622f12490af8dfcb7cfd781e83215d2f08fb954be330d69105dd59d；原结果 `completed: Action completed.`。
- K643VJCTQT0J F35 T5，动作字节1041340947，SHA256 5645b1cab8ddf336a260c8c54590921d7e6b571ebd4531753183c4f2283cee6c；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F2 T4，动作字节1224958417，SHA256 cbe78a365424f0208a73568012de7fb679843c31cc01a83239475adb091e30a7；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F3 T4，动作字节1225232476，SHA256 00f448e6ca640d0e203725e79e0bf158b73615ec9344706c6cb362a3a5a636dc；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F8 T2，动作字节1225823043，SHA256 5038949388fc7602e41534b34851e62a48970c71df293bb5a005796346fc53b6；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F11 T1，动作字节1226255619，SHA256 0f9501e36b81ce3fcde9a7c1e4213b3cbae7586068a373c67ec1c47ebda69c63；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F15 T1，动作字节1227213423，SHA256 35d894dad4d152e45d0a4bc9526f250ac895920917b369645bbaa892f39a354d；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F19 T5，动作字节1228085067，SHA256 d1464ff22082c37981b4cfbcb49c845f2ec4471149c128d27b646653084b628c；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F28 T1，动作字节1229847044，SHA256 e7cff23e4baad79bb61a28b2529678de5a320ff1307737b63b12128d8c40928f；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F29 T1，动作字节1230158970，SHA256 72bfa32c2c2c0a790665043fe7d83894548289d21f0fbce8ea2cc107c1899120；原结果 `completed: Action completed.`。
- 32VSST9UX7MN F30 T1，动作字节1230836651，SHA256 0bce10c23d720ef1470a870cb9582887b18ef70abd2e4984c9f13c76f75e73f1；原结果 `completed: Action completed.`。

完整前帧、选择、后帧、来源字节和SHA索引：本目录source-index.json、effect-audit.json、historical-selected-chains.json及shadow-card-executions.json。每行只读冻结完整字节切点内。具体复制品无实例ID、内部中间帧缺失、未观测升级/目标/期限均保持unknown。

## 方法与验证

非权重拟合。六局shadow全题/全标签清单完整核对；历史从只读索引发现，选择已登记原证据及普通/升级、SL未到次轮和奇巧反例，样本不是随机效益评估。较早局与7XS A10分别保留；没有独立自然上线后留出。原R409失败不倒改为R410成功。

固定验证设计：
- 已见普通1/0费、升级1费分别验收
- 张数在打出本牌后按实际弃牌数确定
- 奇巧净挡反例拒绝仅靠生成数升known

1804项检查含大量逐行SHA/边界机械检查，不能说成1804个独立效果试验。R410消费者只做modelHandCard/offHandCardModel单例读回，不跑模拟批次；draft遵循已发布CardModel字段，未表示的生命周期另记审计，全部known=false。

## 预期影响、回退、剩余验收

预期仅补已观察机制和合法后继，不制定新拿牌/出牌、药水、SL或终局阈值，不声称胜率提升。实现时从精确牌面/角色/进阶保护起步，覆盖选择、离手物化及solver/rollout；其他角色和未观察分支等价。测试通过沿原学习闭环发布、开局边界核版本及消费者读回；本报告不代这些验收。

回退：未来只撤本提案实际实现提交及对应模型增量，保留原0066/0217/0455修复、所有失败和证据；本批无需生产回退，因为没有生产更改。
