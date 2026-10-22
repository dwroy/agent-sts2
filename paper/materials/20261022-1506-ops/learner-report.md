# 20261022-144301 静默猎手策略核验报告

本批结论：两个异蛙战策略问题均缺可比后继，保持现有行为。无源码、正式知识或经验库改动；fixes=[]，merged=null，没有版本/提交/新shipped。本报告不关闭学习父要求，也不声称本批产物已被大脑自然采用。

## 身份与基线

开工 git status 干净，HEAD=`298671864ed6497a9d79d977b270d6a5b3b2c57e`。已读 README、最新 STATE-2026-10-19、decision-log末尾、学习协议及代码提案闭环。STATE的旧停点与后续decision-log的恢复记录均保留，未据旧停点操纵运行。

只读根 learn.json 本批行：task=strategy-proposal、character=silent、reason=tick、指定工作树匹配；无 research_request、implementation_request、proposal_ids、proposal_repair。根 notes/strategy-research-silent.json 绑定旧20261010-150327批次，故未承接专题、不读另一请求替代身份。本批无手动研究/实现附文与回执要求。登记快照为 dispatch-readback.json / research-binding-check.json。

按普通任务要求 `git merge --no-edit main` 无冲突快进，当前 report.base=`3cbe91ae4638a35b37946d61bfde4a99d13d92bf`。快进只带论文生成数据和记录，未改变 agent/learner/ops/eval/knowledge。source-pins.json 固定当前对照源码 blob/SHA，source-worktree.diff为空；不冒充历史live执行源码。

十个runs原行均SILENT/A10、ended非空，均victory=false；死亡层依次49、39、9、49、17、48、33、43、8、33。详run-identity.json，每行保留offset/bytes/SHA。派发key称A11:433不覆盖原runs实见A10。原始日志只读，未运行play、联网、npm install、读其他角色知识或派下级agent。未改账号/强度配置；本报告不把启动器文字或游戏run-config当本学习者原生turn_context的生效证明。

## 提证和覆盖

先按指定 evidence_summary.py 生成 evidence-summary.json，SHA=`ffe8de2a6e71c46e72301d57bdc5d91ca7e5461adb8f7db1d789f9079e902215`。随后完成指定四流 v6-evidence 提证及默认 evidence 提证，命令stdout各自保存为v6-extract.stdout.json / extract.stdout.json。两次冻结切点独立，未覆盖旧报告或零行稿。

实际读取两份manifest。v6专用冻结：v6-build 64,735,263字节；Jev 2,677,435,255字节；decisions 3,761,594,114字节；run-config 2,608,362字节。默认提证稍后冻结states 15,811,873,718、decisions 3,762,336,692、Jev 2,678,925,186字节。每流完整SHA、逐行offset/bytes/SHA、count和身份出处均在原manifest/输出行保存；不同切点不混作同次快照。summary的decisions另冻结于3,761,394,414字节，保留其身份。

通过 audit_evidence.py 对v6专用匹配行逐条 seek 原日志读回：Jev1357 + decisions6233 + run-config10 = 7600行，原字节SHA、row及精确decision联接均通过。V6本批0匹配，未读不相关局的题面。verified-refs.jsonl保存全部逐行引用，byte-verification.json保存计数；这只是机械身份/字节验证。

人工完整审阅三题如下；“Jev:行号”是原流定位标签，实际所属局由原行run_id/fingerprint.run与精确decision_id核定，不用question_id相似串或正文提及归属。

| 原局/层/回合 | 原Jev行 | 精确decision_id | 人工读取内容 |
|---|---:|---|---|
| T1XWKCUQW4T3 F9T8 | 77587 | 554f436f-9eb0-42b4-8e98-55d93d5fee3d | 完整request含外部参考、三候选、answers、decisions选择/回执与后继 |
| D7FJX8EH8CD6 F8T1 | 78431 | f69969e2-202e-4371-b363-359ba4fa152a | 完整request含外部参考、两牌线/药水选项、answers、decisions与后继 |
| D7FJX8EH8CD6 F8T16 | 78463 | 4067f253-e3a9-4b83-b2f5-627c873214af | 完整request含五动作/生存问题、无答案/error、代码兜底与后继 |

selected-questions.json保留三个完整原始row，包括投影审计字段；模型人工审阅的是完整request、answers/error与执行相关字段，未逐字段解读全部decision_evidence。三题的gate_reject字段均不存在，不能自造拒绝原因；d472338与d476203的selection_dispatch只验单动作，state_effect_verified=false、whole_plan_executed=null；d476249无此回执。后续执行用97条两场fight-decisions原行和101个状态原行另外核定，不用一条completed推整线成功。

两场101帧沿已有复盘的精确字节引用重读原logs，保留原origin_index与旧source_size：T1旧截点15,651,817,788、D7旧截点15,785,794,362。全部101条又与本批默认states提证按offset/SHA/row交叉一致，见state-cut-crosscheck.json。关键题decisions指纹与s489237/s493373/s493420精确一致，随后按本角色连续状态窗核动作后果；不是靠时间邻近猜身份。

