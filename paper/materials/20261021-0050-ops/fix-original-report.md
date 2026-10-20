## 修 bug 回报
- 合并基线：main → 2fb9ef1f26df9adfb04d68a409a8060bab7038c3
- 修复（每条一行）：原v5-dpr-health-20261013/H1：V6奖励监控误要求旧V5模拟字段 — 未提交（完整测试门禁未过） — 测试 agent/tests/v6-module-health.test.ts:checks V6 reward computation and consumption without hiding V5 or V6 failures — 去掉修复时失败：是
- 已被别人修掉的：silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：silent-0256：狡诈药水确定生成未建模，容量及出刀顺序未参与方案比较 — 5b56a452bb9be14d620b368ec46974c1b57901ca
- 已被别人修掉的：silent-0260：普通紧勒后续逐牌失血漏模 — 5c7105ff0294466da8319f2934beda05c6040794
- 已被别人修掉的：silent-0263：已有虚弱的意图转向后少算1伤 — ec29ea34b919344b707e57ba472ea210f9c39d62
- 已被别人修掉的：silent-0266：SL已尝试键排序整轮牌，丢失投斧首牌身份 — e784dd9f043bf87c29109573f48975f9903280d3
- 已被别人修掉的：silent-0271：毒胜提前返回遗漏保血候选 — 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f
- 已被别人修掉的：silent-0272：商店移除名单预判误报 — db20ec3cc6cd0e47ac014d0c523dd4ed1c781d26
- 已被别人修掉的：非阻塞系统／测试缺口，根因未核定 — 81d6226fe2c0220be145b5ff1487acbf512153f1
- 已被别人修掉的：silent-0308 — 1ffc0746d7de299fbb7856d397af9da0ab899558
- 已被别人修掉的：silent-0317 — b49112dbc106e315bd7156361d290fc4c73d29e2
- 已被别人修掉的：silent-0322 — a46239a29c3109ff9f69224ad77128d9929d3e9a
- 已被别人修掉的：silent-0324 — b9d6ed779c9e369d1f02a0e0935acbe4d1e44d14
- 已被别人修掉的：silent-0338 — c1d84804956bedbd29a7f0e81294114e18415b9d
- 已被别人修掉的：silent-0365 — 6c7019e659b9655d8751002e918ea7fd7dec5041
- 已被别人修掉的：silent-0367 — 66283dd9982bdd7f480da7a4d9bfefea0572a9ac
- 已被别人修掉的：codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：ascension-up：请求目标误报实际进阶 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：host-fixed-test-timeouts-010547：固定夹具确定性 — d9881ba593b0b8d701ebbe1c95626c0ebdd554c7
- 已被别人修掉的：infra-target-options-fixed-fixture-timeout — c57105ca66bd75c6d6952772dcf712399eda828b
- 已被别人修掉的：infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7
- 已被别人修掉的：infra-learner-launch-shared-main-config-race — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2
- 已被别人修掉的：selection-hidden-daggers-conditional-followup-readback — a473263eb35ce5bea8e06f1ee94f4da1ba880bc3
- 已被别人修掉的：h1-budget-completion-health-contract：预算完成诊断 — c40e43fd25c200a01f4da94a4dac8db1b34664a8
- 已被别人修掉的：h1-b2-margin-sample-identity — 660b194c950f017e356a4b3da952e127c7e5c768
- 已被别人修掉的：h1-b2-margin-sample-identity原发布续项 — 660b194c950f017e356a4b3da952e127c7e5c768
- 已被别人修掉的：silent-vigor-skewer-J2VR（原学习者报告的新模型偏差，非阻塞） — d959e176af7338ea2bca6f4ff9a39673b80e5fdf
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018（非对局阻塞，原批核验接续） — 4c16dab0457a61e22ef06b27e367d146cb99bab3
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018 原项补证（非对局阻塞） — e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 — edbbbd6ccffa40decdb6487411d80e3f688f0907
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018（非对局阻塞，纯运维脚本） — 0b240cbd109a5e004f010d9659a871204c455639
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / router-timeout-max-gap-76fe29f3 — a6913706952661afe1de38f290cd9434cbb91621
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines — 87c1381a4461c81f9f948a1796600d019c544349
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4
- 已被别人修掉的：h1-budget-completion-health-contract（R394新增indifferent诊断兼容续项，原链非阻塞） — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9
- 已被别人修掉的：infra-manual-learning-notice-ack-scope-20261019（非对局阻塞，原通知协议fix链） — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee
- 已被别人修掉的：infra-ordinary-close-candidate-failure-isolation-20261020（非对局阻塞，原自动收尾协议链） — b675eb67f3687fb137434ef9610f1503edbbe8bc
- 已被别人修掉的：infra-v6-refresh-invalid-json-provenance-20261020（阻塞V6开启，原学习链owner） — de94aa263bfb25363c13d2968c976d8c9138f5c1
- 已被别人修掉的：infra-v6-publication-task-link-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：infra-ordinary-unassigned-tick-no-change-20261020（原普通收尾/retention协议链，非对局阻塞） — ca6897f2e433c9c3bb45d0dad46ba685d864c87d
- 已被别人修掉的：沙箱自测：CLI完成回执及只读配置加载兼容 — cb2dd0375f8cb5637a2813dc2845f702d6007f27（历史工程子项）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines（固定consumer夹具子项） — 87c1381a4461c81f9f948a1796600d019c544349（历史工程子项）
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018 — 0b240cbd109a5e004f010d9659a871204c455639（历史工程子项）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline（固定搭建成本子项） — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4（历史工程子项）
- 已被别人修掉的：早期任务模板merge=v3过时 — 16ebc4aecb12a1d4b2f34ee767bb2816a3a0b466（历史工程子项）
- 已被别人修掉的：DeepSeek题面dump整读states超字符串上限 — 6ee8e2a2c1edc31492962137b96af8c6e1d12093（历史工程子项）
- 已被别人修掉的：失败大脑及fallback主引擎耗时漏记 — 052e586d753df2f10e478b95e72e2993eb808229（历史工程子项）
- 已被别人修掉的：feature根目录事件通知来源兼容 — 577f0bc424b7287910735cfdc86c253cc7ee8057（历史工程子项）
- 已被别人修掉的：原结束后stall误报 — 21a9c52484f04d510bd397959c958ec9767f1d2d（历史工程子项）
- 已被别人修掉的：core-build-notify-222802-rc2 / 原生失败诊断保存子项 — 5c92f2aaf0b758a1a5e7d591745694004664f83a（历史工程子项）
- 已被别人修掉的：共享临时目录inode/测试生命周期/主盘TMPDIR及容量准入（限定工程子项） — 4c7b8d9bf48f54163c04d8e4f4f79ae6eb402e83（历史工程子项）
- 没修的：silent-0279：SL抽序升级改标身份、silent-0311、silent-0319、silent-0320、silent-0329、silent-0332、silent-0334：升级隐秘匕首模型、silent-0339、silent-0344，坚韧之环延迟格挡未接入推演、silent-0347、silent-0349、silent-0362、silent-0481、silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据、silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU）、silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链）、silent-0535：单动作候选目标未传播双蟹朝向 — 策略类；已有独立strategy-proposal，保留证据及适用范围，普通bug批次不补游戏知识或重复派发。
- 没修的：arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression — 独立架构/归因专项，超出普通纯bug批次。
- 没修的：core-build-notify-222802-rc2、合后检查包装器总时限与整套重跑、策略调度公平性归因核查、H1/G2预算完成及paired-DPR来源宽项 — 证据不足；原通知缺确认未送达证明，旧合后包装器缺当前可复现根因，调度公平性及H1/G2宽项缺完整因果证据。保留原专项与失败；通知失败诊断子项已修5c92f2aaf。
- 没修的：infra-chest-claimed-action-conflict-0516、infra-v6-brain-input-too-large-20261020 — 策略/独立题面专项，普通纯bug批次不重复实现；题面专项已随V6-R404运输，原故障自然复验和父要求不由本批关闭。
- 没修的：原v5-dpr-health-20261013/H1：V6奖励监控误要求旧V5模拟字段 — 实现及撤源码红绿已完成，但完整沙箱582文件/5179例有9失败；撤掉本修复后6失败文件复验仍有7失败，按全套必须通过的门禁未提交。4叶源码、补丁、证据与测试日志均保留，待原V6/infra基线问题修复后接续。
- 测试：tsc退出码0；完整沙箱Vitest 582文件（576过/6败）/5179例（5170过/9败）/退出码1；由于set -e，后续paths单独阶段未执行。撤源码后的失败复验6文件（2过/4败）/19例（12过/7败）/退出码1。恢复源码后定向2文件2例退出码0；Python新5项、原18项均通过。
- 合入：未合入；知识/记录8冲突预检退出1，live发布锁非阻塞尝试退出1。live未改，未执行刷新数据提交、实际merge或合后测试。
- 需要 Roy 定的事：无。

