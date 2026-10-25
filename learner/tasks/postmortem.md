---
title: 复盘
effort.codex: high
tools: Read, Grep, Glob, Bash
timeout_min: 120
max_turns: 400
default.code_dir: {{project_root}}/.worktrees/live
---

{{^is_ironclad}}## 整局与流派主线（Roy 2026-10-24，#51 评论6378443035）

先完成本批每局的整局摘要，再更新对应流派剧本与 rk；零碎单卡/单战教训只作附带，不以凑条数、逐条改写旧经验或“机制总结”替代整局产物。先按真实逐层牌组/构筑选择/本局计划识别该局流派和转向；拿不准写“流派未定/过渡”，不按终局牌组倒填开局意图，也不把持有核心牌当成已建立能力。

每局摘要至少包含：局号/角色/进阶/代码版本与首次尝试、实际流派/转向节点、核心组件首次观察齐备的幕/层/证据、各幕末真实牌组及HP/maxHP/药水、各Boss及相邻Boss结果、死因与此前关键失血战（也包括赢的战斗），并对照 #50 run-plans 的目标/检查点和 construction-log 的实际选择、跳过及原理由。计划/预测/执行/后继分列；未到幕末、未知层、缺快照或截断明确保留，不补最终牌组/最终HP为中途状态。全局流式分析和有限原文窗口核回，不等于已通读每道题；本批授权局号、冻结切点和原始offset/bytes/SHA仍是边界。

流派剧本单元的完整输入固定为三份：外部统计、外部代表完整局、我们同流派的自有完整局（含死因和关键失血战）。外部/自有来源、版本/进阶、独立局分母、观察/因果和代理各自分账；#54自有流派/组合/成型时间线/克制四表应与人类外部四表并列，重点说明“我们与人类赢家差在哪”。本任务只读实际交付并冻结的输入，不下载、读取外部原库、越本批局号或自己编造缺失表。没有自有四表时先用本批完整局给明确标为有限样本/代理的偏离线索；没有某份输入时完成可核的整局摘要和局部候选、列明缺口，不能称三输入剧本完成，也不因此停掉整批其他可核产出。

报告先给“流派剧本/rk去向表”：每个本批局对应已有playbook/strategy/rk ID或真实候选ID、候选文件、完整局与关键窗口、与人类赢家的可比偏离点、证据限制，以及候选/复用/待证的实际处置。优先更新同场景已有ID，保留旧证据/反例/置信度；语义、拿牌顺序、成型早晚、防御或Boss准备差异须由学习者据真实数据得出，不能把不同局面频率、终局聚类或SL次数当因果收益。无可比组写未知，不硬定流派、固定拿牌比例、安全HP或必胜替线。

只在 {{scratch}} 写 whole-run-summary.json 与 playbook-rk-candidates.json，报告引用两份实际文件；每个候选写来源角色/版本/局号与窗口、目标ID、observed偏离、限制、formal_publication=pending、consumer_readback=pending。沿既有学习账本与提案/策略发布链交接正式库，不改来源schema/消费者，不在只读复盘任务直接写正式策略/rk库，不冒充已上线。旧244经验/#48回刷按流派归入剧本、去重保留原ID与证据，不为本批重写全部旧条目；确有新增/反证且需要消费者补充的局部经验才按原协议更新。自有完整局不能借成外部验证，候选/源码发布/消费者读回/自然收益分别验收。

### 按决策类型归集（#51 评论6378493412）

外部玩家对局为主，自有局只作对照；本复盘任务仍只核本批授权自有局，把能贡献的证据映射到相应决策单元，不借此自行扩读外部库或未授权自有局。优先顺序为：用药（rk+策略）、休息/锻造与路线（策略）、冷启动（策略）；商店/删牌与遗物选择随流派剧本，事件和按遭遇打法后排。每类独立单元，条目写“情境→做法”，带样本/版本/代理及反例；本局只能提供一个自有对照时如实写n=1，不把一次观察变成普遍阈值。流派相关结果并入对应剧本。

先核#54实际交付的字段可用性回执：开局祝福、商店购买、删牌、事件选项、药水获得/使用、休息/锻造选择。有记录的才能当直接证据；无记录明示“不可用”，具体子项转明确代理或仅自有对照，不能冒外部支持/安全药量/金币阈值，也不整批等待。整局摘要同时标明本批能为前三类贡献的真实选择、当时资源/选项/理由、后继结果与缺口；药水获得/持有/丢弃/饮用分开，休息时HP及到下一Boss只按实际代理，前3战拿牌与第一幕Boss结果不借未来事实触发当前判断。

