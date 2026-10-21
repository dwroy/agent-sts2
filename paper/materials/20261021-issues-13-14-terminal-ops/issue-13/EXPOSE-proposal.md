# Issue #13：EXPOSE 候选研究与原提案续接

来源任务：issue-13-card-models；batch=issue-13-card-models-20261021-111429；角色silent。研究基线e8811ce066141356035aaa10259b31f9dae88c7c，运行时代码V6-R410/5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。

这是未发布研究稿；不新增审批门，不提交或合入父分支。已有授权Roy-2026-10-07-learning不作为游戏事实。实现任务沿原strategy-proposal/ops调度，原ID保持。

账本：silent-0066、silent-0073、silent-0208、silent-0217。
原代码提案：silent-proposal-00a6a10b15a62b38。

## 旧行为与候选

候选：补升级Power=3，并实现单目标清挡/清全部制品后施易伤；普通已known不等于清除已实现。

目标清挡和清全部人工制品在已发布CardModel无字段，须实现solver及rollout消费后再升known。

## 证据、反例和范围

本批深核动作37，独立局4；进阶[2, 10]。普通/升级和pending/完成分列effect-audit.json；不把候选或重复SL计独立局。
- 7XS2Y920KA6E F6 T2，动作字节1761790，SHA256 8d0bc9ec88776c1ca2f3221eb476f4c192d38ae777033bf08a1023e6b6b320d2；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F7 T1，动作字节2008682，SHA256 c9371b14c6114b4370e9fe1300b5a1f47390d2c39021d4c9fd217139ec646ff6；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F9 T2，动作字节2802256，SHA256 4f2f2a606f214ed70b5c6069553d7658168d903071a87204a3d601803452115e；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F12 T1，动作字节3617777，SHA256 92d11bb7380fda1748bf3a1e652d3143c4c4146ccd6420506c0597ac47ce15cf；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F13 T1，动作字节4149320，SHA256 5fcc0047c52ebca382f428d92de3ff1b58c82d4bb0d51d352a214020b1c868ef；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F14 T1，动作字节4525936，SHA256 4158ea0d773541af99726953deae6355ef856277e354cc64a74f12c68f413d23；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F17 T3，动作字节5662427，SHA256 95406c942be216860520e66e7a3cbaf9ec218c37d842db75a75bf102e68091c0；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F19 T3，动作字节6115594，SHA256 c17eaca1b1fa4a096e58b89a75030ba74fc81c47e75b24dce9acd69c7db035fe；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F20 T3，动作字节6469498，SHA256 fd78ffe95e392d3c1b79433623fc51557478e1235d08142c819980b0499cc59b；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F27 T3，动作字节7975342，SHA256 70a682b15bd17fe3cf52b892f6c7709e053c80a02db28f63aa3f2db3b419980b；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F28 T2，动作字节8265116，SHA256 5bf227620574afee27fa9821b26fdfff0a9f0ca9d993c6adfb84f3aff55538d5；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F30 T1，动作字节8829550，SHA256 be3967c771b2c8e8c937beab28d2e65a9c762cdd1ca344f95b3b923f32f5847c；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F31 T1，动作字节9140678，SHA256 88220d982c8a4bf1582ab165b9427d1dadfb556f78fe2c76b92ddcb172891af4；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F33 T1，动作字节9848516，SHA256 1dbb2f495869ac58e12203f740b2c158e1492f84630c3b688771d66debc4176c；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F35 T2，动作字节10337327，SHA256 1ba98d22835fe9d65a8acd40981228a5ecaff1dd3370ff5d494bcccd64054db6；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F36 T3，动作字节10773255，SHA256 d3d6a3a7d11f08e57e31fcaec2c4e6cf8fadbd1ac657c32fb0c3c367cd99d6e7；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F37 T1，动作字节11080883，SHA256 c9ba058945eff115094e8bb7e98c7bd0ec26092214e8e410069f33fcaf702bc4；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F45 T1，动作字节14923058，SHA256 8c6b5aa292b2568d27e893306dabfe87638748eb0a3d590c945d34e0ffdc27d8；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F46 T3，动作字节15591305，SHA256 16745da40c63012ab99cacc33416d5567f44f194fe0be0528a6ba4000d9d6abc；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F48 T2，动作字节16597220，SHA256 7c20dc0eddd5a68818255608eb49c10dc40f5e39763f7e30a2357024d605ab60；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F48 T7，动作字节18753957，SHA256 92e09ece0ffbfded029d429e8f9b3772eb134aa5b45da3e4fb76c9ba82d41b82；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F48 T7，动作字节20458110，SHA256 677324b42958b911d499a4e88cd7f7847fc67963eaeb3df8a8e52690a861ec11；原结果 `completed: Action completed.`。
- 7XS2Y920KA6E F48 T7，动作字节21944715，SHA256 ecfa88b7037ff747e01bebe5399766a5ef1a99e3e0cb7b17bffc919d5f0a34a1；原结果 `completed: Action completed.`。
- ZZMYZ5UBCG72 F48 T2，动作字节489394643，SHA256 198dd6c80d87650dffcecab0580362ac46168505e40d9698e8ec31ec92503995；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节644946547，SHA256 f6d36aa704ac4b4dfefcbb80c8da49acd45f8ee070d66682015f58b55d44d27a；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节644948137，SHA256 2b08f5a5d386c3bb05910fc7e3c4739e2db4d686bd9ea531f0a6d92c7f6feb73；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645037686，SHA256 fa680984100f028ddb4176b24f74882915bab219ae7864596a1b341d5b7092e1；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645055252，SHA256 88eecf41380fc043360a802d0d76c1fd5a3c422526f63683d62cd4f1ee11c0b2；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645166597，SHA256 0e1198c9820671601b555dc975885b730431107c30bdb0c047cbb08049c1a8a6；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645184048，SHA256 f48a458596b28ae10bbe05ae62f4e068c3c9b80efbfc92408de6ed49f7d0c2c7；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645260214，SHA256 f3ba25835d875930e37f9dabfbb5dc642f88082ca5cc3e2b56474c01c06d6e16；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645277678，SHA256 4eebeb3331f9a14f4b484187602763f8bbf70387005863a10b99de93c15bf854；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645346555，SHA256 cd490cc04b3e758df9d77da963272497e7eb65d4e0aeed4d524341323920674a；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645364017，SHA256 a6a18c03918721ced9663ba5f43cfe3bd2a9193a592983301f90585cbfc8f08c；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645477954，SHA256 4b83cf01038c7fc99ef57be615777c2d6007774e8e27b494d474a408ece0e1a1；原结果 `completed: Action completed.`。
- HSX4HYATB4E2 F48 T2，动作字节645495416，SHA256 c2ae8d721e87c255ecd2635e6bf80cd2ee98bb05cf7959a8a75449a4f742b497；原结果 `completed: Action completed.`。
- P5HT1272P5SB F25 T2，动作字节650320907，SHA256 a86ad8977f2b15260c3f913dbc41bc823b280bf7d67e5fb080541f9026ba5a35；原结果 `completed: Action completed.`。

