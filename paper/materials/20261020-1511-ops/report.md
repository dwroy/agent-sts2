## 修 bug 回报

- 合并基线：main → 079874c93e34de578bc3a97c7f04a9e7baf42534
- 修复（每条一行）：infra-ordinary-close-candidate-failure-isolation-20261020 — b675eb67f3687fb137434ef9610f1503edbbe8bc — 测试 agent/tests/ordinary-close-isolation.test.ts:isolates failed candidates and revalidates preserved preflight failures before one dataset commit — 去掉修复时失败：是
- 修复（每条一行）：infra-ordinary-unassigned-tick-no-change-20261020 — ca6897f2e433c9c3bb45d0dad46ba685d864c87d — 测试 agent/tests/cadence-no-change.test.ts:settles registered empty cadence reviews and preserves source, parent and retention guards — 去掉修复时失败：是
- 修复（每条一行）：infra-manual-learning-notice-ack-scope-20261019 — 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee — 测试 agent/tests/manual-notice-ack.test.ts:authenticates original manual V6 notice sources and preserves independent role and scope guards — 去掉修复时失败：是
- 已被别人修掉的：silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：非阻塞系统／测试缺口，根因未核定 — 81d6226fe2c0220be145b5ff1487acbf512153f1
- 已被别人修掉的：codex-usage-credit-baseline-recovery — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：ascension-up 把目标进阶当实玩级别：LWQYSREHMMJ7 的 run-config:330 同时记录 ascension=10/target_ascension=11，runs:694结局A10；其前SILENT选角帧 max_ascension=10/can_incre — 5b56a452bb9be14d620b368ec46974c1b57901ca
- 已被别人修掉的：非对局阻塞，通用验证负载/确定性待诊断 — d9881ba593b0b8d701ebbe1c95626c0ebdd554c7
- 已被别人修掉的：infra-target-options-fixed-fixture-timeout — c57105ca66bd75c6d6952772dcf712399eda828b
- 已被别人修掉的：infra-ledger-status-prefix-git-divergence — dd478f0b3e5a0f234f082972d21b203dbf8229d7
- 已被别人修掉的：infra-learner-launch-shared-main-config-race — 22efae55484bc2bdcc54e847a8dc40bb4888c4e2
- 已被别人修掉的：非阻塞纯工程，原H1/模块健康链 `h1-budget-completion-health-contract` — c40e43fd25c200a01f4da94a4dac8db1b34664a8
- 已被别人修掉的：非阻塞纯工程，原H1/B2模块健康链 `h1-b2-margin-sample-identity` — 660b194c950f017e356a4b3da952e127c7e5c768
- 已被别人修掉的：h1-b2-margin-sample-identity（原151301源已核收；知识刷新阻塞待原链发布） — 660b194c950f017e356a4b3da952e127c7e5c768
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018（非对局阻塞，原批核验接续） — 4c16dab0457a61e22ef06b27e367d146cb99bab3
- 已被别人修掉的：ops-learner-recheck-report-fixes-shape-20261018 原项补证（非对局阻塞） — e87e6cc08bfb2c90e1961d6783cf0c2a7462aac3
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 — edbbbd6ccffa40decdb6487411d80e3f688f0907
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / router-timeout-max-gap-76fe29f3 — a6913706952661afe1de38f290cd9434cbb91621
- 已被别人修掉的：h1-budget-completion-health-contract（R394新增indifferent诊断兼容续项，原链非阻塞） — 5011b4cbda9a9056a1fd146e375e3cd67b60c0a9
- 已被别人修掉的：infra-v6-publication-task-link-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：infra-ops-current-summary-budget-20261020 — cd2f11496e6f8957c59ef72f70b2c6596cce6e63
- 已被别人修掉的：沙箱自测：CLI完成回执及只读配置加载兼容 — cb2dd0375f8cb5637a2813dc2845f702d6007f27
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / a406-fixed-deadlines（固定consumer夹具子项） — 87c1381a4461c81f9f948a1796600d019c544349
- 已被别人修掉的：infra-paper-dataset-concurrent-gzip-keyscan-20261018 — 0b240cbd109a5e004f010d9659a871204c455639
- 已被别人修掉的：infra-h0-414-host-fixed-test-stability-20261018 / 21bf-fake-herdr-workspace-deadline（固定搭建成本子项） — 698d3bd20fc95e2791e6fab8d5ad4c2c9e01a5c4
- 没修的：silent-0256：狡诈药水确定生成未建模，容量及出刀顺序未参与方案比较 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0260：普通紧勒后续逐牌失血漏模 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0263：已有虚弱的意图转向后少算1伤 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0266：SL已尝试键排序整轮牌，丢失投斧首牌身份 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：学习者复盘 XTSV1U9JD34T／SILENT A10 F48 T8：decision280547直接end_turn；states286893—286896中32HP／0挡、5能量与手持凋萎，胜前实际受9伤后23HP进入F49。定位turn-solver.ts:3764在evalu — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：学习者复盘9Z9H2EXKLF3T／静默A10 F37：decisions281240/281241将REGRET悔恨写进not_on_selection_screen，大脑据此改删STRIKE_SILENT；states287619牌组索引33、287620实际移除页25项且悔恨位于索 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：学习者复盘GXNKW8X1XYJP／静默A10 F45 T2→T3：sl-attempts1053—1056将原抽牌堆BLADE_DANCE、ACCELERANT、OUTBREAK、SUCKER_PUNCH列为inserted，旧升级键未入手离堆，已知前缀截到19/18/19/18；st — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0308 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0311 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0317 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0319 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0320 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0322 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0324 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0329 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：arch-funnel-guard — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：arch-learning-priority — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：arch-unified-resource-value — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：inv-f33-regression — 独立架构/学习任务，普通纯 bug 批次不实现
- 没修的：silent-0332 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：非阻塞：学习者报告升级 HIDDEN_DAGGERS 仍将弃二误作抽二，未覆盖弃牌/生成小刀分支；当前 live `agent/src/reflex/card-model.ts:921/929/1109`、`turn-solver.ts:1312` 只覆盖普通版。证据 ENKYQMS9W — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0338 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0339 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0344，坚韧之环延迟格挡未接入推演 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0347 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0349 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：core-build-notify-222802-rc2 — 证据不足/原专项保持
- 没修的：silent-0362 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0365 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0367 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：框架/测试收尾：175450的merge-live.py在1200秒外层时限切断尾部paths后，已完成268文件2703例的原件仍自动整套重跑；独立paths11例补验已过，共269文件2714例，却继续长期持live-merge.lock，181302已测修复排队。重跑非零还会自动r — 证据不足/原专项保持
- 没修的：调度公平性核查：watcher19:13冻结registry739项、pending587/waiting100/implemented38/duplicate14；可评估677项中首pending第80位。现有插入序waiting重评可能挤压新项，尚非永久饥饿证明；按真实dispatc — 证据不足/原专项保持
- 没修的：silent-0481 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0487：非阻塞三段攻击模型缺口，仅转录学习者证据 — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：selection-hidden-daggers-conditional-followup-readback — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-vigor-skewer-J2VR（原学习者报告的新模型偏差，非阻塞） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：silent-0339续证（2026-10-17 20:40:08 CST，BXU0CKWKH2RU） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：原模块健康/H1/G2预算完成链续证 U5W7NUE925NK（非阻塞） — 证据不足/原专项保持
- 没修的：infra-v6-refresh-invalid-json-provenance-20261020（阻塞V6开启，原学习链owner） — 证据不足/原专项保持
- 没修的：silent-0533 / 普通撕碎REND条件伤害模型缺口（非进程阻塞，原strategy-proposal链） — 游戏机制/策略及其事实传递，保留既有 strategy-proposal 链，不补游戏知识
- 没修的：ops-worktree-history-disk-pressure-20261013 / 临时目录inode — 独立存储/启动准入专项，涉及父子进程及原actor边界；本批只按任务显式设置测试TMPDIR，未改变生产启动。
- 没修的：live整合 — main/live三方合并预检冲突；已保留刷新数据，未覆盖或混入独立源码；详见live-merge-preflight.log
- 测试：3轮提交前沙箱检查全部tsc 0；每轮Vitest 570文件/5069用例/退出码0；定向撤修红、恢复绿。第3轮两失败题ordinary-close-isolation与ops-autoplay-console均原阈值重跑通过，原full1保留。
- 合入：未合入
- 需要 Roy 定的事：无

