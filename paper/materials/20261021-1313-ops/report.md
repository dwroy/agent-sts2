# 静默猎手本批策略证据与处置报告

base：`e909704e19e29a4a60d5f3cd0c354188f536715a`。batch：`20261021-124302-strategy-proposal`。无生产源码/正式知识修改、无提交、无合入、无版本；fixes=[]，merged=null。十项提案均保留waiting，具体缺证逐项列于[proposal.md](proposal.md)。原计划授权实现，但本次核实不足以支持新的策略规则或整个提案的实现认证。

## 身份与输入

dispatch-identity.json保存根learn.json本批对应行，只处理其十个proposal_ids；没有research_request/implementation_request/proposal_repair。六局runs.jsonl全部重新seek核SHA、角色SILENT、A10、ended非空，六局均败，见runs-verified.json。普通研究请求绑定20261010-150327历史批次，本批不承接专题。未修改模型/账号/运行配置；本报告不据启动参数声称原生档位已核生效。

开工git status为空；HEAD为上述40位base；git merge --no-edit main返回Already up to date。本批没有merge live操作。source-verification.json保存只读live快照及各相关文件的SHA和真实live祖先；文件内容相等与分支上最近提交祖先性分别记录，不能用等blob冒充同一个commit。已有实现只能证明局部现状。

十份保存的原Markdown均逐字核登记proposal_sha256，原路径缺失的七份从既有原字节副本读取，保留其路径与SHA，不把原路径缺失说成原件不存在。原件拷贝在originals/，originals-manifest.json保留来源。26个相关账本的原行在ledger-rows.json，不搬用其他角色证据；本次不新增经验或支持分母。

## V6与Jev机械提证

按指定入口先运行evidence_summary.py，再运行两次extract_evidence.py。evidence-summary.json只作事实索引，没有用最后五条代替完整覆盖。v6-evidence/和evidence/各自保留独立冻结截点，不相互覆盖。v6-evidence冻结如下：

| 流 | 冻结字节数 | 源前缀SHA256 |
|---|---:|---|
| v6-build | 64678849 | `f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da` |
| jev-prompts | 2373545646 | `a65540f61ee9e60ad91476552dc9d1eaf77c34402dee362bf83478a099508c38` |
| decisions | 3284705371 | `cf1ad840e9b43c3c5ab21982c75ae288f71d9eb560988373372637d47ba21827` |
| run-config | 2397325 | `73bca12329d79e0fe0a5bec46609e19f477578b88d3a171622c7a5325537a3e9` |

V6-build源存在，六局全部no_match；旧run-config六行均无v6字段、loop也无v6字段，Jev context为v1。不能从缺字段推断明确的V6 off，更不能把无匹配写成entries=0/jev_answer=0/fallback=0/unknown=0。上述四类V6事件在本批没有可解释原行，各自为未观测；本批不是V6正式发布、消费者采用或收益验证。

Jev原始行分别136/139/58/92/70/84，共579。机械索引全部使用显式run_id或精确decision_id原始关联；不从正文提及、时间邻近或question_id相似字符串认领。579行均有request/answers且无error字段（字段统计，不评价未读答案正确性）。这与V6 entries/jev_answer及fallback/unknown语义分开。

decisions冻结全源有2行invalid_json、1934条unknown_identity和1473条unmatched_decision_id；Jev全源有1行invalid_json；states全源有2行invalid_json和3410条unknown_identity；brain全源有2行invalid_json。完整manifest保留坏行精确引用和身份缺口的有限尾索引；这些全源缺口未被强行分配给本批。选取流没有冻结边界残行，不能据此认定历史原题每个字段都完整。题面known_draws自带省略号时仍缺完整抽序。

两次提证共11459条输出行逐条回到logs以offset/bytes/SHA复核，并比对原始JSON；这是机械核验计数，不是11459条游戏结论。states流完整机械提取3432行，模型只读55个所需窗口的结构化事实，不灌整局states。所有源切点、输出SHA与逐行identity关联在各manifest和evidence.jsonl内；raw-verification.json给出重核计数。

