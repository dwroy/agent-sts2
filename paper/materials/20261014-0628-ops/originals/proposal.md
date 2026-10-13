# 本批十项提案核验与蛇咬窄覆盖子实现

角色 silent；实际观察 A10；批次 `20261014-054301-s2-strategy-proposal`。工作树初始干净，HEAD/main均为 `2f739c28ca61513bd0baf14a2e84867ed99c2f3d`，`git merge --no-edit main` 返回 Already up to date。本批是专用队列的十ID消费，没有research_request或implementation_request；没有借用另一个专题。

原十份Markdown与登记SHA逐字一致，原件保留为 `silent-proposal-*.original.md`；队列与账本初始状态保留在 queue-snapshot.json / ledger-before.json。三局角色由原runs.jsonl核为SILENT/A10。只提取三局实际run_id匹配行，合计1456决策、1521状态，冻结原字节与offset/length/SHA；没有读取其他角色私有知识。

新增可实现范围见 [普通蛇咬8毒](proposal-snakebite-preview.md)，归原 `silent-proposal-763a4b9d9f17b815`，不据此冒称十四机制全包交付。其余逐项见 report.md 与最终 JSON。已有实现只在实际live祖先、源文件职责和消费者都核实后去重；预测/动作回执/观测端点/完整候选/胜率因果分别保留。

共同证据与反例：MTQ0 F23 T3前三试实损0、末试实损8（多6当轮净扣），全败预测不能证明更安全；MTQ0 F11 T1护栏plan1在弃连续反弹后重问迷雾，整轮20伤不归原完整候选。KFR F12 T1斗篷生成小刀后重问，原0损完整候选未打完；KFR F33 T6首/第三试15血、228敌血、36毒、3覆甲的两线损6/12且都失败；F33 T7六次奇巧爆发满三牌后锁住，毒药各实加6，末次43+42=85后敌残74。7X0 F31保留暂死重接，不能把活段清零当整战终结。

资源证据按原账本silent-0019/0020/0243核：MTQ0 F19入59/可操作61→胜后46，F20入46/可操作48→胜后8，未到F24营火；7X0幕间28→61与已到休息分列；KFR已到六次休息、幕间22→60、末营火15→36、开场36→38及SL恢复分列。没有替路线、休息对锻造或提前喝药的整战因果，不修改安全阈值。

校准方法：旧实盘只用于固定局面和可核机制，不拟合新护栏/SL/药水权重；同盘读档不作独立样本。未来新结束静默A10局作时间留出。实际动作后的重问、未执行能力、未抵达节点和缺帧继续记未知，不用预训练补齐。

验证记录：withdraw-restore.json / snakebite-withdrawn.log / snakebite-restored.log；完整沙箱入口 sandbox-check.log；三局当前离线消费者读回 `*.audit.json`；源码与live关系 existing-live-consumers.json；合入预检 live-preflight.txt。运行tsx CLI三次遇IPC监听EPERM，改用同权限 `node --import tsx` 读相同冻结输入；不把沙箱限制当策略或代码失败。初次date因其他工作树并发回收造成bubblewrap构建ENOENT，随后真实date成功，保留启动日志。

最终登记：窄子项账本silent-0460，CLI代码提案silent-proposal-3e9b94fbf3a4c1a6；旧0087与宽父763保留。两轮完整入口tsc0/vitest1，唯一复验剩余失败为rollout120秒超时。源码三文件保持未提交，patch可在当前live干净应用（check0），整枝有15历史记录冲突；未合入/未发布/未标shipped。最终逐项处置以report.md / report.json为准。