| 局号 | 机械Jev行数 | 完整人工题数 | 其余处理/未读原因 |
|---|---:|---:|---|
| 28T664BN1NCA | 216 | 0 | 非选定异蛙问题，只核身份/字节；未分析连战/护栏策略 |
| SXBR2JL68B3W | 107 | 0 | 非选题，只核身份/字节；未分析药水或预算策略 |
| T1XWKCUQW4T3 | 32 | 1 | 只审F9T8，其余31题未完整审阅；药水早期重问未覆盖 |
| 72RFEYV6WNPA | 310 | 0 | 非选题，只核身份/字节；未分析女王连战 |
| 1RUG121U962B | 92 | 0 | 非选题，只核身份/字节；未分析墨影SL |
| U8NZKEC218G7 | 137 | 0 | 非选题，只核身份/字节；未分析实验体阶段 |
| C0JP9YMVNFQP | 138 | 0 | 非选题，只核身份/字节；未分析双蟹SL |
| CDXCWKNSBN8M | 140 | 0 | 非选题，只核身份/字节；未分析骑士/速度药水 |
| D7FJX8EH8CD6 | 57 | 2 | 只审F8T1/T16，其余55题未完整审阅；中段仅跟踪执行/状态 |
| 3HL65SWXDX2Q | 128 | 0 | 非选题，只核身份/字节；未分析双蟹HP护栏 |

总1357题中3题完整、1354题未完整人工阅读。question-coverage.json逐题列明原因、原始引用、question keys及答案/error有无；未使用摘要最后五条冒称覆盖。脑题、路线/休息、其余战斗和全历史均未作本次游戏结论范围；默认提证存在不表示已人工分析。

## 两项发现与处置

完整方案、旧/新行为、反例、关联账本、切分、预期影响和回退见proposal.md。两项均waiting；不是队列状态写入，也不是原四局整体提案已完成。

T1 F9T8，关联silent-0286/0021/0101及原silent-proposal-d5471d4f8c8cc9a6：三线当轮损20一致，敌终态不同、五轮样本胜数2/2/3。原答分打，d472338/472339分别打目标0/1且completed，s489237—489240敌7/22→1/16、玩家26→6，实际损20吻合。T9弃牌动作先pending后由选牌原帧完成，HP6→5；T10两感染、7挡、5血死亡。不能据分打败局认定集中杀小虫会赢，也不属于新感染漏算。缺同入口集中分支的完整可信后继及独立验证，保持排序，不能因当轮同损强制全部并列。

D7 F8T1/T16，关联silent-0443/0286及原silent-proposal-83fc36386eb5a932的D7子问题：T1直接结束0损0伤估计84%，双打0损12伤估计74%，两者五轮内都0/8胜0/8死。Jev .86选直接结束，d476203确实结束，s493373→493374宿主仍66；T3—T6末仍63。当前源码rollout.ts terminal/valueAt明确对未结束样本使用终点估计，sampled wins与估计本来分列；没有发现将0实胜机械错记为84%的纯bug。不能仅凭两局死亡调终局阈值/强制进攻。T16无Jev可用答案，代码fallback喝毒，目标19HP当步不变且毒增6，随后玩家死、目标仍13HP；不能称Jev选药或救命成功。未知hold_hp与成本0已分开，不能靠此重定药价/早喝规则。

两局是发现输入，未提供后于本批的新独立验证局。缺冻结历史运行源码、模型/训练输入、同抽牌后继与终点逐样本特征。先完整匹配模型/实盘及召唤后阶段，再作同随机输入条件对照；机制不齐保持unknown。若未来拟合，按晚于本批的独立Silent完局预冻结留出，不把题数或SL尝试当独立局，不用本局同时拟合验收。其他角色及未观察进阶行为保持等价。

## 缺失、来源与限制

- v6-build原流存在682行，十局在该截点均no_match；不是整个历史缺流，也不是entries/jev_answer/fallback/unknown均为0。四类在本批没有可归属row而不可评价，不从完整Jev题面推出V6条目采用。
- 十个run-config均mode=on、admission=interfaces_only、delivered=false、reflex=off、direction_replan=off；on不是正式交付。没有把reflex off解释成Jev全关。
- construction-log源missing，保留未知。全源states/decisions各2条invalid_json、Jev1条、brain2条；截点内incomplete_lines=0。全源未知身份保留manifest类别及有限gap refs；有限末五条不是完整身份缺口清单，没有补归属或拿缺失作0样本。完整抽取后未发现所选原行截断。
- 十局run-config的commit/dirty均null且ENOBUFS；runs.code=current不能确定历史准确源码。因此当前源码仅作明确固定版本的逻辑对照，不将当前实现登记duplicate或冒其为当时运行版本。
- 完整题面携带external:spire-codex、v0.111.0的外部机械参考；其URL、SHA及许可保留原request。这里只核“题面给了什么”，游戏结论均由本角色实盘支持，没有把外部文本变成新实盘机制/样本或重新下载外部数据；未读取其他角色知识。
- 末局败果不证明候选排序、路线、休息或药水错误；未执行分支不是实盘反事实。提证、源码对照、报告不证明发布、下一局消费或自然收益；保持父要求开放。

## 验证、记录与交付

固定材料26条断言通过（frozen-facts-check.json），只核原题数字、精确指纹、动作、逐帧HP/敌血/毒与字段缺失；没有调用LLM、网络或随机模型。这不是生产实现测试/收益实验。无源码修改，因此tsc=null、vitest=null、cases=null，撤源码失败/恢复通过不适用；未运行生产测试，不伪报成功。无代码提交，不触发live合入、版本分配、上线日志或双箱规则变更通知。

只经根learner/ledger.py update为silent-0286/0443追加本批proposal/report出处和未完成说明，不追加重复support、不改claim/first_run/prior/status/version，不标本批shipped。没有新机制结论，故不新建重复经验或代码提案，code_proposals=[]、implementation_domains=[]；原提案链接在proposal.md保留，既有源码祖先未核，不登记implemented/duplicate。

最终安全扫描、CLI回执、工作树与产物SHA验收另存security-scan.json、ledger-update-receipts.json、final-verification.json。任务过程脚本全部位于本批scratch，不进入生产源码；报告交运维路径即本文件，提案路径为同目录proposal.md。工作树保持干净，fixes=[]、merged=null。
