# Silent策略批次报告

结论：本批完成十局身份与冻结流提证、三道完整Jev题面/答案/执行/后果核验。证据不足以选择新的固定策略或数值；无源码修改、提交、live合入或发布版本。原取牌缺口补证回0496，不冒称已实现。

## 身份与范围

- 本批20261021-163323-strategy-proposal；base/HEAD/main开工时均为 `c371a1f530d7d3f13fd38b1c58d00c6e7d3f5f45`，git status为空，merge main为Already up to date。基线登记一致。
- learn.json对应行为task=strategy-proposal、character=silent、reason=tick，无proposal_ids、proposal_repair、research_request、implementation_request。普通批次所读strategy-research-silent.json绑定另一旧批次，故本批不套专题、不过写根请求/learn.json。原方案全文与SHA已读；没有领取/解决其他批次提案。
- 十局runs原行均为SILENT/A10、ended非空、victory=false；调度key里的A11:406是进度标记，不能把这十局改报为A11。runs原文及其ref在evidence/runs.evidence.jsonl，均经原偏移回读核验。
- 本会话未读原生turn_context/请求回执，不能宣称high/普通档已经实效；未切换模型/账号/配置。

## 完局与题面覆盖

| 局号 | 终层 | decisions | Jev原行 | 错误行 | 完整题面实读 | 未完整读 |
|---|---:|---:|---:|---:|---:|---:|
| TS0BHDLAH8ME | 17 | 406 | 64 | 0 | 1 | 63 |
| 5E5JFKE9BVSU | 17 | 358 | 74 | 2 | 0 | 74 |
| 862JGUUWUQZX | 33 | 765 | 125 | 4 | 1 | 124 |
| JLCZ36YLDEBE | 17 | 356 | 71 | 1 | 0 | 71 |
| JS5UV1DUB1K1 | 31 | 418 | 83 | 2 | 1 | 82 |
| 4AA19CXDKQK6 | 39 | 606 | 133 | 1 | 0 | 133 |
| FG2Z2Q6GD1DC | 17 | 455 | 97 | 0 | 0 | 97 |
| 4H1T5UB23GEP | 27 | 404 | 64 | 0 | 0 | 64 |
| 5YKZ3TXFACN9 | 25 | 532 | 97 | 0 | 0 | 97 |
| GVCL0CRJ78AX | 17 | 305 | 66 | 0 | 0 | 66 |

共4605个decisions、874行Jev（864行带答案，10行有human-pace budget exhausted错误；均为ask日志，错误行不当有效答案）。完整语义读取3题，其余871行仅机械索引，逐行ref/身份/错误和未读原因保存在question-coverage.json；不把摘要最后五条当全题覆盖。选题为原提案中的三类具体边界，其余七局未据机械计数形成游戏结论。后续状态/回执的事实核验不等于把该窗口内所有新Jev题也作过完整语义验收。

## 冻结流与原字节

| 流 | source_size | 冻结SHA256 | 无效JSON/截断 |
|---|---:|---|---|
| v6-build | 64678849 | f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da | 0/0 |
| jev-prompts | 2413100453 | fbe2c38dd447f61e7fc76c7b4f5ec4d81fe8d44aa9828cfe883233be0810c32c | 1/0 |
| decisions | 3354404046 | 3b9103f70db83b3b227a268bcdf8733f951250247e96d31664cf1b4dde1fd4d7 | 2/0 |
| run-config | 2439529 | 098ee236b3ede0451ab97c07fca0fd538a03c1e3f5f63932f3f67884c4f1e23b | 0/0 |
| states | 15274767772 | 89cb73369623f5adc2ce3fc7b477474b26fb98bf2d43f293cf62fa2114c9c43d | 2/0 |
| sl-attempts | 52762474 | 6f528a3a7538e7793f8cadc07553ecf7424ce4aec32ce7c809051471e26e34f7 | 0/0 |
| run-plans | 10389124 | 59ce27e30a4263597edb634f3d4be5ff24e8ce8d7c224303eff1e953b35cfacd | 0/0 |
| brain | 1218908618 | 9e1ba8e553fdea93c353298ccab3bf16618eab9cd1747fb693fd070ce2bbd379 | 2/0 |
| fight-plans | 2233957 | 4dc030fa7152e844b5dd3bae7a3fd414dafcc604ad5eb97747f4698e4b75de97 | 0/0 |
| runs | 406156 | ac263a466c101665d071a4de661e2b38557b8c47e685c457ae5e87718798912b | 0/0 |

