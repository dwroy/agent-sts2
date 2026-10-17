# Roy已授权新功能：静默boss模拟校准定期刷新

task=fix-batch仅为调度通道；本批不是bug-infra，不处理silent-0213或其他队列。Roy指定的是角色隔离、固定模型/切分、整体Platt和原准入标准；下列实胜败、残差及名单只来自已结束的SILENT日志。

状态：published。账本silent-0506保持proposed；shipped和正式release_id由ops核实际发布后登记。没有代码提案或combat/potion/sl/terminal策略改动，implementation_domains=[]。

## 数据与固定实验

结束局338；boss尝试1498；有效实际结局614战（303局），449胜165死。排除884，明细{'SL predicted_death: censored, no actual win/loss; no observed completed outcome': 882, 'SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand': 1, 'no turn-1 decision with drawn hand': 1}。原始SL截断不冒充实际死亡，同一局所有尝试共享切分。快照结束上限2026-10-17T08:15:36.275Z。实际结束事件615，有1场缺首回合；可用战614不是事件615。
新增26场实际结局、10局，18胜8死，全部只延伸验证。原588场开场和回合逐值一致；复用586场，重放前两场控制及新增26场，各起点200样本。4条控制结果除耗时外逐值一致，逐战seed=1+完整614行输入下标×101。
固定发布模型7e1193cef9467416bc10c8e344a49f4fd98390c7，模型SHA a16714b6349b4d4c79bbc91c3875c979607f80da1e619b59f5a0a82e45210a5a；210输入文件逐SHA复原校验，没有整仓库副本。切点2026-10-06T02:46:11.648000 UTC，调参107/模拟成功106，验证507/模拟成功505；调参keys、Platt与进阶项选择和旧发布完全相同。
新增run.code原值均current，未改写。runtime-source-audit.json另列338局353配置行及新增10局12配置行的启动HEAD/dirty/重启来源；启动HEAD不能复原整个dirty运行树。

## 拟合与进阶残差

| 起点 | Platt | 验证n | Brier | A10预测/实际 | A10残差 | A10打穿比 |
|---|---|---|---|---|---|---|
| t1 | {'a': 2.0844, 'b': 0.4502, 'c': 0.0} | 505 | 0.1171 | 0.761/0.725 | +0.036 | 1.327 |
| pre | {'a': 2.2754, 'b': 0.5047, 'c': 0.0} | 505 | 0.1191 | 0.765/0.725 | +0.040 | 1.345 |

A0–4调参成功38、A5–9为52；两段独立验证均0，各距10场还差10。A10调参16、验证505。整体打穿比超1.3，不能概括为全部A10可信；只按逐boss及F49限制消费，不宣称当前H0修复、H1有限前缀、中途独立校准或自然胜率改善已验证。
A10开场699个部件的HP/开场来源均A10。49个伤害定义中48个来自A10、1个TEST_SUBJECT/BIG_POUNCE来自A9估值（45×1，ratio=1，ratioN=4）；27个无伤害定义不补造攻击/零伤。以上是固定既有模型来源，不是新增机制。

## 逐boss可信表

原门槛：n≥10、Brier≤整体×1.25、|胜率差|≤0.15、打穿比[0.7,1.3]；缺指标也拒绝。以下Brier使用完整精度判断、表中显示6位。

| boss | n/数量还差 | B2 Brier/门槛 | B2打穿比/失败 | B3 Brier/门槛 | B3打穿比/失败 |
|---|---|---|---|---|---|
| 永世沙漏 (AEONGLASS) | 37/0 | 0.197212/0.146343 | 3.868/brier、gap、leak | 0.210971/0.148836 | 3.909/brier、gap、leak |
| 仪式兽 (CEREMONIAL_BEAST) | 41/0 | 0.059265/0.146343 | 1.155/达标 | 0.052173/0.148836 | 1.179/达标 |
| 帝王蟹 (KAISER_CRAB) | 50/0 | 0.162427/0.146343 | 1.329/brier、leak | 0.181788/0.148836 | 1.352/brier、leak |
| 知识恶魔 (KNOWLEDGE_DEMON) | 47/0 | 0.101369/0.146343 | 1.326/leak | 0.089079/0.148836 | 1.363/leak |
| 乐加维林族母 (LAGAVULIN_MATRIARCH) | 43/0 | 0.057578/0.146343 | 0.974/达标 | 0.055468/0.148836 | 1.034/达标 |
| 女王 (QUEEN) | 34/0 | 0.264547/0.146343 | 1.062/brier、gap | 0.252228/0.148836 | 1.176/brier、gap |
| 灵魂异鱼 (SOUL_FYSH) | 38/0 | 0.033005/0.146343 | 0.855/达标 | 0.035575/0.148836 | 0.862/达标 |
| 实验体 (TEST_SUBJECT) | 31/0 | 0.190524/0.146343 | 3.543/brier、leak | 0.183856/0.148836 | 3.483/brier、leak |
| 无厌沙虫 (THE_INSATIABLE) | 49/0 | 0.146397/0.146343 | 1.279/brier | 0.166680/0.148836 | 1.317/brier、leak |
| 同族 (THE_KIN) | 43/0 | 0.077199/0.146343 | 1.208/达标 | 0.084654/0.148836 | 1.181/达标 |
| 墨影幻灵 (VANTOM) | 51/0 | 0.055655/0.146343 | 0.969/达标 | 0.049966/0.148836 | 0.946/达标 |
| 瀑布巨兽 (WATERFALL_GIANT) | 41/0 | 0.110922/0.146343 | 0.929/达标 | 0.110749/0.148836 | 0.9/达标 |

