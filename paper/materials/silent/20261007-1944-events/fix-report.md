## 修 bug 回报

- 合并基线：main → 3cb3c7cf0a8d09c198bf89caf9b95aa3f3fef61f
- 修复：升阶审计完成报告裸JSON兼容 — 0605d15ac09966a6d34ba96ef29be03312195ccd — 测试 agent/tests/ascension-audit-report.test.ts:reads the leading audit JSON before the launcher summary — 去掉修复时失败：是（2败/10过；恢复12过）
- 修复：升阶审计独立工作树报告目录 — b522f1fbd624b260db0f565689272d16c3f3a633 — 测试 agent/tests/ascension-audit-path.test.ts:accepts the preserved report in this batch's registered independent worktree — 去掉修复时失败：是（2败/16过；恢复18过）
- 修复：恢复rollout固定时钟夹具 — 955941fa54e7787576baa47e0669308284f89543 — 测试 agent/tests/rollout-live-clock.test.ts:keeps the fixture budget assertion after a simulated wall-clock pause — 去掉修复时失败：是（2败/0过；恢复2过）
- 修复：恢复silent-0229铁蒺藜荆棘接线及后续轮 — db6e32d2ee101af6b53f8228c27165bb41f04811 — 测试 agent/tests/silent-caltrops.test.ts:CA5 F9 T6: the seven action damage and three enemy-turn damage stay separate — 去掉修复时失败：是（5败/2过；恢复7过）
- 修复：silent-0234 HAZE群体施毒漏入卡牌模型 — 20b04517393708c73912326bb35d8448d1b3f77e — 测试 agent/tests/silent-haze.test.ts:F6 T1: plain Haze applies four poison independently to both enemies — 去掉修复时失败：是（5败/1过；恢复6过）
- 修复：无新增源码策略报告误限主检出目录 — 2b68fe48b607e58a83137d08c6c59dbd25275f98 — 测试 agent/tests/strategy-no-change-path.test.ts:accepts the observed 28 dispositions under the batch worktree — 去掉修复时失败：是（3败/21过；恢复24过）
- 已被别人修掉的：142项，每项源码祖先核实并确认本基线增量未撤销；完整条目/提交映射见下附表与 already-fixed.json。
- 没修的：Codex 大脑缓存命中低及实测对比 — 证据不足：离线禁止真实LLM/网络；未确定固定根因，保留原行为；mod 请求超时约10–13秒自愈 — 证据不足：缺固定可复现根因，不能改游戏/mod或据短暂超时报卡死；boss 整场模拟性能及 CPU 争用 — 太大：独立性能分析；未降低预算、精度或排除测试；出牌、药水、SL、终局、路线、休息策略项 — 策略类：沿现有学习者代码提案交独立 strategy-proposal；已有授权不需新增审批，缺数据保持；B4/B5 自动化及 A10 双boss/四处补强 — 独立已授权功能：既有专项继续，普通纯bug批次不重复实现或派发；silent-0237 神化状态传播 — 独立提案已待办：silent-proposal-89354805ee4d7e77、silent-proposal-283a164780d11e69；当前源码仍缺传播，沿共享租约不重复派发
- 测试：各源及合后 tsc退出码0；合后 vitest 239文件/2511用例/退出码0。首轮临时.ts初稿被check-imports扫描导致失败，保留并更名.draft；4worker下rollout-live.test.ts:253排名等价用例120秒超时，2worker整套重跑通过（79.549秒），其后每提交前及合后检查均通过。
- 合入：f9db52c1ed7af16d019e32528953e5ffcc8e08f0；已测代码合并 0d586e685f4f683ff7de4a7c3eee0717efa16a56，版本 S1.fix45，合前知识刷新 4ab2a3399413e24dd66e3ec3957e8a29001e7b90 及全部并行记录保留。
- 需要 Dai 定的事：无。

