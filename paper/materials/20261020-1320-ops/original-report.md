## 修 bug 回报

- 合并基线：main → b82c4a49a04cb844df9dbf6da2f273b90e80e236
- 修复：沙箱自测：CLI完成回执及只读配置加载兼容 — 28c28db7d450113ba11bcd21d24c3a5c6e84f5c7 — 测试 agent/tests/v6-history-pack.test.ts:V6 run-start frozen history > builds through the production CLI from hash-frozen inputs and rejects changed bytes — 去掉修复时失败：是
- 修复：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines（固定consumer夹具子项） — ff6fd6923bcf5b1445899023a3fe95bafe033ea1 — 测试 agent/tests/loop-consumer-fixed-transport.test.ts:runs a serialized historical question and action without listening sockets — 去掉修复时失败：是
- 修复：infra-paper-dataset-concurrent-gzip-keyscan-20261018（原子归档及失败路径子项） — 4514b1909b6b2927d55de4818591d7efd69c49bf — 测试 agent/tests/paper-dataset-publication.test.ts:serializes dataset cuts and scans, publishes closed archives, and names corrupt inputs — 去掉修复时失败：是
- 修复：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline（固定搭建成本子项） — 83cb5041bf466509b66fdf057e9f8209d8c3fd67 — 测试 agent/tests/ops-herdr.test.ts:new learner tabs follow the live ops pane when workspace labels are duplicated — 去掉修复时失败：是
- 已被别人修掉的：发布任务身份/短摘要预算 — cd2f11496；账本物理/Git前缀保护 — dd478f0b3；共享main导入恢复 — 22efae554；报告fixes形状 — 4c16dab0；无决策死亡窗口 — 3b48088de；额度窗口恢复 — e5e2995d6；真实进阶通知 — 5b56a452b。其他限定子项及原源码祖先状态见核查表。
- 已有源码、原owner待集成：普通收尾隔离 — 798aeb7ce；空tick/retention — e8b8c18fe；手动学习通知scope — 911c4a144。末尾main/live源码blob读回未与这些原候选一致，未冒称已交付。
- 没修的：策略/机制与独立架构走原提案链；全局glob/目录生命周期、调度公平性及宽性能因果证据不足；原专项/活owner不重复实现。详见下方64项分类。
- 测试：每次修复提交前原沙箱入口均退出0；最后tsc0，Vitest566文件/5051用例/0。固定排除名单未改，使用configLoader=runner适应只读依赖目录。
- 重跑：ops-mod-state.test.ts 的 does not report ready for unsuccessful、does not report ready for missing ok，以及 v6-prompt-summary-perf.test.ts 的 measures fixed card summary construction；原阈值单worker精确3项通过，随后2-worker整套通过。旧4-worker整套1/3失败记录保留，不归因为已证CPU或产品问题。
- 合入：未合入。锁内read-only merge-tree退出1，live预检HEAD=f563cc997814fdccd2dafe8a50d3725c62102c7f；5处真实冲突，按任务第5节停止。未写live工作区、index或HEAD，6份知识刷新和2份派生笔记仍留在原处。未造版本/上线记录/已shipped或角色ACK。
- 需要 Roy 定的事：无。

### 合入冲突

- agent/tests/v6-appearance.test.ts
- notes/for-roy.md
- notes/ops-current-context.json
- ops/inbox-dev.md
- paper/materials/decision-log.md

### 负控、范围与检查原件

