# H0/r3：沙漏已见状态窄修、固定校准反例与剩余缺口

源码固定提交 `68bc24926d814c94a5c2472aa2bd512a99d1673c`。实际live合入：`None`；发布记录：`None`。本次未交付live：live-merge.lock busy; no live file changed。候选9对象及工作树消费者预检不冒充live经验。

请求roy-20261017-human-pace-h0/revision3；本次input SHA `1e1c259a15f1824119d0009747a89a60f60171705cb051b6c627597804bceea7`。沿原工作树、原任务和全部旧报告/失败/缓存接续；新codex3原生线程01a14ac8-7b11-7ab3-9511-eb44b8ebf5fd的cwd、gpt-6.1-sol/xhigh、首回复及原字节偏移SHA已实核，见native-first-reply-offsets.json。没有跨账号resume、伪造新UUID或修改注册/learn.json/任何角色ACK；注册绑定由ops完成。

原R1 cut仍为states13795215424、decisions2151985895、runs355475、run-config1928062字节，最后结束2026-10-17T01:47:33.841Z。原六目标923尝试/178独立Silent局、617截断/306真实结局和14,124端点索引复用，不重扫全量历史，不把SL或新状态窗增加为校准独立局。r2冻结的boss-trust/原H2材料四文件SHA已核；它们的原表信号与本轮固定588对象分列，不混用差异数值作机制归因。

新发现来自原cut内39场A10沙漏真实结局的82个精确end_turn前指纹→下一回合窗口。81个无临时力量恢复，进一步核下一帧就绪条件后，67窗/31独立局同时can_use_combat_actions=true、actions_settled=true；T3/T6/T9/T12分别30/25/10/2窗，力量增量全部4/5/6/7。14个未就绪与1个恢复混杂窗全部保留；T12两处均已就绪。G2QCF2R3A57K T3的+10含6点尖啸恢复，不误学成+10。原偏移/len/SHA、命令及前后敌人原字段在intensity-evidence.json/intensity-readiness.json。25226ZFLNR1J、UMVLWER4CD98、RMNXHZKV716Y提供可定位锚点。

旧full每次使用表值4。窄修只由真实Silent/A10/单AEONGLASS/最大HP535/凋萎存在6激活，在whole-fight内部再核同签名和旧表力量4，只覆盖绝对T3/6/9/12的4/5/6/7；其他角色、进阶、未知签名、短rollout、T15+及不同刷新表值保持原路。R386阶段能力与R388范围保留，不改出牌/药水/SL/费用/排序权重/四闸，不增加新的未证机制。固定3题含旧错失败（T6力量8≠9）与修后通过。真实原命令后继probe 81窗中76可比、5个no solve（其中已就绪可比62）；后续禁牌是读出力量的控制，不能冒充自然策略轨迹。实际T1/pre构造保持标志；其他角色标签与A0/A2/A9隔离只读Silent数据。

固定研究模型`765690dcf63857e8f2ceb1f040b3390fd44f24abea3a420c1a09817a368ce3f0`承接完成的`89717d20b447`/artifact e1a81ed8，276输入、241编译模块，仅2模块改变、239不变。只重算2调参key的4行和35验证key的70行，另551key/1102行按精确谓词及编译隔离复用。已删除于后续Git树的原成功缓存，只从原71ad52c提交定点恢复8个必要数据叶，逐SHA对原completed receipt一致；不恢复整个仓库或源码checkout。model-plan保留旧计划字段的历史值；本次实际baseline/cache由execution-provenance.json和baseline-cache-recovery.json定义，不能把继承的旧cache字段当本次执行。

原107/481、cutoff2026-10-06T02:46:11.648000、每起点200、seed=1+原588行号×101、t1/pre方法不变。先训练后冻结Platt；验证汇总禁用fit。t1/pre仍为(a,b,c)=(2.0682,0.4568,0)/(2.2744,0.512,0)，均106/107调参成功、479/481验证成功；原6个错误行完全一致。机制发现读过原验证时期帧，固定切分用于修前/后比较，不称新的未见机制验证。

原闸：独立验证≥10、Brier≤整体1.25倍、|预测−实际|≤0.15、leak∈[0.7,1.3]；缺失不补零、净损不改标敌伤。