```json
{
  "task": "fix-batch",
  "base": "3cb3c7cf0a8d09c198bf89caf9b95aa3f3fef61f",
  "fixes": [
    {
      "item": "升阶审计完成报告裸JSON兼容",
      "commit": "0605d15ac09966a6d34ba96ef29be03312195ccd",
      "test": "agent/tests/ascension-audit-report.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "升阶审计独立工作树报告目录",
      "commit": "b522f1fbd624b260db0f565689272d16c3f3a633",
      "test": "agent/tests/ascension-audit-path.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "恢复rollout固定时钟夹具",
      "commit": "955941fa54e7787576baa47e0669308284f89543",
      "test": "agent/tests/rollout-live-clock.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "恢复silent-0229铁蒺藜荆棘接线及后续轮",
      "commit": "db6e32d2ee101af6b53f8228c27165bb41f04811",
      "test": "agent/tests/silent-caltrops.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "silent-0234 HAZE群体施毒漏入卡牌模型",
      "commit": "20b04517393708c73912326bb35d8448d1b3f77e",
      "test": "agent/tests/silent-haze.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "无新增源码策略报告误限主检出目录",
      "commit": "2b68fe48b607e58a83137d08c6c59dbd25275f98",
      "test": "agent/tests/strategy-no-change-path.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "Codex 大脑缓存命中低及实测对比",
      "reason": "证据不足：离线禁止真实LLM/网络；未确定固定根因，保留原行为"
    },
    {
      "item": "mod 请求超时约10–13秒自愈",
      "reason": "证据不足：缺固定可复现根因，不能改游戏/mod或据短暂超时报卡死"
    },
    {
      "item": "boss 整场模拟性能及 CPU 争用",
      "reason": "太大：独立性能分析；未降低预算、精度或排除测试"
    },
    {
      "item": "出牌、药水、SL、终局、路线、休息策略项",
      "reason": "策略类：沿现有学习者代码提案交独立 strategy-proposal；已有授权不需新增审批，缺数据保持"
    },
    {
      "item": "B4/B5 自动化及 A10 双boss/四处补强",
      "reason": "独立已授权功能：既有专项继续，普通纯bug批次不重复实现或派发"
    },
    {
      "item": "silent-0237 神化状态传播",
      "reason": "独立提案已待办：silent-proposal-89354805ee4d7e77、silent-proposal-283a164780d11e69；当前源码仍缺传播，沿共享租约不重复派发"
    }
  ],
  "merged": "f9db52c1ed7af16d019e32528953e5ffcc8e08f0",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2511
  },
  "code_proposals": [
    "silent-proposal-64053b2a68241a20",
    "silent-proposal-461611b6b36e2d4c"
  ],
  "implementation_domains": [
    "combat"
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-173847-fix-batch/report.md"
}
```

验证与证据

- 审计解析：20261007-154303-ascension-audit原开头裸JSON加运行器尾注；层/回合不适用。拒绝嵌入示例、错误task和非对象，保留最后合法围栏优先。路径只验批次/请求共同登记的.worktrees/<tree>/learner/runs，真实第二审计20261007-171303的10局/coverage/3提案固定回报已补验；越界、符号链接、相邻树、缺文件/覆盖/证据/提案和迟到租约反例保持。旧failed/out/err不改。
- 策略无源码验收：20261007-170244-strategy-proposal，原base c992b5300b6481fa826c9b5d801bdde005cdc8b4、28项duplicate/waiting、fixes=[]、merged=null；仅受限本批.worktrees/codex-dev/learner/runs现存Markdown放行，base/干净树/每项处置检查保持。纯infra，层/回合不适用，账本find无bug-infra对应项。
- rollout固定时钟：复用未进入基线的93c253fbccef6b3e482eca661cbcf546ed1bd788；夹具0nzb-f25-t1-brand及20261007-121034-fix-batch边界失败，非游戏机制证据；生产1500ms预算/1800ms阈值保持，真实推进的截止降级另测。仅测试变更。
- 铁蒺藜：复用未进入基线的be0df8cd17319dbae0d51c421ccad62b2cb8228b。学习者本批核对只读日志CA5KE8GFJ9X2 A10 F9T6/F13T1及两完整手牌；ThornsPower=3与THORNS_POWER=3，行动7/15、反伤3分别结算。仅silent普通已见值接线，后续rollout/fullFight持久，不重复已有荆棘，无攻击轮不触发；silent-0229，仅CLI proposed、源提交追加，未自行shipped。
- HAZE：本批流式核实DUZUBAJ3A8GP的623帧，A10 F6T1普通4、多目标；F27T4/T5升级6，毒2→8/7→13和后续扣血帧对应；首证T082DRCUHRRD A0 F46T4。仅输出已见poison字段、复用原Artifact/群体目标/结算/减层，非即时伤害或策略权重；silent-0234仅CLI proposed。固定fixture不读任何每局刷新知识。
- 铁甲、其他角色、未观察升级参数等价；无整场反事实，不声称修正局部6毒/3反伤能转胜。不增加药水、SL、终局价值或排序规则。