- CLI：cli-negative-control.log 为15失败/33通过；恢复后的8文件48项通过见 cli-fixtures-first.log。fixture-command的四项附加负控覆盖真实Node完成、非零退出、信号、缺失/错配回执，不凭零退出吞失败。
- Consumer：consumer-without-fix.log 为3文件5失败/12通过；复用原2a778b13候选，原socket/JSON/动作/日志断言、模拟及期限均保留。consumer-final-sandbox.log 整套565文件5050用例通过。
- 原子发布：paper-without-fix.log 为Python3失败/3错误（含损坏gzip子项）；paper-restored.log验证8个Python测试通过。main与build_locked逐字保持，代码仅补关闭后替换及明确错误路径；paper-sandbox-retry.log 整套566文件5051例通过。
- Herdr：herdr-final-without-fix.log 仅撤固定搭建helper，行为断言均到达，6!=3失败；herdr-final-restored.log恢复通过。保持15秒用例期限及30秒忙进程窗口，herdr-sandbox.log最终565线程文件+1路径文件、5040+11用例全过。
- 首个CLI提交的整套验证使用CLI+consumer联合候选输入（joint-infra-input.json / joint-infra-source.diff）；源码分项提交，consumer独立提交前再完整复验。其后每一提交前的源码输入和整套日志独立保留。
- 所有新增测试仅固定数据/自有临时进程，没有LLM或外部网络；没有改agent/src、角色知识或游戏数值/打法/SL/药水/终局规则。纯工具/测试修复不分配行为版本。gitleaks分项均0。
- 本批关键词查询没有对应纯工具bug-infra claim，未新建账本或误更新带CLI历史字样的游戏机制条目。原学习/通知/量化父要求保持，code_proposals及implementation_domains均空。
- 初始默认配置loader尝试写共享node_modules遭EROFS；旧V6监听夹具失败的检查被有意中断（130）；原consumer首次整套为563文件/5020过15败/1；旧论文4-worker整套为565文件/5037过3败/1。原件均保留，后续成功不改写旧失败。
- 工具构建时三次glob目录消失见tool-startup-glob-errors.txt。第一次CLI撤码准备命令未执行，其后cli-without-fix.log实际48项正控，不作为负控；正式负控只认cli-negative-control.log。
- 未推送、未运行play、未修改ops prompt/账号/home/共享配置/凭据。源工作树保持干净；保留原Herdr stash备份及全部过程文件，不在模型运行时回收自身工作树。

### 未勾选条目逐项核查

队列：/home/dw/Projects/agent-sts2/notes/fix-queue-v4.md；SHA256 2d1fbb77bc52a1c5d8e27d29fc712b478f2a0f565b372650d7ed1777193b3a31；64个未勾选段落。原队列不改；历史后续关闭文字和源码核查用于区分已修窄项。

