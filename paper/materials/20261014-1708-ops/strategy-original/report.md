# 静默猎手策略提案核验报告

记录时间：2026-10-14 16:59:30 CST（写前已执行date）。批次：20261014-164302-s2-strategy-proposal。

十个已派原ID全部waiting。本批没有足够证据支持新增完整策略实现；保留现有行为。没有源码修改、提交、合入、行为发布或shipped登记。报告不关闭原宽提案、父学习请求，也不将经验发布当源码实现。

## 身份和基线

工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-164302-s2。base/当前HEAD：`f2e63a4085672b2948f6a7ff2c10b4da651da09a`，初始及最终git status干净；普通任务按要求git merge --no-edit main，结果Already up to date。根learn.json对应行task=strategy-proposal、character=silent、reason=proposal，精确领取本报告十ID；没有research_request/implementation_request/proposal_repair。旧手动专题的batch不匹配，没有读取它的work_spec或冻结输入。派发本批10锚点原样保留：GXNKW8X1XYJP, ZE8F192FKX24, 2PVLGRBGUX9S, DPYF2BAA3DKT, UMVLWER4CD98, VLZ6CCT8AQ0A, VN7RQJMJEFMX, YF0LXT1QSTGG, PD9AYQVMLQW6, L2TSFU62Z57Z。

另外只读取本十提案自有证据链接的11个局号，输入合计21局全部经runs.character核为SILENT，进阶分列：{1: 1, 5: 1, 6: 4, 7: 1, 8: 1, 10: 13}。这不是122局全历史复核，不将提案旧全历史分母继承为本批重新分析。角色身份材料见run-identities.json/proposal-run-identities.json；派发行见dispatch-identity.json。

## 冻结来源与可复核性

统一extract_evidence.py入口抽取8流。每流冻结source_size、每行原offset/bytes/SHA与正文，全部37,531行已重新seek原来源逐行核SHA、正文和明确身份，拒绝身份冲突；只用run、run_id/state.run_id/fingerprint.run，不用正文提及归属。evidence/evidence-manifest.json为原抽取结果，verified-evidence.json为复核结果。

| 流 | 已核行数 | source_size 字节 |
|---|---:|---:|
| states | 18429 | 12754253252 |
| decisions | 17804 | 1379831771 |
| sl-attempts | 155 | 39116213 |
| run-config | 21 | 1680904 |
| run-plans | 151 | 7717922 |
| brain | 950 | 505030729 |
| runs | 21 | 327918 |
| fight-plans | 0 | 2233957 |

fight-plans的0行只表示本次source_size与这21局选择未命中，不宣称原日志不存在。本批run-plans以真实run字段选出151行，没有使用旧零行报告，也没有覆盖旧截点或报告。

## 已核事实与反例

- 抑制：八原关联局11窗口基础ID全区数量守恒，包含A5/A6/A7/A10；逐局层/回合/前后原行、升级版本差及重复ID见dampen-windows.json。GXN F45四份SL的假inserted为BLADE_DANCE/OUTBREAK/SUCKER_PUNCH/ACCELERANT，clean=19/18/19/18；原draws.ts仍按含升级键整堆作差。前后跨轮并伴抽牌，同ID副本存在；无纯改标瞬时帧或副本唯一ID，守恒不足证明原抽序仍安全。
- PD9 F49末T10：逐帧挡8→18→19→31→32，凋萎2→3→3→3→2；选择只弃一张，完成后32挡、两张各12持牌伤，23显示敌击，3HP实际归零、敌250→244。24+23−32=15只是算术完整损血参考，实际归零只扣3，不记录实际多损11/12；正确单弃也不证明转胜。
- GXN赢战资源：F35/38/40为97→84→66→41，F42实补30，F44赢精英71→5仍耗66；不能把赢战视作免费资源。PD9 F48首boss58→10，F49入场10且不继承上一战毒雾/触媒；L2 F14胜战44→24仍耗20。
- 实际能力：GXN F33T3触媒2已建立，F45T3持普通触媒却未建立；战内普通刀刃现场3张而场外六张升级未丢失。L2 F6速度当步临敏5下一轮未列出；F14敏捷2/荆棘3，旧格挡与新能力分账。PD9 F35仪式9下已保存现场力量增长序列，仍不补未知覆甲减层或力量影响滚石结论。
- L2 F17末T6：现场阈值160，168→159后力量/横冲直撞消失；打击/侧步线预计7伤且侧步未建模，结束线0伤。三线各1200整场模拟均零胜，五轮死亡14/24与11/24；没有执行完整替线。T8实际一牌16伤后四牌BlockedByHook，尚余1能，17HP受17显示攻击归零，敌113；这不是还有能量即可多出牌的证据。

