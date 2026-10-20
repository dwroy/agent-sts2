## 修 bug 回报

- 合并基线：main → efee2055221d0db7c2afaa05205384af16b9b72b
- 修复（每条一行）：无新增修复。67个未勾选项逐条核对，154个相关源码/测试SHA与前批相同，46个历史修复提交均为当前基线祖先；无源码改动，撤修复红绿验证不适用。
- 已被别人修掉的：silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战 — 3b48088dec5fc6eafe576a1296bbdadde43432ee（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0256：狡诈药水确定生成未建模，容量及出刀顺序未参与方案比较 — 5b56a452bb9be14d620b368ec46974c1b57901ca（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0260：普通紧勒后续逐牌失血漏模 — 5c7105ff0294466da8319f2934beda05c6040794（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0263：已有虚弱的意图转向后少算1伤 — ec29ea34b919344b707e57ba472ea210f9c39d62（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0266：SL已尝试键排序整轮牌，丢失投斧首牌身份 — e784dd9f043bf87c29109573f48975f9903280d3（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0271：毒胜提前返回遗漏保血候选 — 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0272：商店移除名单预判误报 — db20ec3cc6cd0e47ac014d0c523dd4ed1c781d26（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：非阻塞系统／测试缺口，根因未核定 — 81d6226fe2c0220be145b5ff1487acbf512153f1（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0308 — 1ffc0746d7de299fbb7856d397af9da0ab899558（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0317 — b49112dbc106e315bd7156361d290fc4c73d29e2（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0322 — a46239a29c3109ff9f69224ad77128d9929d3e9a（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0324 — b9d6ed779c9e369d1f02a0e0935acbe4d1e44d14（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0338 — c1d84804956bedbd29a7f0e81294114e18415b9d（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0365 — 6c7019e659b9655d8751002e918ea7fd7dec5041（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-0367 — 66283dd9982bdd7f480da7a4d9bfefea0572a9ac（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：ascension-up：请求目标误报实际进阶 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：host-fixed-test-timeouts-010547：固定夹具确定性 — d9881ba593b0b8d701ebbe1c95626c0ebdd554c7（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-target-options-fixed-fixture-timeout — c57105ca66bd75c6d6952772dcf712399eda828b（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-learner-launch-shared-main-config-race — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：selection-hidden-daggers-conditional-followup-readback — a473263eb35ce5bea8e06f1ee94f4da1ba880bc3（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：h1-budget-completion-health-contract：预算完成诊断 — c40e43fd25c200a01f4da94a4dac8db1b34664a8（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：h1-b2-margin-sample-identity — 660b194c950f017e356a4b3da952e127c7e5c768（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：h1-b2-margin-sample-identity原发布续项 — 660b194c950f017e356a4b3da952e127c7e5c768（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：silent-vigor-skewer-J2VR（原学习者报告的新模型偏差，非阻塞） — d959e176af7338ea2bca6f4ff9a39673b80e5fdf（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018（非对局阻塞，原批核验接续） — 4c16dab0457a61e22ef06b27e367d146cb99bab3（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018 原项补证（非对局阻塞） — e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 — edbbbd6ccffa40decdb6487411d80e3f688f0907（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018（非对局阻塞，纯运维脚本） — 0b240cbd109a5e004f010d9659a871204c455639（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / router-timeout-max-gap-76fe29f3 — a6913706952661afe1de38f290cd9434cbb91621（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines — 87c1381a4461c81f9f948a1796600d019c544349（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：h1-budget-completion-health-contract（R394新增indifferent诊断兼容续项，原链非阻塞） — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-manual-learning-notice-ack-scope-20261019（非对局阻塞，原通知协议fix链） — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-ordinary-close-candidate-failure-isolation-20261020（非对局阻塞，原自动收尾协议链） — b675eb67f3687fb137434ef9610f1503edbbe8bc（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-v6-refresh-invalid-json-provenance-20261020（阻塞V6开启，原学习链owner） — de94aa263bfb25363c13d2968c976d8c9138f5c1（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-v6-publication-task-link-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-ordinary-unassigned-tick-no-change-20261020（原普通收尾/retention协议链，非对局阻塞） — ca6897f2e433c9c3bb45d0dad46ba685d864c87d（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：沙箱自测：CLI完成回执及只读配置加载兼容 — cb2dd0375f8cb5637a2813dc2845f702d6007f27（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines（固定consumer夹具子项） — 87c1381a4461c81f9f948a1796600d019c544349（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018 — 0b240cbd109a5e004f010d9659a871204c455639（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline（固定搭建成本子项） — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：早期任务模板merge=v3过时 — 16ebc4aecb12a1d4b2f34ee767bb2816a3a0b466（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：DeepSeek题面dump整读states超字符串上限 — 6ee8e2a2c1edc31492962137b96af8c6e1d12093（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：失败大脑及fallback主引擎耗时漏记 — 052e586d753df2f10e478b95e72e2993eb808229（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：feature根目录事件通知来源兼容 — 577f0bc424b7287910735cfdc86c253cc7ee8057（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：原结束后stall误报 — 21a9c52484f04d510bd397959c958ec9767f1d2d（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：core-build-notify-222802-rc2 / 原生失败诊断保存子项 — 5c92f2aaf0b758a1a5e7d591745694004664f83a（只核当前基线窄修复，不代宽父或live验收）
- 已被别人修掉的：共享临时目录inode/测试生命周期/主盘TMPDIR及容量准入（限定工程子项） — 4c7b8d9bf48f54163c04d8e4f4f79ae6eb402e83（只核当前基线窄修复，不代宽父或live验收）
- 没修的：silent-0279：SL抽序升级改标身份 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0311 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0319 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0320 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0329 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：arch-funnel-guard — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：arch-learning-priority — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：arch-unified-resource-value — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：inv-f33-regression — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：silent-0332 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0334：升级隐秘匕首模型 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0339 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0344，坚韧之环延迟格挡未接入推演 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0347 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0349 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：core-build-notify-222802-rc2 — 证据不足：原生通知rc2缺原stderr与确定送达状态；诊断保存子项已修，保原专项，不擅自重送。
- 没修的：silent-0362 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：合后检查包装器总时限与整套重跑 — 证据不足：原merge-live.py属于历史批次执行器，原owner及精确分段覆盖待接续；不改当前发布事务。
- 没修的：策略调度公平性归因核查 — 独立调度归因/架构任务；插入序观测不足以证明永久饥饿，普通纯bug批次不改排序。
- 没修的：silent-0481 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：H1/G2预算完成及paired-DPR来源宽项 — 证据不足：宽根因仍由原H1/G2 owner核实际输入，窄诊断兼容已修不关闭父项。
- 没修的：silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0535：单动作候选目标未传播双蟹朝向 — 策略类；已有silent-proposal-84af8bc877ca131f，保留独立strategy-proposal链，不重复派发
- 没修的：原v5-dpr-health/H1 module-health V6兼容续项（RBMEQGXPE9Z2） — 原001302批已保存四叶监控补丁和两项必要依赖，尚未源码提交或发布；队列1532行明确禁止下一普通批重复实现。保留原线程与pending-continuations/original-20261021-001302-monitor-health-six-leaf.json，不改既有在途包。
- 没修的：infra-chest-claimed-action-conflict-0516 — 策略/结构类；保留原cf77920511042e9c独立提案链，不重复派发。
- 没修的：infra-v6-brain-input-too-large-20261020宽项 — 原题面专项已窄运输；原故障自然复验与父要求不由本批关闭。
- 没修的：infra-ordinary-close-candidate-failure-isolation-20261020 / ordinary-close-isolation 固定夹具成本续项 — 原014301三叶候选未提交/发布，队列1536行禁止后批重复实现；新增04:35联合检查ordinary-close仍15027ms/status=null，保留旧失败，待原owner按最新live完整验收。
- 没修的：silent-elite-simulation-pessimism-20261021 — 策略类；队列明确非fix-batch纯bug，沿原精英偏差学习问题与策略流程核实，不重复派发。
- 测试：tsc退出码0；Vitest定向6文件/24用例/退出码0，无重跑；固定数据，无网络/LLM，单worker、nice19、runner配置加载。gitleaks空源码diff扫描退出码0。未改代码、无提交，未重复未变源码整套沙箱检查，不把定向通过当完整绿。日志tsc.log、targeted.log，逐项核查queue-audit.json与already-fixed.json。
- 合入：未合入；无本批源码提交。001302监控六叶、014301夹具三叶候选仍由原owner接续，未提交/发布；014301新增04:35联合失败原件保留。不改live、账本、队列或版本。
- 需要 Roy 定的事：无。

