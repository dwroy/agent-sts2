# Silent 策略提案批次复核报告

批次：20261023-121225-strategy-proposal。基线及最终HEAD：950e323e8a52790e729f06fc92661e1e0c1ac96e。详细逐项处置、证据、既有账本、反例、拟议行为、验证与回退见同目录proposal.md。

结论：十个已领取提案均保持waiting。本批确认了若干已有观察及局部实现，未获得足以改变出牌、药水持有价值、SL探索或阶段排序的完整受控证据；部分诊断要求也未完成整案消费者验收。不能把已有候选/单动作审计、离线人工读回或一场局部胜利登记成十项整案implemented/duplicate。没有源码、正式知识、运行配置或游戏规则改动；fixes=[]，merged=null，无新增提交或发布编号。

## 绑定与初始检查

- 开工git status --short为空；执行git merge --no-edit main返回Already up to date。此处为普通队列批次，未套用旧专题报告完成口径。learn.json本批task=strategy-proposal、character=silent，worktree与题面一致，reason=proposal，含十个proposal_ids，不含research_request/implementation_request/proposal_repair。快照dispatch.json只保存本批行。
- 只读普通专题入口notes/strategy-research-silent.json，其running/batch绑定旧20261010批次，不匹配本次；未读取旧专题正文或替换本批范围。
- 六局runs.jsonl原始记录均为SILENT、A10、ended非空，各一条：751FN9QM9MHQ F17败、KV0JHNJCKXLS F33败、YQL8RZ8BWN1E F17败、L9SGRBB5R698 F17败、PU80F84P6HPN F33败、KEN58SH9SLZ6 F17败。PU的F17第5试胜与整局F33败分开记录。
- README、最新STATE-2026-10-19、decision-log末尾、学习协议及代码提案闭环均已读。STATE的历史停点与后来恢复运行的追加记录保留。未读取其他角色知识；自己完成、未派下级。运行档位按用户要求high处理，未改配置；本批未取得可独立核验的原生turn_context，不能据口头要求声称运行档位已生效。

## 证据机械流程与覆盖

按要求先运行根目录evidence_summary.py，再运行本工作树extract_evidence.py的指定V6/Jev四流命令和常规提证入口，全部nice19、返回0。输出分别为evidence-summary.json、v6-evidence/、evidence/，原stdout亦保存。日志只读；没有重截或覆盖初稿。

机械全流筛出4071条决策、4167条状态、1026条Jev原始请求/答案、43条SL记录、6份run-config及21条run-plans；V6原始流682行扫描，本批六局均0匹配。construction-log文件不存在，缺失不是零。states未整份输出给模型，仅脚本流式筛取，模型读取所需窗口及结构结果。

