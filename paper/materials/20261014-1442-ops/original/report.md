# 静默猎手策略批次报告

2026-10-14T14:40:02+08:00

本批十个原ID均为waiting。确定性子项已有live实现，余下宽项缺受控完整后继或联合消费者证据，故没有源码修改、提交、合入、新发布、shipped登记或玩法参数拟合。

## 身份与基线

- batch：20261014-141302-strategy-proposal；task=strategy-proposal；character=silent；reason=proposal。
- 起始工作树干净；按普通任务执行git merge --no-edit main，结果Already up to date。基线和最终HEAD均为完整40位 4796b995789a09193b9b0bae8d3a0b03128210eb。
- learn.json本批只有所领取十个proposal_ids；没有research_request、implementation_request或proposal_repair。根deck-size专题绑定其他旧批，不适用本批，未读取其工作正文或改根请求。
- 派发运行局严格为十个锚点；另外五局由这些原提案直接引用，均先核runs.jsonl角色与实际进阶。没有读取其他角色知识，没有跨角色统计。
- 实际live读回 4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac，既有最新发布V5-R340；本批没有合入，所以merged=null。

## 对局身份与证据覆盖

| 局号 | 进阶 | 结果 | 最后层 | 范围 |
|---|---|---|---|---|
| K3676LU8B0UH | A1 | 胜 | 48 | 原提案关联证据 |
| SADL3CGYTGSR | A7 | 败 | 48 | 原提案关联证据 |
| F4QKG4J1AJJZ | A9 | 败 | 38 | 派发锚点 |
| JLN5SK17W4FQ | A10 | 败 | 33 | 派发锚点 |
| 4D4J8USKCPAV | A10 | 败 | 17 | 派发锚点 |
| S9UZAK0JP0C0 | A10 | 败 | 33 | 派发锚点 |
| NB8KCF6HRGVF | A10 | 败 | 31 | 派发锚点 |
| LS8035TB32P3 | A10 | 败 | 42 | 派发锚点 |
| 02HB4L0C3C67 | A10 | 败 | 12 | 派发锚点 |
| KEN58SH9SLZ6 | A10 | 败 | 17 | 派发锚点 |
| TXZ6RVMQA09D | A10 | 败 | 49 | 派发锚点 |
| WQZVENQ7DTRP | A10 | 败 | 33 | 派发锚点 |
| 1913SE84AXQF | A10 | 败 | 31 | 原提案关联证据 |
| Q6M2Y34MWKRE | A10 | 败 | 9 | 原提案关联证据 |
| NHA2KW0RB7VP | A10 | 败 | 33 | 原提案关联证据 |

逐字节核验原文件offset/bytes/SHA256及解析正文：states 9815行、decisions 9448行、sl-attempts 78行、run-config 15行、run-plans 0行、brain 481行，合计19837行。原run-plans无这些局的行，不补造计划；brain保留实际原答案。全部9815状态逐帧核silent及对应进阶。完整字节副本在*.evidence.jsonl，逐行来源与指纹已保存；只分析这些本角色证据。

20项固定帧数值检查与63项资源检查通过；76个机制帧、136个资源帧有实际来源。它们是证据/算术检查，不能代表生产测试或整战因果。42饮来自九局，SL恢复和同战尝试不增加独立局数。未重新全量计算原105/109局统计，也未用当前经验库刷新后的统计替代原证据。

## 实际live源码与局部消费者