|行|条目|处置|来源源码|
|---|---|---|---|
|784|silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战|已有修复；仅相应限定子项，不关闭宽父|3b48088dec5fc6eafe576a1296bbdadde43432ee|
|789|silent-0256：狡诈药水确定生成未建模，容量及出刀顺序未参与方案比较|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|793|silent-0260：普通紧勒后续逐牌失血漏模|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|797|silent-0263：已有虚弱的意图转向后少算1伤|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|801|silent-0266：SL已尝试键排序整轮牌，丢失投斧首牌身份|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|810|学习者复盘 XTSV1U9JD34T／SILENT A10 F48 T8：decision280547直接end_turn；states286893—286896中32HP／0挡、5能量与手持凋萎，胜前实际受9伤后23HP进入F49。定位turn-solver.ts:3764在evalu|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|817|学习者复盘9Z9H2EXKLF3T／静默A10 F37：decisions281240/281241将REGRET悔恨写进not_on_selection_screen，大脑据此改删STRIKE_SILENT；states287619牌组索引33、287620实际移除页25项且悔恨位于索|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|831|学习者复盘GXNKW8X1XYJP／静默A10 F45 T2→T3：sl-attempts1053—1056将原抽牌堆BLADE_DANCE、ACCELERANT、OUTBREAK、SUCKER_PUNCH列为inserted，旧升级键未入手离堆，已知前缀截到19/18/19/18；st|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|900|非阻塞系统／测试缺口，根因未核定|已有修复；仅相应限定子项，不关闭宽父|81d6226fe2c0220be145b5ff1487acbf512153f1|
|912|silent-0308|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|918|silent-0311|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|923|silent-0317|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|929|silent-0319|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|930|silent-0320|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|935|silent-0322|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|940|silent-0324|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|945|silent-0329|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|952|arch-funnel-guard|独立架构/学习任务，普通纯 bug 批次不实现||
|953|arch-learning-priority|独立架构/学习任务，普通纯 bug 批次不实现||
|954|arch-unified-resource-value|独立架构/学习任务，普通纯 bug 批次不实现||
|955|inv-f33-regression|独立架构/学习任务，普通纯 bug 批次不实现||
|959|silent-0332|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|964|非阻塞：学习者报告升级 HIDDEN_DAGGERS 仍将弃二误作抽二，未覆盖弃牌/生成小刀分支；当前 live `agent/src/reflex/card-model.ts:921/929/1109`、`turn-solver.ts:1312` 只覆盖普通版。证据 ENKYQMS9W|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|968|silent-0338|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|980|silent-0339|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|992|silent-0344，坚韧之环延迟格挡未接入推演|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1001|silent-0347|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1005|silent-0349|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1009|core-build-notify-222802-rc2|证据不足/原专项保持||
|1020|silent-0362|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1022|silent-0365|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1024|silent-0367|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1029|codex-usage-credit-baseline-recovery|已有修复；仅相应限定子项，不关闭宽父|e5e2995d659d15af79ec8bba67a4a25c1cb7295f|
|1034|ascension-up 把目标进阶当实玩级别：LWQYSREHMMJ7 的 run-config:330 同时记录 ascension=10/target_ascension=11，runs:694结局A10；其前SILENT选角帧 max_ascension=10/can_incre|当前 run_ascension 仅读真实 ascension，原缺陷已不在|5b56a452bb9be14d620b368ec46974c1b57901ca|
|1040|框架/测试收尾：175450的merge-live.py在1200秒外层时限切断尾部paths后，已完成268文件2703例的原件仍自动整套重跑；独立paths11例补验已过，共269文件2714例，却继续长期持live-merge.lock，181302已测修复排队。重跑非零还会自动r|证据不足/原专项保持||
|1041|调度公平性核查：watcher19:13冻结registry739项、pending587/waiting100/implemented38/duplicate14；可评估677项中首pending第80位。现有插入序waiting重评可能挤压新项，尚非永久饥饿证明；按真实dispatc|证据不足/原专项保持||
|1110|非对局阻塞，通用验证负载/确定性待诊断|已有修复；仅相应限定子项，不关闭宽父|d9881ba593b0b8d701ebbe1c95626c0ebdd554c7|
|1294|silent-0481|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1304|infra-target-options-fixed-fixture-timeout|已有修复；仅相应限定子项，不关闭宽父|c57105ca66bd75c6d6952772dcf712399eda828b|
|1308|infra-ledger-status-prefix-git-divergence|已有修复；仅相应限定子项，不关闭宽父|dd478f0b3e5a0f234f082972d21b203dbf8229d7|
|1322|infra-learner-launch-shared-main-config-race|已有修复；仅相应限定子项，不关闭宽父|22efae55484bc2bdcc54e847a8dc40bb4888c4e2|
|1344|silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1401|selection-hidden-daggers-conditional-followup-readback|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1403|非阻塞纯工程，原H1/模块健康链 `h1-budget-completion-health-contract`|已有修复；仅相应限定子项，不关闭宽父|c40e43fd25c200a01f4da94a4dac8db1b34664a8|
|1415|非阻塞纯工程，原H1/B2模块健康链 `h1-b2-margin-sample-identity`|已有修复；仅相应限定子项，不关闭宽父|660b194c950f017e356a4b3da952e127c7e5c768|
|1420|h1-b2-margin-sample-identity（原151301源已核收；知识刷新阻塞待原链发布）|已有修复；仅相应限定子项，不关闭宽父|660b194c950f017e356a4b3da952e127c7e5c768|
|1427|silent-vigor-skewer-J2VR（原学习者报告的新模型偏差，非阻塞）|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1431|silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU）|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||
|1433|原模块健康/H1/G2预算完成链续证 U5W7NUE925NK（非阻塞）|证据不足/原专项保持||
|1436|ops-learner-recheck-report-fixes-shape-20261018（非对局阻塞，原批核验接续）|已有修复；仅相应限定子项，不关闭宽父|4c16dab0457a61e22ef06b27e367d146cb99bab3|
|1438|ops-learner-recheck-report-fixes-shape-20261018 原项补证（非对局阻塞）|已有修复；仅相应限定子项，不关闭宽父|e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3|
|1440|infra-h0-414-host-fixed-test-stability-20261018|已有修复；仅相应限定子项，不关闭宽父|edbbbd6ccffa40decdb6487411d80e3f688f0907|
|1454|infra-paper-dataset-concurrent-gzip-keyscan-20261018（非对局阻塞，纯运维脚本）|本批补齐原子归档替换及明确损坏路径；保留当前共享锁|4514b1909b6b2927d55de4818591d7efd69c49bf|
|1462|infra-h0-414-host-fixed-test-stability-20261018 / router-timeout-max-gap-76fe29f3|已有修复；仅相应限定子项，不关闭宽父|a6913706952661afe1de38f290cd9434cbb91621|
|1466|infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines|本批复用原候选并重新负控/整套验证，固定回放不需socket或重复搜索|ff6fd6923bcf5b1445899023a3fe95bafe033ea1|
|1472|infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline|本批固定搭建成本子项已提交并完成负控/恢复/整套验证；宽因果保留|83cb5041bf466509b66fdf057e9f8209d8c3fd67|
|1478|h1-budget-completion-health-contract（R394新增indifferent诊断兼容续项，原链非阻塞）|已有修复；仅相应限定子项，不关闭宽父|5011b4cbda9a9056a1fd146e375e3cd67b60c0a9|
|1492|infra-manual-learning-notice-ack-scope-20261019（非对局阻塞，原通知协议fix链）|已有独立源码，原链待集成；不重复实现|911c4a1446ca25a5e1f8fbf9518ab21d16177cf7|
|1498|infra-ordinary-close-candidate-failure-isolation-20261020（非对局阻塞，原自动收尾协议链）|已有独立源码，原链待集成；不重复实现|798aeb7ceff1d0481453e5968ac152aa9386155a|
|1504|infra-v6-refresh-invalid-json-provenance-20261020（阻塞V6开启，原学习链owner）|证据不足/原专项保持||
|1514|infra-v6-publication-task-link-20261020|已有修复；仅相应限定子项，不关闭宽父|cd2f11496e6f8957c59ef72f70b2c6596cce6e63|
|1518|infra-ops-current-summary-budget-20261020|已有修复；仅相应限定子项，不关闭宽父|cd2f11496e6f8957c59ef72f70b2c6596cce6e63|
|1520|infra-ordinary-unassigned-tick-no-change-20261020（原普通收尾/retention协议链，非对局阻塞）|已有独立源码，原链待集成；不重复实现|e8b8c18fe887ff3fd882de0ca0ac2f427e3fe1b9|
|1522|silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链）|游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识||

