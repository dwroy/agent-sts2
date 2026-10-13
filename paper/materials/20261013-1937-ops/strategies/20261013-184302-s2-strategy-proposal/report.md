# 本批策略学习回报

记录时间：2026-10-13T19:02:15+08:00。task=strategy-proposal；character=silent；batch=20261013-184302-s2-strategy-proposal。

本批十个完整提案全部 **waiting**。投斧首牌身份与普通生存者唯一单弃已有真实live祖先源码，候选差额、已选后继及实存弃牌快照也有覆盖；这些局部实现不替代完整资源/选择/成长/SL策略的验证。本批没有发现证据充分的新可隔离源码差额，没有改源码或知识，没有新提交、合入、版本或shipped。

## 身份与材料

- 开工工作树干净；`git merge --no-edit main` 返回 Already up to date，base及当前HEAD为 `7398d10436a9c64d73885370eeff1b4cba3230ad`。
- 本批learn.json的task/character/worktree/runs/proposal_ids已核，保存dispatch.json。没有research_request或implementation_request；reason=proposal，故不进入纯研究或冻结实现流程，不读取其他专题请求。根普通专题文件绑定旧批20261010-150327，仅核其身份字段，未使用work_spec。
- 源提案10/10实际存在且SHA与专用队列一致；只读原Markdown并保留原字节副本。未再注册新id，未改队列/根请求/旧父项/旧复盘。
- runs.jsonl唯一原行均SILENT A10、已结束败局。旧code含dirty，历史完整脏源码未知；不拿当前源码冒作旧运行树。旧兼容ds_*字段不当真实引擎验证。
- 原日志抽取共7391行，逐源文件行号、字节偏移、长度、SHA256与复制原件核验 **7391/7391一致**。初次states提取因run_id嵌套于state而为空，已按真实结构补取；原空结果不作证据。fight-plans本批无匹配行，run-plans实际有26行，缺失项保持明确。
- 只读取本角色原帧/对应复盘及必要生产源码。没有读取其他角色知识、key、.env、游戏二进制或外网；没有运行play/模型请求，没有派下级agent。
- 启动PID不在当前可见/proc中，runtime-model-flags.json为[]；没有冒称已从原生会话核实模型/推理强度或自行切换账号/权限。

| 局号 | A | 末层 | 历史code | 决策行 | 状态行 |
|---|---:|---:|---|---:|---:|
| NHA2KW0RB7VP | 10 | 33 | b8ca9311+dirty | 584 | 602 |
| P74C04AEPL1F | 10 | 23 | fd4c8e52+dirty | 395 | 410 |
| G33HU22H2543 | 10 | 48 | 710dc4dc+dirty | 850 | 879 |
| RC61MFQM63Y6 | 10 | 33 | 0d6c1a82+dirty | 674 | 694 |
| BTSRF7JL1W1Y | 10 | 31 | 6ad5584f+dirty | 635 | 653 |

## 现有实现核验与边界

固定只读live提交为 `efe099dd297f188197c27623970cdf36d76c6bba`，不是本批合入。源码副本保存为source-snapshots下.txt材料，逐路径base/live SHA见source-verification.json。16个实际路径中9个原字节一致，7个只有Roy→Dai注释差异，已逐diff核；曾查询的agent/src/sl/canonical-line.ts两边都不存在，不补造源码。历史全运行dirty树未冻结。

- 投斧子项：`e784dd9f043bf87c29109573f48975f9903280d3`实际live祖先。当前explore.ts的first-card身份和combat-plan.ts的turnKeys仍存在，原有固定回归源码已读；本批不复跑或声称其完整套件新通过。
- 普通生存者子项：`bf423c173d3be348a4ad714e1d26516df619ff41`实际live祖先。card-model普通silent A6/A10标记、turn-solver唯一手牌消费及pending多选边界在当前源码，原固定RC61夹具验证源码已读。多选边界不是全部分支完成。
- 同步祖先：`66283dd9982bdd7f480da7a4d9bfefea0572a9ac`也为actual live祖先；不将同步提交当本批新实现。
- 既有silent-sl-comparison.ts和silent-sl-resource-comparison.ts明示候选预测/未验证执行，提供双方资源与差额，不修改SL门槛或证明实际回合完整实现。

## 固定消费者观察

