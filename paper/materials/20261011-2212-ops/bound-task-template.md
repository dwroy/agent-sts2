---
title: 策略提案与实现
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
default.batch: manual
---
# 任务：依据本角色对局证据提出并实现策略

Roy 2026-10-05 08:33 批准独立策略学习任务。本次角色为 {{character_name}}（{{character}}），来源局为 {{runs}}。自己做，不许再派下级 agent。全程中文，提交信息英文。使用普通模式、high 推理强度，不为提速降低强度。

工作树：{{worktree}}；基线：{{base_branch}}；日志（只读）：{{logs_dir}}；临时文件只放 {{scratch}}。

## 1. 开工与证据
- 先读 README.md、最新 paper/materials/STATE-*.md、decision-log.md 末尾、docs/learning-protocol.md。先 git status 确认干净并核第 1.2 节身份；已绑定纯研究保持 dispatch_base，不合入后续 main。其他提案仍 git merge --no-edit {{base_branch}}；冲突就停下回报。
- 只从本角色对局、复盘和 {{character_dir}} 学习。核对 runs.jsonl 角色；不得读取或搬用其他角色知识。共用事实仅用观察得到的数据。
- 先按第 1.2 节核对本批是否承接已授权专题；匹配时只按 work_spec 研究，否则读 fix-queue-v4.md 的待定策略项与已有提案，选证据充分、可验证的一项。游戏知识只能从对局里学，不使用自己的预训练知识补结论。
- 每项提案落盘到 {{scratch}}/proposal.md，写证据局号、层、回合、既有学习账本 id、反例、预期行为及验证方法。没有证据就报告证据不足，不改策略。

## 1.1 派发提案与补链
本次调度批次为 {{batch}}。从 {{project_root}}/ops/codex-ops/learn.json 只读对应行，核对角色和工作树；若存在 proposal_ids，只处理这些已领取的 id，不领取其他批次或扩展到整条队列。batch=manual 时保持原手动证据任务。
只读本次调度 batch 的 proposal_ids / proposal_repair。逐项读取专用队列的角色、证据、账本和保存的 Markdown，不忽略其他待处理 id。补链任务要核对原经验或已追加复盘，补提案与账本链接，不重复写历史复盘。最终每个派来的 id 都有 proposal_results：implemented/duplicate 带实际 live 祖先源码 commit 与理由；waiting 带具体缺数据理由，保留待新局重派。

没有源码改动时保存 {{scratch}}/report.md，回报完整40位 base、fixes=[]、merged=null、report 路径以及逐项处置；工作树保持干净。合法的证据不足/已有实现不冒造合入、eval 版本或测试成功。代码实现按下一节验证上线。

## 1.2 仅本批的手动专题研究
本批存在 implementation_request 时跳过本节，按第 1.3 节与宿主附加的不可变任务执行；不能套用纯研究的禁止源码或纯报告完成口径。
先读取根目录 learn.json 本批的 research_request：`roy-20261010-silent-deck-size-value` 对应根目录 `notes/strategy-research-silent.json`，`roy-20261010-silent-core-reuse-value` 对应根目录 `notes/strategy-research-core-reuse-silent.json`，`roy-20261010-silent-core-output-value` 对应根目录 `notes/strategy-research-core-output-silent.json`；路径都相对 `{{project_root}}`。这三个专题各自独立绑定；不得读取另一请求来代替本批身份。普通批次仍只读 `notes/strategy-research-{{character}}.json` 并按条件匹配。learn.json 本批带 research_request 时，文件不存在或任何身份/SHA 条件失配都停止专题回报，不退回普通选题；只有不带 research_request 的普通批次在专题条件不成立时保持原提案/补链任务，不将普通队列变成专题：
- learn.json 中本次 {{batch}} 的 task=strategy-proposal、character={{character}}、reason=ops；该行完全没有 proposal_ids 和 proposal_repair 字段，工作树等于 {{worktree}}。
- 请求 authorized_by=Roy、task=strategy-proposal、character={{character}}，state=running 且 batch={{batch}}；request_id 为非空字符串；dispatch_runs 与本批 runs 集合精确相同且均无重复。
- 专题宿主 wrapper 已在原 learn.lock 上等待登记落盘，模型启动前须有 learn.json 对应实际 research_request 与根请求的 running/batch/worktree 绑定，独立注册回执位于 ops/codex-ops/learner/{{batch}}.research-registration.json。pending/null 只属于派发前状态，不能在模型内将它当已承接专题。不自行写请求或 learn.json，身份未绑定或已变就停止专题回报，不退回普通提案选题。
- 将 work_spec 和 input_manifest 路径相对根目录解析（绝对路径也须在根目录内），先核实文件 SHA256 分别等于 work_spec_sha256、input_manifest_sha256，再读取正文。manifest 的 request_id/character 必须匹配，runs 为本角色冻结局号清单，dispatch_runs 必须是其中的子集。required_sections 为非空、无重复的字符串 key 列表。
- 请求 dispatch_base 是运维在派发前登记的真实完整 40 位提交；本次宿主登记的纯研究树直接由该提交建立，HEAD 保持等于它，不合入后续 main 的源码、知识或记录。将该 HEAD 记为 report.base，不能自行提交源码/知识再把新 HEAD 自报成无改动基线。验收还对照本批独立登记的 research_dispatch_base/research_input_sha256，实际执行源码、任务模板、验证输入和全部 knowledge 必须保持零差异；不同则保留现场并回报，不能冒称纯研究完成。

