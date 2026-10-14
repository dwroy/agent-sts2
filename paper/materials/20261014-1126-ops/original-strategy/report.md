# 静默猎手策略提案批次回报

本批 `codex-strategy-silent-20261014-104302-s2` / `20261014-104302-s2-strategy-proposal`。本次提交一项有证据的模型子项；10个原提案的宽范围全部保留waiting。live合入预检受17个记录/论文数据冲突阻塞，未启动merge；没有行为版本、shipped、经验入库或自然对局采用声明。

## 身份与基线

- 工作树开工干净，派发时HEAD：`31bddcc5fa17f56331238ca95f0e99dbc1ec7484`。
- 根learn.json本批task=strategy-proposal、character=silent、reason=proposal、原10 proposal_ids及worktree匹配；无research_request/implementation_request/proposal_repair。普通专题检查只核notes/strategy-research-silent.json，绑定为另一旧批，故不承接专题。按普通任务git merge --no-edit main成功快进，真实工作基线 `e1a5917174ea62adbba6c3d5ce82014a7dd507f4`。
- 最终源码HEAD `7ec8096e441313fc50ab669cde512e3781a194f5`，源码和测试已独立提交；scratch由既有忽略规则保留，git status --short为空。
- 实际启动command/native stderr核为Codex gpt-6.1-sol；宿主启动参数xhigh，与本题正文high不同，未自改原会话或降模型。记录见launch-model-readback.json，不把默认配置当实际模型。未启动下级agent、play、模型调用、网络或游戏二进制读取。

## 原始证据与消费者

三局runs.jsonl逐局为SILENT A10；历史运行代码分别047c809e+dirty、ceb74207+dirty、a73ce7cc+dirty，完整原源码未知。逐原字节冻结并重新seek核SHA共2997行：1521 states、1456 decisions、14 SL记录，以及各3条runs/run-config。源offset/bytes/SHA见source-manifest.json和source-byte-verification.json；原10 Markdown SHA均匹配，不覆盖原文。

| 局号 | 状态/原决策 | 审计题段 | 可见相邻区间 | 整轮可核端点/总窗口 |
|---|---:|---:|---:|---:|
| MTQ0EUBJ3R6T | 440/424 | 68 | 156 | 25/75 |
| 7X0W3U8TVA2A | 461/445 | 119 | 36 | 7/71 |
| KFRDELW2TH2P | 620/587 | 180 | 224 | 18/103 |

KFR原decisions282561为map/route-change元数据、没有decision_id，完整原输入保留；单独登记input-exclusions.json后消费者用586行，原行号不重排，不跨缺行连后端点。最终观察1455动作、367题段、416可见区间、50可核整轮端点；其余区间/整轮按原消费者保留未知，完整候选认证全部null。这不是执行未发生或零收益的证明。

25项证据断言通过（evidence-checks.json）；三局既有audit-selection消费者运行退出0，但该读回不计作本批源码测试。12个既有子项源码逐实际live祖先核实，11叶与当前基线一致；rollout-live叶差异保留，不泛称全树等价。handTrickSlothFacts从本局六个F33T7选牌帧读回名额/能量事实，observedDemonPoison从289536读回6；新增modelHandCard从三个蛇咬实打帧均读回8。完整奇巧后继continuation_verified=false仍保留。

## 本次实现及反例

原代码提案 `silent-proposal-763a4b9d9f17b815`，账本silent-0087；来源experience-update/20261008-053105-experience-update，本批独立实现strategy-proposal。沿用Roy-2026-10-07-learning授权，未新增重复提案ID或改原提案文字。

7X0W3U8TVA2A F30T3 states288388→288389（d281940）：普通蛇咬动态变量base/enchanted7、current8，毒10→18、敌HP68不变、能量2→0。F31T1 states288404→288405（d281955）：前段毒0→8、HP50不变、能量5→3。F31T13 states288469→288470（d282020）：前段毒0→8、HP12不变、能量2→0。现场持有SNECKO_SKULL。一个相关局的三次施放，不当三局独立收益样本。