新监控实现尚未提交；fixes=[]表示没有可交付的源码commit，不表示源码没有变化。4叶已暂存并保留在原工作树：ops/module_health.py、ops/v6_card_health.py、agent/tests/v6-module-health.test.ts、agent/tests/v6_module_health_test.py。完整二进制补丁source.diff及4叶SHA见source-manifest.json。gitleaks exit0，恢复后逐叶SHA及整个补丁逐字节核同原扫描输入；不重写失败或宣称整套绿。

证据：RBMEQGXPE9Z2 SILENT A10 F2/F3/F4/F6 奖励屏，turn不适用。四决策/四A/B计算原流按offset/length/SHA全部核验；四个V6 Jev回执与decision_id一致。只读回放4计算可用、4消费完成、4 partial，旧B3误报归零。计算回执原格式没有decision_id，关联使用同run/floor最近前置时间及候选ID，限制在报告字段显式披露；消费另核精确question_id/回答/动作完成，不以entries空字段豁免，也不认300样本完整、候选正确、自然收益或关闭原P0问题。

去掉源码：只stash ops/module_health.py与ops/v6_card_health.py，保留新测试。Python audit用例在assertFalse(report["alert"])失败；Vitest1文件1例失败。恢复后Python audit通过及定向2文件2例通过。首次Vitest命令因不支持--cacheDir在用例启动前退出1，改用scratch配置覆盖cacheDir及configLoader=runner；原启动错误与实际红绿日志分开保存。