完整前帧、选择、后帧、来源字节和SHA索引：本目录source-index.json、effect-audit.json、historical-selected-chains.json及shadow-card-executions.json。每行只读冻结完整字节切点内。具体复制品无实例ID、内部中间帧缺失、未观测升级/目标/期限均保持unknown。

## 方法与验证

非权重拟合。六局shadow全题/全标签清单完整核对；历史从只读索引发现，选择已登记原证据及普通/升级、SL未到次轮和奇巧反例，样本不是随机效益评估。较早局与7XS A10分别保留；没有独立自然上线后留出。原R409失败不倒改为R410成功。

固定验证设计：
- 升级Power=3不再丢失；普通不回归为未知
- 多目标只改选择目标；已有易伤做增量
- 重放/附魔/缺目标信息保持unknown

1804项检查含大量逐行SHA/边界机械检查，不能说成1804个独立效果试验。R410消费者只做modelHandCard/offHandCardModel单例读回，不跑模拟批次；draft遵循已发布CardModel字段，未表示的生命周期另记审计，全部known=false。

## 预期影响、回退、剩余验收

预期仅补已观察机制和合法后继，不制定新拿牌/出牌、药水、SL或终局阈值，不声称胜率提升。实现时从精确牌面/角色/进阶保护起步，覆盖选择、离手物化及solver/rollout；其他角色和未观察分支等价。测试通过沿原学习闭环发布、开局边界核版本及消费者读回；本报告不代这些验收。

回退：未来只撤本提案实际实现提交及对应模型增量，保留原0066/0217/0455修复、所有失败和证据；本批无需生产回退，因为没有生产更改。
