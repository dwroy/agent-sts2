# Silent策略提案证据复核报告

十项派发提案均保留waiting。本轮没有充分证据支持新的出牌、药水、SL或终局参数变更；没有新增源码、提交、合入、版本或测试成功。已有局部实现不代替宽提案验收。

## 身份与基线

- batch：20261021-021302-s2-strategy-proposal；task=strategy-proposal；character=silent；reason=proposal。
- 工作树：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-021302-s2`。初始git status干净；本批没有research_request/implementation_request，仅处理派来的十个proposal_ids。
- 普通任务按要求执行git merge --no-edit main，返回Already up to date。未读取其他专题代替身份，未领取其他提案。
- report.base与原始/结束HEAD：`f7a78458599c53e616671b7839b1adb3f931d5e9`。源码和knowledge零修改；scratch为忽略产物，最终Git状态单独记录。
- 未调整模型/账号/config；本报告没有核得本会话原生turn_context，不以配置或任务文字宣称档位已生效。没有子agent、网络或play。

## 已结束角色核验与完整机械索引

| run_id | 角色/进阶 | 已结束/层 | decisions | Jev请求 | V6-build |
|---|---|---|---:|---:|---|
| KEN58SH9SLZ6 | silent/A10 | 2026-10-07T12:23:25.134Z / F17 | 548 | 109 | no_match |
| TXZ6RVMQA09D | silent/A10 | 2026-10-07T13:14:06.991Z / F49 | 762 | 171 | no_match |
| WQZVENQ7DTRP | silent/A10 | 2026-10-07T13:55:26.934Z / F33 | 766 | 328 | no_match |
| 02HB4L0C3C67 | silent/A10 | 2026-10-06T22:47:37.843Z / F12 | 211 | 42 | no_match |
| 4D4J8USKCPAV | silent/A10 | 2026-10-06T01:51:07.744Z / F17 | 527 | 167 | no_match |
| F4QKG4J1AJJZ | silent/A9 | 2026-10-05T20:04:35.380Z / F38 | 703 | 167 | no_match |
| JLN5SK17W4FQ | silent/A10 | 2026-10-05T22:55:20.454Z / F33 | 790 | 147 | no_match |
| LS8035TB32P3 | silent/A10 | 2026-10-06T12:36:15.675Z / F42 | 816 | 182 | no_match |
| NB8KCF6HRGVF | silent/A10 | 2026-10-06T10:03:30.963Z / F31 | 466 | 116 | no_match |
| S9UZAK0JP0C0 | silent/A10 | 2026-10-06T04:00:23.109Z / F33 | 826 | 247 | no_match |

runs.jsonl的十条原结果与offset/bytes/SHA在evidence-summary.json的outcomes.ref中；角色大小写规范化为silent。所有局本轮只确认各自身份与结束，不把十个锚点当新增十局对照。

先运行规定evidence_summary.py，再按规定入口冻结两组extract_evidence.py。摘要只作事实索引。逐流manifest已实读；每条选中原始row都保留source/source_size/line/offset/bytes/SHA与identity出处。run-plans按run字段选择，其余显式身份与fingerprint.run一致才接收；Jev仅用显式run或精确decision_id原行关联。没有用正文提及、时间相邻或question_id相似字符串认局。

| 冻结组/流 | source_size | 前缀SHA256 | 选中行 | 全源invalid/incomplete |
|---|---:|---|---:|---|
| v6-evidence/v6-build | 64655258 | `3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234` | 0 | 0/0 |
| v6-evidence/jev-prompts | 2236384112 | `bae7d8f200ea2deb9a8f0b219c0ee22b02d4801ac2cc6728490e0ede1f56b6d1` | 1676 | 1/0 |
| v6-evidence/decisions | 3060170348 | `7af312ec7050002d7e5d7838900fc88b19b3fa7d1781a5d99156a2d0d99bfc07` | 6415 | 2/0 |
| v6-evidence/run-config | 2288809 | `b3b86ba58494d14f423475f33c8ddadd106ab4f413a719c247da0feac969c01f` | 10 | 0/0 |
| evidence/states | 14835107726 | `8f32e3aa3da9b798aea3b6d520cf49ed826f2f4ab074d86a4ee9575c965a1dcd` | 6684 | 2/0 |
| evidence/decisions | 3060176618 | `00837ef019d6db404a3d56ab2df42af4c7397d881bd8beca57a214c59c84593a` | 6415 | 2/0 |
| evidence/sl-attempts | 50496071 | `f7036e70fc57b0999e0c617cb7df673c2e55b1a6c94ac84f50007b64f5d7c657` | 56 | 0/0 |
| evidence/run-config | 2288809 | `b3b86ba58494d14f423475f33c8ddadd106ab4f413a719c247da0feac969c01f` | 10 | 0/0 |
| evidence/run-plans | 10177400 | `c4f36f1e0c26248b0ecd0a9039b9d0786d57e4e2363988cbbdc82fc581f74209` | 51 | 0/0 |
| evidence/brain | 1142592694 | `9fc4ba27fcb10ffbaf73341abf640d01fc77137302e78723e678f0d72a9393d9` | 304 | 2/0 |
| evidence/v6-build | 64655258 | `3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234` | 0 | 0/0 |
| evidence/jev-prompts | 2236384112 | `bae7d8f200ea2deb9a8f0b219c0ee22b02d4801ac2cc6728490e0ede1f56b6d1` | 1676 | 1/0 |

两次decisions冻结切点相差6270字节，是并行追加的不同冻结前缀；各自前缀SHA独立保存，不混写。各组所选十局行数相同，选定问题逐行原字节复核。原件未被覆盖。
V6四流组全源decisions有1934 unknown_identity、1419 unmatched_decision_id；states有3356 unknown_identity；这些不能按正文或时间补认本批。manifest中最后五条gap_refs只是定位例子，不是完整缺口覆盖。全源invalid行也不补认角色。指定流均存在、冻结末行无截断；历史是否漏写不能据此排除。
V6-build对本批0匹配；十条原run-config均无v6字段，不能写成显式V6 off。entries/jev_answer/fallback/unknown没有本批原行可解释，记未观察/不适用，不把它们各填成零。Jev request/answers/error另账：1676个有效选中请求、1727个问题槽位，均带answers，error字段未见；这是有效匹配行范围，不能把全源invalid行或历史未记录请求当作零错误。
提证content回执pending_host_seal=true/deferred_errno=18；本轮没有宣称宿主封存完成。原始offset和SHA可复读，后续封存交原流程。

## 模型实际阅读覆盖

完整核读下面五个原始Jev request（包括state、全部候选、原答案和限制），并从原日志按offset复读校验SHA。WQZ两条T9题面除previous_attempts和耗时外共享内容逐字段等同，补读了全部差异；并未用最后五条索引替代。五个问题均为单plan槽位。原始完整内容在question-1..5.json和selected-questions.json。另一次F4首题仅作schema读取，不计完整后果验收。
其余1671个请求/1722个槽位只做全流机械清点与精确决策匹配，没有逐题读完整题面或核完整后果。question-inventory.json逐条标model_read，保留未读decision_id与题型；未读原因是本轮有界核派发提案的资源/SL窗口，其他题不支撑本轮结论。七局的非容量问题不宣称实读；未重提的1913/Q6/NHA/K367/SADL不从原提案摘要补成已核实证据。

| 问题/局层回合 | Jev原行:offset/bytes/SHA | decisions原行:offset/bytes/SHA |
|---|---|---|
| Q1 TXZ6RVMQA09D F48 T6, `15fc6d36-ed83-4cde-b5e6-cbe4dffe9f5e` | 28446:408363978/22496/`a015a10c1b6ebe22b83de4f4283722cca8f793592e4bc884bf92347f85adcfa9` | 275383:700580823/14887/`15ca22ecdf11aae9642e50a5b96083206ce9accb59b48565a53839f1a5085a5e` |
| Q2 WQZVENQ7DTRP F33 T9, `2ef38219-ff73-4fcf-851b-c625adc04a86` | 28628:410753342/21953/`454166280d210031f489266014513c76583fb0af65924e44fd8237187e57e57a` | 275894:702884103/13650/`bac96c661ba164c7ac7c2791a4f5299cf329b058d26268fdc5137d597d2a84bf` |
| Q3 WQZVENQ7DTRP F33 T9, `8c880109-456d-43b3-887f-04302c922d89` | 28663:411318455/23573/`6aedf346cf59d60184539cf175cc9084ae8af94159ca249a61a1ffd9fe3b9b90` | 275960:703220664/14653/`6b556bf294b5eb8280a871579b6c11ee38c60a3480473ee27052b30381f46813` |
| Q4 WQZVENQ7DTRP F33 T7, `64c16c85-cdb7-4b7d-ba05-95cda0851041` | 28764:413226099/26711/`f0557293d34b905a06f136f678797dc655c5021f4a07eb4969bac89950e22e5e` | 276139:704167351/13302/`592f6401636648f5e62d4cfaa17df8078d0fe2a51d0974d259124909f930edcc` |
| Q5 KEN58SH9SLZ6 F15 T1, `f459d9ea-34bc-4054-91d8-3b6094462289` | 28209:404727232/21091/`8bd1e0d9e70bda430479a48f9f91a40714dad1090d750c0790cb761c546c48f6` | 274267:696617893/14438/`a7249760521e92c092187b546eecaa2dcf013848618ba43bb731504d5f1ee937` |

1676条均有本角色同一精确decision_id的原始decision；五个选定id又在完整冻结decisions前缀重新扫描，每id恰一条顶层原行，正文提及不算事件。五条皆fallback=false、result=completed；gate_reject及selection_dispatch字段均缺失，不能解释为全系统零拒绝/零选择异常。选择派发缺旧格式专门字段，只能用chosen、expect、result和后续state实际变化核。execution-chains.json另列后续每个状态按run+fingerprint+observed_ts精确关联的动作；不是靠时间近似认局。

## 原帧结论、反例与未知

1. KEN Q5：Jev原答p1，chosen实际use_potion slot1（发光水），completed。states280348→280349显示七手换十手且该瓶消失；后续真实牌面重算，另饮技能药的result为pending (unstable)，280355 CARD_SELECTION→280356新斗篷入手，再实打，不能把pending单独当失败或完成。下一轮280359仍46HP。边界280377为F15胜后46/空药；F16休息46→75，F17以75/空药进入灵魂异鱼，最终败。全局获胜战斗损血依次0/3/0/37/6/0，事件6/10及休息27/29分别记；原题面的未饮线与随机药样本不是受控实盘后继，不能推出留药或提前喝必胜。账本silent-0019/0020。
2. TXZ Q1：原答plan6=BUBBLE_BUBBLE+POISONED_STAB，SL替线改BUBBLE_BUBBLE+METAMORPHOSIS；actual chosen先冒泡，275384续羽化，275385结束。第二次原线states281480–281484为48→45、敌460→424；第三次281536–281539为48→48、敌460→433：少损3同时少伤9。羽化在题面明确unmodelled；不能把后抽变化归给单张或模型胜率。states281563/281564胜F48后4HP、空药，281565 F49尚4HP且无可操作能量/手牌，281566 GAME_OVER为0；敌为TEST_SUBJECT，runs.jsonl的death_fight仍写永世沙漏，二者原样保留，不用该结果摘要覆盖终帧。8→56及11→56为SL恢复（281446→281447、281502→281503），合93，不算治疗；药瓶恢复同理。账本silent-0228/0255。没有连续胜的受控替线，不提高任何终局权重、不放宽必死规则。
3. WQZ Q2/Q3：第二/三次T9 fingerprint完全相同；原答两次均plan2，实际第二次侧步/逃离/防御，第三次由SL改飞镖/侧步/逃离。states282075–282079为HP26→13、敌184→160；282144–282148为26→4、敌184→145，差额为多损9、多扣15。两者下一轮并非胜利，所有1200整场样本0胜且低可信，侧步也被标unmodelled。不能从全败并列推出候选等价安全。账本silent-0079。
4. WQZ Q4反例：第二次T7原线states282066–282072为0损、24扣、沙坑敌回合后3；末次T7改先逃离，282330–282336为4损、同24扣、沙坑敌回合后4。出逃离当步4→5是尚未递减的中间帧，不应把其5与旧结算3直接相减。生存者的原result为pending，之后selection实际弃打击，手牌变化及结束回合均有帧。这里支付4血确实延长一沙坑回合，约束“所有多损血线都禁用”的解释；仍无完整获胜反事实。账本silent-0018/0079。
5. CUNNING容量：八个本角色局41次use_potion，原decision期待CUNNING_POTION，精确同观测state与下一帧均逐SHA核验；36次手2–7各添3张、2次手8添2、3次手10添0。满手分支均WQZ；八局/重复SL不当41独立局，SADL未覆盖。原行/新牌/药栏保留cunning-drinks.json；容量观察不能替代穿插、保留、重新规划及完整后继策略的联合验证。账本silent-0257/0258。

上述状态原文在state-windows.json、fixed-states.json、ken-boundaries.json、txz-restores.json；每行均附offset/bytes/SHA与身份。模型只读相关字段投影及有界窗口，没有把整份states灌入上下文。完整流式提证6684行不等于模型逐帧学习6684行。题面历史经验引用及旧跨角色potion_experience文字不作为本轮机制/药价证据，也不搬入知识库。

## 现有实现核验与适用边界

冻结源码审计所见实际live HEAD为`4528a751f17e341a97e7ff70295ec9fba0c947e9`。六个相关源码与本分支逐SHA相等（source-audit.json），以下真实源码提交均为该live祖先：

- `0e4fe4df89a06682468e0e4716c12126e76369d5`：live_ancestor=True。
- `1698adc96ba434a46942321e0237b70657e625b2`：live_ancestor=True。
- `ebf8c57ecd811cceeb85fa636d49abbbb4c65dc8`：live_ancestor=True。
- `df528ddf14da72f9973e13444f45ee7c3917a67c`：live_ancestor=True。

0e4fe4/1698覆盖当前轮资源差额和沙坑记录，明确execution=unverified，不改SL筛选门；ebf8覆盖已观察组合开场模型，非任意遗物组合；df528覆盖紧勒相关观察分支，非全部增益/药水/复活联合校准。只核源码现状与祖先，不冒称十个宽提案全部duplicate、当前消费者自然采用或本批收益。这里的历史源码快照也不是十局执行时源码或其后发布回执。

## 派发逐项处置与后续

| 提案 | 账本 | 处置及具体缺口 |
|---|---|---|
| silent-proposal-08eaa60bcc449852 | silent-0019, silent-0020 | waiting：KEN胜战耗药、事件/营火回复及空药进Boss已核；缺不饮、提前饮、留药到Boss的完整配对，登记原Markdown未恢复，不能拟药水持有价。 |
| silent-proposal-92920295a648b540 | silent-0228, silent-0255 | waiting：TXZ同盘T6少损3亦少伤9、F48胜后4血及F49开场归零已核；缺相同抽序的完整两战替线及独立校准，不能调整SL或终局权重。 |
| silent-proposal-a327449c331efbc1 | silent-0079, silent-0018 | waiting：WQZ同盘9血换15伤、4血换一沙坑回合已核；差额审计已在live祖先中，仍缺完整受控后继支持改变探索排序，不能把局部审计当宽提案完成。 |
| silent-proposal-a099e89437e942bb | silent-0030, silent-0257, silent-0258 | waiting：本批八局41饮容量边界已核；缺SADL原局、登记原Markdown及保留/重读/SL恢复至最终派发的联合验收，不能以生成容量替代完整出刀策略。 |
| silent-proposal-47910f82a1fdd98f | silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255 | waiting：TXZ开场4血归零和WQZ两类差额已核，开场模型及差额审计有live祖先；缺登记原Markdown、连续替线与持药价联合校准，宽父保留。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019, silent-0020, silent-0050, silent-0253 | waiting：原Markdown及SHA一致，但来源1913SE84AXQF/Q6M2Y34MWKRE不在十局派发锚点，本轮未重提其完整原始链；缺早喝/留药的完整后继配对，KEN不能代证。 |
| silent-proposal-38a49e6c97f31eea | silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262 | waiting：现有紧勒相关源码与live同SHA且相关提交是live祖先；登记原Markdown未恢复，1913/Q6来源链及增益、再生、临时药、复活、SL联合窗口未重核，不能整体登记duplicate。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019, silent-0020, silent-0021 | waiting：登记原Markdown未恢复；1913/Q6资源链及原统计独立分母本轮未重核，仍缺事件/路线/休息替线配对，不能借KEN资源链完成原要求。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | waiting：原Markdown及SHA一致；NHA2KW0RB7VP不在派发锚点，本轮未重核跨弃牌完整计划、同预算排序及独立后继，不能以WQZ替代本提案的证据与验收。 |
| silent-proposal-04b6b430759815ed | silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265 | waiting：登记原Markdown未恢复；NHA/K367/SADL原始窗口未重提，油灯首次消费跨动作/新战/SL恢复及其余子公式未联合验收，不以现有局部公式关闭整项。 |

四份可读Markdown全部核SHA一致；六份原exp路径缺失，根同名路径及HEAD精确路径亦无叶，原对应归档名未定位，详proposal-integrity.json。不臆造恢复件、不以队列摘要伪造原文。未读的原来源或旧统计分母明确保留未知。原父要求、队列和历史复盘未被直接修改。
本批proposal.md：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-021302-s2/learner/runs/20261021-021320-622e9f88-95be-4337-8fa2-030fd5e4397e-strategy-proposal/proposal.md`。沿原十个CLI提案ID与账本链接，不重复新增经验/提案，不将研究结论标shipped。后续须补原文/完整配对和独立后移验证，仍由调度器按原队列派发，运维核实实际上线后才可登记shipped。

## 检查、失败保留与交付边界

- 没有生产源码或知识改动，未提交、未合live、未分配release_id；tsc/vitest/cases均null。撤源码失败/恢复通过不适用，不造成功测试。scratch审计脚本不进入生产源码提交。
- audit_questions第一稿遇不带decision_id的选中decision事件而KeyError；补为显式检查该字段后重跑成功。保留failure.txt，不把工具初稿失败归生产代码或抹掉。两次读取尚未生成question文件失败也记该文件，随后完成实际原文读取。
- 本轮没有独立新游戏结论或代码提案，不新增重复账本，原ledger出处均在assigned-original-rows.json；该文件为只读选取，不修改根账本。
- 最终Git HEAD/diff/status及gitleaks扫描结果见verification.json；该本地验证不代宿主封存、正式发布、下一局消费或自然收益。
