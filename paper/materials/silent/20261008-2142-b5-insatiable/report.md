# Silent / THE_INSATIABLE B5：拒绝发布

2026-10-08 21:34:56 CST；批次 `20261008-174301-fix-batch`。本批没有候选源码、live 合入或 eval 版本。本角色原日志可证实打穿指标的取帧偏差；修正需要扩到 `agent/tools/boss-sim/character_extract.py`，超出本批仅允许的三个 fullFight 模拟源文件。原 tune 上两个防守权重的目标打穿距离和目标原始 Brier 均差于基准，保留原策略。账本 `silent-0303` 为真实 fight 条目的 rejected，非 bug-infra。

不可变派发/初始/live 基准均为 `69a7b4414cdbaade679427d96af1a2cbbd04062d`。启动时工作树干净，合 live 返回 Already up to date；未用后来的 live 或候选替换 base。证据 character/boss/mode/key 已重新核对，副本 SHA256 `130461d1e15e1007d861b30c80aa7ecc9cf16e9fd97b1d03341895fcee2c4e7f`，key `1848c22b377e05c0aa95012da9ec73911d0f1ca73689bea49a758214d6b94019`。授权取自 Roy 2026-10-07 的 B4/B5 标准流程原节及 docs/boss-sim.md §13/14。

冻结数据来自 137 个已结束 SILENT 局、632 次 boss 尝试，254 场可用实际结局（184 胜、70 死）。保留原 107 个 tune keys 与 UTC 切点 `2026-10-06T02:46:11.648000`；val 134→147，13 个新增场次只进 val。目标 boss 68 次尝试：24 场实际结局（16 胜、8 死），44 次 predicted_death 截尾，目标 tune 9/val 15。截尾不是实际败局，结局按 SL 尝试分别记账；校准不代表所有初试或允许 SL 的整局通关率。

触发实际死亡局 `['4XLZURXMD872', '8JRE1C4H4Z2W', 'C48LLXBGKXQ9', 'SY0WMJNNVRLM', 'WQZVENQ7DTRP', 'XBD8Z9XLPCPN', 'XYYQYBRM2A01', 'Y5H4CFAQ2WTG']`；最近死亡 `['4XLZURXMD872', 'SY0WMJNNVRLM', 'Y5H4CFAQ2WTG']`。2840 状态帧与 556 决策记录逐项保留原始字节 off/len/SHA256，触发 keys 均有来源。缺 T1 手牌和截尾排除口径见 dataset/extraction.json，未用虚构牌堆或机制补齐。

完整基准重放覆盖 254 场/508 个 T1/pre 起点；506 个成功，错误原文 `[{"key": "K3676LU8B0UH:48:2:6525158984", "start": "t1", "error": "board: Error: no solve", "simError": null}, {"key": "K3676LU8B0UH:48:2:6525158984", "start": "pre", "error": "board: Error: no solve", "simError": null}]`。每起点 200 样本，seed=1+冻结 fights.jsonl 原始行索引×101。整体校准只在 tune 拟合。独立再跑目标 48 个 key/start，除耗时字段外逐项相同；其余 460 个 boss 起点以相同输入/源码和精确 key/start 复用。两份原基准 trust.py 分别生成，档案字节相同；同一扩充验证数据同时进入两侧，没有与旧小集比较。

|范围/起点|验证场数|Brier|预测均值|实际胜率|打穿比|逐回合覆盖|
|---|---:|---:|---:|---:|---:|---:|
|整体/t1（两侧相同）|147|0.1118|0.7720|0.6940|1.2770|804|
|整体/pre（两侧相同）|147|0.1121|0.7730|0.6940|1.3120|804|
|THE_INSATIABLE/t1（两侧相同）|15|0.1199|0.5960|0.6000|1.6950|80|
|THE_INSATIABLE/pre（两侧相同）|15|0.1461|0.6160|0.6000|1.7620|80|

原门槛退出码 `1`，accepted=false，原因 `['B5 has not met original B2 trust admission', 'no bias entered/approached its fixed standard']`。实盘求解/五回合由基准固定 runner 两次重放逐字节相同，SHA256 `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`。没有改准入标准或手写 trusted 名单；源码零改动，铁甲与其他角色保持等价，无新增模拟字段。

以下是原 per-turn.py 输出的验证整场对照，每场每回合计一次；来袭/打穿/损血/敌血为均值。打穿列仍使用原提取口径，不能把下述诊断修正混入门槛。

