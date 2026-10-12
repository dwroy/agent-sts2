# 队列与当前源码核对

基线：5f421ef71a1e0693eeb4b334ee8bf03385722367；只读live：f48154c11d41cb82c762a0afd671fe430ef199b8。
队列SHA256：4c97de7767feb4536ff6dfe205a2ed8ae25b514c5efdcdb7572d9a4534de16c4；相对上批完整快照仅新增缓存签名与rollout确定性两条实际关闭记录，见queue-delta.diff。
158条历史修复来源均为live祖先；148条为本基线祖先，另外10条是main等价集成；历史来源与当前实现的核对分开保存。历史机制修复并非本批重新验证游戏知识。
当前核对22个源码/测试路径，其中17个与前批审计逐字一致；新增5个测试路径与其原源码提交及live逐字一致，见recent-fix-proof.json。
4个核对路径与live有既有差异：codex-usage注释、launcher登录错误称呼、ops/codex/lib命名及通知路径、校准派发测试的main独有A10/cache覆盖。原差异保留，见main-live-reviewed-paths.diff；没有冒称全树一致。

## 当前实现

- recoverCreditBaseline要求额度窗口推进及两次稳定完整采样，原额度保护仍保留。
- run_ascension只读取实际ascension，通知及结构审计不以target_ascension代替。
- experience_audit仅豁免显式blocked且完全无产出报告；有产出仍严格验证源提交/提案。
- multi-character前缀缺表/已有表都使用固定隔离目录。
- compute-memo父线程及真实worker共享固定夹具；元数据改变与池重建身份契约均有回归。
- rollout最佳线路完整断言使用固定模型与受控时钟；0/10000ms主机暂停均覆盖；独立单调截止降级回归保持。
- learner_check_continuation绑定batch/source/tree/原日志SHA，只续未覆盖项；不改历史失败。
- strategy_implementation_jobs有原请求/CONTINUATION、allow_waiting及有界接续；框架入口不等于量化父需求完成。
- startup-recovery和launcher会话前恢复保留同输入、有限重试及原权限；本轮第一次rg也遭遇目录扫描ENOENT，原错误在本会话记录，不能据此识别上游目录创建者。
- core_build_jobs保存通知stdout/stderr；旧rc2没有stderr，不能证明未发送，不重发。
- boss-sim continuationInput仍检查正HP资源并带分支/seed/资源诊断；缺触发样本，沿silent-proposal-5aa2672bd7cd1bf4及既有0332原提案核实，不猜填资源。
- 调度按现有顺序选择待办；旧冻结计数尚不能证明永久饥饿，不临时引入调度策略。
- 事件具名卡资料源42c920f34已上线；其他入口、未知项派发、量化消费者及宽策略提案继续原独立任务。

## 本批验证

- targeted-tests.log / targeted-tests.exit：原沙箱入口带明确文件过滤，tsc成功后threads 11/78、fork 12/89全部成功；fork重复来自脚本既有参数传递，并非失败重跑。
- supplemental-tests.log / supplemental-tests.exit：受阻经验补链及接续资源诊断2/21成功。
- 固定夹具、单worker、nice；没有真实LLM或网络调用，未安装依赖；所有临时产物放本任务TMPDIR。
- 无代码变更，无新修复撤码验证，无提交/合入/gitleaks提交扫描步骤；源提交已有红绿及部署事实不记成本批成果。
- 工作树HEAD保持基线且git status为空；no-change-proof.json保留169个既有main/live源码路径差异，严格空批判定需要运维按事实处置，不创建空合并规避。