| 源码提交 | 实际live祖先 | 范围名称 |
|---|---|---|
| e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a | 是 | Model observed Silent opening HP loss in continuous fights |
| fc7042d1df0626e9e726f4bc912d9c6f626d908f | 否，不能报实现 | Model observed Silent Royal Poison opening HP in continuous fights |
| 15ea09ad75a421d4bd65a820c187c8ee188186c8 | 否，不能报实现 | Model observed Silent Cunning Potion generation and hand capacity |
| 6403fdcdadc803a092beb5165a068e22bf51c412 | 是 | Model observed Silent Cunning Potion generation and hand capacity |
| 5c7105ff0294466da8319f2934beda05c6040794 | 是 | Model observed ordinary Strangle losses for Silent |
| 5604982e13890e0e2bc8bf8246272e8267321c0b | 是 | Log Silent A10 SL candidate resource comparisons |
| c769739b97389fdc978b6515b83a38e3cd900f67 | 是 | Record candidate comparisons for Silent SL replacements |
| 8b9bacbebb20eaaa1133a9945da6c7abfcda745d | 是 | Recompute observed Precise Cut damage at five and six hand cards |
| 995a345f935efd6d8ae9f67d16bd2653833344d0 | 是 | Extend Precise Cut to recorded Strength and hand pairs |
| 75a27fb2c230dc552761b2ad9da4be8a9a35dec3 | 是 | Model observed seven-card Precise Cut damage for Silent A10 |
| ec29ea34b919344b707e57ba472ea210f9c39d62 | 是 | Fix observed Silent Crusher facing rounding |
| a8b1f8be153fe4f3a34146117546c2178f2e446b | 是 | Integrate repaired legacy learning deltas and bounded continuation adapter |
| d06acd4bcbf2c64608197b7d7b2e572c621bec61 | 是 | Model observed Silent A10 Abrasive attributes |

13个提交核验中11个为实际live祖先。Cunning用6403fdcdadc803a092beb5165a068e22bf51c412、开场用e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a，不能把同名未部署原提交15ea09ad75a421d4bd65a820c187c8ee188186c8或fc7042d1df0626e9e726f4bc912d9c6f626d908f登记成live实现。普通紧勒用5c7105ff0294466da8319f2934beda05c6040794，SL资源/候选日志分别5604982e13890e0e2bc8bf8246272e8267321c0b、c769739b97389fdc978b6515b83a38e3cd900f67。普通磨蚀预览d06acd4bcbf2c64608197b7d7b2e572c621bec61已为祖先，但不含全部弃牌/升级机制。

十个消费者相关源码路径逐Git blob核对。四叶base/live blob有差异，保存各自diff并逐段核实仅已有Roy/Dai注释文字差异；没有冒称整叶SHA相同。读回直接调用实际live模块，禁止读取刷新knowledge文件，仅以已冻本角色原帧和同局run.deck/selection牌型构造输入。8项局部消费者通过：Q6紧勒23伤、WQ累计添2/2/2与3/5/5、TXZ五帧已观察新战开场成本4。保留“弃牌选择未确定”，不把三牌预测认作完整弃牌派发。没有完整战斗模拟、在线题面、LLM、网络或play。

## 逐项处置

详见本批proposal.md的十个完整小节，分别含证据局/层/回合、账本、原Markdown/SHA、反例、旧规则、缺数据、验证及回退。

