# 士兵一次翻倍在2敏捷窗口的范围补证

角色：Silent，已观察A10，独立自有局n=1。来源任务postmortem，批次abf5aa6f-b0a9-4a7f-bbe5-aedeee8000ae；实现任务strategy-proposal。账本silent-0179（同现象范围外复现）、silent-0180（一次触发支持）；经验ID silent-paels-legion-card-block-double。正式发布与消费者读回均pending。

证据：Q7HBKHZTSPJ8 F33第4试T5，decision_id=00417e80-2ff6-4187-ac4b-318b4a7d88c8。jev-prompts原行88074，offset=3337125021、bytes=95229、SHA=add7ef3a007ce63f7165871b9c871903ea2ad85a730d5961e6ffe3050534c70f；question-Q7HBKHZTSPJ8.json保留完整原行引用，题面完整保留。decisions原行519976—519979与states539858—539862逐帧核回；原字节ref、identity与冻结切点见whole-run-summary.json及question-readbacks.json。

题前20/70血、0挡、3能量、2敏捷，未见脆弱/暗影/不动；PAELS_LEGION stack=null。普通防御和普通残影原文均显示14挡，base/enchanted均5。Jev选plan3，题面block_gained=28、hp_lost=0、damage_dealt=22。实际防御后挡14、士兵stack=2；残影牌面回7、实挡21；毒刺后挡仍21，18攻击后下一轮余3。下轮20血3挡对24攻击死亡，但不能从未执行替线声称修正后必胜。

当前只读live提交487ce58924ff9e511cfbf76bfaad73608d310de3，agent/src/reflex/combat-plan.ts:5162只识别0/3敏捷；:3075接unmovableArmed，turn-solver.ts:2205只在该标志成立时消费翻倍。对局run-config两行均git ENOBUFS、commit=null，runs.code=current；这里只定位当前源码，不冒称其就是本局源码。旧fix-queue未列同项，但旧账本0179/0180及S1.fix33已存在。源文件SHA与精确diff见source-reference.json、live-reference.diff。

旧行为：2敏捷不进入原0/3敏捷资格范围，题面可能沿用两张翻倍预览。拟新行为：在实现任务先用本局真实固定快照复现；仅在同样无脆弱/暗影/不动/臂甲、普通防御base5且预览14、士兵可触发的已观察2敏捷范围内，比较首张14、后继残影7而不是14+14，首轮21与次轮3为必要固定读回。保留原0/3范围；不推广任意敏捷、临时敏捷、附魔、升级、自动重放或其他角色。

这是条件模型修正候选，不是固定出牌顺序。验证使用固定原帧，核预测输入、chosen、回执与真实后继；按任务协议跑沙箱tsc/vitest后才沿live发布。没有统计拟合、训练/验证切分或效果估计：新增2敏捷只有1局1窗口，不能拟新胜率；未观察组合维持unknown。旧0/3支持、旧叠加观察以及本局最终失败均保留，不提升经验置信度。

授权：Roy-2026-10-07-learning。回退：仅撤回2敏捷资格扩展，恢复原0/3行为；不回退旧经验/原证据。当前只读复盘未实现、未测试源码、未发布，strategy-proposal可在无法精确复现时返回waiting并说明缺口。