B2/B3各6项：THE_KIN、CEREMONIAL_BEAST、LAGAVULIN_MATRIARCH、SOUL_FYSH、VANTOM、WATERFALL_GIANT。其余数量缺口均0，但质量失败，不能许诺再补固定N场必达标。无厌沙虫B2原始Brier0.14639716573405037超过原始门槛0.14634259971356892，保持低信度；未上线的取整误准入候选5370e125保留在scratch/rejected-rounded-candidate，不进live。

F49实际34场：调参2、验证32，数量还差0；B2 Brier0.2023/残差+0.322/打穿比2.482，B3 0.1807/+0.279/2.597，均因Brier、胜率差、打穿比失败保持低信度。不评估F48→F49联合通关率。

## 实现与定期入口

refresh-silent.py --previous默认调用pinned_silent.py：按旧提交/逐文件SHA恢复必要模型，核历史开场/回合/行序，重放2控制及新增验证样本，控制逐值一致才复用；拒绝角色、来源哈希、控制或固定拟合变化。升阶或新增20次实胜/实死boss事件触发，每小时:13/:43和学习批次完成事件检查，未到阈值不拟合、不发空版本。
统计显示与准入精度分离：Silent显式exact模式比较未取整Brier、胜率差和打穿比；其他角色默认block/leak/judge行为不变。旧/新默认27个统计块、26个判定逐值相等（仅使用本角色冻结数据作纯函数比较）。费用、药水、保血、目标、SL等策略阈值不变。
自动入口已用本批614场冻结输入和已算56行重放缓存实跑恢复/哈希/合并/控制/A10审计/生成流程，1228行合并结果与本批逐字节一致；重复执行返回identical artifact already complete。没有另跑MC或真实LLM。

## 测试与原失败记录

- 原首轮sandbox：tsc0，Vitest479文件4387题中3失败；两个原超时、一个66项相对导入均来自两个Git忽略的旧过程副本。原记录source-sandbox.log保留。
- 单独复查4文件50题通过。两个旧过程副本仅临时改为点前缀，测试后按原inode/dev恢复；未改测试断言、超时或固定排除清单。
- main同步后完整sandbox：tsc0、480文件4398题通过，原tracked diff逐字节不变。
- 最终源码sandbox：0，详source-final-sandbox.log。
- Python固定夹具16项通过，含角色、SL截断、切分、Platt/进阶、全门槛/F49、阈值/幂等、固定模型复用/来源拒绝与精度边界。
- 精度边界在旧模块下单项确实失败（[]误准入 vs [brier]），新代码16项通过；precision-without-change.log不改写。
- 首次完整秘密扫描命中completed.json的一条SHA256；重算确认是published-corrected-opening-keys.json校验和，并非凭据。原扫描1/过早本地候选2ef0adead均留证且未合live；仅排除此一已核指纹后，全量扫描0，再提交71ad52c19，内容树与自测相同。详gitleaks-checksum-false-positive.json、source-gitleaks-gate.json，项目默认规则未改。
- source-consumer-readback.json核当前文件及12 boss的B2/B3参数/限制，未调用游戏/LLM。
- live组合sandbox/Python：{'live-refresh-gitleaks.log': 0, 'live_sandbox': 0, 'live_python_fixed': 0, 'live-integration-gitleaks.log': 0, 'live-publication-record-gitleaks.log': 0}。live-consumer-readback.json若存在，仅证明实际部署文件的离线消费，不冒自然对局读回。

## Git、发布与账本

初始base7498f94519191cfb79d16a25dbd85a2af610b9f5；main同步提交241b6af96c2253e2621c93e1aa1693023b4e755e。
来源提交：71ad52c19c884365ec42d3300bc1a3c7a035c7e0。live实际行为提交：40676b554916d88ea006a2e76cf03a9e3e106840；最终发布提交：3d691cff96dedd19855b00f4e9d448c43fe1d219；固定发布树：24be6da5dcc38e9ff9145233b23a0fa475c5ff51。
刷新保存提交：90fb21a23a9048c7266bc00ba9e4e47a7259572d；实际源码祖先：True。内部版本：S1.silent-boss-calibration-refresh-20261017-ccee3b62；release_id=None，由主ops统一核号。
只用CLI给silent-0506追加proposed/来源和实际合入追溯，不冒shipped或关闭其他学习父要求。锁内先保live刷新含新增文件，分别做整支只读预检及任务补丁私有index三方预检，再窄合此功能，保留并行源码/记录/其他角色，组合检查失败即撤本次合入并留刷新与日志。

## 报告与留存

项目报告：/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/paper/materials/silent/boss-sim-calibration.md。完整来源、SL区间、offset/len/SHA、版本、排除、数值来源、切分、结果、旧报告及模型清单：/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/experiments/boss-sim/silent/ccee3b625e95d6a275b5b58ad94739983ae208954dc66ba7fa03deb5b5b5e33b。
原误启当前源码重放、早期拟合、memo试验及所有中断日志均仅留scratch，不用于本批发布。取整候选与初稿保留；旧已发布指纹995fbdbd及报告未覆盖。实际native启动请求为gpt-6.1-sol/xhigh，native-request.json保留原启动核验。
完整沙箱外检查由本次fix-batch完成事件交原调度器补跑；没有另派模型、另建检查通道或以源码自测替代该外部结果。

最终计数：source sandbox480文件4398项通过；live sandbox480文件4410项通过；各自tsc0，Python固定16项0，已核单一SHA256误报后gitleaks0。最终完整JSON见final-result.json；正式release_id及shipped由主ops核实，原调度器完整沙箱外检查待完成。