本批逐题阅读全文14份Jev request：完整state、完整questions/criteria、answers、error字段存在性，并读精确对应decision的chosen/result/gate_reject/selection_dispatch及后续states。重复题按已全文读取的基题加递归逐字段无损差分阅读；差分保存在questions/request-diffs.json，原行仍完整保留。14份请求共15个子问题（YQL含play、survival）。其余1012份仅机械定位，未逐题阅读全文，不能当完整覆盖。question-inventory.json逐条列全部1026份的局号、decision_id、原始ref、问题keys、全文阅读标记和未读原因；coverage.json为分局计数。生成questions/*.txt不等于模型已经阅读，未全文读取的额外生成文件不计入14份。

14份覆盖的具体窗口与理由：751 F13T3药水缺表/无药选项、F17T7配对；KV F33T5配对及毒药续问；YQL F17T10残壳药水；KEN F15T1技能药及F17T5/T10两对；L9 F17T11弃牌到下轮执行窗口；PU F17T14清本体到T15自爆。后两局并非以最后五条代表全覆盖，而是为同一阶段提案补读明确的执行窗口。L9/PU后续占位阶段记录另按SL及states核验。

身份只接受原始run_id/state.run_id/fingerprint.run一致或精确decision_id的原始decisions关联；所选Jev行均有显式run且fingerprint一致，1026份均能精确关联decisions。未用正文局号、question_id相似串或时间邻近建立局身份。状态前帧使用run+fingerprint+observed_ts精确一致唯一匹配，后帧依同局原始行顺序追到下一回合/房间；20个窗口均匹配，包含14个重点题和额外七次药水动作的并集。源raw按offset/bytes重新seek、逐行SHA核同，137条读回明细见raw-readback.json。SL阶段原始行17条另核，4次SL替换另核，补充状态原件另核，分别保存在phase-sl-audit.json、sl-deviation-audit.json、supplementary-raw.jsonl。

## V6与Jev必须分账的结果

- V6：本批六局在冻结流内全部no_match，不存在可归属的entries、jev_answer、fallback、unknown条目；这些字段应记“本批无可读行/不可判”，不能填成零收益、未采用或执行成功。六份旧run-config没有v6字段，不能从缺字段推定显式off，更不能套当前V6 on/off配置回填旧局。
- Jev：六局共1026行均call=ask且含answers，原行没有error字段；它们是请求与答案证据，不是V6 entries或动作成功率。原decision的fallback均为false，但未校验题均未作语义验收。所选题答案来自原行，具体采用还必须看SL/护栏及chosen、后续动作。
- gate_reject及selection_dispatch：本批4071个历史decision均无这两个字段。缺失是历史协议覆盖缺口，不报告为闸门拒绝0次或整线执行率100%。已读KV动作273403/273452有failed(wait)超时，随后再次选择与状态需另核；Jev未记录error不能抹掉动作错误。
- 本批没有V6正式发布/冻结包下局读回证据，也没有任何新策略自然采用或收益验收。不能从提证成功或模型题面完整推导这三件事。

## 支持、反例与未解决事项

具体数值与原文见proposal.md。这里保留影响结论的边界：751与KEN的同指纹SL对照可验证当轮血价/净扣差，不保证其后抽序、后续选择和敌回血不变。KV的零即时损血并列并不表示输出等价。KEN的T5案例反对只取当轮最少损血；PU的实际F17胜次反对把整局败或本体结束直接当阶段结局。YQL的毒2→8只是一帧状态变化，不是6减伤或未来胜线。

KEN七次实际饮药都核到槽位消耗及后续动作：F3攻击、F4稳定、F5速度、F11虚弱及攻击、F15发光水及技能；三次pending均另读选牌和状态。技能药样本中位示例“逃脱计划”与真实“斗篷与匕首”不同，真实挡4→12且T2仍46血。两次回血原帧为280336→280337（26/76→53/81）、280382→280383（46/81→75/86），六次Boss入口75/86空栏另存。没有逐药保留到Boss的实际完整支线，不拟合持有价值；旧101/102/103/104/105局统计未在本批复算，不沿旧报告数字冒称重新验证。

九经验联合提案没有在本批逐子机制做全面科学验收：力量/虚弱、逐张敏捷、荆棘、毒、临时减力、路线/休息、输出结构等不能合用一个有效分母。原账本首证、先验、shipped状态不改写；本批只追加报告/提案定位，不把观察再次计作新增独立支持。所有结论限已读Silent A10窗口，相关SL尝试按同局相关样本处理。

原始请求内potion_experience引用的历史A8/A9材料不是本批核实的Silent证据，作为题面原文保存，未读取其其他角色原件、未采用其统计或阈值。历史run-config含dirty数据文件，保存实际启动commit与dirty清单，不声称从clean commit精确重建当时运行树。

所有未全文阅读问题、未重算历史统计、未控制的后继、源流全局未知身份及损坏行均保留；没有把缺失归入本批或据此关闭父要求。本批没有新增游戏结论或与旧经验相反的新裁决，不新建代码提案或代填通知角色ACK。

## 已有实现核验与本批验证状态

只读live上下文f3fb25b73be7f170f46b240353995b9fe73596a6，source-audit.json保存路径、源码最后提交、Git blob、实际live祖先关系及本树/live逐blob相同结果。候选选择/持牌失血：9d8278702dbc581b5015ba7ec9a70dc0fb94cccb；单动作派发：fdaf787a372880b0438e73bcac7e6d2168b038ed；SL候选对照：66283dd9982bdd7f480da7a4d9bfefea0572a9ac；巨兽药水事实：40168f4a903ae1d8c48bd03006f8fea19fd3aa3c；explore现行源码：b01edf46b4b619f217d070a196e161df9fe716a0。均是已存在的live祖先，不是本批新增提交，也不等同十项整案已完成。

实际整轮字段actual_turn/actual_turn_result仍为null，单动作回执state_effect_verified固定false；anchorRank仍以enemyHpLeft原始血量比较同轮次序。新增整案实现数0。工作树源码与knowledge无差异，source-diff.patch为空。没有新源码故未运行撤源码负对照、tsc、vitest或case回归，tests={"tsc":null,"vitest":null,"cases":null}；原提证/字节校验返回0不替代这些测试。未合入live、未新增eval版本、未标implemented/duplicate/shipped或伪造通知。实际账本追加与最终只读完整性核验回执另存ledger-update-result.json、final-verification.json；密钥扫描结果单独保存，不提交原日志内容。

## 机械附表

以下附表由本批实际manifest、coverage和question-inventory直接生成；原始manifest保留每个全流冻结切点与SHA、损坏行、身份缺口和逐局计数。summary、指定V6提证与常规提证是三个时间点，源日志持续追加造成切点不同，不能混称一个全局冻结快照。本批已选原始行跨切点逐SHA读回一致，旧切点保留。

### 分局覆盖

| run_id | decisions | states | Jev原行 | 全题阅读 | 未阅读全文 | V6 |
|---|---:|---:|---:|---:|---:|---|
| 751FN9QM9MHQ | 615 | 624 | 137 | 3 | 134 | no_match |
| KV0JHNJCKXLS | 669 | 686 | 104 | 3 | 101 | no_match |
| YQL8RZ8BWN1E | 571 | 582 | 253 | 1 | 252 | no_match |
| L9SGRBB5R698 | 635 | 653 | 251 | 1 | 250 | no_match |
| PU80F84P6HPN | 1033 | 1064 | 172 | 1 | 171 | no_match |
| KEN58SH9SLZ6 | 548 | 558 | 109 | 5 | 104 | no_match |

### 全题阅读精确ID

| run_id / F / T | decision_id | decisions原行 | Jev原行 |
|---|---|---:|---:|
| L9SGRBB5R698 / 17 / 11 | 455f3c6b-e616-429b-b763-4a836e431cae | 244274 | 21029 |
| PU80F84P6HPN / 17 / 14 | 598b34ea-1cf3-462d-a20c-f6f228716a73 | 247194 | 21644 |
| 751FN9QM9MHQ / 13 / 3 | 179c20e7-efd4-44e8-8ee1-406abd398d69 | 272361 | 27699 |
| 751FN9QM9MHQ / 17 / 7 | fd52f1c7-ecb9-4c66-99ba-e1419817dc34 | 272531 | 27740 |
| 751FN9QM9MHQ / 17 / 7 | 9836a127-543c-4e2f-adb9-e4c7bc103a3b | 272652 | 27770 |
| KV0JHNJCKXLS / 33 / 5 | 610bfa55-18de-410d-ac05-cf5c43772962 | 273400 | 27899 |
| KV0JHNJCKXLS / 33 / 5 | 427b1bd7-6bb7-440e-bc15-caa96029c513 | 273450 | 27907 |
| KV0JHNJCKXLS / 33 / 5 | 0cd00ba9-4994-4bc1-8d15-25d241031d40 | 273451 | 27908 |
| YQL8RZ8BWN1E / 17 / 10 | 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef | 274087 | 28173 |
| KEN58SH9SLZ6 / 15 / 1 | fed78f61-e646-42f4-b93d-84efa3e6575d | 274272 | 28211 |
| KEN58SH9SLZ6 / 17 / 5 | 12a3f202-decf-4ef5-bec3-dbd2ea4db5e3 | 274484 | 28251 |
| KEN58SH9SLZ6 / 17 / 10 | 4b79d414-135c-400c-a965-9446f0cab72a | 274505 | 28257 |
| KEN58SH9SLZ6 / 17 / 10 | a2ec4e39-f5ad-4380-ab93-f804ddbebf3f | 274568 | 28271 |
| KEN58SH9SLZ6 / 17 / 5 | 2073c41d-00b2-43a5-9ccb-946168bf512b | 274601 | 28276 |

### v6-evidence 冻结源

| stream | source_size（字节） | source_sha256 | invalid / incomplete |
|---|---:|---|---|
| v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 | 0 / 0 |
| jev-prompts | 2941520280 | 27ccda28c9ce0a78622684b17b90acff09164e6c2784134992520f1aa44f73fa | 1 / 0 |
| decisions | 4195037920 | 797a28188d4cb83d74b378bb423bde4c50d415e35f5f0eeba7149604bef7ddef | 2 / 0 |
| run-config | 2879195 | 384f8961196430d0558c70bd2d0b97c404a351d93b5d47d9905909bbc7569586 | 0 / 0 |

### evidence 冻结源

| stream | source_size（字节） | source_sha256 | invalid / incomplete |
|---|---:|---|---|
| states | 16417048605 | 219434dcb3bf3bd07ed8f391733888fe213105f9cb54c1b00c910c945af53ba7 | 2 / 0 |
| decisions | 4195554194 | e3daddc3e9926eadb81f02c437cb754c673a8b0d28110ea1d92b503492aab3e0 | 2 / 0 |
| sl-attempts | 58121210 | 03a022efc50d7e5c02cd1b607b46bbc1a54e66a1ffdd329fe186456811154ef4 | 0 / 0 |
| run-config | 2879195 | 384f8961196430d0558c70bd2d0b97c404a351d93b5d47d9905909bbc7569586 | 0 / 0 |
| run-plans | 11422366 | ce4da8f27fec7b66ee389a13aff76f379c0538347e83c8b9e75dc8f3eb139ace | 0 / 0 |
| brain | 1464258437 | 1996c265e0abc837db41bf5dc24d1b0a78caa854c05d7d8523d013589cb4255d | 2 / 0 |
| v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 | 0 / 0 |
| jev-prompts | 2941911102 | 0337de0e0eb7887df998591b9c0f674b742637af1919bf18d4473000e6052a13 | 1 / 0 |

V6四流manifest中：decisions全源有1934条unknown_identity、1674条unmatched_decision_id；常规states全源有3611条unknown_identity。这些是扫描全源的身份缺口，未分配给本批六局。摘要源与两个manifest的损坏行都保留，不能用最后五条gap_refs冒称已逐条核读全源缺口。
