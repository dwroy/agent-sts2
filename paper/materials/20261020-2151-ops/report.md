## 修 bug 回报

- 合并基线：main → e8b1ea961a3601b547a1a1c0e1b9034106087075（开工先合并，Already up to date，无冲突；后续main推进不改写本批基线）
- 修复（每条一行）：无新增源码修复或提交；去掉修复时失败：不适用。
- 已被别人修掉的：silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战 — 3b48088dec5fc6eafe576a1296bbdadde43432ee（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0256：狡诈药水确定生成未建模，容量及出刀顺序未参与方案比较 — 5b56a452bb9be14d620b368ec46974c1b57901ca（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0260：普通紧勒后续逐牌失血漏模 — 5c7105ff0294466da8319f2934beda05c6040794（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0263：已有虚弱的意图转向后少算1伤 — ec29ea34b919344b707e57ba472ea210f9c39d62（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0266：SL已尝试键排序整轮牌，丢失投斧首牌身份 — e784dd9f043bf87c29109573f48975f9903280d3（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0271：毒胜提前返回遗漏保血候选 — 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0272：商店移除名单预判误报 — db20ec3cc6cd0e47ac014d0c523dd4ed1c781d26（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：非阻塞系统／测试缺口，根因未核定 — 81d6226fe2c0220be145b5ff1487acbf512153f1（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0308 — 1ffc0746d7de299fbb7856d397af9da0ab899558（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0317 — b49112dbc106e315bd7156361d290fc4c73d29e2（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0322 — a46239a29c3109ff9f69224ad77128d9929d3e9a（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0324 — b9d6ed779c9e369d1f02a0e0935acbe4d1e44d14（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0338 — c1d84804956bedbd29a7f0e81294114e18415b9d（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0365 — 6c7019e659b9655d8751002e918ea7fd7dec5041（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-0367 — 66283dd9982bdd7f480da7a4d9bfefea0572a9ac（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：ascension-up：请求目标误报实际进阶 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：host-fixed-test-timeouts-010547：固定夹具确定性 — d9881ba593b0b8d701ebbe1c95626c0ebdd554c7（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-target-options-fixed-fixture-timeout — c57105ca66bd75c6d6952772dcf712399eda828b（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-learner-launch-shared-main-config-race — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：selection-hidden-daggers-conditional-followup-readback — a473263eb35ce5bea8e06f1ee94f4da1ba880bc3（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：h1-budget-completion-health-contract：预算完成诊断 — c40e43fd25c200a01f4da94a4dac8db1b34664a8（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：h1-b2-margin-sample-identity — 660b194c950f017e356a4b3da952e127c7e5c768（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：h1-b2-margin-sample-identity原发布续项 — 660b194c950f017e356a4b3da952e127c7e5c768（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：silent-vigor-skewer-J2VR（原学习者报告的新模型偏差，非阻塞） — d959e176af7338ea2bca6f4ff9a39673b80e5fdf（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018（非对局阻塞，原批核验接续） — 4c16dab0457a61e22ef06b27e367d146cb99bab3（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018 原项补证（非对局阻塞） — e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 — edbbbd6ccffa40decdb6487411d80e3f688f0907（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018（非对局阻塞，纯运维脚本） — 0b240cbd109a5e004f010d9659a871204c455639（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / router-timeout-max-gap-76fe29f3 — a6913706952661afe1de38f290cd9434cbb91621（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines — 87c1381a4461c81f9f948a1796600d019c544349（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：h1-budget-completion-health-contract（R394新增indifferent诊断兼容续项，原链非阻塞） — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-manual-learning-notice-ack-scope-20261019（非对局阻塞，原通知协议fix链） — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-ordinary-close-candidate-failure-isolation-20261020（非对局阻塞，原自动收尾协议链） — b675eb67f3687fb137434ef9610f1503edbbe8bc（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-v6-refresh-invalid-json-provenance-20261020（阻塞V6开启，原学习链owner） — de94aa263bfb25363c13d2968c976d8c9138f5c1（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-v6-publication-task-link-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
- 已被别人修掉的：infra-ordinary-unassigned-tick-no-change-20261020（原普通收尾/retention协议链，非对局阻塞） — ca6897f2e433c9c3bb45d0dad46ba685d864c87d（当前main基线已含的窄修复，不代表宽父关闭或本批发布）
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
- 没修的：core-build-notify-222802-rc2 — 证据不足/原专项保持
- 没修的：silent-0362 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：合后检查包装器总时限与整套重跑 — 证据不足/原专项保持
- 没修的：策略调度公平性归因核查 — 证据不足/原专项保持
- 没修的：silent-0481 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：H1/G2预算完成及paired-DPR来源宽项 — 证据不足/原专项保持
- 没修的：silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0535：单动作候选目标未传播双蟹朝向 — 策略类；已有silent-proposal-84af8bc877ca131f，保留独立strategy-proposal链，不重复派发
- 没修的：infra-chest-claimed-action-conflict-0516 — 策略/结构提案cf77920511042e9c由原独立任务处理，不重复派发。
- 没修的：infra-v6-brain-input-too-large-20261020宽项 — 原题面专项已随V6-R404窄运输；原故障自然复验和父要求不由本批关闭。
- 测试：tsc退出码0；vitest定向7文件 / 10用例 / 退出码0；没有测试用例重跑。首次启动因废弃的--cache.dir参数退出1，第二次启动因配置bundle试写只读node_modules/.vite-temp退出1，均未进入测试；改用Vite configLoader=runner及scratch cacheDir后首轮用例全过，两失败日志保留。
- 合入：未合入；无新增源码或本批提交；只读观察live=048a9713bd4be09ad5f6d3f6131e8b729f51aece / V6-R404。
- 需要 Roy 定的事：无。

