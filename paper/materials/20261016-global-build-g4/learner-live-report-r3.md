# G4 revision 3：实际 live 固定消费者交付

2026-10-16，写入前已运行 date。请求 `roy-20261012-concrete-core-decklists` / revision **3**；冻结输入 SHA `13f08f48c42377df6983f906c2792043cb2ae9177a58a8fcd2b902d3d4cca36e`，关联 `roy-20261016-global-build/G4.1–G4.3`。

**本次限定经验的 live 发布与固定消费者交付完成。** 原 ops 已将源 `f79983e1cae6ec066814e8085959638bc827106c` 精确集成，实际发布祖先 **`86a4a119eb8e7e1e61be9fda957edd74a70e96f5`**，tree `adb0266d517d31a17f3b14d07143bea924f95eca`，正式 **V5-R367**，live 组合经验 **2026-10-16.2**。原学习者在这一实际 live 代码和知识上调用原消费者一次，231库存、12新段及15旧结论全部通过，真实回执为本目录 `consumer-receipt.json`。

此完成仅指本请求 r3 的学习、经验发布和固定读取；自然采纳、胜率改善、精确宿主结案以及更宽量化父/global-build其它阶段不因此完成。正式注册/交付确认仍由ops与watcher处理，不代填ACK。

## 原owner与历史保持

原owner/thread `01a12eba-13a8-7550-ac47-692d3d19bed1`，原batch `20261012-140741-strategy-proposal`；本次技术接续batch `20261016-083055-strategy-proposal`，同一工作树、账号/home/权限及原沙箱。实际原生 turn_context 已核 `gpt-6.1-sol/xhigh/default`、workspace-write/no-network，见 `native-binding.json`。本树HEAD保持 `cef3c5adc84655dfd04a605647fd4d634ca6c017`，没有同步main、再合源码或改知识。

原075639批的 done/blocked/merged=null和五共享记录冲突保持；原报告、result、source-only回执、失败与旧r2原件不改。`original-blocked-record.json`保存原记录，`preserved-inputs.json`保存本次使用原件的SHA，执行后逐项再核一致。新材料全部另存在本目录。没有另派agent、重新研究、重抽日志、新模型/API、游戏动作、旧模拟或源码/full测试。

## 发布与并行经验核验

先读根G4 `ops-publication/publication.json`、`owner-readback-resume.json`及双通知原字节。发布回执SHA与恢复回执匹配；源f799和实际发布86a4均经Git独立核为实际live祖先。日期保留源版本2026-10-16.1及G1a原版本，实际组合为2026-10-16.2，不整库复制回旧日期。

把原ops的pre-G4 live `3394e7912f2b4bec3715761858f831f3fa6040dd` 经验对象与当前发布逐项比较：236对象中恰好原四条核心经验变化，其他232对象完全相同，G1a及其它并行经验保留。四个after对象与原源提交及changes.json逐对象相同。当前P/D/S/R四模板文件字节仍为 `fa2bbf98407f9898ee8fcbcd76d8de731a3a2228c23f8b01a63384b53e12b500`，身份、candidate、匹配条件没有改变。证据见 `live-composition-verification.json`。

账本 `silent-0493` 已由ops经CLI标shipped，实际版本 `V5.global-build-g4-core-qualification1`；已读原shipped-cli回执并核当前fold。代码提案继续引用原 `silent-proposal-fee52fe475a0d0ac`，不重复登记、不将其它宽提案冒报implemented。

## 同一固定消费者的实际执行

未经修改地执行原 `learner/runs/20261016-global-build-g4-r3/consumer.mjs`，原文件SHA `eee4e0270104897c803fbbfb296f4c55cf7e994b65458208ba17990681e007b0`。只把输出stage指向本目录/live；所有原脚本、changes、231状态/审计、原KF9三帧仍从原路径读取，先后SHA不变。

