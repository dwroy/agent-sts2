# 候选提案：先恢复有来源哈希的原agent_view，并验证手牌与牌堆身份守恒；不以当前知识覆盖原输入。

适用角色仅 Silent、已观察 A10；实战为V5、多版本/脏数据现场，回放固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。不得外推铁甲、其他角色或未观察进阶。来源任务issue-4-elite-calibration，批次issue-4-elite-calibration-20261021-104312，父要求silent-elite-simulation-pessimism-20261021。本轮只草稿，ledger未新增、CLI未调用、无实现任务批次，不填写伪造登记ID。所有下一步由原ops单点安排；本轮预算新MC=0、真实模型=0、测试=null。

状态：waiting；local_key只是scratch目录索引，不是正式提案ID。

- ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2
- BXU0CKWKH2RU-f15-fight6（Silent A10/F15/T1可行动），logs/states.jsonl offset=13982412226 bytes=31630 SHA256=bf0e4a71065bc5800dd13a5a6955b26e4333583753e2d828346a889a331e0c1c
- BXU0CKWKH2RU-f46-fight20（Silent A10/F46/T1可行动），logs/states.jsonl offset=14012534173 bytes=50808 SHA256=dc49286a1fb96b8148c8e320e6e2fb1446d9dae763ed666ad228537c285a943e
- ET1QAZCV8GUP-f9-fight4（Silent A10/F9/T1可行动），logs/states.jsonl offset=14287839500 bytes=30795 SHA256=b4622465a1aeb30caece92f41cf74f007f199358cb33710f2d933b6c68db6469
- 2XCG8LXUZLRE-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14516553453 bytes=30452 SHA256=9de6174c27382f0546c6348a5e2b0a5078caa8374aff1b708d05166ec10d08fd

旧行为：extract/prepare调用parse_state_line去agent_view；boardOf按cardId+upgraded从常驻deck扣手。ET1有6张手牌战内升级与常驻deck不匹配，冻结34张大于原28。拟新行为：专用审计入口按已知offset/bytes恢复完整原帧；保留原件与来源SHA，缺视图显式unknown，牌堆直接用可读原视图，不用“按ID随便扣”掩盖升级/mod差异。这里是候选数据/表示修复，不修改生产或游戏参数。

固定回归：ET1应恢复手7/抽21/弃0/耗0=28；七张手牌升级身份保留，特别LEG_SWEEP+可扣、其余六张旧deck扣不动的反例保留。BXU F15低残差样本恢复后多重集等价；SOUL_NEXUS的no-solve原异常仍须显式保留，不补0。回归核卡ID/升级、卡面、mods、pile大小与原字节，而非只核死亡率。

撤源负控：移除agent_view时必须显式标fallback及身份不守恒，不能悄悄得到“同输入”；撤走原SHA匹配应拒收。低残差BXU是已阅负控，不是独立留出。独立留出：本轮53场均已阅，全部只作诊断集；后续冻结后未读Silent A10新局按run留出，至少8个不同新局各首个精英，未齐前waiting，不借SL或种子补分母。

最小下一步预算：只做53个原T1输入的静态转换及8个固定断言，同时保留两处最后COMBAT到非战斗退出少3/6HP的端点断言；1进程nice19/ionice3、≤10分钟、0MC/0模型/0完整测试；不启动此实验。先过这一关才谈模拟残差复测。消费者：离线审计、boardOf回放输入；未来A消费者须另核生产路径。误差/限制：51成功场ID/升级多重集相等不证明mods等价；分组牌堆无抽序；修正方向未知。回放helper未在771清单中，Git cf337代码可解释冻结差异，但原运行时helper逐字身份未独立冻结，不能冒称该叶SHA已核。回退：撤回专用输入转换提交，原99文件与原结果全部保留。