|目标|起点|独立n|Brier修前→后|预测/实际（修后）|leak修前→后|失败|
|---|---|---:|---|---|---|---|
|TEST_SUBJECT|t1|29|0.1352→0.1352|0.404/0.207|2.394→2.394|brier,gap,leak|
|TEST_SUBJECT|pre|29|0.1306→0.1306|0.364/0.207|2.322→2.322|gap,leak|
|AEONGLASS|t1|35|0.1731→0.1794|0.654/0.514|4.078→4.125|brier,leak|
|AEONGLASS|pre|35|0.1841→0.1855|0.668/0.514|4.204→4.252|brier,gap,leak|
|QUEEN|t1|31|0.2186→0.2186|0.708/0.419|1.065→1.065|brier,gap|
|QUEEN|pre|31|0.2204→0.2204|0.689/0.419|1.176→1.176|brier,gap|
|KAISER_CRAB|t1|46|0.1556→0.1556|0.69/0.63|1.321→1.321|brier,leak|
|KAISER_CRAB|pre|46|0.1791→0.1791|0.71/0.63|1.345→1.345|brier,leak|
|KNOWLEDGE_DEMON|t1|45|0.0735→0.0735|0.832/0.844|1.378→1.378|leak|
|KNOWLEDGE_DEMON|pre|45|0.0651→0.0651|0.854/0.844|1.414→1.414|leak|
|THE_INSATIABLE|t1|46|0.1367→0.1367|0.729/0.674|1.32→1.32|brier,leak|
|THE_INSATIABLE|pre|46|0.1456→0.1456|0.73/0.674|1.364→1.364|brier,leak|

关键反证：已证力量状态修正后，沙漏t1 Brier 0.1731→0.1794、穿透比4.078→4.125；pre Brier 0.1841→0.1855、穿透比4.204→4.252。t1平均胜率差缩至+0.140而越过该单闸，pre仍+0.154；其他质量闸失败。物理状态有证据，不等于概率/穿透质量改善；点估计变差也不能反向证明真实力量规则错误。保留这一否定结果、原门槛和低可信，不为了过闸调倍率、删失败或增样本。整体Brier t1/pre为0.1044/0.108；原另外6个可信目标名单不变，六个本任务目标仍未全部过闸。

|其他目标后继字段assay|原窗口|可比|无解|候选不同窗口|
|---|---:|---:|---:|---:|
|TEST_SUBJECT|42|38|4|2|
|QUEEN|27|22|5|13|
|KAISER_CRAB|38|36|2|2|
|KNOWLEDGE_DEMON|37|26|11|0|
|THE_INSATIABLE|28|27|1|0|

这149可比/23无解仅比较最大HP/力量/弱化字段，后续禁牌、随机后继招式不冒原实盘策略。实验体两处不同的原下一帧仍在选牌/未就绪，不足以据此另修换相；应先取得首次可操作且未出牌的后继帧，隔离轮初毒/选择过程。女王13个已就绪差来自4局（A2三窗、A10十窗），聚合体力量少1；帝王蟹2个已就绪差来自A0/A10各1局，力量高6。盟友加力、自身/当前与后继招式、暂时恢复需继续隔离。知识恶魔/无厌沙虫局部字段相符不证明诅咒/状态牌、沙坑、抽牌/策略及全资源轨迹完整。endpoint-addendum.md、successor-readiness.json保留本次初筛结论的收窄。

|起点/集合|进阶段|n|Brier|预测差|穿透比|
|---|---|---:|---|---|---|
|t1/tune|A0–4|38|0.134|-0.0020000000000000018|1.238|
|t1/tune|A5–9|52|0.0875|-0.020000000000000018|1.196|
|t1/tune|A10|16|0.0994|0.06899999999999995|1.1|
|t1/val|A0–4|0|None|None|None|
|t1/val|A5–9|0|None|None|None|
|t1/val|A10|479|0.1044|0.04800000000000004|1.266|
|pre/tune|A0–4|38|0.1334|0.0|1.301|
|pre/tune|A5–9|52|0.0916|-0.018000000000000016|1.263|
|pre/tune|A10|16|0.0976|0.06000000000000005|1.133|
|pre/val|A0–4|0|None|None|None|
|pre/val|A5–9|0|None|None|None|
|pre/val|A10|479|0.108|0.05500000000000005|1.28|

验证仍全A10，其他进阶段n=0不能用训练残差认证。F49只用实际单战入口资源，不是F48→F49联合通关率。

|F49|集合|n|Brier|预测/实际|leak|
|---|---|---:|---|---|---|
|t1|tune|2|0.1146|0.339/0.0|0.125|
|t1|val|31|0.1684|0.448/0.161|2.535|
|pre|tune|2|0.0968|0.311/0.0|0.062|
|pre|val|31|0.1616|0.428/0.161|2.494|

源码官方沙箱复跑：tsc0，483文件4421项＋paths1文件11项，共484文件4432项通过。原整套失败1（仅66处旧材料导入）、482文件/4420项通过原件保留；旧不完整测试副本及失败编译草稿逐SHA转为文本证据，未改生产断言/时限/排除表。原tsx CLI IPC EPERM、首次logdb缺duckdb解释器、第一次probe无解退出、一次工具bubblewrap临时文件扫描启动失败、初次经验链分类缺失都保留，分别用已有解释器/Node loader/未知分类和经验更新环节链修复；不冒新校准失败或科学收益。gitleaks0；3固定回归及候选9对象真实loader/render/query预检通过。实际live检查/消费者必须以publication.json为准，不能借本段绿色。

