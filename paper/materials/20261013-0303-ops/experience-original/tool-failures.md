# 本批原失败与处置

- 开工只读搜索时用了错误的旧批次路径，随后定位到exp/learner/runs/20261013-000403-experience-update；未读取其他角色复盘作证。
- verify-final.log/exit：最早紧缠出口是in_combat=false的COMBAT帧，原校验只准REWARD失败。保留原件，补核后继同血奖励；11原帧字节/SHA核验通过，verify-historical-retry及verify-complete退出0。
- render-consumer.log/exit：校验旧脚本未考虑本批退役条目，误期望仍入前缀；原件保留。修正仅scratch校验，消费者未改；render-consumer-final退出0。
- test-source.log/exit：tsc0，342文件3399例中唯一失败为历史20261009-224303/test-checkout/logs/logs悬空链接触发check-imports ENOENT。没有删除旧材料。1421跟踪文件SHA一致的隔离副本跑原入口，343文件3410例退出0；固定排除/超时/预算不变。
- 一次apply_patch被沙箱helper阻断：全局deny-glob扫描遇另一个刚建立工作树.codex暂不存在。未编辑其他工作树、未申请提权；随后同一操作成功。
- sl-insatiable-baseline-correction.json：原泛角色SL汇总22/86/13与上一节支持局内口径不同，差异为未入本主题支持集的PBUBM0LRTEDD两试一赢。旧支持局20/78/12复现；本批支持局21/84/12。原完整自测经验experience-full-test.json保留；纠正后2文件21例补验0、240切片与原知识前缀重渲0。
- live-merge.json：锁内9份知识数据不同内容重叠，按任务第8节停止；没有实际git merge、覆盖live、合后测试、上线版本或双通知。源提交、原尝试、工作树及提案全部保留。
