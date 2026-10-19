# 9.1 方向经验产物验收与停点

2026-10-19 17:15 CST，批次 `v6-direction-experience-20261019-1631` 已于17:12:16正常退出0，非超时/取消，原生summary success/isError=false；见 [终态](direction-terminal.json)。本核查仅验证结构、覆盖与来源，不替学习者推导游戏知识，不等同发布验收。

原始报告 `learner/runs/20261019-163651-aca8de36-1a87-4109-9fa1-405535c7d209-v6-direction-experience/report.md`；同目录result.json、artifact-manifest.json、disagreements.json与提取原件全部保留。角色pending路径实际为 `.worktrees/v6-direction-experience-20261019/knowledge/characters/silent/pending/v6-direction-experience-v6-direction-experience-20261019-1631/`（模板渲染的双前缀；非清单里的短目录）。

独立核验见 [verification.json](direction-verification.json)：423份冻结输入、110份产物清单、28份JSON回报引用逐SHA/字节核对；372局精确去重覆盖、244条正式经验精确归属且原文保持，另盘点5份pending文档234条。正式13份Silent文件未变，工作树跟踪文件干净，HEAD仍为派发前模板提交7c4b3927d；冻结知识基线5930a733b与模板提交区分，无学习者代码提交。四份P/D/S/R候选草稿均存在，均仅在pending，未合入main、未正式发布、未做消费者读回。

抽核17处支撑证据原始日志字节范围、SHA及冻结切点全部匹配。学习者自报104339段/3,356,036,339字节的全量重哈希，本次没有独立重跑全部提取；全日志前缀SHA保留未知。Boss矩阵4128格、连战688格，边界计数一致；573次SL/102独立局分开，10个缺入场帧保留未知，不把首试判死当实结局。

四方向各三个检查点的理想牌组、组件数、升级/删牌优先级仍null；四条局部reflex候选均n=1、没有配对反事实。草稿格式早于W2严格方向卡格式，不能直接通过正式格式或发布。本次未强行补齐、未写正式知识。实际ledger CLI读回 silent-0520至0523均observed，旧9项只是关联，未记shipped。

学习者5项异议原文见原disagreements.json（SHA256 `1992c837d558ac507f4779f96b6da642f9f2982e2ac62ea351c23e82ab235368`）。关注：历史窗口不能当当前全历史；理想牌组不能因格式要求补造；未选方向/局部代理不能证明完整方向无效；局部组件证据不能当整局因果；账本observed及pending内active不等于正式发布。以上是学习者异议的索引，具体措辞、证据和未决以原件为准。

现有通知程序已逐字把异议送入 `ops/inbox-dev.md` 与 `notes/for-roy.md`，持久通知 `0baef634d02e1ff85843c10a`，真实ops转达回执见 [direction-notice.json](direction-notice.json)。watcher/Roy确认仍pending，不代填ACK，不恢复调度或伪造自动学习父要求。

验收脚本与早期核验失败原件留在 `.worktrees/v6-w2-20261019/.artifacts/direction-audit/`；首次字段名错误与冻结基线/模板提交误比较已在新文件修正，原失败不覆盖。最终退出后复核全部上述检查通过。

按Claude“学习批次有结果时停下回报”条件，登记后停止；W3尚未启动。建议Claude先审阅9.1证据不足与异议，另行指派正式方向卡学习及W3；不自行派方向卡或追加学习。