匹配后用 work_spec 的目标、冻结输入和限定字节范围替代 fix-queue 选题，只研究该请求，不领取或补做其他提案。游戏结论仍由你从本角色证据提炼；完整保存假设、支持、反例、未知和结论变化，覆盖每个 required_sections，不用预训练事实补齐。证据不足也须给出有范围和限制的结论，不将“尚不确定”变成已验证规则。

专题纯报告保持 HEAD 等于完整 40 位 base、工作树干净、fixes=[]、merged=null，跳过第 4 节；不制造源码提交、游戏版本、shipped 或成功测试。已证知识只经既有 ledger CLI 登记；需要代码提案时只经 code_proposals CLI 保存真实提案及证据，不伪造 id。经验库沉淀交后续 experience-update，本次报告不冒称已入库或大脑已采用。

除第 6 节的基本字段外，专题最终 JSON 必须带 task=strategy-proposal、character={{character}}、batch={{batch}}、request_id、input_sha256（实际 manifest SHA）、research_complete=true、coverage（所有 required_sections 对应值均为 true）、objective_conclusions（非空结论文本）、limitations（非空字符串列表，即使结论为无充分证据）。runs 只填本批派发锚点；covered_runs 填实际分析的冻结局号，exclusions 填未能分析的逐局 {"run_id":"...","reason":"具体原因"}，两者各自无重复、无交集且并集精确覆盖全部冻结局；evidence_runs 是实际支持结论的 covered_runs 子集，不能用一局或十个锚点冒称全历史。report 必须为 {{scratch}}/report.md 的真实绝对路径且位于本批工作树 learner/runs/ 内；无源码修改的 tests 固定为 {"tsc":null,"vitest":null,"cases":null}，不要照用第 6 节样例的 0。code_proposals / implementation_domains 保留正常 CLI 链接格式，无相关提案填空数组，不将专题 request_id 填成代码提案 id。

## 1.3 已授权实现请求的冻结绑定
仅当本批 learn.json 带 implementation_request=roy-20261011-silent-core-cycle-quantitative-learning 时适用。必须有本批 `.implementation-registration.json` 和 `.implementation-input.json` 宿主回执，request_id、batch、worktree、task/manifest SHA、原三 proposal_ids 与文件职责一致；任务正文和扩授权已由宿主按原字节附在本题末尾。缺少正文、回执或任何身份失配就停止回报，不退回普通提案或旧纯研究。

只处理本批已领取的三原提案和冻结任务。按正文交付代码、证据校准与消费者验证，允许第 3、4 节的自测/live；watcher 的六文件职责保持，发生路径冲突交 ops 协调。不得修改根请求/旧 done 父请求/提案原文，不另建重复 id，不把框架完成当量化学习完成。最终 JSON 除正常实现字段和逐项 proposal_results 外，必须带 character、batch、request_id、input_sha256、work_spec_sha256；不带 research_complete。无新代码时仍须逐项给真实 waiting/duplicate 理由，不冒造实现、合入或测试。原失败回执保留，宿主输入准备不等同模型已经启动。