原日志全部回合覆盖见 turn-coverage.json（all/tune/val分别计场）。原 runner 最多保存前16个模拟 perTurn；全场预测仍用原最大回合数，未补造模拟尾部。

|实际回合|验证场数|打穿有记录场数|T1配对场数（两侧相同）|pre配对场数（两侧相同）|
|---|---:|---:|---:|---:|
|1|15|15|15|15|
|2|15|15|15|15|
|3|15|13|15|15|
|4|13|13|13|13|
|5|13|13|13|13|
|6|13|13|13|13|
|7|13|13|13|13|
|8|13|10|13|13|
|9|10|6|10|10|
|10|6|3|6|6|
|11|3|0|2|2|

t1（before/after 完全相同）：

|回合|场数|来袭 实/模|打穿 实/模|损血 实/模|敌血 实/模|模拟存活份额|
|---|---:|---|---|---|---|---:|
|1|15|0.0/0.0|0.0/0.0|0.0/0.0|340.4/None|1.0|
|2|15|16.8/17.5|4.2/4.9|4.7/4.9|303.0/305.4|1.0|
|3|15|29.4/29.5|8.2/15.6|10.7/15.1|283.0/289.7|1.0|
|4|13|0.0/0.0|0.0/0.0|0.0/0.0|261.5/268.1|1.0|
|5|13|22.2/22.7|3.9/7.6|6.5/7.5|232.9/243.9|1.0|
|6|13|21.7/22.6|3.5/7.3|4.3/7.3|202.1/219.4|0.9|
|7|13|30.5/31.2|9.8/15.2|9.8/14.7|166.2/192.8|0.8|
|8|13|0.0/0.0|0.0/0.0|0.0/0.0|122.3/163.1|0.5|
|9|10|26.8/26.9|10.0/11.8|7.1/12.1|104.6/160.3|0.5|
|10|6|27.3/26.9|5.3/14.2|2.8/14.7|97.5/150.3|0.3|
|11|2|37.0/31.4|None/None|2.5/19.9|96.0/130.2|0.4|

pre（before/after 完全相同）：

|回合|场数|来袭 实/模|打穿 实/模|损血 实/模|敌血 实/模|模拟存活份额|
|---|---:|---|---|---|---|---:|
|1|15|0.0/0.0|0.0/0.0|0.0/0.0|340.4/None|1.0|
|2|15|16.8/16.9|4.2/4.9|4.7/4.9|303.0/312.2|1.0|
|3|15|29.4/29.5|8.2/16.5|10.7/15.9|283.0/295.5|1.0|
|4|13|0.0/0.0|0.0/0.0|0.0/0.0|261.5/273.7|1.0|
|5|13|22.2/22.8|3.9/8.0|6.5/8.0|232.9/248.1|1.0|
|6|13|21.7/22.6|3.5/7.5|4.3/7.4|202.1/222.6|0.9|
|7|13|30.5/31.3|9.8/15.8|9.8/15.1|166.2/196.5|0.8|
|8|13|0.0/0.0|0.0/0.0|0.0/0.0|122.3/169.1|0.5|
|9|10|26.8/26.4|10.0/10.6|7.1/11.4|104.6/160.0|0.4|
|10|6|27.3/25.1|5.3/12.3|2.8/10.6|97.5/154.7|0.3|
|11|2|37.0/30.8|None/None|2.5/17.4|96.0/127.8|0.4|

策略计划在运行前固定：权重 0/1/2，仅原 tune；按局 CRC32 五折校准，整体折外 T1+pre Brier 增加≤.01才可选，再取目标 Σ|ln 打穿比| 最小、并列取较小权重。验证集未用于筛选。

|权重|T1/pre 打穿比|T1/pre 原始 Brier|折外 T1+pre Brier|可选|距离分数|
|---|---|---|---:|---|---:|
|base|0.926/0.975|0.0468/0.0511|0.2336|True|0.1022|
|threat1|0.853/0.908|0.0688/0.0665|0.2338|True|0.2555|
|threat2|0.818/0.879|0.0801/0.0739|0.2324|True|0.3299|

自然选择 base，未实现源码候选。376 个原日志可比较攻击意图符合已有固定模型。初稿的 567 个末帧→下一回合状态比较中有 27 个差异，全部来自 9R916WW0V65N/SY0WMJNNVRLM；进一步比较 475 个可行动稳定帧后确认旧回合末 observed 帧可能已关闭行动、snapshot unstable 且结算倒计时/伤害。该阶段现象不证明新的沙坑机制。初稿差异及失败记录保留。