- 实际读取两个evidence-manifest.json，不只看提证命令退出码。每行offset/bytes/SHA及身份来源由原共用提证入口保存。摘要与提证冻结切点不同，完整保留两套；在这十局上的匹配计数一致，不覆盖旧截点或零行文件。
- v6-build冻结64678849字节、660行：本批十局全部no_match。没有本批原始row可读；entries、jev_answer、fallback、unknown均为未观察/不适用，不填虚假的零计数或用Jev流代补。run-config均V6 mode=on、四种decider=brain、reflex=off、direction_replan=off、admission=interfaces_only、delivered=false；不将开关on当V6构筑消费者已经运行，也不把no_match当历史整流缺失。fight-plans同样no_match。
- Jev流在该切点有1行全局无效JSON，decisions有2行，states有2行，brain有2行。它们无法解析身份，不能归本批，也不能删掉或当零；逐偏移缺口原封保留在manifest。decisions全局unknown_identity=1934、unmatched_decision_id=1494；states全局unknown_identity=3431，未归入本角色样本。Jev在本切点的可解析行没有身份gap。
- 所有保留的Jev行只按显式run_id/一致fingerprint.run或精确decision_id原行关联；未使用正文提及、问题编号相似或时间近邻归局。状态窗口先核显式run，再以完整fingerprint和observed_ts与题面同时精确相等锚定；后继只取该局连续原状态，遇换局/换层/回合重载停止。
- 原始source保留只读；对象发布回执有pending_host_seal=true/deferred_errno=18，不能声称宿主已seal。输出证据文件可读且实际使用；不重跑或覆盖旧产物来隐藏该限制。
- raw-verification.json逐条核103个原始行：完整三题、40状态、40决策、10配置和10完局记录。每条重新seek原日志、核长度/SHA并比较JSON；原字节归档selected-original-rows.jsonl。未向模型输出整份states。
- 初版材料脚本误用states.ts<=question.ts导致AssertionError，已保存audit-initial-failure.txt；改为原指纹+observed_ts精确对应后通过。该校验不是撤源码红/恢复绿，亦不是产品测试。

## 三项候选处置

完整事实、反例、旧/新行为候选、缺数据、后续验证/回退见proposal.md；question-*.json保存完整原题和答案、decision-*.json保存完整原决策，question-windows.json保存所有选中状态/单步回执与出处。

| 候选/原CLI提案 | 原证据与账本 | 本次处置 |
|---|---|---|
| 抽弃兑现 d7c38f35e4bd613d；取牌沿0cd2f0dfbc4a0805 | TS0BHDLAH8ME F17 attempt2 T8—T10；0418/0496 | waiting：总推进33相符，但真实页只有1张打击、0选确认；没有取回两张。不能用本页强制取满或验收整个取回模型/完整来源后继。 |
| 双蟹 f02bf7d768f7b383 | 862JGUUWUQZX F33 attempt4 T5—T8；0062/0385 | waiting：所选打爪3、下一轮损1相符；另外损9只是未选预测。旧“固定打火箭”提示与经验冲突仍在，Jev本题未跟随旧提示，不能归因或外推新固定序。 |
| 药水 ed86692b5612e878 | JS5UV1DUB1K1 F31 T2—T4；0431/0385 | waiting：hold_hp=null和charged_hp=0已分列，plan2之后实际T3饮药，T4仍死。缺早喝/留药实盘对照，不拟持有价。 |

三个原完整题的gate_reject字段均缺席，并非证明整局无拒绝；chosen/result/selection_dispatch已逐字段核。三题receipt均state_effect_verified=false、whole_plan_executed=null，只有另读状态才能证明所述局部效果。涅奥之怒续步pending/选择页/重规划、T10 SL未派发明确保留；不把全部步骤当最初计划自动完整执行。双蟹和千足虫窗口读至真实GAME_OVER；前者末两敌74/60仍活，后者前段退场而中后段仍44/25。