旧模型只接受普通7及已有升级10预览，把普通current8留为unknown/flatValue7。新分支仅接受silent A10、普通2费、AnyEnemy、固定星费/文本和单一动态变量指纹；直接消费现场8，不再加头骨1，不从base7推未知未来8。原7/10、其他角色/等级、免费/重放/未知附魔/不同文本与神化修饰升级边界保持。修改文件：agent/src/reflex/card-model.ts及两固定测试文件。提交 `7ec8096e441313fc50ab669cde512e3781a194f5`（全局Git身份、Co-Authored-By Codex gpt-6.1-sol）。

反例：施毒当步均未扣敌本体；F31T13玩家1血/14挡仍败，不能把这8毒当胜利或更安全。固定求解器测试隔离一次结算只验证预览进入modelHandCard→replaySteps，不冒充历史完整轮或整战收益。未调整护栏、药水持有价、SL探索权重、必死阈值或终局规则。铁甲分支不进入新增模型；固定边界回归保持先前unknown/flatValue7。

## 其他提案的支持、反例及待办

MTQ F23T3原线损0/净扣13，SL替线损8/净扣19，两线后续均失败；不能拟新权重。MTQ F11T1原回答plan6预计14损/14伤、护栏plan1预计6损/16伤；d282139弃连续反弹，d282140重问迷雾，完整轮67→61、敌90→70。20净扣不能归原plan1或当求解器单卡误差。KFR F12T1护栏完整0损线生成小刀后d282579重问，原完整候选未实打。KFR F33T6两试同15HP、228敌HP、36毒/3覆甲，实际损6/12、净扣83/93，后继均败，不用敌余血更低证明胜率改善。

7X F31初始三段总150，连续原帧另见HP增加175、可见HP下降下界278，末残47；不把局部暂死清零当整战获胜。MTQ F19入59→46、F20入46→8，开场各+2另账，F24未到；KFR F30入65→27、F31入27→15，幕间22→60补38，SL恢复独立。资源链用原started_at/attempt分界重算，未将SL恢复归路线回血。未观察替路线、休息/锻造完整受控结局。

| 原派发ID | 处置 | 具体剩余范围 |
|---|---|---|
| silent-proposal-0802f69b28d25079 | waiting | MTQ F23T3同盘多6即时净扣/多损8已核；四试整战执行归属、受控成对完整赢线及独立留出不足，不能拟合新SL权重或药水门槛。 |
| silent-proposal-f54e8de2381c1250 | waiting | MTQ F11T1候选14/6损、14/16伤已核；弃连续反弹后重问迷雾，实际20净扣不能归原plan1，缺完整候选认证与实线可比排名。 |
| silent-proposal-763a4b9d9f17b815 | waiting | 普通8毒蛇咬子项已提交7ec8096e4，自测通过；live预检17个记录/论文数据冲突、未合入。十四机制联合消费者/头骨药水边界仍未完整验收。 |
| silent-proposal-19a5cff2094e2d8f | waiting | 7X F31暂死/重接与MTQ全败探索分别可观测；缺修正模拟输入到完整实际终局的受控回放及反事实，全败样本不能证明实盘必死。 |
| silent-proposal-3540bf4360bf80af | waiting | MTQ F19/F20赢战耗血、F24未达以及7X资源转移已核；缺回血/药水/SL逐源进入路线与休息的全消费者读回及可比改线结果。 |
| silent-proposal-0ea5c0b9c030fdd6 | waiting | KFR奇巧名额/能量事实及窄毒药6子项已有；完整后继明确未验证，缺换目标合法序列到实际收益兑现及提前饮用整战对照。 |
| silent-proposal-f915ec544ab94b6e | waiting | KFR F12生成小刀即重问，完整护栏线未实打；F33同盘多10伤多损6、两线仍败，缺完整绑定/同条件整战校准。 |
| silent-proposal-8fb51933639faf90 | waiting | KFR窄毒药6已覆盖，旧仅双boss限制不沿用；七项能力/药效联合消费者、覆甲完整减层触发及未知修饰条件仍缺隔离验证。 |
| silent-proposal-b3bc0eb09211af6c | waiting | KFR合法奇巧后继到真实终结的全链、替对象/提前饮毒/完整护栏替线整战反事实缺失；不由敌余血更少拟合终局权重。 |
| silent-proposal-fdc3a505fe5e1a55 | waiting | KFR赢战血价/幕间回复与SL恢复分源；缺路线/休息题面逐源消费者读回及可比休息/锻造/替路线整战结果。 |

