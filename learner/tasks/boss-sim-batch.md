---
title: Roy 已授权逐角色逐 boss B4/B5 自动批次
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: live
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# 自动批次 {{batch}}：只从本角色日志核实、校正和验收

角色 {{character}}，独占工作树 {{worktree}}，只读日志 {{logs_dir}}，临时目录 {{scratch}}。
触发证据文件：{{evidence}}。先保存文件副本与 SHA256，核实 character/boss/mode/key；这不是人提供的游戏机制。授权：Roy 2026-10-07 12:11/12:35，{{project_root}}/notes/fix-queue-v4.md「B4 / B5 纳入标准流程」和 docs/boss-sim.md §13/14。不需要 Roy 再拍板。不得通过其他工作树另起后台批次。先确认干净、保存 base=HEAD、合 {{base_branch}}，读 README、最新 STATE、decision-log 末尾、学习协议及上述授权原节。

1. 从本角色原日志核实触发局号、回合、偏差和逐回合场数，记录原始字节偏移/哈希与 SL 实际结局及截尾口径。角色/boss 分账，不读其他角色知识。缺证据不补机制。B4 对照逐回合的来袭、打穿、血量、意图/状态和模拟，定位可证实的偏差。B5 保持原 tune keys/切点，新局只进 val；核对实盘整场预测、只在 tune 试模拟策略、评估 B2 排序潜在收益（配对种子、并列口径），全部固定输入留档，验证集不能调参。
2. 校正范围严格限制为 fullFight 分支/模拟专用字段：agent/src/sim/boss-sim.ts、agent/src/reflex/rollout.ts、agent/src/reflex/rollout-live.ts。其他实盘源码不可改，新增字段必须证明实盘和五回合路径不读。不得把本任务调度器/验收工具和断言改弱以通过验收；需要扩范围则本批 rejected，保留分支/原因交运维。铁甲行为保持等价；跨角色整场变化必须有理由和记录，不复制铁甲经验。
3. 用相同冻结扩充数据分别重放 base 与候选，200样本、原始行索引 seed、t1/pre、整体校准在 tune 拟合。保留 sources/fights/turns、split/provenance/results 全套，生成两份 trust.py 的本角色档案。before/after 的 split、dataset/source SHA、验证结局/逐回合覆盖必须相同；新验证数据必须同时进入两侧，不能与旧小集比较。对所有 boss 重放以验证整体 T1/pre Brier（其他 boss 原始样本不变可按键验证后复用）。纯缺数据也产生不完整档案，不能补虚构数字。
4. 保存新增固定机制夹具，撤候选源码真红/恢复绿及所有初稿失败。每次代码提交前在 agent/ 用原 bash tools/test-sandbox.sh，PATH 加 ~/.local/node/bin，TMPDIR={{scratch}}，SANDBOX_WORKERS<=4，nice；不安装依赖，不运行 play，不联网读游戏知识/游戏包或 key/.env，不停当前对局/调度，不改 ops 运维 prompt。全局 Git 身份，gitleaks 扫描指定文件，Co-Authored-By 带实际模型。先提交候选源，再执行基准版本的验收脚本，不能信候选修改后的门槛：

   base 必须取不可变证据的 dispatch_base，不能换成候选或其他提交；完成事件再次核对。启动前 live 的保护源码若已变更，不能换 base 绕过检查，保留失败回报交有界重试。

   nice -n 19 python3 agent/tools/boss-sim/acceptance.py --character {{character}} --boss <证据boss> --mode <b4或b5> --before <固定before-trust.json> --after <固定after-trust.json> --base <证据dispatch_base完整commit> --head <候选完整commit> --evidence {{evidence}} --root {{worktree}} --scratch {{scratch}}/acceptance --out {{scratch}}/acceptance.json

   自动脚本：实盘 solver 等保护源码不变；用基准提交的固定 runner 对两边重放实盘求解/五回合输出，逐字节一致。目标 boss 的 T1/pre 打穿偏差、胜率差、Brier 都不能变差；至少一项严格改善且进入标准，或超标量减少≥20%并距原标准≤10%（打穿比距[.7,1.3]≤.03）；整体 T1/pre Brier 增加≤.005。缺指标/覆盖/隔离证明 fail closed。B5 还须 T1 验证≥10、原 Brier/gap/leak 全达标且由 trust.py 自然进入 trusted_b2；不手写可信名单。
5. 未过：独立分支留存，不合 live、不建版本。kind=fight/mechanic 的真实偏差条目经根目录 ledger CLI 记 rejected，原因/数据/局号/回合/验收路径写 note；不是 bug-infra。没有可证实校正也按缺证据拒绝（仍输出 before/after，隔离同 base，门槛自然失败），不假称上线。调度器完成事件复核验收，进入十场新战斗且新校准冷却。
6. 通过：按 {{merge}} 流程自行发布。持有根目录 ops/live-merge.lock；确认无 report.py/知识刷新，保存 live 所有刷新（包括未跟踪知识），查重叠、预检、保存合前提交。合入已测候选；合后原沙箱通过，失败保留原日志回退本次代码、保留刷新。用最终 live 源重跑校准/character boss-trust，保持 tune/val 分账并归档 experiments/boss-sim/{{character}}/<artifact>/，生成档案不得覆盖旧目录。若 live 在候选期间变更模拟源码，重做配对验证和验收，不把旧候选当最终组合结果。通过后先 date，登记唯一 eval 版本与 decision-log，台账 learner 写 proposed/accepted、局回合证据与实际源码/合入路径，shipped 由运维核实登记。提交/合入受阻记录具体阻塞，由运维兜底，不伪造成功。

报告写 paper/materials/{{character}}/boss-sim-<b4或b5>-<boss>-<日期含批次>.md，保留所有失败历史、数据和验收路径；升级小结须引用（只改自己工作树内小结，不碰根目录并行笔记）。{{scratch}}/report.md 和 report.json 保存最终回报。最后必须使用 json 围栏，task=fix-batch 是调度完成和外部完整检查通道：

```json
{"task":"fix-batch","base":"<40位>","fixes":[{"item":"Roy 已授权独立功能：<角色>/<boss> B4/B5 校正","commit":"<实际源commit；无候选则base>","test":"<原检查和验收路径>","fails_without_fix":true}],"skipped":[],"merged":null,"tests":{"tsc":0,"vitest":0,"cases":1},"boss_sim":{"evidence_key":"<证据key>","outcome":"accepted或rejected","acceptance":"<完整acceptance.json路径>","ledger_ids":["<真实条目>"]},"version":"<唯一实际版本；rejected为空>","reports":["<报告路径>"]}
```

数字/真假/merged 必须据实，accepted 写实际合入40位 commit；rejected 保持 merged=null。调度器复算数据/隔离、验证源码祖先或 rejected 账本，并发 fix-done；实际合入后沿原通道外部完整检查并发 learner-checks。不等后续事件才交回报，原 failed/rc/merged 历史不可改写。
