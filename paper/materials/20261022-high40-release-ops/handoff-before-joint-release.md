# Roy 17:2x 新指令优先：换号后仍不恢复开局/生产刷新（2026-10-22T17:46:04+08:00记录）

授权原文paper/materials/20261022-roy-check-window-ops/authorization-original.md，#40主管评论6337610752。此段覆盖下方旧交接中“根STOP原不存在/不创建STOP”“验证后恢复下一局”的运行安排；原取消事务与失败历史不改。

已新增独立Roy暂停id=roy-check-window-20261022-172x：根ops/STOP的实际内容归Roy，另有ops/codex-ops/roy-check-window-pause.json。与codex3-20261022-1610的LLM_DRAIN/PAUSE分开，控制器只能删除自己仍拥有的两旗，不可删除Roy STOP/独立暂停。即使换号complete也禁止autoplay-start/launch-game/play/人工report-run及生产refresh；禁止为了验收新账号或#40额外开局/刷新。当前没有对局/报告/刷新；最后生产fight-value/catalog均正常结束17:16:29，无信号/半成品补发。旧源码没有REFRESH_PAUSE检查，此为原ops调度暂停+真实STOP阻断正常局末触发，不冒单写JSON就有脚本级闸。固定检查仅用独立fixture，不能重启生产刷新。

完整检查新顺序#33 high→#40→#35→#28→#37→#36，替代旧#40排末尾的各段；无对局最多2个重任务位，允许#33/#40并行。#33 high唯一589590已16:34结束tsc0/full0，6007pass/2skip/0fail，1639suite含嵌套非文件数，inputs-before/after一致。仍待原发布锁/实际最新知识及绑定备份恢复等门/源码提交/版本登记；不重full，不代原#33整包完成或自然high读回。原件paper/materials/20261022-roy-check-window-ops/high-passed-original.json；live目前仍R411。#40原候选c255682f/8f09b842仍review，原集成员已经收到一次#40提醒及新窗口评论，沿其原owner处理精确依赖/full/集成，不另派模型或等待者。#20heavy实际off，不把本次2位授权冒作生产队列已启用；#41及将来#37→#20共享文件兼容仍保留。

恢复条件是#33 high窄修与#40都实际live、codex3控制面已验证且自然边界；由原ops核真实提交/版本、双方准入及Roy暂停所有权后释放本暂停，不因测试绿/切换完成自动恢复。首个正常恢复局保存原生high、新号配置、增量刷新冷/热/训练口径与模型消费者SHA；未知/未触发保留，不增实验局、A/B或模拟。

换号标准控制器609806/start8127174继续自然draining，当前盘点27旧账号引擎进程记录，不当作27独立任务或排空。原开发与集成员不热切，不擅停他们；旧ops本轮记录后仍ready_to_drain，当前源session01a1517b-e200-7c52-b463-6ea22220c0a9保留供controller验证正常quit。最新暂停与窗口结论同时写双箱/decision-log，并在#33/#38/#40评论实际送达。

--- 以下为此前交接，冲突处以上述Roy新指令为准 ---

# codex1 → codex3：codex3-20261022-1610

记录时间：2026-10-22T16:14:58+08:00。Roy/Claude 16:10授权原文与91%触发报告：paper/materials/20261022-codex3-switch-1610/authorization-original.md。91%为16:09 codex-quota的用户转达，本ops不重复探额度。旧codex3-20261022-1146已cancelled，不再run；其state及本文件先前取消内容已原字节备份到本轮目录，历史不覆盖。

ready_to_drain：原ops会话 01a1517b-e200-7c52-b463-6ea22220c0a9，pane w1H:p8，账号codex1，当前轮写完记录后正常空闲。此声明只表示本轮可交接；盘点仍有34条进程记录，非34独立任务，不能冒已排空。唯一标准一次性控制器原生609806/start8127174（wrapper609805，w1H:pA1，nice19），只沿ops/llm_switch.py及原wake/learn/assist锁接续。事务state在ops/codex-ops/llm-switches/codex3-20261022-1610/state.json。不要另建控制器/ops，activating/verifying/failed先核回执，禁止重复bootstrap。