每项原关联账本、证据层/回合、原文路径/SHA、拟议行为/验证/回退详proposal.md；没有忽略其他派发ID。联合机制、覆甲完整减层触发、未知修饰组合、完整候选归属和整战反事实仍未验证；已有局部源码不等同整包duplicate。等待新数据或运维按原ID接续消费者/合入，原父要求不关闭。

## 撤码、恢复、完整检查与扫描

- 撤回新增源码分支，保持固定测试：1文件4失败/3通过、exit1（fixed-withdrawn.log）。恢复并连既有普通/神化蛇咬测试：3文件18通过、exit0（fixed-restored-final.log）。新增文件本身7例通过。
- 首轮bash tools/test-sandbox.sh：tsc0，383文件3799例+paths 1文件11例，全入口exit0；TMPDIR误拼至agent/learner下，节点编译缓存已完整移回scratch/first-sandbox-temporaries，原日志保留，未把路径错误当代码失败。
- 使用指定绝对TMPDIR重跑同入口：tsc0，383文件3799例+paths 1文件11例，共384文件3810例、exit0（sandbox-corrected.log；317.03秒+2.00秒）。不声称已跑沙箱外排除项或宿主完整套件。
- 代码提交前gitleaks选定完整源码/测试/夹具/提案扫描exit0；git diff --check通过。root账本CLI check：468条、0问题。
- scratch只读扫描曾误把combat=null当对象，消费者脚本初稿import多一级，及测试文件名/双路径git diff错误均保留诊断/初稿并恢复；这些不是生产源码失败，不冒称撤码反证。资源辅助初稿start_ts已改实际started_at，保留初稿/原输出并重算。

## live预检与交运维

flock ops/live-merge.lock中先等知识构建器，live起点 `980a0bc1f16871d2f9a8904753b768e31bdec46f`；按指定路径提交刷新，仅knowledge/characters/silent/fight-value-gates.json一叶，Refresh knowledge data=`cf683f1dba35fd8bb5f664ab86d3d241e3d93bbd`。该刷新提交的扫描在提交后补核，exit0（gitleaks-refresh-after.log），不冒称其提交前扫描；源码补丁的提交前扫描确实已完成。两项原脏notes/fight-value-backtest-silent.md、notes/monster-db-check.md保留。

git merge-tree --write-tree --messages HEAD 7ec8096e441313fc50ab669cde512e3781a194f5 exit1：17个记录/论文文件冲突，源码card-model自动合并，无源码冲突；完整路径见merge-conflicts.json。预检后停止，merge_started=false，无MERGE_HEAD、未运行合入后测试或回退。live保留刷新后的 `cf683f1dba35fd8bb5f664ab86d3d241e3d93bbd`，补丁不是live祖先；merged=null、发布号null，无eval版本或实际上线通知，不登记implemented/duplicate/shipped。

运维接续材料：本报告、proposal.md、三个源码/测试叶及 `7ec8096e441313fc50ab669cde512e3781a194f5`、固定红绿/完整沙箱日志、merge-preflight.log/receipt及17冲突列表。须保留并行记录/刷新，实际合入与后验通过后再登记版本/通知及相应账本；本批不整枝覆盖冲突。8毒子项实际合入后仍不能关闭原十四项宽提案。

只经根learner/ledger.py update追加31条本角色原账本链接/备注，0087另附三次实帧支持及提交链接；旧claim/status/version/首证/历史保持，未把旧机制shipped当本补丁已发布。原物理CLI行与SHA见ledger-cli-rows.jsonl/ledger-cli-receipt.json。未手改队列、旧父请求或历史复盘。

## 最终机器回报