## 2. 边界与实现
- 依据已有证据提出并实现策略；涉及 Roy 尚未授权的架构调整先回报，不猜测批准。不得把待定项当成既定游戏规则。
- 怪物血量与伤害按当前进阶从数据库取，第一个样本起就用；房间代价保留 5 个样本门槛。
- 出牌、药水、SL、终局价值规则按本角色实盘证据决定；Roy 2026-10-07 已授权学习者有理由和数据时修改既有人定规则，原规则不是不可修改的前提。
- 推演相同的选项标并列；DeepSeek 负责构筑、路线和休息，Jev 执行战斗；代码提供事实及参考排名，不删选项。
- 每项实现单独提交，写明局号、层、回合、账本 id。代码注释英文，模型知识文本中文；铁甲行为若变化说明证据和原因。

## 3. 验证与记录
- 保存原源码副本时在 {{scratch}} 使用 .txt/.patch 等材料扩展名，保留原字节；不要把临时副本命名为可执行 .ts，避免导入检查将它误当生产源码。
- 用固定局面测试，不依赖刷新的知识 JSON，不调 LLM 或网络。源码撤掉时测试必须失败，恢复后通过，两次结果写回报。
- mkdir -p "{{scratch}}"；export TMPDIR="{{scratch}}"；export PATH=$HOME/.local/node/bin:$PATH；每次代码提交前在 agent/ 跑 bash tools/test-sandbox.sh，退出码为 0。高负载超时重跑一次并报告。
- 提交前 gitleaks 扫描，git commit（使用本机全局身份，不设仓库级 user.*），Co-Authored-By 写真实引擎和模型；不推送。
- 往文件写时间前先 date。只经 {{project_root}}/learner/ledger.py add/update 登记本角色提案、证据与提交；status=proposed，by=learner:strategy-proposal；不得直接改账本或标 shipped。

## 4. 合入（只有 merge = live 时做）
本次 merge = {{merge}}。是 `no` 就跳过本节，在回报里写「未合入，待调用方合入」。是 `live` 时，在 `flock {{project_root}}/ops/live-merge.lock` 锁里按「合入 live 的流程」做（其他值报错，不猜测合入目标）：
1. 等后台知识刷新跑完：`while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done`（方括号不能省，否则会匹配到自己的 shell，永远等下去）；
2. 在 {{merge_dir}} 里先提交刷新过的知识数据：`git add notes/fight-value-backtest.md knowledge`，commit "Refresh knowledge data"（没有改动就跳过）；
3. 先检查刷新过的知识数据与本分支的改动是否重叠；有冲突就停下回报，不覆盖刷新数据。记下提交刷新数据之后、合入之前的提交号，再 `git merge --no-edit <本分支>`；
4. 在 agent/ 跑 `bash tools/test-sandbox.sh`（内含 tsc 和沙箱可跑的 vitest；固定排除名单及子进程限制原因见脚本注释，合入后由调度器在沙箱外补跑完整套件），退出码都要是 0；不是 0 就回退到第 3 步记下的提交（保留刷新数据），在回报里写明；
5. 如果改了知识数据的生成脚本，用 knowledge/builders/ 下的脚本重建数据，再提交一次；
6. 先跑 `date`，在 paper/materials/decision-log.md 追加上线记录，写明来源条目、证据局号、账本 id 和提交号。改变对局行为（包括知识前缀文字变化）时，在 eval/versions.json 加版本并通知运维会话；将提交号和版本交运维 codex，由运维 codex 经 learner/ledger.py 将对应账本条目标为 shipped（只有实际合入 live 后）。只修工具或任务模板且不改变对局行为时无需 eval 版本；
7. 不停对局，不运行 play。