每次提交前原沙箱入口

| 来源 | 红测试（失败/通过） | 绿测试通过 | tsc | vitest 文件/用例 | 退出码 |
|---|---|---:|---:|---|---:|
| 升阶审计完成报告裸JSON兼容 | 2/10 | 12 | 0 | 234/2453 | 0 |
| 升阶审计独立工作树报告目录 | 2/16 | 18 | 0 | 235/2471 | 0 |
| 恢复rollout固定时钟夹具 | 2/0 | 2 | 0 | 236/2473 | 0 |
| 恢复silent-0229铁蒺藜荆棘接线及后续轮 | 5/2 | 7 | 0 | 237/2480 | 0 |
| silent-0234 HAZE群体施毒漏入卡牌模型 | 5/1 | 6 | 0 | 238/2486 | 0 |
| 无新增源码策略报告误限主检出目录 | 3/21 | 24 | 0 | 239/2511 | 0 |

原件与上线

- 红绿原件：audit-parser、audit-path、clock、caltrops、haze、proposal-path的-red/-green.log；Python流程24例通过。每提交前gitleaks阶段扫描0，各源都单独提交，不推送。
- 首轮audit-parser-sandbox.log失败、audit-parser-sandbox-retry.log的4worker超时、retry2成功均保持，不改写旧失败。所有临时初稿更名.draft，未增加排除、放宽断言或改变生产预算。
- live先在锁内提交刷新665de446d6d3b0e62e3817755e4f38c0765391e4；初次因预存生成角色backtest停止未合代码，随后并行运维自行保存；未编辑其文件。最终锁内先保存九份最新刷新为 4ab2a3399413e24dd66e3ec3957e8a29001e7b90。最初记录预检冲突及多轮50秒锁等待保持，最终锁内刷新重叠检查、正式合并、原沙箱检查和上线记录按原流程完成，不停对局、不运行play。
- 实际合并/检查原件：live-pre-merge.txt、live-merge.log、live-code-merge.txt、live-sandbox.log、live-release.json；刷新/上线gitleaks日志保存。未改知识生成脚本，不需要重建数据。
- 代码提案 silent-proposal-64053b2a68241a20, silent-proposal-461611b6b36e2d4c只经根code_proposals.py CLI登记，implemented_commit为实际live祖先源码；不代替账本shipped。来源fix-batch、链接strategy-proposal、领域combat。根notes/for-dai.md和ops/inbox-dev.md已同时追加旧/新行为、证据/账本/任务、预期及回退，运维据完成事件核上线并CLI shipped；调度器另补完整外部tsc/vitest。

已修条目与来源提交（不重复修）

