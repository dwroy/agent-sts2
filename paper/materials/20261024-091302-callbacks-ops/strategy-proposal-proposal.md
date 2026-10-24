# 033643经验批次的提案补链

本批只承接 proposal_repair=20261024-033643-experience-update；learn.json 没有 proposal_ids、research_request 或 implementation_request。角色 silent，十局均为已结束A10。基线为 d6fc64f56c6cd0e2513e3f8a48e4fd171b3d7222。根专题请求绑定其他批次，不适用于本批；未合入后续main，开工执行git merge --no-edit main已是最新。

本次不创建重复提案、不重写历史复盘、不新增游戏规则或策略参数。两份原Markdown与队列保存的SHA完全一致。原失败是缺source commit，不是缺少提案；原failed/rc0与原草稿保持。真实源 c803e03768653fe2691a2ae8ff5b4299d9eee4ea 已可读取，重跑原experience_audit得到missing=[]；精确经验叶发布 0e51fa6ff83ca4e44176d444570c1af5f88cbbd3 是当前live祖先，18项与live逐项相同。

## 逐项处置

1. silent-proposal-bfc1111cfdaefafa：原十五条经验、十五个账本、十局证据链接均有效。已核知识补证正式发布，不等于独立出牌/药水/SL/终局实现已完成；保持pending。定向复核silent-0205：2Q6ZYZ6JHM0M F8 T5完整两次弃牌题面、答案、原decisions和T5—7真实后继。题面计划unknown，实际弃打击与生存者，后继14挡、26→15；T6为17挡、15→7；T7敌余10、玩家归零。原17挡是含生存者后继的条件预测，不能沿用为兑现值。没有同入口保留生存者的受控完整战斗，不增加固定保牌/早药/禁探索规则。
2. silent-proposal-e73dc157e41b8373：原三条压缩经验、silent-0509/silent-0507/silent-0228和原Markdown链接核同，三条文字在上述真实live发布中完整存在。其原证据1269Y20SKHUM/0B2567HG3T4D/JMH5C51RLN4E与本批十局无交集；只做既有发布与补链核验，不重新领取这三局，不把本批当该三局的机制/校准验证。原pending由后续持有对应原证据的实现任务处置。

## 限制、验证、预期与回退

已读完整原题2道、原计划题局部1道；其余1876道未逐题通读，逐题原因保存在question-coverage.json。仅流式机械计数不算读完题面。本批无V6-build原行；entries/jev_answer/fallback/unknown无本批证据，不补为零。Jev错误独立于答案和动作；不以完整请求存在证明采用、成功或收益。

不拟合阈值；无训练/留出分割或未见验证，不能把已读窗口称为外推验证。其余原机制结论沿原提案，本批不重新确认全部公式。新策略实现需要具体当前源码差异及固定窗口重放；药时、替路、早建等整战收益反事实仍缺。其他角色与未观察进阶保持等价。

本次只核链接和原发布事实，未修改生产源码/知识/任务模板/固定测试，fixes=[]、merged=null；无需撤源码失败/恢复通过或tsc/vitest，不造测试成功或新版本。无本批游戏行为可回退；如后续回退原R424经验，按原发布单叶差分和原before，保留其他并行知识，不整树覆盖。保留原两提案id，不另用CLI生成重复id；本次补链只通过根ledger.py update追加出处和报告路径，保留原status，不代ops标shipped。

来源任务experience-update，补链/后续实现任务strategy-proposal；既有授权Roy-2026-10-07-learning不是游戏事实。代码提案队列未手改，原Markdown未改；科学父要求、自然消费和收益均不关闭。
