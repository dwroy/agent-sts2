# #48 首批：旧经验 → 大脑策略 / rk，Boss 与精英

身份：`github-issue-48-experience-strategy-rk-20261023` / `issue48-boss-elite-001`；角色 Silent；本文件是待接入原策略流水线的冻结任务，**不是已派发回执**。实际 batch、工作树、lease、原生 session/turn 必须在原调度器真实启动后绑定。Roy 原授权见 authorization-original.md、issue48-intake.json；#50 仅学习第4条，开发第1–3条归原开发会话。

## 调度与实现归属

- 保持统一 `strategy-proposal` 流水线，不恢复独立 experience-update 链。回刷是低优先级来源：正常复盘、正常策略/提案及原重任务队列先获准；仅剩余准入使用原槽位/learn.lock/工作树租约/账号隔离/磁盘门，不新增模型池、定时器、守候或旁路。启动后若正常任务到达，在本批自然停点让行，不热切/重放。
- 当前缺少“#48 冻结输入 + 后置回刷来源”身份合同，固定专题白名单也未包含本请求；不得冒用旧研究ID或学习要求的旧线程，不手改 learn.json 伪造 registration。开发会话负责接入，交集成员核验，ops精确发布后再按原自然调度准入首批。
- 接入需保留 waiting/failed/旧批次去重、一次真实启动才推进游标、崩溃可恢复、精确输入SHA、原生 high/workspace-write 回执；完成/超时/缺证分别登记。不要仅“排队成功”便标 started/processed。

## 首批边界与输入

1. 只处理 first-batch-entries.json 中6条旧经验：两个死亡较多Boss范围 TEST_SUBJECT、AEONGLASS，及精英 DECIMILLIPEDE_SEGMENT_MIDDLE。原244条内容/旧ID/支持和反证不删改；experience-frozen.json 是原库字节语义快照，逐条输出旧ID到 strategy/rk/merged-into/waiting 的映射。
2. 优先级来自冻结 `2282f70f…:paper/data/runs.csv`：Silent A10、finished=1、victory=0、精确最终敌ID、按局去重，三范围分别34/32/18个最终失败局。它包含可能的SL后最终结果，是**选题顺序**，不是首试死亡率、机制证据或策略收益。未匹配的家族ID不能靠名字猜归类。原monster统计较旧，不用来覆盖此切点。
3. 六条旧经验总关联92个原证据ID；不得自动继承这些局为本批已核分母。先摘要索引，最多选10个独立已结束Silent局核必要窗口，列 covered/raw_verified/unread/excluded，并逐条说明为何足够或仍缺证；SL不拆独立局，角色/进阶/版本分账。需要更多输入则原任务下一revision/小批继续，不扩成全244条再研究。
4. 原始证据按 run/floor/turn、offset/bytes/SHA 回读；摘要和旧lesson不是原状态。own-ended-inventory.json冻结当前已结束局元数据及runs前缀；实际选择/施放、生成/死亡触发等须核原始后继，不由ops或预训练知识补机制。
5. input-manifest.json列出现有sts2fun公开聚合及来源/数据库SHA/版本/筛选/许可。优先复用，不重新下载13GB数据库；不读/输出外部玩家标识，不发布原始库。若聚合不足，留缺口交原数据接入owner，不能拼成假逐局对照。

## 交付与 #50 第4条

- 大脑策略按当前 #27/brain-strategies-v1 合同：可检索触发条件→具体做法、证据、可信度、反例及 observational 限定；同情境合并，最多6条候选，不按单局堆条目。不足允许0条正式候选，保留 waiting 理由，不强制产出。
- rk按 #28/reflex-entry-v1 与来源合同准备候选，引用冻结 rk-task-reference.md。该框架尚未 main/live 准入，本批不能把参考模板当已上线消费者。真实有/无条目固定Jev回放、独立局区间、后续获准A/B和Roy开关决定分别验收；不自行打开 V6_COMBAT_ENTRIES/REFLEX。脑策略已有合同部分可独立走原发布锁，rk未验部分明确保留，不卡正常流水线。
- #50达标线放在本批同一内容/证据链中：比较已核自有胜/败、F48→F49资源状态与外部胜局分布。先复核issue50旧“4次F49/0胜”“3胜局”与当前冻结元数据是否同角色/进阶/脑来源/首试或SL；不得强凑3局或照抄过期分母。
- 输出成长输出、持续防御、核心、HP/药水的**观察性备战参照或证据缺口**。最终牌组聚类、选择频率或外部p90不构成决策时因果收益或安全HP线。若阈值不可辨识，不编数值；自有/外部样本数和单位分开，external_aggregate不填假run/floor，只有外部支持confidence≤0.49，冲突双方都保留。不得更改原H0/G1a等科学父结论。
- 每个候选保存原条目ID、来源版本/SHA、此次真实独立局分母、原证据窗口、反例/未知、同情境去重去向、消费者固定读回及发布要求。旧经验不删除；去向映射先单独保存，改原库元数据需通过其原格式/发布合同。
- 报告/批次结束不是学习父完成：账本/提案按原CLI，源码/正式知识经原锁与行为编号、live内容SHA和真实消费者读回。固定消费、自然命中与收益分开；异议原文按ops→watcher→Roy，各角色真实ACK，不代填。

## 进度与吞吐验收

progress.json当前 processed=0、remaining=244，其中首批冻结6，其他238；冻结不算处理。每批追加原生batch/session、输入SHA、启动/结束/实际耗时、逐旧ID去向及剩余数，失败/等待不丢历史。发布前后各24小时比较正常学习的真实派发间隔、完成产出、等待/失败/重复/槽位占用；T取实际流水线上线时刻，不用本准备时间替代。复用既有调度和分配记录，不新增观察定时器、不模拟A/B收益。任何正常吞吐退化保留原件并原owner修，不通过暂停正常学习满足回刷进度。