全套失败和一次原时限复验：
- v6-direction-provider.test.ts：expected_win期望null，实际0.5，win也从期望null变为有值；撤源码后仍失败。
- v6-projection-entries.test.ts：general_win?.n期望20，实际undefined；撤源码后仍失败。
- v6-target-values.test.ts：两例constructionCoverage.reason期望null，实际insufficient_known_options；撤源码后仍失败。
- temp-lifecycle.test.ts：默认临时目录路径、子进程EPERM、ENOENT stderr三例；撤源码后仍失败。只确认其中明确EPERM，不把全部V6断言归沙箱或CPU。
- v6-room-prompt-budget.test.ts的shop例原15000ms超时，撤源码后一次复验通过；未抬期限/删断言。
- ordinary-close-isolation.test.ts原spawnSync 15000ms返回status=null，撤源码后一次复验通过；fatal bad object固定负控输出不独立认作失败根因。

baseline-production.diff为空且exit0，证明上述复验时agent/src与ops生产源码完全等于本批main基线；另两新测试未在该复验选择范围。复验后恢复同一监控修复，并再次运行新旧监控定向回归2文件2例0。按任务每次提交前全套须通过的门禁，本批不commit、不推送；不为基线红灯改V6公式、阈值、样本、测试断言或固定排除名单。