队列SHA256：fb2a14136bd6ae708c3e94fb356d4f97255289a43baf4761c80e16d8dc054c29。65个未勾选条目与194306批逐字一致；40个原窄修复、25个保留原链，逐项来源/提交/处置见queue-audit.json。另核11个历史工程子项。46个独立修复提交均为本批基线祖先；154个唯一源码/测试文件指纹已核。
相对原审计仅agent/src/hand/loop.ts及agent/src/memory/types.ts两处文件指纹改变，已检查Git差异：为V6战胜奖励来源与方向搭车集成；没有ascension相关增删，memory仅新增V6字段。实际升阶判断仍取run-config.ascension而非target_ascension；ascension-observed固定回归本批通过。
当前live的逐来源祖先与文件差异另存live-readback.json。8个历史源提交并非live祖先，其中4个来源有源码或测试路径差异；其余可能经窄运输而保同字节。这里的“已修”指当前main基线，不冒称这8个源提交已直接合入live。原五项发布明确未整棵运输较新main夹具；本批无新源，不借审计把整棵main混入live或关闭原集成待办。
本批定向文件：manual-notice-ack.test.ts、ordinary-close-isolation.test.ts、cadence-no-change.test.ts、v6-publication-task-link.test.ts、ops-current-budget.test.ts、silent-potion-targets.test.ts、ascension-observed.test.ts。使用原固定夹具/断言/deadline、nice19、单worker；TMPDIR和cacheDir均在本批scratch，不调用LLM或网络。
没有源码改动或提交，因此未运行提交前完整test-sandbox.sh、提交前gitleaks或撤源码红绿；不冒称完整套件通过。没有本批修复提交需追加账本proposed；不标shipped，不新建提案、不改队列、知识、双通知、版本、决策日志或ops prompt。工作树保持严格干净，不运行play或改对局/账号。
源码对照保留基线40位Git提交、空source.diff和154个源码指纹；两启动错误及最终测试日志/退出码全部保留。

```json
{
  "task": "fix-batch",
  "base": "e8b1ea961a3601b547a1a1c0e1b9034106087075",
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
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 10
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261020-214312-d1ae97e8-8e3a-4e9a-9238-6a8f4c8e007d-fix-batch/report.md"
}
```
