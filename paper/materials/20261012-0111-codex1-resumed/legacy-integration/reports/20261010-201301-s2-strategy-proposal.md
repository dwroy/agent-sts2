# 静默猎手本批策略提案回报

任务 strategy-proposal，batch=20261010-201301-s2-strategy-proposal。基线 `3c9a57d5effbf9d2e62dc375bc9d6910419fa0f9`。只处理派发的十个代码提案。本批不是专题纯研究：调度行有 proposal_ids、无 research_request，普通牌组专题请求绑定另一批次；没有用另一专题替换身份或扩展队列。

开工工作树干净，merge main 返回 Already up to date。七个派发来源均已从 runs.jsonl 核实为 SILENT：NHA2KW0RB7VP A10、K3676LU8B0UH A1、SADL3CGYTGSR A7、G33HU22H2543 A10、P74C04AEPL1F A10、RC61MFQM63Y6 A10、53FLQ68CETW0 A6。十个保存 Markdown 的实际 SHA256 全部匹配队列；未重复追加历史复盘。原提案的全部范围、账本、反例和验证安排见同目录 proposal.md，各原文保留在 `<提案id>.original.txt`。

## 两项有原始实帧支撑的源码修复

1. **普通生存者单弃消费**，`silent-proposal-eecf671192557465`，账本 silent-0268 / silent-0205，源码提交 `bf423c173d3be348a4ad714e1d26516df619ff41`，父提交为完整基线。RC61MFQM63Y6 A10 F33 第三次 T4，states 285411—285415：普通生存者弃掉唯一余下打击，实际最终朝爪，7挡，火箭激光57对45HP需损50；旧候选预支已弃打击转向火箭，报损31/余14。首试 states 285336—285340 是反例：先前已朝火箭，弃打击后仍损31/余14并进入T5，不能断言每次都死。53FLQ68CETW0 A6 F2 T4 原状态字节6921389921、6921409702、6921430812显示弃中和；未知选择不能先获得中和虚弱。
   - 旧代码只在结实绷带额外格挡大于0时消费 discardAfterDraw。新标记仅识别 silent A6/A10 普通 SURVIVOR。没有绷带仍消费单弃：只有一个已知可弃对象时移除；多选择保留 unknown/pendingSelection，实际选后重算，不指定 Jev 选项。保留现有绷带分支及真实格挡，不预支被弃攻击、减益或朝向。
   - 未拟数值参数；A6旧局、A10后局分别核验，重试不计独立局。原始字节重新扫描核 offset/SHA，见 survivor-evidence.json；生产固定测试九帧见 silent-survivor-discard-state.json。没有整战替代胜线，不估计胜率提升。
2. **投斧首牌 SL 身份**，`silent-proposal-9b4049b484730143`，账本 silent-0266，源码提交 `e784dd9f043bf87c29109573f48975f9903280d3`，父提交 `bf423c173d3be348a4ad714e1d26516df619ff41`。G33HU22H2543 A10 F48 T1，decisions 277909 / 277954、sl-attempts 995 / 996：余像首打18挡/75伤和闪亮登场首打10挡/107伤，旧排序 canon 相同，并被后续 tried 使用。states 284161 / 284162原始字节重新核验，见 axe-and-selection-evidence.json；真实历史碰撞题保存到 silent-axe-identity-state.json。
   - 仅 silent A10、T1、持投斧的身份携带首个实际卡牌 id/升级/目标；药水不占首牌。候选、已打前缀、实际回合记录、canon/loose、cards-only、committed/mayRepeat 与升级宽松审计同步保留首牌；消费后的续步沿用原前缀，缺前缀标 unknown，不据此判精确同线。旧记录不重写，默认旧键字节保持。其他角色、进阶、无此遗物及T2以后不启用新标记。
   - 首牌不同的完整实打整线未观察，故没有首牌偏好、HP门槛、SL次数或出牌排名的改动；程序的合成抽牌测试只检验前缀传播，不当新的游戏事实。