result.json与下列内容一致；report为本批scratch真实绝对路径。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261014-104302-s2-strategy-proposal",
  "base": "e1a5917174ea62adbba6c3d5ce82014a7dd507f4",
  "runs": [
    "MTQ0EUBJ3R6T",
    "7X0W3U8TVA2A",
    "KFRDELW2TH2P"
  ],
  "fixes": [
    {
      "proposal_id": "silent-proposal-763a4b9d9f17b815",
      "scope": "静默A10普通蛇咬已观察8毒预览子项",
      "commit": "7ec8096e441313fc50ab669cde512e3781a194f5",
      "live": false
    }
  ],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3810
  },
  "code_proposals": [
    "silent-proposal-0802f69b28d25079",
    "silent-proposal-f54e8de2381c1250",
    "silent-proposal-763a4b9d9f17b815",
    "silent-proposal-19a5cff2094e2d8f",
    "silent-proposal-3540bf4360bf80af",
    "silent-proposal-0ea5c0b9c030fdd6",
    "silent-proposal-f915ec544ab94b6e",
    "silent-proposal-8fb51933639faf90",
    "silent-proposal-b3bc0eb09211af6c",
    "silent-proposal-fdc3a505fe5e1a55"
  ],
  "implementation_domains": [
    "combat"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-0802f69b28d25079",
      "state": "waiting",
      "reason": "MTQ F23T3同盘多6即时净扣/多损8已核；四试整战执行归属、受控成对完整赢线及独立留出不足，不能拟合新SL权重或药水门槛。"
    },
    {
      "id": "silent-proposal-f54e8de2381c1250",
      "state": "waiting",
      "reason": "MTQ F11T1候选14/6损、14/16伤已核；弃连续反弹后重问迷雾，实际20净扣不能归原plan1，缺完整候选认证与实线可比排名。"
    },
    {
      "id": "silent-proposal-763a4b9d9f17b815",
      "state": "waiting",
      "reason": "普通8毒蛇咬子项已提交7ec8096e4，自测通过；live预检17个记录/论文数据冲突、未合入。十四机制联合消费者/头骨药水边界仍未完整验收。"
    },
    {
      "id": "silent-proposal-19a5cff2094e2d8f",
      "state": "waiting",
      "reason": "7X F31暂死/重接与MTQ全败探索分别可观测；缺修正模拟输入到完整实际终局的受控回放及反事实，全败样本不能证明实盘必死。"
    },
    {
      "id": "silent-proposal-3540bf4360bf80af",
      "state": "waiting",
      "reason": "MTQ F19/F20赢战耗血、F24未达以及7X资源转移已核；缺回血/药水/SL逐源进入路线与休息的全消费者读回及可比改线结果。"
    },
    {
      "id": "silent-proposal-0ea5c0b9c030fdd6",
      "state": "waiting",
      "reason": "KFR奇巧名额/能量事实及窄毒药6子项已有；完整后继明确未验证，缺换目标合法序列到实际收益兑现及提前饮用整战对照。"
    },
    {
      "id": "silent-proposal-f915ec544ab94b6e",
      "state": "waiting",
      "reason": "KFR F12生成小刀即重问，完整护栏线未实打；F33同盘多10伤多损6、两线仍败，缺完整绑定/同条件整战校准。"
    },
    {
      "id": "silent-proposal-8fb51933639faf90",
      "state": "waiting",
      "reason": "KFR窄毒药6已覆盖，旧仅双boss限制不沿用；七项能力/药效联合消费者、覆甲完整减层触发及未知修饰条件仍缺隔离验证。"
    },
    {
      "id": "silent-proposal-b3bc0eb09211af6c",
      "state": "waiting",
      "reason": "KFR合法奇巧后继到真实终结的全链、替对象/提前饮毒/完整护栏替线整战反事实缺失；不由敌余血更少拟合终局权重。"
    },
    {
      "id": "silent-proposal-fdc3a505fe5e1a55",
      "state": "waiting",
      "reason": "KFR赢战血价/幕间回复与SL恢复分源；缺路线/休息题面逐源消费者读回及可比休息/锻造/替路线整战结果。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-104302-s2/learner/runs/20261014-104318-strategy-proposal/report.md"
}
```
