# 静默猎手策略复核报告

本批20261014-003949-strategy-proposal的十个原提案已逐项复核，全部waiting。没有足够证据支持新的策略权重、SL门槛、通用药价或完整动态弃牌规则；没有新增源码、提交、合入或行为版本。详细证据、账本、反例、验证方法和逐项缺口见本目录proposal.md及proposal-results.json。

基线：91111e484a5d6f5709123a3b8ce516bb757b6832。开工git status干净，普通批次git merge --no-edit main返回Already up to date。本批没有research_request或implementation_request，未将另批专题接为本任务。

| 来源局 | 角色/进阶 | 已核原状态 | 已核原决策 | 本批限定楼层 |
|---|---|---:|---:|---|
| NHA2KW0RB7VP | silent/A10 | 602 | 584 | 17、24、25、27、28、30、32、33 |
| P74C04AEPL1F | silent/A10 | 410 | 395 | 17、22、23 |
| G33HU22H2543 | silent/A10 | 879 | 850 | 31、32、33、47、48 |
| RC61MFQM63Y6 | silent/A10 | 694 | 674 | 17、23、24、27、29、32、33 |
| BTSRF7JL1W1Y | silent/A10 | 653 | 635 | 17、31 |

3238条原状态和3138条原决策与旧冻结文件字节完全相同；限定楼层1366状态/1342决策，时间戳加指纹1342条均唯一匹配。另从已核原文件抽取五局实际营火动作，N/G/P/RC/B实回分别120/133/42/105/42。哈希、字节偏移与动作事实在evidence-manifest.json、各局素材及rest-action-facts.json；未重新全历史统计，也未把五个锚点当全历史分析。

关键判别：NHA F33 T1换线多16伤、多损6HP；RC F33 T1触媒替打击少7伤、多损4HP。即时差额不证明整战某条替线更优。P74 F23第四试T3原零损线因实际弃精确切击中断，重算余血−7并死亡；首/第三试相同弃牌但卵已退场，是不同条件反例。BTS F31 T3抽弃后重新选的最终线模拟3赢1死，实际死亡不能单独认模型bug或拟合新权重。

已实现子项的实际live祖先：投斧首牌身份e784dd9f043bf87c29109573f48975f9903280d3；普通生存者唯一单弃bf423c173d3be348a4ad714e1d26516df619ff41。离线整轮审计源码c719bc048fa848119f217ba0e966aac7e2671ddf亦已合入，但不能因此关闭本批包含资源消费者、动态后继和独立校准的宽提案。live切点7e04d9a42dd6080a8d3716dd165e44d4b30c458d，文件SHA与祖先核验见live-source-proof.json。八个相关文件中五个字节完全相同，另外三个只有注释署名差异，原差异保存在main-live-source.patch。

未实现原因：分别缺动态弃牌分支与实打对照、受控SL整战和逐样本轨迹、召唤复活/最终死亡中间帧、连续资源消费者及独立校准。每个派发id都有具体waiting原因；既有子项不冒称整体duplicate。没有新游戏事实入经验库，不添加重复代码提案、不修改旧提案原文、不代填shipped或消费者验收。

验证：完成原日志字节核验、原提案Markdown SHA核验、状态/决策唯一匹配与源码/祖先审计。未改代码，tsc/vitest/cases均null；撤源码失败及恢复通过不适用，没有动生产源码。没有合入、eval版本或上线通知。gitleaks结果和最终工作树检查见verification.json。账本仅通过根learner/ledger.py update追加本批报告链接及具体处置，保留既有机制状态、证据、claim和shipped历史；不新设已上线状态。本报告不是经验已入库或大脑已采用的回执。

诊断保留：一次原决策验证脚本误以为每条历史记录都有decision_id，遇缺该字段退出1；已改用逐局索引和原字节验证完成全部3138条，无原日志或源码变更。原失败说明保留raw-decisions-initial-verification-error.txt；重新核验日志audit-evidence.log及脚本保留。部分早期全文件读取没有收到完成回执，不用于本报告结论；最终使用有界偏移及明确exit0的核验。

运维入口：本目录proposal.md、report.md、proposal-results.json、result.json及ledger-cli.log。十项继续waiting沿原id待新证据，父学习要求保持；本批fixes=[]、merged=null、HEAD保持完整base，工作树干净。