七组实际尝试三帧夹具：9R916WW0V65N F33 尝试1 won，T2/T3/T5 可行动→结算后掉血 4/10/9；SY0WMJNNVRLM F33 实际尝试6 died，T2/T3/T5/T6 掉血 4/8/24/10。对应帧来袭减格挡相符，但旧回合末帧到次回合血量相同，原 extractor 全给 enemy leak=0。夹具含原始字节文本和 SHA256；ready→next 差值只作诊断，不代替需单独归因的开始损失/回血。修 extractor 需独立扩范围任务；本批未改它或反调防守来迁就偏差指标。

实盘完整战斗预测只按实际尝试统计：14 场/82 回合有可用配对，10 场缺可用预测；同回合只取第一条可用记录，不合并 SL 截尾。首回合10场 actual .30/pred .16/Brier .0792；每场第一个可用回合14场 actual .50/pred .24/Brier .2014。82 回合中50选择最优或并列，79在两个配对标准误内，平均模型校准差 .0039；每场第一个可用回合14对差均为0。实际记录 samples=1200，保留原 best/tied/d/se 配对口径。日志没有原始 seed，不能声称重建该实盘随机样本；.0039也不能跨回合相加或当实际收益。这些模型内差只说明排序潜在上限，没有验证 B2 实际收益或中途独立校准。

原沙箱首次 tsc=0/vitest=1（2615 pass/1 fail）与 stderr 在 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/sandbox.log`；原因是本批 unused snapshot logs 符号链接触及 root logs/logs 的悬空链接。只删除本批未使用链接，所有212个固定输入哈希不变，原 check-imports 定点复跑1例通过。随后原 bash tools/test-sandbox.sh 完整复跑 tsc=0/vitest=0，251文件/2627例通过，日志 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/sandbox-retry.log`。未改原检查、断言或排除名单；PATH/TMPDIR/单worker/nice按任务。

Python 分析初稿的 bundles=None、带连字符模块 import 错误，以及提前核对完整 tune 的单行回报表达式括号 SyntaxError，及机制比较初稿差异均原样留存。没有源码候选，故没有候选撤回真红/恢复绿的结果；不能虚报绿。新增固定原日志机制夹具36条、阶段夹具7组保留可重查输入。原验收 BASE/BASE 自然红，实盘隔离绿。

初次记录暂存发现普通 git add 跳过了被项目忽略的 JSONL，原 rc=1/计数断言错误留存；只对本批已扫描的独立归档显式 force-add 后校验完整文件集合，再提交初稿数据记录。此记录提交不是候选源码或上线，最终源码仍为派发 base。

指定归档的首次 gitleaks 扫描返回1、命中3项，全部为 evidence key 的 SHA256，已按调度器规范从证据正文重算并逐行核对。原 redacted 报告和 gitleaks-hash-proof.json 保留，没有改扫描配置/断言，也没有读取 key/.env。提交前最终指定文件扫描另留原结果于本批 scratch。

冻结档案：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/experiments/boss-sim/silent/821f62527709a338a801fde624bf149e661fb17cc0cccbcf800a28a2dde8b369`；数据 SHA256 `41f5c664f0f7bd59306f1c54933726b6f4d697a3abc259bdab7420c9e0d8e968`，sources SHA256 `67e697d2b75e4812a1901fbaf7f6afb08e15f6e6600c52e770edade080fbb210`，split SHA256 `90ce021c4306b85ed757511b3be6a76a44cfc8f8bc959ae8e29dbc7cd8b0e168`。sources/fights/turns/split/provenance/results、两份 trust、tune配置、配对对照、原始失败和基准验收均归档；归档 run/sl 元信息只保留本角色已结束局/boss，原始日志前缀哈希保留。旧档案未覆盖。

原验收：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/acceptance.json`；实际命令与不可变脚本 SHA256：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/acceptance-command.json`。回报：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/report.md`、`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-174301/learner/runs/20261008-174304-boss-sim-batch/report.json`。本批保留独立记录分支，不合 live、不建版本、不写 shipped；无需回滚源码。运维按原 fix-done 通道核实 rejected 账本与原门槛，随后十场新实际战斗和新校准冷却；本回报不等待后续事件。
