# G2 shadow 实现边界（Roy 12:19接续）

原父roy-20261016-global-build，owner01a13dcd。获准现在实现，不等待G1a自然门槛；第三幕低可信及最终Boss维持unknown。最终连战尚不接入；不把S当排序键，不接on题面或P2全局键。

目标池从Silent自己的monster-records.json、精确进阶的Boss计数及其链接encounter.act读出，含复合encounter；不读其他角色权重。频率单位为已观察战斗记录（含重试），不是游戏的生成分布。可见实际Boss优先，不以频率猜身份；未分配Boss/缺池/低可信保留unknown，不能把已知子集重归一后当完整池。

复用当前B3结果；其余合格目标依次委托同一个B3 runner/C2。独立代理身份只隔离compareOptions的单条memo，不启动新池；whole-global memo包含输入/选项/采样seed与mode/池SHA/信任原因，不因耗时或memo-hit字段变化失效。既有C1和C2完成/进展守卫保持；新增shadow目标失败记unknown和原错误，不能改当前选择、放宽完成线或挂起等待一个缺失机制。

每目标逐选项记录配对胜率差及其误差，按各选项自身配对前缀；合格S只记录。后续幕是固定当前牌组/HP/资源的条件快照，不预测未来道路/奖励/牌组增长。记录ΣΔp/p与各阶段条件快照概率乘积，零基准除法保留unknown；任何未知阶段使完整汇总为null，known_only另列。该乘积不是实际整局联合通关率；当前生产校准保持unknown，不借历史冻结表宣称生产已校准。

每题将逐Boss当前基准/缺口与汇总写入同runId内存历史；shadow不送进计划题或其他题面，后续通过准入后才消费。原计划2完整自然shadow与后续实际Boss对照报告仍是on门槛。

阶段先做纯函数/池/完成契约/未知传播/角色隔离固定测试，再接withBossSim与run-config，生产完整全检仅新源一份，原ops独立发布和精确树宿主；不新模型、对局、模拟研究或定时器。