两个已派发代码提案已经描述各自独立缺口，本批沿用真实 CLI id，不另造重复 id。新实现只涉及 combat/sl；原宽提案的 terminal/potion 标签不当本批实际实现范围。

## 验证及保留材料

- 生存者：撤 card-model / turn-solver 新源码，固定回归退出1；恢复退出0，5个新增加10个绷带回归共15例通过。见 survivor-red.log、survivor-restored.log、survivor-red-green.json。第一次固定测试的错误断言保留在 survivor-green-initial.log，修正测试后再执行红绿。
- 生存者完整沙箱：单 worker 初次无逐项输出运行较久，主动中断退出130；不计成功或代码失败。重跑固定脚本退出0，tsc通过，265文件2674例加 paths 单fork11例，共266文件2685例。见 survivor-sandbox.log、survivor-sandbox-initial-result.json、survivor-sandbox-retry.log / .exit。一次 TMPDIR 写错导致测试未启动，未计为检查结果。
- 投斧：撤 explore / controller / combat-plan 新源码，10个新增测试均失败，退出1；恢复后与生存者/绷带联合3文件25例通过，退出0。见 axe-red.log、axe-restored.log、axe-red-green.json。初稿缺固定 elite 列表及错误使用第一尝试 envFor 的失败保留在 axe-green-initial.log、axe-green-controller-unbound.log；修正后用真正控制器记录与持久化验证。
- 投斧类型检查通过。首次完整脚本4 workers退出1：266文件，2683例通过，rollout-live 的同盘开启/关闭 rollout 首动作一致性测试失败（xmk1-f33-t3-cut plan1）；paths 阶段未执行。完整日志 axe-sandbox.log / .exit。源码和测试断言保持原字节，以2 workers重跑整套退出0：tsc通过，主池266文件2684例、paths单fork11例，共267文件2695例；见 axe-sandbox-retry.log / .exit。单次失败原因未作确定归因，降低并发后的通过不能代替保留初次失败。
- 所有测试使用固定输入；新增测试隔离生成知识 JSON，不调用模型或网络。测试只读取固定集合；完整 sandbox 脚本有既定排除名单，完整沙箱外检查由调度器负责，报告不冒称跑过排除项。
- 源码原字节副本均为 .txt，最终投斧撤回/恢复材料为 `*.axe-final-before.txt` / `*.axe-final-after.txt`；初稿材料保留，不应当成最终源码再次覆盖执行。两批提交前 staged gitleaks 无泄露，见 survivor-gitleaks.log、axe-gitleaks.log、axe-gitleaks-final.log。使用本机全局身份与真实 Codex GPT-6 Co-Authored-By，没有推送。

## 十个派发提案逐项处置

完整十项 id、证据局/层/回合和账本在 proposal.md / dispatched-proposals.json。八项宽提案的具体待数据原因保存于 waiting-reasons.json；逐项结果已保存为 report.json 与同字节 final-report.json；十项均有 waiting 处置，两个已修源码因缺实际live祖先也不能填implemented。既有经验 shipped 表示知识材料曾入库，不等于整个源码提案已实现。

子项的实际 live 祖先源码审计见 ancestor-audit.json：即时损血参考1dab14da481fe7951d9020dba52ad0ebebb1029b、普通萎靡0d7465a0962f4e0234530bb390da6ab0fcd5f8e2、精确切击手数8b9bacbebb20eaaa1133a9945da6c7abfcda745d / 力量995a345f935efd6d8ae9f67d16bd2653833344d0、士兵预览19e41a26648542b7ad0bce4e70b55f30be532d49、滑溜毒9c19ce71a149300442b01adcfa50df543bc8a7f1、臂甲脆弱ec1ceef3acbc168cf03c73c9fb38226b4a0b63b8均已在live祖先；它们不足以将任何一个宽派发提案整项判duplicate。弃牌后继候选f34700874c9f48b614991f769532115a0f24f27b不是本地/live祖先，未当作已上线。

