# 本批策略学习回报

结果：10个派发提案逐项完成证据核验，均waiting；本批没有源码改动、源码提交、live合入、新行为版本或shipped登记。

基线：a77d86dff0b917dc731b99ac6bd2721b60100647。开工git status干净；普通批次git merge --no-edit main返回Already up to date；HEAD保持该提交。派发character/worktree/runs与本批一致，带proposal_ids，reason=proposal；未带research_request、implementation_request或proposal_repair，不适用纯研究专题/冻结实现绑定。普通专题文件属于其他batch，本批不承接。

派发十个锚点：KEN58SH9SLZ6、TXZ6RVMQA09D、WQZVENQ7DTRP、02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0。为处理其原提案证据，另核五个已链接silent局1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH、SADL3CGYTGSR，均先核runs.jsonl角色。总计只分析15个本角色局，不把SL尝试当独立局，不使用其他角色知识或预训练游戏事实。

逐项提案、局号/层/回合、账本、反例、预期行为、缺数据和回退见本目录proposal.md；原十份Markdown逐字保留为各id.original.txt，保存的SHA与专用队列一致。claimed-proposals.json、dispatch.json、ledger-before.json和linked-experience-before.json保留开工快照。

## 已核实盘与源码范围

原始记录冻结各文件读前长度；抓取9448决策、9815状态、78条SL尝试记录、77条本局计划，共19418条。每条保存来源行号、字节偏移、长度、SHA及原字节；verify_facts.py重新seek只读logs逐条读回并比SHA，全部一致。这里只核提案所需本角色窗口，未重做原105/109局路线统计或任何量化父研究。

九局42饮狡诈重新核为37×添3、2×添2、3×添0，基础6且升级；容量为零仍耗瓶，前后HP/能量/敌血不变。KEN七药、六赢战净损46和两次真实加上限回复均核；TXZ五个出牌前4血成本、首胜4血接后boss0血、T6少损3少伤9均核；WQ T9多15伤付9血与T7付4血延时、NHA T1多16净伤付6血均核。Q6紧勒23伤、现场力量/敏捷、精英胜后2血接走廊死，以及1913锻造不回血/实际F31入46均核。WQ/NHA六尝试的前五是predicted_death，不改写成已执行的死亡。

油灯17个直接窗口真实前后帧已按原ts读回，来自A1/A7/A10三局；stack与counter都为空。空计数器本身不证明永远不能实现，但当前证据没有覆盖首次吸收、前序负面、重规划和SL恢复的完整消费轨迹，不据局部放大数值假造可识别的状态。

live快照：83d43cc1ee9f66cbcd65d952db00ec8ad8ce1d96。狡诈实际祖先6403fdcdadc803a092beb5165a068e22bf51c412；紧勒5c7105ff0294466da8319f2934beda05c6040794；开场成本e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；SL资源预测5604982e13890e0e2bc8bf8246272e8267321c0b及后续a8b1f8be153fe4f3a34146117546c2178f2e446b；七手精确切击75a27fb2c230dc552761b2ad9da4be8a9a35dec3；限定蟹取整ec29ea34b919344b707e57ba472ea210f9c39d62及重放f2c7cc1a7288893bceae0f0b20304a2b1fae5f57。

15ea09ad75a421d4bd65a820c187c8ee188186c8与fc7042d1df0626e9e726f4bc912d9c6f626d908f不在此次live快照祖先；报告使用真实重放提交，不把源码名称相同冒当上线。所核base/live三份不等blob的完整差异保存在base-live-source-diff.patch，经字节核对仅Roy/Dai注释名差异；其他所列文件逐blob相同。不声明整个两树等价或继承其他批次测试。

## 验证、账本与未改动边界

24项固定证据核验通过，见fact-verification.json及verify-facts.log；这是原始数据、数学差额、身份/来源核验，不是生产源码测试。没有改代码，tsc/vitest/cases均null；未运行test-sandbox，不执行撤源码失败/恢复通过，不借历史测试宣称本批通过。未运行LLM、联网、play或重开对局。