P74 F23末T3原始states:284817（1HP、16挡、2能量），后继根据原decisions:278542重建为紧勒向卵/毒雾+/精确切击向卵；这是重建输入，不是当时运行内存快照。直接调用当前生产planSelection，无网络、无动作派发，临时fs隔离阻止一项知识JSON读取，没有刷新知识参与期望值。

consumer-observation.out.txt的真实exit=0：返回ask、四选项、四快照，移除原后继标记[true,true,true,false]；每个合法选项都能resolve成对应select_deck_card意图。快照只移除当前副本并显示留牌/费用，未推演弃牌触发后的动态伤害、未来格挡或剩HP。此结果只验证当前事实传输，**不等于完整分支策略、模型调用采用或实战获益**。

## 结论与反例

1. NHA首四T1损1/净减少8与末两T1损7/净减少24相异；同初始题指纹，不代表后续受控整战。末T4完整需损32，16HP实死；前五次提前读档不记实死。仍缺新门槛依据。
2. RC61首/末T1实线损4/8、净减少30/23、挡16/12；279197的SL.original是打火箭、不喝药的另一个候选，不能冒作实线损4。普通生存者唯一单弃缺口已有实现；同预算MC和最终整线校准仍缺。
3. P74末T3弃精确后石仍16、卵8，16挡只完整挡住石，卵毒3→2仍杀1HP；首试卵此前已死、第三次不含精确是不同条件反例。保留精确完整胜线未知，不设强制弃贪婪。
4. P74召唤战53→9胜、T2/T4实损20/24，下战9空药；主怪最后归零中间帧缺失，召唤/复活毛伤不能由身体净差补齐。火焰在滑溜下只扣1，清空后12毒双结扣23已核，不推出一般药价。
5. BTS末线抽弃后重规划，五轮4样本3胜；随后实T4以14HP+5挡+1覆甲对22死，至少缺3HP。单次失败不是概率模型bug证据；原线与末线不同，未施放步法收益不计。
6. 赢战消耗、真实回血、遗物/事件付血、实际饮药与SL恢复分账。NHA二幕三火72、RC61三火63已兑现；未走路线/休息替代/留药完整反事实仍缺，不能直接拟合新资源权重。

逐项账本id、原文指纹、证据层/回合、反例、预期行为、验证方法与waiting原因见proposal.md的十节。本批不新拟合数值；未来验证须按独立局、完成时间切分，不能将同局SL当多局样本或把原锚点当新的样本外验证。

## 登记、验证与交付

只通过根目录learner/ledger.py update追加本批32个关联账本的where.proposal及note，by=learner:strategy-proposal。保留已有claim/status/first_run/version/evidence/effect；已有shipped经验不降回proposed，也不据其shipped将代码提案记实现。没有新增发现/源码提交，因此没有新status=proposed条目。CLI输入/输出/追加原行与读回校验保存在ledger-*材料。本批不直接写队列处置，由完成回报proposal_results交原调度器处理。

本批无源码/知识提交。tsc/vitest/cases均null，撤源码失败/恢复通过均不适用；固定消费者exit0不冒作tsc或vitest成功，没有完整源码套件新验收。未运行合入流程、没有新eval版本或规则变更通知。本批保留原失败和缺数据，后续沿原队列等待新局重派。

工具诊断保留：一次exec在命令执行前因并行旧树.codex消失而被bubblewrap/rg拒绝，同权限重试成功，未绕过沙箱；一次不存在的notes/lessons-silent.md和一次错误/dev/null祖先查询已改为真实notes/lessons.md与40位live ref验证；这些不当生产代码失败。过程说明见diagnostics.md。

交运维的提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-184302-s2/learner/runs/20261013-184326-strategy-proposal/proposal.md`；回报：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-184302-s2/learner/runs/20261013-184326-strategy-proposal/report.md`。本批不申请删除自身工作树；实际调度验收/回收沿原完成事件，原日志和学习材料保留。

## 最终读回

32条CLI追加原行及全部32项链接已核，claim/status/first_run/asc/prior/version/evidence/effect等不变量前后保持。根批次派发身份读回一致，仍running，未自行改其状态。限定本批32项历史的ledger CLI check退出0；不将限定检查冒作整库新验收。固定消费者观察退出0、gitleaks材料扫描退出0（0 finding），生产tsc/vitest未跑。最终HEAD仍等于base、git status为空，报告/提案和全部材料处于git忽略的本批scratch内。
