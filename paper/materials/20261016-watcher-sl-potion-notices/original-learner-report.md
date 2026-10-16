# SL与药水接续：限定结论、实际入库与交付边界

请求：roy-20261016-sl-potion-retry/revision1；本次调度batch=20261016-222815-strategy-proposal；原batch=20261016-214302-strategy-proposal，原线程/原WT不变。输入SHA=ab37a615be5f146a61c9c4943db0fba9596d8d15325da27102d43f64d6f3bee1，manifest SHA=3f006f6af62dcaca1ec34d6b1eb5273e7c62c50344c2bb74202ffd23dc39a777；原请求/两冻结文件与所有指定支持文件的bytes/SHA通过。原日志1812555字节前缀SHA及线程绑定核实。原report/proposal/result及其19929行旧材料保持，没有重跑旧核验或全历史抽取。

本轮base=59bab95ae7b62682793961bb4b7f643b7fbcc5d2；开工干净，安全快进main仅记录，无新源码。原工作树及live经验前像完整SHA均63a5fe9cb59d554155b8e30d885ab65077f66a3d8401f07fb20c1c6258fa7b9d。没有接0332根修复、watcher联合shadow、其他专题/角色或新观察器。

**结论：已实际发布两条经验的限定更新，outcome=questioned；通知角色确认、正式核号及原因果问题未关闭。**

## 观察、方法与反证

原17:15:44截点/49局/98个run-floor/212尝试保持；原114个重试CSV投影复算药事件不同19/58→7/56、F48 7/17→1/20、F49 2/17→0/20，未改原数。F48首试未完成后救回前后均2/5，整体11/19→3/16；不同对手/版本/资源及W1YY未知来源、HLAW混合身份的原敏感性保留，不认证新的自然分母，不作开关因果估计。

复用已校验SHA的两原lean索引，只为六例局F48/F49读取47条SL、94个边界、47次use_potion与其前后观察，共319条原行。逐offset/len/SHA/JSON/显式身份核，并先核六局runs.jsonl均Silent A10。47次实际动作回执均completed，药前占槽/can_use=true，随后同槽均空；没有将成功dispatch次数当初始瓶数。12项固定材料检查全部通过，不是生产源码测试。证据包selected-raw-evidence.jsonl.gz、raw-source-index.json、selected-sl-observations.json、potion-actions-and-slots.json、selected-boundary-states.json、finding-checks.json可复核；不读取游戏二进制或其他角色私有知识。

1. **粗药事件不是同轮时点。** VNSXWCWXR3VW F49六试实际肌肉T1、速度T2；速度前动作数4/3/1/1/2/1。首试T2药前2血、0能、10挡，饮后敏1→6、旧挡仍10，下一观察已T3、没有药敏；其余试有可支付格挡后继，第2/5试后空翻+使13→27，第3/4/6试后空翻使0→11。只能确认已兑现的时点，不能把所有11/14挡归药；入轮HP、抽牌/牌序亦变，六试全败。原报告“两药T1”与CSV/原动作冲突，原稿不覆写，交原watcher追加勘误。
2. **机会分母要条件化。** 后段F49二十重试来自四场；9KP/RQ各五次、共十次是3/4血空药入口，TCD另五次仅石头，VNS另五次有肌肉/速度。空栏指已观察入口/动作窗口，不穷尽未观察生成牌或其他牌序下未来新药机会。不能把二十个SL相关尝试当独立可换药机会，不能把无药序列直接认作拒绝留药。
3. **确有改时，但未证收益。** TCD F48第二试铁心T1/石头T2，其他试石头T1；第二试仍败，第五试胜仅6血，F49最终败。其他牌线共同变化，无隔离药时的胜负对照。DHY/JWK F48各六试都T1毒、后续牌线已变仍败；未执行改药时或保留药水的整战胜负未知。
4. **前战留药与后战资源要一起验。** 9KP第四次过F48只剩3血、RQ首试过剩4血，后战均空栏六败。没有证明不喝仍能过F48的实打。TCD/VNS在F48已饮过的名称在F49重新见到槽位，不可据名称把已喝回填成保留同一瓶；新出现、槽位变化、实际消费与SL恢复分列，具体产生来源未控。原动作前后/下一尝试边界分别保存。

原建议只是观察线索。我的不同意见针对把粗事件率外推成药时不变/机会分母或退化原因，并非否认值得在有合法后继时比较早/晚/留药候选；当前证据不能认定哪种时机提高连续通关率。未设自由参数、药价、血线、必死/SL或300样本新阈值，没有A/B、模拟、LLM/API、play或重启。

## 经验、账本与代码提案

- 新增silent-sl-potion-retry-opportunity，A10、med、四独立支持局/零机制反例；只作上述条件化限定，不把六试当六局。
- 更新silent-speed-potion-temporary-dexterity，保旧证据/机制，追加VNS一局至58支持；新增案例明确A10，不扩未观察组合。
- 原237条中236条逐对象保持；只一更新/一新增，版本2026-10-16.4。knowledge-validation.json及experience-change.json保存前后SHA与规范条目SHA。
- 根ledger CLI实际新增silent-0498为proposed，0253仅补支持/出处、保原claim/首证/先验/shipped/版本；再补源/live提交追溯。共6条本批CLI行逐物理offset/len/SHA核，未由学习者写shipped。
- 专用CLI注册silent-proposal-4e4385b2f64bd66e，明确本阶段source_task=experience-update、实现任务strategy-proposal；对应两条经验，check-experience退出0、missing=[]。这是一项限定数据发布，不重复原四宽提案的未完成整战验证。原四处置仍waiting，详见result.json。