- silent-proposal-08eaa60bcc449852：waiting；七次饮用、两次真实回复及赢战资源链已核；缺同资源同牌序的不饮用或留药到boss完整对照，不能校准持药价格。
- silent-proposal-92920295a648b540：waiting；三试资源链和首胜后开场死亡已核；缺固定后轮抽序及药栏的连续通关替线，不能修改SL资格或终局权重。
- silent-proposal-a327449c331efbc1：waiting；同盘血伤差额和沙坑续时已核；缺两条结束边界的完整受控后继及独立胜局，不能拟固定血伤交换阈值。
- silent-proposal-a099e89437e942bb：waiting；42饮容量与生成模型已有实际live子实现；计划妥当选择保留、完整穿插派发及SL恢复尚未联合验证，整项继续waiting。
- silent-proposal-47910f82a1fdd98f：waiting；无小血瓶开场扣4及连战资源接续已有live子实现；宽项仍缺SL血价、留药、路线预算的受控后继和未知回血/复活组合顺序。
- silent-proposal-f1374df72d8e6a25：waiting；Q6早喝线没有完整实打且1913营火条件改变；缺隔离机制误差、同预算完整后继及未用/早用/留药对照，不能改药价或终局权重。
- silent-proposal-38a49e6c97f31eea：waiting；普通无挡紧勒及普通磨蚀预览已有live子实现；多机制宽项仍缺弃牌触发、增益来源拆分与隔离误差后的联合完整消费者验证。
- silent-proposal-ef0e38a5dbd3bc07：waiting；实际休息、锻造与胜战损血链已核；缺另选营火、前序事件、早用药或换路线的完整受控结果，不能校准路线血价和能力终局权重。
- silent-proposal-7f820c02d39bfaea：waiting；多16净扣付6血且两敌均活、重复失败已核；预测比较已有live子实现，缺独立成对后继和同预算饱和排序校准，不能改探索门槛。
- silent-proposal-04b6b430759815ed：waiting；精确切击及蟹朝向子公式已有live；油灯缺可靠首次消费追踪、跨动作/新战/SL恢复及未见负面组合消费者验证，能力完整后继仍缺。

## 初稿、失败与验证边界

- 抽取初稿把状态局号误读为state.run.run_id，初始状态计数为0；实际字段为state.run_id。保留evidence-manifest.initial-no-state-id.json，修正后9815条来自原字节。
- 固定帧初稿误把282368/282369纳入WQ范围，实际已离该局；退出1和初稿保留。第二稿误把282354过渡重复帧当饮用结算，以及用K367目标index0核index1毒。保留两次失败日志/断言/稿件，最终使用实际耗瓶帧282355/282357及BOWLBUG_NECTAR index1，全部20检查通过。
- live消费者初稿的知识输入未携带牌型，旧手牌帧无card_type，导致模型将紧勒牌型记未知并得到19；没有修改生产源码。保留consumer-check.initial.txt/.log和diagnostic.log；从同局已观察run.deck/selection补齐牌型与物理来源后恢复23，最终8检查通过。此过程是核验工具修正，不是撤生产源码红绿测试。
- 两次shell预检遇到沙箱glob扫描的并行目录ENOENT，命令未执行；同权限重试读回成功，没有扩权或另读其它项目。一次资源展示在投影尚未完成时读到空组，未计成功检查；最终使用完成的投影并核63项资源检查。
- 本批未改源码，tsc/vitest/cases均null；未运行完整沙箱套件，撤源码失败/恢复通过不适用，没有测试成功、源码提交或eval版本声称。局部证据检查和消费者读回另存，不代整套测试或独立实盘收益。

## 账本与交接

只经根learner/ledger.py update追加by=learner:strategy-proposal的原条目追溯链接；不改claim、evidence、first_run、prior、status、version、effect，不将旧shipped经验退回proposed，不登记本批shipped。ledger-updates.jsonl与CLI回执保留。没有新结论，不新增经验或重复代码提案ID；code_proposals列出这十个既有CLI ID，implementation_domains为空。

运维交接路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-141302/learner/runs/20261014-141325-strategy-proposal/proposal.md。各原ID具体waiting原因供调度器按新局继续重派，原父要求和宽项保持未完成。无合入，不写上线decision-log/eval版本或规则双通知；不清理自身树与待证历史。最终git status干净，报告和材料在已忽略的本批learner/runs内。安全扫描与CLI读回结果另存final-verification.json。

材料索引：dispatch.json、assigned-proposals.json、assigned-ledger.json、run-identities.json、evidence-manifest.json、*.evidence.jsonl、fixed-frames.json、resource-frames.json、evidence-checks.json、resource-checks.json、cunning-drinks.json、ken-drinks.json、stream-byte-checks.json、source-ancestry.json、*.base-live.diff、card-types-provenance.json、consumer-check.json及失败稿/日志。