```json
{
  "task": "fix-batch",
  "base": "efee2055221d0db7c2afaa05205384af16b9b72b",
  "fixes": [],
  "skipped": [
    {
      "item": "silent-0279：SL抽序升级改标身份",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0311",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0319",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0320",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0329",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "arch-funnel-guard",
      "reason": "独立架构/学习任务，普通纯 bug 批次不实现"
    },
    {
      "item": "arch-learning-priority",
      "reason": "独立架构/学习任务，普通纯 bug 批次不实现"
    },
    {
      "item": "arch-unified-resource-value",
      "reason": "独立架构/学习任务，普通纯 bug 批次不实现"
    },
    {
      "item": "inv-f33-regression",
      "reason": "独立架构/学习任务，普通纯 bug 批次不实现"
    },
    {
      "item": "silent-0332",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0334：升级隐秘匕首模型",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0339",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0344，坚韧之环延迟格挡未接入推演",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0347",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0349",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "core-build-notify-222802-rc2",
      "reason": "证据不足：原生通知rc2缺原stderr与确定送达状态；诊断保存子项已修，保原专项，不擅自重送。"
    },
    {
      "item": "silent-0362",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "合后检查包装器总时限与整套重跑",
      "reason": "证据不足：原merge-live.py属于历史批次执行器，原owner及精确分段覆盖待接续；不改当前发布事务。"
    },
    {
      "item": "策略调度公平性归因核查",
      "reason": "独立调度归因/架构任务；插入序观测不足以证明永久饥饿，普通纯bug批次不改排序。"
    },
    {
      "item": "silent-0481",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU）",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "H1/G2预算完成及paired-DPR来源宽项",
      "reason": "证据不足：宽根因仍由原H1/G2 owner核实际输入，窄诊断兼容已修不关闭父项。"
    },
    {
      "item": "silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链）",
      "reason": "游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识"
    },
    {
      "item": "silent-0535：单动作候选目标未传播双蟹朝向",
      "reason": "策略类；已有silent-proposal-84af8bc877ca131f，保留独立strategy-proposal链，不重复派发"
    },
    {
      "item": "原v5-dpr-health/H1 module-health V6兼容续项（RBMEQGXPE9Z2）",
      "reason": "原001302批已保存四叶监控补丁和两项必要依赖，尚未源码提交或发布；队列1532行明确禁止下一普通批重复实现。保留原线程与pending-continuations/original-20261021-001302-monitor-health-six-leaf.json，不改既有在途包。"
    },
    {
      "item": "infra-chest-claimed-action-conflict-0516",
      "reason": "策略/结构类；保留原cf77920511042e9c独立提案链，不重复派发。"
    },
    {
      "item": "infra-v6-brain-input-too-large-20261020宽项",
      "reason": "原题面专项已窄运输；原故障自然复验与父要求不由本批关闭。"
    },
    {
      "item": "infra-ordinary-close-candidate-failure-isolation-20261020 / ordinary-close-isolation 固定夹具成本续项",
      "reason": "原014301三叶候选未提交/发布，队列1536行禁止后批重复实现；新增04:35联合检查ordinary-close仍15027ms/status=null，保留旧失败，待原owner按最新live完整验收。"
    },
    {
      "item": "silent-elite-simulation-pessimism-20261021",
      "reason": "策略类；队列明确非fix-batch纯bug，沿原精英偏差学习问题与策略流程核实，不重复派发。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 24
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261021-054308-fce30cbc-343b-462c-b6a9-40c4652f1250-fix-batch/report.md"
}
```