## 实际发布与消费者

源提交：4f501afaf8059c3355dade9aeeac2c910fd12fad（仅knowledge/characters/silent/experience.json）。gitleaks该文件退出0；只有数据变化，未跑/未冒称tsc或vitest。源码撤下失败/恢复通过不适用于本轮数据改动。

整分支merge-tree预检有主树/live既有历史冲突（含知识/记录）。未执行广合或处理无关冲突。持原live-merge.lock，核刷新无dirty知识、live经验前像与源父逐字节相同、单文件patch可应用；仅摘取该提交为**实际live源码数据提交e17dfa544e771f4783789930073124cb3fe5b4be**，其他历史不引入。live整个agent树不变、并行notes/fight-value-backtest-silent.md与notes/monster-db-check.md原SHA保持。实际源祖先验证通过；原源4f501并非live祖先，不能冒充merged，回报用真实摘取提交e17dfa。

live记录提交de15b91314349db7149edd61da6ebe674daae5ef。decision-log与eval/versions.json已追加alias=V5.silent-sl-potion-retry-knowledge1；正式release_id由原ops在同锁核实际祖先后统一分配，本学习者没有自编号。

工作树消费者与live消费者各实际运行原loadExperience/loadKnowledgeData/renderExperience：两条规范条目SHA、完整lesson文本及VNS证据均读回；新条目A10入选/A9排除，按路径核角色隔离而不读取铁甲私有经验。完整全经验文本输出真实保存；探针不载入复盘正文。live exit0，真实consumer-receipt.json的证据数组绑定探针、实际经验输入、命令、stdout、JSON和渲染全文。仅证明读取/可适用，不证明自然采用或胜率改善。

固定消费者回执：{'path': '.worktrees/codex-strategy-silent-20261016-214302/learner/runs/20261016-214316-da6093a8-8cdb-4e1a-a90a-266ad732d7d1-strategy-proposal/sl-potion-retry-r1/consumer-receipt.json', 'sha256': '7983ddfa2e44051d958f0a36eed2d73169425f7a4f7bee227999a36920fe3f22'}。

## 三项验收与交付状态

|要求|实际结果|未完边界|
|---|---|---|
|sl-potion-retry-observation-and-counterevidence|冻结计数与六局319原行、12材料检查；两项异议明确|原早/晚/留药受控整战因果未知|
|sl-potion-retry-condition-qualified-knowledge|两条真实live经验，规范SHA见coverage|不把限定观察升格药价/SL规则|
|sl-potion-retry-live-consumer-and-delivery|live固定消费者exit0、根双收件箱实际写入|正式核号/ops核shipped及ops→watcher→Roy本人交付ACK未完成，coverage此项留空|

questions.json保存原观点、不同发现、原件、已有经验ID与建议。已在根notes/for-roy.md、ops/inbox-dev.md各实际追加3794字节同文，offset/bytes/SHA读回见inbox-write-receipt.json；仅收件箱写入，不是ops模型已读、watcher收到或Roy已知，未修改请求注册、调度状态或通知确认。由本次完成事件沿原原生线程进入ops→watcher→Roy，学习者不代填ACK。

回退仅撤新条目及速度本次VNS追加/一新支持，保旧57局和并行知识；若实际回退须原锁另记行为回退版本，不整树重置。旧四宽提案、0332/G1a/量化父及自然消费者/收益保持，不把报告/经验读回当父完成。

## 失败与操作历史

保留第一次消费者启动ERR_MODULE_NOT_FOUND：从仓库根用包名tsx解析失败；改用现有agent/node_modules/tsx/dist/loader.mjs绝对路径后，探针实际运行通过，未安装依赖。第一次merge-tree把工作树路径/HEAD当revision失败，随后用真实live提交预检，得到既有历史冲突；没有实际广合。第一次双通知前置检查误把ledger CLI输出当逐行id（真实为空白分隔），断言在任何收件箱写入前失败；改空白分词后两箱实际追加，未重放账本。上述失败不当生产源码测试失败、未覆盖旧原件。

本次没有新科学证据证明改药可解释救回下降。outcome=questioned的具体原因：已发布限定经验并有真实live固定消费者；原粗事件不能判定真实用药时点/机会，VNS冻结报告有T1/T2笔误。缺同入口同后继的早/晚/留药受控整战，不能判断是否造成救回下降；正式release_id、ops核shipped及ops→watcher→Roy独立交付确认仍待原链，未关闭父要求。

最终只读核对：其后原ops另行集成F48 joint shadow至live9f34d3851244212c735b8bdfae7849a746332f16（其他owner事项，本学习者未参与）。本数据e17dfa仍是祖先，两条经验规范SHA和2026-10-16.4不变；原消费者四个直接源码叶SHA仍一致、回执所有证据SHA及双收件箱原追加字节再次通过。正式版本alias仍awaiting-primary-ops-numbering，无registry条目，不擅自编号或把其他owner新树当本轮源码自测。