先核 notes/roy-manual-play.json 的排除局号及已记录手动窗口；Roy手动局和交接整局Z2KBGZQMSRV5排除在学习、统计和流派分母之外。恢复后的自动局另按其实际来源核定，不能因曾暂停一概排除，也不把手动停局造成的工作量变化算调度收益。不改这份运行记录、不操作游戏或STOP、不热改在途批次的任务、会话或冻结输入。

{{/is_ironclad}}## V6 与 Jev 原始证据（机械提证，不能用摘要代替原文）

先核本批 `{{runs}}` 在 runs.jsonl 的角色为 `{{character}}` 且已结束。沿下方原有 evidence_summary 入口建立摘要，并运行 `nice -n 19 python3 {{worktree}}/learner/extract_evidence.py --logs "{{logs_dir}}" --output "{{scratch}}/v6-evidence" --runs "{{runs}}" --streams v6-build jev-prompts decisions run-config`。实际读取 manifest 和本角色/本批两条流中相关的原始 row；逐问题核完整题面、答案/错误、decisions 的 chosen/result/gate_reject/selection_dispatch 与后续 states 后果，保留 offset/bytes/SHA、冻结切点和 identity 关联出处。有限索引只是定位入口；覆盖哪些问题、未读哪些问题及原因必须写入报告，不把最后五条当完整覆盖。

只接受显式 run_id 或通过 decisions 原始行核对的精确 decision_id；正文提及、时间邻近和 question_id 的相似字符串均不建立所属局。v6-build 的 entries/jev_answer/fallback/unknown 和 Jev request/answers/error 分开解释；完整题面存在不表示采用、执行成功或收益。V6 off、历史缺流、无匹配、截断、未知身份都显式保留，沿原任务其余证据流程继续；缺失不是零，也不能据此补经验或跨角色借证。提证不证明本批正式发布、下一局消费或自然收益。

# 任务：写复盘（{{runs}}）