## 合入及限制

live预检显示其他会话的未解决合并：HEAD=56268f61928e0330d91293e585efab075839bb4a、MERGE_HEAD=a83d9ab675560a177249aa638e99df40bcfb5553，19个未解决冲突；完整清单见 live-preflight-initial.json。两项提交后再次在 live-merge.lock 锁内只读预检，HEAD / MERGE_HEAD 与19个冲突仍相同，两个源码commit的live祖先检查均false，见 live-preflight-final.json。保留他人现场，没有abort、知识/索引提交、覆盖冲突或实际merge。本批merged=null、无版本，无implemented/shipped：两个窄提案也为waiting，交运维核实合入后再闭环。未实际上线，不制造上线决策记录、双通知或 eval 版本。

回退分别 revert 对应源码提交，不撤其他批次或账本历史。两项提交后本工作树git status干净，最终HEAD=e784dd9f043bf87c29109573f48975f9903280d3；本批没有生成器、运行知识、任务模板或其他角色知识改动。报告已证范围、反例、未知与源代码范围分别写清；后续路线、休息、药水或终局价值阈值仍需要静默独立对照数据。

## 最终逐项结果与账本补链

### silent-proposal-04b6b430759815ed — waiting

来源局：NHA2KW0RB7VP, K3676LU8B0UH, SADL3CGYTGSR。既有账本：silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265。层/回合和反例见 proposal.md 对应项及原始提案。

普通萎靡和部分精确切击模型已有 live 祖先实现，但未覆盖此宽提案。油灯首次触发的已消费状态、零X/升级/叠层组合缺完整对照；蟹1到2不足以判定通用取整顺序，抱抱先生与佩尔之肉部分触发时点仍缺隔离帧。

### silent-proposal-9952ee8e8df9a0fe — waiting

来源局：NHA2KW0RB7VP。既有账本：silent-0019, silent-0020, silent-0065, silent-0264, silent-0079。层/回合和反例见 proposal.md 对应项及原始提案。

NHA2KW0RB7VP F33六试全败，斗篷/回响即时血价差未形成控制完整抽序的整战替线；既有即时损血参考不是执行护栏。缺路线/营火/SL阈值的独立验证，实际回复120与存档恢复47须分账。

### silent-proposal-9b4049b484730143 — waiting

来源局：G33HU22H2543。既有账本：silent-0266, silent-0057, silent-0023, silent-0079, silent-0069。层/回合和反例见 proposal.md 对应项及原始提案。

源码已在本工作树实现并验证，提交e784dd9f043bf87c29109573f48975f9903280d3；live已有他人MERGE_HEAD a83d9ab675560a177249aa638e99df40bcfb5553及19个未解决冲突，源码不是实际live祖先，缺最终合入证明，交运维接续合入后重新登记。

### silent-proposal-47be799a87af03be — waiting

来源局：P74C04AEPL1F。既有账本：silent-0205。层/回合和反例见 proposal.md 对应项及原始提案。

P74C04AEPL1F F23末次T3弃牌确使原计划失效，但缺全部合法弃牌后继与当前手数精确切击的联合固定校准，保留贪婪分支未实打。普通生存者单弃修复只处理可达性，不能完成整个选择题题面与分支策略。

### silent-proposal-3a5274da3c42672a — waiting

来源局：P74C04AEPL1F。既有账本：silent-0039, silent-0196, silent-0013, silent-0180, silent-0224, silent-0227, silent-0027, silent-0011, silent-0006。层/回合和反例见 proposal.md 对应项及原始提案。

部分滑溜/毒/一次格挡预览已有 live 祖先实现，但召唤复活需伤及本体归零中间帧不足，双遗物首触发/下一轮恢复缺隔离对照；没有相同入口替代杀序或留药整战，不能把既有子公式视为整个资源包完成。

### silent-proposal-bc4b92d590f2c4ce — waiting