仅通过根目录learner/ledger.py update将本批proposal/report路径追加到31个既有本角色账本，by=learner:strategy-proposal，不重写claim/evidence、不回填shipped、不降低原状态。输入和CLI回执保存在ledger-updates.jsonl及ledger-update.log；无新增源码或提案id，code_proposals只列原10个CLI id。

账本CLI实际退出0，31个id回执齐全。gitleaks 8.30.1对本批材料扫描约451.18MB，退出0、无泄露，见gitleaks.log与gitleaks-report.json。最后的物理账本补链、JSON逐项覆盖、报告路径、HEAD及干净工作树核验保存于final-verification.json。

铁甲及其他角色没有行为变化，知识/任务模板/执行源码保持基线；不新增eval版本、不双通知“规则已变”、不修改ops prompt，也不代ops/watcher/Roy确认。学习父要求保持开放，整战效果与自然采用未证。

## 保留的初稿和失败

初始队列路径猜测不存在、初始局部源码/测试路径定位错误保留为执行记录；随后以code_proposals.py声明的专用队列、rg文件清单定位。WQ历史抽取文件实际为行号:JSON，初次按普通JSON读取报Extra data，未用该解析结果作为结论。

上述原报错和纠正过程单独保存于execution-notes.txt；原始饮药解析脚本、日志及产物另存analysis-initial/。

首次饮药解析误用potion_index/potion_slot，得到零个可识别狡诈。初始脚本、日志和六份产物完整保存于analysis-initial/；核真实chosen.option_index后纠正，并加42饮/9局及逐瓶变更断言，最终产物与analyze-evidence-final.log为准。原初稿不覆盖，也不把这项审计错误当生产策略bug。

保留所有original.txt、源码副本.txt、原字节日志、SHA清单与初稿；最后核工作树干净，HEAD=base，fixes=[]，merged=null。

## 逐项处置

- silent-proposal-08eaa60bcc449852：waiting。缺KEN同入口不饮用、提前饮用或留到boss的完整后继对照；F15零损已花两药，不能由这局校准持有价或统一留药阈值。
- silent-proposal-92920295a648b540：waiting。缺同抽序和相同后续动作的连续通关对照；T6少损3也少伤9，首胜4血仍开场死，现有候选日志不足以验证新SL或终局权重。
- silent-proposal-a327449c331efbc1：waiting。缺保持后续抽序和动作受控的完整胜负链及独立后移验证；多15伤付9血、付4血延长沙坑均不能拟成固定交换阈值。
- silent-proposal-a099e89437e942bb：waiting。同轮生成与穿插已有实现；完整提案仍缺计划妥当主动保留选择的跨轮回放、复合饮药触发及完整后继验证，不能把同轮覆盖当整项完成。
- silent-proposal-47910f82a1fdd98f：waiting。已观察组合开场4血已有实现；缺未知回复/复活组合的中间相位以及留药、SL血价的完整后继对照，不能关闭资源/SL整包。
- silent-proposal-f1374df72d8e6a25：waiting。缺同入口早饮/留药及相同营火条件下的整战对照；1913预测后改锻造、Q6早喝候选未完整实打，不能调整高血护栏、持药价或终局权重。
- silent-proposal-38a49e6c97f31eea：waiting。普通紧勒子项已实现；整包仍缺致死轮逐击/反伤与复活中间帧、未观察叠层重放及阈值/SL组合的完整验证，不把机制子项等同整包上线。
- silent-proposal-ef0e38a5dbd3bc07：waiting。缺同入口换线、休息/锻造和用药的完整后继对照；实际条件改变与统计相关性不足以拟统一血价或证明改线因果。
- silent-proposal-7f820c02d39bfaea：waiting。缺同抽序受控完整后继、击杀/存活推进和独立胜负样本；多损6、多16净伤仍没杀一侧，不能设置SL固定血价门槛。
- silent-proposal-04b6b430759815ed：waiting。限定蟹取整和七手精确切击已有实现；油灯缺首次制品吸收/前序负面及重规划、SL恢复时可识别消费轨迹，能力兑现整包亦缺完整组合验证。

提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-050343-s2/learner/runs/20261013-050357-strategy-proposal/proposal.md

报告路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-050343-s2/learner/runs/20261013-050357-strategy-proposal/report.md