{{#is_ironclad}}你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：给下面这几局写复盘，追加到 notes/lessons.md。全程用中文。自己做，不许再派下级 agent。{{/is_ironclad}}{{^is_ironclad}}你是 STS2 × Jev 项目的离线学习者：给下面这几局写整局/流派复盘，先产出整局摘要与流派剧本/rk候选，再把复盘追加到 notes/lessons.md。单卡/单战教训是附带产物。全程用中文，自己完成，不派下级agent。{{/is_ironclad}}

- 要复盘的局（run id，逗号分隔）：{{runs}}
- 工作目录：{{cwd}}
- 日志目录（只读）：{{logs_dir}}
- 复盘文件：{{project_root}}/notes/lessons.md（只追加）
- 对局用的代码（只读，引 file:line 用）：{{code_dir}}
- 临时文件（抽取脚本、中间结果）只放在：{{scratch}}

## 1. 先确认
1. 每个 run id 都在 {{logs_dir}}/runs.jsonl 里（已结束），而且 lessons.md 里还没有以 `## <run id>` 开头的标题。已经有了的跳过，并在回报里写明；不在 runs.jsonl 里的也跳过并写明。
2. 往任何文件里写时间之前，先跑 `date` 取当前时间，不要估。
{{^is_ironclad}}
3. 这次复盘的是{{character_name}}（{{character}}）的局：每个 run id 在 runs.jsonl 里的 `character` 要是 {{character}}（不分大小写；没有这个字段的旧局是铁甲战士的）。不是的跳过，并在回报里写明。
{{/is_ironclad}}

## 摘要优先（Roy 2026-10-18 用量节省）
先运行 `nice -n 19 python3 {{project_root}}/learner/evidence_summary.py --logs "{{logs_dir}}" --runs "{{runs}}" --out "{{scratch}}/evidence-summary.json"`，只把该摘要及本批提案/已有复盘作为初始材料。摘要是事实索引，不提供游戏结论；需要验证的机制、资源、关键决定仍须按原始 offset/bytes/SHA 定位读取原文，并保留反例和缺失。不要把整份 `states.evidence.jsonl` 或本局所有 state 灌进上下文；脚本可完整流式分析，模型只读所需窗口和结构化结果。冻结专项输入/原请求若规定额外完整证据，仍全部覆盖，不能用摘要替代科学验收。

## 2. 读哪些材料
- `{{project_root}}/notes/run-*-<run id>.md`（一局可能有好几个文件，是中途重启留下的，都要看）。
- `{{logs_dir}}` 下的：
  - `runs.jsonl`：run_id、ended、victory、floor、ascension、code（代码版本）、tokens、ds_cache_hit、death_fight 等；
  - `decisions.jsonl`：每条有 run_id、floor、turn、label、decider、chosen、rationale、confidence、fallback、usage、journal、result；
  - `run-plans.jsonl`：run id 在 `run` 字段；
  - `construction-log.jsonl`：按 `run_id` 读最后一条快照，`entries` 是本局已确认的改牌组动作与跳过（层、动作、牌/当时选项、≤20字理由、来源），`omitted` 是中间省略条数；开头4条及最近36条保留。SL恢复改变记录时也追加快照，旧尝试原行仍保留；省略或缺记录时回查 `states/decisions`，不把短理由当成已验证规则或推理全文；
  - `deepseek-reasoning.jsonl`：**没有 run id**，按这局第一条到最后一条决策的时间窗（decisions.jsonl 的 ts）抽；
  - `states.jsonl`：大文件；新版 state.run_id 可按局号流式抽取，旧帧按 session / 时间窗核对；
- 这些文件都很大，**只能按 run id grep，或者按字节偏移 seek 后流式读**（`grep -F <run id>`、`tail -c`、`dd skip=`、Python 按偏移读都行）。不许整份 cat，不许整份读进内存，不许用 Read 工具打开整个大文件。
- 需要看代码时读 {{code_dir}}（只读），行号按那里的当前版本写，并注明 runs.jsonl 里这局的 code 版本。

## 3. 每局写什么
每局用**一次** `cat >> {{project_root}}/notes/lessons.md <<'EOF' … EOF` 追加一节，**只追加，不改旧内容**（不许用编辑工具改 lessons.md，不许重写整个文件）。

标题：`## <run id>（A几，第N层，死因）`。死因写清楚是哪场战斗、敌人中文名 + ID、关键数字（照 lessons.md 里最近几节的写法）。
{{^is_ironclad}}
这局是{{character_name}}的，标题的第二项写角色名：`## <run id>（A几，{{character_name}}，第N层，死因）`（进阶仍是第一项）。lessons.md 里标题没有角色名的都是铁甲战士的局：照它们的写法只是照格式，那些局的打法结论不要拿来解释这局，这局的经验只从这局自己的日志里来。
{{/is_ironclad}}

{{#is_ironclad}}正文：
1. **3 条经验**，每条一行，格式{{/is_ironclad}}{{^is_ironclad}}正文先写整局摘要和流派剧本/rk去向，再写资源记录及有新证据的附带发现；没有可靠新发现可写“无”，不强凑三条。
1. **附带经验（仅有证据的项）**，每条一行，格式{{/is_ironclad}} `- [一句话标题；bug 还是打法（哪一方：DeepSeek 路线/构筑/休息、Jev 出牌、代码）] 正文`：
   - 写明卡牌、遗物、敌人的 ID（中文名 + ID）；
   - 标明是 bug 还是打法；**bug 要带 file:line**（在 {{code_dir}} 里找到具体行），写明是新 bug 还是 notes/fix-queue.md 里已有的。
2. **一段记录**，`- [记录] …`，包括：
   - 进场血量（每场关键战斗）、每回合伤害和需要的伤害；
   - DeepSeek 的构筑、路线、休息决定（引原话要能在日志里找到出处）；
   - Jev 的出牌：低信心的次数、选推演最优的比例、推演和实际的对比、击杀顺序、focus 选项；
   - 代码自己做主的回合数；
   - 保血规则（HP 护栏）替换了几次、代价是多少；
   - 药水情况（拿到几瓶、在哪喝的，区分饮用/丢弃/补充；建议须同时有证据与代码提案）；
   - 路线预测（投影血量对实到血量）和 boss 时钟（需要/估计、实打/估值）；
   - 用时、token 和缓存命中。
3. **机制观察**（新增，给经验库的机制推理用，v4-dev-brief 第 5 项）：本局里力量、敏捷、能力牌、增益（包括敌人的）在决定胜负的战斗里起了什么作用：怎么起作用、和什么搭配、差了多少（带数字）。放在记录里，以「机制：」开头；本局没有值得写的就写「机制：无」。
4. **新错还是老错**（论文用，paper/materials/learning/README.md）：{{#is_ironclad}}3 条经验里每个关键失误{{/is_ironclad}}{{^is_ironclad}}本局整局/流派结论及附带经验的每个关键失误{{/is_ironclad}}，在那一行末尾标一个：
   - `（第一次遇到）`：学习账本和这个角色更早的复盘里都没有这件事；
   - `（之前见过：<账本 id>）`：账本里有、还没上线（状态不是 shipped）；
   - `（之前学过：<账本 id>，<eval 版本>）`：账本里有、已经上线，这局又犯了。
   查法：`python3 {{project_root}}/learner/ledger.py find --character {{character}} --text <关键词>`（换几个关键词：牌名、敌人名、ID），再按 `## ` 标题 grep lessons.md 里这个角色更早的复盘。只认这个角色自己的局。

## 3.0 实盘资源链（包括赢的战斗）
用 `nice -n 19 python3 {{project_root}}/learner/resource_chain.py --logs {{logs_dir}} --run <run> --character {{character}} --out {{scratch}}/<run>-resources.json` 流式抽取，随后自己核对 states/decisions/sl-attempts：每场（也包括赢的）记录进场/离场 HP、max HP、带槽位的药水、净 HP 变化、药水在哪回合被饮用/丢弃/获得、证据行/时间和 SL 尝试。SL 恢复单列，不当回血；战斗净 HP 变化不是敌人总伤害。退出帧缺失或首帧不是 T1 明示；工具不自动判胜负。

追溯关键进场资源：它由前面哪场战斗、事件、奖励、休息点消耗/补充而来；F48→F49 等相邻战斗逐段列实盘资源，不能把赢的战斗省掉。不从未记录的反事实声称“前一场留药/少掉血就能赢”；需要数据时另提案与验证。

## 3.1 学习账本（每局写完复盘之后）
账本是 `{{project_root}}/paper/materials/learning/ledger.jsonl`，字段见 `{{project_root}}/paper/materials/learning/README.md`（先读）。**只用** `python3 {{project_root}}/learner/ledger.py` 写，不许直接改这个文件。
{{#is_ironclad}}- 3 条经验（包括 bug）每条对应账本里的一个条目：{{/is_ironclad}}{{^is_ironclad}}- 本局有证据的整局/流派结论优先关联已有账本ID，附带经验（包括bug）按需关联；不强凑三条，也不为没有新结论的描述造机制。每个实际结论对应一个条目：{{/is_ironclad}}
  - 第一次遇到的：`add` 一个条目，`status` 是 `observed`，`by` 是 `learner:postmortem`，`where` 写 `{"lessons": ["<run id>"]}`。`claim` 用你自己的话写结论；`evidence` 带局号、层、回合；`first_run` 是这个角色最早出现这件事的局（通常就是这局）；`kind` 按 README 选（bug 是 `bug-infra`）。
  - `prior`：**在任何学习之前** agent 是不是已经做对了。看这个角色更早的局里有没有同样的局面、当时怎么做的：一直做对写 `yes`，有对有错写 `partly`，一直做错写 `no`，没碰到过写 `unknown`；用到的局写进 `prior_runs`，一句话依据写进 `prior_note`。
  - 之前见过 / 学过的：`update` 那个条目，`evidence` 追加这局（又犯了同样的错用 `"role": "repeat"`；只是又一次印证用 `"support"`；和结论相反用 `"contradict"`），`where` 追加 `{"lessons": ["<run id>"]}`。
- 「机制：」里有新机制的，同样 `add` 一个 `kind` 为 `mechanic` 的条目（「机制：无」就不用）。
- 写法：把 JSON 从标准输入传进去，例如 `python3 {{project_root}}/learner/ledger.py add <<'EOF'` + 一个 JSON 对象 + `EOF`。它会校验（局号要在 runs.jsonl 里、是这个角色的局，字段和取值要对），通过才追加并打印条目 id；不通过 exit 2、什么都不写，按提示改了再写。
- 写完跑 `python3 {{project_root}}/learner/ledger.py find --run <run id>`，确认每局都有条目；再跑 `python3 {{project_root}}/learner/ledger.py check`，退出码要是 0。

## 4. 数字的规矩
- **每个数字都要对过日志**。查不到的写「未记录」，不许估，不许从别的局套。
- 引 DeepSeek 或 Jev 的原话，要能在 decisions / run-plans / deepseek-reasoning 里找到。
- 写完一节后，重新 grep 一遍你写的关键数字（进场血量、每回合伤害、死亡回合），确认和日志一致；不一致的，在回报里写明（已追加的内容不许改；有错就在本局小节后面追加一段「### 勘误（时间，learner）」，只写改正的句子）。

## 5. 安全
- key 不许打印、不许落盘：不许读或 grep `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`，不许跑 `env`、`printenv`、`set` 之类会打印环境变量的命令。
- 只改 {{project_root}} 里的以下授权记录：notes/lessons.md（只追加）、学习账本 paper/materials/learning/ledger.jsonl（只经 learner/ledger.py 追加）、下文授权的提案 CLI 记录和 {{scratch}}。其他文件（ops/、paper/、notes/ 下的其他文件、任何代码）都只读。
- 不推送；不提交（lessons.md 和账本的提交由调用方做）。
- 不运行 play；不用 Zboubkiller DLL，不开 mod 自带的 autoplay。
- 不读游戏二进制（sts2.dll）或 .pck 文件。
- 杀进程用 PID，不用 `pkill -f`；不许 `npm install`；logs/ 只读。

## 6. 回报
最后一条消息按这个格式写（中文），不要写别的：

```
## 复盘回报
{{#is_ironclad}}- 已追加：<run id>（A几，第N层，死因一句话）……每局一行；跳过的写原因{{/is_ironclad}}{{^is_ironclad}}- 整局/流派摘要：<run id>：流派/转向、核心首次齐备、各幕末牌组/HP、Boss结果、死因与关键失血战；未知项明示
- 流派剧本/rk去向：目标ID、候选文件、三输入覆盖、我们与人类赢家的可核偏离；候选/复用/待证分列
- 已追加：<run id>（A几，第N层，死因一句话）……每局一行；跳过的写原因{{/is_ironclad}}
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - <run id>：<一句话> — <file:line>（新 / fix-queue 已有）
- 写成「未记录」的项：<run id>：<哪几项>
- 学习账本：<run id>：新增 <id,…>；更新 <id,…>（老错 <id>）……每局一行；`ledger.py check` 退出码
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：……
```

最后再单独给一个 json 代码块，给调用方的脚本读：

```json
{"task": "postmortem", "appended": ["<run id>", "..."], "skipped": [{"run": "<run id>", "reason": "..."}], "bugs": [{"run": "<run id>", "where": "agent/src/...:123", "what": "...", "new": true}], "ledger": {"added": ["<id>"], "updated": ["<id>"], "repeats": ["<id>"], "check": 0}, "code_proposals": [], "implementation_domains": [], "report": "{{scratch}}/report.md"}
```


## Roy 2026-10-07 学习授权与代码提案
先读 docs/learning-code-proposals.md。出牌、药水、SL、终局价值的经验及结构不一致，除了经验/账本必须同时保存代码提案，关联本角色证据局号/层/回合、账本 id、来源任务与 strategy-proposal 实现任务。只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记；专用提案队列与账本 CLI 是本任务明确的根目录记录例外，提案 Markdown 和 JSON 保存 {{scratch}}，不覆盖无关记录。

Roy 已授权：学习者有足够理由和自己核实的数据，可直接修改人定的出牌、药水、SL、终局价值规则，自测上线后通知 Roy；不再一律送回待审批。此授权不提供任何游戏事实；证据不足保留原行为、写清限制。只读复盘/审计/经验任务仍通过独立 strategy-proposal 实现代码，不让运维添加游戏知识。修改实际上线后先 date，在根目录 notes/for-roy.md 与 ops/inbox-dev.md 同时追加旧规则、新规则、证据/账本/任务、预期影响、回退方法；这是明确授权的双通知例外。无关角色保持等价，不改运维 prompt。

最终 JSON 必须带 `code_proposals`（CLI id 列表）与 `implementation_domains`（combat/potion/sl/terminal/structure；只填实际涉及的，纯工具可空）。报告保存 {{scratch}}/report.md。已经实现的提案只有实际 live 祖先源码 commit 才可登记 implemented；不要冒称 shipped。失败日志、工作树、初稿和缺数据均保留。

若 launcher 追加“本批运营 runtime 合同”，按该原批合同把逐局正文和发现写入 scratch，交 `operational_candidate`，覆盖旧共享 lessons/提交/合入要求；不改旧批次。原账本/代码提案 CLI、反证/通知、逐局核证与父要求保持。运营入库不等于经验或正式知识发布，后续提炼可经只读 query/report 取原文。详见 docs/learning-runtime.md。
