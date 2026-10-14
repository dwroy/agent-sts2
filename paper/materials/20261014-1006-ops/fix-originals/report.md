## 修 bug 回报

- 合并基线：main → be9d851d6da3541c3f464af64cc5aef1d7a776bb
- 修复：补验接口拒绝超过500字符的完整参数化用例名 — f8896692b0d868b900ccffc8ed910321d0f3e765 — 测试 agent/tests/learner-check-continuation.test.ts:retains long parameterized failure names in an exact bounded host supplement — 去掉修复时失败：是
- 修复：ascension-audit-report固定解析夹具反复启动同步Python且丢失退出诊断 — a11e32ae1a01ecf75cc57519be21f2d144c2cd18 — 测试 agent/tests/ascension-audit-output-fixture.test.ts:shares one bounded Python launch across valid, rejected and concurrent report requests — 去掉修复时失败：是
- 修复：strategy-research-scheduling把完整Python验收塞入单个15秒用例 — cd1f5593430a2d13479368679b5d42994540f7c8 — 测试 agent/tests/research-scheduling-fixture.test.ts:preserves all registration cases when total fixture work exceeds one test deadline — 去掉修复时失败：是
- 修复：potion-mc题面重复性夹具关闭采样预算导致整组30秒超时 — 519b63549f1c61276755066e5a76d0351cf09a7c — 测试 agent/tests/potion-mc.test.ts:question fixtures keep repeated seeded samples and finite work with 10000 ms host pauses — 去掉修复时失败：是
- 修复：rollout固定排序/选项/自动动作验收受真实时钟与整组计算量影响 — b68a650ab95c15a492cccac598906f32284229be — 测试 agent/tests/rollout-live-clock.test.ts:ranking replays retain a bounded multi-turn forecast with 10000 ms host pauses — 去掉修复时失败：是
- 已被别人修掉的：无动作死亡战斗归因 silent-0254 — 3b48088dec5fc6eafe576a1296bbdadde43432ee
- 已被别人修掉的：额度恢复余额基线 — e5e2995d659d15af79ec8bba67a4a25c1cb7295f
- 已被别人修掉的：升阶通知使用实际等级 — 8045d9fbf0a12523b1dbe39bbed8af06c7497b09
- 已被别人修掉的：核心通知退出诊断 — 5c92f2aaf0b758a1a5e7d591745694004664f83a
- 已被别人修掉的：未派发策略提案处置 — 3a98e213a826e94f9708af4b1a265e1892659f4e
- 已被别人修掉的：知识缓存固定签名夹具 — 8fbb441eb61eef226eb7366f9612003480c83988
- 已被别人修掉的：固定最佳线路夹具 — bbc5b993a7524bbb8e80a975f204f8d193657b46
- 已被别人修掉的：论文导出Git快照 — 16bfe0bd6ecaa91d04a91c01edc94cecc781f71f
- 已被别人修掉的：boss-sim隔离home透传 — 5921f8cd045853182c867a6430e75c3fcde00a87
- 已被别人修掉的：普通通知ACK — 672e198a4730012330f599068a0ef1efadb02002
- 已被别人修掉的：空失败复盘补链 — 3fdcd77927f01b35c20c6c5c1fcfd790676032d2
- 已被别人修掉的：启动恢复租约身份 — d9983263ffecea1bed4e29d65e7f854a3d2e33d7
- 已被别人修掉的：deck-cap固定夹具 — ec8c578b66bf5498372f1b779ae58a766dff8112
- 已被别人修掉的：共享经验固定FS快照 — 8390c62d76fc8c7d7b6b7292121a621f4666d39c
- 已被别人修掉的：第二策略槽ACK批号 — 15eb85e2934e428c5e299fc4a1aba456d92fd685
- 已被别人修掉的：卡死执行器诊断/受控启动夹具 — 9b6459fd99f26b17689134e33aa85d6190e71d7d
- 已被别人修掉的：Codex长思考/看门狗固定事件夹具 — a18376cce22eb9e47377d474a85fb864f7c636e2
- 已被别人修掉的：策略拒绝路径批量夹具 — df5f2e3fac5db56e3c92a241e2b4a170c6962212
- 已被别人修掉的：V5完整样本回传 — 288f37d323f7ed57eb3faf86beee6bcb8dd354e3
- 已被别人修掉的：宿主补验按精确SHA保留已过分段并只续失败/未运行项 — 24c2e3a75b5db6bac76d6c924f86b7fcd9438316
- 已被别人修掉的：会话退出夹具模型与fake catalog一致 — 874ae603b3927173f805e0b2fe789330bab710c7
- 已被别人修掉的：既有git-push-main入口登记 — c519952b31e3a0bb3acdd2115883ae8671b8a090
- 已被别人修掉的：空受阻经验误派提案补链 — 84366ad06ee4f978394c1b9489a82c83ea12bd36
- 已被别人修掉的：多角色药水表固定数据隔离 — 5ef3c4612bd2673c19968c5a2d24bf62af519ee1
- 已被别人修掉的：实现类量化学习冻结绑定入口 — 3be7be019f714524e34907e452e160596e5bc708
- 已被别人修掉的：原量化任务waiting有界接续 — 66283dd9982bdd7f480da7a4d9bfefea0572a9ac
- 已被别人修掉的：会话前有界恢复子项（上游目录根因未闭合） — bc2c40e313cc36682196277c53c50e30744b88c5
- 没修的：出牌、药水、SL、终局、路线、休息及模型机制条目（含 silent-0308/0311/0317/0319/0320/0322/0324/0329/0332/0338/0339/0344/0347/0349/0362/0365/0367/0461） — 策略类，沿队列已有的独立 strategy-proposal 及原证据链；普通纯 bug 批次不添加游戏判断、不重复登记或派发。
- 没修的：silent-0459 独立 run-plan 请求成本漏计 — 队列明确交既有 silent-proposal-6a39ea0a435755c5 独立策略链，本批不重复实现。
- 没修的：全漏斗/资源价值/核心构筑/学习优先级等宽架构功能与实际消费者闭环 — 太大，属于已有独立实现任务；已修工具入口不等于父要求完成。
- 没修的：v5-dpr-health-20261013 暖池供给/单样本性能父项 — 证据不足以定位剩余性能缺口的确定性执行 bug；取消/零预算/分类/完整样本回传子项已有源码，仍保持300最低、1000目标、11000ms期限及24线程上限，不据测试夹具修复宣称自然性能解决。
- 没修的：sandbox-glob-startup-race 上游目录生命周期 — 证据不足；本批也遇到 retired 目录 ENOENT，原权限下重试读命令成功，不能据此认定删除者或改权限。已修恢复/租约子项不重做。
- 没修的：调度公平性永久饥饿及核心通知实际送达 — 证据不足；队列观测与退出诊断不等于永久饥饿或实际送达，不代写确认。
- 测试：tsc 退出码0；最终沙箱 vitest 382文件 / 3795用例 / 退出码0（threads 381文件3784例，paths 1文件11例）。每次提交前的沙箱脚本及 gitleaks 均0。较早失败后的定向重跑：potions-jev-call自动动作题、strategy-research-scheduling第8组、ops-mod-state非法JSON题均通过；旧失败日志保留。
- 合入：未合入；live锁内刷新知识后基线 243c062d660e0fac8b7dda5e9e73837a97912c29，预检退出码1，16个共享记录文件冲突，源码合并未执行；刷新知识保留。
- 需要 Roy 定的事：无