来源局：G33HU22H2543, P74C04AEPL1F。既有账本：silent-0092, silent-0023, silent-0021, silent-0057, silent-0205, silent-0079, silent-0266。层/回合和反例见 proposal.md 对应项及原始提案。

本批关联两项窄修复：投斧首牌身份、普通生存者单弃消费；组合提案仍缺弃牌全部合法后继的联合校准、能力兑现完整对照和另一首牌整战实线，且两项源码尚待实际合入 live。

### silent-proposal-f52fbbab4dccc3b4 — waiting

来源局：G33HU22H2543, P74C04AEPL1F。既有账本：silent-0019, silent-0020, silent-0090, silent-0069, silent-0039, silent-0064。层/回合和反例见 proposal.md 对应项及原始提案。

G33HU22H2543 F31/33/48及P74C04AEPL1F F22/23说明实际HP/药水资源链，预定F24火未抵达；缺同入口改路线、留药或杀序的配对整战与独立后置验证，不能从单条失败路径拟路线禁令。

### silent-proposal-10f37c0edd3d24a6 — waiting

来源局：G33HU22H2543, P74C04AEPL1F。既有账本：silent-0006, silent-0011, silent-0027, silent-0046, silent-0013, silent-0180, silent-0196, silent-0255, silent-0198, silent-0204, silent-0069。层/回合和反例见 proposal.md 对应项及原始提案。

临时减力、额外毒触发和士兵一次预览已有部分实现，但开场净损分项、能力/遗物联用与恢复时序仍缺隔离帧和完整固定联合验证；不能宣布宽机制包已实现。

### silent-proposal-eecf671192557465 — waiting

来源局：RC61MFQM63Y6, 53FLQ68CETW0。既有账本：silent-0268, silent-0205。层/回合和反例见 proposal.md 对应项及原始提案。

源码已在本工作树实现并验证，提交bf423c173d3be348a4ad714e1d26516df619ff41；live已有他人MERGE_HEAD a83d9ab675560a177249aa638e99df40bcfb5553及19个未解决冲突，源码不是实际live祖先，缺最终合入证明，交运维接续合入后重新登记。

### silent-proposal-3f82387e2e179703 — waiting

来源局：RC61MFQM63Y6。既有账本：silent-0079, silent-0027, silent-0065, silent-0080, silent-0088。层/回合和反例见 proposal.md 对应项及原始提案。

RC61MFQM63Y6 F33同盘30伤/损4与23伤/损8可核实，但两线均喝药且后轮未控制；缺修正弃牌模型后同完整抽序的配对整战及独立验证，不能从全败并列拟固定能力罚分或必保血规则。

账本仅经根目录 learner/ledger.py update 追加10项补链，by=learner:strategy-proposal。silent-0268、silent-0266从observed设为proposed，链接实际源码提交、proposal.md与report.md；八个宽提案主账本0265/0019/0205/0180/0092/0090/0255/0079仅追加说明与链接，保持各自历史claim/status，不将经验入库状态当作源码上线。CLI输入/回执见 ledger-survivor-update.json/.log、ledger-other-updates.json/.log。原代码提案id沿用已派发CLI队列，不另造重复提案、不标shipped。

修复回退：分别git revert bf423c173d3be348a4ad714e1d26516df619ff41 或 e784dd9f043bf87c29109573f48975f9903280d3，先按实际live情况由运维处理，不回退他人现存合并或刷新知识。原始讨论、提案、帧、失败日志、初稿和最终材料都保留在本批材料目录。后续运维必须先处理live现存合并，再审查本批与刷新知识的重叠；实际合入并验证通过后才能追加上线记录、游戏版本、Roy/运维双通知并登记shipped。

最终机械核验通过：十个派发处置、真实代码提案链接/角色/实现域、报告绝对路径、两个40位提交及父链、实际live非祖先、工作树干净及9个允许文件范围；见final-validation.json。report.json与final-report.json字节相同。