队列66个未勾选项，其中65个与上一批逐字相同、另1个本批待提交修复；旧40个窄修复及11历史工程子项逐条列于上方，154唯一源码/测试文件初始SHA全部相同、46个独立commit均为本批基线祖先。未完成策略/架构/证据父项保原链；不重复派学习者、不新增游戏知识。

本缺陷无对应bug-infra账本：module-health及RBMEQGXPE9Z2查询均0；未新建账本、未标shipped。纯监控工具不改对局行为，无新增eval版本、决策日志、双通知或运维prompt。原队列、live、知识数据和根目录并行记录均不写。

合入预检基于live 4528a751f17e341a97e7ff70295ec9fba0c947e9及本分支基线；8冲突：agent/tests/v6-appearance.test.ts、knowledge/builders/refresh-step.py、knowledge/builders/refresh.sh、knowledge/characters/silent/v6-history.json、notes/for-roy.md、notes/ops-current-context.json、ops/inbox-dev.md、paper/materials/decision-log.md。未在占锁live内进行任何源码或刷新提交。

后续若窄集成本补丁，须同时处理测试辅助依赖：当前live缺agent/tests/fixture-command.ts及fixture-command.py，main已有canonical源cb2dd0375f8cb5637a2813dc2845f702d6007f27，逐叶SHA在source-manifest.json。不得把仅四叶的窄运输冒作自包含测试包；不运整main掩盖冲突。

原日志、工作树、补丁、初稿report-draft.md、证据输入与所有失败均保留。

```json
{
  "task": "fix-batch",
  "base": "2fb9ef1f26df9adfb04d68a409a8060bab7038c3",
  "fixes": [],
  "skipped": [
    {
      "item": "silent-0279：SL抽序升级改标身份、silent-0311、silent-0319、silent-0320、silent-0329、silent-0332、silent-0334：升级隐秘匕首模型、silent-0339、silent-0344，坚韧之环延迟格挡未接入推演、silent-0347、silent-0349、silent-0362、silent-0481、silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据、silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU）、silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链）、silent-0535：单动作候选目标未传播双蟹朝向",
      "reason": "策略类；已有独立strategy-proposal，保留证据及适用范围，普通bug批次不补游戏知识或重复派发。"
    },
    {
      "item": "arch-funnel-guard、arch-learning-priority、arch-unified-resource-value、inv-f33-regression",
      "reason": "独立架构/归因专项，超出普通纯bug批次。"
    },
    {
      "item": "core-build-notify-222802-rc2、合后检查包装器总时限与整套重跑、策略调度公平性归因核查、H1/G2预算完成及paired-DPR来源宽项",
      "reason": "证据不足；原通知缺确认未送达证明，旧合后包装器缺当前可复现根因，调度公平性及H1/G2宽项缺完整因果证据。保留原专项与失败；通知失败诊断子项已修5c92f2aaf。"
    },
    {
      "item": "infra-chest-claimed-action-conflict-0516、infra-v6-brain-input-too-large-20261020",
      "reason": "策略/独立题面专项，普通纯bug批次不重复实现；题面专项已随V6-R404运输，原故障自然复验和父要求不由本批关闭。"
    },
    {
      "item": "原v5-dpr-health-20261013/H1：V6奖励监控误要求旧V5模拟字段",
      "reason": "实现及撤源码红绿已完成，但完整沙箱582文件/5179例有9失败；撤掉本修复后6失败文件复验仍有7失败，按全套必须通过的门禁未提交。4叶源码、补丁、证据与测试日志均保留，待原V6/infra基线问题修复后接续。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 1,
    "cases": 5179
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261021-001311-e78d768b-55b2-4b22-967c-8792d70fb5f1-fix-batch/report.md"
}
```
