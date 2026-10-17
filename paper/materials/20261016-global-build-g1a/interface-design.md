# G1a 连续 Boss 结果与资源接口

这是原 roy-20261016-global-build / G1a 的实现说明，owner 为既有 watcher 原生线程。工作树 global-build-g1a-interface-20261016，基于 main6476cb0d；源码待本次 full 完成后提交并交原 ops。知识来源仅为原学习者六局端点契约和已上线 continuation 实现，不新增机制、参数或对局。

复用 continuationInput、fightSample 和原 B2/B3/C2 runner，增加 continuous-boss-result-v1。第一战胜的每条样本仍使用其实际剩余 HP、物理药槽与未用复活资源进入原次战模板，使用原确定种子和第二 Boss 分布。原非正胜利 HP/缺资源异常继续走 C1，不补资源，不修原0332模型。当前问题 payload、排序、校准、采样/C2完成判定及其他角色行为不变。

接口把首战、在首胜条件下的次战、联合原始模拟结果分开。每个结果同时给 wins/samples/unknown/value/reason；缺请求样本、截断、缺资源以及首胜条件分母为零均保留 null 和原因。旧现有 win/win_cal 字段保持不动；新接口不把两个独立单场概率相乘。联合 calibration.status 和 S.status 均为 unknown，S.value=null，不使用单战 Platt 或单战 S 平均。

每条线/每个候选最多记录原顺序前三条确定种子样本。firstResources 是模拟首战结束后资源，secondEntry 是原 helper 构造的第二战入口，openingHpLoss 仅记录原已实现扣除；两者不使用均值 HP。药水以含槽位的 key 分开，已耗 Fairy/其他复活资源不恢复。资源记录只覆盖模拟已捕获的 HP/药槽/复活；奖励后状态、实际第二战可操作时状态和未观察开场效果仍为 unknown，不能称整个真实端点已建模。

B2 在 boss_sim.lines[*].continuous 记录；B3 在 boss_sim.continuous.base/options 记录。结果通过既有 worker 样本序列化、汇总和 C2 memo 保留，没有额外战斗采样或模型调用。G2 可在既定依赖满足后消费此结构，当前仅增加日志。

固定验收沿原 silent-double-boss.test.ts：两场各20HP独立获胜而同样本8HP连战死亡；不同样本8/18HP分别构造6/16HP入口；重复药槽与已用复活不恢复；请求缺样本、次战截断、缺资源、无首胜及空样本保持unknown；序列worker/选项汇总保留资源与联合S未知。新增夹具初次复用旧20HP计划导致第二样本仍8HP，已改为对30HP测试输入重新求解计划，生产断言/时限未改，原失败 native 字节保留。检查原件见interface-validation/checks.json与初次失败档，tsc0/focused12通过，full运行中。

原ops沿已有通道窄集成精确六叶；诊断接口本身不改变游戏行为，不另造行为号。知识行为独立V5-R368与原G4R367保持。仅本次新源码需按规则检查，不重复G1c源full或旧模拟。待实际集成、组合树宿主检查和新自然消费者后验收；旧RQ记录只作baseline，不借绿/借消费者。


### 2026-10-16 09:23:07 CST G1a接口新源full真实终局与窄补验

新接口六叶staged tree a602689590f05aba144dacc51dfaa0f312edd393（base6476，尚未源提交）：tsc0、12固定题通过；全量491文件490过/1失败，4927测试过/1失败/2跳，1386.49s，原full rc1保留。唯一brain-codex router abort evidence题max_gap_ms356<原500ms，前置trace断言通过、后置脱敏断言该full未执行；只补同一原题1过30跳rc0，4.19s覆盖完整断言，六叶及原测试SHA/断言/1500ms限时均未改。不重未变源full或源模拟，不称full0。完整候选source-candidate与log/SHA及已有自然验收预登记交原ops，实际herdr transport0，接收/明确失败处置待其本人；接受后原WT源提交并由原ops持锁窄合，不抢原723482 host，不借旧树绿。接口仅日志，不改行为/编号或S。G1a知识要求/G4完成是既有窄交付；接口新自然0、总父及0332宽父保持，S决定仍待Roy。


### 2026-10-16 09:33:56 CST G1a接口源提交与实际main/live窄集成

原ops本人明确接受未变源单题补验，实际处置interface-ops-source-disposition.json；watcher才在原WT仅六叶提交bca06096b08b1e9bf0e11fda3e1f87fe4d83ec07/treea602，原full1不改。原ops持锁窄合main72e1d25ed016d6193f293b7a5f57c4f9eee78fa6/live0e7998bfa8df267dcf8835a57949bdb982c9feb0/tree815582403e14d7c501724fc5d8ee416b82beb3bf，源均真实祖先；本人两边工作副本/已发布叶24次SHA核同、差分均仅六叶，知识/config/版本和并行dirty保持，无新行为号。新815582完整host沿原075726唯一通道RUN，PID1871154/birth100604903本人09:32确认活跃，未给终局、未借723482/adb0绿。

仅在此实际发布关键事件读最新原run-config：FGKZALWSTQQ1于08:56:22启动、code298e74fd（9dirty均旧记录已保存），不含新接口，明确排除，不重启或热改。新自然消费门槛仍0；随后只在真实下一自然启动/关键Boss/局末核源与资源消费及health。G1c已实际归档40/尾2与精确723482 full0而范围完成；G4和G1a知识窄要求完成；G1b S决定仍Roy待回，G2/G3/G5不越依赖，总父及0332宽父保持。
