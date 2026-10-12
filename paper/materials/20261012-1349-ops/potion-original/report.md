# 静默猎手策略实现回报

本批已提交一个有限子项，未合入live。源码：c4670f4f416c7d93e192e889c5080e7e4e0e733f。基线：c425b7b7b36f4a7ca1532ca62a6b8dd7d1da2216。本工作树干净，原始失败及验证材料均保留。

## 身份与范围

普通strategy-proposal批次20261012-131301-s2-strategy-proposal，角色silent，派发六局：751FN9QM9MHQ, KV0JHNJCKXLS, YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN, KEN58SH9SLZ6。本批仅处理领取的十个ID，没有research_request/implementation_request；专题请求绑定其他批次，因此未扩展选题。开始git status干净，git merge --no-edit main已是最新。

## 有限实现与证据

本批补齐silent-proposal-85929bdfc8a3fc1b、silent-proposal-131042659448ae74中“未知持有价值＋同题无药参考”的展示子项。原账本silent-0019，新增限定账本silent-0431，CLI状态proposed。未新建重复代码提案ID，十个父项都不标implemented/duplicate/shipped。

依据751FN9QM9MHQ A10 F13 T3，decisions272361/272362、states278402—278407：原题饮药plan2预测损8/伤26；plan3本轮不喝预测损8/伤16，后续7/8样本仍喝；plan5才是模拟整场无药参考，8/8样本在5轮内结束、平均2.9轮。实际饮用分支HP58→50，不能代填未实打无药或保留到boss的收益。

旧行为只有成本0和缺表文案、holdHp=null未独立对照。新行为仅静默A10、成本策略开启且有未知持有价时，在真实Jev及v1题面追加potion_value_reference：未知hold_hp/null与计费值/原因分列，以现有选项键列当轮预测及已有抽样，区分本轮不饮用和整场无药参考。时钟/缺推演/降级不写假抽样胜负；已知零价不误标未知。未新增模拟、游戏门槛或权重，原选项、排名、护栏和动作保持。其他角色与未观察进阶已验证题面等价。

完整提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-131301-s2/learner/runs/20261012-131314-strategy-proposal/proposal.md。详细源证据、反例、时间切分、预期与回退均在该文件；本批不宣称提高胜率或证明留药必胜。

## 验证

- 原始日志冻结：6条runs、4071决策、4167状态、43条SL，均本角色A10，决策数与runs一致；按字节偏移重读8287行SHA全部一致。
- 五组同指纹对照复核：751 T2损13→18/扣敌9→18，T7损13→23/扣敌12→18；KV T5损0→0/扣敌36→29；KEN T10损15→21/扣敌2→4，T5损7→5/扣敌1→2。观测区间含续问续步，不冒作完整候选归因。
- KEN七次与751一次实际饮用、YQL末T10毒2→8且HP26/挡13/自爆41不变均有原帧。三个静默局的巨兽战合17次尝试另存phase-audit.json；未将相关SL当独立局。
- 六局离线消费者共861候选段，完整候选收益仍为null。首次遇六条无动作身份路线注记拒绝，原失败保留；后续只排除无chosen的map/route-change注记，保留原始行号与缺口，不伪造ID或跨缺口结算。该复核不是新增生产代码。
- 撤回combat-plan消费入口：12项中2项真实消费者失败、10项通过，exit1；恢复：12项通过、exit0。
- 提交前执行原bash tools/test-sandbox.sh：tsc成功；主池334文件3337项通过，paths另1文件11项通过，共335文件3348项，exit0。首轮成功、未超时重跑；主池耗时1021.88秒。固定排除名单未修改，宿主完整套件尚未执行。
- gitleaks阶段扫描72756字节、无泄漏、exit0；git diff --check通过。

## 合入受阻

在ops/live-merge.lock中执行知识刷新检查与三方预检。取得锁时live已为05a9d85fb3e11d5100d658094df83c1bda649f7d；知识刷新已由并行流程提交，本批git add后的索引无新差异，因此没有制造Refresh knowledge data提交。两处既有脏notes保持。

三方预检exit1，集成脚本exit20，以下9路径冲突；combat-plan源码自动合并没有冲突。按任务要求停止，未实际git merge，也未重放或自行解决共享记录冲突：