目标为既有ops/codex-ops/accounts/codex3/profile.json，两隔离home新checkCodex及key_check通过，无模型问答；profile模型/服务档/权限不改。日常ops/学习/开发自然启动仍按现有launcher high，实际原生回执才能称生效；对局xhigh旧状态与high窄候选另行保留。codex-home同时供学习及开发派发读取（.agents/board.yaml: session/project codex_home_file），brain-home独立。当前选择器仍codex1，须控制器排空后正常quit旧ops、目标真实shell写home回执、新UUID与target rollout接管成功后才能报complete。不得跨号resume/复制加密会话/凭据，不能手改选择器绕过准入。

本事务只拥有主ops/codex-ops/LLM_DRAIN和PAUSE；根STOP原不存在，不创建STOP、不发SIGTERM或停play；Regent原STOP/PAUSE保留。已开始对局及报告自然收尾，学习wrapper/宿主检查继续落原回执；在途开发/集成员不热切，完成或碰额度后的重开由主管在codex3上安排。原队列/任务/租约/失败/退避不搬迁或重置。新ops受控接管轮不派发/不移闸；由控制器核UUID及rollout并只释放自有两闸，原队列恢复后检查正常brain/learner真实消费，启动与控制面complete不代表学习/收益验收。

接管待办与原件：
- 首读notes/ops-current.md，按SHA读current.json及notes/ops-current-context.json；首次README/最新STATE/学习协议。不要全文重读旧handoff/decision-log。最新科学父/异议/索引均在context，旧摘要与原件冲突须保留并查原件。
- #33 high三叶窄候选tree90c6d041640b1bec7082635f6344fc69dd260751，base liveR411/0cd3629d3a7f3a3bcacd22fa0a4206acc4d81e78。唯一原589590/start8071265于16:12读回tsc0、首次full运行中；持O/D/T/L且已释K，不另起同源检查或发布。先前523632实际15:56取得全锁后误用整包#26生成器rc2，原件paper/materials/20261022-1601-ops/；更早整包#33失败保留、不能由窄修关闭。终局仅原checks及队列事件准，禁止轮询/模型/实验局。通过后仍原最新知识/绑定备份恢复/发布锁/自测提交与自然新局及原生high；当前high不能称生效，不热切当前局。
- #38已有真实锁准入与首次检查证据，原4锁回归通过；评论已交主管核收，不代关单。原序#33→#35→#28→#37→#36；#35准备树须依实际33新live重建。#40仍review，c255682f/8f09b842，21双份SHA/8原件核同；保#20/#41组合冲突与完整窗口/自然验收门，不插队/新等待者。
- 154302-s2原线程01a16290-5cc9-70f3-ac5a-b77ed9c4216c、codex1容量中断/rc1。3源+2测试/22scratch/9对象/十原提案已封存，定向2/11过，原完整sandbox无终局/审计decision_id缺失；冷却17:05:24、同十ID141301旧中断仍开放。paper/materials/20261022-1605-ops/及两个pending-continuations索引仅检查点，非自动resume；不另造同机制，不将fresh retry当原线程恢复。换号complete后需要接续须沿原任务账号恢复合同，未有真实新线程首回复前不冒恢复。
- 15:43八研究notice与既有watcher实读/Roy可见转达证明核同；原CLI SHA3f7afefb仍不兼容issue4/13/14三research，两角色正式ACK pending。保原rc2，不代ACK/重复发送/改名或关科学父。另原R4 f9d1cd…四question保持原链。
- 当前live V6-R411不动；CARD/POTION/SHOP/REST brain，REFLEX/DIRECTION/COMBAT_ENTRIES off；Regent暂停、#31取消。session已依Roy保留为实际生效观察，#33整包尚未发布。#36 hosting脑视图实际off，不用旧07325命令启动。
- #23原24h磁盘/持续回收待验（17:57/18:13原计划），只沿正常事件，不新增计时器/清理模型/扩删。034302四局记录83f3c975已完成，不重dataset/report/full。其他ordinary attention与failed保留各原回执，不重生成器。
- 七科学父、H0/0332与真实来源/分母边界开放；本轮仅换号，不赋予新研究/实验/外部推送或gameplay授权。历史main/push请求按自身原件与范围核，当前任务不发push。普通记录300–500字+路径，date后双箱及decision-log；只改本仓库，不读输出凭据/游戏二进制，不改ops prompt/共享配置，不扩大辅助沙箱。

后续只用新ops UUID控制原通道；完成验证后记录新brain/learner正常派发home及原生上下文，不为验收额外开局/学习或发模型请求。