```json
{
  "task": "fix-batch",
  "base": "079874c93e34de578bc3a97c7f04a9e7baf42534",
  "fixes": [
    {
      "item": "infra-ordinary-close-candidate-failure-isolation-20261020",
      "commit": "b675eb67f3687fb137434ef9610f1503edbbe8bc",
      "test": "agent/tests/ordinary-close-isolation.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "infra-ordinary-unassigned-tick-no-change-20261020",
      "commit": "ca6897f2e433c9c3bb45d0dad46ba685d864c87d",
      "test": "agent/tests/cadence-no-change.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "infra-manual-learning-notice-ack-scope-20261019",
      "commit": "082cc70bfab2f1f98eb67fc1d441dfd23b6962ee",
      "test": "agent/tests/manual-notice-ack.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "其余角色机制、出牌、药水、SL、终局及结构提案",
      "reason": "策略类；保留既有strategy-proposal链，42项未修逐项见报告。"
    },
    {
      "item": "架构、归因、调度公平性及长检查收尾宽项",
      "reason": "独立专项/太大，普通纯bug批次不混入。"
    },
    {
      "item": "core-build-notify、H1/G2宽性能、V6坏行及生命周期宽项",
      "reason": "证据不足，原失败及原owner待办保持。"
    },
    {
      "item": "主盘TMPDIR默认及inode准入",
      "reason": "独立存储专项；本轮清理子项不关闭生命周期宽项。"
    },
    {
      "item": "live整合",
      "reason": "8处三方合并预检冲突；刷新861eef7dd保留，修复未合live。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 5069
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261020-141320-bc745b0c-1922-4627-a6b2-87bbb103e13c-fix-batch/report.md"
}
```