- eval/versions.json
- notes/fix-queue-v4.md
- notes/for-roy.md
- ops/inbox-dev.md
- paper/materials/decision-log.md
- paper/materials/experience-changelog-silent.md
- paper/materials/learning/ledger.jsonl
- paper/materials/silent/20261010-224307-boss-calibration-closeout/host-completion.json
- paper/materials/silent/20261010-224307-boss-calibration-closeout/host-request.log

报告时live为05a9d85fb3e11d5100d658094df83c1bda649f7d，源码c4670f4f416c7d93e192e889c5080e7e4e0e733f不是其祖先。merged=null、version=null，未跑合后测试、未发布eval版本、未发已上线双通知、未标shipped。需要运维按保留的源码和回执兜底；不能将本批自测当live验收。

## 十项处置

- silent-proposal-366288801d9150d9：waiting。751 F17 T2多9伤付5血、T7多6伤付10血已逐帧复核；已有预测/派发源码为live祖先，但未决弃牌、续步及整轮候选收益仍未认证。缺同随机输入完整后继与独立局验证，不拟SL准入门槛。
- silent-proposal-85929bdfc8a3fc1b：waiting。本批实现缺失持有价值及同题无药参考的展示子项；父项还缺未决弃呼唤的确定/保守损血联合拆项及无药或留药完整后继，不能据F13饮用分支确定跨战价值。 本子项源码c4670f4f416c7d93e192e889c5080e7e4e0e733f自测通过，但live三方预检有9处记录/位置冲突，尚未上线。
- silent-proposal-efd9f83ee9e1a6dc：waiting。与366共享的5/10血配对成立，原同源提案SHA一致；已有局部审计不覆盖完整执行归属和受控胜率，保留父项，不能整体标duplicate。
- silent-proposal-131042659448ae74：waiting。本批实现未知持有价子项；逐张敏捷、毒/荆棘限伤、呼唤及药价的联合消费者认证仍未齐，缺同题不饮用整战结果，未更改护栏或药价。 本子项源码c4670f4f416c7d93e192e889c5080e7e4e0e733f自测通过，但live三方预检有9处记录/位置冲突，尚未上线。
- silent-proposal-990f054036609447：waiting。KV F33第4/5试T5同指纹，实测净扣36/29且当轮均零损；后续毒量及敌回血不能由候选分数认证完整执行。缺保毒/删毒同抽序受控后继，不设探索或路线门槛。
- silent-proposal-e18d3f18e6cac2a0：waiting。YQL六试占位阶段/50、50、47、50、50、41自爆与L9/PU历史引用已核。阶段日志部分已上线，末T10毒2→8而HP26/挡13/自爆41不变；缺阶段药水展示的联合验证及改变SL排序的完整受控结果。
- silent-proposal-9733bb80f445aeae：waiting。与e18同源但父范围仍含巨兽阶段药水和参考排序；通用未知持有价说明不证明本体/残壳药效或跨阶段收益，缺提前用/不喝/保留完整对照，不能整体关闭。
- silent-proposal-c51468c5e8ba6668：waiting。KEN七次实际饮用与F17空栏入口已核；发光水重问、技能药选择后完整方案归属仍未认证。缺F15不饮用或保留至boss的完整后继，不能拟持有价。
- silent-proposal-86a7db08d1a31976：waiting。KEN第4/5试T10同指纹，多2实伤付6血；第4/6试T5省2血但步法延后，追加小刀单列。缺能力窗口与完整后继联合认证，不以当轮血差重写SL/HP护栏阈值。
- silent-proposal-e282a9131b99129a：waiting。与86共享反例与资源差已核；预测、派发、离线观测为不同证据层，尚无完整候选收益或独立局受控胜线，不把六次相关SL当六局拟合。

## 交接与回退

运维入口为本目录proposal.md、report.json与verification.json。源码只含两个源码文件及固定测试/原帧夹具，提交可独立审查；限定账本silent-0431待实际上线后由运维核实shipped，父提案仍需各自缺失数据。回退本独立源码提交可恢复旧题面，保留原经验、提案与失败记录。此次未改知识、运维prompt，未运行play、安装依赖、联网或推送。