- 旧V4.1纯bug批次 — 已修，提交 531d15444f5e9c29d85d36ff098f3fbf33e647af。
- fight-value wrapper — 已修，提交 aba384cc503e53001933fceb688e9d2c24442b19。
- 旧大脑失败日志及JSON解析 — 已修，提交 6d2ce32a6bf3b7771d93355d7a55eff634785870。
- 旧大脑解析补项 — 已修，提交 81de842c8459b425059cf8bc7c1df920d0164ef9。
- 执迷锁牌 — 已修，提交 8f1106a122c871d28b038fe464f9d9a2f2b106d8。
- 波纹水盆 — 已修，提交 d561ecde5ed8e537653ef544c8c9fd44f8cba37e。
- Codex完整剪裁答案 — 已修，提交 a296b309fe28e189bc925c8c5472616ec29fe37d。
- SL统计及状态闭合 — 已修，提交 af6f07adfee1ad62ec85d613ab36a7b11857ce89。
- 沙坑连续斩杀 — 已修，提交 85d1e70744489411a597b0b2b6710a45fbe52aa1。
- 刀刃陷阱 — 已修，提交 066f91599bc45161acd0b741a2d3fd8e39af8bfc。
- boss时钟角色隔离 — 已修，提交 8948a2fb87ab90949b2464c59bf6569bd5f3931d。
- fix-batch任务模板 — 已修，提交 5805dd187b7913a53b9e2645f40db1657eb5213c。
- 经验模板及默认live — 已修，提交 16ebc4aecb12a1d4b2f34ee767bb2816a3a0b466。
- 角色中性前缀 — 已修，提交 6d2de57ceae3def4caf073951ed9d2f9d1544cd7。
- 流式大日志prompt dump — 已修，提交 6ee8e2a2c1edc31492962137b96af8c6e1d12093。
- 自动经验派发 — 已修，提交 32c3f998bd3dc218f3fcafce5e48ced986445b7e。
- 沙箱测试/完成事件及Inferno夹具 — 已修，提交 5c307224cd7ca34b249acd24f5c050a418a32c6f。
- eval-metrics动作 — 已修，提交 ef46d720c74909aecff9a09ff7e6d443e06cd9d7。
- 暴露易伤 — 已修，提交 62e1166475a715f84c4bfe8acd102762b5a3e50e。
- boss跨SL统计 — 已修，提交 3f40af6fffbb37a06e258c0e4b314a9fe8faaede。
- 融入暗影 — 已修，提交 82c50cc0e41d4206ae272c76a97fbcbe783827a9。
- 腐蚀波 — 已修，提交 53cc31f453ef441d3770dd7598e3b7f071ea14c5。
- 悔恨 — 已修，提交 3fcb1f5f0c373a04feb807aa9b2bedebe403edcc。
- 灵动步法 — 已修，提交 d8a2b0090ba8145c0b6d20bcae700006f01e2c79。
- 余像 — 已修，提交 e0541ebc4a8786250d08869731fa07d303c0c8b8。
- 暗影步 — 已修，提交 90b1fbebf38f9896ad14ffa1ace80ce9e3feb013。
- 胧光怪召唤 — 已修，提交 1e076b173c6874cef4bf90fd13cd3eb33355827a。
- 毒模型 — 已修，提交 f6c5504a73b2ee3702812a5217dfcda8b14e18aa。
- 跨SL实验体阶段 — 已修，提交 4ed3c72df30f27b881da637aebf528b97440e0bb。
- tsc运行归档排除 — 已修，提交 7bc835803f2efd44a5cc6f2009933f3c3bee7653。
- outcome-stats刷新缓存 — 已修，提交 2650aed8baa84b8cf26e1e98b975582a6d5ab537。
- 萎靡X减益 — 已修，提交 0d7465a0962f4e0234530bb390da6ab0fcd5f8e2。
- 首次开局时间判断重犯 — 已修，提交 2610945b6a2f9ea02cf3a7cd4b5980d24814ac39。
- 撕咬共享成长 — 已修，提交 8ffd62ef082e59d53440ca9f9eb34184df832157。
- 风的女儿 — 已修，提交 907a19f8d03ede74ed135c0395d120ed84232358。
- 奖励屏较低终帧 — 已修，提交 098a54719bae87b909b25174a73ccebd68a17a61。
- 策略任务及派发 — 已修，提交 afd652a3f75df6e7403439f01c565220327884da。
- 兜底完整补测 — 已修，提交 f670884a188a047bbd3f7f007c260ade62fae36a。
- 单次超时卡死误报 — 已修，提交 a4f4ec868d122dc92af510862c6240cf2eaff2b6。
- 学习状态锁 — 已修，提交 233ede56047274ba53a4e1191a245fac816c37a8。
- 账本来源更正接口 — 已修，提交 87c89b7aea90c7275e0fbb04b1e4148a4209630c。
- 预判临时敏捷 — 已修，提交 cd55a88517ed1d44c3f8bf64e0c9f2ab14ccb2e2。
- 计算下注 — 已修，提交 3cd9fc6c6b6bfa378508f7bd5ca2219c1088ad39。
- 涂毒 — 已修，提交 e3e7068b028e9d9bb75441b99a973161e9d90f4d。
- 动作说明与静态回归 — 已修，提交 ed86d537bc1d6f91364abb77156060edb13ab4ba。
- 药水测试数据隔离 — 已修，提交 e78352f784d39cf25671446348daaada6ef2060b。
- 异蛇头骨毒雾触发 — 已修，提交 166594ed6b0a0fb206a6cee40bfb208da142d5f1。
- 脆弱下新增敏捷格挡取整 — 已修，提交 71af970600794f87a993df428cdde14dd7809dd7。
- Codex会话模式隔离误拒子项 — 已修，提交 35565208b4eaae0039daa30abd964c8ef8b0d66a。
- boss后构筑模拟与低胜率题面 — 已修，提交 de5dd9f17b9bec09934fc3ed2b63082f5d520b5d。
- 钢笔尖 — 已修，提交 26c1e77269e098f52e215b98f5d4127d17c4fc95。
- 魂缚锁牌 — 已修，提交 2864d3612722571bfaf69382435acc4c8800f8c3。
- X费串刺零能量 — 已修，提交 7e69e6731b2e66268991b6cd82928a165139bc56。
- 滚石回合开始稳定等待 — 已修，提交 c301574ee9cfb2018a39b6a15692efb2948241b4。
- SL重载接受战中选牌屏 — 已修，提交 0660f9972e2edce46b637713863acb62a3400f20。
- SL敌人分节名字 — 已修，提交 7564be3661d759ddb6c0595dc940f57567f32807。
- 无惧疼痛判官虚无格挡 — 已修，提交 a677f159027f3d761067d07d5fe6f41f23e1a70b。
- 果汁持有时B3合成开局 — 已修，提交 7f4759dd3f863ab989ad25f1e6c35699a3979c60。
- 蜥蜴尾巴首次路径 — 已修，提交 8c93fa43927760be3088e1e7fc7dbdd7c0851edf。
- SL手牌回合末伤害 — 已修，提交 491eaeb5bfb6e779cfe853e1e0e5faddf9f29ef3。
- SL已知抽牌与随机目标 — 已修，提交 3c95965ce77827b5864254ea46dc25275dff5810。
- SL下回合自身失血判官 — 已修，提交 fcc89d85209f7855845fc99f315fa1d08cbfd2f7。
- SL探寻打击与回放 — 已修，提交 914515cf46390020ff8da4c8a2f1bc50ef0e4652。
- 抽牌自身失血/上限判官 — 已修，提交 79ef4eb0446ef3c15d65689c3de756261da19456。
- least-loss回合内自杀 — 已修，提交 08ec8f98fcd9a43df332a5d858c50faf9e9d214a。
- SL抽牌换线与首战去重 — 已修，提交 cab3c3f4f4b9d669a091ed7581c34299e2e92b52。
- 缩小伤害 — 已修，提交 b0e96183a8798c77676fe83f386042abf2851254。
- SL整回合去重与护手药水费用 — 已修，提交 f4f4b0d3b666b3802114380bf3a7a4ca6df7cb70。
- 尾巴复活后继续受伤 — 已修，提交 91e2219b47f9fc57cede5bf6465111e27a192319。
- 巨兽自爆与沙坑判官 — 已修，提交 0727c1cd2d44801b02ed82a36056e166d2ef200f。
- SL药水位置去重 — 已修，提交 61d236ceeb38a0752da47e15a9d35bd7fc0cf12f。
- 小刀出牌目标 — 已修，提交 7023574b375743bb02ff8150952ac9ee5904723b。
- SL重放/混沌牌堆顶 — 已修，提交 554951daa4908ad2a0116fa9ac928cfbc82a8508。
- 狱火判官多层失血 — 已修，提交 3dfc2af7438ce075d80044a7ce4f2675193dab7f。
- 狱火求解器多层失血与开局稳定 — 已修，提交 03eedec0b340e6f67363f59d14e3342811af53ff。
- SL剑柄打击断序与引擎题面 — 已修，提交 ed03f4cee65e1ace987b0aa772b503180b90cabd。
- SL换线执行/最佳参照 — 已修，提交 8939eb0e7511559a765f393a3adf8cc7512d5492。
- 乱码路线字段与换线实际一致性 — 已修，提交 0b12aa1a34c6403cdf64e9f92ac7f09c2617ab0f。
- 进程扫描竞态假stall — 已修，提交 9692ea6d632162edbd674fa6d83344e380d15e1b。
- 知识前缀变化误判配置变化 — 已修，提交 d6af9894e4d990db6bbffe08ab4e01044605c52c。
- 旧事件选项屏重问 — 已修，提交 25ce09bee5576b1adff8baf196fbe8b197a5ef11。
- 未校准静默时钟事实子项 — 已修，提交 79f7579e29e39e1dcae9e1ea3bdceb53bf9a734b。
- CARDS_VIEW覆盖层重复决策 — 已修，提交 518b6880b46db88752f3666ff8471267c3f6638d。
- 静默阶段结束事实子项 — 已修，提交 1d57f9d0dbbb63603e9ce9768e74cb2021478464。
- 幻影之刃同方案首刀增伤 — 已修，提交 d65609ff2bc98ec5ec2e06b558159aba89d93032。
- 音叉技能计数漏算7挡（6EV5V6PJJS9D F39 T3；T082DRCUHRRD F12 T7；silent-0108/0072） — 已修，提交 dba8d7caf9f2b44dd2fd11fd8861ecc14be4c09b。
- 融入暗影+升级分支 — 已修，提交 2184caaab265ebf86c0627aaef39c2e7a170a990。
- 预判+升级分支 — 已修，提交 d91f9600286a67480b5044e019dbb1041e2239af。
- 策略任务xhigh测试契约 — 已修，提交 d73a29ad5185ae2669260f3e4b1b9e693a122e97。
- 爆发增益未进入后续技能推演（silent-0114） — 已修，提交 dce7dc19c15f8cd1de57a5fffb2011ca1aac2187。
- 持续安全订阅额度采样及周/五小时窗口映射（Roy批准架构） — 已修，提交 bd41843192173de8344e805de45bfde74b9cfa5c。
- 五组件token与成本归集、论文表和累计曲线（Roy批准架构） — 已修，提交 637ed9dc0ef71177cdb480eceacbf7ab2c8988e4。
- 升级爆发2层技能重复漏入推演；VN7RQJMJEFMX A6 F27 T6、机制silent-0115 — 已修，提交 dafd280bc04f10573cf4205d55e5b80e1400be03。
- 额度/成本测试在未设置TMPDIR时失败 — 已修，提交 6bfbe3d2e2aa6e5e8c1969d5ee1cca08671ae02a。
- 补齐成本分层：日志库组件用量/规范额度日志/每局刷新/未归属学习批次（Roy批准架构） — 已修，提交 83b73312a420f4aff612f017a95dfebace562a4d。
- 旧血量护栏 setup 例外失效子项 — 已修，提交 984b950b3a1f8e099f4a199041eb49635f210a0d。
- 钗 SAI 格挡漏建模 — 已修，提交 16e0b16a3f0c11f6837e02cd9b8e22be841af19b。
- 迷失鬼火逐能力伤害漏建模 — 已修，提交 c68bf255a5ca8da5806ec89f6f4f1e704590d3f4。
- 尾巴回合末复活追踪与 GAME_OVER 虚假 SL 记录 — 已修，提交 e32c8b7584181486ffcf3b70c0ec4f9a5608c17d。
- Jev计价及TypeSafe全部角色日志核对 — 已修，提交 80199dcc3f7a66bfceeb7d8c028c6c3bad935b7c。
- 缺眩晕后继/伤害预测标未知（silent-0127） — 已修，提交 631f94856702772a4bc5e27d38ddfc140fb0d714。
- Inferno测试首次读取/真实时间竞态 — 已修，提交 195869aa77dc216de08e6d1c5842782b239cb670。
- 单行动重复扣挡 — 已修，提交 779c954876d56d08dab92f89f27345c9788e3d87。
- herdr关闭注册表竞态 — 已修，提交 526b71cc316bc1824b76500b7003a9c02a725b60。
- 02:40/03:00预算硬截止与单调时钟传播 — 已修，提交 9889436c3b332a3984cdb7f850a1349f464182d1。
- 升级腐蚀波3层抽牌施毒（2PVLGRBGUX9S F48首T11；silent-0076/0137） — 已修，提交 a62cf381f26435693ce30548c9433d219f750b02。
- 静默专长科学2力2敏捷（2PVLGRBGUX9S F48首T2/T4；silent-0136/0138） — 已修，提交 32daefc69239c5d23741f35e2f5ce71bef25ebce。
- 升级萎靡X+1（LLYSRQQ35AVW F33 T3/F38 T1/F48 T2；silent-0144） — 已修，提交 d48d16129b10e5060dc9d33a1b96e3340c7b82b8。
- 空批次被误标失败 — 已修，提交 01b560ef4966da945511bfccd41abd09440fb0e9。
- 再次上线后的重犯统计 — 已修，提交 af5c0fa041fbc5b97174490137301a6f6291d92d。
- 隐秘匕首弃牌/小刀语义 — 已修，提交 b7f081fcc26da4506cb775739bb118cb6cbe4ecc。
- 连续Boss后场血量投影 — 已修，提交 3fe6251b746cebe816b9db3c0d8aa9d6090bec0a。
- 精确切击五/六手 — 已修，提交 8b9bacbebb20eaaa1133a9945da6c7abfcda745d。
- launch-game成功判读 — 已修，提交 db388125843120321c420cc001503928e17cb5da。
- mod-state截断及broker UTF8 — 已修，提交 61a921844ff5eb6c08c2e209b9f39ef42cc0d9d3。
- 余毒支配比较 — 已修，提交 c9aef94df27d100a7e3d32e100d555248dd6be97。
- 精确切击已观测力量范围 — 已修，提交 995a345f935efd6d8ae9f67d16bd2653833344d0。
- 毒结算9点上限 — 已修，提交 084815374e747cccb3e74bb39002beb1be6ca9f6。
- 钨合金棍逐次减损 — 已修，提交 4367250b5fbf1484ca7ea8f312d13e4ce9d327a2。
- 士兵翻倍预览消费 — 已修，提交 19e41a26648542b7ad0bce4e70b55f30be532d49。
- 飞镖方案内技能离手计数 — 已修，提交 72c1640b3271352e1a744d3997ede4c5fe10e2bd。
- boss-clock历史测试输入隔离 — 已修，提交 38e95b24efafb862fc09b1fd026626acf481c47d。
- 单行动题重复折减现场虚弱伤害（silent-0191） — 已修，提交 c39102521f91e1e95b886935cf27cc8c23d0bf65。
- 臂甲在脆弱下的待触发识别失败（TCFAHJ9K19VY F17首战T2；silent-0192） — 已修，提交 ec1ceef3acbc168cf03c73c9fb38226b4a0b63b8。
- 结实绷带弃牌格挡未接入方案推演（silent-0193） — 已修，提交 3a4c5626434efc909122483769468bba953d63c1。
- SL判官遗漏毒伤触发阈值眩晕（silent-0195；KUZVERN40NGK F17第3次T5／第5次T6／末次T6–T7） — 已修，提交 f6ff3a9ce42337972b19ee227b2d51432e929f50。
- 生成牌即时评分遗漏收场使用条件（silent-0197） — 已修，提交 62b0e23f0a45b2f331261947cbc9168dde36e39a。
- 永冻首次能力7挡（silent-0172） — 已修，提交 157d635cd9e9880d7396e76a15594c6e7f0b0253。
- 重放附魔的额外打出漏入跨回合凋萎累计（silent-0199） — 已修，提交 1ab1ba8dc446e5a12dec0396528c9b2a5b478fe8。
- 羽化生成到抽牌堆被误算为即时抽牌（silent-0202） — 已修，提交 129853b817c0e985e222b09385a9bfeb0562ec7f。
- 升级预览消耗关键词 — 已修，提交 62ee292c7a66466e996424910338aaea8aae6308。
- 勒紧同方案格挡 — 已修，提交 1912b5e0c2c9d87622f6915d8a299f0ef6222588。
- 蛇咬施毒 — 已修，提交 06bb4617e92d4ea5cf75287186223a5b185e4ae3。
- 已建模中毒八折 — 已修，提交 ffa23c2fba13c1fad114bbdc27dbc8c32f2d8fab。
- 静默boss独立校准功能 — 已修，提交 cdf75af64fb5b118a5a808ecb3b05e2a05991c36。
- Codex-only独立功能 — 已修，提交 d6f05cdabc17b3b82df06bf96d76a2745436da8f。
- 13:31真实时钟测试夹具 — 已修，提交 3d6340e00f3ca05dd526012ccede35268b65eda8。
- 完成报告裸JSON兼容 — 已修，提交 6f86ff6b6b971fb38b96308ebdd34dec574e5b13。
- autoplay安全热交接动作 — 已修，提交 71b835a3150704548fab2ad46e74bde240ccf1f9。
- 历史测试入口漏传日志回调 — 已修，提交 ccd8bb8e017da9c30b408138d04e6d2bc985836d。
- 额度等待提示旧测试契约 — 已修，提交 1cf0490492bd8a430b85f95f3fdee91eba251191。
- 毒结算漏滑溜限伤及减层（silent-0226） — 已修，提交 9c19ce71a149300442b01adcfa50df543bc8a7f1。