```json
{
  "task": "fix-batch",
  "base": "be9d851d6da3541c3f464af64cc5aef1d7a776bb",
  "fixes": [
    {
      "item": "补验接口拒绝超过500字符的完整参数化用例名",
      "commit": "f8896692b0d868b900ccffc8ed910321d0f3e765",
      "test": "agent/tests/learner-check-continuation.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "ascension-audit-report固定解析夹具反复启动同步Python且丢失退出诊断",
      "commit": "a11e32ae1a01ecf75cc57519be21f2d144c2cd18",
      "test": "agent/tests/ascension-audit-output-fixture.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "strategy-research-scheduling把完整Python验收塞入单个15秒用例",
      "commit": "cd1f5593430a2d13479368679b5d42994540f7c8",
      "test": "agent/tests/research-scheduling-fixture.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "potion-mc题面重复性夹具关闭采样预算导致整组30秒超时",
      "commit": "519b63549f1c61276755066e5a76d0351cf09a7c",
      "test": "agent/tests/potion-mc.test.ts",
      "fails_without_fix": true
    },
    {
      "item": "rollout固定排序/选项/自动动作验收受真实时钟与整组计算量影响",
      "commit": "b68a650ab95c15a492cccac598906f32284229be",
      "test": "agent/tests/rollout-live-clock.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "出牌、药水、SL、终局、路线、休息及模型机制条目（含 silent-0308/0311/0317/0319/0320/0322/0324/0329/0332/0338/0339/0344/0347/0349/0362/0365/0367/0461）",
      "reason": "策略类，沿队列已有的独立 strategy-proposal 及原证据链；普通纯 bug 批次不添加游戏判断、不重复登记或派发。"
    },
    {
      "item": "silent-0459 独立 run-plan 请求成本漏计",
      "reason": "队列明确交既有 silent-proposal-6a39ea0a435755c5 独立策略链，本批不重复实现。"
    },
    {
      "item": "全漏斗/资源价值/核心构筑/学习优先级等宽架构功能与实际消费者闭环",
      "reason": "太大，属于已有独立实现任务；已修工具入口不等于父要求完成。"
    },
    {
      "item": "v5-dpr-health-20261013 暖池供给/单样本性能父项",
      "reason": "证据不足以定位剩余性能缺口的确定性执行 bug；取消/零预算/分类/完整样本回传子项已有源码，仍保持300最低、1000目标、11000ms期限及24线程上限，不据测试夹具修复宣称自然性能解决。"
    },
    {
      "item": "sandbox-glob-startup-race 上游目录生命周期",
      "reason": "证据不足；本批也遇到 retired 目录 ENOENT，原权限下重试读命令成功，不能据此认定删除者或改权限。已修恢复/租约子项不重做。"
    },
    {
      "item": "调度公平性永久饥饿及核心通知实际送达",
      "reason": "证据不足；队列观测与退出诊断不等于永久饥饿或实际送达，不代写确认。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3795
  },
  "code_proposals": [],
  "implementation_domains": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-071302/learner/runs/20261014-071328-fix-batch/report.md"
}
```