35项状态数字核验及T6候选/四次SL记录核对见fact-checks.json、fact-checks.log、selected-evidence.json和机制面板；均属材料核验，不是生产测试，不调LLM或网络。不调整游戏阈值、权重或药水时点。

## 实际源码与消费者读回

本次核实live快照：`c268cf3a5b1a299c2da52edeb5748ace5ea2a566`。source-audit.json保存21条相关叶的base/live源码SHA、首源commit及祖先核验；16叶逐字相同，5叶的实际差异均为注释Roy→Dai字节替换，原blob副本与.patch、source-comment-comparison.json保留。不凭首源祖先或相同blob关闭宽提案。

已存在的窄修复：普通单弃`bf423c173d3be348a4ad714e1d26516df619ff41`、单动作回执`fdaf787a372880b0438e73bcac7e6d2168b038ed`均核为实际live祖先，并核各自修改文件及当前消费者。它们分别只解决唯一可弃后继牌和一次动作回执，不覆盖原生成状态牌联合回放或候选完整执行。本批未重现旧批29文件merge冲突；waiting依据当前实证缺口，不沿用旧冲突借口。

现有learner/audit-selection.ts消费者以四局固定原输入实际运行，四次exit0；保留原行号、SHA、observed_ts和fingerprint。六条缺decision_id/observed_ts元数据独立记consumer-exclusions.json；消费者不能跨缺行建立因果。

| 局号 | 动作 | 片段 | 相邻后端点 | 整轮端点 | 未知轮 |
|---|---:|---:|---:|---:|---:|
| GXNKW8X1XYJP | 646 | 116 | 178 | 20 | 83 |
| PD9AYQVMLQW6 | 1015 | 149 | 457 | 69 | 99 |
| L2TSFU62Z57Z | 441 | 93 | 278 | 51 | 32 |
| VLZ6CCT8AQ0A | 699 | 99 | 77 | 10 | 97 |

合计2801动作、457片段、990相邻后端点、150整轮端点和311未知轮。完整候选结果全部null是消费者的认证边界，不声称实际没有执行候选。端点、净血变化和完整候选/因果分别留账；缺帧、不稳定实例身份、跨SL及重问不能强连。输入/输出/错误日志、consumer-exits.log及consumer-summary.json均保留。该离线读回不是在线持续候选ID、未选整场对照、自然采用或策略收益验证。

## 逐项处置

详见proposal.md的完整证据局/层/回合、账本、旧/新行为、反例、验证/重派条件。十ID逐项理由同result.json的proposal_results；本批无新提案ID、不领取其他队列、不改原提案正文或队列状态。

## 检查与记录

源码未变：tsc=null、vitest=null、cases=null；没有执行生产套件或撤源码/恢复测试，不报告成功或失败测试。merge=null，fixes=[]，新版本=null，源提交=null。材料与消费者核验不可替代源码自测或实盘提升。

辅助检查失败保留：TypeScript辅助scanner模块路径缺失exit1；首版注释前缀校验漏掉单行块注释exit1。后者定位四行均为/**...*/后只修材料正则，原base/live源码不变；最终五叶原diff与注释替换核过。详见source-comparison-failures.json。未安装依赖、未改变权限。

本批仅经根ledger.py update追加note/by/where追溯原账本，保持既有claim/status/version/first/evidence/prior；不倒改shipped经验状态，不新造源码提交。本批报告/proposal及CLI输入输出送运维核验后沿原调度保留waiting。无规则实际发布，不新增eval号或双规则上线通知。

报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-164302-s2/learner/runs/20261014-164320-strategy-proposal/report.md
提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-164302-s2/learner/runs/20261014-164320-strategy-proposal/proposal.md

最终读回：31条本批ledger CLI追加已逐物理offset/bytes/SHA读回，原claim/status/version/first_run/asc/prior未变，见ledger-readback.json。九条原护栏及四条SL撤回逐行核过；三条sl_explore.replay.overridden=false仍保留护栏，字段存在不等于覆盖，见guard-original-readback.json。交付文本及CLI输入的gitleaks扫描exit0、0发现；明确扫描范围见secret-scan-scope.json，不宣称扫描全部原始日志。

最终材料检查另保留两次失败：首护栏脚本误用字段存在判覆盖导致AssertionError，紧接索引生成因guard文件尚未写出导致FileNotFoundError；修正为读显式覆盖与原/替线差异后通过，没有改原日志或源码。完整辅助失败见material-check-failures.json，不当生产测试失败。
