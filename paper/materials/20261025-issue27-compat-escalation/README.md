# #27 历史来源阻塞转为独立缺陷

本轮接06:44原提醒，只读复核原16条notice、完整message、ops_forwarded及本角色冻结接收/用户可见通知receipt与evidence SHA，正式计数仍ops=16、watcher=0、roy_notified=0。五组20份来源绑定/原log/input/message引用SHA核同，CLI仍为3f7afefb。原15次rc2保留，本轮生产ACK调用0；没有新的来源兼容交付。

已按集成员“发现问题开issue”职责开 [#61](https://github.com/dwroy/agent-sts2/issues/61)，将 #27 既有四门复现、五组绑定、固定正负夹具与部署验收要求交主管。新单为 `owner:claude` / `status:blocked` / `type:bug`，等待主管指定原CLI开发归属/优先级、source owner核准五组（尤其#4候选）；没有标开发ready、开会话、调度/改容量。实际创建及逐字读回见issue-create-result.json、compatibility-issue-readback.json。它是缺陷登记，不是主管实收或代码已修复声明。主管通知入口沿配置board-digest，不手改生成汇总。

另核06:43 current.json所列16条queue路径已不存在，实际同名文件位于delivered/，完整原文均核同。该位置变化只作队列位置事实，不能证明角色实收、Roy已知或ACK，亦不能用旧snapshot声称文件现在仍在queue。本轮未移动/编辑这些文件。逐条实际路径/SHA见verification.json.events。

000402两原路径仍缺，原注册父仍blocked，所需原SHA b1be2be174208edcafe23f3e0e47f4236560577c2752b6a02f88bd094755a765；继续交原wrapper/archive owner找回同字节原件。它不在#61的15条无注册父历史研究兼容范围，不用native/raw state/新wrapper替代，不尝试ACK或恢复未知线程。

下一步是主管/source owner在#61给实际归属与绑定核准，开发交源码/固定验收/部署SHA后，本角色才用同一15个ID、已有真实receipt和核准source逐条经CLI登记watcher_received，独立读回后登记roy_notified。原ops_forwarded及旧拒绝保持，Roy本人已读/同意/ACK与科学父完成均不从通知链推断。

本轮仅记录与缺陷登记；未改源码/live/知识/notice/learn/ops状态，未新开模型/游戏/full，未恢复已停止开发会话。只读核验程序为verify-readonly.py，输出verification.json；记录/数据改动不触发仓库代码测试。