候选经验版本2026-10-18.h0-r3-intensity1：合并更新原6目标边界、固定源边界、测量边界并新增沙漏状态/校准反例，共9对象，canonical SHA见candidate-experience-refs.json。账本silent-0507仅CLI proposed；原提案silent-proposal-7b288c9c2015bb29保留，经验更新环节链接silent-proposal-bb1df77cdb2d4c9d通过机械检查，不另开owner/WT。原proposal.md指纹不改，端点新增限制另存addendum。implemented/shipped、正式release_id、精确宿主与ops→watcher→Roy确认不得冒填。

本次实际状态：{"source": "68bc24926d814c94a5c2472aa2bd512a99d1673c", "merged": null, "publication": null, "error": "live-merge.lock busy; no live file changed", "consumer_receipt": null, "live_sandbox_exit": null, "release_id": null}

后续仍沿本H0工作树和新实际原生线程：先解决实际合入阻塞并保新鲜知识，登记版本、双通知及实际消费者；再依次核Queen盟友加力清洁窗口、Crab招式/力量推进、实验体首次就绪后继、知识恶魔诅咒牌堆/抽牌及无厌沙虫沙坑/状态牌资源。新窄修仍冻结实际新源，沿原切分只重算必要对象、训练Platt与原闸；当前765690dc缓存保留。缺证字段/窗口见逐目标diagnosis与questions.json，不能用未知替零或报告已交关六目标/0332/human-pace。没有play、联网、重启、H2 on/H3+、新模型、子agent、凭据/游戏二进制读取。

异议原文：

```json
[
  {
    "claim": "旧full模型将沙漏加大力度每次固定按4力量处理；r1沙漏边界尚未定位新的A10机制。",
    "finding": "原cut内67个已就绪/无恢复混杂窗口支持T3/6/9/12增4/5/6/7。窄修有状态证据，但同固定校准的Brier与穿透比点估计变差，不能说六Boss可信度已修好。",
    "evidence": [
      "25226ZFLNR1J F48 T3/T6",
      "UMVLWER4CD98 T9",
      "RMNXHZKV716Y T12",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/intensity-evidence.json",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/intensity-readiness.json",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/before-after.json"
    ],
    "recommendation": "只发布已见状态修正及反证经验，保原四闸和低可信；继续分离端点、状态牌/抽牌、策略与资源差异。",
    "existing_entry_ids": [
      "silent-g1a-aeonglass-calibration-boundary",
      "silent-aeonglass-intensity-observed-turns"
    ]
  },
  {
    "claim": "本轮后继字段初筛中的2处实验体最大HP/弱化差可能意味着新的换相错误。",
    "finding": "两处原下一帧均未就绪并处于选牌，不足以认定机制错误；不据此推翻R386已见阶段能力修正。",
    "evidence": [
      "T082DRCUHRRD A0 F48 T8→T9",
      "YZWV37N2MU6N A10 F48 T4→T5",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/successor-readiness.json"
    ],
    "recommendation": "先在原cut内取首次已就绪且未打牌的后继帧，再隔离轮初毒/选牌结算。",
    "existing_entry_ids": [
      "silent-g1a-test-subject-calibration-boundary",
      "silent-test-subject-phase-reset",
      "silent-h0-end-turn-measurement-boundary"
    ]
  },
  {
    "claim": "旧Queen/Crab整场推进已包含当前看见的全部敌方力量变化。",
    "finding": "新控制assay中女王13个已就绪窗聚合体力量少1，帝王蟹2个已就绪窗力量高6；这些状态差需继续逐actor/招式/临时恢复隔离，尚不能归咎一个倍率。",
    "evidence": [
      "ZZMYZ5UBCG72 A2",
      "ZVYUL2YP3518 A10",
      "5X2GHKJ89PN1 A10",
      "CVJ4MLQF4CSY A10",
      "9TG1RP5LFAAK A10 T6",
      "T082DRCUHRRD A0 T8",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/successor-state-assay.json",
      "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261018-human-pace-h0-r3/successor-readiness.json"
    ],
    "recommendation": "沿原H0 owner先审Queen已就绪清洁窗口的盟友加力路径及Crab当前/后继招式效果，再决定最窄规则；纸鹤A2不扩A10。",
    "existing_entry_ids": [
      "silent-g1a-queen-calibration-boundary",
      "silent-h0-kaiser-crab-calibration-boundary",
      "silent-paper-krane-weak-multihit"
    ]
  }
]
```