报告证据与边界（不关闭原父项）


开工工作区干净，先合 main，结果 Already up to date；冻结队列为 fix-queue-at-start.md。15个修改文件的冻结SHA与最终全套检查及提交逐值一致，agent/src、生成知识和对局预算无改动。原生会话 gpt-6.1-sol / xhigh 已核实际 turn_context，回执 native-session-receipt.json。

- f8896692b0d868b900ccffc8ed910321d0f3e765：撤掉源码修复日志 long-name-without-v2.log，退出码1；恢复后 final-fixtures-with.log、bounded-boards-final.log及 gate-commit-long-name.log通过，提交前 gitleaks-commit-long-name.log无泄漏。
- a11e32ae1a01ecf75cc57519be21f2d144c2cd18：撤掉源码修复日志 audit-without.log，退出码1；恢复后 final-fixtures-with.log、bounded-boards-final.log及 gate-commit-audit.log通过，提交前 gitleaks-commit-audit.log无泄漏。
- cd1f5593430a2d13479368679b5d42994540f7c8：撤掉源码修复日志 research-without-final.log；另 research-clone-without.log 验证共享基线复制，退出码1；恢复后 final-fixtures-with.log、bounded-boards-final.log及 gate-commit-research.log通过，提交前 gitleaks-commit-research.log无泄漏。
- 519b63549f1c61276755066e5a76d0351cf09a7c：撤掉源码修复日志 potion-without-v2.log，退出码1；恢复后 final-fixtures-with.log、bounded-boards-final.log及 gate-commit-potion.log通过，提交前 gitleaks-commit-potion.log无泄漏。
- b68a650ab95c15a492cccac598906f32284229be：撤掉源码修复日志 ranking-without-v2.log，退出码1；恢复后 final-fixtures-with.log、bounded-boards-final.log及 gate-commit-ranking.log通过，提交前 gitleaks-commit-ranking.log无泄漏。

完整验收：gate-final-retry.log，对冻结最终15叶运行 SANDBOX_WORKERS=3 bash agent/tools/test-sandbox.sh --retry=1 --reporter=verbose，实际退出码0，381+1文件/3784+11用例，包含paths。前几轮失败和一次检查期间输入变化的无效结果均保留，未将它们写成通过。原自动动作定向重跑44510ms，第8组重跑796ms，非法JSON重跑288ms；第8组试验性子过程10秒上限已撤回原30秒，外层仍每组原15秒。

逐项提交门禁：每次提交前运行沙箱脚本（含生产tsc及该固定回归/paths），每次退出码0；最终全套覆盖同一冻结源码。共5次秘密扫描均无泄漏，不设仓库身份、不推送。

负对照仅撤源码修复，测试保留；研究用例另撤共享仓库模板复制，固定新增测试报 unexpected Git setup subprocess。所有恢复均完成，工作树干净。

账本：只经根目录 learner/ledger.py find --kind bug-infra 查 ascension-audit-report.test、rollout-live.test、strategy-research-scheduling、host supplement、potion-mc及605；最后一项命中7条无关游戏经验，其余未找到本批对应工具条目。未新建账本、未标shipped。无新策略代码提案或游戏行为域，无新增eval版本及规则双通知。

合入前 live SHA（刷新知识提交之后）：243c062d660e0fac8b7dda5e9e73837a97912c29。本分支 knowledge/backtest 路径差集为空，预检冲突为共享记录，不覆盖知识或并行记录。merge-live.log、live-precheck.log、live-before.txt 保留；按第5节冲突即停，未执行实际源码 merge，未写上线记录。

- notes/fix-queue-v4.md
- notes/lessons.md
- ops/inbox-dev.md
- paper/data/README.md
- paper/data/commits.csv
- paper/data/cost-curve-silent.csv
- paper/data/cost-silent.csv
- paper/data/cost-sources.json
- paper/data/cost-unattributed.csv
- paper/data/decisions_by_label.csv
- paper/data/learning-curve-silent.csv
- paper/data/runs.csv
- paper/data/summary.json
- paper/data/verification.json
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl

旧修复范围逐来源27项见 already-fixed-audit.json，均为合并基线祖先；deck-cap采用实际main集成 ec8c578b6（原源c0999eaa2），不冒称原非祖先提交已整枝合入。记录中的旧failed/rc0/merged=null、未覆盖的自然性能/消费者及独立策略owner保持。

本批开工后追加的新队列记录不改原活任务输入；已读当前记录，只继续原冻结普通夹具范围，未做回收功能或删除现场。标准自动回收由原调度器处理，自身仍运行时不删除工作树。