### 核验与范围

- 队列冻结 SHA256：162b31c4f88521d4dc8a8b5c1348ed16560c40d7468612bcc289a78463f3f0d2；64项未勾选条目的逐项核验见 queue-classifications.json。
- 三项提交只修正尾部Co-Authored-By标记，最终Git trailer解析及完整history gitleaks均0；原提交/元数据初次检查失败保留，代码树和测试输入完全相同，详见commit-trailer-audit.json。
- 七项均复用原已存在源码，在本工作树逐项撤修复/恢复回归后独立提交；原批失败、原日志、报告、异议和通知角色确认保留。
- 仅工程/固定测试夹具，无游戏规则、agent/src、角色知识和发布号改动；code_proposals、implementation_domains均为空。
- 原生配置加载参数 --configLoader native 避免向只读共享node_modules/.vite-temp写入；固定沙箱排除名单保持原样。
- CLI负控撤回消费者调用改动；Herdr负控仅恢复旧夹具搭建步骤，保留回归断言，实际hostCalls=6对期望3失败。
- 初稿消融的cwd错误及两次主动中止的早期检查均保留，不计通过；有效结果以regression-results.json和各提交的完整检查日志为准。
- 第3轮完整检查曾2失败/567文件5056例通过，paths阶段未执行；两失败题按原阈值单worker重跑2通过/6未选。原full1保留，后续降低并行度重跑整套；详见checks-failures.json。
- 未运行play、模型或网络，不推送。学习账本按条目关键词检索无对应条目；偶然匹配的silent-0332为未修资源契约故障，不关联提交或标shipped。

### 源码与检查

- isolation：原源码 798aeb7ceff1d0481453e5968ac152aa9386155a → 本批 b675eb67f3687fb137434ef9610f1503edbbe8bc；整套日志 /home/dw/Projects/agent-sts2/learner/runs/20261020-141320-bc745b0c-1922-4627-a6b2-87bbb103e13c-fix-batch/joint-sandbox-1.log SHA256 3e0241e961625a735ff04a386df1cbf14b5348e1a69af6a839c0b1a4a12f52f3；gitleaks 0。
- cadence：原源码 e8b8c18fe887ff3fd882de0ca0ac2f427e3fe1b9 → 本批 ca6897f2e433c9c3bb45d0dad46ba685d864c87d；整套日志 /home/dw/Projects/agent-sts2/learner/runs/20261020-141320-bc745b0c-1922-4627-a6b2-87bbb103e13c-fix-batch/precommit-2-cadence.log SHA256 ced543fd999e268521f1b9a74f4a69bcc08fc0bb1d230a667a9ad977056bdfd4；gitleaks 0。
- manual：原源码 911c4a1446ca25a5e1f8fbf9518ab21d16177cf7 → 本批 082cc70bfab2f1f98eb67fc1d441dfd23b6962ee；整套日志 /home/dw/Projects/agent-sts2/learner/runs/20261020-141320-bc745b0c-1922-4627-a6b2-87bbb103e13c-fix-batch/precommit-3-manual-retry.log SHA256 4fa695f73017e73550e16fb2111ee5ad4ab762901abac8bb271dff2ed41a9992；gitleaks 0。