## 原链、账本与消费者限制

- 四个code_proposals均为真实原CLI id，existing-proposal-links.json逐项验证保存Markdown的SHA与原登记相同；未新建重复id、未直接写专用队列或改租约。没有派发id，最终proposal_results=[]；上述waiting为报告中的逐候选处置，原队列依旧保留。
- root learner/ledger.py update返回0，原回执ledger-update-receipt.json。0418/0062/0431只追加证据核验说明和本报告链接、保留原shipped状态；它们既有shipped不代表本批相关缺口被修。0496追加本局support与链接、只登记proposed，保留claim/first_run和旧历史。无新经验条目、无经验库改动。
- 本次不重新发布知识，不认证本批正式版本、下一局读回或自然收益。源码启动身份因run-config ENOBUFS全部commit/dirty未知；不把当前工作树或live参照冒作历史dirty源。
- 旧提示冲突已经在原f02提案记录，本次保留并补原文出处；没有新增一套相反的固定打法或宣称排队即交付。0496不因报告/账本proposed关闭。

## 限制与验证口径

- 仅三道题完整语义阅读，完整资源/路线/胜战耗血链本次未独立重建，因此不形成全局资源因果结论。其他871行的题面/成功/错误状态都没有被默认为已学习或全部可执行。
- SL尝试与短窗样本不是独立局；同题未选分支不是实盘反事实。不同长程预测、时钟估计、校准值、MC样本和真实结果分账，不以单局反例宣布概率必错。未拟参数、未作训练/留出或借跨角色样本。
- 不修改共享提示/铁甲行为，不修改ops prompt、请求、配置、账号、STOP或对局，不运行play/网络/LLM/游戏二进制；没有live合入、版本、提交、源码撤修实验或tsc/vitest。tests均null，不能写成功0。
- 交运维的提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-163323/learner/runs/20261021-163328-e34f57ed-0410-4a8c-a006-c3245ab9ba4c-strategy-proposal/proposal.md。无需为无源码报告造空提交、eval版本或合入；实际后续实现/发布与科学父闭环仍由原流程处理。

## 最终材料检查

原no_change/cadence只读验收已返回有效证明；HEAD/base一致、tracked工作树干净、source-diff.patch为0字节。gitleaks对本批目录353.94 MB全量扫描退出0、未发现泄漏；gitleaks.json保留结果。此处只验材料与身份，不冒作tsc/vitest、源码或发布测试。

## 机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261021-163323-strategy-proposal",
  "base": "c371a1f530d7d3f13fd38b1c58d00c6e7d3f5f45",
  "runs": [
    "TS0BHDLAH8ME",
    "5E5JFKE9BVSU",
    "862JGUUWUQZX",
    "JLCZ36YLDEBE",
    "JS5UV1DUB1K1",
    "4AA19CXDKQK6",
    "FG2Z2Q6GD1DC",
    "4H1T5UB23GEP",
    "5YKZ3TXFACN9",
    "GVCL0CRJ78AX"
  ],
  "fixes": [],
  "skipped": [
    "TS0BHDLAH8ME：抽弃/取回后继只核本窗口；沿0496原提案补证，未覆盖完整来源/主动零选等固定回归，不把33相符当完整候选兑现。",
    "862JGUUWUQZX：当前窗口支持朝向血价而非固定杀序；旧提示冲突保留，历史9/12、8/39分母及角色限定提示回归未核，不改共享提示。",
    "JS5UV1DUB1K1：未知药价及本轮/整战无药已分列，实T3饮药；缺早喝/留药受控后继，不改药价/护栏。"
  ],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-d7c38f35e4bd613d",
    "silent-proposal-0cd2f0dfbc4a0805",
    "silent-proposal-f02bf7d768f7b383",
    "silent-proposal-ed86692b5612e878"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "structure"
  ],
  "proposal_results": [],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-163323/learner/runs/20261021-163328-e34f57ed-0410-4a8c-a006-c3245ab9ba4c-strategy-proposal/report.md"
}
```
