# #57 与 #56 注册屏障组合独立核验

更新：2026-10-25T00:10:45+08:00。正式来源 f7a8a2627fad3d53c7755a14304188fb329c5f4f；正式补交评论6386031209。

本轮接续#36交付后按队列核#57。旧6385470519发现的 check-learner 重取父全局 learn.lock 问题已在正式补交中改为同批注册屏障；原120秒、原租约、来源与绑定核验保留。完整行包含 candidate_mode，经原子保存及文件/目录fsync后逐批释放。固定回归同时运行真实五wrapper和占用父全局锁的来源校验，另覆盖 fsync 次序、晚到PAUSE/ACCOUNT_DRAIN/LLM_DRAIN/未知发布门、candidate_mode与dispatch_base/worktree篡改；未调用真实模型、游戏或生产调度。

来源与组合：source-integration.json 的30叶后像全部逐字等于正式提交，其中26叶与当前main不同；14生产叶闭包另与formal-source-freeze.json核同。docs/codex-ops.md保留后续#36两段；#56正式测试原有尾空格差仅作前像说明，未改写旧冻结或旧检查结果。隔离锚373730085d8a88817f31b94f1270e8c33652fcae，tree f7785c9081171d44c0da69271953b75c0167c06e，2769输入/1417依赖。范围为上次已验证实际运行代码、当前live R446知识及本次#57/#56组合；不冒包含main未部署V6模块的全部运行组合。未改变live或游戏经验。

独立定向检查：生产tsc=0，4个TS文件23项通过。targeted.log保留真实Python组合和注册回归原输出；固定结果不代生产采用。唯一完整检查：677个TS文件、6607项通过、0失败、2项原有跳过，生产tsc=0。PID925694/birth28092189已退，原检查锁独立核可取；2769输入/1417依赖重哈希、索引entries/flags及tree核同，full.json SHA 9845f406b2a03f705f847224a0521df3e6fe52c4dd7a543859832d94c8d486a3。原始输出与full-terminal-verification.json保留；本轮full仅1次。主机源现已在原tick/learn/game-admission/refresh/live锁内安装：905a5edbe88924e77a515fc3e84d4972b941f736，区间2026-10-25T00:07:22+08:00—2026-10-25T00:07:22+08:00；30叶逐字同正式后像，26叶变更（其中13生产叶，另1生产叶沿用#56相同字节），独立读回与Windows SSH远端核回通过。live仍487ce58924ff9e511cfbf76bfaad73608d310de3 / R446，无行为发布号。source-installation、installation-independent-readback、source-push-verification及delivery-verification保留实际回执；固定绿与安装不代自然采用。公开回帖https://github.com/dwroy/agent-sts2/issues/57#issuecomment-6386462700已逐字读回，issue仍open/waiting-release；一行提醒只证送入原ops会话，不证已读或ACK。

发布接口与验收：新事务由原ops以持久owner PID/birth/token创建PUBLICATION_ADMISSION，waiting只挡新局并放行冻结外部merge=no候选；publishing阻止新学习。短锁按learn→game-admission→refresh→live获取，实际写入前释放前两锁，不持锁等自然终局。未知/旧LLM_DRAIN、PAUSE、ACCOUNT_DRAIN继续保守挡；owner崩溃保留门，原owner凭原SHA接续。三开局入口、finish记账与续派分开、open-book延期及原权限均有固定覆盖。本仓没有通用自动publisher，下一新事务须由原ops接入口；现有事务不转换。自然等待期间真实候选派发并完成、发布完成前新局0、释放后自然续局均待原ops原件，issue不关闭。

#56并行只读核收：已读6386142224及完整原件。旧214311在6385924090授权下按not-started处理，原failed/rc3、stderr SHA、原与接续supervisor退出、五局attempt及next-natural释放独立核同，未重放或关pane。两新外部B233358/A233359的原生session/turn、完整提示SHA、上下文gpt-6.1-sol/high、固定输入及原注册屏障文件均核同；requested fast但native service_tier仍null。ops在23:38报告4自有+2外部，本轮2026-10-24T23:41:55+08:00快照为3自有+2外部（s2自然完成，未热切）。磁盘源与屏障文件存在不证明全部运行时fsync调用；槽位收敛、实际tier与补丁自然吞吐仍待。两新批均在原23:34:30窗后启动，不重置或凑入原窗；六个补丁前完成不当修复收益。

#20共享MAS6386005172已读原文，独立任务不计STS2名额、不替代本项目迁移验收。原24h至10-25T14:49:42、kit至10-25T00:15:05、原owner/配置与在途均保持；未改kit。#36自然75/人工草稿/有界观察及#27正式ACK与缺源、#51科学父等保持。

#59工程接收与runtime交接：Roy已批准新流程（issue59-authority.json）。本轮#57工程通过，可发布组合为上述冻结运行基线＋R446知识＋正式f7a8a2627的30叶；源码已安装，未发现仍需代码返工。原ops复用本次唯一full，在下一新事务核实际加载、基本消费者/冒烟和异常恢复等必要运行条件；自然等待候选/新局互斥/释放后续局保留未验。长期学习/稀有场景/自然收益归runtime与学习者，不再占开发完成门。必要运行核收后由ops核空闲及完整恢复身份决定可恢复释放，保留原树/分支/原始日志，不由本角色代关科学父或代释放。#36已有工程证据已接收，75/人工草稿/有界恢复转runtime逐项未验、技术缺陷返工恢复原dev；#20三叶/运行分配已有核验，原观察窗/共享MAS迁移/Roy事项仍归原owner。#56工程已部署，实际tier/原生准入/吞吐仍blocked待原owner，若查出代码返工保留原dev。#28/#35/#48/#50依#59由ops按既有发布原件核必要运行条件与恢复入口，本轮未重新部署、未冒认释放。
