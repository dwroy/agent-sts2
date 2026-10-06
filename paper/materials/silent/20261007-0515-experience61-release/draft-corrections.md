离线抽取初稿更正，原错误和更正过程留任务转录及prepare.log/verify.log：

- runs.character旧行可能为null，过滤改用空值归空串，排除而不归静默。
- SL draws.clean是整数，首稿len调用错误；校正后巨兽clean各25、知识恶魔各31。
- 抽牌堆位于state.agent_view.combat.draw，首稿误读combat.draw_pile；收场前确为空，改后机制断言通过。
- 校验尚未完成时第一次读取other-knowledge.json不存在；等待生成后完成核对。
- 复盘操作HP在小血瓶补2之后，本节首COMBAT统计可能在之前；口径未改，差2在第61节逐项说明。