## 实际题面覆盖

本次完整读取题面、全部候选、原答/错误字段及chosen/result/gate_reject/selection_dispatch的十题为decisions行267375、267612、267696、268455、269068、269707、269748、269754、270216、270282；questions/逐题保存原始request、answers及决策回执。十题都唯一匹配同run、同observed_ts和fingerprint的前状态，再连接后续states；时间仅在身份已核后用于状态顺序，不用于认领Jev所属局。

| 局号 | 完整读取题数 | 仅机械索引、未完整读取题数 |
|---|---:|---:|
| VLZ6CCT8AQ0A | 3 | 133 |
| 8JRE1C4H4Z2W | 2 | 137 |
| CA5KE8GFJ9X2 | 1 | 57 |
| 5PM6JAQG6FNQ | 1 | 91 |
| 61E2QS63Y9WU | 2 | 68 |
| DUZUBAJ3A8GP | 1 | 83 |

其余569题逐题列于all-question-index.json，统一说明不在本次选定原题窗口、未作科学验收。各提案的其他历史窗口、全部资源链和所有十五机制未完整覆盖，不将原提案摘要的数字当本次新增核验。完整题面存在不等于选中，选中不等于整线执行，完成回执也不等于净收益。

十题chosen和result均存在、result为completed响应；gate_reject和selection_dispatch字段均历史缺失（保存present=false，不能记作false/零拒绝或完整派发认证）。SL替换须读rationale；首个chosen动作相同不表示后续同线。question-state-links.json保留每题精确来源与后继窗口。proposal-evidence-references.json仅借既有定位，target-raw-rows.json已重新seek核35项带提案关联的原行引用，去重前计数，非35个独立样本。

## 当前消费者真实读回及限制

本批用当前工作树learner/lib/selection-execution.ts和其依赖，输入本次重新提取的六局原状态/决策，不调用LLM或网络，也不依赖刷新知识JSON。consumer-input-manifest.json保留冻结输入SHA，consumer-readback.json和六份consumer-output.json.gz保留实际输出。

CA5原decisions行267143、61E行267517、DUZ行268789/268818/268864没有decision_id，完整输入被消费者拒绝；原错误保留，只在明确existing_decision_ids_only范围读取其余决策，不填造ID。其他三局完整输入可读。输出的certified_full_candidates全部为0来自消费者保守保留actual_full_candidate_result=null的合同，不能解读为所有候选都没执行。

重新读回8JRE F33首/第三试T2净HP −3/−15、敌血−10/−17；61E F17 T6净HP−8、敌血−33。61E F23 T4因turn_opening_unverified为unknown，手工原状态端点25→10及两敌合扣47另列，不替消费者填成功。这是离线审计读回，未证明生产大脑/Jev下一自然局已消费，也不关闭父学习要求。

初次tsx CLI因沙箱Unix socket listen EPERM退出1，原err保留；改用node --import ./agent/node_modules/tsx/dist/loader.mjs同源直接加载退出0。不是游戏错误或源码测试失败。初始只读检查曾遇sandbox扫描不存在的其他工作树路径，重试成功；另有临时脚本KeyError（历史缺ID）及导入路径错误，修正诊断脚本后完成，未改历史原行。command-failures.txt保留原因。

## 交付、验证与未完成项

十个proposal_results全部waiting；未领取其他队列、未新建重复ID、没有implemented/duplicate/shipped声明。未改生产源码，因此未运行撤源码红灯/恢复绿灯、tsc或vitest，tests固定null，不报0或套用旧测试成绩。没有合入、eval版本、Roy规则变更通知、发布或自然收益。正式知识和铁甲行为没有本批差异。

本次报告及proposal.md路径通过原账本CLI追加链接；既有shipped状态不降格，不将本次报告当shipped或新支持局。最终机械检查与gitleaks结果见final-verification.json及gitleaks日志；原失败、原始证据及缺证保留，不清理自身工作树。