## 5. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的：{{worktree}}（本分支）、{{scratch}} 和学习账本（只经 learner/ledger.py 追加）；merge = live 时还有 {{merge_dir}} 的合入，以及第 4 节明确要求的上线记录和 eval 版本。Roy 2026-10-05 08:37 已授权修改本工作树中的 ops/ 调度器与 broker（包括 ops/codex/、codex-ops*.sh、codex-ops-learn.py、learner_jobs.py、learner_checks.py），可实现队列中已批准的动作和学习闭环；不修改 key、.env、codex 登录令牌、.git hooks/config，也不借动作执行清单外操作。notes/、paper/ 的其他文件仍只读。
- 不推送；不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`（node_modules 是共用的软链接）；logs/ 只读。

## 6. 回报

回报列出提案、证据局号/层/回合/账本 id、提交、撤源码失败与恢复通过、tsc/vitest结果、合入提交和版本、未实现原因。把 {{scratch}}/proposal.md 路径交运维；实际上线后由运维核实并登记 shipped。最后单独给 JSON：

```json
{"task":"strategy-proposal","base":"...","runs":[],"fixes":[],"skipped":[],"merged":null,"tests":{"tsc":0,"vitest":0,"cases":0}, "code_proposals": [], "implementation_domains": [], "report": "{{scratch}}/report.md"}
```


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

消费队列最终 JSON 还须加 `proposal_results:[{"id":"<派发id>","state":"waiting","reason":"具体缺数据原因"}]` 和 `report:"{{scratch}}/report.md"`；implemented/duplicate 另带实际 commit。


## 本批宿主已绑定的实现请求（优先于纯研究章节）
{
  "request_id": "roy-20261011-silent-core-cycle-quantitative-learning",
  "work_spec_sha256": "3c9355afd6ee7c98ff7cfc9c2e9a45d20fdf025ae701fccd482b1b73aea6079b",
  "input_manifest_sha256": "54bd743de00cc1c5146546f06859a59016afba85a39c52aa73359860359c845f",
  "authorization_sha256": "b998719e1bc75c0b2af67b1fcd862c6bffc4b7707b825e83b58ecf79cd1c1508",
  "ack_sha256": "2be028888ce9afdb6a5b9954fb12c8e47917b4c4d807653aef414fd3687181b7",
  "files": [
    {
      "source": "paper/materials/silent/20261011-core-cycle-quantification/report.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/abstract-report.md",
      "bytes": 10427,
      "sha256": "e40f3f897838d0873a0117d27e37b462ef4f67630f68b149ef7493457f797785"
    },
    {
      "source": "paper/materials/silent/20261011-core-cycle-quantification/calculate.py",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/abstract-calculate.py",
      "bytes": 9847,
      "sha256": "77edbe37b4fb1914958b25d14194c5f70d59cef6ee811a372c357b958fdcfa0b"
    },
    {
      "source": "paper/materials/silent/20261011-core-cycle-quantification/results.json",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/abstract-results.json",
      "bytes": 18714,
      "sha256": "7c191564efe3cfda44ddbdb9be91e9bd0d91e0c7d52246c699dbb37c72baf21b"
    },
    {
      "source": "paper/materials/silent/20261011-core-cycle-quantification/experience-integration/task-v3.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/previous-task-v3.md",
      "bytes": 5269,
      "sha256": "030337a62c1d43cb18486f53eb760e2235b762fd567d9e8cf6232166aed96360"
    },
    {
      "source": ".worktrees/exp/learner/runs/20261011-175453-experience-update/report.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/previous-learner-report.md",
      "bytes": 42279,
      "sha256": "94d3623878596d68e78ec82e0f01c3bb8bb241073991caa124d8baf3b89767ac"
    },
    {
      "source": ".worktrees/exp/learner/runs/20261011-175453-experience-update/finite-window-verification.json",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/finite-window-verification.json",
      "bytes": 131821,
      "sha256": "1aa38f2dc2b15c6b5780506d5052bcc86398cf419243fe6aa3fdf35662a67d5a"
    },
    {
      "source": ".worktrees/codex-strategy-silent-20261010-164301/learner/runs/20261010-164314-strategy-proposal/proposal.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/core-reuse-proposal.md",
      "bytes": 6850,
      "sha256": "663b06fb0e50d24d8a1225e7c04e737c961000dcbbef7644471215a5f451515c"
    },
    {
      "source": "paper/materials/silent/20261010-core-output-value/result-review/proposal.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/core-output-proposal.md",
      "bytes": 6645,
      "sha256": "77a828dea1664ae9e6fc862151f380161901ebf0be47f06011ad83d6481bd79e"
    },
    {
      "source": ".worktrees/exp/learner/runs/20261011-175453-experience-update/proposal-integration.md",
      "path": "paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/integration-proposal.md",
      "bytes": 8006,
      "sha256": "feb0c6dce459bf2e65f38d03dc25449a5704167e30928799f67e9b36f140c118"
    }
  ],
  "file_responsibilities": {
    "watcher": [
      "agent/src/sim/quantitative-stats.ts",
      "agent/src/sim/quantitative-facts.ts",
      "agent/src/sim/quantitative-calibration.ts",
      "agent/src/sim/build-sim.ts",
      "agent/src/sim/build-sim-facts.ts",
      "agent/src/reflex/combat-plan.ts"
    ],
    "learner": [
      "本角色原帧校准/固定夹具/反例/条件经验",
      "原三个提案的消费者实现；先复用watcher交付接口，冲突路径停止并交ops协调",
      "复用已上线通用框架 source199596dfcf99c18cda5ce146b8de618636f60d40 +3ee649f69260309677ad075cac726d705a66e6ef，先读正式补充输入 paper/materials/silent/20261011-core-cycle-quantitative-learning/framework-input-v2.json（SHA256 38eba701973db706c5a02be48e8fb37300eac06e0e9aa333bd368e250862bf5e）及其中API文档 paper/materials/silent/20261011-core-cycle-quantitative-learning/framework-input-v2/quantitative-play.md（SHA256 ac674443cf5d9ffca11e40ee41beda8aaaa4f7b72495e707bea3d6fdd5ac0a2a）；这5个冻结文件由ops逐字复核，文档与dispatch_base已集成API一致。完整组合资格/计数/真实预测-实际自动提取/校准及coverage仍由本批学习者依原task和证据完成，不把框架交付或抽象界当已入库游戏结论。"
    ],
    "ops": [
      "派发冻结绑定、实际合入/校准/版本/账本/双通知/后续效果闭环"
    ]
  },
  "batch": "20261011-221722-strategy-proposal",
  "worktree": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261011-221722",
  "proposal_ids": [
    "silent-proposal-9e1bc1225fae0e30",
    "silent-proposal-3dae3ca702a14057",
    "silent-proposal-9e81dc5f9a4c3bd5"
  ]
}

# 核心循环量化：方法实现、证据校准与经验消费

请求：`roy-20261011-silent-core-cycle-quantitative-learning`。角色：silent。

Roy明确批准“逐项吸收清单、可复用计算工具、条件明确的经验条目、实际消费验收”四项成果，并要求发送给ops安排学习。Roy另问费用、伤害、回合次数应归哪个模块、在哪些环节调用；本任务将该架构分工与调用清单一起交付。知识结论由学习者依据本角色对局证据得出。

本期承接已经完成的 `roy-20261010-silent-core-reuse-experience-integration` revision 3，不重新打开、覆写或冒充其完成记录。旧报告、.13经验、失败/回退与最终恢复历史保持。沿三条已有pending提案去重续作：

- `silent-proposal-9e1bc1225fae0e30`
- `silent-proposal-3dae3ca702a14057`
- `silent-proposal-9e81dc5f9a4c3bd5`

## 输入与学习边界

先核同目录 `input-manifest.json`，9份输入均按原字节冻结；`prior-basis.json`保存交接时live经验与条目，`proposal-state-at-handoff.json`仅为交接切点，领取前重查真实状态/占用。

`inputs/abstract-report.md`、`abstract-calculate.py`、`abstract-results.json`是数学讨论和抽象模型。学习者应复现计算、独立核对推导和反例、改变参数检验边界，允许发现错误并更正；它们不是游戏机制或通关收益证据。不能把5张、12回合、示例费用、收益百分比和无限构造直接写成静默规则。

复用已完成195/201/204局专题和已核四个有限窗口，从原报告的证据索引按需读取完整原帧。专题局数重叠不相加，旧主题225条支持不充当每个新公式的验证分母。确需新数据时，由学习者另冻已结束的本角色局清单、时间/字节切点和SHA；不得重新无差别研究全部历史、读取其他角色知识或开play补样本。

数学方法及其条件应完整保留在可复用工具、说明和固定用例中。应用到游戏的机制前提须有对局证据；未验证部分留原研究/提案链，不能自动进入active知识。无需等到证明稳定通关才保存已证的局部机制和有界计算。

## 成果一：逐项吸收清单

至少覆盖以下六组，报告内每个主要公式、表格结论、反例和失效条件均须有唯一编号与去向：

1. 基础抽牌下单核心到手/施放的期望、缩牌收益和饱和边界。
2. 多组件同时到手、跨回合建立、合法支付与完整组合完成的区别。
3. `N−G`流量近似与逐张模拟；删除、跳过、增加和保留方案的实际抽牌/费用比较。
4. 同回合回流的能量、行动、手位、封抽、耗尽资源约束及断链反例。
5. 无界循环的闭合状态见证、启动可达性及不满足条件时的具体断点。
6. 首次启动时间、有限可活窗口、伤害/格挡/药水和整局生存之间的关系。

输出 `coverage.json` 和中文表：原报告位置、命题/算法、前提、数学复核结果、游戏适用证据局/回合/帧、反例、精确/估计/界/未知、处理状态、对应工具/测试/经验/提案ID、缺口与下一次验证触发条件。状态区分已验证可用、附条件可用、待验证、被反例否定；不能以“已读完”或一句“缺证”关闭整组。

## 成果二：可复用计算能力

先查当前实现和上述三提案，保留已有等价能力，避免再造一套机制模型。优先交付可固定复现的离线接口/CLI与测试，再沿现有生产入口接入已验证部分。

- **reflex**：当前已知状态下的费用、合法动作序列、当回合伤害/格挡/触发；复用现有card-model、turn-solver和状态转移。
- **sim**：跨回合抽弃/洗牌、有效循环池、核心到手和完整组合次数、启动延迟、资源上界，以及构筑候选的成对比较。复用rollout、boss/build模拟；共享同一机制语义，避免同一张牌被不同模块重复或矛盾计算。
- **brain/Jev与hand**：通过现有facts接口接收计算结果、按现有职责选方案和执行。计算层提供事实及限制，保留合法候选；不新增决策引擎或隐含硬评分接管。
- **memory、eye、learner/eval**：保存预测与计划绑定，记录实际结果，离线核偏差并校准。数学方法由计算代码执行，经验保存证据支持的适用指导。

最少输入应覆盖现场手牌/抽弃/消耗区、已建效果、可观测费用/能量、候选改变、计算窗口及模型版本；未知抽序按有说明的抽样/范围处理，不能伪装已知。对实际记录状态比较保留/跳/删/加时，使用成对固定随机条件、相同预算和公开策略；只使用已观察可建模组件，扣除相应费用及失去的资源。把模拟结果与真实观察分开。

输出至少包括费用、即时及延后伤害/格挡、首次合法启动、单卡施放与完整组合次数、血量/药水余量、终止/断链原因、样本与误差或界、未知项，以及状态指纹/模型版本/证据。未知和计算超时不得转为0伤害、0收益或必死。

验收需包含原抽象计算复现、变化参数、断链/费用不足/封抽/手位/消耗反例，以及真实固定帧的输入输出对照；正确复现玩具模型仅证明该模型，不能代替游戏模型校准。

## 成果三：条件明确的经验沉淀

由学习者决定哪些子结论有本角色证据支持，修订既有 `general:deck`、`general:plan` 或相关牌机制条目。每条包含适用条件、计算结果/区间、证据局号、反例、不能外推的范围和工具入口；完整推导、参数表与逐动作数据保留在报告/工具，避免把整个模型报告塞进每次决策前缀。

不要只压成“综合考虑费用、牌数和生存”；验收需说明 agent 遇到何种状态可调用什么计算、得到什么量、如何识别不可用。也不强制所有数学结果成为active打法。只经既有ledger/code_proposals CLI登记和去重，不由ops或watcher填写游戏结论。

## 成果四：实际消费验收

提交调用覆盖表，逐项标注已存在、补接入、暂不支持及证据原因，优先覆盖可用的既有入口：

| 环节 | 应提供的计算 |
| --- | --- |
| 战斗开始、回合开始、抽牌/生成/资源或敌人状态变化后的重规划 | 当前费用/伤害与后继资源，有限回合启动/兑现和生存；状态未变复用缓存，不每个轮询帧重跑全套 |
| 出牌、药水、弃牌/保留/复制对象等关键选择 | 候选对后继合法动作与完整组合的影响，不能仅比较单张牌面值 |
| 结束回合和现有SL检查 | 使用已验证的状态计算及界；概率低或预算不足不能当作必死证明，原规则变更仍须满足学习协议 |
| 奖励拿/跳牌、商店买/删牌、升级/变换/事件 | 在同条件下比较现有牌组与候选改变的启动、循环、费用和生存，沿现有build-facts/build-sim入口 |
| 路线、休息、战前准备与后续战斗 | 所需回合与可活窗口、进入下一战的血药/重新启动成本，注明预测和未建模部分 |
| 复盘、模型校准及后续自然对局 | 预测和实际的匹配、偏差/反例、读取与采用记录、阶段/整局结果 |

不要以“文件存在/能渲染”代替消费证明。分别提交：固定输入下真实消费者调用测试；实际live版本/源码；自然局真实请求中读取的证据；是否采用；收益观察。后两项尚未发生时保留待观察，由原ops事件和既有效果追踪续办，不启动play、在线额外模型题或新定时器，不占着会话轮询等20局。

## ops安排与完成判定

这是用户交给ops安排的后续任务。watcher仅准备工作说明和原事件，不直接启动学习者、改活批输入、抢租约或操纵提案业务状态。ops先核三提案实际领取、完成和等价源码，按既有学习/实现/经验闭环分阶段安排，阶段结果仍归本请求；不重复建相同提案，不复派已完成全历史研究。

当前纯研究 `strategy_research_jobs.REQUEST_PATHS` 只登记旧三个研究身份；本请求含工具与消费者实现，不能将其伪装成旧纯研究或把已done请求改pending。ops须把本工作说明和SHA绑定到实际批次输入并保存可核对的送入记录。若现有入口无法承载该绑定，沿已有获授权工具修复链做必要的最小适配后再派；没有真实batch/PID/pane和输入绑定回执，不得称已启动。本请求不是新增自动领取器或第二调度器的授权。

沿项目自测、合前刷新检查、实际live合入、版本/双通知及原外部检查执行，保留原失败。已完整通过的检查不因总包装时限或单独环境限制反复全套重跑；分别核缺项、真实失败和固定源是否改变，按现有验证规则交付真实覆盖，不能伪造退出码或擅自回退他人合入。

最终交付：`coverage.json`、方法/工具源码与调用契约、固定实验和反例、经验旧新差异与提案映射、消费者覆盖表、实际发布回执及独立效果跟踪。方法可复现、假设可判定、数量能计算、反例不遗漏、结果能被实际消费，才算本期消化完成；具体打法和收益以证据为准。


# 完整升级授权与随机性要求

记录时间：2026-10-11T20:43:56+08:00。仍属于请求 `roy-20261011-silent-core-cycle-quantitative-learning`；原task及9份冻结输入不改，原已完成父请求不重开。

Roy追加授权原文：“可以的，就按照你整个建议来升级系统吧”。随后补充：“这里需要注意的是，游戏的随机性肯定会导致单次模拟有误差”。本请求包括实际实现、消费者接入、自测、上线和学习校准，不止阅读报告/安排入库。

随机性验收：

- 多次模拟、同随机条件配对比较；报告实际有效样本数、均值、结果分布和均值的蒙特卡洛误差。结果波动/预测区间不能用均值标准误代替。
- 超时、截断、未建模、缺帧保持可见；按样本身份配对，不将未完成值补零。胜局条件统计要有独立分母，保留失败与截断样本。
- 零胜/全胜的小样本不能当必死/必胜。差异无法分辨时明确保留不确定性；原始样本区间不得冒充校准后真实游戏区间。
- 多抽样减少随机误差，不能修复机制漏算、策略偏差或输入错误。后者由learner用自然对局核对；单局预测偏差不自动认定bug，也不以随机性解释持续系统偏差。
- 预测/实际校验按角色、局、SL尝试、决策/状态指纹、实际采用方案、指标/窗口和模型版本匹配；重规划、未采用选项、缺证窗口不冒充有效反事实。分组报告偏差、绝对误差和经验区间覆盖。

watcher在独立工作树 `.worktrees/quantitative-play-framework-20261011` 做通用架构子任务：`agent/src/sim/quantitative-*.ts`、`build-sim.ts`、`build-sim-facts.ts`及`reflex/combat-plan.ts`的适配、固定测试/工具/说明。基线live固定0eb5dcd08895d111a7694c28120c1b229451bee6。不建立游戏核心组合定义、不改机制/权重、不填经验或提案业务状态；消费者增量限Silent，其他角色决策保持。机制语义和报告逐项吸收由ops派原提案学习者，优先复用这些通用接口；如已由活批覆盖则协调所有权，不双写。

已通过Herdr向原ops补充完整授权及职责。该通用子任务不替代原四成果、真实学习任务输入绑定、实际上线和自然局消费/效果验收。父请求不能因通用接口完成而标记done。