实际加载 `.worktrees/live/agent/src` 的生产模块及该live的common/Silent知识，冻结输入、输出、知识文件清单及经验原字节。完整经验文件SHA `f297a356ef1afcd4b6c9819294cad98b4473a8c0fdf17c6d8e0c0b796a8f478c`。这次不是源端回放，也没有将旧12/15/231结果改名为live。

- 生产 `missingRequirements + constructionPlanContext` 对原231状态逐项核对，231/231通过，P/D/S/R全部可见且仍candidate。
- 原KF9 F2奖励、F6升级、F22商店三个真实状态经 `parseGameState → RunJournal.render → KnowledgePrompt.apply`；每题四个新段及五个旧结论全部实际出现，分别12/12、15/15，mode=full。
- 原实际进程exit0、约0.95秒，model_calls=0、game_actions=0；原负对照exit1/恢复exit0只复用上一阶段，不重跑。
- 初次共享读锁busy时未启动消费者，exit75和原wrapper副本保留。之后对实际live只读冻结，执行前后核HEAD/tree、全部实际源码/相关知识文件SHA及干净状态，一致；未写live、未占锁改源码，也未与原宿主通道争抢写操作。实际消费者只运行这一遍。

实际记录见 `live-execution.json`、`live/input.json`、`live/output.json`、`live/inventory-output.json`、`live/verification.json` 和 `live-source-knowledge-manifest.json`。回执kind=fixed-consumer/status=passed由这些实际输出断言产生。案例标题装饰省略，与原消费者相同；读取并不等同自然选择、执行或收益。

## 十要求的live覆盖

所有对象均active、带本角色证据。按当前实际live对象重新计算Python `json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()` 的SHA256；未沿用发布元数据中其它序列化算法的对象SHA。完整ID/SHA在 `coverage.json` 和最终JSON。

| requirement | 实际live经验 |
|---|---|
| candidate-templates | silent-core-poison-defense-observation |
| upgrade-effects | silent-bouncing-flask-poison；silent-accelerant-triggers |
| core-ablation | silent-deck-burst-observation |
| effective-dpr | silent-aeonglass-artifact-growth-sl |
| boss-readiness | silent-aeonglass-artifact-growth-sl；silent-core-poison-defense-observation |
| choice-consumption | silent-deck-burst-observation |
| global-g4-template-core-eligibility | 原P/D/S/R四条core经验 |
| global-g4-r-direction-nonselection | silent-core-discard-relic-observation |
| global-g4-experience-live-consumer | 原P/D/S/R四条core经验，实际12段读回 |
| global-g4-unknowns-and-objections | 原P/D/S/R四条core经验的限定/反例/未知 |

旧六的研究、升级/附魔、8臂配对、有效DPR与连续boss限制完整沿用原r2及r3报告，不新增计算。当前四类候选与旧五套具体牌表分列；HNX/25226/YF/L704的尝试/回合及LTQ F18/F23原证据仍由原报告定位。四候选审查和R零主选的限定结论已进live，不表示已验证稳定核心、最小充分性、自然取得路径或普遍R优先级。

## 通知、验收与限制

ops已在发布时按旧/新规则、证据/账本、预期和回退双通知；本次逐offset/bytes/SHA复核实际追加段，没有代写确认。原两异议 `48648a0af1e3e62eaf8bca9d`、`823a7d336ca57361b5f99faf` 的ops_forwarded、watcher_received、roy_notified六份真实receipt及实际证据SHA均独立核过，见 `prior-notices-verification.json`；此结论只限这些既有回执，不冒称本次新交付已被Roy阅读。

本轮没有源码或经验修改、新提交、合并、版本分配、账本重复追加或新代码提案；tsc/vitest/cases固定为null。原精确组合宿主由ops通过原单链核验，`host-request.json`当时为pending；不重复full、不借旧树绿，不把其pending当代码失败或本次固定读取未发生。

经验/实际消费者机械闭环将调用现有 `verify_experience` 只读函数及原提案链接检查；不会调用finish/ack、写请求或learn.json。新completion只报告实际发布祖先86a4，保留原075639的merged=null。