### 机器回报

```json
{
  "task": "fix-batch",
  "base": "b82c4a49a04cb844df9dbf6da2f273b90e80e236",
  "fixes": [
    {
      "item": "沙箱自测：CLI完成回执及只读配置加载兼容",
      "commit": "28c28db7d450113ba11bcd21d24c3a5c6e84f5c7",
      "test": "agent/tests/v6-history-pack.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines（固定consumer夹具子项）",
      "commit": "ff6fd6923bcf5b1445899023a3fe95bafe033ea1",
      "test": "agent/tests/loop-consumer-fixed-transport.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "infra-paper-dataset-concurrent-gzip-keyscan-20261018（原子归档及失败路径子项）",
      "commit": "4514b1909b6b2927d55de4818591d7efd69c49bf",
      "test": "agent/tests/paper-dataset-publication.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline（固定搭建成本子项）",
      "commit": "83cb5041bf466509b66fdf057e9f8209d8c3fd67",
      "test": "agent/tests/ops-herdr.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "infra-manual-learning-notice-ack-scope-20261019",
      "reason": "原911c4a144已有独立源码和原owner验收，保留原精确集成链，不重复实现或代ACK。"
    },
    {
      "item": "infra-ordinary-close-candidate-failure-isolation-20261020",
      "reason": "原798aeb7ce已有独立源码，原owner精确集成待办保留；不改旧attention/报告。"
    },
    {
      "item": "infra-ordinary-unassigned-tick-no-change-20261020",
      "reason": "原e8b8c18fe已有独立源码，原owner精确集成待办保留，不重派研究。"
    },
    {
      "item": "sandbox-glob-startup-race及目录生命周期宽项",
      "reason": "本批工具启动实遇三次目录消失；删除者及上游因果仍未核实，证据不足，未改权限或清其他树。"
    },
    {
      "item": "原框架长检查收尾、调度公平性、H1/G2及宽性能父项",
      "reason": "需原事务身份/冻结输入及测量，既有窄源码或一次通过不代宽根因。证据不足或属于独立架构任务。"
    },
    {
      "item": "V6冻结包坏行来源及题面体积原专项",
      "reason": "原W3/W8/题面owner接续，未改历史坏行、重建生产包或夹带独立功能。"
    },
    {
      "item": "其余游戏机制、打法、药水、SL、终局及结构提案",
      "reason": "策略类/独立功能，沿既有strategy-proposal/原owner链；64项未勾选记录逐项见queue-classifications.json。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 5051
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261020-114322-5781b36b-4192-4db7-8a06-7da86c63e865-fix-batch/report.md"
}
```
